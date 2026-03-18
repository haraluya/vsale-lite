import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createAdmin } from '@/lib/actions/admins'
import { checkAuth } from '@/lib/actions/helpers'
import { MemberForm } from '@/components/admin/MemberForm'
import { Button } from '@/components/ui/button'
import { redirect } from 'next/navigation'
import type { ActionResult } from '@/types'
import { generatePageMetadata } from '@/lib/metadata'

export async function generateMetadata() {
  return generatePageMetadata('新增成員', '建立新的工作人員帳號')
}

export default async function NewMemberPage() {
  // 權限檢查
  await checkAuth('admin')

  async function handleSubmit(
    prevState: ActionResult | null,
    formData: FormData
  ): Promise<ActionResult> {
    'use server'

    const username = formData.get('username') as string
    const password = formData.get('password') as string
    const display_name = formData.get('display_name') as string

    const result = await createAdmin({
      username,
      password,
      display_name: display_name || undefined,
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
          className="inline-flex items-center gap-2 rounded-theme-sm border bg-surface px-4 py-2 text-sm font-bold hover:-translate-y-0.5 hover:shadow-theme-hover shadow-neo-sm transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </Button>
      </Link>

      {/* 頁面標題 */}
      <div className="rounded-theme-sm border-theme bg-yellow-400 p-6 shadow-neo">
        <h1 className="text-3xl font-black">新增成員</h1>
        <p className="mt-2 text-sm font-bold text-foreground">
          建立新的工作人員帳號
        </p>
      </div>

      {/* 表單卡片 */}
      <div className="rounded-theme-sm border-theme bg-surface p-6 shadow-neo">
        <MemberForm onSubmit={handleSubmit} submitLabel="建立帳號" />
      </div>

      {/* 提示說明 */}
      <div className="rounded-theme-sm border border-info bg-info-bg p-4">
        <p className="text-xs font-bold text-blue-900">
          💡 <strong>提示</strong>：帳號建立後即可使用帳號 + 密碼登入後台。暱稱會顯示於訂單留言、操作日誌等客戶互動場景。
        </p>
      </div>
    </div>
  )
}
