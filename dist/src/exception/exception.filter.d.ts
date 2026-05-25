import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
interface ResponseBody<T = unknown> {
    timestamp: string;
    path: string;
    message: string;
    code: number;
    success: boolean;
    data: T | null;
}
export declare class InterceptorInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<ResponseBody>;
}
export declare class LocalExceptionFilter implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<ResponseBody>;
}
export {};
