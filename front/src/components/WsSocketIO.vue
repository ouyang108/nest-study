<script setup lang="ts">
// Socket.IO 实现组件
// 依赖 socket.io-client，使用前请先执行：npm install socket.io-client
import { ref, onBeforeUnmount } from 'vue'
import { io, type Socket } from 'socket.io-client'

// Socket.IO 服务器地址，与原生 WS 不同，这里使用 http/https 协议
const wsUrl = ref('http://localhost:4000')

// 命名空间（namespace），不填默认为 "/"，可根据后端约定填写如 "/chat"
const namespace = ref('')

// 监听事件名（接收服务端消息时使用的事件名），可根据后端约定修改
const listenEvent = ref('message')

// 发送事件名（向服务端发送消息时使用的事件名），可根据后端约定修改
const emitEvent = ref('createChat')

// Socket.IO 客户端实例
let socket: Socket | null = null

// 连接状态：disconnected（未连接）、connecting（连接中）、connected（已连接）
const connectionStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')

// 消息列表，包含发送、接收、系统三种类型
const messages = ref<{ type: 'send' | 'receive' | 'system'; content: string; time: string }[]>([])

// 输入框内容（待发送的消息）
const inputMessage = ref('')

/**
 * 获取当前时间字符串，格式 HH:mm:ss
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

/**
 * 建立 Socket.IO 连接
 */
const connectSocket = () => {
  // 校验地址不为空
  if (!wsUrl.value) {
    addMessage('system', '请先填写有效的服务器地址！')
    return
  }

  // 已经连接则不再重复连接
  if (socket && socket.connected) {
    addMessage('system', '已存在连接，无需重复连接')
    return
  }

  try {
    connectionStatus.value = 'connecting'
    // 拼接最终地址（含命名空间）
    const fullUrl = namespace.value ? `${wsUrl.value}${namespace.value}` : wsUrl.value
    addMessage('system', `正在连接到 ${fullUrl} ...`)

    // 创建 Socket.IO 客户端
    // 配置说明：
    // - reconnection: true 自动开启重连
    // - reconnectionAttempts: 最大重连次数
    // - reconnectionDelay: 每次重连前等待毫秒数
    // - transports: 传输方式，默认会先尝试 polling，再升级到 websocket
    socket = io(fullUrl, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
      transports: ['websocket'], // 仅使用 websocket 传输
    })

    // 连接成功事件
    socket.on('connect', () => {
      connectionStatus.value = 'connected'
      addMessage('system', `Socket.IO 连接成功！socket id = ${socket?.id}`)
    })

    // 连接错误事件
    socket.on('connect_error', (error: Error) => {
      connectionStatus.value = 'disconnected'
      addMessage('system', `连接错误: ${error.message}`)
    })

    // 断开连接事件
    socket.on('disconnect', (reason: string) => {
      connectionStatus.value = 'disconnected'
      addMessage('system', `连接已断开，原因: ${reason}`)
    })

    // 重连尝试事件
    socket.io.on('reconnect_attempt', (attempt: number) => {
      connectionStatus.value = 'connecting'
      addMessage('system', `正在尝试第 ${attempt} 次重连...`)
    })

    // 重连成功事件
    socket.io.on('reconnect', (attempt: number) => {
      addMessage('system', `第 ${attempt} 次重连成功`)
    })

    // 重连失败事件（达到最大次数后）
    socket.io.on('reconnect_failed', () => {
      addMessage('system', '已达到最大重连次数，停止重连')
    })

    // 监听服务端推送的业务消息
    socket.on(listenEvent.value, (data: unknown) => {
      // 接收到的数据可能是对象、字符串等，这里统一转字符串展示
      const content = typeof data === 'string' ? data : JSON.stringify(data)
      addMessage('receive', content)
    })
  } catch (err) {
    connectionStatus.value = 'disconnected'
    addMessage('system', `创建 Socket.IO 客户端失败: ${err}`)
  }
}

/**
 * 主动断开 Socket.IO 连接
 */
const disconnectSocket = () => {
  if (socket) {
    // disconnect 会主动断开，并且不会触发自动重连
    socket.disconnect()
    // 移除所有监听，防止内存泄漏
    socket.removeAllListeners()
    socket = null
  }
  connectionStatus.value = 'disconnected'
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
  // 校验连接状态
  if (!socket || !socket.connected) {
    addMessage('system', '尚未连接，请先建立连接')
    return
  }
  // 通过指定事件名发送数据
  // Socket.IO 支持直接发送对象，底层会自动序列化
  socket.emit(emitEvent.value, { content: inputMessage.value })
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
  disconnectSocket()
})
</script>

<template>
  <div class="ws-container">
    <h2>Socket.IO 测试</h2>

    <!-- 连接配置区 -->
    <div class="config-area">
      <label>服务器地址：</label>
      <input
        v-model="wsUrl"
        type="text"
        placeholder="请输入 Socket.IO 服务器地址，例如 http://localhost:4000"
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

    <!-- 命名空间与事件名配置 -->
    <div class="config-area">
      <label>命名空间：</label>
      <input
        v-model="namespace"
        type="text"
        placeholder="可选，例如 /chat"
        :disabled="connectionStatus !== 'disconnected'"
      />
      <label>监听事件：</label>
      <input
        v-model="listenEvent"
        type="text"
        placeholder="接收事件名"
        :disabled="connectionStatus !== 'disconnected'"
      />
      <label>发送事件：</label>
      <input
        v-model="emitEvent"
        type="text"
        placeholder="发送事件名"
        :disabled="connectionStatus !== 'disconnected'"
      />
    </div>

    <!-- 操作按钮区 -->
    <div class="button-area">
      <button :disabled="connectionStatus !== 'disconnected'" @click="connectSocket">连接</button>
      <button :disabled="connectionStatus === 'disconnected'" @click="disconnectSocket">
        断开
      </button>
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
    flex-wrap: wrap;

    label {
      white-space: nowrap;
      font-weight: bold;
    }

    input {
      flex: 1;
      min-width: 120px;
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

  // 按钮区样式（使用紫色区分 Socket.IO 组件）
  .button-area {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;

    button {
      padding: 8px 20px;
      border: none;
      border-radius: 4px;
      background-color: #722ed1;
      color: #fff;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s;

      &:hover:not(:disabled) {
        background-color: #9254de;
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

      &.send {
        background-color: #f9f0ff;
        .type-tag {
          background-color: #722ed1;
        }
      }
      &.receive {
        background-color: #f6ffed;
        .type-tag {
          background-color: #52c41a;
        }
      }
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
