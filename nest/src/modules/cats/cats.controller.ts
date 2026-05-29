import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseFilters,
  UseInterceptors,
  UseGuards,
  Version,
} from '@nestjs/common';
import { CatsService } from './cats.service';
import { CreateCatDto } from './dto/create-cat.dto';
import { UpdateCatDto } from './dto/update-cat.dto';
import { localErrorFilter } from 'src/exception/error-exception.filter';
import { LocalExceptionFilter } from 'src/exception/exception.filter';
import {
  CacheInterceptor, // 拦截 GET 请求，命中走缓存
  CacheKey, // 自定义缓存 key（不写则用 URL）
  CacheTTL, // 单独设置 ttl，毫秒
} from '@nestjs/cache-manager';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
// 局部过滤器
@UseFilters(localErrorFilter) //
// 或者 这两种写法都行 推荐用@UseFilters(localErrorFilter)
// @UseFilters(new localErrorFilter())
@Public()
// 局部拦截器
@UseInterceptors(LocalExceptionFilter) // 这里可以放局部拦截器，例如 @UseInterceptors(LocalInterceptor)，如果没有局部拦截器，可以直接写 @UseInterceptors() 或者干脆不写
// 缓存拦截器：命中走缓存，未命中走服务层
// @UseInterceptors(CacheInterceptor)
@Controller('cats')
@UseGuards(JwtAuthGuard)
export class CatsController {
  constructor(private readonly catsService: CatsService) {}

  @Post()
  create(@Body() createCatDto: CreateCatDto) {
    return this.catsService.create(createCatDto);
  }
  // 自定义缓存 key（不写则用 URL）
  @CacheKey('cats')
  // 单独设置 ttl，毫秒
  @CacheTTL(60 * 1000)
  @Get()
  @Version('2')
  findAll(@CurrentUser() user: { id: number; email: string }) {
    // user 就是 JWT 解析出来的当前登录用户 { id, email }
    return this.catsService.findAll(user);
  }

  @CacheKey('catId') // 这里的 key 是全局的，和 URL 无关；如果不写 @CacheKey，则默认用 URL 作为 key
  @CacheTTL(60 * 1000)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.catsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCatDto: UpdateCatDto) {
    return this.catsService.update(+id, updateCatDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.catsService.remove(+id);
  }
}
