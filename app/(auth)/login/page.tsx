import { ClientLoginForm } from '@/components/auth/client-login-form'
import { LogoutButton } from '@/components/auth/logout-button'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/logo'
import { ShoppingBag, Smartphone, Shield } from 'lucide-react'

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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      {/* 背景裝飾 */}
      <div className="fixed inset-0 overflow-hidden opacity-5 pointer-events-none">
        <div className="absolute top-20 left-20 w-40 h-40 border-4 border-black rotate-12"></div>
        <div className="absolute bottom-32 right-32 w-48 h-48 border-4 border-black -rotate-6"></div>
        <div className="absolute top-1/2 left-1/2 w-32 h-32 border-4 border-black rotate-45"></div>
      </div>

      {/* 主容器 - 居中單欄設計 */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12 sm:px-6 lg:px-8">
        {/* Logo 與標題區 */}
        <div className="w-full max-w-md mb-8 text-center">
          <div className="flex justify-center mb-6">
            <Logo variant="full" href="/store" />
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl font-black text-black leading-tight">
              快速下單系統
            </h1>
            <p className="text-lg md:text-xl font-bold text-gray-800">
              批發訂貨，隨時隨地輕鬆搞定
            </p>
          </div>
        </div>

        {/* 特色說明卡片（手機隱藏，桌面顯示） */}
        <div className="hidden md:grid grid-cols-3 gap-4 w-full max-w-3xl mb-8">
          <div className="rounded-none border-2 md:border-3 border-black bg-white p-4 shadow-neo-sm md:shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
            <div className="flex justify-center mb-3">
              <div className="rounded-none border-2 border-black bg-gradient-to-br from-orange-400 to-amber-400 p-2">
                <ShoppingBag className="h-6 w-6 text-black" />
              </div>
            </div>
            <h3 className="font-black text-center mb-1">即時下單</h3>
            <p className="text-xs font-medium text-gray-700 text-center">24小時隨時查看商品價格</p>
          </div>

          <div className="rounded-none border-2 md:border-3 border-black bg-white p-4 shadow-neo-sm md:shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
            <div className="flex justify-center mb-3">
              <div className="rounded-none border-2 border-black bg-gradient-to-br from-orange-400 to-amber-400 p-2">
                <Smartphone className="h-6 w-6 text-black" />
              </div>
            </div>
            <h3 className="font-black text-center mb-1">行動優先</h3>
            <p className="text-xs font-medium text-gray-700 text-center">單手操作輕鬆完成訂單</p>
          </div>

          <div className="rounded-none border-2 md:border-3 border-black bg-white p-4 shadow-neo-sm md:shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
            <div className="flex justify-center mb-3">
              <div className="rounded-none border-2 border-black bg-gradient-to-br from-orange-400 to-amber-400 p-2">
                <Shield className="h-6 w-6 text-black" />
              </div>
            </div>
            <h3 className="font-black text-center mb-1">專屬價格</h3>
            <p className="text-xs font-medium text-gray-700 text-center">會員專屬優惠</p>
          </div>
        </div>

        {/* 登入卡片 */}
        <div className="w-full max-w-md">
          <div className="rounded-none border-2 md:border-4 border-black bg-white p-6 md:p-8 shadow-neo-sm md:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="mb-6">
              <div className="inline-block rounded-none border-2 md:border-3 border-black bg-gradient-to-r from-orange-400 to-amber-400 px-4 py-2 mb-4 shadow-neo-sm">
                <h2 className="text-sm font-black uppercase tracking-wider">客戶登入</h2>
              </div>
              <p className="text-sm font-bold text-gray-700">
                請使用手機號碼登入
              </p>
            </div>

            {/* 已登入提示 */}
            {user && currentUserRole === 'admin' && (
              <div className="rounded-none border-2 md:border-3 border-yellow-600 bg-yellow-50 p-6 mb-6 shadow-neo-sm">
                <p className="text-sm font-bold text-yellow-800 mb-3">
                  ⚠️ 您目前已登入為「管理員」身份
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

          {/* 切換到後台登入 */}
          <div className="text-center mt-6">
            <div className="inline-flex items-center gap-2 rounded-none border-2 border-black bg-white px-4 py-2 shadow-neo-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-bold">管理員請前往</span>
              <a href="/admin/login" className="text-sm font-black text-orange-600 hover:underline">
                後台登入 →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
