import { Inject, Injectable } from '@nestjs/common';
import { CreateCatDto } from './dto/create-cat.dto';
import { UpdateCatDto } from './dto/update-cat.dto';
// 引入 UserService 类型，用于依赖注入（路径已更新到 modules/ 下）
import { UserService } from 'src/modules/user/user.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
@Injectable()
export class CatsService {
  // 通过构造函数注入 UserService
  // Nest 会自动从 CatsModule 的 imports（UserModule 导出的 providers）里找到并注入实例
  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly primas: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  create(createCatDto: CreateCatDto) {
    // 在这里就可以直接调用 UserService 的方法，例如：
    // const users = this.userService.findAll();
    console.log('CreateCatDto:', createCatDto);
    return 'This action adds a new cat';
  }

  async findAll(user: { id: number; email: string }) {
    try {
      console.log('当前用户:', user); // 输出当前登录用户信息
      // 示例：调用 UserService 的方法
      const users = this.userService.findAll();
      const message = this.configService.get<string>('PORT'); // 从配置服务中获取 PORT 的值
      const DATABASE_URL = this.configService.get<string>('DATABASE_URL'); // 从配置服务中获取 DATABASE_URL 的值
      const xyz_shared_key_123 =
        this.configService.get<string>('xyz_shared_key_123'); // 从配置服务中获取 xyz_shared_key_123 的值
      // 查找user表的所有数据
      const result = await this.primas.user.findMany();
      return {
        data: {
          msg: `This action returns all cats`,
          currentUser: user,
          users,
          message,
          DATABASE_URL,
          xyz_shared_key_123,
          result,
        },
      };
    } catch (error) {
      // 处理错误，例如记录日志或返回默认值
      console.error('Error in findAll:', error);
      throw error; // 或者 return { data: null, error: 'Failed to fetch cats' };
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} cat`;
  }

  async update(id: number, updateCatDto: UpdateCatDto) {
    const key = `updateCatDto:${id}`;
    // / 1. 先查缓存，命中直接返回
    const cached = await this.cacheManager.get<UpdateCatDto>(key);
    if (cached) return cached;
    await this.cacheManager.set(
      key,
      `This action updates a #${id} cat`,
      30 * 1000,
    ); // 设置缓存，30 秒过期
    return `This action updates a #${id} cat`;
  }

  remove(id: number) {
    return `This action removes a #${id} cat`;
  }
}
