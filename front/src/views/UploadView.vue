<script setup lang="ts">
import axios from 'axios'
import { computed, ref } from 'vue'

type UploadStatus = 'ready' | 'uploading' | 'success' | 'error'

interface UploadItem {
  id: string
  file: File
  progress: number
  status: UploadStatus
  message: string
  response: unknown
}

const singleUploadUrl = 'http://localhost:4000/upload/file'
const multipleUploadUrl = 'http://localhost:4000/upload/files'
const allowMultiple = ref(true)
const extraData = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)
const uploadItems = ref<UploadItem[]>([])
const isDragging = ref(false)

const uploadUrl = computed(() => (allowMultiple.value ? multipleUploadUrl : singleUploadUrl))
const fieldName = computed(() => (allowMultiple.value ? 'files' : 'file'))
const hasUploading = computed(() => uploadItems.value.some((item) => item.status === 'uploading'))
const canUpload = computed(
  () =>
    uploadItems.value.some((item) => item.status === 'ready' || item.status === 'error'),
)

const statusText: Record<UploadStatus, string> = {
  ready: '待上传',
  uploading: '上传中',
  success: '上传成功',
  error: '上传失败',
}

const formatSize = (size: number) => {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

const getItemId = (file: File) => `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`

const createUploadItem = (file: File): UploadItem => ({
  id: getItemId(file),
  file,
  progress: 0,
  status: 'ready',
  message: '',
  response: null,
})

const selectFiles = () => {
  fileInputRef.value?.click()
}

const appendFiles = (files: FileList | File[]) => {
  const nextFiles = Array.from(files)
  if (!nextFiles.length) return

  const items = allowMultiple.value ? nextFiles : nextFiles.slice(0, 1)
  uploadItems.value = allowMultiple.value
    ? [...uploadItems.value, ...items.map(createUploadItem)]
    : items.map(createUploadItem)
}

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) appendFiles(target.files)
  target.value = ''
}

const handleDrop = (event: DragEvent) => {
  isDragging.value = false
  if (event.dataTransfer?.files) appendFiles(event.dataTransfer.files)
}

const removeItem = (id: string) => {
  if (hasUploading.value) return
  uploadItems.value = uploadItems.value.filter((item) => item.id !== id)
}

const clearFiles = () => {
  if (hasUploading.value) return
  uploadItems.value = []
}

const appendExtraData = (formData: FormData) => {
  const text = extraData.value.trim()
  if (!text) return

  try {
    const data = JSON.parse(text) as Record<string, unknown>
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value))
      }
    })
  } catch {
    throw new Error('附加参数必须是合法 JSON，例如 {"type":"avatar"}')
  }
}

const uploadOne = async (item: UploadItem) => {
  const formData = new FormData()
  formData.append(fieldName.value, item.file)
  appendExtraData(formData)

  item.status = 'uploading'
  item.progress = 0
  item.message = ''
  item.response = null

  try {
    const response = await axios.post(uploadUrl.value, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (!event.total) return
        item.progress = Math.round((event.loaded / event.total) * 100)
      },
    })

    item.status = 'success'
    item.progress = 100
    item.response = response.data
    item.message = '服务端已返回响应'
  } catch (error) {
    item.status = 'error'
    item.message = error instanceof Error ? error.message : '上传请求失败'
  }
}

const uploadMany = async (items: UploadItem[]) => {
  const formData = new FormData()
  items.forEach((item) => {
    formData.append(fieldName.value, item.file)
    item.status = 'uploading'
    item.progress = 0
    item.message = ''
    item.response = null
  })
  appendExtraData(formData)

  try {
    const response = await axios.post(uploadUrl.value, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (!event.total) return
        const progress = Math.round((event.loaded / event.total) * 100)
        items.forEach((item) => {
          item.progress = progress
        })
      },
    })

    items.forEach((item) => {
      item.status = 'success'
      item.progress = 100
      item.response = response.data
      item.message = '服务端已返回响应'
    })
  } catch (error) {
    items.forEach((item) => {
      item.status = 'error'
      item.message = error instanceof Error ? error.message : '上传请求失败'
    })
  }
}

const uploadFiles = async () => {
  const pendingItems = uploadItems.value.filter(
    (item) => item.status === 'ready' || item.status === 'error',
  )

  if (allowMultiple.value) {
    await uploadMany(pendingItems)
    return
  }

  const [item] = pendingItems
  if (item) {
    await uploadOne(item)
  }
}
</script>

<template>
  <div class="upload-container">
    <h2>文件上传测试页面</h2>

    <div class="config-area">
      <label>上传地址：</label>
      <input :value="uploadUrl" type="text" readonly />
    </div>

    <div class="config-area">
      <label>文件字段：</label>
      <input :value="fieldName" type="text" readonly />
      <label class="checkbox-label">
        <input v-model="allowMultiple" type="checkbox" :disabled="hasUploading" />
        多文件
      </label>
    </div>

    <div class="config-area">
      <label>附加参数：</label>
      <input v-model="extraData" type="text" placeholder='可选 JSON，例如 {"type":"avatar"}' />
    </div>

    <div
      class="drop-zone"
      :class="{ dragging: isDragging }"
      @click="selectFiles"
      @dragenter.prevent="isDragging = true"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <input
        ref="fileInputRef"
        class="hidden-input"
        type="file"
        :multiple="allowMultiple"
        @change="handleFileChange"
      />
      <div class="drop-title">点击选择文件，或拖拽文件到这里</div>
      <div class="drop-subtitle">当前接口：{{ uploadUrl || '未填写' }}</div>
    </div>

    <div class="button-area">
      <button :disabled="!canUpload || hasUploading" @click="uploadFiles">开始上传</button>
      <button :disabled="hasUploading || uploadItems.length === 0" @click="clearFiles">清空列表</button>
    </div>

    <div class="file-list">
      <div v-if="uploadItems.length === 0" class="empty-tip">暂无文件</div>

      <div v-for="item in uploadItems" :key="item.id" class="file-item">
        <div class="file-main">
          <div class="file-name" :title="item.file.name">{{ item.file.name }}</div>
          <div class="file-meta">
            <span>{{ formatSize(item.file.size) }}</span>
            <span class="status" :class="item.status">{{ statusText[item.status] }}</span>
          </div>
        </div>

        <div class="progress-wrap">
          <div class="progress-bar" :style="{ width: `${item.progress}%` }"></div>
        </div>

        <button class="remove-button" :disabled="hasUploading" @click="removeItem(item.id)">移除</button>

        <div v-if="item.message" class="message">{{ item.message }}</div>
        <pre v-if="item.response" class="response">{{ JSON.stringify(item.response, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.upload-container {
  max-width: 860px;
  margin: 20px auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-family: Arial, sans-serif;

  h2 {
    margin-bottom: 20px;
    color: #333;
    text-align: center;
  }
}

.config-area {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
  flex-wrap: wrap;

  label {
    white-space: nowrap;
    font-weight: bold;
  }

  input[type='text'] {
    flex: 1;
    min-width: 220px;
    padding: 8px 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: normal;
    user-select: none;
  }
}

.drop-zone {
  display: grid;
  place-items: center;
  min-height: 150px;
  padding: 20px;
  margin-bottom: 15px;
  border: 2px dashed #91caff;
  border-radius: 8px;
  background-color: #f0f9ff;
  color: #333;
  cursor: pointer;
  transition:
    border-color 0.2s,
    background-color 0.2s;

  &.dragging {
    border-color: #1677ff;
    background-color: #e6f4ff;
  }

  .hidden-input {
    display: none;
  }

  .drop-title {
    font-size: 16px;
    font-weight: bold;
  }

  .drop-subtitle {
    margin-top: 8px;
    max-width: 100%;
    color: #666;
    font-size: 13px;
    word-break: break-all;
  }
}

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

    &:hover:not(:disabled) {
      background-color: #40a9ff;
    }

    &:disabled {
      background-color: #ccc;
      cursor: not-allowed;
    }
  }
}

.file-list {
  min-height: 220px;
  padding: 10px;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  background-color: #fafafa;
}

.empty-tip {
  padding: 28px;
  color: #999;
  text-align: center;
}

.file-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180px auto;
  gap: 10px;
  align-items: center;
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  background-color: #fff;

  &:last-child {
    margin-bottom: 0;
  }
}

.file-main {
  min-width: 0;
}

.file-name {
  overflow: hidden;
  color: #333;
  font-weight: bold;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta {
  display: flex;
  gap: 8px;
  margin-top: 6px;
  color: #666;
  font-size: 12px;
}

.status {
  font-weight: bold;

  &.ready {
    color: #666;
  }

  &.uploading {
    color: #1890ff;
  }

  &.success {
    color: #52c41a;
  }

  &.error {
    color: #ff4d4f;
  }
}

.progress-wrap {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background-color: #f0f0f0;
}

.progress-bar {
  height: 100%;
  border-radius: inherit;
  background-color: #1890ff;
  transition: width 0.2s ease;
}

.remove-button {
  padding: 6px 12px;
  border: 1px solid #ff7875;
  border-radius: 4px;
  background-color: #fff;
  color: #ff4d4f;
  cursor: pointer;

  &:disabled {
    border-color: #d9d9d9;
    color: #999;
    cursor: not-allowed;
  }
}

.message,
.response {
  grid-column: 1 / -1;
}

.message {
  color: #666;
  font-size: 13px;
}

.response {
  max-height: 160px;
  padding: 10px;
  overflow: auto;
  border-radius: 4px;
  background-color: #f6ffed;
  color: #333;
  font-size: 12px;
}

@media (max-width: 720px) {
  .file-item {
    grid-template-columns: 1fr;
  }

  .progress-wrap {
    width: 100%;
  }
}
</style>
