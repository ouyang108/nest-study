import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// 业务模块统一从 modules/ 下引入
import { CatsModule } from './modules/cats/cats.module';
import { UserModule } from './modules/user/user.module';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
// 引入全局日志中间件
import { LoggerMiddleware } from './middleware/logger.middleware';
// 引入 Prisma 全局模块，注册后会触发数据库连接校验
import { PrismaModule } from './prisma/prisma.module';

console.log('当前环境:', process.env.NODE_ENV); // 输出当前环境变量的值，帮助调试和确认环境配置是否正确
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 使配置模块在整个应用程序中全局可用，无需在每个模块中导入
      // 校验规则，确保环境变量存在且格式正确
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'], // 根据当前环境加载对应的 .env 文件，优先级：.env.development > .env
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'), //限制NODE_ENV只能是development、production或test ，默认值为development
        PORT: Joi.number().default(3000), // 端口号，默认值为3000
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        /**
         * DATABASE_URL 和 JWT_SECRET：数据库连接串和 JWT 密钥。
         * 它们后面跟着 .required()，意味着这是战略级核心配置。如果 .env 里漏掉了这两个变量，项目会立刻在控制台打印红色报错，并直接拒绝启动（卡死）。
         * 这就叫“拒绝带伤上线”，避免线上跑到一半因为拿不到密钥而崩溃。
         */
      }),
      // 处理校验失败时的行为
      validationOptions: {
        allowUnknown: true, // 允许未知环境变量，不报错  因为在实际部署（比如 Docker、宝塔面板、Vercel 或云服务器）时，系统会自动往环境变量里注入很多杂七杂八的默认变量（比如 USER、HOME、PATH、HOSTNAME 等）
        abortEarly: true, //只要发现第一个不符合规则的配置，立刻停止后续的校验，直接抛出错
      },
    }),
    PrismaModule,
    CatsModule,
    UserModule,
    // PrismaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  // configure() 是 NestModule 接口要求实现的方法，用于注册中间件
  // 这里把 LoggerMiddleware 应用到所有路由（'*'），等价于全局中间件
  // 好处：可以享受依赖注入，未来 LoggerMiddleware 想注入 Service 时无需改动
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware) // 要应用的中间件，可以传多个：.apply(M1, M2)
      .forRoutes('*'); // 作用范围：'*' = 所有路由；也可换成具体路径、controller 或 { path, method }
  }
}
