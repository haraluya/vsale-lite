import { AdminLoginForm } from '@/components/auth/admin-login-form'
import { LogoutButton } from '@/components/auth/logout-button'
import { LoginPwaPrompt } from '@/components/auth/login-pwa-prompt'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/logo'
import { Shield, ShoppingBag, Check } from 'lucide-react'
import { generatePageMetadata } from '@/lib/metadata'

export async function generateMetadata() {
  return generatePageMetadata('管理員登入', '使用 Email 登入')
}

export default async function AdminLoginPage() {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-100 to-indigo-200 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-900">
      {/* 背景裝飾 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-32 h-32 border-2 border-indigo-300/20 dark:border-white/10 -rotate-12 rounded-theme" />
        <div className="absolute bottom-24 left-10 w-40 h-40 border-2 border-indigo-300/20 dark:border-white/10 rotate-6 rounded-theme" />
        <div className="absolute top-1/2 right-1/2 w-24 h-24 border-2 border-indigo-300/20 dark:border-white/10 -rotate-45 rounded-theme" />
      </div>

      {/* 主容器 - 居中單欄設計 */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12 sm:px-6 lg:px-8">
        {/* Logo 與標題區 */}
        <div className="w-full max-w-md mb-8 text-center">
          <div className="flex justify-center mb-6">
            <Logo variant="full" href="/admin/dashboard" />
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl font-black text-foreground leading-tight">
              管理後台
            </h1>
            <p className="text-lg md:text-xl font-bold text-text-secondary">
              訂單管理、客戶管理、一站搞定
            </p>
          </div>
        </div>

        {/* 特色要點（手機隱藏，桌面顯示） */}
        <div className="hidden md:flex items-center justify-center gap-6 w-full max-w-2xl mb-8">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-blue-500/15 dark:bg-blue-400/20 p-1">
              <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-bold text-text-secondary">訂單處理</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-blue-500/15 dark:bg-blue-400/20 p-1">
              <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-bold text-text-secondary">客戶管理</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-blue-500/15 dark:bg-blue-400/20 p-1">
              <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-bold text-text-secondary">安全控管</span>
          </div>
        </div>

        {/* 登入卡片 */}
        <div className="w-full max-w-md">
          <div className="rounded-theme border bg-surface p-6 md:p-8 shadow-neo-lg">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 rounded-theme-sm border-theme bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 mb-4 shadow-neo-sm">
                <Shield className="h-5 w-5 text-white" />
                <h2 className="text-sm font-black uppercase tracking-wider text-white">管理後台</h2>
              </div>
              <p className="text-sm font-bold text-text-secondary">
                管理員請使用帳號登入
              </p>
            </div>

            {/* 已登入提示 */}
            {user && currentUserRole === 'client' && (
              <div className="rounded-theme-sm border-theme border-yellow-600 bg-yellow-50 p-6 mb-6 shadow-neo-sm">
                <p className="text-sm font-bold text-yellow-800 mb-3">
                  您目前已登入為「客戶」身份
                </p>
                <p className="text-xs text-yellow-700 mb-4">
                  若要以管理員身份登入後台，請先登出當前帳號
                </p>
                <LogoutButton />
              </div>
            )}

            {/* 登入表單 */}
            {(!user || currentUserRole !== 'client') && (
              <AdminLoginForm />
            )}
          </div>

          {/* PWA 安裝引導 */}
          <LoginPwaPrompt variant="form-section" />

          {/* 切換到前台登入 */}
          <div className="text-center mt-6">
            <div className="inline-flex items-center gap-2 rounded-theme-sm border bg-surface/80 backdrop-blur-sm px-4 py-2 shadow-neo-sm transition-all hover:-translate-y-0.5 hover:shadow-theme-hover">
              <ShoppingBag className="h-4 w-4" />
              <span className="text-sm font-bold">客戶請前往</span>
              <a href="/login" className="text-sm font-black text-blue-600 dark:text-blue-400 hover:underline">
                前台登入 →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
