// next-intl.config.ts

export default {
  defaultLocale: 'en',
  locales: ['en', 'fr', 'zh'],
  // 配置路由
  routing: {
    // 使用 App Router 的国际化路由
    type: 'app-router',
    // 支持的区域设置
    locales: ['en', 'fr', 'zh'],
  },
  // 默认命名空间
  defaultNamespace: 'common'
}
