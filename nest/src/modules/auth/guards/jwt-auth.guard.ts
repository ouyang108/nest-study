import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * JWT 认证守卫
 *
 * 【为什么是 AuthGuard('jwt')？】
 * 'jwt' 是 passport-jwt 策略的注册名，来自 passport-jwt 库内部 `this.name = 'jwt'`
 * JwtStrategy 中 PassportStrategy(Strategy) 自动以该名称注册，守卫用同名字符串匹配
 *
 * 【Reflector 的作用】
 * 读取路由/Controller 上的元数据（装饰器贴的标签）
 * 这里用它判断路由是否被 @Public() 标记过
 *
 * 【getAllAndOverride 查两个层级】
 * - context.getHandler() → 路由方法（如 findAll）
 * - context.getClass()   → Controller 类（如 CatsController）
 * 两个层级都查，方法级的优先级更高。意味着可以在 @Public() 的 Controller 中对某个路由单独加保护，反之亦然
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // 检查路由或 Controller 上是否标记了 @Public()，是则跳过 JWT 校验直接放行
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      // @Controller('cats')          ← context.getClass()  拿到这个类
      // @UseGuards(JwtAuthGuard)
      // export class CatsController {
      //   @Get()                     ← context.getHandler() 拿到这个方法
      //   findAll() {}
      // }

      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    // 非公开路由：调用父类 AuthGuard('jwt') 的校验逻辑
    // 内部流程：提取 token → 调 JwtStrategy.validate() 验签 → 返回值挂到 request.user
    return super.canActivate(context);
  }
}
