import type { Metadata, Viewport } from 'next'
import './globals.css'
import { getPublicSettings } from '@/lib/actions/system'
import { DialogProvider } from '@/lib/contexts/dialog-context'
import { ThemeProvider } from '@/lib/contexts/theme-context'
import { Toaster } from 'sonner'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#8B5CF6' },
    { media: '(prefers-color-scheme: dark)', color: '#1A1A2E' },
  ],
}

export async function generateMetadata(): Promise<Metadata> {
  const settingsResult = await getPublicSettings()
  const settings = settingsResult.success ? settingsResult.data : []

  const siteTitle = settings?.find((s) => s.key === 'site_title')?.value || 'Vsale-lite - B2B 批發訂貨系統'
  const companyName = settings?.find((s) => s.key === 'company_name')?.value || '您的公司'
  const logoUrl = settings?.find((s) => s.key === 'logo_url')?.value
  const logoIconUrl = settings?.find((s) => s.key === 'logo_icon_url')?.value
  const faviconUrl = settings?.find((s) => s.key === 'favicon_url')?.value

  const iconUrl = typeof faviconUrl === 'string' && faviconUrl ? faviconUrl : '/favicon.svg'
  const appleIconUrl = typeof logoIconUrl === 'string' && logoIconUrl ? logoIconUrl : '/logo-icon.svg'

  return {
    title: siteTitle as string,
    description: `${companyName} - 專為批發業務設計的輕量級訂貨系統`,
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: siteTitle as string,
    },
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
    <html lang="zh-TW" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){try{var t=localStorage.getItem('theme');
          if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches))
          document.documentElement.classList.add('dark')}catch(e){}})()
        `}} />
      </head>
      <body>
        <ThemeProvider>
          <DialogProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  borderWidth: '3px',
                  borderColor: 'var(--color-border)',
                  boxShadow: 'var(--shadow-neo)',
                  borderRadius: '0',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                },
                className: 'font-bold',
              }}
            />
          </DialogProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
