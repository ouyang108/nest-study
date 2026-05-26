import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
    },
    {
      // 原生 WebSocket 测试页面
      // 用懒加载，访问到该路由时才会加载对应 chunk，减小首屏体积
      path: '/native-ws',
      name: 'native-ws',
      component: () => import('../views/NativeWsView.vue'),
    },
    {
      // Socket.IO 测试页面
      // socket.io-client 包体积较大，单独 chunk 懒加载更友好
      path: '/socket-io',
      name: 'socket-io',
      component: () => import('../views/SocketIoView.vue'),
    },
    {
      // SSE (Server-Sent Events) 测试页面
      // EventSource 是浏览器原生 API，无需额外依赖，懒加载即可
      path: '/sse',
      name: 'sse',
      component: () => import('../views/SseView.vue'),
    },
    {
      path: '/upload',
      name: 'upload',
      component: () => import('../views/UploadView.vue'),
    },
  ],
})

export default router
