import { PartialType } from '@nestjs/mapped-types';
import { CreateChatioDto } from './create-chatio.dto';

export class UpdateChatioDto extends PartialType(CreateChatioDto) {
  id: number;
}
