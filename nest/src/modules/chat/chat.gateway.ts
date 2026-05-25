// import {
//   WebSocketGateway,
//   SubscribeMessage,
//   MessageBody,
// } from '@nestjs/websockets';
// import { ChatService } from './chat.service';
// import { CreateChatDto } from './dto/create-chat.dto';
// import { UpdateChatDto } from './dto/update-chat.dto';

// @WebSocketGateway()
// export class ChatGateway {
//   constructor(private readonly chatService: ChatService) {}

//   @SubscribeMessage('createChat')
//   create(@MessageBody() createChatDto: CreateChatDto) {
//     return this.chatService.create(createChatDto);
//   }

//   @SubscribeMessage('findAllChat')
//   findAll() {
//     return this.chatService.findAll();
//   }

//   @SubscribeMessage('findOneChat')
//   findOne(@MessageBody() id: number) {
//     return this.chatService.findOne(id);
//   }

//   @SubscribeMessage('updateChat')
//   update(@MessageBody() updateChatDto: UpdateChatDto) {
//     return this.chatService.update(updateChatDto.id, updateChatDto);
//   }

//   @SubscribeMessage('removeChat')
//   remove(@MessageBody() id: number) {
//     return this.chatService.remove(id);
//   }
// }

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
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';

/**
 * 本地最小 ws 类型定义
 *
 * WHY: 项目还没安装 `ws` / `@types/ws`，直接 `import { WebSocket } from 'ws'`
 * 会报「找不到模块」。这里手写最小可用接口，先让 TS 编译通过。
 *
 * 正式使用前请执行：
 *   npm i ws
 *   npm i -D @types/ws
 * 然后把下面两个 interface 删掉，改成 `import { WebSocket, Server } from 'ws';`
 */
interface WsClient {
  /** WebSocket 连接状态：0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED */
  readyState: number;
  /** 发送数据到客户端 */
  send: (data: string) => void;
  /** 自定义字段：用于挂载我们生成的 clientId */
  id?: string;
  /** WHY: 调试用，给底层 ws 加 message 监听，看客户端到底发了什么原始数据 */
  on: (event: string, listener: (...args: any[]) => void) => void;
}
interface WsServer {
  /** ws 库中所有当前连接的客户端集合 */
  clients: Set<WsClient>;
}

/** WebSocket 状态常量（替代 WebSocket.OPEN） */
const WS_OPEN = 1;

/**
 * 聊天网关
 *
 * WHY 选 @nestjs/platform-ws 而不是 socket.io：
 *  - 原生 ws 协议体积小，浏览器原生 WebSocket 即可连接，不需要 socket.io 客户端 SDK
 *  - 代价：没有内置房间(rooms)、自动重连、ACK 回执，需要自己实现
 *
 * 客户端发送消息约定（platform-ws 要求 JSON 字符串）：
 *   { "event": "createChat", "data": { ... } }
 * 服务端 return 的值会自动包装成：
 *   { "event": "createChat", "data": <返回值> }
 */
@WebSocketGateway({
  // 端口留空则复用 HTTP 服务端口，少开一个端口
  // port: 3001,
  path: '/ws/chat', // 客户端连接地址：ws://host:3000/ws/chat
  cors: {
    origin: '*', // WHY: 开发期放开；生产环境务必收紧到具体域名
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  // WHY: 用 nest 的 Logger 而不是 console.log，统一日志格式 + 受日志级别控制
  private readonly logger = new Logger(ChatGateway.name);

  // WHY: 自己维护在线连接表，platform-ws 没有 socket.io 的 rooms / sockets.get(id) 能力
  // key 用 clientId（自己生成），value 是底层 WebSocket 实例
  private readonly clients = new Map<string, WsClient>();

  /**
   * 注入底层 ws.Server 实例
   * WHY: 需要广播时通过 server.clients 遍历所有连接
   */
  @WebSocketServer()
  server!: WsServer;

  constructor(private readonly chatService: ChatService) {}

  // ============ 生命周期钩子 ============

  /** 网关初始化完成（server 已就绪） */
  afterInit(server: WsServer) {
    this.logger.log(`WebSocket 网关已启动，当前连接数: ${server.clients.size}`);
  }

  /** 客户端连接进来时触发 */
  handleConnection(client: WsClient) {
    // WHY: ws 原生没有 client.id，自己生成一个挂到实例上方便追踪
    const clientId = this.generateClientId();
    client.id = clientId;
    this.clients.set(clientId, client);

    this.logger.log(`客户端连接: ${clientId}, 在线数: ${this.clients.size}`);

    // // ============ 调试：打印所有原始消息 ============
    // // WHY: 排查「客户端发了但 @SubscribeMessage 没触发」时用，能看到 platform-ws
    // // 解析前的原始字符串。定位完问题后可以删掉。
    // client.on('message', (raw: Buffer) => {
    //   const text = raw.toString();
    //   console.log(`[RAW from ${clientId}]`, text);
    //   try {
    //     // WHY: 显式类型成 { event?: unknown }，避免 any 触发 eslint unsafe 告警
    //     const parsed = JSON.parse(text) as { event?: unknown };
    //     console.log(`[PARSED]`, parsed);
    //     console.log(
    //       `[EVENT 字段]`,
    //       parsed?.event,
    //       '| 类型:',
    //       typeof parsed?.event,
    //     );
    //   } catch {
    //     console.log(`[PARSE FAIL] 不是合法 JSON`);
    //   }
    // });

    // 给当前连接发一条欢迎消息（单播）
    this.sendTo(client, 'welcome', { clientId, message: '连接成功' });

    // 广播给所有人「有新人进来了」
    this.broadcast('userJoined', { clientId, online: this.clients.size });
  }

  /** 客户端断开时触发 */
  handleDisconnect(client: WsClient) {
    const clientId = client.id ?? 'unknown';
    this.clients.delete(clientId);

    this.logger.log(`客户端断开: ${clientId}, 在线数: ${this.clients.size}`);

    this.broadcast('userLeft', { clientId, online: this.clients.size });
  }

  // ============ 消息处理（@SubscribeMessage） ============

  /**
   * 发消息
   * 客户端发：{"event":"createChat","data":{"content":"hello"}}
   */
  @SubscribeMessage('createChat')
  create(
    @MessageBody() createChatDto: CreateChatDto,
    @ConnectedSocket() client: WsClient,
  ) {
    const clientId = client.id ?? 'unknown';

    this.logger.log(
      `收到消息 from ${clientId}: ${JSON.stringify(createChatDto)}`,
    );

    const result = this.chatService.create(createChatDto);

    // WHY: 业务上聊天消息要广播给所有人，而不是只回给发送者
    this.broadcast('newMessage', { from: clientId, payload: createChatDto });

    // return 的值会作为 ACK 回给当前发送者：{ event:'createChat', data: result }
    return result;
  }

  /** 查询历史消息（仅回给请求者） */
  @SubscribeMessage('findAllChat')
  findAll() {
    return this.chatService.findAll();
  }

  @SubscribeMessage('findOneChat')
  findOne(@MessageBody() id: number) {
    return this.chatService.findOne(id);
  }

  @SubscribeMessage('updateChat')
  update(@MessageBody() updateChatDto: UpdateChatDto) {
    return this.chatService.update(updateChatDto.id, updateChatDto);
  }

  @SubscribeMessage('removeChat')
  remove(@MessageBody() id: number) {
    return this.chatService.remove(id);
  }

  // ============ 工具方法 ============

  /**
   * 广播给所有在线客户端
   * WHY: platform-ws 没有内置 broadcast，手动遍历 server.clients
   */
  private broadcast(event: string, data: unknown) {
    const payload = JSON.stringify({ event, data });
    this.server.clients.forEach((client) => {
      // 只给已就绪的连接发，避免给正在握手/关闭的连接发抛错
      if (client.readyState === WS_OPEN) {
        client.send(payload);
      }
    });
  }

  /** 单播给指定 socket */
  private sendTo(client: WsClient, event: string, data: unknown) {
    if (client.readyState === WS_OPEN) {
      client.send(JSON.stringify({ event, data }));
    }
  }

  /** 生成简单的客户端 ID（生产环境建议用 uuid / nanoid） */
  private generateClientId(): string {
    return `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
