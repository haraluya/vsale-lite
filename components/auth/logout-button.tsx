'use client'

import { logout } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { LoadingSpinner } from '@/components/ui/loading'

export function LogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      // 注意：logout() 會執行 redirect()，所以這裡不會執行到
    } catch (error) {
      // 檢查是否為 Next.js 的 redirect 錯誤（正常登出流程）
      if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        // 這是正常的登出流程，不需要處理
        return
      }
      // 其他錯誤才記錄
      console.error('登出失敗:', error)
      setIsLoggingOut(false)
    }
  }

  return (
    <Button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="w-full"
      variant="secondary"
    >
      {isLoggingOut && <LoadingSpinner className="mr-2" />}
      <LogOut className="h-4 w-4 mr-2" />
      {isLoggingOut ? '登出中...' : '登出當前帳號'}
    </Button>
  )
}
