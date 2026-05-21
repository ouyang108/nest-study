import { Module } from '@nestjs/common';
import { CatsService } from './cats.service';
import { CatsController } from './cats.controller';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [UserModule],
  controllers: [CatsController], //http handlers
  providers: [CatsService], //Services, repositories, or factories
})
export class CatsModule {}
