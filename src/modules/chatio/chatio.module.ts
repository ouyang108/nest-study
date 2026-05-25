import { Module } from '@nestjs/common';
import { ChatioService } from './chatio.service';
import { ChatioGateway } from './chatio.gateway';

@Module({
  providers: [ChatioGateway, ChatioService],
})
export class ChatioModule {}
