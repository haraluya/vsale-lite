import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
      <div className="card-neo max-w-2xl bg-white">
        <h1 className="text-4xl font-bold mb-4">Vsale-lite</h1>
        <p className="text-lg mb-6">B2B 批發訂貨系統</p>

        <div className="space-y-2 mb-8">
          <p className="text-sm">✅ 雙入口設計</p>
          <p className="text-sm">✅ 等級綁定價格</p>
          <p className="text-sm">✅ 行動優先</p>
          <p className="text-sm">✅ Neo-Brutalism 設計風格</p>
        </div>

        <div className="flex flex-col gap-4">
          <Link href="/login">
            <Button className="w-full" size="lg">
              客戶登入
            </Button>
          </Link>
          <Link href="/admin/login">
            <Button variant="secondary" className="w-full" size="lg">
              管理員登入
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
