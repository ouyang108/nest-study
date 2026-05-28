// src/modules/upload/watermark.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import sharp from 'sharp';
import { extname, basename, join, dirname } from 'path';

// 水印文字配置
const WATERMARK_TEXT = 'Nest Study';
const WATERMARK_CONFIG = {
  font: 'Arial',
  fontSize: 48,
  color: 'rgba(255,255,255,0.6)', // 白色半透明
  padding: 30, // 距离右下角的间距
};

/**
 * 生成水印 SVG，文字放在右下角
 * sharp 不支持直接写文字，通过 composite SVG 实现
 */
function createWatermarkSvg(
  text: string,
  imageWidth: number,
  imageHeight: number,
): Buffer {
  const { fontSize, color, padding } = WATERMARK_CONFIG;
  // 用 foreignObject 不走字体系统，兼容性更好；这里用 text 元素，依赖系统字体
  const svg = `
    <svg width="${imageWidth}" height="${imageHeight}"
         xmlns="http://www.w3.org/2000/svg">
      <text x="${imageWidth - padding}" y="${imageHeight - padding}"
            font-family="${WATERMARK_CONFIG.font}"
            font-size="${fontSize}"
            fill="${color}"
            text-anchor="end"
            dominant-baseline="bottom">
        ${text}
      </text>
    </svg>`;
  return Buffer.from(svg);
}

@Processor('task-queue')
export class WatermarkProcessor extends WorkerHost {
  private readonly logger = new Logger(WatermarkProcessor.name);

  async process(job: Job<{ filename: string; path: string }, any, string>) {
    const { filename, path: filePath } = job.data;
    // await new Promise((resolve) => setTimeout(resolve, 50000));
    this.logger.log(`👷 开始执行加水印任务: ${job.id}, 文件: ${filename}`);

    // 加水印后输出到同一目录，文件名加 _watermark 后缀
    const ext = extname(filename);
    const name = basename(filename, ext);
    const outputPath = join(dirname(filePath), `${name}_watermark${ext}`);

    try {
      // 先获取原图尺寸，用于定位水印位置
      const metadata = await sharp(filePath).metadata();
      const { width = 1920, height = 1080 } = metadata;

      // 生成右下角水印 SVG
      const watermarkSvg = createWatermarkSvg(WATERMARK_TEXT, width, height);

      // 将 SVG 水印叠加到原图上
      await sharp(filePath)
        .composite([
          {
            input: watermarkSvg,
            top: 0,
            left: 0,
          },
        ])
        .toFile(outputPath);

      this.logger.log(`✅ 加水印完成，输出: ${basename(outputPath)}`);
      return { outputPath, originalPath: filePath };
    } catch (error) {
      this.logger.error(`❌ 加水印失败: ${(error as Error).message}`);
      throw error;
    }
  }
}
