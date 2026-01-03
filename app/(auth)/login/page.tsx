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
    <div className="flex min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      {/* 左側裝飾區（桌面版） */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-400 border-r-4 border-black">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 border-4 border-black rotate-12"></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 border-4 border-black -rotate-6"></div>
          <div className="absolute top-1/2 left-1/3 w-24 h-24 border-4 border-black rotate-45"></div>
        </div>

        <div className="relative z-10 flex flex-col justify-center px-16 text-black">
          <div className="mb-8">
            <Logo variant="full" className="!text-black [&_path]:fill-black" />
          </div>

          <h1 className="text-5xl font-black mb-6 leading-tight">
            批發訂貨<br />輕鬆搞定
          </h1>

          <p className="text-xl font-bold mb-8 leading-relaxed">
            專為批發客戶設計的訂貨系統<br />
            隨時隨地，手機下單
          </p>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="rounded-none border-3 border-black bg-white p-3 shadow-neo">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">即時下單</h3>
                <p className="text-sm font-medium">24小時不打烊，隨時查看商品與價格</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="rounded-none border-3 border-black bg-white p-3 shadow-neo">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">行動優先</h3>
                <p className="text-sm font-medium">手機操作流暢，單手即可完成下單</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="rounded-none border-3 border-black bg-white p-3 shadow-neo">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">專屬價格</h3>
                <p className="text-sm font-medium">會員等級綁定，享受您的專屬批發價</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 右側登入區 */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          {/* 手機版 Logo */}
          <div className="flex justify-center lg:hidden mb-8">
            <Logo variant="full" href="/" />
          </div>

          {/* 登入卡片 */}
          <div className="rounded-none border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="mb-6">
              <div className="inline-block rounded-none border-3 border-black bg-gradient-to-r from-orange-400 to-amber-400 px-4 py-2 mb-4 shadow-neo-sm">
                <h2 className="text-sm font-black uppercase tracking-wider">客戶登入</h2>
              </div>
              <p className="text-sm font-bold text-gray-700">
                請使用手機號碼登入
              </p>
            </div>

            {/* 已登入提示 */}
            {user && currentUserRole === 'admin' && (
              <div className="rounded-none border-3 border-yellow-600 bg-yellow-50 p-6 mb-6 shadow-neo-sm">
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
          <div className="text-center">
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
