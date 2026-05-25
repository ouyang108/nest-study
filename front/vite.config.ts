import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import AutoImport from 'unplugin-auto-import/vite'
// import Components from 'unplugin-vue-components/vite'
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
    AutoImport({
      imports: ['vue'],
      dts: 'src/auto-import.d.ts',

      eslintrc: {
        enabled: true, //生成eslint配置
        filepath: './.eslintrc-auto-import.json', // 指定生成的 ESLint 配置文件路径
      },
    }),
    // Components({
    //   dts: 'src/components.d.ts',
    // }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
