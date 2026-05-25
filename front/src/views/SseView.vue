<script setup lang="ts">
// 导入 Vue 相关的 API
import { ref, onBeforeUnmount } from 'vue'

// ==================== 服务器地址 ====================
// SSE 服务地址，默认指向 Nest 后端 /sse
// SSE 走的就是 HTTP（text/event-stream），所以是 http:// 而不是 ws://
const sseUrl = ref('http://localhost:4000/sse/tick')

// 是否携带跨域 Cookie（withCredentials）
// 默认 false：跨域 SSE 不带 cookie；后端要求登录态时打开
const withCredentials = ref(false)

// 自定义命名事件名（用逗号分隔，例如 "message,ping,custom"）
// SSE 协议除了默认 message 事件外，可以通过 `event: xxx` 字段推送命名事件
// 留空表示只监听默认 message 事件
const customEventNames = ref('')

// ==================== 连接实例 ====================
// EventSource 实例（用 let 是因为断开后需要重新赋值）
// 注意：EventSource 是浏览器原生 API，不需要任何额外依赖
let eventSource: EventSource | null = null

// 用于在 disconnect 时移除监听，避免内存泄漏
// EventSource 的 addEventListener 必须用相同的引用才能 removeEventListener
const customListeners: Map<string, (e: MessageEvent) => void> = new Map()

// ==================== 状态相关 ====================
// 连接状态：disconnected（未连接）、connecting（连接中）、connected（已连接）
const connectionStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')

// 接收到的消息列表
const messages = ref<
  {
    type: 'receive' | 'system'
    event: string
    content: string
    lastEventId: string
    time: string
  }[]
>([])

// 最近一次收到的 lastEventId
// SSE 协议会自动在重连时通过 Last-Event-ID 请求头把上一次的 id 带回去，便于服务端补发
const lastEventId = ref('')

// ==================== 工具方法 ====================
/**
 * 获取当前时间字符串，用于消息时间戳显示
 * 用 padStart 保证两位数显示，避免视觉抖动
 */
const getTime = (): string => {
  const now = new Date()
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
}

/**
 * 添加一条消息到消息列表
 */
const addMessage = (type: 'receive' | 'system', content: string, event = '', eventId = '') => {
  messages.value.push({ type, event, content, lastEventId: eventId, time: getTime() })
}

/**
 * 把 readyState 数值翻译成可读文本，方便日志
 * 0: CONNECTING, 1: OPEN, 2: CLOSED
 */
const readyStateText = (state: number): string => {
  return ['CONNECTING', 'OPEN', 'CLOSED'][state] ?? `UNKNOWN(${state})`
}

// ==================== 连接管理 ====================
/**
 * 建立 SSE 连接
 */
const connect = () => {
  // 校验地址
  if (!sseUrl.value) {
    addMessage('system', '请先填写有效的 SSE 地址！')
    return
  }

  // 如果已经连接或正在连接，不重复创建（EventSource 自带重连，但手动重复建会泄漏旧句柄）
  if (eventSource && eventSource.readyState !== EventSource.CLOSED) {
    addMessage('system', '已存在连接，无需重复连接')
    return
  }

  try {
    connectionStatus.value = 'connecting'
    addMessage('system', `[SSE] 正在连接到 ${sseUrl.value} ...`)

    // 创建 EventSource 实例
    // 第二个参数 withCredentials 决定跨域时是否带 cookie，默认 false
    eventSource = new EventSource(sseUrl.value, { withCredentials: withCredentials.value })

    // 连接成功事件
    // WHY: EventSource 在断线后会自动重连，每次成功打开都会触发 onopen
    eventSource.onopen = () => {
      connectionStatus.value = 'connected'
      addMessage('system', `[SSE] 连接成功！readyState=${readyStateText(eventSource!.readyState)}`)
    }

    // 监听默认 message 事件
    // SSE 协议中没有 `event:` 字段的消息会落到这里
    eventSource.onmessage = (event: MessageEvent) => {
      lastEventId.value = event.lastEventId
      addMessage('receive', event.data, 'message', event.lastEventId)
    }

    // 连接错误事件
    // WHY: EventSource 在网络异常时会自动尝试重连，readyState 会变为 CONNECTING
    // 我们只需要把状态反馈给 UI，不需要手动 close（除非确实要放弃）
    eventSource.onerror = (event: Event) => {
      if (eventSource?.readyState === EventSource.CONNECTING) {
        connectionStatus.value = 'connecting'
        addMessage('system', '[SSE] 连接异常，浏览器正在自动重连...')
      } else if (eventSource?.readyState === EventSource.CLOSED) {
        connectionStatus.value = 'disconnected'
        addMessage('system', '[SSE] 连接已关闭')
      } else {
        addMessage('system', `[SSE] onerror 触发: ${JSON.stringify(event)}`)
      }
    }

    // 监听自定义命名事件
    // SSE 协议用 `event: xxx\ndata: yyy\n\n` 推送命名事件，必须通过 addEventListener 监听
    // 这里把用户填的事件名（逗号分隔）逐个绑定
    const names = customEventNames.value
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
    for (const name of names) {
      // message 事件已经通过 onmessage 处理过，跳过避免重复
      if (name === 'message') continue
      // 保留 listener 引用，disconnect 时才能 removeEventListener
      const listener = (e: MessageEvent) => {
        lastEventId.value = e.lastEventId
        addMessage('receive', e.data, name, e.lastEventId)
      }
      customListeners.set(name, listener)
      eventSource.addEventListener(name, listener as EventListener)
    }
  } catch (err) {
    connectionStatus.value = 'disconnected'
    addMessage('system', `[SSE] 创建失败: ${err}`)
  }
}

/**
 * 关闭 SSE 连接
 */
const disconnect = () => {
  if (eventSource) {
    // 先移除所有自定义事件监听
    for (const [name, listener] of customListeners) {
      eventSource.removeEventListener(name, listener as EventListener)
    }
    customListeners.clear()
    // 关闭连接（关闭后 readyState 永久变为 CLOSED，浏览器不会再自动重连）
    eventSource.close()
    eventSource = null
  }
  connectionStatus.value = 'disconnected'
}

/**
 * 清空消息记录
 */
const clearMessages = () => {
  messages.value = []
  lastEventId.value = ''
}

// 组件卸载前确保连接关闭，避免路由切走后浏览器继续保持连接（内存/带宽泄漏）
onBeforeUnmount(() => {
  disconnect()
})
</script>

<template>
  <div class="sse-container">
    <h2>SSE (Server-Sent Events) 测试页面</h2>

    <!-- 协议说明 -->
    <div class="tip-box">
      <p>
        <strong>SSE 是单向通信</strong>：服务端 → 客户端。客户端只能通过普通 HTTP 接口反向请求。
        浏览器 EventSource 自带断线重连和 Last-Event-ID 机制。
      </p>
    </div>

    <!-- 连接配置区 -->
    <div class="config-area">
      <label>SSE 地址：</label>
      <input
        v-model="sseUrl"
        type="text"
        placeholder="例如 http://localhost:3000/sse"
        :disabled="connectionStatus !== 'disconnected'"
      />

      <!-- 连接状态显示 -->
      <span class="status" :class="connectionStatus">
        {{
          connectionStatus === 'connected'
            ? '● 已连接'
            : connectionStatus === 'connecting'
              ? '● 连接中'
              : '● 未连接'
        }}
      </span>
    </div>

    <!-- 高级配置区 -->
    <div class="config-area">
      <label>命名事件：</label>
      <input
        v-model="customEventNames"
        type="text"
        placeholder="多个用逗号分隔，例如 ping,custom（默认 message 已自动监听）"
        :disabled="connectionStatus !== 'disconnected'"
      />
      <label class="checkbox-label">
        <input
          v-model="withCredentials"
          type="checkbox"
          :disabled="connectionStatus !== 'disconnected'"
        />
        withCredentials
      </label>
    </div>

    <!-- 当前完整地址提示 + Last-Event-ID -->
    <div class="url-tip">
      当前连接地址：<code>{{ sseUrl }}</code>
      <span v-if="lastEventId" class="last-event-id">
        Last-Event-ID: <code>{{ lastEventId }}</code>
      </span>
    </div>

    <!-- 操作按钮区 -->
    <div class="button-area">
      <button :disabled="connectionStatus !== 'disconnected'" @click="connect">连接</button>
      <button :disabled="connectionStatus === 'disconnected'" @click="disconnect">断开</button>
      <button @click="clearMessages">清空消息</button>
    </div>

    <!-- 消息显示区 -->
    <div class="message-area">
      <div v-for="(msg, index) in messages" :key="index" class="message-item" :class="msg.type">
        <span class="time">[{{ msg.time }}]</span>
        <span class="type-tag">{{ msg.type === 'receive' ? '接收' : '系统' }}</span>
        <span v-if="msg.event" class="event-tag">event: {{ msg.event }}</span>
        <span v-if="msg.lastEventId" class="id-tag">id: {{ msg.lastEventId }}</span>
        <span class="content">{{ msg.content }}</span>
      </div>
      <div v-if="messages.length === 0" class="empty-tip">暂无消息</div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.sse-container {
  max-width: 800px;
  margin: 20px auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-family: Arial, sans-serif;

  h2 {
    text-align: center;
    color: #333;
    margin-bottom: 20px;
  }

  // 协议说明样式
  .tip-box {
    margin-bottom: 15px;
    padding: 10px 14px;
    background-color: #f0f9ff;
    border-left: 3px solid #1890ff;
    border-radius: 4px;
    font-size: 13px;
    color: #444;

    p {
      margin: 0;
      line-height: 1.6;
    }
  }

  // 配置区样式
  .config-area {
    display: flex;
    align-items: center;
    margin-bottom: 15px;
    gap: 10px;
    flex-wrap: wrap;

    label {
      white-space: nowrap;
      font-weight: bold;
    }

    // 复选框 label 不加粗，与文字对齐更自然
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 4px;
      font-weight: normal;
      cursor: pointer;
      user-select: none;
    }

    input[type='text'] {
      flex: 1;
      min-width: 180px;
      padding: 8px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;

      &:disabled {
        background-color: #f5f5f5;
        cursor: not-allowed;
      }
    }

    // 连接状态样式
    .status {
      white-space: nowrap;
      font-size: 14px;
      font-weight: bold;

      &.connected {
        color: #52c41a; // 绿色表示已连接
      }
      &.connecting {
        color: #faad14; // 橙色表示连接中
      }
      &.disconnected {
        color: #ff4d4f; // 红色表示未连接
      }
    }
  }

  // 当前地址提示样式
  .url-tip {
    margin-bottom: 15px;
    font-size: 13px;
    color: #666;
    display: flex;
    flex-wrap: wrap;
    gap: 16px;

    code {
      background-color: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      color: #d63384;
    }

    // Last-Event-ID 单独样式，与地址区分
    .last-event-id {
      color: #555;
    }
  }

  // 按钮区样式
  .button-area {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;

    button {
      padding: 8px 20px;
      border: none;
      border-radius: 4px;
      background-color: #1890ff;
      color: #fff;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s;

      &:hover:not(:disabled) {
        background-color: #40a9ff;
      }
      &:disabled {
        background-color: #ccc;
        cursor: not-allowed;
      }
    }
  }

  // 消息显示区样式
  .message-area {
    // SSE 是单向接收，所以消息区比 WS 页面更高，去掉发送区的空间
    height: 480px;
    overflow-y: auto;
    padding: 10px;
    border: 1px solid #e8e8e8;
    border-radius: 4px;
    background-color: #fafafa;

    .message-item {
      padding: 6px 8px;
      margin-bottom: 6px;
      border-radius: 4px;
      font-size: 13px;
      word-break: break-all;

      .time {
        color: #999;
        margin-right: 6px;
      }
      .type-tag {
        display: inline-block;
        padding: 1px 6px;
        margin-right: 6px;
        border-radius: 3px;
        color: #fff;
        font-size: 12px;
      }

      // 事件名小标签（仅 receive 消息有）
      .event-tag {
        display: inline-block;
        padding: 1px 6px;
        margin-right: 6px;
        border-radius: 3px;
        background-color: #722ed1;
        color: #fff;
        font-size: 12px;
      }

      // 事件 id 小标签
      .id-tag {
        display: inline-block;
        padding: 1px 6px;
        margin-right: 6px;
        border-radius: 3px;
        background-color: #eee;
        color: #555;
        font-size: 12px;
      }

      // 接收消息样式
      &.receive {
        background-color: #f6ffed;
        .type-tag {
          background-color: #52c41a;
        }
      }
      // 系统消息样式
      &.system {
        background-color: #fff7e6;
        .type-tag {
          background-color: #faad14;
        }
      }
    }

    .empty-tip {
      text-align: center;
      color: #999;
      padding: 20px;
    }
  }
}
</style>
