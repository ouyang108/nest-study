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

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// 引入全局响应拦截器（成功响应统一格式化）
import { InterceptorInterceptor } from './exception/exception.filter';
// 引入全局异常过滤器（HttpException 统一格式化）
import { InterceptorExceptionFilter } from './exception/error-exception.filter';
// import { LoggerMiddleware } from './middleware/logger.middleware';
async function bootstrap() {
  // 创建 Nest 应用实例
  const app = await NestFactory.create(AppModule);
  // app.use(LoggerMiddleware); // 全局使用 LoggerMiddleware 中间件，记录每个请求的日志

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
