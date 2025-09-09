import { getRequestConfig } from 'next-intl/server';
// 定义支持的语言
const locales = ['en', 'fr', 'zh'];
const defaultLocale = 'en';

export default getRequestConfig(async ({ locale }) => {
  // 确保locale存在且有效，否则使用默认值
  const safeLocale = locales.includes(locale as any) ? locale : defaultLocale;
  
  // 确保返回的locale类型为string，不包含undefined
  const finalLocale = typeof safeLocale === 'string' ? safeLocale : defaultLocale;

  // 加载对应的语言文件
  return {
    locale: finalLocale,
    messages: (await import(`../locales/${finalLocale}.json`)).default
  };
});