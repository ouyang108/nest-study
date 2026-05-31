import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: '邮箱', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '密码', example: '123456' })
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: '确认密码', example: '123456' })
  @IsNotEmpty()
  confirmPassword: string;
}
