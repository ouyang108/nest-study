"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ChatioGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatioGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const chatio_service_1 = require("./chatio.service");
const update_chatio_dto_1 = require("./dto/update-chatio.dto");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const MESSAGE = 'chatioMessage';
let ChatioGateway = ChatioGateway_1 = class ChatioGateway {
    chatioService;
    logger = new common_1.Logger(ChatioGateway_1.name);
    server;
    constructor(chatioService) {
        this.chatioService = chatioService;
    }
    afterInit(server) {
        this.logger.log(`WebSocket 网关已启动，当前连接数: `);
    }
    handleConnection(client) {
        this.logger.log(`客户端已连接111: ${client.id}`);
        client.emit(MESSAGE, { msg: '欢迎加入', id: client.id });
        client.broadcast.emit(MESSAGE, {
            from: client.id,
            content: '加',
        });
    }
    handleDisconnect(client) {
        this.logger.log(`客户端断开: ${client.id}`);
    }
    create(data, client) {
        this.logger.log(`收到消息: ${data.content}`);
        client.emit(MESSAGE, {
            from: client.id,
            content: data.content,
        });
        return { event: MESSAGE, data: '服务端已收到' };
    }
    findAll() {
        return this.chatioService.findAll();
    }
    findOne(id) {
        return this.chatioService.findOne(id);
    }
    update(updateChatioDto) {
        return this.chatioService.update(updateChatioDto.id, updateChatioDto);
    }
    remove(id) {
        return this.chatioService.remove(id);
    }
    async handleJoinRoom(room, client) {
        await client.join(room);
        this.server.to(room).emit(MESSAGE, `${client.id} 加入了房间 ${room}`);
    }
};
exports.ChatioGateway = ChatioGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatioGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('createChatio'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], ChatioGateway.prototype, "create", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('findAllChatio'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ChatioGateway.prototype, "findAll", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('findOneChatio'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ChatioGateway.prototype, "findOne", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('updateChatio'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_chatio_dto_1.UpdateChatioDto]),
    __metadata("design:returntype", void 0)
], ChatioGateway.prototype, "update", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('removeChatio'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ChatioGateway.prototype, "remove", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('joinRoom'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatioGateway.prototype, "handleJoinRoom", null);
exports.ChatioGateway = ChatioGateway = ChatioGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
        namespace: '/chatio',
    }),
    __metadata("design:paramtypes", [chatio_service_1.ChatioService])
], ChatioGateway);
//# sourceMappingURL=chatio.gateway.js.map