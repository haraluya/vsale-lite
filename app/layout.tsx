import type { Metadata } from 'next'
import './globals.css'
import { getPublicSettings } from '@/lib/actions/system'

export async function generateMetadata(): Promise<Metadata> {
  // 從資料庫讀取公開設定
  const settingsResult = await getPublicSettings()
  const settings = settingsResult.success ? settingsResult.data : []

  const siteTitle = settings?.find((s) => s.key === 'site_title')?.value || 'Vsale-lite - B2B 批發訂貨系統'
  const companyName = settings?.find((s) => s.key === 'company_name')?.value || '您的公司'
  const logoUrl = settings?.find((s) => s.key === 'logo_url')?.value
  const logoIconUrl = settings?.find((s) => s.key === 'logo_icon_url')?.value
  const faviconUrl = settings?.find((s) => s.key === 'favicon_url')?.value

  // 確保 icon URLs 是字串
  const iconUrl = typeof faviconUrl === 'string' && faviconUrl ? faviconUrl : '/favicon.svg'
  const appleIconUrl = typeof logoIconUrl === 'string' && logoIconUrl ? logoIconUrl : '/logo-icon.svg'

  return {
    title: siteTitle as string,
    description: `${companyName} - 專為批發業務設計的輕量級訂貨系統`,
    icons: {
      icon: iconUrl,
      shortcut: iconUrl,
      apple: appleIconUrl,
    },
  }
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
