import { AdminLoginForm } from '@/components/auth/admin-login-form'
import { LogoutButton } from '@/components/auth/logout-button'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/logo'

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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <Logo variant="full" href="/" />
        </div>

        <div>
          <h1 className="text-center text-4xl font-bold">後台登入</h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            管理員請使用 Email 登入
          </p>
        </div>

        {/* 已登入提示 */}
        {user && currentUserRole === 'client' && (
          <div className="card-neo bg-yellow-50 border-3 border-yellow-500 p-6">
            <p className="text-sm font-bold text-yellow-800 mb-3">
              ⚠️ 您目前已登入為「客戶」身份
            </p>
            <p className="text-xs text-yellow-700 mb-4">
              若要以管理員身份登入後台,請先登出當前帳號
            </p>
            <LogoutButton />
          </div>
        )}

        {/* 登入表單 */}
        {(!user || currentUserRole !== 'client') && (
          <div className="card-neo bg-white p-8">
            <AdminLoginForm />
          </div>
        )}

        <p className="text-center text-xs text-gray-500">
          客戶請前往{' '}
          <a href="/login" className="font-bold text-primary hover:underline">
            前台登入
          </a>
        </p>
      </div>
    </div>
  )
}
