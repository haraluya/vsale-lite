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
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-theme-sm border bg-surface shadow-neo-sm active:scale-[0.98] transition-all"
            aria-label="開啟選單"
          >
            <Menu className="h-6 w-6" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] max-w-[80vw] p-0 overflow-x-hidden">
          <SheetTitle className="sr-only">導航選單</SheetTitle>
          <MobileSidebar onClose={() => setIsOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
