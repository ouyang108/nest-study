import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/**
 * Passport JWT 验证策略
 *
 * 【PassportStrategy 是什么？】
 * PassportStrategy 是 @nestjs/passport 提供的 mixin 工厂函数，签名如下：
 *   function PassportStrategy(Strategy, name?, callbackArity?)
 * 它不是普通的类——调用后返回一个 mixin 类，我们的 JwtStrategy 再 extends 它。
 *
 * 【内部做了什么？（见 node_modules/@nestjs/passport/dist/passport/passport.strategy.js）】
 * 1. 创建一个 class StrategyWithMixin extends Strategy（传入的 passport-jwt Strategy）
 * 2. 构造函数中：
 *    a. 包装你的 validate() 方法为 passport 的 verify callback（done 模式）
 *    b. super(...args, callback) —— 把 JWT 配置 + callback 传给父类 Strategy
 *    c. passportInstance.use(name, this) 或 passportInstance.use(this) —— 注册策略到 passport
 * 3. 返回 StrategyWithMixin 类
 *
 * 【策略名 'jwt' 从哪来的？】
 * passport-jwt 库的 Strategy 类内部 `this.name = 'jwt'`（node_modules/passport-jwt/lib/strategy.js:31）
 * PassportStrategy 的第二个参数不传时，passport 自动读取 Strategy.name 作为注册名
 * JwtAuthGuard 中的 AuthGuard('jwt') 用同名匹配策略
 *
 * 【完整链路】
 * 请求 → JwtAuthGuard.canActivate() → AuthGuard('jwt') → 本策略的 validate() → request.user
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    // super() 的参数会传给 passport-jwt Strategy 的构造函数
    // 最后一个参数（verify callback）由 PassportStrategy 自动注入，不需要手动传
    super({
      // jwtFromRequest: 指定 token 从哪里取，这里从请求头 Authorization: Bearer <token> 提取
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // ignoreExpiration: false 表示不忽略过期时间，token 过期直接拒绝
      ignoreExpiration: false,
      // secretOrKey: 验证 token 签名的密钥，必须和签发时（AuthService 中 signAsync）用的是同一把
      // ! 非空断言：JWT_SECRET 已在 AppModule 的 Joi schema 中标记 required，启动时必定存在
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  /**
   * 验签通过后 passport 自动调用此方法
   * @param payload - 签发 token 时 signAsync 传入的对象，这里包含 { sub: userId, email }
   * @returns 返回值会被 passport 自动挂载到 request.user 上，后续通过 @CurrentUser() 即可获取
   */
  validate(payload: { sub: number; email: string }) {
    return { id: payload.sub, email: payload.email };
  }
}
