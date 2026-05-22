import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

// HttpException.getResponse() 在 ValidationPipe 抛错时的结构
interface ValidationErrorResponse {
  statusCode: number;
  message: string | string[]; // 校验失败时是字符串数组，普通错误是单个字符串
  error?: string;
}

@Catch(HttpException)
export class InterceptorExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // 先尝试从 getResponse() 里拿详细信息（ValidationPipe 的报错都在这里）
    const errorResponse = exception.getResponse();
    let message: string | string[] = exception.message;

    // 如果是对象形式（ValidationPipe / 自己 throw new BadRequestException({...}) 都属于这种）
    if (typeof errorResponse === 'object' && errorResponse !== null) {
      const { message: detail } = errorResponse as ValidationErrorResponse;
      // 如果是字符串数组（多个字段校验错误），全部带上；单个字符串也直接用
      if (detail) {
        message = detail;
      }
    }

    response.status(exception.getStatus()).json({
      timestamp: new Date().toISOString(),
      path: request.url,
      message, // 现在可能是 string，也可能是 string[]
      code: exception.getStatus(),
      success: false,
    });
  }
}
