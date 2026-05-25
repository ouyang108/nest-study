import { CreateChatioDto } from './dto/create-chatio.dto';
import { UpdateChatioDto } from './dto/update-chatio.dto';
export declare class ChatioService {
    create(createChatioDto: CreateChatioDto): string;
    findAll(): string;
    findOne(id: number): string;
    update(id: number, updateChatioDto: UpdateChatioDto): string;
    remove(id: number): string;
}
