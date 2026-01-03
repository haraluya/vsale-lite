'use client'

/**
 * 手機版導航按鈕 (漢堡菜單)
 * Feature: 005-responsive-ui
 *
 * 功能:
 * - 手機版顯示 (< md: 768px)
 * - 點擊開啟 Drawer (Sheet 元件)
 * - Neo-Brutalism 設計風格
 */

import { Menu } from 'lucide-react'
import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { MobileSidebar } from '@/components/admin/mobile-sidebar'

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="md:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <button
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-none border-2 border-black bg-white shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
            aria-label="開啟選單"
          >
            <Menu className="h-6 w-6" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-3/4 sm:max-w-sm p-0">
          <SheetTitle className="sr-only">導航選單</SheetTitle>
          <MobileSidebar onClose={() => setIsOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
