import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  // 日志记录器，用于打印数据库连接状态
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // 使用 pg 适配器
    // 第一个参数是 pg.PoolConfig：连接字符串 + 池行为
    // 第二个参数是 PrismaPgOptions：Prisma 适配器自己的钩子（错误监听等）
    const adapter = new PrismaPg(
      {
        connectionString: process.env.DATABASE_URL as string,
        // 池上限：本地开发 10 个足够；上线再按 DB 实例的 max_connections 调
        max: 10,
        // 关键：空闲 30s 后池主动关连接
        // 比对端（防火墙 / NAT / postgres idle_timeout / 电脑休眠唤醒）先动手，
        // 避免下次 acquire 拿到对端已经关掉的死连接，
        // 触发 "Connection terminated unexpectedly"
        idleTimeoutMillis: 30_000,
        // 建立新连接最多等 5s，超时直接失败，
        // 而不是让业务请求无限挂起
        connectionTimeoutMillis: 5_000,
        // 启用 TCP keepalive，让 OS 层周期性探活，
        // 帮助更早发现僵尸连接（部分场景比 idleTimeout 更早生效）
        keepAlive: true,
      },
      {
        // 池本身的异常（连不上、健康检查失败等）走这里
        // 没有监听器的话 pg.Pool 的 error 事件会冒泡为 unhandled，可能直接挂掉进程
        onPoolError: (err) => {
          this.logger.error('pg 连接池错误', err.stack ?? String(err));
        },
        // 某条连接运行中报错走这里（区别于查询语句报错）
        onConnectionError: (err) => {
          this.logger.error('pg 连接级错误', err.stack ?? String(err));
        },
      },
    );
    super({ adapter });
  }

  // 应用启动时主动建立连接，连不上直接抛错让进程退出
  async onModuleInit() {
    try {
      console.log(process.env.DATABASE_URL);
      await this.$connect();
      this.logger.log('数据库连接成功');
    } catch (error) {
      // 连接失败时记录详细信息，并抛出异常终止应用启动
      this.logger.error(
        '数据库连接失败，应用启动终止，请检查 DATABASE_URL 配置',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  // 应用关闭时优雅断开连接，释放连接池资源
  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('数据库连接已关闭');
  }
}
