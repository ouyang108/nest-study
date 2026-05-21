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

async function bootstrap() {
  // 创建 Nest 应用实例
  const app = await NestFactory.create(AppModule);
  // 监听端口（优先使用环境变量 PORT，否则默认 3000）
  await app.listen(process.env.PORT ?? 3000);
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
