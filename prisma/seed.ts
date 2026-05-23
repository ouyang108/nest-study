/**
 * Prisma 数据库种子脚本
 *
 * 用途：为数据库填充初始数据（字典数据、默认账号、开发测试数据等）
 *
 * 触发时机：
 *   1. 手动执行：pnpm exec prisma db seed
 *   2. 自动执行：prisma migrate reset（重置数据库后会自动跑）
 *   3. 自动执行：prisma migrate dev（首次空库时会自动跑）
 *
 * 设计原则：
 *   - 幂等：多次执行结果一致，绝不能因重复执行导致数据混乱（用 upsert / skipDuplicates）
 *   - 环境感知：测试假数据只在非生产环境写入，避免污染线上库
 *   - 自给自足：不依赖 Nest 容器，自行实例化 PrismaClient
 */

// 加载 .env.{NODE_ENV} 环境变量（与运行时保持一致）
import 'dotenv/config';
// seed.ts 由 tsx 执行（见 prisma.config.ts），tsx 原生支持 NodeNext
// 项目 tsconfig 是 nodenext，相对导入 TS 文件必须带 .js 后缀（编译后真实就是 .js）
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

// === 1. 初始化 Prisma Client（保持与 PrismaService 同款适配器配置） ===
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});
const prisma = new PrismaClient({ adapter });

/**
 * 安全 upsert 包装器：撞唯一约束（P2002）时降级为查询返回，避免脚本崩溃
 *
 * 背景：Prisma v7 + adapter-pg 的 upsert 不是单条原子 SQL，
 *      并发或脏数据场景下偶发 P2002（唯一约束冲突）。
 *      种子脚本天然是幂等场景，撞了直接读现有记录返回即可。
 */
async function safeUpsertUser(
  email: string,
  data: Parameters<typeof prisma.user.upsert>[0]['create'],
) {
  try {
    return await prisma.user.upsert({
      where: { email },
      update: {},
      create: data,
    });
  } catch (e: unknown) {
    // P2002 = 唯一约束冲突：说明记录已存在，直接查出来返回
    const isUniqueErr =
      e !== null &&
      typeof e === 'object' &&
      'code' in e &&
      (e as { code?: string }).code === 'P2002';
    if (isUniqueErr) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return existing;
    }
    throw e; // 其他错误照旧抛出
  }
}

/**
 * 字典/必填数据：所有环境都要有（包含生产）
 * 比如：默认管理员、系统角色、地区字典等
 */
async function seedRequired() {
  console.log('📌 [1/2] 写入必填数据（字典 / 默认账号）...');

  // 默认管理员账号：用 safeUpsertUser 保证幂等 + 容错
  const admin = await safeUpsertUser('admin@example.com', {
    email: 'admin@example.com',
    name: 'Administrator',
    age: 30,
  });
  console.log('  ✓ 管理员账号已就绪：', admin.email);
}

/**
 * 开发/测试假数据：只在非生产环境写入
 * 用于本地开发、自动化测试时有数据可用
 */
async function seedDevOnly() {
  if (process.env.NODE_ENV === 'production') {
    console.log('⏭️  [2/2] 生产环境跳过测试数据');
    return;
  }
  console.log('📌 [2/2] 写入开发测试数据（用户 + 文章）...');

  // Alice：带嵌套创建的文章关系
  // 因为有嵌套 posts.create，无法直接复用 safeUpsertUser，所以内联 try/catch
  let alice: Awaited<ReturnType<typeof prisma.user.upsert>>;
  try {
    alice = await prisma.user.upsert({
      where: { email: 'alice@example.com' },
      update: {},
      create: {
        email: 'alice@example.com',
        name: 'Alice',
        age: 28,
        posts: {
          create: [
            {
              title: 'Hello Prisma',
              content: '这是 Alice 的第一篇文章',
              published: true,
            },
            {
              title: 'NestJS 学习笔记',
              content: '记录学习 Nest 的心得',
              published: false,
            },
          ],
        },
      },
    });
  } catch (e: unknown) {
    // 撞唯一约束 = Alice 已存在，直接读取（文章按之前已创建的为准）
    const isUniqueErr =
      e !== null &&
      typeof e === 'object' &&
      'code' in e &&
      (e as { code?: string }).code === 'P2002';
    if (!isUniqueErr) throw e;
    const existing = await prisma.user.findUnique({
      where: { email: 'alice@example.com' },
    });
    if (!existing) throw e;
    alice = existing;
  }

  // Bob：仅用户、无文章，复用 safeUpsertUser
  const bob = await safeUpsertUser('bob@example.com', {
    email: 'bob@example.com',
    name: 'Bob',
    age: 32,
  });

  console.log('  ✓ 测试用户已就绪：', [alice.email, bob.email]);
}

/**
 * 主流程：依次执行各分组，任何一步失败都会被外层 catch 捕获
 */
async function main() {
  console.log(`🌱 开始种子数据（环境：${process.env.NODE_ENV ?? 'unknown'}）`);
  console.log('───────────────────────────────────────');

  await seedRequired();
  await seedDevOnly();

  console.log('───────────────────────────────────────');
  console.log('✅ 种子完成');
}

main()
  .catch((e) => {
    // 失败时打印错误并以非零退出码结束，方便 CI 捕获
    console.error('❌ 种子执行失败：', e);
    process.exit(1);
  })
  .finally(() => {
    // 释放数据库连接，否则脚本会挂住进程不退出
    void prisma.$disconnect();
  });
