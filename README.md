# 如何理解 NestJS 中 Service 与 Controller 的区别

> 🍽️ **饭店类比：** Controller 是「前台服务员」，Service 是「后厨主厨」。前台负责接待客人，后厨专注做菜，分工明确才不会乱。

## Controller 控制器：前台服务员

**唯一职责：** 处理 HTTP 请求，把结果返回给客户。

服务员不需要知道牛排是怎么煎的、要腌制几分钟，他只做三件事：

1. **迎接客人** —— 通过路由（如 `@Get('users')`）知道客人要干嘛
2. **检查菜单、洗手** —— 通过 Pipe 校验客人传来的参数（DTO）是否合法（比如买酒是不是满 18 岁）
3. **点菜传单** —— 把校验好的数据丢给后厨的 Service，等菜做好后打包成 JSON 响应返回

```javascript
@Controller('books') // 路由前缀：http://localhost:3000/books
export class BooksController {
  // 1. 通过构造函数，把后厨（Service）叫过来
  constructor(private readonly booksService: BooksService) {}

  @Post()
  create(@Body() createBookDto: CreateBookDto) {
    // 2. 收到请求，进行入参校验（class-validator 会在后台默默工作）
    // 3. 不在 Controller 里写逻辑，直接丢给后厨
    return this.booksService.create(createBookDto);
  }
}
```

## Service 服务：后厨主厨

**唯一职责：** 处理核心业务逻辑（搬砖、搞数据、算账）。

主厨不需要管这个菜是打包带走还是堂吃，他坐在厨房里只负责：

1. **查库存** —— 连接数据库（MySQL / Prisma / TypeORM）做增删改查
2. **加工食材** —— 处理业务逻辑（密码加密、计算折扣、过滤敏感词）
3. **调用外部帮工** —— 调用第三方服务（发短信、写 Redis 缓存）

```javascript
@Injectable() // 声明这是一个可以被注入的「师傅」
export class BooksService {
  // 假设这里注入了数据库实例 prisma
  constructor(private prisma: PrismaService) {}

  async create(createBookDto: CreateBookDto) {
    // 真正的业务逻辑全部写在这里！
    const { title, price } = createBookDto;

    // 1. 比如计算个折扣价格
    const discountPrice = price * 0.9;

    // 2. 写入数据库
    return this.prisma.book.create({
      data: { title, price: discountPrice },
    });
  }
}
```

---

# `@Module` 模块装饰器

`@Module()` 接收一个对象作为参数，对象有四个核心属性：

| 参数名          | 类型      | 通俗比喻         | 核心作用                                                                                                                |
| ------------- | ------- | ------------ | --------------------------------------------------------------------------------------------------------------------- |
| `controllers` | 数组 `[]` | 前台服务员        | 注册该模块的**控制器**。告诉 Nest 哪些类负责接收 HTTP 请求、匹配路由并返回响应。**如果这里不写，对应的 API 接口就会报 404**                                          |
| `providers`   | 数组 `[]` | 后厨各岗位的厨师     | 注册该模块要用到的**服务、仓储、策略或工厂**。所有标记了 `@Injectable()` 的类都必须在这里注册，Nest 才会自动 `new` 它们并实现依赖注入（DI）                                |
| `exports`     | 数组 `[]` | 外卖 / 外借的厨师   | **导出**本模块内的某些 `provider`。默认情况下，模块内的 Service 是私有的（只能自己内部用）；想让**其他模块**也能用你的 `CatsService`，就必须把它放进 `exports`            |
| `imports`     | 数组 `[]` | 采购其他分店的物资    | **导入**其他模块。如果你的模块需要用到别的模块导出的 Service（比如 `CatsModule` 要用 `UserModule` 里的 `UserService` 来查主人信息），就必须把对应模块放在这里         |

---

# `@Injectable()` 装饰器：依赖注入的「上岗证」

> 💡 **一句话理解：** `@Injectable()` 就像贴在类头顶的「上岗证」，告诉 NestJS 的 IoC 容器（负责自动 `new` 对象的「管家」）：「我准备好了，谁需要我，你帮我送过去！」

## 🛠️ 到底是谁触发了「自动注入」？

真正触发「把 Service 注入到 Controller」这个动作的，是 Controller 的 **constructor（构造函数）**。

### 第一步：Service 声明「我可以被注入」

```javascript
@Injectable() // 贴上上岗证：「我是合法的、可以被别人使用的服务」
export class CatsService {
  findAll() {
    return ['橙猫', '狸花猫'];
  }
}
```

### 第二步：Controller 通过 `constructor` 请求注入

```javascript
@Controller('cats')
export class CatsController {
  // 关键在这里：通过构造函数声明 catsService: CatsService
  // NestJS 看到这里，就会去 providers 里找到 CatsService 的实例，自动塞进来
  constructor(private readonly catsService: CatsService) {}
}
```

---

# 环境变量处理

在 NestJS 中，环境变量通过 [`@nestjs/config`](https://docs.nestjs.com/techniques/configuration) 模块来管理。它能让配置更灵活、更安全，也支持按环境（开发 / 测试 / 生产）动态加载。

## 📦 安装依赖

```bash
pnpm add @nestjs/config joi
pnpm add -D @types/joi
```

## ⚙️ 在 `app.module.ts` 中配置

> ⚠️ **默认行为：** 不设置 `envFilePath` 时，`@nestjs/config` 默认读取项目根目录下的 `.env` 文件。

```javascript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CatsModule } from './modules/cats/cats.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 全局可用，无需在每个模块单独 import
      // 根据 NODE_ENV 动态选择环境变量文件
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,

      // 校验规则：确保关键环境变量存在且格式正确
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'), // 只允许这三个值，默认 development
        PORT: Joi.number().default(3000), // 端口号，默认 3000
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
      }),

      // 校验失败时的行为
      validationOptions: {
        allowUnknown: true, // 允许未知环境变量（部署平台会注入 PATH、HOME 等系统变量）
        abortEarly: true, // 发现第一个错误立即抛出，拒绝启动
      },
    }),
    CatsModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

> 🛡️ **「拒绝带伤上线」原则：** `DATABASE_URL` 和 `JWT_SECRET` 后面加了 `.required()`，意思是项目启动时如果这两个变量缺失，会直接报错拒绝运行。避免线上跑到一半因为拿不到密钥而崩溃。

## 🚀 在代码中访问环境变量

```javascript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CatsService {
  // 通过构造函数注入 ConfigService
  constructor(private readonly configService: ConfigService) {}

  findAll() {
    // 通过 get() 取值，泛型用来指定返回类型
    const message = this.configService.get<string>('NODE_ENV');
    return { msg: 'This action returns all cats', message };
  }
}
```

## 🔧 启动时设置 `NODE_ENV`

借助 [`cross-env`](https://www.npmjs.com/package/cross-env) 跨平台设置环境变量（Windows / Mac / Linux 通用）：

```bash
pnpm add -D cross-env
```

修改 `package.json` 的 `scripts`：

```json
{
  "scripts": {
    "start": "nest start",
    "start:dev": "cross-env NODE_ENV=development nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main"
  }
}
```

## 🎯 多环境 + 通用配置的组合用法

如果有一些**所有环境都共用**的变量，可以放在 `.env`，环境特定的变量放在 `.env.development` / `.env.production` 等文件里，然后把 `envFilePath` 改成数组：

```javascript
envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
```

**加载优先级：** `.env.development` > `.env` —— 先去环境特定文件找，找不到再回退到 `.env`。

## 🕳️ 几个容易踩的坑

1. **`cross-env NODE_ENV=development && nest start`**
   `&&` 会让 `cross-env` 设完变量后立刻退出，**新进程拿不到 `NODE_ENV`**。正确写法：去掉 `&&`，让 `cross-env` 直接执行后面的命令。

2. **`envFilePath` 错写到 `Joi.object({...})` 里面**
   `envFilePath` 是 `ConfigModule.forRoot()` 的**顶层选项**，不是 Joi schema 的字段。写错位置，NestJS 根本不会读到它，会退回默认读 `.env`。

3. **`.env.development` 里的 `NODE_ENV` 想覆盖外部值**
   `process.env.NODE_ENV` 已经被 `cross-env` 设过了，**dotenv 不会覆盖已存在的环境变量**，所以 `.env.development` 里的 `NODE_ENV=xxx` 这行会被静默忽略。

> 📌 **部署提示：** `build` 出来的产物**不会**带 `.env` 文件，需要运维在部署环境手动配置环境变量，或在服务器上创建 `.env` 文件。

---

# 中间件、拦截器与过滤器：构建全局请求响应处理管道
## 中间件 Middleware
**通俗理解：**
中间件就像饭店门口的「迎宾」——客人（请求）还没走到点菜的服务员（Controller）面前，就先被迎宾拦下来：登记一下、查身份证、量体温、做个记录，做完后再放行进店。
所以中间件的位置是：**请求进入 → 中间件 → Controller**，它可以读/改 request、提前结束响应，或者放行交给后面的 Controller 处理。

### 两种写法
#### 1️⃣ 类式中间件（推荐）
带 `@Injectable()`，能享受依赖注入（DI），可以在构造函数里注入其他 Service：
```javascript
// src/middleware/logger.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  // use 方法是固定签名：req, res, next
  use(req: Request, res: Response, next: NextFunction) {
    console.log(`[${req.method}] ${req.url} - Timestamp: ${Date.now()}`);
    next(); // ⚠️ 必须调用 next()，否则请求会一直挂起，前端永远收不到响应
  }
}
```

#### 2️⃣ 函数式中间件
不需要 DI 时可以直接写成函数，更轻量：
```javascript
// src/middleware/logger.middleware.ts
import { Request, Response, NextFunction } from 'express';

export function loggerMiddleware(req: Request, res: Response, next: NextFunction) {
  console.log(`[${req.method}] ${req.url}`);
  next();
}
```

### 三种注册方式（决定中间件「作用在哪些路由上」）

| 类型              | 注册位置                                       | 作用范围                  | 能否享受 DI |
| ----------------- | ---------------------------------------------- | ------------------------- | ----------- |
| **全局（函数式）** | `main.ts` 里的 `app.use(fn)`                   | 所有路由                  | ❌（只能是函数） |
| **全局（类式）**   | `AppModule.configure()` + `.forRoutes('*')`    | 所有路由                  | ✅          |
| **模块级 / 路由级** | 业务模块的 `configure()` + 指定路由             | 该模块声明的某些路由      | ✅          |

#### ✅ 方式 A：全局类式中间件（最推荐）
在 `AppModule` 中实现 `NestModule` 接口，重写 `configure()`：
```javascript
// src/app.module.ts
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { LoggerMiddleware } from './middleware/logger.middleware';

@Module({
  imports: [/* ... */],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  // configure() 是 NestModule 接口要求实现的方法，用于注册中间件
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware) // 要应用的中间件（可一次传多个：.apply(M1, M2, M3)）
      .forRoutes('*');         // 作用范围：'*' = 所有路由 = 全局
  }
}
```

#### ⚠️ 方式 B：函数式全局中间件
只能放在 `main.ts`，**必须写在 `app.listen()` 之前**，否则不生效：
```javascript
// src/main.ts
import { loggerMiddleware } from './middleware/logger.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(loggerMiddleware);  // ✅ 必须在 listen 之前
  await app.listen(3000);
}
```

#### ✅ 方式 C：模块级 / 路由级中间件
把 `configure()` 写在业务模块里，只对该模块声明的路由生效：
```javascript
// src/modules/cats/cats.module.ts
import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { LoggerMiddleware } from 'src/middleware/logger.middleware';

@Module({
  controllers: [CatsController],
  providers: [CatsService],
})
export class CatsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)

      // ① 最常用：作用到整个 controller
      .forRoutes(CatsController);

      // ② 精确到「路径 + HTTP 方法」
      // .forRoutes(
      //   { path: 'cats', method: RequestMethod.GET },
      //   { path: 'cats/:id', method: RequestMethod.DELETE },
      // );

      // ③ 字符串路径（支持通配符）
      // .forRoutes('cats', 'cats/*');

      // ④ 先排除，再应用
      // .exclude({ path: 'cats/health', method: RequestMethod.GET })
      // .forRoutes(CatsController);
  }
}
```

### `forRoutes()` 参数速查

| 写法                                              | 含义                          |
| ------------------------------------------------- | ----------------------------- |
| `'*'`                                             | 所有路由（仅用于全局）        |
| `'cats'`                                          | `/cats` 这一条路由            |
| `'cats/*'`                                        | `/cats` 下所有子路径          |
| `{ path: 'cats', method: RequestMethod.GET }`     | 仅 `GET /cats`                |
| `CatsController`                                  | 该控制器里的全部路由（推荐） |
| `.exclude(...)` 再 `.forRoutes(...)`              | 先排除特定路径再应用          |

### 🕳️ 三个常见的坑
1. **`app.use(LoggerMiddleware)` 写在 `app.listen()` 之后**
   → 中间件不会生效。中间件必须在 `listen()` **之前**注册。

2. **`app.use()` 直接传一个 `@Injectable()` 的类**
   → 不会自动 `new`、也没有 DI，等于无效。`app.use()` 是 Express 风格 API，只接收**函数**或**实例方法**。类式中间件请走 `MiddlewareConsumer`。

3. **模块级中间件想跨模块作用**
   → 行不通。中间件**只能作用于「注册它的模块内部声明的路由」**。要给 `cats` 路由加中间件，必须在 `CatsModule` 里注册，或者放到 `AppModule` 走全局。

### 怎么选？一句话决策
- 写**日志、CORS、解析请求体**这种「所有请求都关心」的事 → **全局**（推荐用 `AppModule.configure()` + `forRoutes('*')`）
- 写**鉴权、限流、admin 校验**这种「只针对某些路由」的事 → **模块级 / 路由级**，写在对应业务模块的 `configure()` 里
- 没有 DI 需求、又懒得建类 → 函数式 + `main.ts` 的 `app.use()`

## 过滤器 Exception Filter

**通俗理解：**
过滤器就像饭店的「投诉处理专员」——客人吃菜吃出问题（程序抛异常）时，不让后厨直接跟客人吵架，而是统一由专员出面：道歉、登记、按公司话术回复。
所以过滤器的位置是：**Controller / Service 抛出异常 → 过滤器捕获 → 统一格式化错误响应**，前端永远看到的是同一种「错误体」结构，不会一会儿是 Express 默认 HTML、一会儿是裸字符串。

### 写法

`@Catch()` 装饰器决定捕获哪一类异常，传 `HttpException` 表示只接管 HTTP 异常：

```typescript
// src/exception/error-exception.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException) // 只捕获 HttpException 及其子类（NotFoundException、BadRequestException 等）
export class InterceptorExceptionFilter implements ExceptionFilter {
  // catch 方法是固定签名：异常对象 + 上下文宿主
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp(); // 切到 HTTP 上下文（也支持 ws / rpc）
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // 用 exception.getStatus() 拿到 HTTP 状态码，统一返回错误结构
    response.status(exception.getStatus()).json({
      timestamp: new Date().toISOString(), // 出错时间，方便排查
      path: request.url,                   // 出错的接口路径
      message: exception.message,          // 错误信息
      code: exception.getStatus(),         // 状态码
      success: false,                      // 标记请求失败
    });
  }
}
```

> 💡 **小提示：** 想一锅端**所有**异常（包括非 HTTP 的、原生 `Error`），把 `@Catch(HttpException)` 改成 `@Catch()`（不传参数），并把 `exception` 类型放宽，自己处理状态码兜底。

### 三种注册方式

| 类型     | 注册位置                                     | 作用范围         | 能否享受 DI                          |
| -------- | -------------------------------------------- | ---------------- | ------------------------------------ |
| **全局** | `main.ts` 里 `app.useGlobalFilters(new X())` | 所有路由         | ❌（自己 `new`，无法注入其他 Service） |
| **全局（推荐）** | `AppModule` 的 `providers` 里用 `APP_FILTER` token 注册 | 所有路由         | ✅                                   |
| **控制器级 / 方法级** | `@UseFilters(X)` 装饰器贴在 Controller 或方法上 | 仅该控制器 / 方法 | ✅                                   |

#### ✅ 方式 A：`main.ts` 全局注册（最简单）

```typescript
// src/main.ts
import { InterceptorExceptionFilter } from './exception/error-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // 注册全局异常过滤器：所有未被局部过滤器捕获的 HttpException 都会进来
  app.useGlobalFilters(new InterceptorExceptionFilter());
  await app.listen(3000);
}
```

#### ✅ 方式 B：通过 `APP_FILTER` 注入（需要 DI 时用这个）

```typescript
// src/app.module.ts
import { APP_FILTER } from '@nestjs/core';
import { InterceptorExceptionFilter } from './exception/error-exception.filter';

@Module({
  providers: [
    {
      provide: APP_FILTER, // 特殊 token：告诉 Nest 这是个全局过滤器
      useClass: InterceptorExceptionFilter,
    },
  ],
})
export class AppModule {}
```

#### ✅ 方式 C：局部使用

```typescript
@UseFilters(new InterceptorExceptionFilter()) // 贴在 Controller 上：作用于整个 Controller
@Controller('cats')
export class CatsController {
  @Get()
  @UseFilters(InterceptorExceptionFilter) // 贴在方法上：仅作用于这个路由
  findAll() { /* ... */ }
}
```

### 🆚 两种全局注册方式的优缺点

`useGlobalFilters(new X())` 和 `APP_FILTER` 看似都能「全局生效」，但底层机制完全不同，选错了会埋坑。

#### 方式 A：`app.useGlobalFilters(new X())`

```typescript
// main.ts
app.useGlobalFilters(new InterceptorExceptionFilter());
```

| 优点                                                  | 缺点                                                                                                |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| ✅ **写法简单直观**，一行搞定，main.ts 一眼能看出全局有哪些过滤器 | ❌ **拿不到 DI**：`new` 出来的实例游离在 IoC 容器外，构造函数注入 `Logger` / `ConfigService` 等都会是 `undefined` |
| ✅ **不受模块加载顺序影响**，启动就生效                       | ❌ **不在模块树内**：单元测试时 `Test.createTestingModule()` 不知道它的存在，写测试不方便覆盖              |
| ✅ 适合**完全无依赖的纯函数式**过滤器（只用 `exception` 和 `host`） | ❌ 多人协作时，main.ts 容易变成「全局注册的垃圾桶」，越堆越乱                                              |

#### 方式 B：`APP_FILTER` token

```typescript
// app.module.ts
@Module({
  providers: [
    { provide: APP_FILTER, useClass: InterceptorExceptionFilter },
  ],
})
```

| 优点                                                                     | 缺点                                                                              |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| ✅ **完整 DI 支持**：构造函数能注入任何 Service（`Logger`、`ConfigService`、Prisma 等） | ❌ **写法稍重**：要导入 `APP_FILTER`、写成 provider 对象                                |
| ✅ **是真正的 Nest Provider**：会进入模块树，单元测试用 `Test.createTestingModule()` 能覆盖到 | ❌ **执行顺序依赖 providers 数组顺序**：多个全局过滤器并存时，要注意排列                   |
| ✅ **生命周期由容器管理**：默认单例，也能通过 `scope` 改成 `REQUEST` 作用域           | ❌ 必须写在某个 Module 的 `providers` 里（一般放 `AppModule`），跨模块感知度比 main.ts 弱 |
| ✅ 跟 Nest 生态对齐：`APP_GUARD` / `APP_INTERCEPTOR` / `APP_PIPE` 是同一套思路    |                                                                                   |

#### 决策清单

- 过滤器**没有任何依赖**（最朴素那种，就读 `exception` 转个格式） → **方式 A**，省事
- 过滤器要**写日志、上报 Sentry、读配置** → **必须用方式 B**，否则注入的依赖是 `undefined`
- 项目以后大概率会演进、加监控 → **直接上方式 B**，避免后期重构
- 同一个过滤器既想全局生效、又想在某个测试里替换成 mock → **方式 B**（能在 `TestingModule` 里覆盖）

> ⚠️ **常见错误：** 同时用了方式 A 和方式 B 注册同一个过滤器 → 会被注册两次，异常响应被处理两遍（第二次往已经 `end` 的 response 上写会报错）。**二选一**。

## 拦截器 Interceptor

**通俗理解：**
拦截器就像饭店的「上菜前的摆盘师傅 + 收银员」——后厨菜做好了（Controller 返回值），不直接端给客人，先经过他手：摆盘装饰一下（统一包装成 `{ code, message, data }`）、记下出菜耗时、顺手把 `BigInt` 这种客人看不懂的东西转成字符串。
所以拦截器的位置是：**Controller 返回值 → 拦截器包装 → 客户端**。它能在请求**前后**都插一脚，比中间件晚、比过滤器早（只处理成功流程）。

### 写法

实现 `NestInterceptor` 接口，核心是 `intercept(context, next)` 方法，用 RxJS 的 `pipe / map` 改造返回值：

```typescript
// src/exception/exception.filter.ts （文件名虽叫 filter，内容其实是 Interceptor）
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { map, Observable } from 'rxjs';

// 统一响应体结构：所有成功响应都长这样
interface ResponseBody<T = unknown> {
  timestamp: string;
  path: string;
  message: string;
  code: number;
  success: boolean;
  data: T | null;
}

// 控制器返回值的约定结构（可选字段，灵活兼容）
interface ControllerResult<T = unknown> {
  message?: string;
  code?: number;
  data?: T;
}

// 递归把 bigint 转成字符串：JSON.stringify 默认无法序列化 bigint，会抛错
const transformBigInt = (obj: unknown): unknown => {
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map(transformBigInt);
  if (obj !== null && typeof obj === 'object') {
    if (obj instanceof Date) return obj; // Date 保持原样
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, transformBigInt(v)]),
    );
  }
  return obj;
};

@Injectable()
export class InterceptorInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext, // 当前执行上下文（能拿到 req / res / handler 等）
    next: CallHandler,         // 调用链下一环：next.handle() 触发 Controller 执行
  ): Observable<ResponseBody> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();

    // next.handle() 返回一个 Observable，用 pipe(map(...)) 改造里面的值
    return next.handle().pipe(
      map((data: ControllerResult) => ({
        timestamp: new Date().toISOString(),
        path: request.url,
        message: data?.message ?? '请求成功', // Controller 没传就用默认
        code: data?.code ?? 200,
        success: true,
        data: transformBigInt(data?.data) ?? null, // 顺手处理 bigint
      })),
    );
  }
}
```

### 三种注册方式

跟过滤器几乎一一对应：

| 类型              | 注册位置                                                | 作用范围              | 能否享受 DI |
| ----------------- | ------------------------------------------------------- | --------------------- | ----------- |
| **全局**          | `main.ts` 里 `app.useGlobalInterceptors(new X())`       | 所有路由              | ❌          |
| **全局（推荐）**  | `AppModule.providers` 里用 `APP_INTERCEPTOR` token 注册 | 所有路由              | ✅          |
| **控制器级 / 方法级** | `@UseInterceptors(X)` 装饰器贴在 Controller 或方法上 | 仅该控制器 / 方法     | ✅          |

#### ✅ 方式 A：`main.ts` 全局注册

```typescript
// src/main.ts
import { InterceptorInterceptor } from './exception/exception.filter';
import { InterceptorExceptionFilter } from './exception/error-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // 注册全局响应拦截器：把 Controller 返回值统一包装
  app.useGlobalInterceptors(new InterceptorInterceptor());
  // 注册全局异常过滤器：HttpException 统一格式化错误响应
  app.useGlobalFilters(new InterceptorExceptionFilter());
  await app.listen(process.env.PORT ?? 3000);
}
```

#### ✅ 方式 B：通过 `APP_INTERCEPTOR` 注入

```typescript
// src/app.module.ts
import { APP_INTERCEPTOR } from '@nestjs/core';
import { InterceptorInterceptor } from './exception/exception.filter';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: InterceptorInterceptor,
    },
  ],
})
export class AppModule {}
```

### 🆚 两种全局注册方式的优缺点

跟过滤器一样，拦截器也有 `useGlobalInterceptors(new X())` 和 `APP_INTERCEPTOR` 两种全局玩法，差异点几乎一致：

#### 方式 A：`app.useGlobalInterceptors(new X())`

| 优点                                                     | 缺点                                                                                                  |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| ✅ **写法简单**，一行注册，无需改 Module                       | ❌ **拿不到 DI**：`new` 出来的实例不在容器里，注入 `Logger` / `ConfigService` / 数据库连接全部失效        |
| ✅ **执行顺序明确**：按 `useGlobalInterceptors()` 调用顺序生效  | ❌ **测试不友好**：`Test.createTestingModule()` 看不到它，没法在测试里替换 mock                          |
| ✅ 适合**纯转换型拦截器**（只改返回值，不依赖任何 Service）       | ❌ 一旦后期想加日志、Sentry 上报，就得整体迁移到方式 B                                                    |

#### 方式 B：`APP_INTERCEPTOR` token

| 优点                                                                              | 缺点                                                                              |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| ✅ **完整 DI 支持**：构造函数能注入任何 Provider，写日志 / 读配置 / 上报监控随便用      | ❌ 写法稍复杂，要导入 `APP_INTERCEPTOR` token                                       |
| ✅ **是真正的 Provider**：进入模块树，单元测试可以用 `overrideProvider()` 替换为 mock | ❌ **多个全局拦截器并存时，执行顺序 = providers 数组顺序**，需要小心排列              |
| ✅ **作用域可控**：默认单例，需要的话能配 `Scope.REQUEST` 让每次请求一个新实例           | ❌ 在 main.ts 里看不到注册痕迹，新人接手时要去 Module 里翻才能发现                    |
| ✅ 跟 `APP_FILTER` / `APP_GUARD` / `APP_PIPE` 是同一套 idiom，团队心智成本低         |                                                                                   |

#### 决策清单（拦截器版）

- 拦截器**只是格式化返回值**（你现在 [exception.filter.ts](src/exception/exception.filter.ts) 这个就是） → 用 **方式 A** 完全够，简单清爽
- 拦截器要**打日志、计算耗时上报到 Prometheus、读 `ConfigService`** → **必须方式 B**
- 多个拦截器需要**确保执行顺序**（比如「日志拦截器在最外层，响应包装在最内层」） → 用 **方式 B** 时按 `providers` 数组顺序排列；用 **方式 A** 时按 `useGlobalInterceptors(A, B, C)` 的参数顺序排列
- 想给特定 Controller / 方法**叠加额外拦截器**（全局 + 局部并存） → 全局选哪种都行，局部用 `@UseInterceptors()` 装饰器追加

#### 一个执行顺序的小坑

不管是过滤器还是拦截器，**全局生效的实例只有一个**。这意味着：

```typescript
// ❌ 错误：注册了两份，会被执行两次
app.useGlobalInterceptors(new InterceptorInterceptor());

// 同时在 app.module.ts 里
providers: [{ provide: APP_INTERCEPTOR, useClass: InterceptorInterceptor }]
```

→ 同一个响应会被包装两次，最终结构变成 `{ data: { data: { ... } } }`，前端会一脸懵。**两种方式只能选一种**。


## 三者对比：中间件 vs 拦截器 vs 过滤器

| 维度       | 中间件 Middleware              | 拦截器 Interceptor                       | 过滤器 Filter                      |
| ---------- | ------------------------------ | ---------------------------------------- | ---------------------------------- |
| **位置**   | 请求最外层（路由匹配前/后）    | Controller 前后                          | 异常发生时                         |
| **能拿到** | `req` / `res` / `next`         | `ExecutionContext`（含路由元数据、handler） | 异常对象 + `ArgumentsHost`         |
| **能改返回值** | ❌（要改只能 `res.send()` 截胡） | ✅（用 RxJS 改造 Observable）            | ✅（直接 `response.json(...)`）    |
| **典型场景**   | 日志、CORS、解析 cookie、限流 | 统一响应包装、计算耗时、缓存、序列化转换 | 错误统一格式化、错误日志上报       |
| **触发时机** | 任何请求                       | 仅当 Controller **正常返回**             | 仅当 Controller / Service **抛异常** |

### 一张图总结执行顺序

```text
请求进来
  ↓
[中间件 Middleware]    ← 还没找到 Controller，可改 req
  ↓
[守卫 Guard]           ← 鉴权拦截
  ↓
[拦截器 Interceptor]   ← 「前」逻辑（计时开始）
  ↓
[管道 Pipe]            ← DTO 校验、参数转换
  ↓
[Controller / Service] ← 业务逻辑
  ↓ ┐
  ↓ ├─ 抛异常 → [过滤器 Filter] → 错误响应 → 客户端
  ↓ ┘
[拦截器 Interceptor]   ← 「后」逻辑（包装返回值、计时结束）
  ↓
客户端收到响应
```

### 🕳️ 几个常见的坑

1. **过滤器 / 拦截器在 `main.ts` 里 `new` 出来 → 拿不到 DI**
   `app.useGlobalXxx(new X())` 是手动 `new`，构造函数里写 `constructor(private readonly logger: Logger)` 不会被注入。需要 DI 就走 `APP_FILTER` / `APP_INTERCEPTOR` 注册。

2. **拦截器里忘了 `pipe(map(...))`，直接返回 `next.handle()`**
   Controller 返回啥就回啥，统一格式化失效。改返回值**必须**通过 `map`。

3. **`@Catch()` 不传参数 vs 传 `HttpException`**
   不传参 = 接管所有异常（包括 `Error`），适合做兜底；传 `HttpException` = 只接管 HTTP 异常，原生 `Error` 仍然走 Nest 默认处理（500 + 堆栈）。两者根据需要选，或者写两个过滤器叠加使用。

4. **过滤器和拦截器的「全局」加载顺序**
   `APP_INTERCEPTOR` 通过 DI 注册时，多个拦截器的执行顺序 = `providers` 数组里的声明顺序。要保证「日志拦截器在外层、响应包装在内层」时，注意排列顺序。

### 怎么选？一句话决策

- **每个接口都要返回统一的 `{ code, message, data }` 结构** → 全局**拦截器**（成功侧）
- **所有抛出的 `HttpException` 都要返回统一的错误体** → 全局**过滤器**（失败侧）
- **想记录每个请求的耗时 / IP / UA** → 中间件（最早入口） 或 拦截器（能拿到 handler 元数据）
- **登录态校验、权限拦截** → 用**守卫 Guard**（不是这里讲的三个，但更合适）

