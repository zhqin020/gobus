import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { messages } from './messages'
import '../globals.css'

export const metadata: Metadata = {
  title: 'Gobus Canada',
  description: 'Created by  ZhQin 2025', 
}

const locales = ['en', 'zh', 'fr']

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
  if (!locales.includes(locale)) {
    notFound()
  }
  const localeMessages = messages[locale as keyof typeof messages] || {}
  return (
    <NextIntlClientProvider locale={locale} messages={localeMessages}>
      {children}
    </NextIntlClientProvider>
  )
}
