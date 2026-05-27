import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

// Passport JWT 策略：从 Bearer Token 中解析并验证 payload
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      // 从 Authorization: Bearer <token> 中提取 token
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // JWT_SECRET 已在 AppModule 的 Joi schema 中标记为 required，启动时必定存在
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  // 验证通过后，返回值会被挂载到 request.user 上
  validate(payload: { sub: number; email: string }) {
    return { id: payload.sub, email: payload.email };
  }
}
