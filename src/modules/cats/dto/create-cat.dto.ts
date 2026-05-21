import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class CreateCatDto {
  @IsNotEmpty()
  @IsString()
  name: string;
  @IsNotEmpty()
  @IsString()
  breed: string;
  @IsNotEmpty()
  @IsNumber()
  age: number;
}
