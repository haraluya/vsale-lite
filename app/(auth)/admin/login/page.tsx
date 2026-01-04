import { AdminLoginForm } from '@/components/auth/admin-login-form'
import { LogoutButton } from '@/components/auth/logout-button'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/logo'
import { Shield, Settings, FileText, Users2, ShoppingBag } from 'lucide-react'

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* 背景裝飾 */}
      <div className="fixed inset-0 overflow-hidden opacity-5 pointer-events-none">
        <div className="absolute top-20 right-20 w-40 h-40 border-4 border-black -rotate-12"></div>
        <div className="absolute bottom-32 left-32 w-48 h-48 border-4 border-black rotate-6"></div>
        <div className="absolute top-1/2 right-1/2 w-32 h-32 border-4 border-black -rotate-45"></div>
      </div>

      {/* 主容器 - 居中單欄設計 */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12 sm:px-6 lg:px-8">
        {/* Logo 與標題區 */}
        <div className="w-full max-w-md mb-8 text-center">
          <div className="flex justify-center mb-6">
            <Logo variant="full" href="/admin/dashboard" />
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl font-black text-black leading-tight">
              Vsale 管理後台
            </h1>
            <p className="text-lg md:text-xl font-bold text-gray-800">
              訂單管理、客戶管理、一站搞定
            </p>
          </div>
        </div>

        {/* 特色說明卡片（手機隱藏，桌面顯示） */}
        <div className="hidden md:grid grid-cols-3 gap-4 w-full max-w-3xl mb-8">
          <div className="rounded-none border-3 border-black bg-white p-4 shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
            <div className="flex justify-center mb-3">
              <div className="rounded-none border-2 border-black bg-gradient-to-br from-blue-400 to-indigo-400 p-2">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
            <h3 className="font-black text-center mb-1">訂單處理</h3>
            <p className="text-xs font-medium text-gray-700 text-center">快速確認訂單與出貨管理</p>
          </div>

          <div className="rounded-none border-3 border-black bg-white p-4 shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
            <div className="flex justify-center mb-3">
              <div className="rounded-none border-2 border-black bg-gradient-to-br from-purple-400 to-pink-400 p-2">
                <Users2 className="h-6 w-6 text-white" />
              </div>
            </div>
            <h3 className="font-black text-center mb-1">客戶管理</h3>
            <p className="text-xs font-medium text-gray-700 text-center">等級設定與價格權限控制</p>
          </div>

          <div className="rounded-none border-3 border-black bg-white p-4 shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
            <div className="flex justify-center mb-3">
              <div className="rounded-none border-2 border-black bg-gradient-to-br from-indigo-400 to-purple-400 p-2">
                <Settings className="h-6 w-6 text-white" />
              </div>
            </div>
            <h3 className="font-black text-center mb-1">系統設定</h3>
            <p className="text-xs font-medium text-gray-700 text-center">完整操作日誌與安全控管</p>
          </div>
        </div>

        {/* 登入卡片 */}
        <div className="w-full max-w-md">
          <div className="rounded-none border-4 border-black bg-white p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 rounded-none border-3 border-black bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 mb-4 shadow-neo-sm">
                <Shield className="h-5 w-5 text-white" />
                <h2 className="text-sm font-black uppercase tracking-wider text-white">管理後台</h2>
              </div>
              <p className="text-sm font-bold text-gray-700">
                管理員請使用帳號登入
              </p>
            </div>

            {/* 已登入提示 */}
            {user && currentUserRole === 'client' && (
              <div className="rounded-none border-3 border-yellow-600 bg-yellow-50 p-6 mb-6 shadow-neo-sm">
                <p className="text-sm font-bold text-yellow-800 mb-3">
                  ⚠️ 您目前已登入為「客戶」身份
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

          {/* 切換到前台登入 */}
          <div className="text-center mt-6">
            <div className="inline-flex items-center gap-2 rounded-none border-2 border-black bg-white px-4 py-2 shadow-neo-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
              <ShoppingBag className="h-4 w-4" />
              <span className="text-sm font-bold">客戶請前往</span>
              <a href="/login" className="text-sm font-black text-blue-600 hover:underline">
                前台登入 →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
