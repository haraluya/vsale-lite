import { getTiers } from '@/lib/actions/tiers'
import { Users, Tag, ShoppingCart } from 'lucide-react'

export default async function DashboardPage() {
  const tiers = await getTiers()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">儀表板</h1>
        <p className="mt-2 text-gray-600">歡迎使用 Vsale-lite 管理後台</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="card-neo">
          <div className="flex items-center gap-4">
            <div className="rounded-none border-3 border-black bg-primary p-4">
              <Tag className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">會員等級</p>
              <p className="text-2xl font-bold">{tiers.length}</p>
            </div>
          </div>
        </div>

        <div className="card-neo">
          <div className="flex items-center gap-4">
            <div className="rounded-none border-3 border-black bg-blue-500 p-4">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">客戶總數</p>
              <p className="text-2xl font-bold">0</p>
            </div>
          </div>
        </div>

        <div className="card-neo">
          <div className="flex items-center gap-4">
            <div className="rounded-none border-3 border-black bg-green-500 p-4">
              <ShoppingCart className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">訂單總數</p>
              <p className="text-2xl font-bold">0</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card-neo">
        <h2 className="text-xl font-bold mb-4">快速開始</h2>
        <ul className="space-y-2 text-sm">
          <li>✅ 會員等級已設定 ({tiers.map(t => t.name).join('、')})</li>
          <li>⏳ 開始建立客戶帳號</li>
          <li>⏳ 設定商品價格</li>
          <li>⏳ 開始接收訂單</li>
        </ul>
      </div>
    </div>
  )
}
