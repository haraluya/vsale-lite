'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { User, Phone, Award, MapPin, FileText, Edit, ExternalLink, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { designTokens, getNeoBrutalismClasses } from '@/lib/design-tokens'
import { updateClientQuickInfo } from '@/lib/actions/clients'
import { toast } from 'sonner'

/**
 * 客戶快速檢視與編輯 Dialog
 * Feature: 訂單詳情頁面客戶資訊快速查看與編輯
 *
 * 功能:
 * - 顯示客戶基本資訊（姓名、手機、等級）
 * - 快速編輯客戶備註（admin_notes）與常用地址（address）
 * - 導向客戶詳細編輯頁面
 */

interface ClientQuickViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: {
    id: string
    name: string
    phone: string
    tier_name: string
    address: string | null
    admin_notes: string | null
  }
  onUpdate?: () => void
}

export function ClientQuickViewDialog({ open, onOpenChange, client, onUpdate }: ClientQuickViewDialogProps) {
  const router = useRouter()
  const [editMode, setEditMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [address, setAddress] = useState(client.address || '')
  const [adminNotes, setAdminNotes] = useState(client.admin_notes || '')

  // 當 Dialog 開啟時重置表單
  useEffect(() => {
    if (open) {
      setAddress(client.address || '')
      setAdminNotes(client.admin_notes || '')
      setEditMode(false)
    }
  }, [open, client.address, client.admin_notes])

  // 重置表單
  const resetForm = () => {
    setAddress(client.address || '')
    setAdminNotes(client.admin_notes || '')
    setEditMode(false)
  }

  // 處理儲存
  const handleSave = async () => {
    setIsSaving(true)
    try {
      const result = await updateClientQuickInfo(client.id, {
        address: address.trim() || null,
        admin_notes: adminNotes.trim() || null,
      })

      if (result.success) {
        toast.success('客戶資料已更新')
        setEditMode(false)
        onUpdate?.()
        onOpenChange(false) // ✅ 儲存成功後關閉 Dialog
        router.refresh()
      } else {
        toast.error(result.message || '更新失敗')
      }
    } catch (error) {
      toast.error('更新時發生錯誤')
      console.error('Update client error:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // 處理取消
  const handleCancel = () => {
    resetForm()
  }

  // 導向完整編輯頁面
  const handleViewFullDetails = () => {
    router.push(`/admin/clients/${client.id}/edit`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        'sm:max-w-[500px] rounded-none bg-white',
        getNeoBrutalismClasses(),
        'p-0'
      )}>
        <DialogHeader className={cn(
          'bg-gray-100 border-b-2 md:border-b-3 border-black',
          designTokens.spacing.card.padding
        )}>
          <DialogTitle className={designTokens.typography.h2}>
            客戶資訊
          </DialogTitle>
          <DialogDescription className={designTokens.typography.caption}>
            快速查看與編輯客戶資料
          </DialogDescription>
        </DialogHeader>

        <div className={cn(designTokens.spacing.card.padding, 'space-y-4')}>
          {/* 基本資訊（唯讀） */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-600" />
              <div>
                <div className={cn(designTokens.typography.caption, 'text-gray-600')}>客戶姓名</div>
                <div className={cn(designTokens.typography.body.base, 'font-bold')}>{client.name}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-600" />
              <div>
                <div className={cn(designTokens.typography.caption, 'text-gray-600')}>手機號碼</div>
                <div className={cn(designTokens.typography.body.base, 'font-bold')}>{client.phone}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Award className="h-5 w-5 text-gray-600" />
              <div>
                <div className={cn(designTokens.typography.caption, 'text-gray-600')}>會員等級</div>
                <div className={cn(designTokens.typography.body.base, 'font-bold')}>{client.tier_name}</div>
              </div>
            </div>
          </div>

          <div className="border-t-2 border-gray-200 my-4" />

          {/* 可編輯欄位 */}
          <div className="space-y-4">
            <div>
              <label className={cn(designTokens.typography.body.base, 'font-bold flex items-center gap-2 mb-2')}>
                <MapPin className="h-4 w-4" />
                常用地址
              </label>
              {editMode ? (
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="請輸入客戶常用地址"
                  rows={3}
                  className={cn(
                    'w-full rounded-none border-2 border-black px-3 py-2',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500',
                    designTokens.typography.body.base
                  )}
                />
              ) : (
                <div className={cn(
                  'rounded-none border-2 border-gray-300 bg-gray-50 px-3 py-2 min-h-[80px]',
                  designTokens.typography.body.base
                )}>
                  {client.address || '未設定'}
                </div>
              )}
            </div>

            <div>
              <label className={cn(designTokens.typography.body.base, 'font-bold flex items-center gap-2 mb-2')}>
                <FileText className="h-4 w-4" />
                管理員備註
              </label>
              {editMode ? (
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="請輸入管理員備註（客戶不可見）"
                  rows={4}
                  className={cn(
                    'w-full rounded-none border-2 border-black px-3 py-2',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500',
                    designTokens.typography.body.base
                  )}
                />
              ) : (
                <div className={cn(
                  'rounded-none border-2 border-yellow-300 bg-yellow-50 px-3 py-2 min-h-[100px]',
                  designTokens.typography.body.base,
                  client.admin_notes ? 'text-yellow-900' : 'text-gray-400'
                )}>
                  {client.admin_notes || '未設定'}
                </div>
              )}
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t-2 border-gray-200">
            {editMode ? (
              <>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={cn(
                    'flex-1 bg-green-600 hover:bg-green-700 text-white font-bold',
                    'border-2 border-black shadow-neo-sm',
                    'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
                    designTokens.button.md
                  )}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      儲存中...
                    </>
                  ) : (
                    '儲存變更'
                  )}
                </Button>
                <Button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className={cn(
                    'flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold',
                    'border-2 border-black shadow-neo-sm',
                    'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
                    designTokens.button.md
                  )}
                >
                  取消
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => setEditMode(true)}
                  className={cn(
                    'flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold',
                    'border-2 border-black shadow-neo-sm',
                    'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
                    designTokens.button.md
                  )}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  編輯資料
                </Button>
                <Button
                  onClick={handleViewFullDetails}
                  className={cn(
                    'flex-1 bg-white hover:bg-gray-50 text-gray-800 font-bold',
                    'border-2 border-black shadow-neo-sm',
                    'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
                    designTokens.button.md
                  )}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  完整資料
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
