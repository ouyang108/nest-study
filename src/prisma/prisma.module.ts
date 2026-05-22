import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global() 让本模块成为全局模块：其他业务模块无需重复 imports，直接注入 PrismaService 即可
// 仅在 AppModule 中 import 一次就能在整个应用范围共享同一个 PrismaService 实例
@Global()
@Module({
  providers: [PrismaService], // 注册 PrismaService，使其可被 Nest 容器实例化和注入
  exports: [PrismaService], // 导出 PrismaService，供其他模块使用
})
export class PrismaModule {}
