import { Injectable } from '@nestjs/common';
import { CreateChatioDto } from './dto/create-chatio.dto';
import { UpdateChatioDto } from './dto/update-chatio.dto';

@Injectable()
export class ChatioService {
  create(createChatioDto: CreateChatioDto) {
    return 'This action adds a new chatio';
  }

  findAll() {
    return `This action returns all chatio`;
  }

  findOne(id: number) {
    return `This action returns a #${id} chatio`;
  }

  update(id: number, updateChatioDto: UpdateChatioDto) {
    return `This action updates a #${id} chatio`;
  }

  remove(id: number) {
    return `This action removes a #${id} chatio`;
  }
}
