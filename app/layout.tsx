import './globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

export async function generateStaticParams() {
  return ['en', 'zh', 'fr'].map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const config = await getRequestConfig({ locale });

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={config.messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
