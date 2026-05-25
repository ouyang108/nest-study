import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { ChatioService } from './chatio.service';
import { UpdateChatioDto } from './dto/update-chatio.dto';
import { Server, Socket } from 'socket.io';
export declare class ChatioGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly chatioService;
    private readonly logger;
    server: Server;
    constructor(chatioService: ChatioService);
    afterInit(server: Server): void;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    create(data: {
        content: string;
    }, client: Socket): {
        event: string;
        data: string;
    };
    findAll(): string;
    findOne(id: number): string;
    update(updateChatioDto: UpdateChatioDto): string;
    remove(id: number): string;
    handleJoinRoom(room: string, client: Socket): Promise<void>;
}
