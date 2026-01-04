import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, AlertCircle } from 'lucide-react'
import { getAdmins } from '@/lib/actions/admins'
import { checkAuth } from '@/lib/actions/helpers'
import { AdminListClient } from '@/components/admin/AdminListClient'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading'

export const metadata = {
  title: '管理員帳號管理 | Vsale-lite',
  description: '管理工作人員帳號',
}

async function AdminsContent() {
  // 權限檢查
  const { user } = await checkAuth('admin')

  // 查詢管理員列表
  const result = await getAdmins({ page: 1, limit: 100 })

  if (!result.success || !result.data) {
    return (
      <div className="rounded-none border-3 border-red-500 bg-red-50 p-6 shadow-neo">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <p className="text-sm font-bold text-red-800">
            {result.message || '無法載入管理員列表'}
          </p>
        </div>
      </div>
    )
  }

  const { admins } = result.data

  return <AdminListClient admins={admins} currentUserId={user.userId} />
}

export default async function AdminsPage() {
  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black">管理員帳號管理</h1>
          <p className="mt-2 text-sm text-gray-600">
            管理工作人員帳號，建立、編輯、重設密碼、刪除
          </p>
        </div>

        <Link href="/admin/system/admins/new">
          <Button className="inline-flex items-center gap-2">
            <Plus className="h-5 w-5" />
            新增管理員
          </Button>
        </Link>
      </div>

      {/* 管理員列表 */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner className="h-8 w-8" />
            <span className="ml-3 text-sm font-bold text-gray-500">載入中...</span>
          </div>
        }
      >
        <AdminsContent />
      </Suspense>
    </div>
  )
}
