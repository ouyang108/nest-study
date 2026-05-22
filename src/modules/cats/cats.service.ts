import { HttpException, Injectable } from '@nestjs/common';
import { CreateCatDto } from './dto/create-cat.dto';
import { UpdateCatDto } from './dto/update-cat.dto';
// 引入 UserService 类型，用于依赖注入（路径已更新到 modules/ 下）
import { UserService } from 'src/modules/user/user.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class CatsService {
  // 通过构造函数注入 UserService
  // Nest 会自动从 CatsModule 的 imports（UserModule 导出的 providers）里找到并注入实例
  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly primas: PrismaService,
  ) {}

  create(createCatDto: CreateCatDto) {
    // 在这里就可以直接调用 UserService 的方法，例如：
    // const users = this.userService.findAll();
    console.log('CreateCatDto:', createCatDto);
    return 'This action adds a new cat';
  }

  async findAll() {
    // 抛出错误
    // throw new HttpException('这是局部错误过滤器', 400);
    // 示例：调用 UserService 的方法
    const users = this.userService.findAll();
    const message = this.configService.get<string>('PORT'); // 从配置服务中获取 JWT_SECRET 的值
    const DATABASE_URL = this.configService.get<string>('DATABASE_URL'); // 从配置服务中获取 JWT_SECRET 的值
    const xyz_shared_key_123 =
      this.configService.get<string>('xyz_shared_key_123'); // 从配置服务中获取 xyz_shared_key_123 的值
    // 查找user表的所有数据
    const result = await this.primas.user.findMany();
    return {
      data: {
        msg: `This action returns all cats`,
        users,
        message,
        DATABASE_URL,
        xyz_shared_key_123,
        result,
      },
    };
  }

  findOne(id: number) {
    return `This action returns a #${id} cat`;
  }

  update(id: number, updateCatDto: UpdateCatDto) {
    return `This action updates a #${id} cat`;
  }

  remove(id: number) {
    return `This action removes a #${id} cat`;
  }
}
