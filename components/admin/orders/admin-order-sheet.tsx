'use client'

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { UserPlus, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useConfirm } from '@/lib/contexts/dialog-context'
import { useAdminOrderDraft, type AdminOrderStep } from '@/hooks/use-admin-order-draft'
import { StepCustomerSelect } from './step-customer-select'
// StepProductSelect 和 StepCheckout 將在後續任務中建立
// 目前步驟 2 和 3 使用佔位元件

const STEPS: { step: AdminOrderStep; label: string }[] = [
  { step: 1, label: '選擇客戶' },
  { step: 2, label: '選擇商品' },
  { step: 3, label: '確認結帳' },
]

export function AdminOrderSheet() {
  const [open, setOpen] = useState(false)
  const confirm = useConfirm()
  const draft = useAdminOrderDraft()

  const handleOpenChange = async (newOpen: boolean) => {
    if (!newOpen && draft.hasItems) {
      const confirmed = await confirm({
        title: '放棄代客下單？',
        description: '已選擇的商品和設定將會清除。',
        confirmText: '確認放棄',
        cancelText: '繼續編輯',
      })
      if (!confirmed) return
    }
    if (!newOpen) {
      draft.resetDraft()
    }
    setOpen(newOpen)
  }

  const handleBack = () => {
    if (draft.currentStep > 1) {
      draft.setCurrentStep((draft.currentStep - 1) as AdminOrderStep)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <UserPlus className="h-4 w-4" />
        代客下單
      </Button>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl overflow-y-auto p-0"
        >
          <SheetHeader className="sticky top-0 z-10 bg-surface border-b px-4 py-3">
            <div className="flex items-center gap-3">
              {draft.currentStep > 1 && (
                <button
                  onClick={handleBack}
                  className="p-1 rounded-theme-sm hover:bg-gray-100"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <SheetTitle className="flex-1">代客下單</SheetTitle>
              {draft.selectedCustomer && (
                <span className="text-sm text-text-secondary">
                  {draft.selectedCustomer.displayName || draft.selectedCustomer.phone}
                </span>
              )}
            </div>
            <div className="flex gap-2 mt-2">
              {STEPS.map(({ step, label }) => (
                <div key={step} className="flex-1">
                  <div
                    className={cn(
                      'h-1 rounded-full transition-colors',
                      step <= draft.currentStep ? 'bg-blue-500' : 'bg-gray-200'
                    )}
                  />
                  <span
                    className={cn(
                      'text-xs mt-1 block',
                      step === draft.currentStep ? 'text-blue-600 font-medium' : 'text-text-secondary'
                    )}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </SheetHeader>

          <div className="p-4">
            {draft.currentStep === 1 && (
              <StepCustomerSelect draft={draft} />
            )}
            {draft.currentStep === 2 && (
              <div className="text-center text-text-secondary py-8">商品選擇（待實作）</div>
            )}
            {draft.currentStep === 3 && (
              <div className="text-center text-text-secondary py-8">確認結帳（待實作）</div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
