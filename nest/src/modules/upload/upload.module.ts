import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { WatermarkProcessor } from './watermark.processor';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [BullModule.registerQueue({ name: 'task-queue' })],
  controllers: [UploadController],
  providers: [UploadService, WatermarkProcessor],
})
export class UploadModule {}
