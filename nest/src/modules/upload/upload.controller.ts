import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import type { UploadedFile as UploadFile } from './upload.service';

import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// 上传文件存储配置
const storage = diskStorage({
  destination(req, file, cb) {
    // 目录不存在时自动递归创建
    const uploadPath = join(process.cwd(), 'uploads');
    if (!existsSync(uploadPath)) {
      mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename(req, file, cb) {
    // 生成唯一文件名：时间戳 + 随机数 + 原始扩展名
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
  },
});

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  // 单文件上传
  @Post('file')
  @UseInterceptors(FileInterceptor('file', { storage }))
  uploadFile(@UploadedFile() file: UploadFile) {
    return this.uploadService.saveFile(file);
  }

  // 多文件上传，字段名为 files，最多允许 10 个文件
  @Post('files')
  @UseInterceptors(FilesInterceptor('files', 10, { storage }))
  uploadFiles(@UploadedFiles() files: UploadFile[]) {
    return this.uploadService.saveFiles(files);
  }
}
