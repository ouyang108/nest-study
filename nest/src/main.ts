// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);
//   await app.listen(process.env.PORT ?? 3000);
// }
// bootstrap()
//   .then(() => {
//     console.log('Application is running');
//   })
//   .catch((error) => {
//     console.error('Error starting application:', error);
//   });

// === 诊断日志：定位启动卡点 ===

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

import { ValidationPipe } from '@nestjs/common';
// 引入全局响应拦截器（成功响应统一格式化）
import { InterceptorInterceptor } from './exception/exception.filter';
// 引入全局异常过滤器（HttpException 统一格式化）
import { InterceptorExceptionFilter } from './exception/error-exception.filter';
// import { LoggerMiddleware } from './middleware/logger.middleware';

// ws
import { WsAdapter } from '@nestjs/platform-ws';

// cookie解析
// WHY: 默认导入能让 @types/cookie-parser 暴露的函数签名被 ESLint 正确识别，避免 no-unsafe-call 误报。
import cookieParser from 'cookie-parser';
// socket.io
// import { IoAdapter } from '@nestjs/platform-socket.io';

// winston 日志配置
import { winstonLogger } from './winston';

import 'winston-daily-rotate-file'; // 引入 daily-rotate-file 插件，用于按天滚动日志文件
async function bootstrap() {
  // 创建 Nest 应用实例
  const app = await NestFactory.create(AppModule, winstonLogger);

  // 跨域
  app.enableCors();
  app.use(cookieParser());
  // WHY: 必须把 app 实例传给 WsAdapter，让它复用 HTTP 服务的端口（process.env.PORT）
  // 不传的话 WsAdapter 不会挂到 HTTP server 上，gateway 又没指定 port，ws 服务就「没绑端口」连不上
  // app.useWebSocketAdapter(new WsAdapter(app));
  // 会覆盖上面的 WsAdapter，改用 socket.io 实现 ws 服务；同样需要传 app 以复用端口
  // app.useWebSocketAdapter(new IoAdapter(app));
  // app.use(LoggerMiddleware); // 全局使用 LoggerMiddleware 中间件，记录每个请求的日志
  // 开启DTO验证管道：自动验证请求体数据是否符合 DTO 定义的规则，验证失败会抛出异常
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 自动移除未定义的属性
      // forbidNonWhitelisted: true, // 抛出异常，而不是简单忽略
      transform: true, // 自动转换数据类型
    }),
  );
  // 注册全局响应拦截器：把 controller 返回值包装成统一结构 { code, message, data, success, ... }
  app.useGlobalInterceptors(new InterceptorInterceptor());
  // 注册全局异常过滤器：捕获 HttpException 并按统一结构返回错误响应
  app.useGlobalFilters(new InterceptorExceptionFilter());

  // 监听端口（优先使用环境变量 PORT，否则默认 3000）
  // 第二个参数指定监听的 host：'0.0.0.0' 表示监听所有 IPv4 网卡，getUrl() 会返回 http://[ip]:port 形式
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');

  // 返回应用实际监听的地址，供外层 .then 使用
  return app.getUrl();
}
bootstrap()
  .then((url) => {
    // url 即为 app.getUrl() 返回的访问地址，例如 http://[::1]:3000
    console.log(`Application is running on: ${url}`);
  })
  .catch((error) => {
    console.error('Error starting application:', error);
  });
