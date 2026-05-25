"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.localErrorFilter = exports.InterceptorExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let InterceptorExceptionFilter = class InterceptorExceptionFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest();
        const response = ctx.getResponse();
        const errorResponse = exception.getResponse();
        let message = exception.message;
        if (typeof errorResponse === 'object' && errorResponse !== null) {
            const { message: detail } = errorResponse;
            if (detail) {
                message = detail;
            }
        }
        response.status(exception.getStatus()).json({
            timestamp: new Date().toISOString(),
            path: request.url,
            message,
            code: exception.getStatus(),
            success: false,
        });
    }
};
exports.InterceptorExceptionFilter = InterceptorExceptionFilter;
exports.InterceptorExceptionFilter = InterceptorExceptionFilter = __decorate([
    (0, common_1.Catch)(common_1.HttpException)
], InterceptorExceptionFilter);
class localErrorFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest();
        const response = ctx.getResponse();
        response.status(exception.getStatus()).json({
            timestamp: new Date().toISOString(),
            path: request.url,
            message: exception.message + '这是局部错误过滤器后缀',
            code: exception.getStatus(),
            success: false,
        });
    }
}
exports.localErrorFilter = localErrorFilter;
//# sourceMappingURL=error-exception.filter.js.map