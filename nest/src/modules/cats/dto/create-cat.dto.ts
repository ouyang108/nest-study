import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, IsNumber, Min, Max } from 'class-validator';

export class CreateCatDto {
  // 每个装饰器单独传 message，可以精确告诉前端「哪一条规则」没过
  @IsNotEmpty({ message: '猫咪名字不能为空' })
  @IsString({ message: '猫咪名字必须是字符串' })
  name: string;

  @IsNotEmpty({ message: '猫咪品种不能为空' })
  @IsString({ message: '猫咪品种必须是字符串' })
  @Type(() => String) // 确保即使传入数字也会被转换为字符串
  breed: string;

  @IsNotEmpty({ message: '猫咪年龄不能为空' })
  @IsNumber({}, { message: '猫咪年龄必须是数字' })
  @Min(0, { message: '猫咪年龄不能小于 0' })
  @Max(30, { message: '猫咪年龄不能大于 30' })
  age: number;
}
