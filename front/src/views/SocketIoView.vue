<script setup lang="ts">
// 导入 Vue 相关的 API
import { ref, computed, onBeforeUnmount } from 'vue'
// 导入 socket.io-client（使用前请先安装：pnpm add socket.io-client）
import { io, Socket } from 'socket.io-client'

// ==================== 服务器地址 ====================
// Socket.IO 服务器地址（一般是 http:// 或 https://，socket.io 内部会升级到 WebSocket）
const socketIoUrl = ref('http://localhost:4000')
// Socket.IO 的命名空间（namespace），可以为空字符串
const socketIoNamespace = ref('/chatio')

// 当前完整地址，仅用于 UI 显示
const fullUrl = computed(() => socketIoUrl.value + socketIoNamespace.value)

// ==================== 连接实例 ====================
// Socket.IO 实例（用 let 是因为断开后需要重新赋值）
let socket: Socket | null = null

// ==================== 状态相关 ====================
// 连接状态：disconnected（未连接）、connecting（连接中）、connected（已连接）
const connectionStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')

// 接收到的消息列表
const messages = ref<{ type: 'send' | 'receive' | 'system'; content: string; time: string }[]>([])

// 输入框内容（待发送的消息）
const inputMessage = ref('')

// Socket.IO 发送时使用的事件名（服务端 @SubscribeMessage('xxx') 监听的事件名）
const sendEventName = ref('createChatio')
// Socket.IO 监听服务端推送时使用的事件名
const receiveEventName = ref('chatioMessage')

// 最大重连次数（Socket.IO 自带重连，这里仅做配置）
const MAX_RECONNECT = 5

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

// ==================== 连接管理 ====================
/**
 * 建立 Socket.IO 连接
 */
const connect = () => {
  // 校验地址
  if (!socketIoUrl.value) {
    addMessage('system', '请先填写有效的 Socket.IO 地址！')
    return
  }

  // 如果已经连接，则不再重复连接（避免句柄泄漏）
  if (socket && socket.connected) {
    addMessage('system', '已存在连接，无需重复连接')
    return
  }

  try {
    connectionStatus.value = 'connecting'
    addMessage('system', `[Socket.IO] 正在连接到 ${fullUrl.value} ...`)

    // 创建 socket.io 实例
    socket = io(fullUrl.value, {
      // 强制使用 WebSocket，不走 long-polling，握手更快
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT,
      reconnectionDelay: 3000,
      timeout: 10000,
    })

    // 连接成功事件
    socket.on('connect', () => {
      connectionStatus.value = 'connected'
      addMessage('system', `[Socket.IO] 连接成功！socket.id = ${socket?.id}`)
    })

    // 监听服务端推送的消息（事件名由 receiveEventName 控制）
    socket.on(receiveEventName.value, (data: unknown) => {
      // data 可能是任意类型，这里统一转字符串显示
      const content = typeof data === 'string' ? data : JSON.stringify(data)
      addMessage('receive', content)
    })

    // 连接断开事件
    socket.on('disconnect', (reason: string) => {
      connectionStatus.value = 'disconnected'
      addMessage('system', `[Socket.IO] 连接已断开，原因: ${reason}`)
    })

    // 连接错误事件（如服务端拒绝、握手失败）
    socket.on('connect_error', (err: Error) => {
      connectionStatus.value = 'disconnected'
      addMessage('system', `[Socket.IO] 连接错误: ${err.message}`)
    })

    // 重连尝试事件
    socket.io.on('reconnect_attempt', (attempt: number) => {
      addMessage('system', `[Socket.IO] 正在进行第 ${attempt} 次重连...`)
    })

    // 重连成功事件
    socket.io.on('reconnect', (attempt: number) => {
      addMessage('system', `[Socket.IO] 第 ${attempt} 次重连成功`)
    })

    // 重连失败事件（达到最大次数后触发）
    socket.io.on('reconnect_failed', () => {
      addMessage('system', '[Socket.IO] 重连失败，已达最大次数')
    })
  } catch (err) {
    connectionStatus.value = 'disconnected'
    addMessage('system', `[Socket.IO] 创建失败: ${err}`)
  }
}

/**
 * 关闭 Socket.IO 连接
 */
const disconnect = () => {
  if (socket) {
    // 移除所有监听，避免下次连接时事件被重复绑定
    socket.removeAllListeners()
    // 主动断开
    socket.disconnect()
    socket = null
  }
  connectionStatus.value = 'disconnected'
}

/**
 * 通过 Socket.IO 发送消息
 */
const sendMessage = () => {
  // 校验消息内容不为空
  if (!inputMessage.value.trim()) {
    addMessage('system', '消息不能为空')
    return
  }
  if (!socket || !socket.connected) {
    addMessage('system', '[Socket.IO] 尚未连接，请先建立连接')
    return
  }
  // 使用 emit(事件名, 数据) 向服务端推送消息
  // 服务端需要 @SubscribeMessage(sendEventName) 才能收到
  socket.emit(sendEventName.value, { content: inputMessage.value })
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
    <h2>Socket.IO 测试页面</h2>

    <!-- 连接配置区 -->
    <div class="config-area">
      <label>服务地址：</label>
      <input
        v-model="socketIoUrl"
        type="text"
        placeholder="例如 http://localhost:4000"
        :disabled="connectionStatus !== 'disconnected'"
      />
      <label>命名空间：</label>
      <input
        v-model="socketIoNamespace"
        type="text"
        placeholder="例如 /chat（可空）"
        :disabled="connectionStatus !== 'disconnected'"
        style="max-width: 150px"
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

    <!-- Socket.IO 事件名配置 -->
    <div class="config-area">
      <label>发送事件名：</label>
      <input
        v-model="sendEventName"
        type="text"
        placeholder="emit 的事件名，例如 createChat"
        :disabled="connectionStatus !== 'disconnected'"
      />
      <label>接收事件名：</label>
      <input
        v-model="receiveEventName"
        type="text"
        placeholder="监听的事件名，例如 message"
        :disabled="connectionStatus !== 'disconnected'"
      />
    </div>

    <!-- 当前完整地址提示 -->
    <div class="url-tip">
      当前连接地址：<code>{{ fullUrl }}</code>
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
