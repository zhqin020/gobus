import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const locales = ['en', 'zh', 'fr']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const locale = pathname.split('/')[1]
  if (locales.includes(locale)) {
    return NextResponse.next()
  }
  // 允许静态资源、API、favicon等不被 locale 捕获
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next()
  }
  // 其余重定向到默认语言
  return NextResponse.redirect(new URL(`/en${pathname}`, request.url))
}

export const config = {
  matcher: [
    '/((?!_next|api|favicon.ico|public).*)',
  ],
}
