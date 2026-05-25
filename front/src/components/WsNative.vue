<script setup lang="ts">
// 原生 WebSocket 实现组件
// 使用浏览器内置的 WebSocket API，无需任何依赖
import { ref, onBeforeUnmount } from 'vue'

// WebSocket 服务器地址（用户可在输入框修改）
const wsUrl = ref('ws://localhost:4000/ws/chat')

// WebSocket 实例（不需要响应式，使用普通变量即可）
let ws: WebSocket | null = null

// 连接状态：disconnected（未连接）、connecting（连接中）、connected（已连接）
const connectionStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')

// 消息列表，包含发送、接收、系统三种类型
const messages = ref<{ type: 'send' | 'receive' | 'system'; content: string; time: string }[]>([])

// 输入框内容（待发送的消息）
const inputMessage = ref('')

// 重连定时器引用
let reconnectTimer: number | null = null

// 当前已经重连的次数
const reconnectCount = ref(0)

// 最大允许的重连次数
const MAX_RECONNECT = 5

// 心跳定时器引用
let heartbeatTimer: number | null = null

// 心跳间隔（单位：毫秒），即每 30 秒发送一次心跳包
const HEARTBEAT_INTERVAL = 30000

/**
 * 获取当前时间字符串，格式 HH:mm:ss，用于消息时间戳显示
 */
const getTime = (): string => {
  const now = new Date()
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
}

/**
 * 添加一条消息到消息列表
 * @param type 消息类型：发送 / 接收 / 系统
 * @param content 消息内容
 */
const addMessage = (type: 'send' | 'receive' | 'system', content: string) => {
  messages.value.push({ type, content, time: getTime() })
}

/**
 * 启动心跳，定时向服务器发送 ping 数据保持连接活跃
 */
const startHeartbeat = () => {
  // 启动前先清除可能存在的旧定时器，防止重复
  stopHeartbeat()
  heartbeatTimer = window.setInterval(() => {
    // 必须在连接处于 OPEN 状态时才发送
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }))
    }
  }, HEARTBEAT_INTERVAL)
}

/**
 * 停止心跳定时器
 */
const stopHeartbeat = () => {
  if (heartbeatTimer !== null) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

/**
 * 建立 WebSocket 连接
 */
const connectWs = () => {
  // 校验地址不为空
  if (!wsUrl.value) {
    addMessage('system', '请先填写有效的 WebSocket 地址！')
    return
  }

  // 如果已经连接或者正在连接，则不再重复连接
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    addMessage('system', '已存在连接，无需重复连接')
    return
  }

  try {
    connectionStatus.value = 'connecting'
    addMessage('system', `正在连接到 ${wsUrl.value} ...`)

    // 创建原生 WebSocket 实例
    ws = new WebSocket(wsUrl.value)

    // 连接成功回调
    ws.onopen = () => {
      connectionStatus.value = 'connected'
      reconnectCount.value = 0 // 连接成功后重置重连计数
      addMessage('system', 'WebSocket 连接成功！')
      startHeartbeat() // 启动心跳保活
    }

    // 接收服务端消息回调
    ws.onmessage = (event: MessageEvent) => {
      addMessage('receive', event.data)
    }

    // 连接关闭回调
    ws.onclose = (event: CloseEvent) => {
      connectionStatus.value = 'disconnected'
      stopHeartbeat() // 停止心跳
      addMessage('system', `连接已关闭，code=${event.code}, reason=${event.reason || '无'}`)

      // 自动重连机制：未达到最大次数时定时重连
      if (reconnectCount.value < MAX_RECONNECT) {
        reconnectCount.value++
        addMessage('system', `3 秒后开始第 ${reconnectCount.value} 次重连...`)
        reconnectTimer = window.setTimeout(() => {
          connectWs()
        }, 3000)
      } else {
        addMessage('system', '已达到最大重连次数，停止重连')
      }
    }

    // 连接错误回调
    ws.onerror = (error: Event) => {
      connectionStatus.value = 'disconnected'
      addMessage('system', `连接发生错误: ${error}`)
    }
  } catch (err) {
    connectionStatus.value = 'disconnected'
    addMessage('system', `创建 WebSocket 失败: ${err}`)
  }
}

/**
 * 主动断开 WebSocket 连接
 */
const disconnectWs = () => {
  // 清除重连定时器，防止断开后又自动重连
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  // 将重连计数推到最大，避免 onclose 中又触发重连
  reconnectCount.value = MAX_RECONNECT
  // 关闭连接
  if (ws) {
    ws.close()
    ws = null
  }
  stopHeartbeat()
}

/**
 * 发送消息
 */
const sendMessage = () => {
  // 校验内容不为空
  if (!inputMessage.value.trim()) {
    addMessage('system', '消息不能为空')
    return
  }
  // 校验连接状态必须为已打开
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    addMessage('system', '尚未连接，请先建立连接')
    return
  }
  // 通过 WebSocket 发送（这里发送的是 JSON 字符串，便于和后端约定格式）
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

// 组件卸载前关闭连接，避免内存泄漏
onBeforeUnmount(() => {
  disconnectWs()
})
</script>

<template>
  <div class="ws-container">
    <h2>原生 WebSocket 测试</h2>

    <!-- 连接配置区 -->
    <div class="config-area">
      <label>WebSocket 地址：</label>
      <input
        v-model="wsUrl"
        type="text"
        placeholder="请输入 WebSocket 地址，例如 ws://localhost:8080"
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

    <!-- 操作按钮区 -->
    <div class="button-area">
      <button :disabled="connectionStatus !== 'disconnected'" @click="connectWs">连接</button>
      <button :disabled="connectionStatus === 'disconnected'" @click="disconnectWs">断开</button>
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
// 容器整体样式
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

    label {
      white-space: nowrap;
      font-weight: bold;
    }

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

    // 连接状态文字颜色
    .status {
      white-space: nowrap;
      font-size: 14px;
      font-weight: bold;

      &.connected {
        color: #52c41a; // 绿色：已连接
      }
      &.connecting {
        color: #faad14; // 橙色：连接中
      }
      &.disconnected {
        color: #ff4d4f; // 红色：未连接
      }
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
