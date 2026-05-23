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




