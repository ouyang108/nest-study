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
import { ChatioService } from './chatio.service';
// import { CreateChatioDto } from './dto/create-chatio.dto';
import { UpdateChatioDto } from './dto/update-chatio.dto';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
const MESSAGE = 'chatioMessage';
// 访问地址示例：ws://localhost:3000/chatio

/**
 * client.emit(MESSAGE, { msg: '欢迎加入', id: client.id });
 * 客户端接收消息示例：
 * socket.on('chatioMessage', (data) => {
 *   console.log(data);
 *
 *
 *
 */
@WebSocketGateway({
  cors: {
    origin: '*', // 允许所有来源访问 ws 服务，生产环境请根据实际情况调整
  },
  namespace: '/chatio', // ws 命名空间，客户端连接时需要指定，例如 io('/chatio')
})
export class ChatioGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ChatioGateway.name);

  // 注入 socket.io 的 Server 实例，用于主动广播
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatioService: ChatioService) {}

  // 网关初始化完成后的回调，server 参数即为 socket.io 的 Server 实例
  afterInit(server: Server) {
    this.logger.log(`WebSocket 网关已启动，当前连接数: `);
  }

  // / 客户端连接时触发：可在此做鉴权、记录在线用户等
  handleConnection(client: Socket) {
    this.logger.log(`客户端已连接111: ${client.id}`);

    client.emit(MESSAGE, { msg: '欢迎加入', id: client.id });
    // 广播给所有连接的客户端 不包含当前人
    client.broadcast.emit(MESSAGE, {
      from: client.id,
      content: '加',
    });
  }

  // 客户端断开连接时触发：可在此清理资源、更新在线用户列表等
  handleDisconnect(client: Socket) {
    this.logger.log(`客户端断开: ${client.id}`);
  }
  // 客户端发送消息格式为：{"event":"createChatio","data":{"content":"hello"}}
  @SubscribeMessage('createChatio')
  create(
    @MessageBody() data: { content: string }, // 取消息体
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`收到消息: ${data.content}`);
    // 广播给所有其他客户端（含发送者）
    // client.broadcast.emit('message', {
    //   from: client.id,
    //   content: data.content,
    // });
    client.emit(MESSAGE, {
      from: client.id,
      content: data.content,
    });
    // this.server.emit(MESSAGE, {
    //   from: client.id,
    //   content: '加',
    // });
    return { event: MESSAGE, data: '服务端已收到' };
  }

  @SubscribeMessage('findAllChatio')
  findAll() {
    return this.chatioService.findAll();
  }

  @SubscribeMessage('findOneChatio')
  findOne(@MessageBody() id: number) {
    return this.chatioService.findOne(id);
  }

  @SubscribeMessage('updateChatio')
  update(@MessageBody() updateChatioDto: UpdateChatioDto) {
    return this.chatioService.update(updateChatioDto.id, updateChatioDto);
  }

  @SubscribeMessage('removeChatio')
  remove(@MessageBody() id: number) {
    return this.chatioService.remove(id);
  }

  // 房间（Room）示例：聊天室、协同编辑等多对多场景必备
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() room: string,
    @ConnectedSocket() client: Socket,
  ) {
    await client.join(room); // 加入房间
    // 只向该房间内的客户端广播
    this.server.to(room).emit(MESSAGE, `${client.id} 加入了房间 ${room}`);
  }
}
