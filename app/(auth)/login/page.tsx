import { ClientLoginForm } from '@/components/auth/client-login-form'
import { LogoutButton } from '@/components/auth/logout-button'
import { LoginPwaPrompt } from '@/components/auth/login-pwa-prompt'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/logo'
import { Shield, Check } from 'lucide-react'
import { generatePageMetadata } from '@/lib/metadata'

export async function generateMetadata() {
  return generatePageMetadata('客戶登入', '使用手機號碼登入')
}

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 如果已登入,查詢角色
  let currentUserRole: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    currentUserRole = profile?.role || null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-100 to-amber-200 dark:from-amber-950 dark:via-orange-950 dark:to-amber-900">
      {/* 背景裝飾 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 border-2 border-orange-300/20 dark:border-white/10 rotate-12 rounded-theme" />
        <div className="absolute bottom-24 right-10 w-40 h-40 border-2 border-orange-300/20 dark:border-white/10 -rotate-6 rounded-theme" />
        <div className="absolute top-1/2 left-1/2 w-24 h-24 border-2 border-orange-300/20 dark:border-white/10 rotate-45 rounded-theme" />
      </div>

      {/* 主容器 - 居中單欄設計 */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12 sm:px-6 lg:px-8">
        {/* Logo 與標題區 */}
        <div className="w-full max-w-md mb-8 text-center">
          <div className="flex justify-center mb-6">
            <Logo variant="full" href="/store" />
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl font-black text-foreground leading-tight">
              快速下單系統
            </h1>
            <p className="text-lg md:text-xl font-bold text-text-secondary">
              批發訂貨，隨時隨地輕鬆搞定
            </p>
          </div>
        </div>

        {/* 特色要點（手機隱藏，桌面顯示） */}
        <div className="hidden md:flex items-center justify-center gap-6 w-full max-w-2xl mb-8">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-orange-500/15 dark:bg-orange-400/20 p-1">
              <Check className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-sm font-bold text-text-secondary">即時下單</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-orange-500/15 dark:bg-orange-400/20 p-1">
              <Check className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-sm font-bold text-text-secondary">行動優先</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-orange-500/15 dark:bg-orange-400/20 p-1">
              <Check className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-sm font-bold text-text-secondary">專屬價格</span>
          </div>
        </div>

        {/* 登入卡片 */}
        <div className="w-full max-w-md">
          <div className="rounded-theme border bg-surface p-6 md:p-8 shadow-neo-lg">
            <div className="mb-6">
              <div className="inline-block rounded-theme-sm border-theme bg-gradient-to-r from-orange-400 to-amber-400 px-4 py-2 mb-4 shadow-neo-sm">
                <h2 className="text-sm font-black uppercase tracking-wider">客戶登入</h2>
              </div>
              <p className="text-sm font-bold text-text-secondary">
                請使用手機號碼登入
              </p>
            </div>

            {/* 已登入提示 */}
            {user && currentUserRole === 'admin' && (
              <div className="rounded-theme-sm border-theme border-yellow-600 bg-yellow-50 p-6 mb-6 shadow-neo-sm">
                <p className="text-sm font-bold text-yellow-800 mb-3">
                  您目前已登入為「管理員」身份
                </p>
                <p className="text-xs text-yellow-700 mb-4">
                  若要以客戶身份登入前台，請先登出當前帳號
                </p>
                <LogoutButton />
              </div>
            )}

            {/* 登入表單 */}
            {(!user || currentUserRole !== 'admin') && (
              <ClientLoginForm />
            )}
          </div>

          {/* PWA 安裝引導 */}
          <LoginPwaPrompt variant="form-section" />

          {/* 切換到後台登入 */}
          <div className="text-center mt-6">
            <div className="inline-flex items-center gap-2 rounded-theme-sm border bg-surface/80 backdrop-blur-sm px-4 py-2 shadow-neo-sm transition-all hover:-translate-y-0.5 hover:shadow-theme-hover">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-bold">管理員請前往</span>
              <a href="/admin/login" className="text-sm font-black text-orange-600 dark:text-orange-400 hover:underline">
                後台登入 →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
