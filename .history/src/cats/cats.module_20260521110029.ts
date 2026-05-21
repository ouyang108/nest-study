import { Module } from '@nestjs/common';
import { CatsService } from './cats.service';
import { CatsController } from './cats.controller';

@Module({
  controllers: [CatsController], //http handlers
  providers: [CatsService], Services, repositories, or factories
})
export class CatsModule {}
