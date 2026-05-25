import axios from 'axios'

import router from '../router/index'
// import { isEqual } from 'lodash-es'
const request = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
  timeout: 5000,
  headers: {
    Authorization: JSON.parse(localStorage.getItem('userInfo') || '{}')['token-web'] || '',
    noToken: true,
  },
})
const newSet = new Set()
// 将请求地址和请求参数和方法生成一个字符串
const genKey = (config: any) => {
  const { method, url, data } = config

  return data
    ? [
        url,
        method,
        typeof data !== 'string' ? JSON.stringify(data) : JSON.stringify(JSON.parse(data)),
      ].join('&')
    : [url, method].join('&')
}
// 添加请求拦截器
request.interceptors.request.use(
  (config: any) => {
    // 获取请求地址和请求参数
    const key = genKey(config)

    // 每次请求前读取newSet中有没有key
    if (newSet.has(key)) {
      // 如果有，说明重复请求，返回一个错误
      return Promise.reject('重复请求')
    }
    // 如果没有，将key添加到newSet中
    newSet.add(key)
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
    config.headers.Authorization = 'Bear ' + userInfo['token-web'] || ''
    return config
  },
  (error) => {
    // 对请求错误做些什么
    return Promise.reject(error)
  },
)
// 添加响应拦截器
request.interceptors.response.use(
  (response) => {
    // 对响应数据做点什么

    const key = genKey(response.config)
    // 每次请求后删除newSet中的key
    newSet.delete(key)

    const res = response.data
    // console.log(response)
    if (res.code && res.code !== 0) {
      // `token` 过期或者账号已在别处登录
      if (res.code === 401 || res.code === 4001) {
        router.push('/login')
      }

      return res
    } else {
      return res
    }
  },
  (error) => {
    if (error === '重复请求') {
      return Promise.reject('重复请求')
    }
 
    const key = genKey(error.config)
    // 每次请求后删除newSet中的key
    newSet.delete(key)
    console.log('添加响应拦截器')
    if (error.message === 'canceled') {
      return Promise.reject('取消请求')
    }
    if (error.response.data && error.response.data.message) {
      return error.response.data
    } else {
      if (error.response.status === 401) {
        localStorage.clear()

        return
      }

      // 对响应错误做点什么
      if (error.message.indexOf('timeout') != -1) {
        console.log('网络超时')
      } else if (error.message == 'Network Error') {
        console.log('网络连接错误')
      } else {
        if (error.response.data) console.log(error.response.data.message)
        else console.log('接口路径找不到')
        // ElMessage.error(error.message)
      }
      return Promise.reject(error)
    }
  },
)

// 导出 axios 实例
export default request
