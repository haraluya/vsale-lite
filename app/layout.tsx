import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vsale-lite - B2B 批發訂貨系統',
  description: '專為批發業務設計的輕量級訂貨系統',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/logo-icon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  )
}
