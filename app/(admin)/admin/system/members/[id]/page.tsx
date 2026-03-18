import Link from 'next/link'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { getAdminById, updateAdmin } from '@/lib/actions/admins'
import { checkAuth } from '@/lib/actions/helpers'
import { MemberForm } from '@/components/admin/MemberForm'
import { Button } from '@/components/ui/button'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import type { ActionResult } from '@/types'
import { generatePageMetadata } from '@/lib/metadata'

export async function generateMetadata() {
  return generatePageMetadata('編輯成員', '修改工作人員資料')
}

export default async function EditAdminPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // 權限檢查
  await checkAuth('admin')

  const { id } = await params

  // 查詢成員資料
  const result = await getAdminById(id)

  if (!result.success || !result.data) {
    notFound()
  }

  const admin = result.data

  async function handleSubmit(
    prevState: ActionResult | null,
    formData: FormData
  ): Promise<ActionResult> {
    'use server'

    const display_name = formData.get('display_name') as string

    const result = await updateAdmin({
      admin_id: id,
      display_name: display_name || null,
    })

    if (result.success) {
      // 成功後導向列表頁
      redirect('/admin/system/members')
    }

    return result
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* 返回按鈕 */}
      <Link href="/admin/system/members">
        <Button
          variant="outline"
          className="inline-flex items-center gap-2 rounded-none border-2 border-black bg-surface px-4 py-2 text-sm font-bold hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </Button>
      </Link>

      {/* 頁面標題 */}
      <div className="rounded-none border-2 md:border-3 border-black bg-blue-400 p-6 shadow-neo">
        <h1 className="text-3xl font-black">編輯成員</h1>
        <p className="mt-2 text-sm font-bold text-foreground">
          修改「{admin.username}」的資料
        </p>
      </div>

      {/* 表單卡片 */}
      <div className="rounded-none border-2 md:border-3 border-black bg-surface p-6 shadow-neo">
        <MemberForm admin={admin} onSubmit={handleSubmit} submitLabel="儲存變更" />
      </div>

      {/* 說明 */}
      <div className="rounded-none border-2 border-gray-400 bg-surface-secondary p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-text-secondary mt-0.5" />
          <div className="text-xs text-text-secondary">
            <p className="font-bold mb-1">編輯說明：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>帳號（username）建立後無法修改</li>
              <li>如需修改密碼，請使用列表頁的「重設密碼」功能</li>
              <li>暱稱可隨時修改</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
