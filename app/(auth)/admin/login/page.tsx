import { AdminLoginForm } from '@/components/auth/admin-login-form'
import { LogoutButton } from '@/components/auth/logout-button'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/logo'
import { Shield, BarChart3, Users, Lock, ShoppingBag } from 'lucide-react'

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
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* 左側登入區 */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative">
        {/* 背景裝飾 */}
        <div className="absolute inset-0 overflow-hidden opacity-5">
          <div className="absolute top-20 left-20 w-40 h-40 border-4 border-white rotate-12"></div>
          <div className="absolute bottom-32 left-1/3 w-32 h-32 border-4 border-white -rotate-6"></div>
          <div className="absolute top-1/2 right-20 w-36 h-36 border-4 border-white rotate-45"></div>
        </div>

        <div className="w-full max-w-md space-y-6 relative z-10">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="rounded-none border-4 border-white bg-white p-4 shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)]">
              <Logo variant="full" />
            </div>
          </div>

          {/* 登入卡片 */}
          <div className="rounded-none border-4 border-white bg-slate-900/90 backdrop-blur-sm p-8 shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)]">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 rounded-none border-3 border-white bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 mb-4 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)]">
                <Shield className="h-5 w-5 text-white" />
                <h2 className="text-sm font-black uppercase tracking-wider text-white">管理後台</h2>
              </div>
              <p className="text-sm font-bold text-gray-300">
                管理員請使用帳號登入
              </p>
            </div>

            {/* 已登入提示 */}
            {user && currentUserRole === 'client' && (
              <div className="rounded-none border-3 border-yellow-400 bg-yellow-900/50 p-6 mb-6 shadow-[4px_4px_0px_0px_rgba(250,204,21,0.3)]">
                <p className="text-sm font-bold text-yellow-300 mb-3">
                  ⚠️ 您目前已登入為「客戶」身份
                </p>
                <p className="text-xs text-yellow-200 mb-4">
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
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-none border-2 border-white bg-slate-900/50 backdrop-blur-sm px-4 py-2 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
              <ShoppingBag className="h-4 w-4 text-white" />
              <span className="text-sm font-bold text-white">客戶請前往</span>
              <a href="/login" className="text-sm font-black text-blue-400 hover:underline">
                前台登入 →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 右側功能展示區（桌面版） */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-950 border-l-4 border-white">
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="mb-8">
            <div className="inline-block rounded-none border-3 border-white bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 shadow-[6px_6px_0px_0px_rgba(255,255,255,0.3)]">
              <h1 className="text-4xl font-black">管理中心</h1>
            </div>
          </div>

          <p className="text-xl font-bold mb-12 leading-relaxed text-gray-300">
            全方位管理您的批發業務<br />
            客戶、商品、訂單一目了然
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="rounded-none border-3 border-white bg-gradient-to-br from-blue-600 to-indigo-600 p-3 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)]">
                <Users className="h-7 w-7 text-white" />
              </div>
              <div>
                <h3 className="font-black text-xl mb-2 text-white">客戶管理</h3>
                <p className="text-sm font-medium text-gray-400">會員等級設定、客戶資料管理、快速開戶</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="rounded-none border-3 border-white bg-gradient-to-br from-blue-600 to-indigo-600 p-3 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)]">
                <BarChart3 className="h-7 w-7 text-white" />
              </div>
              <div>
                <h3 className="font-black text-xl mb-2 text-white">價格管理</h3>
                <p className="text-sm font-medium text-gray-400">等級綁定價格、批次設定、系列化管理</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="rounded-none border-3 border-white bg-gradient-to-br from-blue-600 to-indigo-600 p-3 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)]">
                <Lock className="h-7 w-7 text-white" />
              </div>
              <div>
                <h3 className="font-black text-xl mb-2 text-white">權限控制</h3>
                <p className="text-sm font-medium text-gray-400">嚴格的角色區分、安全的資料存取控制</p>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t-2 border-gray-700">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Powered by Vsale-lite
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
