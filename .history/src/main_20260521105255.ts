import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap()
  .then(async (app) => {
    // 动态获取完整的 URL 地址
    const url = await app.getUrl();
    console.log(`🚀 Application is running on: ${url}`);
  })
  .catch((error) => {
    console.error('❌ Error starting application:', error);
  });
