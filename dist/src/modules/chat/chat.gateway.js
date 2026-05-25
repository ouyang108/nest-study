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
var ChatGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const chat_service_1 = require("./chat.service");
const create_chat_dto_1 = require("./dto/create-chat.dto");
const update_chat_dto_1 = require("./dto/update-chat.dto");
const WS_OPEN = 1;
let ChatGateway = ChatGateway_1 = class ChatGateway {
    chatService;
    logger = new common_1.Logger(ChatGateway_1.name);
    clients = new Map();
    server;
    constructor(chatService) {
        this.chatService = chatService;
    }
    afterInit(server) {
        this.logger.log(`WebSocket 网关已启动，当前连接数: ${server.clients.size}`);
    }
    handleConnection(client) {
        const clientId = this.generateClientId();
        client.id = clientId;
        this.clients.set(clientId, client);
        this.logger.log(`客户端连接: ${clientId}, 在线数: ${this.clients.size}`);
        this.sendTo(client, 'welcome', { clientId, message: '连接成功' });
        this.broadcast('userJoined', { clientId, online: this.clients.size });
    }
    handleDisconnect(client) {
        const clientId = client.id ?? 'unknown';
        this.clients.delete(clientId);
        this.logger.log(`客户端断开: ${clientId}, 在线数: ${this.clients.size}`);
        this.broadcast('userLeft', { clientId, online: this.clients.size });
    }
    create(createChatDto, client) {
        const clientId = client.id ?? 'unknown';
        this.logger.log(`收到消息 from ${clientId}: ${JSON.stringify(createChatDto)}`);
        const result = this.chatService.create(createChatDto);
        this.broadcast('newMessage', { from: clientId, payload: createChatDto });
        return result;
    }
    findAll() {
        return this.chatService.findAll();
    }
    findOne(id) {
        return this.chatService.findOne(id);
    }
    update(updateChatDto) {
        return this.chatService.update(updateChatDto.id, updateChatDto);
    }
    remove(id) {
        return this.chatService.remove(id);
    }
    broadcast(event, data) {
        const payload = JSON.stringify({ event, data });
        this.server.clients.forEach((client) => {
            if (client.readyState === WS_OPEN) {
                client.send(payload);
            }
        });
    }
    sendTo(client, event, data) {
        if (client.readyState === WS_OPEN) {
            client.send(JSON.stringify({ event, data }));
        }
    }
    generateClientId() {
        return `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", Object)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('createChat'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_chat_dto_1.CreateChatDto, Object]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "create", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('findAllChat'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "findAll", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('findOneChat'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "findOne", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('updateChat'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_chat_dto_1.UpdateChatDto]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "update", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('removeChat'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "remove", null);
exports.ChatGateway = ChatGateway = ChatGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        path: '/ws/chat',
        cors: {
            origin: '*',
        },
    }),
    __metadata("design:paramtypes", [chat_service_1.ChatService])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map