import { Body, Controller, MessageEvent, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { SseService } from './sse.service';

@Controller('sse')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  /**
   * SSE 端点：GET /sse/tick
   * 关键点：
   *   1. 用 @Sse() 装饰器替代 @Get()，Nest 会自动设置 Content-Type: text/event-stream
   *   2. 返回值必须是 Observable<MessageEvent>，Nest 会订阅它并把每条消息按 SSE 协议格式化输出
   *   3. 客户端断开连接时，Observable 会自动 unsubscribe，无需手动清理
   */
  @Sse('tick')
  tick(): Observable<MessageEvent> {
    return this.sseService.getTickStream();
  }
}
