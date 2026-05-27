import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CreateAuthDto } from './dto/create-auth.dto';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(createAuthDto: CreateAuthDto) {
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

    return {
      data: {
        // WHY: 前端拿到 access_token 后，需要放到 Authorization: Bearer <token> 里访问其他接口。
        access_token: await this.jwtService.signAsync(payload),
      },
    };
  }
}
