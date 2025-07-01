const locales = ['en', 'zh', 'fr'];
const defaultLocale = 'en';

export default function getConfig() {
  return {
    locale: defaultLocale,
    locales,
    // getRequestConfig is called by next-intl to get locale and messages
    async getRequestConfig({ locale }: { locale: string }) {
      return {
        locale,
        messages: (await import(`./locales/${locale}.json`)).default
      };
    }
  };
}
