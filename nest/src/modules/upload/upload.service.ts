import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUploadDto } from './dto/create-upload.dto';
import { UpdateUploadDto } from './dto/update-upload.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  filename?: string;
  path?: string;
  destination?: string;
}

@Injectable()
export class UploadService {
  // Service 自己注入队列，而不是从 Controller 透传
  constructor(
    @InjectQueue('task-queue') private readonly watermarkQueue: Queue,
  ) {}

  async saveFile(file: UploadedFile) {
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }
    // 把加水印任务丢到异步队列，不阻塞上传接口的响应
    await this.watermarkQueue.add(
      'watermark',
      {
        filename: file.filename,
        path: file.path,
      },
      {
        removeOnComplete: true,
      },
    );
    return {
      originalName: file.originalname,
      filename: file.filename,
      path: file.path,
      destination: file.destination,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  // 多文件上传处理，逐个校验并返回所有文件信息
  saveFiles(files: UploadedFile[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('请选择要上传的文件');
    }

    return files.map((file) => ({
      originalName: file.originalname,
      filename: file.filename,
      path: file.path,
      destination: file.destination,
      mimeType: file.mimetype,
      size: file.size,
    }));
  }
}
