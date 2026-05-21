import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CatsModule } from './cats/cats.module';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 使配置模块在整个应用程序中全局可用，无需在每个模块中导入
      // 校验规则，确保环境变量存在且格式正确
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
        allowUnknown: true,
        abortEarly: true,
      },
    }),
    CatsModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
