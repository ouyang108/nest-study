import { Module } from '@nestjs/common';
import { CatsService } from './cats.service';
import { CatsController } from './cats.controller';
// 跨模块引用：路径已更新到 modules/ 下（依赖 tsconfig.json 中的 baseUrl）
import { UserModule } from 'src/modules/user/user.module';

@Module({
  imports: [UserModule],
  controllers: [CatsController], //http handlers
  providers: [CatsService], //Services, repositories, or factories
})
export class CatsModule {}
