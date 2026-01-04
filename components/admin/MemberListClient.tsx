'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteAdmin, resetPassword } from '@/lib/actions/admins'
import { AdminList } from './AdminList'
import type { AdminProfile } from '@/types'

interface AdminListClientProps {
  admins: AdminProfile[]
  currentUserId: string
}

export function AdminListClient({ admins, currentUserId }: AdminListClientProps) {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)

  async function handleDelete(adminId: string, username: string) {
    if (isProcessing) return

    const confirmed = confirm(
      `確定要刪除管理員「${username}」嗎？\n\n此操作無法復原。`
    )
    if (!confirmed) return

    setIsProcessing(true)
    try {
      const result = await deleteAdmin({ admin_id: adminId })
      if (result.success) {
        alert('管理員已刪除')
        router.refresh()
      } else {
        alert(result.message || '刪除失敗')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleResetPassword(adminId: string, username: string) {
    if (isProcessing) return

    const newPassword = prompt(
      `請輸入「${username}」的新密碼：\n\n密碼須至少 8 字元，包含大小寫字母與數字`
    )
    if (!newPassword) return

    setIsProcessing(true)
    try {
      const result = await resetPassword({ admin_id: adminId, new_password: newPassword })
      if (result.success) {
        alert('密碼重設成功')
      } else {
        alert(result.message || '密碼重設失敗')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <AdminList
      admins={admins}
      currentUserId={currentUserId}
      onDelete={handleDelete}
      onResetPassword={handleResetPassword}
    />
  )
}
