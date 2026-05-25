import { ArgumentsHost, ExceptionFilter, HttpException } from '@nestjs/common';
export declare class InterceptorExceptionFilter implements ExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost): void;
}
export declare class localErrorFilter implements ExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost): void;
}
