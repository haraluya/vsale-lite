import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function StorePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 查詢使用者資料
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, phone, tier_id, tiers(name)')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 rounded-none border-3 border-black bg-white p-6 shadow-neo">
          <h1 className="mb-2 text-3xl font-bold">歡迎登入 Vsale-lite</h1>
          <p className="text-gray-600">
            {profile?.display_name || profile?.phone} 您好!
          </p>
          {profile?.tiers && (
            <p className="mt-2 text-sm text-gray-500">
              會員等級: <span className="font-bold">{(profile.tiers as any).name}</span>
            </p>
          )}
        </div>

        {/* Welcome Card */}
        <div className="rounded-none border-3 border-black bg-yellow-100 p-8 shadow-neo">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-none border-3 border-black bg-yellow-400 text-2xl">
                🎉
              </div>
              <div>
                <h2 className="text-xl font-bold">登入成功!</h2>
                <p className="text-sm text-gray-600">您已成功登入前台購物系統</p>
              </div>
            </div>

            <div className="rounded-none border-2 border-black bg-white p-4">
              <h3 className="mb-2 font-bold">系統狀態</h3>
              <ul className="space-y-1 text-sm">
                <li className="flex items-center gap-2">
                  <span className="font-mono">✓</span>
                  <span>認證狀態: 已登入</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-mono">✓</span>
                  <span>會員等級: 已綁定</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-mono">⏳</span>
                  <span>商品列表: 即將推出</span>
                </li>
              </ul>
            </div>

            <div className="rounded-none border-2 border-yellow-600 bg-yellow-50 p-4">
              <p className="text-sm font-bold text-yellow-800">
                📦 商品訂購功能正在開發中,敬請期待!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
