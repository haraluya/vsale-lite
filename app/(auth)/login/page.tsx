import { ClientLoginForm } from '@/components/auth/client-login-form'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h1 className="text-center text-4xl font-bold">客戶登入</h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            請使用手機號碼登入
          </p>
        </div>

        <div className="card-neo bg-white">
          <ClientLoginForm />
        </div>

        <p className="text-center text-xs text-gray-500">
          管理員請前往{' '}
          <a href="/admin/login" className="font-bold text-primary hover:underline">
            後台登入
          </a>
        </p>
      </div>
    </div>
  )
}
