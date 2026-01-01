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
    } catch (error) {
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
