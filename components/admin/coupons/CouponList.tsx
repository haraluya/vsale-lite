/**
 * CouponList Component
 * Feature: 009-coupon-system (US2)
 *
 * 優惠券列表元件 (管理員用)
 * - 顯示優惠券列表（代碼、折扣方式、折扣值、狀態）
 * - 編輯/刪除操作
 * - 狀態 Badge 顯示
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Edit, Trash2, Calendar, Tag } from 'lucide-react'
import { deleteCoupon } from '@/lib/actions/coupons'
import type { Coupon } from '@/specs/009-coupon-system/contracts/coupons'
import { designTokens, getNeoBrutalismClasses } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useConfirm } from '@/lib/contexts/dialog-context'

interface CouponListProps {
  coupons: Coupon[]
  showArchived?: boolean // ✅ 新增：是否為彙整區模式
}

export function CouponList({ coupons, showArchived = false }: CouponListProps) {
  const confirm = useConfirm()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  // 過濾優惠券（主列表隱藏已刪除/已過期，彙整區全部顯示）
  const now = new Date()
  const filteredCoupons = showArchived
    ? coupons // 彙整區顯示所有
    : coupons.filter((c) => {
        const validUntil = new Date(c.valid_until)
        return c.status !== 'deleted' && now <= validUntil // 主列表隱藏已刪除與已過期
      })

  const handleDelete = async (couponId: string, couponCode: string) => {
    const confirmed = await confirm({
      title: '確認刪除',
      description: `確定要刪除優惠券「${couponCode}」嗎？此操作無法復原。`,
      variant: 'danger',
      confirmText: '刪除',
      cancelText: '取消',
    })

    if (!confirmed) {
      return
    }

    setLoading(couponId)
    try {
      const result = await deleteCoupon(couponId)
      if (result.success) {
        toast.success(result.message || '優惠券已刪除')
        router.refresh()
      } else {
        toast.error(result.message || '刪除失敗')
      }
    } catch (error: any) {
      toast.error(error.message || '刪除失敗')
    } finally {
      setLoading(null)
    }
  }

  const getStatusBadge = (coupon: Coupon) => {
    const now = new Date()
    const validFrom = new Date(coupon.valid_from)
    const validUntil = new Date(coupon.valid_until)

    if (coupon.status === 'inactive') {
      return (
        <span className="inline-flex items-center gap-1 rounded border-2 border-gray-400 bg-gray-100 px-2 py-1 text-xs font-bold text-gray-600">
          停用
        </span>
      )
    }

    if (coupon.status === 'deleted') {
      return (
        <span className="inline-flex items-center gap-1 rounded border-2 border-red-400 bg-red-100 px-2 py-1 text-xs font-bold text-red-600">
          已刪除
        </span>
      )
    }

    if (now < validFrom) {
      return (
        <span className="inline-flex items-center gap-1 rounded border-2 border-blue-400 bg-blue-100 px-2 py-1 text-xs font-bold text-blue-600">
          未開始
        </span>
      )
    }

    if (now > validUntil) {
      return (
        <span className="inline-flex items-center gap-1 rounded border-2 border-orange-400 bg-orange-100 px-2 py-1 text-xs font-bold text-orange-600">
          已過期
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 rounded border-2 border-green-400 bg-green-100 px-2 py-1 text-xs font-bold text-green-600">
        ✓ 有效
      </span>
    )
  }

  const getDiscountDisplay = (coupon: Coupon) => {
    if (coupon.discount_type === 'fixed') {
      return `$${coupon.discount_value}`
    }
    return `${coupon.discount_value}%`
  }

  const getDiscountTypeDisplay = (discountType: string) => {
    return discountType === 'fixed' ? '現金折扣' : '百分比折扣'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  if (filteredCoupons.length === 0) {
    return (
      <div className="border-3 border-black bg-white p-12 text-center shadow-neo">
        <p className="text-gray-500">
          {showArchived ? '目前沒有已刪除或已過期的優惠券' : '目前沒有有效的優惠券'}
        </p>
      </div>
    )
  }

  return (
    <>
      {/* 桌面版表格 */}
      <div className="hidden md:block overflow-x-auto border-3 border-black shadow-neo">
        <table className="w-full">
          <thead>
            <tr className="border-b-3 border-black bg-yellow-300">
              <th className={cn('px-6 py-4 text-left font-black', designTokens.typography.body.base)}>
                優惠券代碼
              </th>
              <th className={cn('px-6 py-4 text-left font-black', designTokens.typography.body.base)}>
                折扣方式
              </th>
              <th className={cn('px-6 py-4 text-left font-black', designTokens.typography.body.base)}>
                折扣值
              </th>
              <th className={cn('px-6 py-4 text-left font-black', designTokens.typography.body.base)}>
                最低金額
              </th>
              <th className={cn('px-6 py-4 text-left font-black', designTokens.typography.body.base)}>
                有效期限
              </th>
              <th className={cn('px-6 py-4 text-left font-black', designTokens.typography.body.base)}>
                狀態
              </th>
              <th className={cn('px-6 py-4 text-right font-black', designTokens.typography.body.base)}>
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredCoupons.map((coupon) => (
              <tr key={coupon.id} className="border-b-3 border-black last:border-b-0 bg-white">
                <td className={cn('px-6 py-4 font-mono font-bold', designTokens.typography.body.base)}>
                  {coupon.code_normalized}
                </td>
                <td className={cn('px-6 py-4 text-gray-600', designTokens.typography.body.base)}>
                  {getDiscountTypeDisplay(coupon.discount_type)}
                </td>
                <td className={cn('px-6 py-4 font-bold text-green-600', designTokens.typography.body.base)}>
                  {getDiscountDisplay(coupon)}
                </td>
                <td className={cn('px-6 py-4 text-gray-600', designTokens.typography.body.base)}>
                  {coupon.min_order_amount ? `$${coupon.min_order_amount}` : '無限制'}
                </td>
                <td className={cn('px-6 py-4 text-sm text-gray-600', designTokens.typography.caption)}>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {formatDate(coupon.valid_from)} ~ {formatDate(coupon.valid_until)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">{getStatusBadge(coupon)}</td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/admin/coupons/${coupon.id}`}
                      className={cn(
                        'inline-flex items-center gap-2 bg-white font-bold transition-all',
                        designTokens.neoBrutalism.border.full,
                        designTokens.neoBrutalism.shadow.mobile,
                        designTokens.neoBrutalism.hover,
                        designTokens.button.sm
                      )}
                    >
                      <Edit className="h-4 w-4" />
                      編輯
                    </Link>
                    <button
                      onClick={() => handleDelete(coupon.id, coupon.code_normalized)}
                      disabled={loading === coupon.id}
                      className={cn(
                        'inline-flex items-center gap-2 bg-red-500 font-bold text-white transition-all disabled:opacity-50',
                        designTokens.neoBrutalism.border.full,
                        designTokens.neoBrutalism.shadow.mobile,
                        designTokens.neoBrutalism.hover,
                        designTokens.button.sm
                      )}
                    >
                      <Trash2 className="h-4 w-4" />
                      {loading === coupon.id ? '刪除中...' : '刪除'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 手機版卡片 */}
      <div className="md:hidden space-y-4">
        {filteredCoupons.map((coupon) => (
          <div
            key={coupon.id}
            className="border-3 border-black bg-white p-4 shadow-neo"
          >
            {/* 優惠券代碼與狀態 */}
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-mono text-xl font-black">
                {coupon.code_normalized}
              </h3>
              {getStatusBadge(coupon)}
            </div>

            {/* 折扣資訊 */}
            <div className="mb-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">折扣方式:</span>
                <span className="font-bold">
                  {getDiscountTypeDisplay(coupon.discount_type)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">折扣值:</span>
                <span className="font-bold text-green-600">
                  {getDiscountDisplay(coupon)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">最低金額:</span>
                <span className="font-bold">
                  {coupon.min_order_amount ? `$${coupon.min_order_amount}` : '無限制'}
                </span>
              </div>
            </div>

            {/* 有效期限 */}
            <div className="mb-4 border-t-2 border-gray-200 pt-3">
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>
                  {formatDate(coupon.valid_from)} ~ {formatDate(coupon.valid_until)}
                </span>
              </div>
            </div>

            {/* 操作按鈕 */}
            <div className="flex gap-2">
              <Link
                href={`/admin/coupons/${coupon.id}`}
                className={cn(
                  'flex-1 inline-flex items-center justify-center gap-2 bg-white font-bold transition-all',
                  designTokens.neoBrutalism.border.full,
                  designTokens.neoBrutalism.shadow.mobile,
                  designTokens.neoBrutalism.hover,
                  designTokens.button.sm
                )}
              >
                <Edit className="h-4 w-4" />
                編輯
              </Link>
              <button
                onClick={() => handleDelete(coupon.id, coupon.code_normalized)}
                disabled={loading === coupon.id}
                className={cn(
                  'flex-1 inline-flex items-center justify-center gap-2 bg-red-500 font-bold text-white transition-all disabled:opacity-50',
                  designTokens.neoBrutalism.border.full,
                  designTokens.neoBrutalism.shadow.mobile,
                  designTokens.neoBrutalism.hover,
                  designTokens.button.sm
                )}
              >
                <Trash2 className="h-4 w-4" />
                {loading === coupon.id ? '刪除中...' : '刪除'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
