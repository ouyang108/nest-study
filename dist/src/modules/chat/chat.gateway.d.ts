import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
interface WsClient {
    readyState: number;
    send: (data: string) => void;
    id?: string;
    on: (event: string, listener: (...args: any[]) => void) => void;
}
interface WsServer {
    clients: Set<WsClient>;
}
export declare class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly chatService;
    private readonly logger;
    private readonly clients;
    server: WsServer;
    constructor(chatService: ChatService);
    afterInit(server: WsServer): void;
    handleConnection(client: WsClient): void;
    handleDisconnect(client: WsClient): void;
    create(createChatDto: CreateChatDto, client: WsClient): string;
    findAll(): string;
    findOne(id: number): string;
    update(updateChatDto: UpdateChatDto): string;
    remove(id: number): string;
    private broadcast;
    private sendTo;
    private generateClientId;
}
export {};
