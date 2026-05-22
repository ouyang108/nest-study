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
} from '@nestjs/common';
import { CatsService } from './cats.service';
import { CreateCatDto } from './dto/create-cat.dto';
import { UpdateCatDto } from './dto/update-cat.dto';
import { localErrorFilter } from 'src/exception/error-exception.filter';
import { LocalExceptionFilter } from 'src/exception/exception.filter';
// 局部过滤器
@UseFilters(localErrorFilter) //
// 或者 这两种写法都行 推荐用@UseFilters(localErrorFilter)
// @UseFilters(new localErrorFilter())

// 局部拦截器
@UseInterceptors(LocalExceptionFilter) // 这里可以放局部拦截器，例如 @UseInterceptors(LocalInterceptor)，如果没有局部拦截器，可以直接写 @UseInterceptors() 或者干脆不写
@Controller('cats')
export class CatsController {
  constructor(private readonly catsService: CatsService) {}

  @Post()
  create(@Body() createCatDto: CreateCatDto) {
    return this.catsService.create(createCatDto);
  }

  @Get()
  findAll() {
    return this.catsService.findAll();
  }

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
