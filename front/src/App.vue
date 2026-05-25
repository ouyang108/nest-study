<script setup lang="ts">
// App 根组件只负责顶部导航 + 路由出口，具体业务页面放在 views/ 下
// 这样可以避免单文件膨胀，且 WebSocket / Socket.IO 互不干扰
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <!-- 顶部导航栏，用 RouterLink 跳转避免触发整页刷新 -->
  <nav class="app-nav">
    <!-- exact-active-class 用默认 router-link-exact-active，配合下面 .router-link-active 高亮 -->
    <RouterLink to="/">首页</RouterLink>
    <RouterLink to="/about">关于</RouterLink>
    <RouterLink to="/native-ws">原生 WebSocket</RouterLink>
    <RouterLink to="/socket-io">Socket.IO</RouterLink>
    <RouterLink to="/sse">SSE</RouterLink>
  </nav>

  <!-- 路由出口：匹配到的页面会渲染到这里 -->
  <RouterView />
</template>

<style lang="scss" scoped>
.app-nav {
  display: flex;
  gap: 16px;
  padding: 12px 24px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #e8e8e8;

  a {
    color: #333;
    text-decoration: none;
    font-size: 14px;
    padding: 4px 10px;
    border-radius: 4px;
    transition: all 0.2s;

    &:hover {
      background-color: #e6f7ff;
      color: #1890ff;
    }

    // vue-router 自动给当前激活的 link 加 .router-link-active
    // .router-link-exact-active 是严格匹配（仅当前路径完全相同），这里两个都加上
    &.router-link-active,
    &.router-link-exact-active {
      background-color: #1890ff;
      color: #fff;
    }
  }
}
</style>
