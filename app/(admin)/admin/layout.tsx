import Link from 'next/link'
import { LayoutDashboard, Users, Tag, LogOut } from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r-3 border-black bg-white p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Vsale-lite</h1>
          <p className="text-sm text-gray-600">管理後台</p>
        </div>

        <nav className="space-y-2">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3 rounded-none border-3 border-black bg-white px-4 py-3 font-bold transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-neo-sm"
          >
            <LayoutDashboard className="h-5 w-5" />
            <span>儀表板</span>
          </Link>

          <Link
            href="/admin/tiers"
            className="flex items-center gap-3 rounded-none border-3 border-black bg-white px-4 py-3 font-bold transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-neo-sm"
          >
            <Tag className="h-5 w-5" />
            <span>會員等級</span>
          </Link>

          <Link
            href="/admin/clients"
            className="flex items-center gap-3 rounded-none border-3 border-black bg-white px-4 py-3 font-bold transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-neo-sm"
          >
            <Users className="h-5 w-5" />
            <span>客戶管理</span>
          </Link>
        </nav>

        <div className="mt-auto pt-8">
          <button className="flex w-full items-center gap-3 rounded-none border-3 border-black bg-red-500 px-4 py-3 font-bold text-white transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-neo-sm">
            <LogOut className="h-5 w-5" />
            <span>登出</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
