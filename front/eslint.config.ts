import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import pluginVitest from '@vitest/eslint-plugin'

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },
  // 忽略src/assets/images文件和svg

  globalIgnores([
    '**/dist/**',
    '**/dist-ssr/**',
    '**/coverage/**',
    '**/node_modules/**',
    '**/.history/**',
    '**/src/assets/images/**',
    '**/src/assets/images/**/*.svg',
  ]),

  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,

  {
    ...pluginVitest.configs.recommended,
    files: ['src/**/__tests__/*'],
  },
  {
    rules: {
      // vue文件名不需要驼峰
      'vue/filename-casing': 'off',
      'vue/multi-word-component-names': 'off', // 关闭组件名称必须是多词的规则
      // 不允许使用var
      'no-var': 'error',
      // 未使用的变量
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_', // 忽略以下划线开头的未使用变量
        },
      ],
      // 常量必须const
      'prefer-const': 'error',
      // 必须每一行末尾有分号
      // semi: ['error', 'always'],
      // 圈复杂度
      complexity: ['error', 15],
      // "no-undef": "off", //由于eslint无法识别.d.ts声明文件中定义的变量，暂时关闭
      // 允许使用any
      '@typescript-eslint/no-explicit-any': 'off',
      // 不允许在条件判断中用复制运算符
      'no-cond-assign': 'error',
      // 限制换行必须是LF
      'linebreak-style': ['error', 'unix'],
      // 标签属性按照顺序
      'vue/attributes-order': [
        'error',
        {
          order: [
            'DEFINITION', // `is` 和 `v-is`
            'LIST_RENDERING', // 列表渲染
            'CONDITIONALS', // 条件渲染
            'RENDER_MODIFIERS', // 渲染修饰符
            'GLOBAL', // 全局属性
            'UNIQUE', // 唯一属性
            'TWO_WAY_BINDING', // 双向绑定
            'OTHER_DIRECTIVES', // 其他指令
            'OTHER_ATTR', // 其他属性
            'EVENTS', // 事件
            'CONTENT', // 内容
          ],
        },
      ],
    },
  },
)
/**
 * {
  "rules": {
    "no-cond-assign": "error"
  }
}
 */
