import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { messages } from './messages'
import '../globals.css'

export const metadata: Metadata = {
  title: 'v0 App',
  description: 'Created with v0',
  generator: 'v0.dev',
}

export async function generateStaticParams() {
  return [
    { locale: 'en' },
    { locale: 'zh' },
    { locale: 'fr' },
  ]
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const { locale } = await params
  const localeMessages = messages[locale] || {}
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={localeMessages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
