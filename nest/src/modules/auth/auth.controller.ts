import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { Public } from './decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 登录接口不需要 token，用 @Public() 跳过全局守卫
  @Public()
  @Post('login')
  // 登录接口需要 100 次/分钟的限流
  // 使用 sensitive 限流配置（limit/ttl 继承 app.module 的默认值，不在此处重复定义）
  // @Throttle({ sensitive: {} })
  @Throttle({ sensitive: { limit: 1, ttl: 60000 } })
  login(
    @Body() createAuthDto: CreateAuthDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(createAuthDto, res);
  }
}
