<script setup lang="ts">
// 导入 Vue 相关的 API
import { ref, onBeforeUnmount } from 'vue'

// ==================== 服务器地址 ====================
// 原生 WebSocket 服务器地址（一般以 ws:// 或 wss:// 开头）
const nativeWsUrl = ref('ws://localhost:4000/ws/chat')

// ==================== 连接实例 ====================
// 原生 WebSocket 实例（用 let 是因为重连时需要重新赋值）
let ws: WebSocket | null = null

// ==================== 状态相关 ====================
// 连接状态：disconnected（未连接）、connecting（连接中）、connected（已连接）
const connectionStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')

// 接收到的消息列表
const messages = ref<{ type: 'send' | 'receive' | 'system'; content: string; time: string }[]>([])

// 输入框内容（待发送的消息）
const inputMessage = ref('')

// 重连定时器（原生 WebSocket 没有内置重连，需要手动实现）
let reconnectTimer: number | null = null
// 当前已重连次数
const reconnectCount = ref(0)
// 最大重连次数，超过则放弃
const MAX_RECONNECT = 5

// 心跳定时器（防止中间代理因为长时间无数据而切断连接）
let heartbeatTimer: number | null = null
// 心跳间隔（单位：毫秒）
const HEARTBEAT_INTERVAL = 30000

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
const addMessage = (type: 'send' | 'receive' | 'system', content: string) => {
  messages.value.push({ type, content, time: getTime() })
}

// ==================== 心跳 ====================
/**
 * 启动心跳，定时向服务器发送 ping
 * 原生 WebSocket 协议虽然定义了 ping/pong 帧，但浏览器 API 不暴露，
 * 所以这里用业务层的 JSON 心跳代替
 */
const startHeartbeat = () => {
  // 先清除可能存在的旧定时器，避免叠加
  stopHeartbeat()
  heartbeatTimer = window.setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }))
    }
  }, HEARTBEAT_INTERVAL)
}

/**
 * 停止心跳
 */
const stopHeartbeat = () => {
  if (heartbeatTimer !== null) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

// ==================== 连接管理 ====================
/**
 * 建立原生 WebSocket 连接
 */
const connect = () => {
  // 校验地址
  if (!nativeWsUrl.value) {
    addMessage('system', '请先填写有效的 WebSocket 地址！')
    return
  }

  // 如果已经连接或者正在连接，则不再重复连接（避免句柄泄漏）
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    addMessage('system', '已存在连接，无需重复连接')
    return
  }

  try {
    connectionStatus.value = 'connecting'
    addMessage('system', `[原生 WS] 正在连接到 ${nativeWsUrl.value} ...`)

    // 创建 WebSocket 实例
    ws = new WebSocket(nativeWsUrl.value)

    // 连接成功的回调
    ws.onopen = () => {
      connectionStatus.value = 'connected'
      reconnectCount.value = 0 // 连接成功后重置重连计数
      addMessage('system', '[原生 WS] 连接成功！')
      startHeartbeat()
    }

    // 接收消息的回调
    ws.onmessage = (event: MessageEvent) => {
      addMessage('receive', event.data)
    }

    // 连接关闭的回调
    ws.onclose = (event: CloseEvent) => {
      connectionStatus.value = 'disconnected'
      stopHeartbeat()
      addMessage(
        'system',
        `[原生 WS] 连接已关闭，code=${event.code}, reason=${event.reason || '无'}`,
      )

      // 自动重连：仅在未达到最大次数时触发
      // 注意：手动 disconnect 时会先把 reconnectCount 置为 MAX，避免重连
      if (reconnectCount.value < MAX_RECONNECT) {
        reconnectCount.value++
        addMessage('system', `[原生 WS] 3 秒后开始第 ${reconnectCount.value} 次重连...`)
        reconnectTimer = window.setTimeout(() => {
          connect()
        }, 3000)
      } else {
        addMessage('system', '[原生 WS] 已达到最大重连次数，停止重连')
      }
    }

    // 连接错误的回调
    ws.onerror = (error: Event) => {
      connectionStatus.value = 'disconnected'
      addMessage('system', `[原生 WS] 连接发生错误: ${error}`)
    }
  } catch (err) {
    connectionStatus.value = 'disconnected'
    addMessage('system', `[原生 WS] 创建失败: ${err}`)
  }
}

/**
 * 关闭原生 WebSocket 连接
 */
const disconnect = () => {
  // 清除重连定时器
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  // 把重连次数撑满，防止 onclose 又触发重连
  reconnectCount.value = MAX_RECONNECT
  // 关闭连接
  if (ws) {
    ws.close()
    ws = null
  }
  stopHeartbeat()
  connectionStatus.value = 'disconnected'
}

/**
 * 通过原生 WebSocket 发送消息
 */
const sendMessage = () => {
  // 校验消息内容不为空
  if (!inputMessage.value.trim()) {
    addMessage('system', '消息不能为空')
    return
  }
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    addMessage('system', '[原生 WS] 尚未连接，请先建立连接')
    return
  }
  // 按照后端约定的格式发送，可根据实际接口修改
  ws.send(JSON.stringify({ event: 'createChat', data: { content: inputMessage.value } }))
  addMessage('send', inputMessage.value)
  // 清空输入框
  inputMessage.value = ''
}

/**
 * 清空消息记录
 */
const clearMessages = () => {
  messages.value = []
}

// 组件卸载前确保连接关闭，避免路由切换后还在后台跑（内存泄漏）
onBeforeUnmount(() => {
  disconnect()
})
</script>

<template>
  <div class="ws-container">
    <h2>原生 WebSocket 测试页面</h2>

    <!-- 连接配置区 -->
    <div class="config-area">
      <label>WS 地址：</label>
      <input
        v-model="nativeWsUrl"
        type="text"
        placeholder="例如 ws://localhost:4000/ws/chat"
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

    <!-- 当前完整地址提示 -->
    <div class="url-tip">
      当前连接地址：<code>{{ nativeWsUrl }}</code>
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
        <span class="type-tag">
          {{ msg.type === 'send' ? '发送' : msg.type === 'receive' ? '接收' : '系统' }}
        </span>
        <span class="content">{{ msg.content }}</span>
      </div>
      <div v-if="messages.length === 0" class="empty-tip">暂无消息</div>
    </div>

    <!-- 消息发送区 -->
    <div class="send-area">
      <input
        v-model="inputMessage"
        type="text"
        placeholder="请输入要发送的消息"
        :disabled="connectionStatus !== 'connected'"
        @keyup.enter="sendMessage"
      />
      <button :disabled="connectionStatus !== 'connected'" @click="sendMessage">发送</button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ws-container {
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

    input {
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

    code {
      background-color: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      color: #d63384;
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
    height: 400px;
    overflow-y: auto;
    padding: 10px;
    border: 1px solid #e8e8e8;
    border-radius: 4px;
    background-color: #fafafa;
    margin-bottom: 15px;

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

      // 发送消息样式
      &.send {
        background-color: #e6f7ff;
        .type-tag {
          background-color: #1890ff;
        }
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

  // 发送区样式
  .send-area {
    display: flex;
    gap: 10px;

    input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;

      &:disabled {
        background-color: #f5f5f5;
        cursor: not-allowed;
      }
    }

    button {
      padding: 8px 20px;
      border: none;
      border-radius: 4px;
      background-color: #52c41a;
      color: #fff;
      cursor: pointer;
      font-size: 14px;

      &:hover:not(:disabled) {
        background-color: #73d13d;
      }
      &:disabled {
        background-color: #ccc;
        cursor: not-allowed;
      }
    }
  }
}
</style>
