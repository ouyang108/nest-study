import { Injectable, MessageEvent } from '@nestjs/common';
import { interval, map, Observable, Subject } from 'rxjs';

@Injectable()
export class SseService {
  // 用 Subject 作为「广播总线」：业务层 emit() 后，所有订阅的 SSE 客户端都能收到
  // 之所以不用普通 EventEmitter，是因为 RxJS Subject 天然能转成 Observable 给 @Sse() 用
  private readonly stream$ = new Subject<MessageEvent>();

  /**
   * 定时推送（演示用）
   * 每 1 秒推一条带递增序号的消息
   */
  getTickStream(): Observable<MessageEvent> {
    return interval(1000).pipe(
      // 把 interval 发出的数字 0,1,2... 包装成 SSE 规范要求的 MessageEvent 结构
      map((n) => ({
        // data 必须是字符串或可序列化对象，Nest 会自动 JSON.stringify
        data: { count: n, time: new Date().toISOString() },
        // type 对应前端 EventSource 的 addEventListener(type, ...) 事件名，可选
        type: 'tick',
        // id 用于断线重连时通过 Last-Event-ID 头恢复，可选
        id: String(n),
      })),
    );
  }

  /**
   * 广播模式：返回内部 Subject 的 Observable 视图
   * 控制器订阅它，其他业务通过 push() 推送消息
   */
  getBroadcastStream(): Observable<MessageEvent> {
    return this.stream$.asObservable();
  }

  /**
   * 外部调用此方法向所有 SSE 客户端推送消息
   * 例如：订单状态变化、聊天消息到达等场景
   */
  push(data: unknown, type = 'message') {
    this.stream$.next({ data, type } as MessageEvent);
  }
}
