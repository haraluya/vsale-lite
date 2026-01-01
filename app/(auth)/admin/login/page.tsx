import { AdminLoginForm } from '@/components/auth/admin-login-form'

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h1 className="text-center text-4xl font-bold">後台登入</h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            管理員請使用 Email 登入
          </p>
        </div>

        <div className="card-neo bg-white">
          <AdminLoginForm />
        </div>

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
