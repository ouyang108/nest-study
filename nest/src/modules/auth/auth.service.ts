import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { CreateAuthDto } from './dto/create-auth.dto';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(createAuthDto: CreateAuthDto, res: Response) {
    // WHY: 这里先用固定用户演示登录流程，后续接数据库时替换成按账号查询用户。
    const user = {
      id: 1,
      email: 'admin@example.com',
    };

    if (!user) {
      // WHY: 登录失败必须返回 401，让前端知道这是认证问题而不是普通业务错误。
      throw new UnauthorizedException('账号或密码错误');
    }

    // WHY: sub 是 JWT 常用标准字段，通常放用户唯一 ID，后续校验 token 时能还原当前用户。
    const payload = {
      sub: user.id,
      email: user.email,
    };
    // 在生成一个cookie
    // WHY: 只签发一次 token，避免 cookie 和响应体因为重复生成而出现不一致。
    const accessToken = await this.jwtService.signAsync(payload);
    // WHY: cookie() 是 Express Response 的方法，类型必须来自 express。
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: false, // 生产环境必须开启 secure，确保 cookie 只能通过 HTTPS 传输
      // WHY: Express 类型定义要求 sameSite 使用小写字面量，运行时仍会输出标准的 SameSite=None。
      sameSite: 'none', // 生产环境建议使用 'strict' 或 'lax'，防止 CSRF 攻击；如果需要跨站点使用 cookie（如前后端分离部署），则必须设置 sameSite: 'none' 并开启 secure。
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天，单位毫秒
    });
    return {
      data: {
        // WHY: 前端拿到 access_token 后，需要放到 Authorization: Bearer <token> 里访问其他接口。
        access_token: accessToken,
      },
    };
  }
}
