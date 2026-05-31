# NestJS 篇

## 如何理解 NestJS 中 Service 与 Controller 的区别

> 🍽️ **饭店类比：** Controller 是「前台服务员」，Service 是「后厨主厨」。前台负责接待客人，后厨专注做菜，分工明确才不会乱。

### Controller 控制器：前台服务员

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

### Service 服务：后厨主厨

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

## `@Module` 模块装饰器

`@Module()` 接收一个对象作为参数，对象有四个核心属性：

| 参数名          | 类型      | 通俗比喻         | 核心作用                                                                                                                |
| ------------- | ------- | ------------ | --------------------------------------------------------------------------------------------------------------------- |
| `controllers` | 数组 `[]` | 前台服务员        | 注册该模块的**控制器**。告诉 Nest 哪些类负责接收 HTTP 请求、匹配路由并返回响应。**如果这里不写，对应的 API 接口就会报 404**                                          |
| `providers`   | 数组 `[]` | 后厨各岗位的厨师     | 注册该模块要用到的**服务、仓储、策略或工厂**。所有标记了 `@Injectable()` 的类都必须在这里注册，Nest 才会自动 `new` 它们并实现依赖注入（DI）                                |
| `exports`     | 数组 `[]` | 外卖 / 外借的厨师   | **导出**本模块内的某些 `provider`。默认情况下，模块内的 Service 是私有的（只能自己内部用）；想让**其他模块**也能用你的 `CatsService`，就必须把它放进 `exports`            |
| `imports`     | 数组 `[]` | 采购其他分店的物资    | **导入**其他模块。如果你的模块需要用到别的模块导出的 Service（比如 `CatsModule` 要用 `UserModule` 里的 `UserService` 来查主人信息），就必须把对应模块放在这里         |

---

## `@Injectable()` 装饰器：依赖注入的「上岗证」

> 💡 **一句话理解：** `@Injectable()` 就像贴在类头顶的「上岗证」，告诉 NestJS 的 IoC 容器（负责自动 `new` 对象的「管家」）：「我准备好了，谁需要我，你帮我送过去！」

### 🛠️ 到底是谁触发了「自动注入」？

真正触发「把 Service 注入到 Controller」这个动作的，是 Controller 的 **constructor（构造函数）**。

#### 第一步：Service 声明「我可以被注入」

```javascript
@Injectable() // 贴上上岗证：「我是合法的、可以被别人使用的服务」
export class CatsService {
  findAll() {
    return ['橙猫', '狸花猫'];
  }
}
```

#### 第二步：Controller 通过 `constructor` 请求注入

```javascript
@Controller('cats')
export class CatsController {
  // 关键在这里：通过构造函数声明 catsService: CatsService
  // NestJS 看到这里，就会去 providers 里找到 CatsService 的实例，自动塞进来
  constructor(private readonly catsService: CatsService) {}
}
```

---

## 环境变量处理

在 NestJS 中，环境变量通过 [`@nestjs/config`](https://docs.nestjs.com/techniques/configuration) 模块来管理。它能让配置更灵活、更安全，也支持按环境（开发 / 测试 / 生产）动态加载。

### 📦 安装依赖

```bash
pnpm add @nestjs/config joi
pnpm add -D @types/joi
```

### ⚙️ 在 `app.module.ts` 中配置

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

### 🚀 在代码中访问环境变量

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

### 🔧 启动时设置 `NODE_ENV`

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

### 🎯 多环境 + 通用配置的组合用法

如果有一些**所有环境都共用**的变量，可以放在 `.env`，环境特定的变量放在 `.env.development` / `.env.production` 等文件里，然后把 `envFilePath` 改成数组：

```javascript
envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
```

**加载优先级：** `.env.development` > `.env` —— 先去环境特定文件找，找不到再回退到 `.env`。

### 🕳️ 几个容易踩的坑

1. **`cross-env NODE_ENV=development && nest start`**
   `&&` 会让 `cross-env` 设完变量后立刻退出，**新进程拿不到 `NODE_ENV`**。正确写法：去掉 `&&`，让 `cross-env` 直接执行后面的命令。

2. **`envFilePath` 错写到 `Joi.object({...})` 里面**
   `envFilePath` 是 `ConfigModule.forRoot()` 的**顶层选项**，不是 Joi schema 的字段。写错位置，NestJS 根本不会读到它，会退回默认读 `.env`。

3. **`.env.development` 里的 `NODE_ENV` 想覆盖外部值**
   `process.env.NODE_ENV` 已经被 `cross-env` 设过了，**dotenv 不会覆盖已存在的环境变量**，所以 `.env.development` 里的 `NODE_ENV=xxx` 这行会被静默忽略。

> 📌 **部署提示：** `build` 出来的产物**不会**带 `.env` 文件，需要运维在部署环境手动配置环境变量，或在服务器上创建 `.env` 文件。

---

## 中间件、拦截器与过滤器：构建全局请求响应处理管道
### 中间件 Middleware
**通俗理解：**
中间件就像饭店门口的「迎宾」——客人（请求）还没走到点菜的服务员（Controller）面前，就先被迎宾拦下来：登记一下、查身份证、量体温、做个记录，做完后再放行进店。
所以中间件的位置是：**请求进入 → 中间件 → Controller**，它可以读/改 request、提前结束响应，或者放行交给后面的 Controller 处理。

#### 两种写法
##### 1️⃣ 类式中间件（推荐）
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

##### 2️⃣ 函数式中间件
不需要 DI 时可以直接写成函数，更轻量：
```javascript
// src/middleware/logger.middleware.ts
import { Request, Response, NextFunction } from 'express';

export function loggerMiddleware(req: Request, res: Response, next: NextFunction) {
  console.log(`[${req.method}] ${req.url}`);
  next();
}
```

#### 三种注册方式（决定中间件「作用在哪些路由上」）

| 类型              | 注册位置                                       | 作用范围                  | 能否享受 DI |
| ----------------- | ---------------------------------------------- | ------------------------- | ----------- |
| **全局（函数式）** | `main.ts` 里的 `app.use(fn)`                   | 所有路由                  | ❌（只能是函数） |
| **全局（类式）**   | `AppModule.configure()` + `.forRoutes('*')`    | 所有路由                  | ✅          |
| **模块级 / 路由级** | 业务模块的 `configure()` + 指定路由             | 该模块声明的某些路由      | ✅          |

##### ✅ 方式 A：全局类式中间件（最推荐）
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

##### ⚠️ 方式 B：函数式全局中间件
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

##### ✅ 方式 C：模块级 / 路由级中间件
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

#### `forRoutes()` 参数速查

| 写法                                              | 含义                          |
| ------------------------------------------------- | ----------------------------- |
| `'*'`                                             | 所有路由（仅用于全局）        |
| `'cats'`                                          | `/cats` 这一条路由            |
| `'cats/*'`                                        | `/cats` 下所有子路径          |
| `{ path: 'cats', method: RequestMethod.GET }`     | 仅 `GET /cats`                |
| `CatsController`                                  | 该控制器里的全部路由（推荐） |
| `.exclude(...)` 再 `.forRoutes(...)`              | 先排除特定路径再应用          |

#### 🕳️ 三个常见的坑
1. **`app.use(LoggerMiddleware)` 写在 `app.listen()` 之后**
   → 中间件不会生效。中间件必须在 `listen()` **之前**注册。

2. **`app.use()` 直接传一个 `@Injectable()` 的类**
   → 不会自动 `new`、也没有 DI，等于无效。`app.use()` 是 Express 风格 API，只接收**函数**或**实例方法**。类式中间件请走 `MiddlewareConsumer`。

3. **模块级中间件想跨模块作用**
   → 行不通。中间件**只能作用于「注册它的模块内部声明的路由」**。要给 `cats` 路由加中间件，必须在 `CatsModule` 里注册，或者放到 `AppModule` 走全局。

#### 怎么选？一句话决策
- 写**日志、CORS、解析请求体**这种「所有请求都关心」的事 → **全局**（推荐用 `AppModule.configure()` + `forRoutes('*')`）
- 写**鉴权、限流、admin 校验**这种「只针对某些路由」的事 → **模块级 / 路由级**，写在对应业务模块的 `configure()` 里
- 没有 DI 需求、又懒得建类 → 函数式 + `main.ts` 的 `app.use()`

### 过滤器 Exception Filter

**通俗理解：**
过滤器就像饭店的「投诉处理专员」——客人吃菜吃出问题（程序抛异常）时，不让后厨直接跟客人吵架，而是统一由专员出面：道歉、登记、按公司话术回复。
所以过滤器的位置是：**Controller / Service 抛出异常 → 过滤器捕获 → 统一格式化错误响应**，前端永远看到的是同一种「错误体」结构，不会一会儿是 Express 默认 HTML、一会儿是裸字符串。

#### 写法

`@Catch()` 装饰器决定捕获哪一类异常，传 `HttpException` 表示只接管 HTTP 异常：

```typescript
// src/exception/error-exception.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Injectable() // 让 Nest IoC 容器接管：才能注入依赖、走 APP_FILTER 注册、被 @UseFilters(类) 复用
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

> 🔑 **为什么要加 `@Injectable()`？**
> `@Injectable()` 是 Nest IoC 容器的「上岗证」——贴了它，类才能被容器识别、实例化和注入依赖。过滤器加上它的核心理由：
> - **支持 DI**：构造函数能注入 `Logger` / `ConfigService` / 数据库等任何 Provider
> - **走 `APP_FILTER` 全局注册必须**：`{ provide: APP_FILTER, useClass: X }` 走 `useClass`，X 必须是合法 Provider
> - **走 `@UseFilters(类)` 局部使用必须**：传类时由容器实例化，没贴 `@Injectable()` 会报错
>
> 唯一可省略的场景是「永远只用 `new` 实例化、且不需要任何 DI」，但后期想加日志/配置就要返工。**0 成本好习惯，建议永远加上**。同样的逻辑适用于**拦截器、守卫、管道**。

#### 三种注册方式

| 类型     | 注册位置                                     | 作用范围         | 能否享受 DI                          |
| -------- | -------------------------------------------- | ---------------- | ------------------------------------ |
| **全局** | `main.ts` 里 `app.useGlobalFilters(new X())` | 所有路由         | ❌（自己 `new`，无法注入其他 Service） |
| **全局（推荐）** | `AppModule` 的 `providers` 里用 `APP_FILTER` token 注册 | 所有路由         | ✅                                   |
| **控制器级 / 方法级** | `@UseFilters(X)` 装饰器贴在 Controller 或方法上 | 仅该控制器 / 方法 | ✅                                   |

##### ✅ 方式 A：`main.ts` 全局注册（最简单）

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

##### ✅ 方式 B：通过 `APP_FILTER` 注入（需要 DI 时用这个）

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

##### ✅ 方式 C：局部使用

只想给某个 Controller 或某个方法加过滤器，用 `@UseFilters()` 装饰器贴上去即可：

```typescript
import { Controller, Get, UseFilters } from '@nestjs/common';
import { InterceptorExceptionFilter } from 'src/exception/error-exception.filter';

// 贴在 Controller 上：作用于整个 Controller 的所有路由
@UseFilters(InterceptorExceptionFilter)
@Controller('cats')
export class CatsController {
  // 贴在方法上：仅作用于这个路由
  @Get()
  @UseFilters(InterceptorExceptionFilter)
  findAll() { /* ... */ }
}
```

> 💡 **传类 vs 传实例：**
> - ✅ **推荐** `@UseFilters(InterceptorExceptionFilter)` —— 传**类**，由 Nest 容器实例化，**支持 DI**（构造函数能注入 `Logger` / `ConfigService` 等），且**单例复用**
> - ⚠️ `@UseFilters(new InterceptorExceptionFilter())` —— 传**实例**，自己 `new`，**拿不到 DI**，每次声明都是新实例，仅适合无依赖的纯逻辑过滤器

#### 🆚 两种全局注册方式的优缺点

`useGlobalFilters(new X())` 和 `APP_FILTER` 看似都能「全局生效」，但底层机制完全不同，选错了会埋坑。

##### 方式 A：`app.useGlobalFilters(new X())`

```typescript
// main.ts
app.useGlobalFilters(new InterceptorExceptionFilter());
```

| 优点                                                  | 缺点                                                                                                |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| ✅ **写法简单直观**，一行搞定，main.ts 一眼能看出全局有哪些过滤器 | ❌ **拿不到 DI**：`new` 出来的实例游离在 IoC 容器外，构造函数注入 `Logger` / `ConfigService` 等都会是 `undefined` |
| ✅ **不受模块加载顺序影响**，启动就生效                       | ❌ **不在模块树内**：单元测试时 `Test.createTestingModule()` 不知道它的存在，写测试不方便覆盖              |
| ✅ 适合**完全无依赖的纯函数式**过滤器（只用 `exception` 和 `host`） | ❌ 多人协作时，main.ts 容易变成「全局注册的垃圾桶」，越堆越乱                                              |

##### 方式 B：`APP_FILTER` token

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

##### 决策清单

- 过滤器**没有任何依赖**（最朴素那种，就读 `exception` 转个格式） → **方式 A**，省事
- 过滤器要**写日志、上报 Sentry、读配置** → **必须用方式 B**，否则注入的依赖是 `undefined`
- 项目以后大概率会演进、加监控 → **直接上方式 B**，避免后期重构
- 同一个过滤器既想全局生效、又想在某个测试里替换成 mock → **方式 B**（能在 `TestingModule` 里覆盖）

> ⚠️ **常见错误：** 同时用了方式 A 和方式 B 注册同一个过滤器 → 会被注册两次，异常响应被处理两遍（第二次往已经 `end` 的 response 上写会报错）。**二选一**。

### 拦截器 Interceptor

**通俗理解：**
拦截器就像饭店的「上菜前的摆盘师傅 + 收银员」——后厨菜做好了（Controller 返回值），不直接端给客人，先经过他手：摆盘装饰一下（统一包装成 `{ code, message, data }`）、记下出菜耗时、顺手把 `BigInt` 这种客人看不懂的东西转成字符串。
所以拦截器的位置是：**Controller 返回值 → 拦截器包装 → 客户端**。它能在请求**前后**都插一脚，比中间件晚、比过滤器早（只处理成功流程）。

#### 写法

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

> 🔑 **为什么要加 `@Injectable()`？**
> 跟过滤器同理，`@Injectable()` 是让 Nest IoC 容器接管这个类的「上岗证」。拦截器加上它的核心理由：
> - **支持 DI**：构造函数能注入 `Logger` / `ConfigService` / 数据库等任何 Provider，写日志、上报监控、读配置都靠这个
> - **走 `APP_INTERCEPTOR` 全局注册必须**：`{ provide: APP_INTERCEPTOR, useClass: X }` 走 `useClass`，X 必须是合法 Provider
> - **走 `@UseInterceptors(类)` 局部使用必须**：传类时由容器实例化，没贴 `@Injectable()` 会报错
>
> 唯一可省略的场景是「永远只用 `app.useGlobalInterceptors(new X())` 注册、且不依赖任何 Service」，但这种纯转换型拦截器在真实项目里很少见。**建议永远加上**——0 成本，且未来加日志/上报时无需重构。

#### 三种注册方式

跟过滤器几乎一一对应：

| 类型              | 注册位置                                                | 作用范围              | 能否享受 DI |
| ----------------- | ------------------------------------------------------- | --------------------- | ----------- |
| **全局**          | `main.ts` 里 `app.useGlobalInterceptors(new X())`       | 所有路由              | ❌          |
| **全局（推荐）**  | `AppModule.providers` 里用 `APP_INTERCEPTOR` token 注册 | 所有路由              | ✅          |
| **控制器级 / 方法级** | `@UseInterceptors(X)` 装饰器贴在 Controller 或方法上 | 仅该控制器 / 方法     | ✅          |

##### ✅ 方式 A：`main.ts` 全局注册

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

##### ✅ 方式 B：通过 `APP_INTERCEPTOR` 注入

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

##### ✅ 方式 C：局部使用

只想给某个 Controller 或某个方法加拦截器，用 `@UseInterceptors()` 装饰器贴上去即可：

```typescript
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { InterceptorInterceptor } from 'src/exception/exception.filter';

// 贴在 Controller 上：作用于整个 Controller 的所有路由
@UseInterceptors(InterceptorInterceptor)
@Controller('cats')
export class CatsController {
  // 贴在方法上：仅作用于这个路由
  @Get()
  @UseInterceptors(InterceptorInterceptor)
  findAll() { /* ... */ }
}
```

> 💡 **传类 vs 传实例：**
> - ✅ **推荐** `@UseInterceptors(InterceptorInterceptor)` —— 传**类**，由 Nest 容器实例化，**支持 DI**（构造函数能注入 `Logger` / `ConfigService` 等），且**单例复用**
> - ⚠️ `@UseInterceptors(new InterceptorInterceptor())` —— 传**实例**，自己 `new`，**拿不到 DI**，每次声明都是新实例，仅适合无依赖的纯转换拦截器

#### 🆚 两种全局注册方式的优缺点

跟过滤器一样，拦截器也有 `useGlobalInterceptors(new X())` 和 `APP_INTERCEPTOR` 两种全局玩法，差异点几乎一致：

##### 方式 A：`app.useGlobalInterceptors(new X())`

| 优点                                                     | 缺点                                                                                                  |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| ✅ **写法简单**，一行注册，无需改 Module                       | ❌ **拿不到 DI**：`new` 出来的实例不在容器里，注入 `Logger` / `ConfigService` / 数据库连接全部失效        |
| ✅ **执行顺序明确**：按 `useGlobalInterceptors()` 调用顺序生效  | ❌ **测试不友好**：`Test.createTestingModule()` 看不到它，没法在测试里替换 mock                          |
| ✅ 适合**纯转换型拦截器**（只改返回值，不依赖任何 Service）       | ❌ 一旦后期想加日志、Sentry 上报，就得整体迁移到方式 B                                                    |

##### 方式 B：`APP_INTERCEPTOR` token

| 优点                                                                              | 缺点                                                                              |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| ✅ **完整 DI 支持**：构造函数能注入任何 Provider，写日志 / 读配置 / 上报监控随便用      | ❌ 写法稍复杂，要导入 `APP_INTERCEPTOR` token                                       |
| ✅ **是真正的 Provider**：进入模块树，单元测试可以用 `overrideProvider()` 替换为 mock | ❌ **多个全局拦截器并存时，执行顺序 = providers 数组顺序**，需要小心排列              |
| ✅ **作用域可控**：默认单例，需要的话能配 `Scope.REQUEST` 让每次请求一个新实例           | ❌ 在 main.ts 里看不到注册痕迹，新人接手时要去 Module 里翻才能发现                    |
| ✅ 跟 `APP_FILTER` / `APP_GUARD` / `APP_PIPE` 是同一套 idiom，团队心智成本低         |                                                                                   |

##### 决策清单（拦截器版）

- 拦截器**只是格式化返回值**（你现在 [exception.filter.ts](src/exception/exception.filter.ts) 这个就是） → 用 **方式 A** 完全够，简单清爽
- 拦截器要**打日志、计算耗时上报到 Prometheus、读 `ConfigService`** → **必须方式 B**
- 多个拦截器需要**确保执行顺序**（比如「日志拦截器在最外层，响应包装在最内层」） → 用 **方式 B** 时按 `providers` 数组顺序排列；用 **方式 A** 时按 `useGlobalInterceptors(A, B, C)` 的参数顺序排列
- 想给特定 Controller / 方法**叠加额外拦截器**（全局 + 局部并存） → 全局选哪种都行，局部用 `@UseInterceptors()` 装饰器追加

##### 一个执行顺序的小坑

不管是过滤器还是拦截器，**全局生效的实例只有一个**。这意味着：

```typescript
// ❌ 错误：注册了两份，会被执行两次
app.useGlobalInterceptors(new InterceptorInterceptor());

// 同时在 app.module.ts 里
providers: [{ provide: APP_INTERCEPTOR, useClass: InterceptorInterceptor }]
```

→ 同一个响应会被包装两次，最终结构变成 `{ data: { data: { ... } } }`，前端会一脸懵。**两种方式只能选一种**。


### 三者对比：中间件 vs 拦截器 vs 过滤器

| 维度       | 中间件 Middleware              | 拦截器 Interceptor                       | 过滤器 Filter                      |
| ---------- | ------------------------------ | ---------------------------------------- | ---------------------------------- |
| **位置**   | 请求最外层（路由匹配前/后）    | Controller 前后                          | 异常发生时                         |
| **能拿到** | `req` / `res` / `next`         | `ExecutionContext`（含路由元数据、handler） | 异常对象 + `ArgumentsHost`         |
| **能改返回值** | ❌（要改只能 `res.send()` 截胡） | ✅（用 RxJS 改造 Observable）            | ✅（直接 `response.json(...)`）    |
| **典型场景**   | 日志、CORS、解析 cookie、限流 | 统一响应包装、计算耗时、缓存、序列化转换 | 错误统一格式化、错误日志上报       |
| **触发时机** | 任何请求                       | 仅当 Controller **正常返回**             | 仅当 Controller / Service **抛异常** |

#### 一张图总结执行顺序

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

#### 🕳️ 几个常见的坑

1. **过滤器 / 拦截器在 `main.ts` 里 `new` 出来 → 拿不到 DI**
   `app.useGlobalXxx(new X())` 是手动 `new`，构造函数里写 `constructor(private readonly logger: Logger)` 不会被注入。需要 DI 就走 `APP_FILTER` / `APP_INTERCEPTOR` 注册。

2. **拦截器里忘了 `pipe(map(...))`，直接返回 `next.handle()`**
   Controller 返回啥就回啥，统一格式化失效。改返回值**必须**通过 `map`。

3. **`@Catch()` 不传参数 vs 传 `HttpException`**
   不传参 = 接管所有异常（包括 `Error`），适合做兜底；传 `HttpException` = 只接管 HTTP 异常，原生 `Error` 仍然走 Nest 默认处理（500 + 堆栈）。两者根据需要选，或者写两个过滤器叠加使用。

4. **过滤器和拦截器的「全局」加载顺序**
   `APP_INTERCEPTOR` 通过 DI 注册时，多个拦截器的执行顺序 = `providers` 数组里的声明顺序。要保证「日志拦截器在外层、响应包装在内层」时，注意排列顺序。

#### 怎么选？一句话决策

- **每个接口都要返回统一的 `{ code, message, data }` 结构** → 全局**拦截器**（成功侧）
- **所有抛出的 `HttpException` 都要返回统一的错误体** → 全局**过滤器**（失败侧）
- **想记录每个请求的耗时 / IP / UA** → 中间件（最早入口） 或 拦截器（能拿到 handler 元数据）
- **登录态校验、权限拦截** → 用**守卫 Guard**（不是这里讲的三个，但更合适）

## DTO 校验

**通俗理解：**
DTO 校验就像饭店点菜时的「菜单核对员」——客人下单前，先核对一遍：「您点的麻婆豆腐有没有写错成『麻辣豆腐』？年龄填的是数字而不是『大概二十岁』吧？」核对没问题才把单子送到后厨。
所以 DTO 校验的位置是：**请求体（JSON） → ValidationPipe 校验 + 转换 → Controller 拿到干净的 DTO 实例**。

### 📦 安装依赖

```bash
pnpm add class-validator class-transformer
```

- `class-validator`：负责**校验规则**（`@IsString` / `@IsNotEmpty` / `@Min` 等装饰器）
- `class-transformer`：负责**类型转换**（plain object → class 实例、字符串 → 数字等）

两个库必须**搭配**用，缺一个 ValidationPipe 就跑不起来。

### ⚙️ 全局开启 ValidationPipe

在 [main.ts](src/main.ts) 里注册一次，所有路由的 `@Body() / @Query() / @Param()` 都会自动走校验：

```typescript
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // 开启 DTO 校验管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // 自动剥离 DTO 里没定义的字段
      forbidNonWhitelisted: true, // 多传字段直接 400（开发期建议开，能立刻发现 DTO 漏更新）
      transform: true,            // 自动把请求数据转成 DTO 实例（含类型转换）
      transformOptions: {
        enableImplicitConversion: true, // 根据 TS 类型自动转（"123" → 123，慎用）
      },
    }),
  );
  await app.listen(3000);
}
```

#### 三个核心选项详解

| 选项                                    | 默认值 | 行为                                                                                    |
| --------------------------------------- | ------ | --------------------------------------------------------------------------------------- |
| `whitelist`                             | `false` | DTO 里**没定义**的字段会被**静默剥离**（请求继续放行）                                     |
| `forbidNonWhitelisted`                  | `false` | DTO 里**没定义**的字段会**抛 400**（必须搭配 `whitelist: true` 使用）                      |
| `transform`                             | `false` | 把 `req.body` 从普通对象转成 DTO **类的实例**（`createCatDto instanceof CreateCatDto === true`） |
| `transformOptions.enableImplicitConversion` | `false` | 在 `transform` 基础上，**根据 TS 类型注解**自动做类型转换（`number` / `boolean` / `Date`） |

> 🛡️ **「严打」组合（推荐开发期使用）：** `whitelist: true` + `forbidNonWhitelisted: true`。一旦客户端传了 DTO 里没定义的字段就立刻报错，强制 DTO 跟接口契约保持同步。

### 🧱 编写 DTO

`class-validator` 提供了几十个开箱即用的装饰器，常用的有：

```typescript
// src/modules/cats/dto/create-cat.dto.ts
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsEmail,
  Length,
  Min,
  Max,
} from 'class-validator';

export enum CatBreed {
  英短 = 'BRITISH_SHORTHAIR',
  美短 = 'AMERICAN_SHORTHAIR',
  狸花 = 'CHINESE_LIHUA',
}

export class CreateCatDto {
  // 字符串：非空 + 类型 + 长度
  @IsNotEmpty({ message: '猫咪名字不能为空' })
  @IsString({ message: '猫咪名字必须是字符串' })
  @Length(1, 20, { message: '猫咪名字长度必须在 1-20 之间' })
  name: string;

  // 枚举：限定取值范围
  @IsEnum(CatBreed, { message: '猫咪品种必须是 英短 / 美短 / 狸花 之一' })
  breed: CatBreed;

  // 数字：先转换再校验，最后限制范围
  @Type(() => Number) // 把字符串显式转成数字（即使没开 enableImplicitConversion 也生效）
  @IsNumber({}, { message: '猫咪年龄必须是数字' })
  @Min(0, { message: '猫咪年龄不能小于 0' })
  @Max(30, { message: '猫咪年龄不能大于 30' })
  age: number;

  // 可选字段：用 @IsOptional() 标记，没传就跳过后续校验
  @IsOptional()
  @IsEmail({}, { message: '主人邮箱格式不正确' })
  ownerEmail?: string;
}
```

#### 常用校验装饰器速查

| 类别       | 装饰器                                                          | 作用                              |
| ---------- | --------------------------------------------------------------- | --------------------------------- |
| **存在性** | `@IsNotEmpty()` / `@IsOptional()` / `@IsDefined()`              | 必填 / 可选 / 必须定义（可为 null）|
| **基础类型** | `@IsString()` / `@IsNumber()` / `@IsBoolean()` / `@IsDate()`    | 类型校验                          |
| **数值范围** | `@Min(n)` / `@Max(n)` / `@IsPositive()` / `@IsInt()`            | 数值约束                          |
| **字符串** | `@Length(min, max)` / `@MinLength(n)` / `@MaxLength(n)` / `@Matches(regex)` | 长度 / 正则               |
| **格式**   | `@IsEmail()` / `@IsUrl()` / `@IsUUID()` / `@IsPhoneNumber('CN')` | 常见格式                          |
| **集合**   | `@IsEnum(EnumType)` / `@IsIn([...])` / `@IsArray()`             | 枚举 / 在集合中 / 数组            |
| **嵌套**   | `@ValidateNested()` + `@Type(() => SubDto)`                     | 校验对象内嵌套的 DTO              |

### 🔄 transform 自动转换的原理

JSON 协议里所有字段类型有限（字符串 / 数字 / 布尔 / null / 数组 / 对象），但 HTTP 协议里**`@Param()` 和 `@Query()` 永远是字符串**。`transform` 就是来解决这个落差的。

#### 三种转换触发方式

##### ① `@Type(() => XXX)`（精准、推荐）

显式告诉 ValidationPipe：「这个字段要转成 XXX 类型」。

```typescript
@Type(() => Number) // "123" → 123
@IsNumber()
age: number;

@Type(() => Date) // "2024-01-01" → Date 实例
@IsDate()
birthday: Date;
```

##### ② `enableImplicitConversion: true`（省事、但激进）

开启后，ValidationPipe 会**读取 TS 类型元数据**，自动按声明类型转换：

```typescript
@IsNumber()
age: number; // 不用写 @Type()，"123" 也能自动变成 123
```

代价：转换规则比较粗暴，比如：
- `"abc"` → `NaN`（会被 `@IsNumber()` 拦下，问题不大）
- `"false"` → `true`（**坑**！非空字符串都被当成 truthy）
- 一个不留神可能把不该转的字段转坏

##### ③ 路径参数 / 查询参数（开了 `transform` 就生效）

```typescript
// 开了 transform: true 之后
@Get(':id')
findOne(@Param('id') id: number) {  // ← 直接声明 number，不用 +id
  return this.catsService.findOne(id);
}
```

GET `/cats/5` 进来时，`id` 会被自动从 `"5"` 转成 `5`。

#### 转换对照表

| 输入（JSON / URL）    | 声明类型  | `@Type` 显式 | `enableImplicitConversion` | 结果           |
| --------------------- | --------- | ------------ | -------------------------- | -------------- |
| `"123"`               | `number`  | ✅           | ✅                         | `123`          |
| `"123"`               | `number`  | ❌           | ❌                         | 校验失败（仍是字符串） |
| `"abc"`               | `number`  | ✅ / ✅      | -                          | `NaN` → 校验失败 |
| `"true"` / `"false"`  | `boolean` | ❌           | ✅                         | ⚠️ 都是 `true`（坑） |
| `"2024-01-01"`        | `Date`    | ✅           | ✅                         | `Date` 实例    |
| `123`（数字）         | `string`  | ✅           | ✅                         | `"123"`        |

### 📨 让校验错误返回详细信息

ValidationPipe 默认抛 `BadRequestException`，错误详情藏在 `exception.getResponse()` 里：

```typescript
// 校验失败时 exception.getResponse() 的结构
{
  statusCode: 400,
  message: [
    "猫咪名字不能为空",
    "猫咪年龄必须是数字"
  ],
  error: "Bad Request"
}
```

但如果过滤器只取 `exception.message`，前端永远只能看到 `"Bad Request Exception"` 这种没用的文案。需要在过滤器里**优先取 `getResponse().message`**：

```typescript
// src/exception/error-exception.filter.ts
@Catch(HttpException)
export class InterceptorExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const errorResponse = exception.getResponse();
    let message: string | string[] = exception.message;

    // 校验失败时，详细错误在 getResponse() 返回的对象的 message 字段里
    if (typeof errorResponse === 'object' && errorResponse !== null) {
      const detail = (errorResponse as { message?: string | string[] }).message;
      if (detail) message = detail; // 字符串数组（多个错误）或单个字符串
    }

    response.status(exception.getStatus()).json({
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      code: exception.getStatus(),
      success: false,
    });
  }
}
```

改造后，前端拿到的响应：

```json
{
  "timestamp": "2026-05-22T...",
  "path": "/cats",
  "message": [
    "猫咪名字不能为空",
    "猫咪年龄必须是数字",
    "猫咪年龄不能小于 0"
  ],
  "code": 400,
  "success": false
}
```

字段错在哪、错在什么规则上，一目了然。

### 🔁 复用 DTO：`PartialType` / `PickType` / `OmitType`

`@nestjs/mapped-types` 提供了几个工具，避免重复写校验装饰器：

```bash
pnpm add @nestjs/mapped-types
```

```typescript
import { PartialType, PickType, OmitType } from '@nestjs/mapped-types';
import { CreateCatDto } from './create-cat.dto';

// 更新场景：所有字段变成可选（PATCH 请求常用）
export class UpdateCatDto extends PartialType(CreateCatDto) {}

// 只挑几个字段
export class CatNameDto extends PickType(CreateCatDto, ['name'] as const) {}

// 排除几个字段
export class PublicCatDto extends OmitType(CreateCatDto, ['ownerEmail'] as const) {}
```

复用的 DTO 自动继承父类的所有装饰器（`@IsString()` / `@IsNotEmpty()` 等），不用重新写。

### 🕳️ 几个常见的坑

1. **`@IsNumber()` 写成 `@IsNumber({ message: '...' })`**
   `@IsNumber()` 第一个参数是**选项对象**（`allowNaN` / `allowInfinity` / `maxDecimalPlaces`），第二个参数才是 `message`。正确写法：`@IsNumber({}, { message: '必须是数字' })`，第一个参数传 `{}` 占位。

2. **DTO 写成接口（`interface`）而不是类（`class`）**
   `class-validator` 装饰器**只能贴在 class 上**。接口在编译后会被擦除，运行时 ValidationPipe 拿不到任何元数据，校验直接失效。

3. **忘了在 `tsconfig.json` 里开 `emitDecoratorMetadata`**
   ```json
   {
     "compilerOptions": {
       "experimentalDecorators": true,
       "emitDecoratorMetadata": true   // 没这一行，@Type() 和隐式转换都会失效
     }
   }
   ```
   Nest 脚手架默认开了，但手动迁移项目时容易漏。

4. **`transform: true` 没开，却期望 `@Param('id') id: number` 自动转**
   不开 `transform`，`id` 永远是字符串，`+id` 或 `Number(id)` 是兜底方案。开了之后才能享受自动转换的便利。

5. **`forbidNonWhitelisted` 在线上也开着**
   开发期开是好事；但生产环境如果客户端版本多样（旧版客户端可能多带些字段），建议只保留 `whitelist: true`（静默剥离），避免无谓的 400。

### 怎么选？一句话决策

- **后端是单体应用、前端就你自己** → 开**严打**组合（`whitelist + forbidNonWhitelisted`），逼自己同步 DTO
- **对外开放 API、客户端版本难控** → 只开 `whitelist`，宽容一点
- **DTO 字段不多、想最少的代码** → 开 `enableImplicitConversion`，省去一堆 `@Type()`
- **DTO 复杂、想精准控制** → 老老实实写 `@Type()`，规则清晰可读
- **错误文案要给前端展示** → 装饰器都加 `{ message: '...' }`，过滤器从 `getResponse().message` 取数组

## 文件上传

> Nest 文件上传基于 [multer](https://github.com/expressjs/multer) 中间件，通过拦截器（Interceptor）把解析后的文件对象注入到 handler 参数中。单文件用 `FileInterceptor`，多文件用 `FilesInterceptor`，不同字段各一个文件用 `FileFieldsInterceptor`。

### 📦 安装依赖

```bash
# multer 本体（Express 默认已内置，通常不用额外装）
pnpm add multer
# 类型定义
pnpm add -D @types/multer
```

### ⚙️ 存储配置（diskStorage）

```ts
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// 磁盘存储策略：控制存到哪、文件名怎么起
const storage = diskStorage({
  destination(req, file, cb) {
    // 目录不存在时自动递归创建
    const uploadPath = join(process.cwd(), 'uploads');
    if (!existsSync(uploadPath)) {
      mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename(req, file, cb) {
    // 生成唯一文件名：时间戳 + 随机数 + 原始扩展名，避免重名覆盖
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
  },
});
```

### 🗂️ 单文件上传

```ts
import { Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

// 字段名 'file' 对应前端 FormData 中的 key
@Post('file')
@UseInterceptors(FileInterceptor('file', { storage }))
uploadFile(@UploadedFile() file: UploadedFile) {
  return this.uploadService.saveFile(file);
}
```

前端调用：

```html
<input type="file" name="file" />
```

```js
const formData = new FormData();
formData.append('file', fileInput.files[0]);
await fetch('/upload/file', { method: 'POST', body: formData });
```

### 🗂️ 多文件上传

```ts
import { Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';

// 'files' 是字段名，10 是最大文件数量限制
@Post('files')
@UseInterceptors(FilesInterceptor('files', 10, { storage }))
uploadFiles(@UploadedFiles() files: UploadedFile[]) {
  return this.uploadService.saveFiles(files);
}
```

前端调用：

```html
<input type="file" multiple name="files" />
```

```js
const formData = new FormData();
// 多个文件使用同一个字段名
for (const file of fileInput.files) {
  formData.append('files', file);
}
await fetch('/upload/files', { method: 'POST', body: formData });
```

### 🗂️ 多字段上传（不同字段各传不同文件）

```ts
import { Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

// 适合表单中有多种不同用途文件的场景，比如头像 + 简历
@Post('profile')
@UseInterceptors(FileFieldsInterceptor([
  { name: 'avatar', maxCount: 1 },
  { name: 'documents', maxCount: 5 },
], { storage }))
uploadProfile(@UploadedFiles() files: {
  avatar?: UploadedFile[];
  documents?: UploadedFile[];
}) {
  return {
    avatar: files.avatar?.[0],
    documents: files.documents,
  };
}
```

### 三种拦截器速查

| 拦截器 | 用途 | 参数装饰器 |
| --- | --- | --- |
| `FileInterceptor(fieldName, opts)` | 单文件 | `@UploadedFile()` |
| `FilesInterceptor(fieldName, maxCount, opts)` | 同字段名多文件 | `@UploadedFiles()` |
| `FileFieldsInterceptor(fields[], opts)` | 不同字段各传文件 | `@UploadedFiles()` |

### 📄 文件对象字段说明

上传成功后 `file` 对象包含以下字段：

| 字段 | 说明 | 示例 |
| --- | --- | --- |
| `originalname` | 用户上传时的原始文件名 | `photo.jpg` |
| `filename` | 存储到磁盘后的文件名 | `1716700000000-123456789.jpg` |
| `path` | 文件完整磁盘路径 | `/app/uploads/1716700000000-123456789.jpg` |
| `destination` | 存储目录 | `/app/uploads` |
| `mimetype` | 文件 MIME 类型 | `image/jpeg` |
| `size` | 文件大小（字节） | `204800` |

### 🕳️ 几个常见的坑

#### 坑 1：字段名对不上

前端 `formData.append('avatar', file)` 但后端写的是 `FileInterceptor('file')`，结果 `@UploadedFile()` 拿到 `undefined`。**字段名必须严格一致**。

#### 坑 2：多文件用了 `FileInterceptor`

`FileInterceptor` 只处理单个文件。前端传了多个文件但后端用 `FileInterceptor`，只会接收到第一个。多文件必须用 `FilesInterceptor`。

#### 坑 3：没做文件大小 / 类型校验

生产环境务必限制上传大小和文件类型，防止恶意上传：

```ts
import { BadRequestException } from '@nestjs/common';

// 在 storage 选项同级传入 limits 和 fileFilter
const uploadOptions = {
  storage,
  // 限制单文件最大 5MB
  limits: { fileSize: 5 * 1024 * 1024 },
  // 只允许图片类型
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new BadRequestException('只允许上传图片文件'), false);
    }
    cb(null, true);
  },
};

@UseInterceptors(FileInterceptor('file', uploadOptions))
```

#### 坑 4：uploads 目录被 git 提交

在 `.gitignore` 中加上 `uploads/`，避免把用户上传的文件提交到仓库。

### 怎么选？一句话决策

- **一次只传一个文件** → `FileInterceptor`
- **一次传多个、同一个字段** → `FilesInterceptor`，第二个参数控制数量上限
- **表单有多种文件字段（头像 + 附件）** → `FileFieldsInterceptor`
- **想存云端（OSS / S3）而非本地** → 自定义 storage engine 或在 Service 层拿到 buffer 后上传


## JWT 认证

> Nest 的 JWT 认证基于 [@nestjs/jwt](https://github.com/nestjs/jwt) + [@nestjs/passport](https://github.com/nestjs/passport) + [passport-jwt](https://github.com/mikenicholson/passport-jwt)。JwtModule 负责签发/验证 token，Passport 负责从请求头中解析 token 并挂载到 `request.user`。通常采用**全局守卫 + @Public() 豁免**模式：所有路由默认需要 token，登录/注册等路由用 `@Public()` 跳过即可。

### 📦 安装依赖

```bash
pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt
pnpm add -D @types/passport-jwt
```

### ⚙️ 在 `app.module.ts` 中配置 ConfigModule 校验环境变量

```ts
// src/app.module.ts — Joi 校验部分
import * as Joi from 'joi';

ConfigModule.forRoot({
  validationSchema: Joi.object({
    JWT_SECRET: Joi.string().required(),
  }),
}),
```

`.env` 文件：

```env
JWT_SECRET=123456
```

### ⚙️ AuthModule：注册 JwtModule + 守卫

```ts
// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    PassportModule,
    // 异步注册：从 ConfigService 读取 JWT_SECRET，而非硬编码
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    // 全局守卫已注释，改用局部 @UseGuards(JwtAuthGuard) 按需加在 Controller 上
    // { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  // 导出 JwtModule，其他模块如需 JwtService 可直接 import AuthModule
  exports: [JwtModule],
})
export class AuthModule {}
```

### 🧱 JwtStrategy：注册 Passport JWT 策略

passport-jwt 的策略只有一个职责：**从 Bearer token 中解析出 payload 并返回值，之后挂到 `request.user` 上**。下面的 `secretOrKey` 必须和签发 token 时的 secret 一致。

```ts
// src/modules/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // JWT_SECRET 已在 AppModule 的 Joi schema 中标记为 required，启动时必定存在
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  // 验证通过后，返回值挂到 request.user
  async validate(payload: { sub: number; email: string }) {
    return { id: payload.sub, email: payload.email };
  }
}
```

### 🧱 JwtAuthGuard：全局守卫 + @Public() 豁免

全局守卫默认拦截所有路由。通过 `Reflector` 读取路由元数据，遇到 `@Public()` 标记就放行，否则走 passport jwt 校验。

```ts
// src/modules/auth/guards/jwt-auth.guard.ts
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }
}
```

### 🧱 @Public() 装饰器：标记公开路由

```ts
// src/modules/auth/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

### 🧱 @CurrentUser() 装饰器：直接从 request.user 中提取当前用户

不用在 controller 里手动 `req.user`，用参数装饰器一行注入。

```ts
// src/modules/auth/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

Controller 中使用：

```ts
@Get()
findAll(@CurrentUser() user: { id: number; email: string }) {
  // user = { id: 1, email: 'admin@example.com' }
  return this.catsService.findAll(user);
}
```

### 🧱 AuthController：登录接口

登录是获取 token 的唯一入口，必须加 `@Public()` 免守卫。

```ts
// src/modules/auth/auth.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() createAuthDto: CreateAuthDto) {
    return this.authService.login(createAuthDto);
  }
}
```

### 🧱 AuthService：签发 token

`jwtService.signAsync(payload)` 用 `JWT_SECRET` + 过期时间签发 JWT。`sub`（subject）是 JWT 注册声明中的常用字段，放用户 ID。

```ts
// src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CreateAuthDto } from './dto/create-auth.dto';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(createAuthDto: CreateAuthDto) {
    // WHY: 先写死一个固定用户演示流程，接入数据库后替换为按账号查询
    const user = { id: 1, email: 'admin@example.com' };

    if (!user) {
      throw new UnauthorizedException('账号或密码错误');
    }

    // sub 是 JWT 标准字段，存用户 ID；validate 中从 sub 还原当前用户
    const payload = { sub: user.id, email: user.email };

    return {
      data: {
        access_token: await this.jwtService.signAsync(payload),
      },
    };
  }
}
```

### 🔁 完整请求流程

```
1. POST /auth/login               → body: { username, password }
2. AuthService.login() 校验用户    → jwtService.signAsync({ sub: 1, email: '...' })
3. 返回 { data: { access_token } } → 前端存到 localStorage/sessionStorage
4. GET /cats Authorization: Bearer <token>
5. JwtAuthGuard → JwtStrategy.validate() → 解析出 { id, email } 挂到 request.user
6. Controller 通过 @CurrentUser() 拿到当前用户
```

### 🍪 Cookie 认证：httpOnly 方式

上面的流程是前端把 token 存 `localStorage`，每次请求手动拼 `Authorization` 头。但 `localStorage` 能被任何 JS 代码读到，存在 XSS 风险。**httpOnly cookie** 是更安全的方案——浏览器自动携带，JS 无法读取。

#### 登录时签发 httpOnly cookie

在 `AuthService.login()` 中，除了返回 token 到响应体，还通过 `res.cookie()` 写入一个 httpOnly cookie：

```ts
// auth.service.ts
res.cookie('access_token', accessToken, {
  httpOnly: true,  // JS 读不到，防 XSS
  secure: false,   // 生产环境必须 true（仅 HTTPS 传输）
  sameSite: 'none', // 前后端分离时需设为 'none'，配合 secure: true
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
});
```

设置后浏览器收到响应会自动存储这个 cookie，后续所有同源请求都会自动带上。

#### cookie-parser：解析前端发来的 cookie

前端后续请求会自动带上 `Cookie: access_token=eyJhbGci...`。后端需要 `cookie-parser` 中间件来解析：

```ts
// main.ts
import cookieParser from 'cookie-parser';

app.use(cookieParser()); // 把 Cookie 字符串解析成 req.cookies 对象
```

安装依赖（已装）：

```bash
pnpm add cookie-parser
pnpm add -D @types/cookie-parser
```

#### JwtStrategy：同时从 cookie 和 header 取 token

改 `jwtFromRequest`，用 `ExtractJwt.fromExtractors` 组合两种提取方式——cookie 优先，header 回退：

```ts
// jwt.strategy.ts
import type { Request } from 'express';

jwtFromRequest: ExtractJwt.fromExtractors([
  // 方式一：从 cookie 提取（浏览器场景，自动携带）
  (req: Request): string | null => req?.cookies?.access_token ?? null,
  // 方式二：从 Authorization header 提取（移动端 / 非浏览器场景）
  ExtractJwt.fromAuthHeaderAsBearerToken(),
]),
```

这样同一个接口既支持浏览器（cookie 自动带 token），也支持 Postman / 移动端（手动拼 header）。

#### 在 Service 中读取 cookie 和 token

通过 `@Inject(REQUEST)` 注入请求对象，就能在任何 service 里拿到原始 cookie 和 token：

```ts
// cats.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';

@Injectable()
export class CatsService {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  async findAll(user: { id: number; email: string }) {
    // 打印所有 cookie
    console.log('前端 cookies:', this.request.cookies);
    // 打印 access_token
    const cookies = this.request.cookies as Record<string, string> | undefined;
    console.log('cookie 中的 access_token:', cookies?.access_token);
    // 打印 Authorization 请求头
    console.log('请求头 Authorization:', this.request.headers.authorization);

    // user 仍然是 JWT 解析后的用户信息 { id, email }
    console.log('当前用户:', user);
  }
}
```

#### 🔁 Cookie 认证流程

```
1. POST /auth/login                    → AuthService 签发 JWT，写入 httpOnly cookie
2. 浏览器自动存储 cookie（JS 不可见）
3. GET /cats                           → 浏览器自动带 Cookie: access_token=<token>
4. cookie-parser 中间件                → 解析 Cookie 字符串为 req.cookies 对象
5. JwtAuthGuard → JwtStrategy          → ExtractJwt 优先从 cookie 取，header 回退
6. 验签通过 → request.user = { id, email }
7. Controller @CurrentUser() 拿到用户信息
8. Service 可通过 @Inject(REQUEST) 拿原始 cookie / token
```

#### 🆚 cookie vs header 方案对比

| | httpOnly Cookie | Authorization Header |
|---|---|---|
| 防 XSS | ✅ JS 读不到 | ❌ localStorage 可被 XSS 窃取 |
| 防 CSRF | ⚠️ 需配合 sameSite | ✅ 天然免疫 |
| 前端改动 | 零改动（浏览器自动） | 需要手动加请求头 |
| 移动端 / 非浏览器 | ❌ 不适用 | ✅ 通用 |
| 跨域 | 需 sameSite=None + secure | 无额外限制 |

**当前项目采用双模式兼容：cookie 优先 + header 回退**，一个接口同时覆盖浏览器和非浏览器场景。

### 🕳️ 几个常见的坑

#### 坑 1：没加 `@Public()` 导致登录接口 401（仅全局守卫模式）

使用 `APP_GUARD` 全局模式时，登录接口不加 `@Public()` 会直接返回 401。**如果用局部 `@UseGuards()` 模式，没贴守卫的路由天然公开，不存在这个问题。**

#### 坑 2：secret 不一致

`JwtModule.registerAsync` 中签发的 `secret` 和 `JwtStrategy` 中 `super()` 传入的 `secretOrKey` 必须是同一个值。一个常见的错误是签发用了环境变量，策略里又写了一个新的。

#### 坑 3：Bearer 前缀没写或写错

前端请求头必须是 `Authorization: Bearer <token>`，不能省略 `Bearer ` 前缀（注意有个空格）。`ExtractJwt.fromAuthHeaderAsBearerToken()` 只认 `Bearer` 开头的 token。

#### 坑 4：token 过期却查不到原因

`signOptions.expiresIn` 是字符串格式，写 `'7d'` 表示 7 天，**不要写成数字**（`expiresIn: 7` 表示 7 秒）。测试时建议先写短一点（如 `'30m'`）快速验证过期逻辑。

### 🏗️ 全局守卫 vs 局部守卫：两种架构选择

JwtAuthGuard 可以用**全局**或**局部**两种方式生效，分别适合不同场景。

#### 方式一：全局守卫

通过 `APP_GUARD` 注入令牌把守卫注册为全局，所有路由默认需要 token，登录等公开接口用 `@Public()` 豁免。**当前项目已注释掉此方式，改用方式二的局部守卫。**

```ts
// auth.module.ts
import { APP_GUARD } from '@nestjs/core';

@Module({
  providers: [
    AuthService,
    JwtStrategy,
    // APP_GUARD 是 NestJS 内置注入令牌，任何以它注册的守卫自动应用到所有路由
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AuthModule {}
```

```ts
// 公开路由上加 @Public() 跳过校验
@Public()
@Post('login')
login() {}
```

**适合：大多数接口需要认证，只有少数开放。**

#### 方式二：局部守卫（去掉全局，当前项目采用）

如果只是个别接口需要认证，删掉 `APP_GUARD`，改用 `@UseGuards()` 按需贴在需要的路由或 Controller 上。

**① 在 auth.module.ts 中注释或删掉 APP_GUARD：**

```ts
// src/modules/auth/auth.module.ts —— 注释掉全局守卫
@Module({
  providers: [
    AuthService,
    JwtStrategy,
    // 全局注册 JWT 守卫，所有路由默认需要 token 校验
    // {
    //   provide: APP_GUARD,
    //   useClass: JwtAuthGuard,
    // },
  ],
})
export class AuthModule {}
```

**② 在需要认证的 Controller 上加 `@UseGuards(JwtAuthGuard)`：**

```ts
// src/modules/cats/cats.controller.ts —— 局部守卫实战案例
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('cats')
@UseGuards(JwtAuthGuard) // 整个 Controller 都需要带 token 才能访问
export class CatsController {
  constructor(private readonly catsService: CatsService) {}

  @Post()
  create(@Body() createCatDto: CreateCatDto) {
    return this.catsService.create(createCatDto);
  }

  @Get()
  findAll(@CurrentUser() user: { id: number; email: string }) {
    // user 就是 JwtStrategy.validate() 解析出来的当前登录用户 { id, email }
    return this.catsService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.catsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCatDto: UpdateCatDto) {
    return this.catsService.update(+id, updateCatDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.catsService.remove(+id);
  }
}
```

> `@UseGuards(JwtAuthGuard)` 也可以只挂在单个路由上（`@UseGuards(...)` 写在 `@Get()` 下方），适合只有个别路由需要认证的场景。

**适合：大部分接口公开，只有少数需要登录。**

#### 怎么选？一句话决策

- **所有接口默认需要登录** → `APP_GUARD` + `@Public()` 白名单模式（方式一）
- **只有个别接口需要登录** → 删掉 `APP_GUARD`，用 `@UseGuards()` 按需加（方式二）
- **需要区分角色（admin / user）** → 在 jwt payload 中加 `role` 字段，配合 `@Roles('admin')` 装饰器 + RolesGuard 做权限判断


## 定时任务

> Nest 的定时任务基于 [@nestjs/schedule](https://docs.nestjs.com/techniques/task-scheduling)，支持三种定时方式：`@Cron`（Cron 表达式）、`@Interval`（固定间隔）、`@Timeout`（延时一次）。底层依赖 [node-cron](https://github.com/kelektiv/node-cron) 解析表达式，`setInterval`/`setTimeout` 处理间隔和超时。

### 📦 安装依赖

```bash
pnpm add @nestjs/schedule
```

### ⚙️ 在 `app.module.ts` 中注册

```ts
// src/app.module.ts
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(), // 注册定时任务模块
  ],
})
export class AppModule {}
```

### 🧱 三种定时方式

#### 方式一：`@Cron` — Cron 表达式（最灵活）

```ts
// src/modules/task/task.controller.ts
import { Cron } from '@nestjs/schedule';

@Controller('task')
export class TaskController {
  @Cron('45 * * * * *') // 每分钟第45秒执行
  handleCron() {
    console.log('定时任务执行了');
  }
}
```

#### 方式二：`@Interval` — 固定间隔（最简单）

```ts
import { Interval } from '@nestjs/schedule';

@Controller('task')
export class TaskController {
  @Interval(10000) // 每10秒执行一次
  handleInterval() {
    console.log('Interval 定时任务执行了');
  }
}
```

#### 方式三：`@Timeout` — 延时一次（启动后执行一次）

```ts
import { Timeout } from '@nestjs/schedule';

@Controller('task')
export class TaskController {
  @Timeout(5000) // 应用启动5秒后执行一次
  handleTimeout() {
    console.log('Timeout 定时任务执行了');
  }
}
```

### 🕐 Cron 表达式详解

`@nestjs/schedule` 使用 **6 位** Cron 表达式（比 Linux 标准多一位秒）：

```
秒 分 时 日 月 周
*  *  *  *  *  *
```

| 表达式 | 含义 |
| --- | --- |
| `'45 * * * * *'` | 每分钟第45秒 |
| `'0 */5 * * * *'` | 每5分钟 |
| `'0 0 9 * * 1-5'` | 工作日早9点 |
| `'0 0 0 1 * *'` | 每月1号零点 |
| `'0 30 18 * * 5'` | 每周五18:30 |

#### 通配符说明

| 符号 | 含义 | 示例 |
| --- | --- | --- |
| `*` | 任意值 | `* * * * * *` 每秒 |
| `1,15` | 枚举值 | `0 0 9,18 * * *` 每天9点和18点 |
| `1-5` | 范围 | `0 0 9 * * 1-5` 周一到周五9点 |
| `*/5` | 步长 | `0 */10 * * * *` 每10分钟 |
| `45` | 精确值 | `45 * * * * *` 每分钟第45秒 |

### 🕳️ 几个常见的坑

#### 坑 1：忘记 `ScheduleModule.forRoot()`

没在 `AppModule` 的 `imports` 中注册 `ScheduleModule.forRoot()`，`@Cron` / `@Interval` / `@Timeout` 都不会生效，控制台也没有报错提示。

#### 坑 2：Cron 表达式写了 5 位而不是 6 位

Linux 标准的 cron 是 5 位（`分 时 日 月 周`），但 `@nestjs/schedule` 的 `@Cron` 是 **6 位**，最前面多了 `秒`：

```ts
// ❌ 5 位 — 不会生效
@Cron('0 9 * * 1-5')

// ✅ 6 位
@Cron('0 0 9 * * 1-5')
```

#### 坑 3：把 `@Cron` 放在没有被注册的类上

装饰器必须放在被 Nest DI 容器管理的类（Controller / Service / Provider）中才能生效。如果放在一个普通的没有被 `@Injectable()` 装饰且没有在 `providers` 中注册的类上，定时任务不会执行。

#### 坑 4：动态任务无法用装饰器

`@Cron` / `@Interval` 的表达式在编译时就固定了，无法在运行时动态调整。如果需要动态增删改定时任务，需要用 `SchedulerRegistry` 手动管理：

```ts
import { SchedulerRegistry } from '@nestjs/schedule';

@Injectable()
export class DynamicTaskService {
  constructor(private schedulerRegistry: SchedulerRegistry) {}

  addCronJob(name: string, cronExpression: string) {
    const job = new CronJob(cronExpression, () => {
      console.log('动态定时任务执行');
    });
    this.schedulerRegistry.addCronJob(name, job);
    job.start();
  }

  deleteCronJob(name: string) {
    this.schedulerRegistry.deleteCronJob(name);
  }
}
```

### 怎么选？一句话决策

- **固定时间点执行（如每天9点发日报）** → `@Cron`
- **固定间隔执行（如每10秒检查一次状态）** → `@Interval`
- **启动后延时执行一次（如预热缓存）** → `@Timeout`
- **在运行时动态增删改定时任务** → `SchedulerRegistry`


## 队列（BullMQ 异步任务处理）

> 定时任务适合固定时间点执行，但如果任务**耗时长**（加水印、发邮件、导出报表）或**需要失败重试**，就应该丢到队列里异步执行。队列让接口秒回，任务后台慢慢跑。Nest 基于 [@nestjs/bullmq](https://docs.nestjs.com/techniques/queues) 封装了 [BullMQ](https://docs.bullmq.io/)，底层依赖 Redis 做消息持久化。

### 为什么要用队列

| 场景 | 定时任务 `@Cron` | 队列 BullMQ |
|------|----------------|-------------|
| 上传后加水印 | ❌ 轮询扫描，文件多了性能差 | ✅ 上传完直接丢任务 |
| 发送验证码邮件 | ❌ 接口要等发完才返回 | ✅ 丢队列秒回，后台发 |
| 导出 1 万条 Excel | ❌ 请求超时 | ✅ 后台导出，完了通知用户 |
| 任务失败需要重试 | ❌ 自己写重试逻辑 | ✅ `attempts` 配置即可 |

### 📦 安装依赖

```bash
pnpm add @nestjs/bullmq bullmq
```

### ⚙️ 在 `app.module.ts` 中注册

```ts
// src/app.module.ts
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    // 第一步：连接 Redis（队列数据存储）
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),
    // 第二步：注册队列（告诉 BullMQ 有哪些队列）
    BullModule.registerQueue({
      name: 'task-queue',
    }),
  ],
})
export class AppModule {}
```

### 🧱 生产者 — 往队列丢任务

生产者可以在 Controller 或 Service 中注入队列，调用 `add()` 把任务丢进去：

```ts
// src/modules/upload/upload.service.ts
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class UploadService {
  // 注入队列实例 — Service 自己持有，不需要 Controller 透传
  constructor(
    @InjectQueue('task-queue') private readonly watermarkQueue: Queue,
  ) {}

  async saveFile(file: UploadedFile) {
    // ...校验逻辑...

    // 把加水印任务丢到队列，不阻塞上传接口的响应
    await this.watermarkQueue.add('watermark', {
      filename: file.filename,
      path: file.path,
    });

    return { message: '上传成功，水印后台处理中' };
  }
}
```

```ts
// src/modules/upload/upload.controller.ts
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('file')
  @UseInterceptors(FileInterceptor('file', { storage }))
  uploadFile(@UploadedFile() file: UploadedFile) {
    // Controller 只管接收请求，队列由 Service 处理
    return this.uploadService.saveFile(file);
  }
}
```

### 🧱 消费者 — 从队列取任务执行

消费者用 `@Processor('队列名')` 标记，`process()` 方法每收到一个任务就自动执行：

```ts
// src/modules/upload/watermark.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import sharp from 'sharp';
import { basename, dirname, extname, join } from 'path';

// 生成右下角水印 SVG（sharp 不支持直接写文字，通过 composite SVG 实现）
function createWatermarkSvg(text: string, width: number, height: number): Buffer {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="${width - 30}" y="${height - 30}" font-size="48"
            fill="rgba(255,255,255,0.6)" text-anchor="end"
            font-family="Microsoft YaHei, Arial, sans-serif">
        ${text}
      </text>
    </svg>`;
  return Buffer.from(svg);
}

@Processor('task-queue')
export class WatermarkProcessor extends WorkerHost {
  async process(job: Job<{ filename: string; path: string }, any, string>) {
    const { filename, path: filePath } = job.data;

    // 输出文件名：原名_watermark.ext
    const ext = extname(filename);
    const name = basename(filename, ext);
    const outputPath = join(dirname(filePath), `${name}_watermark${ext}`);

    // 读原图尺寸 → 生成 SVG → composite 叠加
    const { width = 1920, height = 1080 } = await sharp(filePath).metadata();
    const watermarkSvg = createWatermarkSvg('Nest Study', width, height);

    await sharp(filePath)
      .composite([{ input: watermarkSvg, top: 0, left: 0 }])
      .toFile(outputPath);
  }
}
```

### 🧱 在模块中注册消费者

消费者虽然 `@Processor()` 内部自带了 `@Injectable()`，但**仍然需要放进 `providers`**，否则 Nest 不知道它的存在：

```ts
// src/modules/upload/upload.module.ts
import { BullModule } from '@nestjs/bullmq';
import { WatermarkProcessor } from './watermark.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'task-queue' })],
  controllers: [UploadController],
  providers: [UploadService, WatermarkProcessor], // 消费者必须注册！
})
export class UploadModule {}
```

### 🔁 完整流程

```
用户上传图片 → Controller 接收 → Service 保存文件 + add() 丢任务到 Redis
                                    ↓
        接口立即返回（不等待水印完成）
                                    ↓
    WatermarkProcessor 从 Redis 取出任务 → sharp 加水印 → 输出 _watermark 文件
```

### 🔧 任务高级配置

`add()` 第三个参数控制重试、延迟、优先级等：

```ts
await this.watermarkQueue.add('watermark', data, {
  delay: 1000,                              // 延迟 1 秒执行
  attempts: 3,                              // 失败后最多重试 3 次
  backoff: { type: 'fixed', delay: 5000 },  // 每次重试间隔 5 秒
  priority: 1,                              // 优先级（数字越小优先级越高）
  removeOnComplete: true,                   // 完成后自动删除（避免 Redis 内存泄漏）
  removeOnFail: 50,                         // 保留最近 50 条失败记录
});
```

### 🕳️ 几个常见的坑

#### 坑 1：消费者没放进 `providers`

`@Processor('xxx')` 虽然自带 `@Injectable()`，但 Nest **不做自动扫描**。忘记加 `providers`，队列里任务堆积但永远没人消费。

#### 坑 2：`@InjectQueue()` 名字对不上

Controller/Service 里 `@InjectQueue('task-queue')` 和 `BullModule.registerQueue({ name: 'task-queue' })`、`@Processor('task-queue')` 三处名字必须完全一致。

#### 坑 3：忘记开启 Redis

BullMQ 依赖 Redis 存储任务数据。Redis 没启动时，`add()` 会报 `connect ECONNREFUSED`。

#### 坑 4：`addJob` 是 protected 方法

```ts
// ❌ addJob 是 Queue 内部的 protected 方法，外部不能调
await queue.addJob('xxx', data);
// ✅ 用 add() 公开方法
await queue.add('xxx', data);
```

#### 坑 5：任务完成后 Redis 内存越来越大

默认情况下，已完成的任务记录会一直保留在 Redis 里。生产环境务必加 `removeOnComplete: true` 或设置全局清理策略。

### 怎么选？一句话决策

- **固定时间点跑（如日报、清理过期数据）** → `@Cron` 定时任务
- **请求触发的异步操作（加水印、发邮件、导出）** → BullMQ 队列
- **定时任务耗时长 / 需要重试** → `@Cron` 触发 `add()`，实际处理丢给队列


## Winston 日志（nest-winston + winston-daily-rotate-file）

> 用 Winston 接管 NestJS 默认日志，支持控制台美化 + 按天滚动落盘 + 错误日志分离。

### 📦 安装依赖

```bash
pnpm add nest-winston winston winston-daily-rotate-file
```

| 包名 | 作用 |
| --- | --- |
| `winston` | 日志核心库，支持多 transport、日志级别、格式化 |
| `nest-winston` | NestJS 适配层，提供 `WinstonModule` 和 `nestLike` 格式 |
| `winston-daily-rotate-file` | 按天自动切分日志文件，支持压缩和自动清理 |

### ⚙️ 日志配置文件（[nest/src/winston/index.ts](nest/src/winston/index.ts)）

```ts
import { WinstonModule, utilities as nestWinstonUtilities } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

const winstonLogger = {
  logger: WinstonModule.createLogger({
    transports: [
      // 控制台打印 — 开发环境用 nestLike 格式，带颜色和时间戳
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.ms(),
          nestWinstonUtilities.format.nestLike('JKVideo', {
            colors: true,
            prettyPrint: true,
          }),
        ),
      }),

      // 按天滚动 — 常规日志写入 logs/app-yyyy-mm-dd.log
      new winston.transports.DailyRotateFile({
        dirname: join(process.cwd(), 'logs'),
        filename: 'app-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,    // 旧日志自动压缩为 .gz
        maxSize: '20m',         // 单文件超过 20MB 自动切分
        maxFiles: '14d',        // 只保留最近 14 天
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(), // 落盘用 JSON，方便接入 ELK / Grafana 等
        ),
      }),

      // 错误日志分离 — 只记录 error 级别，存入 errors-yyyy-mm-dd.log
      new winston.transports.DailyRotateFile({
        dirname: join(process.cwd(), 'logs'),
        filename: 'errors-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',          // 只抓 error 级别
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',         // 错误日志多保留一些，30 天
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    ],
  }),
};
export { winstonLogger };
```

### ⚙️ 在 `main.ts` 中替换默认 Logger

```ts
import { winstonLogger } from './winston';

const app = await NestFactory.create(AppModule, {
  logger: winstonLogger.logger, // 用 Winston 替换 NestJS 默认 Logger
});
```

### 🗂️ 三种 transport 的分工

| Transport | 目标 | 级别 | 格式 | 保留策略 |
| --- | --- | --- | --- | --- |
| `Console` | 开发调试 | 全部 | nestLike 彩色 | 不落盘 |
| `DailyRotateFile` (app) | 常规日志归档 | 全部 | JSON | 14 天 |
| `DailyRotateFile` (errors) | 错误追踪 | `error` only | JSON | 30 天 |

### 🕳️ 几个常见的坑

#### 坑 1：`logs/` 目录被 git 提交

在 `.gitignore` 中加上 `logs/`，否则日志文件会被提交到仓库。

#### 坑 2：用了 Winston 后 `Logger` 注入还是 Nest 默认的

如果代码中用 `@Inject(Logger)` 或 `new Logger()`，拿到的是 Nest 默认 Logger 而非 Winston。需要注入时，建议通过 `app.get()` 获取 Winston 实例，或者在模块层用自定义 provider 覆盖。

#### 坑 3：生产环境控制台也开了 nestLike 格式

`nestLike` 格式带 ANSI 颜色码，输出到 Docker / K8s 日志收集时可能变成乱码。生产环境建议关闭 `colors` 或直接移除 Console transport。

#### 坑 4：`maxFiles` 到期后日志没自动删除

`winston-daily-rotate-file` 只在**新日志写入前**才检查并清理过期文件。如果应用长期没有日志输出，旧文件不会被主动清理。

### 怎么选？一句话决策

- **开发环境看日志** → Console transport 的 `nestLike` 格式，带颜色、带时间戳
- **生产环境查历史** → DailyRotateFile，JSON 格式落盘，方便 grep / ELK 检索
- **线上排错** → 单独切出 `errors-%DATE%.log`，只看 error 级别，不受普通日志噪音干扰


## API 版本控制（VersioningType）

> 当接口需要做不兼容变更时，同时保留新旧两版让客户端按自己的节奏迁移，避免"一上线就炸"。

### 三种版本策略

| 策略 | 版本放哪 | 示例 | 适用场景 |
| --- | --- | --- | --- |
| `VersioningType.URI` | URL 路径 | `/v1/cats`、`/v2/cats` | **工业界推荐**，直观、好调试、网关友好 |
| `VersioningType.HEADER` | 请求头 | `Accept-Version: 1` | 适合 REST 纯净主义者，不污染 URL |
| `VersioningType.MEDIA_TYPE` | Accept 头 | `Accept: application/json;v=2` | 适合内容协商场景，实现最复杂 |

### ⚙️ 在 `main.ts` 中全局开启

```ts
import { VersioningType } from '@nestjs/common';

// 在 bootstrap() 中，NestFactory.create 之后
const app = await NestFactory.create(AppModule, winstonLogger);

// 开启 URI 版本策略（工业界推荐方案）
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: '1', // 不写版本的请求默认走 v1
});
```

配置后，访问地址变为 `http://localhost:3000/v1/cats`。

### 🧱 在 Controller 中使用 `@Version()` 标记

```ts
import { Controller, Get, Version } from '@nestjs/common';

@Controller('cats')
export class CatsController {
  // 不写 @Version → 走 defaultVersion '1'，即 /v1/cats
  @Post()
  create(@Body() createCatDto: CreateCatDto) { ... }

  // 显式声明 v2 → 只有 /v2/cats 能访问
  @Get()
  @Version('2')
  findAll() { ... }

  // 没写 @Version → 走默认 v1，即 /v1/cats/:id
  @Get(':id')
  findOne(@Param('id') id: string) { ... }
}
```

### 🔁 请求路径对照

| Controller 方法 | 有无 `@Version()` | 可访问路径 |
| --- | --- | --- |
| `create` | 无 | `POST /v1/cats` |
| `findAll` | `@Version('2')` | `GET /v2/cats` |
| `findOne` | 无 | `GET /v1/cats/:id` |

### 🕳️ 几个常见的坑

#### 坑 1：路由里写死 `/v1/xxx`

开了 `enableVersioning` 后，`@Controller('v1/cats')` 和 URI 策略会叠加成 `/v1/v1/cats`。Nest 会自动在路径前加版本前缀，**Controller 装饰器里不要再手写版本号**。

#### 坑 2：`@Version('2')` 是字符串 `'2'`，不是数字

写 `@Version(2)` 会报类型错误。装饰器接受的是 `string`，必须写成 `@Version('2')`。

#### 坑 3：defaultVersion 和 @Version 的覆盖关系

`defaultVersion: '1'` 只对**没写 `@Version()` 的方法**生效。如果方法上写了 `@Version('3')`，那这个方法就**只在 v3 下可用**，v1 反而访问不到。

#### 坑 4：前端 / 网关没更新路由规则

后端开了版本隔离后，前端仍然请求 `/cats`（不带版本号）→ 框架会自动映射到 defaultVersion `v1`，看似正常。但 `@Version('2')` 的接口不再响应旧路径，需要前端配合切换到 `/v2/cats`。

#### 坑 5：版本粒度理解错误

你可能想"只给 `/cats` 加版本，`/dogs` 不加"。但 `app.enableVersioning()` 是**全局**的，所有 controller 都会被版本前缀控制。如果只想要局部版本，可以改用 `@Controller({ path: 'cats', version: '1' })` 的 controller 级别声明。

### 怎么选？一句话决策

- **绝大多数项目** → URI 策略，最直观、最省事
- **需要"同一 URL 根据请求头返回不同版本"** → HEADER 策略
- **对接第三方 API 规范** → 参考对方标准，通常也是 URI


## 限流（@nestjs/throttler）

### 📦 安装依赖

```bash
pnpm add @nestjs/throttler
```

### ⚙️ 在 `app.module.ts` 中注册命名限流器

项目使用**命名限流器**（named throttlers），区分普通路由和敏感路由：

```ts
// nest/src/app.module.ts
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'global',     // 命名限流器：全局普通路由
        limit: 100,
        ttl: 60000,         // 60 秒内最多 100 次请求
      },
      {
        name: 'sensitive',  // 命名限流器：敏感操作（登录等）
        limit: 5,
        ttl: 60000,         // 1 分钟内最多 5 次请求
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,  // 全局启用限流守卫
    },
  ],
})
export class AppModule {}
```

### 🧱 在 Controller 中使用

**引用命名限流器（不覆盖 limit/ttl，用模块默认值）**：

```ts
// nest/src/modules/auth/auth.controller.ts
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  // 登录接口使用 sensitive 限流（5 次/分钟），
  // 传空对象 {} 表示不覆盖 limit/ttl，继承 app.module 的默认值
  @Throttle({ sensitive: {} })
  @Post('login')
  login(@Body() createAuthDto: CreateAuthDto) {
    return this.authService.login(createAuthDto);
  }
}
```

**跳过限流**：

```ts
// nest/src/modules/cats/cats.controller.ts
import { SkipThrottle } from '@nestjs/throttler';

@Controller('cats')
export class CatsController {
  // 查询接口不需要限流，跳过所有命名限流器
  @SkipThrottle({ global: true, sensitive: true })
  @Get()
  findAll() {
    return this.catsService.findAll();
  }
}
```

### 🕳️ 几个常见的坑

#### 坑 1：`@SkipThrottle()` 无参不生效

`@SkipThrottle()` 不传参时默认值是 `{ default: true }`，只跳过名字叫 `default` 的限流器。你用的是命名限流器（`global` / `sensitive`），名字对不上，skip 永远不生效。

```ts
// ❌ 不生效 — 只跳过 'default'，你没有叫 default 的 throttler
@SkipThrottle()

// ✅ 必须显式列出名字
@SkipThrottle({ global: true, sensitive: true })
```

> **根因**：`@SkipThrottle()` 源码 `const SkipThrottle = (skip = { default: true }) => {...}`，guard 里查的是 `THROTTLER_SKIP:global` / `THROTTLER_SKIP:sensitive`，`default` 永远匹配不上。

#### 坑 2：`@Throttle({ sensitive: true })` 类型不对

`@Throttle()` 接收 `Record<string, { limit, ttl }>`，不是 `boolean`。如果你想引用某个命名限流器但不覆盖配置，传空对象 `{}`：

```ts
// ❌ 类型错误，true 不是合法的 ThrottlerLimit
@Throttle({ sensitive: true })

// ✅ 空对象 = 使用模块默认配置
@Throttle({ sensitive: {} })
```

> **原理**：guard 里 `routeOrClassLimit || namedThrottler.limit`，空对象的 `.limit` 是 `undefined`，自动回退到模块默认值。

#### 坑 3：多个命名限流器都会生效

`ThrottlerModule.forRoot([...])` 里定义的**所有**命名限流器都会在每个请求上逐一执行，取最严格的那个。比如 `global`（100/min）+ `sensitive`（5/min）同时存在时，实际限制是 5/min。

如果你只想让 `sensitive` 在特定路由生效，需要给其他路由加 `@SkipThrottle({ sensitive: true })`，只跳过 sensitive 这一个。

### 怎么选？一句话决策

- **普通接口不需要限流** → `@SkipThrottle({ global: true, sensitive: true })`
- **登录等敏感接口要严格限制** → `@Throttle({ sensitive: {} })`（用模块默认的 5/min）
- **有特殊需求覆盖默认值** → `@Throttle({ global: { limit: 200, ttl: 30000 } })`


## Swagger/OpenAPI — 接口文档自动生成

### 📦 安装依赖

```bash
pnpm add @nestjs/swagger swagger-ui-express
```

| 包 | 作用 |
|---|---|
| `@nestjs/swagger` | NestJS 的 Swagger 装饰器 + 文档生成（`SwaggerModule.createDocument`） |
| `swagger-ui-express` | 把生成的 OpenAPI JSON 渲染成 Swagger UI 可视化页面 |

### ⚙️ 在 `main.ts` 中配置 DocumentBuilder

```ts
// nest/src/main.ts
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('🎬 JKVideo 娱乐影音系统')
  .setDescription('集成全链路实时通讯、异步队列、JWT 的全栈底座')
  .setVersion('1.0.0')
  .addBearerAuth() // 让文档支持一键填入 JWT Token 鉴权测试
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('docs', app, document); // 访问 http://localhost:3000/docs
```

`.addBearerAuth()` 是黄金配置：Swagger UI 右上角会出现 "Authorize" 按钮，填一次 JWT token 后，所有需要鉴权的接口都会自动带 `Authorization: Bearer <token>` 请求头。

### 🧱 nest-cli.json 插件配置（自动版 `@ApiProperty()`）

```json
// nest/nest-cli.json → compilerOptions.plugins
{
  "compilerOptions": {
    "builder": "tsc",
    "plugins": [
      {
        "name": "@nestjs/swagger",
        "options": {
          "classValidatorShim": true,
          "dtoFileNameSuffix": [".dto.ts", ".entity.ts"]
        }
      }
    ]
  }
}
```

这个插件会在编译时自动给 DTO 字段补上 `@ApiProperty()` 元数据，`classValidatorShim: true` 让它从 `class-validator` 装饰器推断字段属性：

| `class-validator` 装饰器 | 插件自动推断的 Swagger 属性 |
|---|---|
| `@IsEmail()` | `format: 'email'` |
| `@IsNotEmpty()` | `required: true` |
| `@IsOptional()` | `required: false` |
| `@MinLength(6)` | `minLength: 6` |

### 🧱 在 DTO 中手写 `@ApiProperty()`（推荐：插件当兜底）

插件只能推断类型/必填，**不能推断字段含义**。想要文档可读性好，关键字段还是要手写：

```ts
// nest/src/modules/user/dto/create-user.dto.ts
import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: '邮箱', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '密码', example: '123456' })
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: '确认密码', example: '123456' })
  @IsNotEmpty()
  confirmPassword: string;
}
```

> **插件 + 手写的关系**：手写了 `@ApiProperty()` 的字段，插件会**自动跳过**，不会覆盖你填的 `description` / `example`。没手写的字段，插件兜底补上基础属性。两者不冲突。

### 🕳️ 几个常见的坑

#### 坑 1：nest-cli.json 配了插件，但文档里还是没有字段

NestJS 10+ 默认编译器换成了 **SWC**，SWC 不支持插件。你的 `compilerOptions.plugins` 写得再对也会被**静默跳过**。

```json
// ❌ 插件不生效：没写 builder，默认用 swc
{ "compilerOptions": { "plugins": [...] } }

// ✅ 必须显式指定 tsc 编译器
{ "compilerOptions": { "builder": "tsc", "plugins": [...] } }
```

> **验证方式**：`nest build` 后看控制台有没有 `[@nestjs/swagger]` 开头的日志输出，有就说明插件生效了。

#### 坑 2：写完 DTO 后 Swagger 文档没刷新

`classValidatorShim` 插件只在**编译阶段**运行，写完 DTO 后需要**重启** dev server（`nest start --watch` 模式下改 src 文件会触发自动重启，但有时候缓存没清干净，手动 `nest build && nest start` 更稳）。

#### 坑 3：DTO 没被 Controller 的 `@Body()` 引用，插件不会处理它

插件只会扫描被 Controller 方法参数类型引用的 DTO。如果你的 DTO 只被 Service 内部使用、或者只是 export 了但没在任何 Controller 的 `@Body()` / `@Query()` 里出现，插件看不到它，不会生成文档。

### 怎么选？一句话决策

- **快速原型、字段不多** → 纯插件 `classValidatorShim`，一行 `@ApiProperty()` 都不写
- **正式项目、需要文档可读** → 手写 `@ApiProperty({ description, example })` + 插件当兜底
- **插件不生效排查** → 先确认 `nest-cli.json` 里有 `"builder": "tsc"`


# websocket 篇

> Nest 的 WebSocket 支持有两套适配器：**原生 ws**（`@nestjs/platform-ws`，轻量、协议透明）和 **Socket.IO**（`@nestjs/platform-socket.io`，自带房间 / 自动重连 / ack / 命名空间等能力）。本章按两个模块分别展开，按需选用。
>
> 一句话选型：**协议简单、客户端可控** → 原生 ws；**业务复杂、要房间和重连** → Socket.IO。

## 模块一、原生 ws（@nestjs/platform-ws）

> 协议透明、消息体积小，但房间 / 重连 / ack 这些都得自己写。

### 一、依赖安装

```bash
# Nest 通用网关装饰器（@WebSocketGateway / @SubscribeMessage 等）
pnpm add @nestjs/websockets

# 选用原生 ws 协议时必装：Nest 的 ws 适配器
pnpm add @nestjs/platform-ws

# ⚠️ 按需可选：只有你自己代码要 `import { WebSocket } from 'ws'` 时才装
# 不装的话，可以用本地 interface 兜底类型（见后面 Gateway 示例的 WsClient/WsServer）
pnpm add ws
pnpm add -D @types/ws
```

#### 为什么 ws 是「按需可选」

`ws` 库其实是 `@nestjs/platform-ws` 的**间接依赖**，pnpm install 时已经自动把它拉进 `node_modules/.pnpm/ws@x.x.x/` 了。但能不能在**你自己代码里** `import 'ws'`，取决于包管理器：

| 包管理器 | 行为 | 你能直接 `import 'ws'` 吗 |
| --- | --- | --- |
| **pnpm**（严格） | 间接依赖隔离在 `.pnpm/` 下 | ❌ 不行，必须自己 `pnpm add ws` |
| **npm / yarn classic** | 默认 hoist 到顶层 `node_modules/ws` | ✅ 能（但属于「幽灵依赖」反模式） |

所以两条路：

- **想要官方类型 + 严格写法**：装 `ws` + `@types/ws`，代码里直接 `import { WebSocket, Server } from 'ws'`
- **不想多装包**：用本地 interface 顶替（见下面示例），运行时根本不需要从 'ws' import 任何东西，`@nestjs/platform-ws` 内部自己会用 ws，跟你无关

> 💡 `@types/ws` 是**纯编译期类型**，运行时不需要。不装顶多 IDE 没提示，不影响功能。

### 二、main.ts 注册 WsAdapter

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ⚠️ 必须把 app 实例传进去！
  // WHY: 不传 app，WsAdapter 不会复用 HTTP server 的端口；
  // 而 @WebSocketGateway 又通常不指定 port，结果就是 ws 服务「没绑端口」连不上
  app.useWebSocketAdapter(new WsAdapter(app));

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
```

#### 端口和路径的关系

- **不传 `port`**（推荐）：ws 复用 HTTP 端口，客户端连 `ws://host:HTTP_PORT/<path>`
- **传 `port`**：ws 单独起一个端口（少用，多开端口意味着多一份防火墙/反代配置）

### 三、Gateway 完整示例

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { WebSocket, Server } from 'ws';

@WebSocketGateway({
  // port: 3001,                // 不写就复用 HTTP 端口
  path: '/ws/chat',            // 客户端连接地址：ws://host:PORT/ws/chat
  cors: { origin: '*' },       // 开发期放开；生产务必收紧
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ChatGateway.name);

  // WHY: 自己维护在线连接表。platform-ws 没有 socket.io 的 rooms/sockets.get(id)
  private readonly clients = new Map<string, WebSocket>();

  // WHY: 注入底层 ws.Server，用于遍历 server.clients 做广播
  @WebSocketServer() server!: Server;

  // ============ 生命周期钩子 ============

  afterInit(server: Server) {
    this.logger.log(`WS 网关已启动，当前连接数: ${server.clients.size}`);
  }

  handleConnection(client: WebSocket) {
    // WHY: ws 原生没有 client.id，自己生成挂上去
    const clientId = `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    (client as any).id = clientId;
    this.clients.set(clientId, client);

    this.logger.log(`客户端连接: ${clientId}`);
    this.sendTo(client, 'welcome', { clientId });
  }

  handleDisconnect(client: WebSocket) {
    const clientId = (client as any).id as string;
    this.clients.delete(clientId);
    this.logger.log(`客户端断开: ${clientId}`);
  }

  // ============ 消息处理 ============

  @SubscribeMessage('createChat')
  create(
    @MessageBody() dto: { content: string },
    @ConnectedSocket() client: WebSocket,
  ) {
    const clientId = (client as any).id as string;
    this.logger.log(`收到消息 from ${clientId}: ${JSON.stringify(dto)}`);

    // 业务广播
    this.broadcast('newMessage', { from: clientId, payload: dto });

    // WHY: return 的值会作为 ACK 自动包装成 { event:'createChat', data: 返回值 } 回给发送者
    return { ok: true };
  }

  // ============ 工具方法 ============

  /** 广播给所有在线客户端 */
  private broadcast(event: string, data: unknown) {
    const payload = JSON.stringify({ event, data });
    this.server.clients.forEach((c) => {
      // WHY: 只给已就绪连接发，避免给握手/关闭中的连接 send 抛错
      if (c.readyState === WebSocket.OPEN) c.send(payload);
    });
  }

  /** 单播 */
  private sendTo(client: WebSocket, event: string, data: unknown) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ event, data }));
    }
  }
}
```

别忘了在 module 里注册：

```typescript
@Module({
  providers: [ChatGateway, ChatService],
})
export class ChatModule {}
```

### 四、消息协议约定（最容易踩的坑）

#### 客户端 → 服务端：必须是 `{event, data}` JSON 字符串

```javascript
// ❌ 这些都会被 platform-ws 静默丢弃，不报错、不打印
ws.send('hello');                                         // 不是 JSON
ws.send({ event: 'createChat', data: {} });               // 没 JSON.stringify
ws.send(JSON.stringify({ type: 'createChat', data: {} }));// 字段名不是 event
ws.send(JSON.stringify({ event: 'create', data: {} }));   // event 名和 @SubscribeMessage 对不上

// ✅ 唯一正确写法
ws.send(JSON.stringify({ event: 'createChat', data: { content: 'hi' } }));
```

#### 服务端 → 客户端：return 值自动包装

`@SubscribeMessage` handler 里 `return result` 会被框架包成：

```json
{ "event": "createChat", "data": <返回值> }
```

主动 push 时，必须自己手动包格式（见上面的 `broadcast` / `sendTo`）。

#### 为什么必须这格式？

WebSocket 协议层只有 `send(data)` / `onmessage(data)`，**没有 event 概念**。
而 `@SubscribeMessage('createChat')` 这种"按事件名路由"是 NestJS 框架自己造的抽象，所以框架必须强制一个协议约定，才能从消息里解析出"要路由到哪个 handler"。

平台对照：

| 框架 | 客户端发送约定 |
| --- | --- |
| 原生 WebSocket | 无（纯字节流） |
| `@nestjs/platform-ws` | `JSON.stringify({event, data})` |
| `@nestjs/platform-socket.io` | socket.io 自定义二进制协议 |
| Spring `@MessageMapping` | STOMP 协议帧 |

### 五、客户端最小测试代码

浏览器 F12 控制台直接跑：

```javascript
const ws = new WebSocket('ws://localhost:3000/ws/chat');

ws.onopen = () => {
  console.log('✅ 连上了');
  ws.send(JSON.stringify({ event: 'createChat', data: { content: 'hi' } }));
};
ws.onmessage = (e) => console.log('收到:', JSON.parse(e.data));
ws.onerror = (e) => console.log('❌ error', e);
ws.onclose = (e) => console.log('🔌 close', e.code, e.reason);
```

### 六、两种写法对比：`@SubscribeMessage` vs 裸 message 监听

如果客户端发的不是 `{event, data}` 格式（比如对接老接口 `ws.send('123')`），可以**不用 `@SubscribeMessage`**，直接在 `handleConnection` 里监听原生 `message` 事件：

```typescript
handleConnection(client: WebSocket) {
  // WHY: 等价于 Spring 的 TextWebSocketHandler.handleTextMessage
  client.on('message', (raw: Buffer) => {
    const text = raw.toString();
    console.log('收到:', text);  // ws.send('123') 这里就能拿到 '123'

    // 自己解析、自己路由
    if (text === 'ping') client.send('pong');
    else if (text.startsWith('CHAT:')) { /* ... */ }
  });
}
```

对比：

| 维度 | 裸 `client.on('message')` | `@SubscribeMessage` |
| --- | --- | --- |
| 客户端发什么格式 | 任意（字符串/二进制） | 必须 `{event, data}` JSON |
| 消息分发 | 自己 if/else | 框架按 event 名自动路由 |
| DTO 验证（class-validator） | ❌ 用不上 | ✅ 自动跑 |
| 全局拦截器/异常过滤器 | ❌ 用不上 | ✅ 自动跑 |
| 适合场景 | 兼容老接口、私有协议、二进制游戏帧 | 业务事件多、复用 Nest 全家桶 |

**新项目优先 `@SubscribeMessage`**，事件多了自己 if/else 路由会变噩梦。

### 七、🕳️ 几个常见的坑

#### 坑 1：`new WsAdapter()` 没传 app

```typescript
app.useWebSocketAdapter(new WsAdapter());      // ❌ ws 服务没绑端口，连不上
app.useWebSocketAdapter(new WsAdapter(app));   // ✅
```

#### 坑 2：客户端发了消息但 handler 不触发

90% 是消息格式不对，platform-ws 静默丢弃。
**排查办法**：在 `handleConnection` 里临时加 `client.on('message', raw => console.log(raw.toString()))`，能看到原始字符串，对照第四节的对照表定位。

#### 坑 3：路径大小写敏感

`@WebSocketGateway({ path: '/ws/chat' })` 和客户端 `ws://host:port/ws/chat` 必须完全一致，`/WS/Chat` 连不上。

#### 坑 4：原生 ws 没有这些 socket.io 特性

需要自己实现：

- **房间 rooms**：用 `Map<roomName, Set<clientId>>` 自己维护
- **自动重连**：客户端自己写 `onclose` 后 `setTimeout` 重连
- **ACK 回执**：只能靠 `@SubscribeMessage` 的 return 值（一次性，没有 socket.io 那种带 callback 的 emit）
- **命名空间**：只能用不同 `path` 区分

需求复杂到这些都要时，**优先考虑换 `@nestjs/platform-socket.io`**。

#### 坑 5：广播时不判断 readyState

直接 `client.send(...)` 给一个正在握手或关闭中的连接会抛 `Error: WebSocket is not open`。必须先判：

```typescript
if (client.readyState === WebSocket.OPEN) client.send(payload);
```

---

## 模块二、Socket.IO（@nestjs/platform-socket.io）

> 自带**房间 / 自动重连 / ack / 命名空间 / 心跳**等能力。代价：客户端必须用 socket.io-client SDK，协议是 socket.io 自己的封装（不是裸 WebSocket）。

### 一、依赖安装

```bash
# 通用网关装饰器，模块一已装可跳过
pnpm add @nestjs/websockets

# Socket.IO 适配器 + 运行时
pnpm add @nestjs/platform-socket.io socket.io
```

> ⚠️ **不要**装 `@types/socket.io`。socket.io 4.x 自带类型，老的 DefinitelyTyped 包（停留在 v2）会污染类型解析，导致 `Socket` 解不出来、`client.id` 报 `no-unsafe-member-access`。

### 二、main.ts 不需要额外注册

和原生 ws 不同，**Socket.IO 适配器是 Nest 默认行为**，只要装了 `@nestjs/platform-socket.io`，引导阶段会自动启用，main.ts 不用改。

```typescript
// 默认就能用，不用 app.useWebSocketAdapter(...)
await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
```

只有在**自定义适配器**（如接 `@socket.io/redis-adapter` 做多实例广播）时才需要手写 `useWebSocketAdapter`。

### 三、Gateway 完整示例

服务端示例直接看项目里的 [chatio.gateway.ts](src/modules/chatio/chatio.gateway.ts)，关键片段：

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

// 统一事件名常量，避免客户端 / 服务端拼错字符串
const MESSAGE = 'chatioMessage';

// namespace 是 Socket.IO 的"逻辑频道"，不同业务用不同 namespace 隔离
// 客户端连接：io('http://host:3000/chatio')
@WebSocketGateway({
  cors: { origin: '*' },     // 开发期放开，生产务必收紧白名单
  namespace: '/chatio',
})
export class ChatioGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ChatioGateway.name);

  // 注意：声明为 Server 类型只是惯例，运行时实际注入的是 Namespace 实例
  // —— 因为装饰器配置了 namespace，所以拿到的是命名空间作用域
  @WebSocketServer()
  server: Server;

  afterInit() {
    // 启动时连接数恒为 0，这里只打就绪日志
    this.logger.log('WebSocket 网关 /chatio 已启动');
  }

  // 鉴权、记录在线用户都在 handleConnection 里做
  handleConnection(client: Socket) {
    this.logger.log(`客户端已连接: ${client.id}`);
    // 单独发给新连接的客户端
    client.emit(MESSAGE, { msg: '欢迎加入', id: client.id });
    // 广播给"除自己外"的所有人，用于通知"有人上线"
    client.broadcast.emit(MESSAGE, { from: client.id, content: '加入了房间' });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`客户端断开: ${client.id}`);
  }

  // @SubscribeMessage 监听客户端 emit('createChatio', data) 发来的事件
  @SubscribeMessage('createChatio')
  create(
    @MessageBody() data: { content: string },
    @ConnectedSocket() client: Socket,
  ) {
    // 只回给发送者（业务上常见做法是先回执，再异步广播给其他人）
    client.emit(MESSAGE, { from: client.id, content: data.content });

    // return 的对象会作为 ack 回调返回给客户端
    // 客户端写法：socket.emit('createChatio', data, (ack) => {...})
    return { event: MESSAGE, data: '服务端已收到' };
  }

  // 房间是命名空间内的逻辑分组，适合聊天室、协同编辑等多对多场景
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() room: string,
    @ConnectedSocket() client: Socket,
  ) {
    // join/leave 是异步的，v4 之后房间状态由 adapter 管理（可能跨进程）
    await client.join(room);
    // 只向房间内的客户端广播，不会泄漏到其他房间
    this.server.to(room).emit(MESSAGE, `${client.id} 加入了房间 ${room}`);
  }
}
```

### 四、消息收发速查

| 想做的事 | 服务端写法 |
| --- | --- |
| 监听客户端事件 | `@SubscribeMessage('xxx')` |
| 取消息体 | `@MessageBody() data` 或 `@MessageBody('field') field` |
| 取当前连接 | `@ConnectedSocket() client: Socket` |
| 给所有人广播（含自己） | `this.server.emit('evt', data)` |
| 给除自己外所有人 | `client.broadcast.emit('evt', data)` |
| 给某个房间 | `this.server.to(room).emit('evt', data)` |
| 给某个 socket | `this.server.to(socketId).emit('evt', data)` |
| 加入 / 离开房间 | `await client.join(room)` / `await client.leave(room)` |
| 给客户端 ack 回执 | handler 里直接 `return` 任意值（同步 / Promise / Observable 都行） |

### 五、客户端示例

完整 demo 看 `front/App.vue`（同时演示了原生 ws 和 Socket.IO 两种模式可切换）。最小核心代码：

```typescript
import { io, Socket } from 'socket.io-client';

// namespace 必须和服务端 @WebSocketGateway 的 namespace 完全一致
const socket: Socket = io('http://localhost:3000/chatio', {
  // 强制只走 WebSocket，跳过 long-polling 升级阶段，握手更快
  transports: ['websocket'],
  // socket.io 自带重连，不用自己写定时器
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 3000,
  timeout: 10000,
  // 鉴权信息在握手阶段传给服务端 client.handshake.auth
  auth: { token: 'your-token' },
});

// 注意：'connect' / 'disconnect' / 'connect_error' 是 socket.io 内建事件名
socket.on('connect', () => console.log('已连接, id =', socket.id));
socket.on('disconnect', (reason) => console.log('断开:', reason));
socket.on('connect_error', (err) => console.error('握手失败:', err.message));

// 监听服务端推送的业务事件（事件名要和服务端 emit 的一致）
socket.on('chatioMessage', (data) => console.log('收到:', data));

// 发消息 + 接 ack（服务端 handler return 的值就是这里的 ack）
socket.emit('createChatio', { content: 'hello' }, (ack) => {
  console.log('服务端 ack:', ack);
});
```

### 六、原生 ws vs Socket.IO 对比

| 维度 | 原生 ws (`platform-ws`) | Socket.IO (`platform-socket.io`) |
| --- | --- | --- |
| 协议 | 标准 WebSocket | 基于 WebSocket 的自定义封装 |
| 客户端 | 浏览器原生 `WebSocket` 即可 | **必须装** `socket.io-client` |
| 消息格式 | 自己定（约定 `{event, data}`） | 内置事件机制 `emit/on` |
| 房间 | 自己用 `Map<room, Set<id>>` 维护 | 内置 `client.join/leave/to` |
| 自动重连 | 自己写 `onclose` 重连 | 内置 `reconnection` 配置 |
| ack 回执 | `@SubscribeMessage` return | `@SubscribeMessage` return + 客户端 callback |
| 命名空间 | 用不同 `path` 区分 | 内置 `namespace`，一个端口多个频道 |
| 心跳 | 自己写 ping/pong | 内置 |
| 多实例广播 | 自己实现 | 接 `@socket.io/redis-adapter` 一键搞定 |
| 包体积（客户端） | 0（浏览器原生） | ~40KB |
| 协议透明度 | 高，可被任意 ws 客户端连接 | 低，非 socket.io 客户端连不上 |

### 七、🕳️ 几个常见的坑

#### 坑 1：装了 `@types/socket.io` 老包

socket.io 4.x **自带类型**，DefinitelyTyped 上的 `@types/socket.io` 仍停留在 v2 时代，装上会和内置类型冲突，常见症状：

- `Socket` 被推成 `Socket<..., any>`，`client.id` 报 `@typescript-eslint/no-unsafe-member-access`
- IDE 自动补全消失或紊乱

解法：`pnpm remove @types/socket.io`，然后重启 TS Server（VSCode: `Ctrl+Shift+P` → `TypeScript: Restart TS Server`）。

#### 坑 2：`@WebSocketServer()` 类型搞混 Server / Namespace

带 `namespace` 的 Gateway 里，注入的实际是 **Namespace**，不是根 Server。典型踩坑：

```typescript
// ❌ 编译报错：Property 'size' does not exist on type 'Namespace'
this.server.sockets.size;

// ❌ 运行时报错：this.server.of is not a function
this.server.of('/chatio').sockets.size;

```

要彻底治本，把字段类型标成 `Namespace`：

```typescript
import { Namespace } from 'socket.io';

@WebSocketServer() server: Namespace;
```

#### 坑 3：客户端 namespace 不带 `/`

```typescript
io('http://localhost:3000/chatio');  // ✅ 命名空间
io('http://localhost:3000', { ... }); // ✅ 默认命名空间 '/'
```

namespace 写错时**不会立即报错**，连接会落到默认 `/`，结果就是事件没人听 → 看起来"消息丢了"。

#### 坑 4：CORS 配错

浏览器跨域连不上 99% 是 `cors` 没配。开发期可以放开：

```typescript
@WebSocketGateway({ cors: { origin: '*' } })
```

生产环境必须显式列白名单：

```typescript
@WebSocketGateway({ cors: { origin: ['https://your.app'], credentials: true } })
```

#### 坑 5：多实例部署广播丢消息

PM2 cluster 或 K8s 多副本时，**每个 Node 进程是独立的事件总线**，A 进程上的 socket emit 出去的消息，B 进程上的 socket 收不到。解法：接 `@socket.io/redis-adapter`，让多进程共享广播总线。

```bash
pnpm add @socket.io/redis-adapter
```




# SSE 篇

## Server-Sent Events（@nestjs/common 内置）

> 项目示例：[nest/src/modules/sse](nest/src/modules/sse) · 前端：[front/src/views/SseView.vue](front/src/views/SseView.vue)

### 一、SSE 是什么 / 何时用

SSE（Server-Sent Events）是一个跑在标准 HTTP 协议上的**单向**推送通道：服务端 → 客户端持续吐数据，浏览器用原生 `EventSource` 接收，自带断线重连和 `Last-Event-ID` 续传机制，零依赖。

| 维度 | SSE | WebSocket |
| --- | --- | --- |
| 通信方向 | 单向（服务端 → 客户端） | 双向全双工 |
| 协议 | HTTP（`text/event-stream`） | 独立 ws 协议 |
| 浏览器 API | 原生 `EventSource` | 原生 `WebSocket` |
| 自动重连 | ✅ 内置 | ❌ 自己实现 |
| 跨域 | 走 HTTP CORS | 单独握手协商 |
| 二进制支持 | ❌ 仅文本 | ✅ |
| 适用场景 | 通知推送、日志流、AI 流式输出、行情 | 聊天、协同编辑、游戏 |

**一句话决策**：客户端只「听」不「说」就用 SSE，要双向就上 WebSocket。

### 二、后端实现：`@Sse()` + RxJS Observable

NestJS 在 `@nestjs/common` 里已经内置 SSE 装饰器，不需要装额外依赖。

#### 2.1 Service：构造 `Observable<MessageEvent>`

```ts
// nest/src/modules/sse/sse.service.ts
import { Injectable, MessageEvent } from '@nestjs/common';
import { interval, map, Observable, Subject } from 'rxjs';

@Injectable()
export class SseService {
  // 广播总线：业务层调 push() 后，所有订阅的 SSE 客户端都能收到
  // WHY: Subject 天然能转 Observable 给 @Sse() 用，比 EventEmitter 更顺
  private readonly stream$ = new Subject<MessageEvent>();

  // 定时推送：每秒一条递增序号
  getTickStream(): Observable<MessageEvent> {
    return interval(1000).pipe(
      map((n) => ({
        data: { count: n, time: new Date().toISOString() }, // 必填，会被自动 JSON.stringify
        type: 'tick', // 可选，对应前端 addEventListener(type, ...)
        id: String(n), // 可选，断线重连时通过 Last-Event-ID 头恢复
      })),
    );
  }

  // 外部调用此方法广播消息
  push(data: unknown, type = 'message') {
    this.stream$.next({ data, type } as MessageEvent);
  }
}
```

#### 2.2 Controller：`@Sse()` 替代 `@Get()`

```ts
// nest/src/modules/sse/sse.controller.ts
import { Controller, MessageEvent, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { SseService } from './sse.service';

@Controller('sse')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  // 关键点：
  //   1. 用 @Sse() 替代 @Get()，Nest 自动设置 Content-Type: text/event-stream
  //   2. 返回值必须是 Observable<MessageEvent>
  //   3. 客户端断开时 Observable 自动 unsubscribe，无需手动清理
  @Sse('tick')
  tick(): Observable<MessageEvent> {
    return this.sseService.getTickStream();
  }
}
```

#### 2.3 别忘了把模块挂到 AppModule

```ts
// nest/src/app.module.ts
import { SseModule } from './modules/sse/sse.module';

@Module({
  imports: [..., SseModule], // 漏掉就是 404，控制器存在但 Nest 不知道
})
export class AppModule {}
```

#### 2.4 `MessageEvent` 字段速查

| 字段 | 必填 | 作用 |
| --- | --- | --- |
| `data` | ✅ | 推送的数据，字符串或可 JSON 序列化对象 |
| `type` | ❌ | 事件名，前端用 `addEventListener(type, ...)` 监听 |
| `id` | ❌ | 事件 ID，断线重连时通过 `Last-Event-ID` 头回传 |
| `retry` | ❌ | 浏览器重连等待毫秒数 |

### 三、🕳️ 最大的坑：全局响应拦截器会破坏 SSE

这个坑专门记一下，因为现象很迷惑。

#### 3.1 现象

前端 `new EventSource('http://localhost:4000/sse/tick')` 一连上就触发 `onerror`，`readyState` 直接变成 `CLOSED`，打印 "[SSE] 连接已关闭"。

#### 3.2 根因

如果项目里注册了**全局响应拦截器**（比如 [exception.filter.ts](nest/src/exception/exception.filter.ts) 里的 `InterceptorInterceptor`），它会用 `pipe(map(...))` 把控制器返回的每个值包成统一响应结构：

```ts
return next.handle().pipe(
  map((data) => ({
    timestamp, path, message, code: 200, success: true, data: ...,
  })),
);
```

对普通接口没问题，但 SSE 端点返回的是 `Observable<MessageEvent>`，拦截器对 **每一条** MessageEvent 都做包装，结果发出去的不再是合法 `{data, type, id}` 结构，浏览器收到非法 SSE 格式立即关流。

#### 3.3 修复：拦截器内部判断，命中 SSE 就放行

```ts
// nest/src/exception/exception.filter.ts
// @Sse() 装饰器会在 handler 上 defineMetadata('sse', true, ...)
// key 名 'sse' 是 Nest 内部约定，没有 public 常量，硬编码即可
const SSE_METADATA_KEY = 'sse';

@Injectable()
export class InterceptorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // SSE 端点必须跳过统一响应包装，让 MessageEvent 原样透传
    const isSse = Reflect.getMetadata(
      SSE_METADATA_KEY,
      context.getHandler(),
    ) as boolean | undefined;
    if (isSse) {
      return next.handle();
    }

    // 普通端点继续走统一包装逻辑
    return next.handle().pipe(map((data) => ({ /* ... */ })));
  }
}
```

> 同样的思路也适用于全局异常过滤器：如果 SSE 端点抛错被过滤器包成 JSON，浏览器也会报协议错误。按需做同样的 `Reflect.getMetadata('sse', ...)` 判断即可。

### 四、前端实现：原生 `EventSource`

零依赖，直接用浏览器原生 API：

```ts
// front/src/views/SseView.vue（节选）
const es = new EventSource('http://localhost:4000/sse/tick', {
  withCredentials: false, // 跨域要带 cookie 时改 true，后端 CORS 也要放行 credentials
});

// 监听默认 message 事件（服务端没指定 type 时落这里）
es.onmessage = (e) => console.log(e.data, e.lastEventId);

// 监听自定义 type 事件（服务端 type: 'tick'）
es.addEventListener('tick', (e) => {
  console.log('tick:', JSON.parse(e.data));
});

// EventSource 自动重连：网络断了会进入 CONNECTING 状态，无需手动处理
es.onerror = () => {
  if (es.readyState === EventSource.CONNECTING) {
    console.log('浏览器正在自动重连...');
  } else if (es.readyState === EventSource.CLOSED) {
    console.log('连接已关闭'); // 服务端 4xx/5xx 或协议错误会落这里
  }
};

// 主动关闭（关闭后 readyState 永久为 CLOSED，不会再重连）
// es.close();
```

#### `readyState` 三种状态

| 值 | 名称 | 含义 |
| --- | --- | --- |
| 0 | CONNECTING | 正在连接 / 自动重连中 |
| 1 | OPEN | 已连接 |
| 2 | CLOSED | 已关闭（主动 close 或不可恢复错误） |

### 五、命令行验证

不写前端时用 `curl` 最快：

```bash
curl -N http://localhost:4000/sse/tick
```

`-N` 关闭缓冲，正常应该看到：

```
id: 0
event: tick
data: {"count":0,"time":"..."}

id: 1
event: tick
data: {"count":1,"time":"..."}
```

如果输出是被包成 JSON 的 `{"timestamp":...,"data":...}`，立刻去看上面的「坑 3」。

### 六、🕳️ 几个常见的坑

#### 坑 1：模块没挂到 AppModule

`SseController` 存在但访问 404 —— 检查 `app.module.ts` 的 `imports` 数组有没有 `SseModule`。Nest 路由发现机制只扫描 imports 里出现过的 Module。

#### 坑 2：全局拦截器/过滤器破坏 SSE 格式

见上面第三节，必须在拦截器/过滤器内部用 `Reflect.getMetadata('sse', context.getHandler())` 跳过 SSE 端点。

#### 坑 3：跨域时 `withCredentials` 与后端 CORS 不匹配

前端 `withCredentials: true` 时，后端 `app.enableCors({ origin: '具体源', credentials: true })` 必须配对，不能用 `origin: '*'`，否则浏览器拒收。

#### 坑 4：反向代理缓冲了响应

Nginx 默认开 `proxy_buffering`，会把 SSE 流缓存起来批量下发，前端看起来像「卡住」。SSE 端点的 location 需要关：

```nginx
location /sse {
  proxy_pass http://nest;
  proxy_buffering off;
  proxy_cache off;
  proxy_set_header Connection '';
  proxy_http_version 1.1;
  chunked_transfer_encoding off;
}
```

#### 坑 5：Compression 中间件压缩了 SSE

如果用了 `compression()` 中间件，它会缓冲响应再压缩，破坏 SSE 的实时性。需要在 filter 里跳过 `text/event-stream`：

```ts
app.use(compression({
  filter: (req, res) => res.getHeader('Content-Type') !== 'text/event-stream',
}));
```

#### 坑 6：浏览器同源限制：同一域名最多 6 个 SSE 连接

HTTP/1.1 下浏览器对同一 origin 限制并发连接数（通常 6 个），多开标签页会卡。HTTP/2 下没有这个限制。开发期注意。

### 七、进阶：按用户推送 / 心跳保活

#### 7.1 按用户 ID 推送

用 `Map<userId, Subject>`，每个用户一个独立流：

```ts
private readonly userStreams = new Map<string, Subject<MessageEvent>>();

getUserStream(userId: string): Observable<MessageEvent> {
  if (!this.userStreams.has(userId)) {
    this.userStreams.set(userId, new Subject());
  }
  return this.userStreams.get(userId)!.asObservable();
}

pushToUser(userId: string, data: unknown) {
  this.userStreams.get(userId)?.next({ data } as MessageEvent);
}
```

控制器从 `@Req()` 或 JWT 拿到 userId 后调 `getUserStream(userId)` 即可。

#### 7.2 心跳保活

某些代理（云厂商 LB、Nginx 默认 60s）会把空闲连接干掉，定期发个空注释保活即可：

```ts
import { merge } from 'rxjs';

@Sse('tick')
tick(): Observable<MessageEvent> {
  // 注释行 ': ping' 在 SSE 协议里是合法且会被浏览器忽略的占位
  const heartbeat$ = interval(30_000).pipe(
    map(() => ({ data: '', type: 'ping' } as MessageEvent)),
  );
  return merge(this.sseService.getTickStream(), heartbeat$);
}
```




# 数据库篇

## PostgreSQL + Prisma

> 官方流程参考：[Prisma × NestJS 集成指南](https://www.prisma.io/docs/guides/frameworks/nestjs)

### 一、依赖安装

```bash
# 开发依赖：CLI 工具
pnpm add prisma --save-dev

# 运行时依赖：客户端 + 驱动适配器
pnpm add @prisma/client @prisma/adapter-pg pg

# 类型定义（按需）
pnpm add @types/pg --save-dev
```

### 二、依赖说明

| 依赖包 | 类型 | 作用 |
| --- | --- | --- |
| `prisma` | devDependency | Prisma CLI，用于执行 `prisma init`、`prisma db pull`、`prisma generate` 等命令 |
| `@prisma/client` | dependency | Prisma 客户端库，用于在代码中查询数据库 |
| `@prisma/adapter-pg` | dependency | 将 Prisma Client 桥接到 `node-postgres` 驱动的适配器 |
| `pg` | dependency | `node-postgres` 数据库驱动 |
| `@types/pg` | devDependency | `node-postgres` 的 TypeScript 类型定义 |

### 三、常见问题

#### ❗ 报错：`exports is not defined in ES module scope`

**原因**：项目使用 ESM，而 Prisma 默认生成的客户端是 CJS 风格，模块格式不匹配。

**解决**：在 `prisma/schema.prisma` 中显式声明 `moduleFormat`：

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "cjs"   // ← 关键：与项目模块格式保持一致
}
```

修改后重新生成客户端：

```bash
pnpm exec prisma generate
```

### 四、环境变量

> 💡 **环境感知机制：** 本项目的 Prisma 读取的 `DATABASE_URL` 由 `package.json` 中的 `cross-env NODE_ENV=xxx` 间接控制——根据 `NODE_ENV` 加载对应的 `.env.{env}` 文件，例如：
>
> - `start:dev` → 加载 `.env.development`
> - `start:test` → 加载 `.env.test`
> - `start:prod` → 加载 `.env.production`

---

### 五、模型字段迁移（Migration）

修改 [prisma/schema.prisma](prisma/schema.prisma) 后，需要把变更**同步到数据库 + 重新生成 Client 类型**。

#### 5.1 工作流

```bash
# 一步到位：生成迁移 SQL + 应用到数据库 +（v6 及以前会自动）生成 Client
pnpm exec prisma migrate dev --name add_user_age
```

`--name` 后跟一段语义化描述（小写 + 下划线），会作为迁移文件夹名：`prisma/migrations/2026xxxx_add_user_age/`。

#### 5.2 ⚠️ Prisma v7 的特殊行为

新版 `prisma-client` provider **不会自动触发 `prisma generate`**，需要手动补一步：

```bash
pnpm exec prisma generate
```

否则 [src/generated/prisma/](src/generated/prisma/) 下的 TS 类型还是旧的，IDE 会报「`age` 不在类型中」。

#### 5.3 命令速查

| 命令 | 作用 | 适用场景 |
| --- | --- | --- |
| `prisma migrate dev --name xxx` | 生成迁移 + 应用 | **开发期改 schema 后** |
| `prisma migrate deploy` | 仅应用已有迁移 | **生产部署** |
| `prisma migrate reset` | 重置数据库 + 重跑所有迁移 + 自动种子 | 开发期数据乱了想重来（⚠️ 删全部数据） |
| `prisma migrate status` | 查看迁移状态 | 排查「线上 schema 跟代码不一致」 |
| `prisma db push` | 直接推 schema 到数据库（不生成迁移文件） | 原型期 / 试验期 |
| `prisma db pull` | 反向：从数据库拉 schema | 接手老项目时 |
| `prisma generate` | 仅重新生成 Client | 改完 schema 但不动数据库时 |

> 🎯 **建议：** 在 [package.json](package.json) 加组合脚本，免得忘记 `generate`：
>
> ```json
> {
>   "scripts": {
>     "db:migrate": "prisma migrate dev && prisma generate",
>     "db:reset": "prisma migrate reset",
>     "db:seed": "prisma db seed"
>   }
> }
> ```

---

### 六、种子数据（Seed）

种子脚本用于**给数据库填充初始数据**——字典表、默认管理员账号、开发测试数据等。

#### 6.1 触发时机

| 时机 | 说明 |
| --- | --- |
| `pnpm exec prisma db seed` | 手动触发 |
| `pnpm exec prisma migrate reset` | 重置数据库后**自动**跑一次 |
| `pnpm exec prisma migrate dev`（首次空库） | 第一次建库时**自动**跑 |

#### 6.2 设计原则

- **幂等**：多次执行结果一致，绝不能因重复执行导致数据混乱（用 `upsert` / `skipDuplicates`）
- **环境感知**：测试假数据只在非生产环境写入，避免污染线上库
- **自给自足**：脚本不依赖 Nest 容器，自行实例化 `PrismaClient`
- **容错**：撞唯一约束（P2002）时降级查询，而不是让脚本崩溃

#### 6.3 步骤一：安装执行器 `ts-node`

```bash
pnpm add -D ts-node
```


#### 6.4 步骤二：配置 [prisma.config.ts](prisma.config.ts)和[package.json](package.json)

```typescript
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    
    // 触发命令：pnpm exec prisma db seed / prisma migrate reset
    seed: 'bun ./prisma/seed.ts',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
```
package.json 中添加 `bun` 到 `scripts`：

```json
{
"prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
},
```

#### 6.5 步骤三：编写 [prisma/seed.ts](prisma/seed.ts)

完整脚本见仓库内文件，下面拆解三个关键片段：

##### 🔹 初始化 Prisma Client（与运行时同款适配器）

```typescript
import 'dotenv/config';
// 项目 tsconfig 是 nodenext，相对导入 TS 文件必须带 .js 后缀
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});
const prisma = new PrismaClient({ adapter });
```

##### 🔹 容错 upsert：撞 P2002 时降级查询

```typescript
async function safeUpsertUser(
  email: string,
  data: Parameters<typeof prisma.user.upsert>[0]['create'],
) {
  try {
    return await prisma.user.upsert({
      where: { email },
      update: {}, // 已存在时不修改任何字段
      create: data,
    });
  } catch (e: unknown) {
    // P2002 = 唯一约束冲突：说明记录已存在，直接查出来返回
    const isUniqueErr =
      e !== null &&
      typeof e === 'object' &&
      'code' in e &&
      (e as { code?: string }).code === 'P2002';
    if (isUniqueErr) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return existing;
    }
    throw e; // 其他错误照旧抛出
  }
}
```

##### 🔹 按环境分组写入

```typescript
async function seedRequired() {
  // 字典数据 / 默认账号：所有环境都要有（含生产）
  await safeUpsertUser('admin@example.com', {
    email: 'admin@example.com',
    name: 'Administrator',
    age: 30,
  });
}

async function seedDevOnly() {
  // 测试数据：只在非生产环境写入
  if (process.env.NODE_ENV === 'production') return;
  await safeUpsertUser('alice@example.com', { /* ... */ });
  await safeUpsertUser('bob@example.com', { /* ... */ });
}

async function main() {
  await seedRequired();
  await seedDevOnly();
}

main()
  .catch((e) => {
    console.error('❌ 种子执行失败：', e);
    process.exit(1);
  })
  .finally(() => {
    // 必须释放连接，否则脚本会挂住进程不退出
    void prisma.$disconnect();
  });
```

#### 6.6 步骤四：执行种子

```bash
# 方式 A：手动单独跑（最常用）
pnpm exec prisma db seed

# 方式 B：重置数据库 + 自动种子（开发期最爽）
pnpm exec prisma migrate reset
```

#### 6.7 🕳️ 几个常见的坑

1. **`Unique constraint failed (P2002)`**
   库里已经有半截脏数据。两种处理：
   - **重置库**：`pnpm exec prisma migrate reset`（开发期推荐）
   - **写容错代码**：用 `safeUpsertUser` 兜底（见 6.5）

2. **嵌套 `posts.create` 不是幂等的**
   `upsert` 的 `update: {}` 只对父记录生效，已存在的 User 上**不会**重复创建文章——这是好事，但要意识到「重跑 ≠ 重新生成所有数据」。

3. **`prisma.$disconnect()` 写在 `then` 里**
   失败分支不会触发，导致脚本挂住。**永远写在 `finally` 里**。

4. **种子里 `import { PrismaService }` 复用 Nest 服务**
   种子是独立脚本，**不在 Nest 容器里**。要自己 `new PrismaClient()`，不能依赖 DI。

#### 6.8 🎯 决策清单

| 数据类型 | 是否加种子 | 备注 |
| --- | --- | --- |
| 字典表（角色、地区、分类） | ✅ 必加 | 每次重置都要有 |
| 默认管理员账号 | ✅ 必加 | 密码用 `bcrypt` 加密后写入 |
| 业务测试数据 | ✅ 加，但用 `NODE_ENV` 隔离生产 | 见 `seedDevOnly()` |
| 一次性数据修复（洗历史数据） | ❌ 不要用种子 | 用一次性脚本或 SQL migration |

---

# 缓存篇

## Redis 缓存（cache-manager v7 + @keyv/redis）

> 官方文档：[NestJS Caching](https://docs.nestjs.com/techniques/caching)

### 一、依赖安装

```bash
pnpm add @nestjs/cache-manager cache-manager @keyv/redis keyv cacheable
```

### 二、依赖说明

| 依赖包 | 作用 |
| --- | --- |
| `@nestjs/cache-manager` | NestJS 封装的缓存模块，提供 `CacheModule`、`CacheInterceptor`、`@CacheKey`、`@CacheTTL` |
| `cache-manager` v7 | 缓存核心库，v7 起底层切换到 Keyv |
| `@keyv/redis` | Keyv 的 Redis 适配器，把 Redis 当作 store |
| `keyv` | Keyv 主库（peer dependency） |
| `cacheable` | cache-manager v7 的内部依赖 |

> ⚠️ **版本兼容性大坑**：cache-manager v6 及以前用的是 `cache-manager-redis-yet` / `cache-manager-redis-store`，**v7 必须用 `@keyv/redis`**。装错包会报 `stores` 类型不匹配。

### 三、v7 与旧版的关键差异

| 旧版（v5 / v6） | 新版（v7） |
| --- | --- |
| `ttl` 单位是**秒** | `ttl` 单位是**毫秒** |
| `store: redisStore` | `stores: [createKeyv(url)]` |
| `cache.reset()` | `cache.clear()` |
| `cache-manager-redis-yet` | `@keyv/redis` |

> 最容易踩的就是 ttl 单位 —— 写 `ttl: 60` 以为是 60 秒，实际只缓存了 60 毫秒。

### 四、环境变量

```bash
# .env.development
REDIS_URL=redis://localhost:6379
```

校验规则加到 [app.module.ts](src/app.module.ts) 的 Joi schema 里，缺了直接拒绝启动：

```ts
REDIS_URL: Joi.string().uri().required(),
```

### 五、全局注册 CacheModule

写在 [app.module.ts](src/app.module.ts) 里，`isGlobal: true` 后所有模块都能直接注入 `CACHE_MANAGER`，**无需重复 import**。

```ts
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';

CacheModule.registerAsync({
  isGlobal: true,            // 全局可用，业务模块无需再 import CacheModule
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    // stores 接受 Keyv 实例数组，可同时挂多层（如本地 LRU + Redis）
    // 这里只用 Redis 一层；ttl 单位是毫秒（v7 变更点，旧版是秒）
    stores: [createKeyv(config.get<string>('REDIS_URL'))],
    ttl: 60 * 1000,          // 默认缓存 60 秒
  }),
}),
```

> 💡 **全局 vs 非全局的区别**：`isGlobal` 影响的是 Nest 的 DI 容器（省掉每个模块写 `imports: [CacheModule]`），但 `import { CacheInterceptor } from '@nestjs/cache-manager'` 这种**符号引入**是 TS 语法层面的，永远要写。

### 六、装饰器方式：在 Controller 中使用

最常见的用法。GET 请求自动走缓存，参见 [cats.controller.ts](src/modules/cats/cats.controller.ts)。

```ts
import {
  CacheInterceptor,   // 拦截 GET 请求，命中走缓存
  CacheKey,           // 自定义缓存 key（不写则用 URL）
  CacheTTL,           // 单独设置 ttl，毫秒
} from '@nestjs/cache-manager';

@UseInterceptors(CacheInterceptor)   // 控制器级别：所有 GET 都走缓存
@Controller('cats')
export class CatsController {
  constructor(private readonly catsService: CatsService) {}

  // 自定义 key + ttl
  @CacheKey('cats')
  @CacheTTL(60 * 1000)
  @Get()
  findAll() {
    return this.catsService.findAll();
  }

  // 不写 @CacheKey 时，默认用完整 URL 当 key
  // /cats/1、/cats/2 各占一份缓存
  @CacheKey('catId')
  @CacheTTL(60 * 1000)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.catsService.findOne(+id);
  }
}
```

> 💡 `CacheInterceptor` **只缓存 GET**，POST / PATCH / DELETE 自动跳过，不会污染缓存。

#### 三种注册范围

| 范围 | 写法 | 适用场景 |
| --- | --- | --- |
| 单个方法 | 在方法上加 `@UseInterceptors(CacheInterceptor)` | 只想缓存某几个接口 |
| 整个 Controller | 在 class 上加 `@UseInterceptors(CacheInterceptor)` | 控制器内所有 GET 都缓存（推荐） |
| 全局 | `app.useGlobalInterceptors(app.get(CacheInterceptor))` | 全站 GET 默认缓存（慎用，写操作要手动清） |

#### `@CacheKey` 的静态本质

`@CacheKey('xxx')` 接收的是**字符串字面量**，无法读取请求参数动态拼 key。所以：

- `findAll()` 用 `@CacheKey('cats')` 没问题，整个列表共享一份缓存
- `findOne(:id)` 用 `@CacheKey('catId')` 会让 `/cats/1` 和 `/cats/2` **共用同一份缓存**，第二次请求拿到的是第一次的结果（这是个常见误用）
- 想按 id 区分缓存，**要么去掉 `@CacheKey`** 让它默认用 URL 当 key，**要么改用手动注入方式**

### 七、手动方式：在 Service 中操作缓存

涉及业务逻辑、按字段拼动态 key、写操作清缓存时，要用手动注入。参见 [cats.service.ts](src/modules/cats/cats.service.ts)。

```ts
import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CatsService {
  constructor(
    // 因为 CacheModule 注册时 isGlobal: true，这里直接注入即可
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async findAll() {
    // 缓存 key 用「资源:动作」风格，方便后续按前缀清理
    const cacheKey = 'cats:findAll';

    // 1. 先查缓存，命中直接返回
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    // 2. 未命中走原逻辑（DB / 远程接口）
    const data = await this.fetchFromDb();

    // 3. 写回缓存，ttl 单位毫秒
    await this.cache.set(cacheKey, data, 30 * 1000);
    return data;
  }

  async update(id: number, dto: UpdateCatDto) {
    const cat = await this.prisma.cat.update({ where: { id }, data: dto });
    // 写操作必须主动清缓存，否则后续 GET 会读到脏数据
    await this.cache.del('cats:findAll');
    return cat;
  }
}
```

#### Cache 实例核心 API

| 方法 | 作用 | 备注 |
| --- | --- | --- |
| `cache.get<T>(key)` | 读取缓存 | 未命中返回 `undefined` |
| `cache.set(key, value, ttl)` | 写入缓存 | ttl 单位**毫秒**，省略则用全局默认 |
| `cache.del(key)` | 删除指定 key | 写操作后用，避免脏数据 |
| `cache.clear()` | 清空全部缓存 | ⚠️ 慎用，影响所有模块 |

### 八、装饰器 vs 手动注入

| 维度 | 装饰器（CacheInterceptor） | 手动注入（CACHE_MANAGER） |
| --- | --- | --- |
| 写法 | 一行装饰器 | 几行模板代码 |
| 控制粒度 | 粗：整个响应一起缓存 | 细：可按字段拼 key、分级缓存 |
| 写操作自动清缓存 | ❌ 不会，要自己 `del` | ✅ 完全可控 |
| key 是否支持动态拼接 | ❌ `@CacheKey` 是静态字面量 | ✅ 可拼 `user:${id}:profile` |
| 推荐场景 | 纯 GET 列表 / 详情 | 涉及写操作、需要细粒度控制 |

### 九、🕳️ 几个常见的坑

1. **`ttl` 单位搞错**
   v7 是**毫秒**，旧版是**秒**。`ttl: 60` 在 v7 里只缓存 60 毫秒，几乎不生效。

2. **装错 Redis 包**
   v7 必须用 `@keyv/redis`，不能用 `cache-manager-redis-yet` / `cache-manager-redis-store`。后者是 v6 时代的产物，v7 的 `stores` 字段类型不兼容。

3. **CacheModule 不写 isGlobal，又在子模块重复 register**
   每个模块各自 `registerAsync` 会创建**独立的 Redis 连接**，10 个模块就是 10 套连接池。
   推荐：`isGlobal: true` 一次注册全局生效，或抽一个 `SharedCacheModule` 配置完后 `exports: [CacheModule]` 转发。

4. **`@CacheKey('catId')` 用在带参数的 GET 上**
   `/cats/1` 和 `/cats/2` 会**共用一份缓存**，第二次请求拿到的是第一次的结果。要么去掉 `@CacheKey` 用默认 URL key，要么改用手动注入。

5. **写操作忘记清缓存**
   `update` / `delete` 后没调 `cache.del`，下一次 GET 读到的还是旧数据。CacheInterceptor 不会帮你清，必须手动维护。

6. **缓存穿透**
   查询不存在的数据时，每次都会走 DB。防御方法：把「查不到」的结果也缓存一份（短 ttl，比如 5 秒），或上布隆过滤器。

---

## ioredis（待补充 🚧）

> ⚠️ **当前状态：占位章节，尚未在项目中落地实现。** 后续接入消息推送 / 任务队列 / 分布式锁等场景时再完善示例代码。

### 一、ioredis 是什么

**`ioredis`** 是 Node.js 生态最流行的 Redis 客户端之一，定位是**底层、全功能、面向 Redis 协议**的连接库。它和上面的 `cache-manager` 不冲突 —— 一个管"缓存语义"，一个管"完整 Redis 命令"。

### 二、和 cache-manager 的分工

| 维度 | cache-manager + @keyv/redis | ioredis |
| --- | --- | --- |
| 抽象层级 | 高层（缓存语义：get / set / ttl） | 低层（Redis 命令一比一映射） |
| 能做什么 | 缓存读写、装饰器集成 | 全部 Redis 命令：pub/sub、stream、pipeline、Lua、事务 |
| 不能做什么 | pub/sub、streams、复杂事务 | 没有装饰器、没有自动序列化 |
| 使用方式 | `@Inject(CACHE_MANAGER)` | `new Redis(url)` 直接用 |

> 简单说：**cache-manager 是"键值缓存"，ioredis 是"完整 Redis 客户端"。**

### 三、什么时候才需要 ioredis

下面这些场景 cache-manager **做不了**或**做得很别扭**，就得直接上 ioredis：

1. **发布订阅（Pub/Sub）** — 实时推送、跨进程通信
2. **Stream / List** — 消息队列、任务流
3. **Pipeline / Transaction** — 批量原子操作
4. **Lua 脚本** — 服务端原子计算（限流、库存扣减）
5. **分布式锁（Redlock）** — 多节点互斥
6. **BullMQ 之类的库** — 它们底层都要求传一个 ioredis 实例

> 💡 如果只做接口缓存，cache-manager 已经足够，**不用着急引入 ioredis**。

### 四、当前项目状态

`package.json` 里**已经装了 `ioredis`**，但目前没有任何代码在用它（`@keyv/redis` 走的是官方 `node-redis`，跟 ioredis 是两套客户端）。

可选处理方式：

- **方案 A**：先卸载，等真正用到再装回来
  ```bash
  pnpm remove ioredis
  ```
- **方案 B**：保留，作为后续接入 BullMQ / 分布式锁的预备依赖（推荐 ✅）

### 五、🚧 待补充内容（TODO）

下面这些小节等真正用到时再补：

- [ ] **DIY 方案**：手写 `RedisModule` + `REDIS_CLIENT` 注入令牌（推荐学习阶段使用）
- [ ] **社区包方案**：`@nestjs-modules/ioredis` 集成示例
- [ ] **常见用法示例**：
  - [ ] Pub/Sub 发布订阅
  - [ ] `INCR` + `EXPIRE` 实现接口限流
  - [ ] `SET NX EX` 实现分布式锁
  - [ ] `pipeline` 批量操作
- [ ] **连接管理**：重连策略、错误处理、优雅关闭
- [ ] **DIY vs 社区包决策建议**

> 💬 后续接入相关功能时，把对应小节的 `[ ]` 改成 `[x]` 并补全代码即可。

---

# Docker 篇

## Docker Compose 一键启动 Redis + PostgreSQL

> 配置文件：[docker-compose.yml](docker-compose.yml)
>
> 用 Docker Compose 把 **Redis** 和 **PostgreSQL** 一起跑起来，避免本地装服务的环境污染问题。

### 一、为什么用 Docker

| 痛点 | Docker 的解决方式 |
| --- | --- |
| 本地装 PostgreSQL / Redis 污染系统、版本难管理 | 容器隔离，一行命令拉起、一行命令删干净 |
| 多个项目共用一台机器，端口冲突 | 通过 `ports` 映射控制本地端口，默认与容器内端口一致（5432/6379），冲突时再改 |
| 团队协作环境不一致 | `docker-compose.yml` 提交到仓库，所有人一份配置 |
| 想试不同版本（PG 14 vs 16） | 改一行 `image: postgres:16` 就能切 |

### 二、配置说明

当前 [docker-compose.yml](docker-compose.yml) 跑了两个服务：

| 服务名 | 镜像 | 容器名 | 本地端口 | 容器内端口 |
| --- | --- | --- | --- | --- |
| `new-redis` | `redis:7.4` | `nest-redis-1` | **6379** | 6379 |
| `new-db` | `postgres:16` | `nest-pg-1` | **5432** | 5432 |

> 🚨 **关于端口**
> 当前配置本地端口与容器内端口一致（默认值），方便直接用 `redis-cli` / `psql` 连接，**前提是本机这两个端口没被占用**。如果出现 `port is already allocated`：
>
> - 要么停掉本机上占用端口的服务（比如本地装的 PostgreSQL / Redis）
> - 要么改 [docker-compose.yml](docker-compose.yml) 里 `ports` 左侧的本地端口（如 `"5439:5432"`），并同步修改 `.env.development` 里的 `DATABASE_URL` / `REDIS_URL`

#### Redis 配置要点

```yaml
command: redis-server --maxmemory 1gb --maxmemory-policy allkeys-lru
```

启动时直接传参，相当于在 `redis.conf` 里写了：

- `maxmemory 1gb` — Redis 最多使用 1GB 内存
- `maxmemory-policy allkeys-lru` — 内存满了淘汰最久未使用的 key（**纯缓存场景推荐**，避免 OOM 直接挂掉）

> 💡 关于淘汰策略的详细对比，见 [缓存篇 - 几个常见的坑](#九-几个常见的坑) 上方关于 `maxmemory-policy` 的说明。

#### PostgreSQL 配置要点

```yaml
environment:
  POSTGRES_USER: postgres
  POSTGRES_PASSWORD: "123456"
  POSTGRES_DB: test
```

容器**首次启动时**会自动：

1. 创建用户 `postgres` 并设置密码 `123456`
2. 创建数据库 `test`
3. 给 `postgres` 授权这个库的所有权限

> ⚠️ 这些 `environment` 变量**只在数据卷为空时生效**。如果改了密码但容器之前跑过，得先 `docker compose down -v` 清掉数据卷才会重新初始化。

### 三、配套的 .env 配置

服务跑在 **本地默认端口 6379 / 5432**，`.env.development` 配置如下：

```bash
# PostgreSQL：用户/密码/库名要与 docker-compose.yml 的 environment 完全一致
DATABASE_URL="postgresql://postgres:123456@localhost:5432/test"

# Redis
REDIS_URL=redis://localhost:6379
```

### 四、常用启动命令

#### 4.1 启动服务

```bash
# 前台启动（看日志，Ctrl+C 停止）
docker compose up

# 后台启动（推荐，启动后终端可以继续干别的）
docker compose up -d

# 强制重新构建后启动（改了 yml 文件后用）
docker compose up -d --force-recreate
```

#### 4.2 查看状态

```bash
# 看哪些服务在跑
docker compose ps

# 看日志（-f = 实时跟随，类似 tail -f）
docker compose logs -f

# 只看某个服务的日志
docker compose logs -f new-redis
docker compose logs -f new-db
```

#### 4.3 停止服务

```bash
# 停止但保留容器和数据（下次 up 还在）
docker compose stop

# 停止 + 删除容器（数据卷保留，数据还在）
docker compose down

# ⚠️ 停止 + 删除容器 + 删除数据卷（数据会丢！）
docker compose down -v
```

#### 4.4 进入容器调试

```bash
# 进入 Redis CLI
docker exec -it nest-redis-1 redis-cli

# 进入 PostgreSQL psql
docker exec -it nest-pg-1 psql -U postgres -d test

# 进入容器的 shell（万能调试方式）
docker exec -it nest-pg-1 bash
```

#### 4.5 重启某个服务

```bash
# 改了配置只想重启一个
docker compose restart new-redis
```

### 五、典型工作流

#### 第一次启动项目

```bash
# 1. 拉起 Redis + PG
docker compose up -d

# 2. 等几秒让 PG 完成初始化（首次会建库建用户）
docker compose logs -f new-db
# 看到 "database system is ready to accept connections" 就行

# 3. 跑 Prisma 迁移建表
pnpm exec prisma migrate dev

# 4. 启动 Nest
pnpm start:dev
```

#### 日常开发

```bash
# 早上来开机
docker compose up -d

# 晚上下班
docker compose stop   # 不删容器，第二天直接 up -d 接着用
```

#### 切换分支 / 重置数据

```bash
# 完全清空重来（包括数据库里的所有数据！）
docker compose down -v
docker compose up -d
pnpm exec prisma migrate dev
```

### 六、🕳️ 几个常见的坑

1. **修改 environment 后密码不生效**
   PG 的 `POSTGRES_USER` / `POSTGRES_PASSWORD` 只在**数据卷首次初始化时**生效。改了密码却没清卷，新密码会被忽略。
   解决：`docker compose down -v` 后重新 `up -d`。

2. **端口冲突报错 `port is already allocated`**
   说明 6379 / 5432 被本机其他进程占用了（常见于本地已经装了 PostgreSQL / Redis）。两种处理方式：
   - 停掉本机的占用服务
   - 或者改 [docker-compose.yml](docker-compose.yml) 里 `ports` 左侧的本地端口（例如 `"6389:6379"`、`"5439:5432"`），同时同步改 `.env.development` 里的 `DATABASE_URL` / `REDIS_URL`。

3. **容器名重复 `Conflict. The container name "/nest-pg-1" is already in use`**
   说明之前有同名容器残留。`docker rm -f nest-pg-1` 删掉后再启动。

4. **Prisma 连不上数据库**
   检查清单：
   - 容器有没有起来：`docker compose ps`
   - 端口对不对：`.env.development` 里写的本地端口（默认 **5432**）要和 [docker-compose.yml](docker-compose.yml) 里 `ports` 左侧的本地端口一致
   - PG 初始化完了吗：`docker compose logs new-db` 看有没有 "ready to accept connections"

5. **数据丢失**
   当前 [docker-compose.yml](docker-compose.yml) **没有显式挂载 volumes**，数据放在 Docker 默认管理的匿名卷里。`docker compose down -v` 会一起删掉。
   如果想让数据更可控，可以加上：
   ```yaml
   services:
     new-db:
       volumes:
         - ./data/pg:/var/lib/postgresql/data
   ```
   这样数据存到项目目录的 `./data/pg` 下，删容器不影响。

### 七、🚧 后续可以补充的

- [ ] 加 `volumes` 持久化数据到本地目录
- [ ] 加 `healthcheck` 让 Nest 等待数据库就绪后再启动
- [ ] 加 `depends_on` 处理服务启动顺序
- [ ] 多环境 compose 文件拆分：`docker-compose.dev.yml` / `docker-compose.prod.yml`
- [ ] 把 Nest 应用本身也容器化（多阶段构建）



