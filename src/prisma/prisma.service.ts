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
    // 使用 pg 适配器，连接字符串从环境变量读取
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL as string,
    });
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
