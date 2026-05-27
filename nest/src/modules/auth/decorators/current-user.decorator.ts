import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// 从 request.user 中提取当前登录用户信息，避免在 controller 里手动操作 req
export const CurrentUser = createParamDecorator(
  (data: never, ctx: ExecutionContext) => {
    const request: { user: { id: number; email: string } } = ctx
      .switchToHttp()
      .getRequest();
    return request.user;
  },
);
