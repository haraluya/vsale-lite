'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteAdmin, resetPassword } from '@/lib/actions/admins'
import { MemberList } from './MemberList'
import type { AdminProfile } from '@/types'
import { useConfirm, usePrompt, useAlert } from '@/lib/contexts/dialog-context'

interface MemberListClientProps {
  admins: AdminProfile[]
  currentUserId: string
}

export function MemberListClient({ admins, currentUserId }: MemberListClientProps) {
  const router = useRouter()
  const confirm = useConfirm()
  const prompt = usePrompt()
  const alert = useAlert()
  const [isProcessing, setIsProcessing] = useState(false)

  async function handleDelete(adminId: string, username: string) {
    if (isProcessing) return

    const confirmed = await confirm({
      title: '刪除成員',
      description: `確定要刪除成員「${username}」嗎？\n\n此操作無法復原。`,
      variant: 'danger'
    })

    if (!confirmed) return

    setIsProcessing(true)
    try {
      const result = await deleteAdmin({ admin_id: adminId })
      if (result.success) {
        await alert({
          title: '刪除成功',
          message: '成員已刪除',
          variant: 'success'
        })
        router.refresh()
      } else {
        await alert({
          title: '刪除失敗',
          message: result.message || '刪除失敗',
          variant: 'error'
        })
      }
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleResetPassword(adminId: string, username: string) {
    if (isProcessing) return

    const result = await prompt({
      title: '重設密碼',
      message: `請輸入「${username}」的新密碼（密碼須至少 6 字元）`,
      fields: [
        {
          name: 'password',
          label: '新密碼',
          type: 'text',
          placeholder: '請輸入新密碼...',
          required: true,
          validation: (value) => value.length < 6 ? '密碼須至少 6 字元' : null
        }
      ]
    })

    if (!result) return

    const newPassword = result.password

    setIsProcessing(true)
    try {
      const resetResult = await resetPassword({ admin_id: adminId, new_password: newPassword })
      if (resetResult.success) {
        await alert({
          title: '重設成功',
          message: '密碼重設成功',
          variant: 'success'
        })
      } else {
        await alert({
          title: '重設失敗',
          message: resetResult.message || '密碼重設失敗',
          variant: 'error'
        })
      }
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <MemberList
      admins={admins}
      currentUserId={currentUserId}
      onDelete={handleDelete}
      onResetPassword={handleResetPassword}
    />
  )
}
