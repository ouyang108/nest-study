# TODOLIST

> 项目待办清单，按 README.md 的章节结构组织。

---

## 一、待办（README 明确标 🚧 的硬性待补充）

### NestJS 模块篇 · 文件上传
- [x] 文件上传模块 `UploadModule`

### NestJS 篇 · 待补充章节

- [ ] **Guards 守卫** — 认证/鉴权核心机制，JWT + Passport 集成
- [ ] **自定义装饰器** — `createParamDecorator` 提取用户信息等
- [ ] **Pipes 管道** — 自定义管道（ParseIntPipe、自定义转换）
- [ ] **Swagger/OpenAPI** — 接口文档自动生成
- [ ] **定时任务** — `@nestjs/schedule`，Cron 表达式
- [ ] **队列** — `@nestjs/bullmq`，异步任务处理
- [ ] **日志** — 内置 Logger / 集成 Winston、Pino
- [ ] **API 版本控制** — URI / Header / Media Type 三种策略
- [ ] **限流 Rate Limiting** — `@nestjs/throttler` 防刷
- [ ] **生命周期钩子** — `onModuleInit`、`onApplicationBootstrap` 等
- [ ] **单元测试 / E2E 测试** — Jest + `@nestjs/testing`
- [ ] **动态模块** — `forRoot` / `forRootAsync` 模式

### 缓存篇 · ioredis

> 对应 README 章节：`## ioredis（待补充 🚧）` → `### 五、🚧 待补充内容（TODO）`

- [ ] **DIY 方案**：手写 `RedisModule` + `REDIS_CLIENT` 注入令牌
- [ ] **社区包方案**：`@nestjs-modules/ioredis` 集成示例
- [ ] **常见用法示例**
  - [ ] Pub/Sub 发布订阅
  - [ ] `INCR` + `EXPIRE` 实现接口限流
  - [ ] `SET NX EX` 实现分布式锁
  - [ ] `pipeline` 批量操作
- [ ] **连接管理**：重连策略、错误处理、优雅关闭
- [ ] **DIY vs 社区包决策建议**

### Docker 篇 · compose 增强

> 对应 README 章节：`### 七、🚧 后续可以补充的`

- [ ] 加 `volumes` 持久化数据到本地目录
- [ ] 加 `healthcheck` 让 Nest 等待数据库就绪后再启动
- [ ] 加 `depends_on` 处理服务启动顺序
- [ ] 多环境 compose 文件拆分：`docker-compose.dev.yml` / `docker-compose.prod.yml`
- [ ] 把 Nest 应用本身也容器化（多阶段构建）

### 其他

- [ ] 后续添加优化

---

## 二、已完成

> 按时间倒序排列。新条目追加到最上方。

### 2026-05-25 · SSE 模块从 0 到 1

- [x] SSE 模块基础实现：`@Sse('tick')` + RxJS `Observable<MessageEvent>`，每秒推送一条带递增序号的消息
- [x] 修复 SSE 连接秒断问题：全局响应拦截器 `InterceptorInterceptor` 通过 `Reflect.getMetadata('sse', context.getHandler())` 跳过 SSE 端点，避免破坏 `MessageEvent` 格式
- [x] `SseModule` 注册到 `AppModule` 的 `imports` 数组（之前漏挂导致 `/sse/tick` 直接 404）
- [x] README 新增 "# SSE 篇" 章节：SSE vs WebSocket 对比、后端实现、拦截器坑、前端 `EventSource` 用法、6 个常见坑、进阶（按用户推送 / 心跳保活）
- [x] 创建本文件 `TODOLIST.md`，收敛 README 中 🚧 标记的待办

### 早期 · README 各篇章节落地

> 这些是项目演进过程中陆续完成的文档与代码，作为基线归档。具体完成时间已不可考，统一归在「早期」。

#### NestJS 篇

- [x] Service vs Controller 概念与职责划分
- [x] `@Module` 模块装饰器用法
- [x] `@Injectable()` 与依赖注入机制
- [x] 环境变量处理（`ConfigModule` + Joi 校验 + 多环境）
- [x] 中间件 / 拦截器 / 过滤器三件套（含全局响应拦截器、统一异常过滤器）
- [x] DTO 校验（`ValidationPipe` + `class-validator` + transform）

#### WebSocket 篇

- [x] 模块一：原生 ws（`@nestjs/platform-ws`）—— 依赖、`WsAdapter` 注册、Gateway 示例、消息协议、客户端测试代码、常见坑
- [x] 模块二：Socket.IO（`@nestjs/platform-socket.io`）—— 依赖、Gateway 示例、消息收发、客户端示例、与原生 ws 对比、常见坑

#### 数据库篇

- [x] PostgreSQL + Prisma 接入：依赖安装、环境变量、模型迁移（migrate）、种子数据（seed）、常见坑

#### 缓存篇

- [x] Redis 缓存（cache-manager v7 + @keyv/redis）—— 依赖、v7 关键差异、全局注册、装饰器方式、手动方式、装饰器 vs 手动注入、常见坑

#### Docker 篇

- [x] Docker Compose 一键启动 Redis + PostgreSQL —— 为什么用 Docker、配置说明、`.env` 配套、常用启动命令、典型工作流、常见坑
