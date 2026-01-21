'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updateOrderDetails } from '@/lib/actions/orders'
import type { OrderDetail } from '@/types'
import type { OrderModificationsInput } from '@/lib/validations/order.schema'
import { Loader2, Trash2, Plus, X } from 'lucide-react'
import { useAlert, useConfirm, usePrompt } from '@/lib/contexts/dialog-context'

interface OrderEditorProps {
  order: OrderDetail
  onSave: () => void
  onCancel: () => void
}

interface EditedItem {
  id: string
  product_id: string | null
  series_id_snapshot: string | null
  product_name_snapshot: string
  deal_price: number
  quantity: number
  subtotal: number
  original_price: number
  original_quantity: number
  is_removed: boolean
}

interface EditedFee {
  id: string
  fee_name: string
  amount: number
  is_new: boolean
}

export function OrderEditor({ order, onSave, onCancel }: OrderEditorProps) {
  const alert = useAlert()
  const confirm = useConfirm()
  const prompt = usePrompt()
  const originalItems = order.items || []
  const originalFees = order.custom_fees || []

  // 初始化編輯狀態
  const [editedItems, setEditedItems] = useState<EditedItem[]>(
    originalItems.map(item => ({
      ...item,
      original_price: item.deal_price,
      original_quantity: item.quantity,
      is_removed: false,
    }))
  )

  const [editedFees, setEditedFees] = useState<EditedFee[]>(
    originalFees.map(fee => ({
      ...fee,
      is_new: false,
    }))
  )

  const [editedShippingFee, setEditedShippingFee] = useState(order.shipping_fee || 0)
  const [editedNotes, setEditedNotes] = useState(order.notes || '')
  const [loading, setLoading] = useState(false)

  // 計算商品總額（不含已移除）
  const itemsSubtotal = useMemo(() => {
    return editedItems
      .filter(item => !item.is_removed)
      .reduce((sum, item) => sum + item.subtotal, 0)
  }, [editedItems])

  // 計算費用總額
  const feesTotal = useMemo(() => {
    return editedFees.reduce((sum, fee) => sum + fee.amount, 0)
  }, [editedFees])

  // 計算優惠券折扣（從訂單中取得）
  const couponDiscount = useMemo(() => {
    return order.coupon?.discount_amount || 0
  }, [order])

  // 計算新總額
  const newTotalAmount = useMemo(() => {
    return itemsSubtotal - couponDiscount + editedShippingFee + feesTotal
  }, [itemsSubtotal, couponDiscount, editedShippingFee, feesTotal])

  // 修改商品單價（進位為整數）
  const handlePriceChange = (itemId: string, newPrice: number) => {
    const roundedPrice = Math.ceil(newPrice)
    setEditedItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? {
              ...item,
              deal_price: roundedPrice,
              subtotal: roundedPrice * item.quantity,
            }
          : item
      )
    )
  }

  // 修改商品數量（按鈕操作）
  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return // 數量至少為 1

    setEditedItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? {
              ...item,
              quantity: newQuantity,
              subtotal: item.deal_price * newQuantity,
            }
          : item
      )
    )
  }

  // 修改商品數量（輸入欄位）
  const handleQuantityInputChange = async (itemId: string, value: string) => {
    // 只允許數字
    if (value !== '' && !/^\d+$/.test(value)) {
      return
    }

    const newQuantity = parseInt(value, 10)

    // 驗證數量
    if (isNaN(newQuantity) || newQuantity < 1) {
      await alert({
        title: '輸入錯誤',
        message: '數量必須大於 0',
        variant: 'error'
      })
      return
    }

    if (newQuantity > 99999) {
      await alert({
        title: '輸入錯誤',
        message: '數量不可超過 99,999',
        variant: 'error'
      })
      return
    }

    handleQuantityChange(itemId, newQuantity)
  }

  // 標記商品為已移除
  const handleToggleRemoveItem = async (itemId: string) => {
    const activeItems = editedItems.filter(item => !item.is_removed)
    if (activeItems.length === 1 && activeItems[0].id === itemId) {
      await alert({
        title: '無法移除',
        message: '訂單至少需保留一個商品',
        variant: 'warning'
      })
      return
    }

    setEditedItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, is_removed: !item.is_removed }
          : item
      )
    )
  }

  // 新增自訂費用
  const handleAddFee = async () => {
    const result = await prompt({
      title: '新增自訂費用',
      message: '請輸入費用名稱與金額（可為負數表示折扣）',
      fields: [
        {
          name: 'feeName',
          label: '費用名稱',
          type: 'text',
          placeholder: '例：手續費、包裝費、優惠折扣',
          required: true
        },
        {
          name: 'amount',
          label: '金額',
          type: 'number',
          placeholder: '可輸入負數表示折扣',
          required: true
        }
      ]
    })

    if (!result) return

    const { feeName, amount } = result

    const newFee: EditedFee = {
      id: `temp-${Date.now()}`,
      fee_name: feeName.trim(),
      amount: parseFloat(amount),
      is_new: true,
    }

    setEditedFees(prev => [...prev, newFee])
  }

  // 移除費用
  const handleRemoveFee = (feeId: string) => {
    setEditedFees(prev => prev.filter(fee => fee.id !== feeId))
  }

  // 建構修改資料
  const buildModifications = (): OrderModificationsInput => {
    const itemsModified: OrderModificationsInput['items'] = []

    // 商品修改
    editedItems.forEach(item => {
      if (item.is_removed) {
        // 移除商品
        itemsModified.push({
          type: 'removed',
          item_id: item.id,
          product_name: item.product_name_snapshot,
        })
      } else {
        // 價格變更
        if (item.deal_price !== item.original_price) {
          itemsModified.push({
            type: 'price_changed',
            item_id: item.id,
            product_name: item.product_name_snapshot,
            old_price: item.original_price,
            new_price: item.deal_price,
          })
        }

        // 數量變更
        if (item.quantity !== item.original_quantity) {
          itemsModified.push({
            type: 'quantity_changed',
            item_id: item.id,
            product_name: item.product_name_snapshot,
            old_quantity: item.original_quantity,
            new_quantity: item.quantity,
          })
        }
      }
    })

    // 費用修改
    const feesModified: OrderModificationsInput['fees'] = []

    // 檢查已刪除的費用
    const editedFeeIds = new Set(editedFees.map(f => f.id))
    originalFees.forEach((originalFee: any) => {
      if (!editedFeeIds.has(originalFee.id)) {
        // 原有費用被刪除
        feesModified.push({
          type: 'removed',
          fee_id: originalFee.id,
          fee_name: originalFee.fee_name,
        })
      }
    })

    // 檢查新增的費用
    editedFees.forEach((fee: EditedFee) => {
      if (fee.is_new) {
        feesModified.push({
          type: 'added',
          fee_name: fee.fee_name,
          amount: fee.amount,
        })
      }
    })

    // 運費修改
    const shippingModified: OrderModificationsInput['shipping'] =
      editedShippingFee !== (order.shipping_fee || 0)
        ? {
            old_fee: order.shipping_fee || 0,
            new_fee: editedShippingFee,
          }
        : undefined

    // 備註修改
    const notesModified: OrderModificationsInput['notes'] =
      editedNotes !== (order.notes || '')
        ? {
            old_notes: order.notes || null,
            new_notes: editedNotes.trim() === '' ? null : editedNotes,
          }
        : undefined

    return {
      items: itemsModified.length > 0 ? itemsModified : undefined,
      fees: feesModified.length > 0 ? feesModified : undefined,
      shipping: shippingModified,
      notes: notesModified,
      coupon: undefined, // 優惠券處理由 US5 實作
    }
  }

  // 儲存變更（含優惠券驗證處理）
  const handleSave = async (skipCouponWarning = false) => {
    const modifications = buildModifications()

    // 檢查是否有變更
    if (
      (!modifications.items || modifications.items.length === 0) &&
      (!modifications.fees || modifications.fees.length === 0) &&
      !modifications.shipping &&
      !modifications.notes
    ) {
      await alert({
        title: '無任何修改',
        message: '沒有任何修改，無需儲存',
        variant: 'info'
      })
      return
    }

    // 計算統計
    const itemsCount = modifications.items?.length || 0
    const feesCount = modifications.fees?.filter(f => f.type === 'added').length || 0

    // 確認變更
    const confirmMsg = `
確認以下變更：

📦 商品變更: ${itemsCount} 項
💰 費用新增: ${feesCount} 項
🚚 運費: NT$${order.shipping_fee || 0} → NT$${editedShippingFee}

💵 訂單總額: NT$${order.total_amount.toFixed(0)} → NT$${newTotalAmount.toFixed(0)}

是否儲存變更？
    `.trim()

    const confirmed = await confirm({
      title: '確認儲存變更',
      description: confirmMsg
    })

    if (!confirmed) return

    setLoading(true)

    // Phase 8 (US5): 若已選擇移除優惠券，新增到 modifications
    if (skipCouponWarning) {
      modifications.coupon = { action: 'removed' }
    }

    const result = await updateOrderDetails(order.id, modifications)
    setLoading(false)

    // Phase 8 (US5): 處理優惠券警告
    if (result.success && result.data?.coupon_warning && !skipCouponWarning) {
      const removeCoupon = await confirm({
        title: '⚠️ 優惠券驗證失敗',
        description: `${result.data.coupon_warning}\n\n是否移除優惠券並重新儲存修改？\n\n• 點擊「確定」→ 移除優惠券並儲存\n• 點擊「取消」→ 保留優惠券，放棄修改`,
        variant: 'warning'
      })

      if (removeCoupon) {
        // 重新呼叫 handleSave，並移除優惠券
        await handleSave(true)
      } else {
        await alert({
          title: '已取消修改',
          message: '已取消訂單修改，優惠券保留',
          variant: 'info'
        })
      }
      return
    }

    if (result.success) {
      await alert({
        title: '修改成功',
        message: '訂單修改成功！',
        variant: 'success'
      })
      onSave()
    } else {
      await alert({
        title: '修改失敗',
        message: `修改失敗：${result.message}`,
        variant: 'error'
      })
    }
  }

  return (
    <div className="border-2 md:border-3 border-black bg-white p-6 space-y-6 shadow-neo">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-xl">📝 編輯訂單</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="text-gray-600 hover:text-black"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* 商品列表編輯 */}
      <div className="space-y-3">
        <h4 className="font-bold text-lg flex items-center gap-2">
          📦 商品明細
        </h4>

        {editedItems.map(item => {
          const priceChanged = item.deal_price !== item.original_price
          const quantityChanged = item.quantity !== item.original_quantity

          return (
            <div
              key={item.id}
              className={`border-2 border-black p-4 space-y-3 ${
                item.is_removed ? 'bg-red-50 opacity-60' : 'bg-white'
              }`}
            >
              {/* 商品名稱與移除按鈕 */}
              <div className="flex justify-between items-start">
                <div className="font-bold text-lg">
                  {item.is_removed && <span className="line-through">🗑️ </span>}
                  {item.product_name_snapshot}
                </div>
                <Button
                  variant={item.is_removed ? 'outline' : 'danger'}
                  size="sm"
                  onClick={() => handleToggleRemoveItem(item.id)}
                  disabled={loading}
                >
                  {item.is_removed ? '復原' : <Trash2 className="w-4 h-4" />}
                </Button>
              </div>

              {!item.is_removed && (
                <>
                  {/* 單價編輯 */}
                  <div className="flex items-center gap-3">
                    <Label className="w-20">單價:</Label>
                    {priceChanged && (
                      <span className="line-through text-gray-400">
                        NT${item.original_price.toFixed(0)}
                      </span>
                    )}
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={item.deal_price}
                      onChange={e => handlePriceChange(item.id, parseFloat(e.target.value) || 0)}
                      className="w-32 border-2 border-black"
                      disabled={loading}
                    />
                    {priceChanged && (
                      <span className="text-red-600 font-bold text-sm">已修改</span>
                    )}
                  </div>

                  {/* 數量編輯 */}
                  <div className="flex items-center gap-3">
                    <Label className="w-20">數量:</Label>
                    {quantityChanged && (
                      <span className="line-through text-gray-400">
                        {item.original_quantity}
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1 || loading}
                        className="border-2 border-black min-h-[40px] min-w-[40px]"
                      >
                        -
                      </Button>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={item.quantity}
                        onChange={e => handleQuantityInputChange(item.id, e.target.value)}
                        className="w-24 text-center border-2 border-black font-bold min-h-[40px]"
                        disabled={loading}
                        placeholder="數量"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        disabled={loading}
                        className="border-2 border-black min-h-[40px] min-w-[40px]"
                      >
                        +
                      </Button>
                    </div>
                    {quantityChanged && (
                      <span className="text-red-600 font-bold text-sm">已修改</span>
                    )}
                  </div>

                  {/* 小計 */}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                    <span className="font-bold">小計:</span>
                    <span className="text-lg font-bold">NT${item.subtotal.toFixed(0)}</span>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* 自訂費用 */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h4 className="font-bold text-lg">💵 自訂費用</h4>
          <Button
            onClick={handleAddFee}
            disabled={loading}
            size="sm"
            variant="outline"
            className="border-2 border-black"
          >
            <Plus className="w-4 h-4 mr-1" />
            新增費用
          </Button>
        </div>

        {editedFees.length === 0 ? (
          <p className="text-gray-500 text-sm">尚無自訂費用</p>
        ) : (
          <div className="space-y-2">
            {editedFees.map(fee => (
              <div
                key={fee.id}
                className={`flex justify-between items-center p-3 border-2 border-black ${
                  fee.is_new ? 'bg-green-50' : 'bg-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  {fee.is_new && <span className="text-green-600 font-bold text-sm">新增</span>}
                  <span>{fee.fee_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={fee.amount >= 0 ? '' : 'text-red-600'}>
                    {fee.amount >= 0 ? '+' : ''}NT${fee.amount.toFixed(0)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveFee(fee.id)}
                    disabled={loading}
                    className="text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 運費 */}
      <div className="space-y-2">
        <h4 className="font-bold text-lg">🚚 運費</h4>
        <div className="flex items-center gap-3">
          {editedShippingFee !== (order.shipping_fee || 0) && (
            <span className="line-through text-gray-400">
              NT${(order.shipping_fee || 0).toFixed(0)}
            </span>
          )}
          <Input
            type="number"
            min="0"
            step="1"
            value={editedShippingFee}
            onChange={e => setEditedShippingFee(Math.ceil(parseFloat(e.target.value)) || 0)}
            className="w-32 border-2 border-black"
            disabled={loading}
          />
          {editedShippingFee !== (order.shipping_fee || 0) && (
            <span className="text-red-600 font-bold text-sm">已修改</span>
          )}
          {editedShippingFee === 0 && (
            <span className="text-green-600 font-bold">免運</span>
          )}
        </div>
      </div>

      {/* 客戶備註 */}
      <div className="space-y-2">
        <h4 className="font-bold text-lg">📝 客戶備註</h4>
        <Textarea
          value={editedNotes}
          onChange={e => setEditedNotes(e.target.value)}
          placeholder="輸入客戶備註..."
          maxLength={500}
          rows={3}
          className="border-2 border-black resize-none"
          disabled={loading}
        />
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">
            {editedNotes.length} / 500 字
          </span>
          {editedNotes !== (order.notes || '') && (
            <span className="text-red-600 font-bold">已修改</span>
          )}
        </div>
      </div>

      {/* 總額摘要 */}
      <div className="border-t-2 md:border-t-3 border-black pt-4 space-y-2">
        <h4 className="font-bold text-lg">💰 訂單摘要</h4>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>商品金額:</span>
            <span>NT${itemsSubtotal.toFixed(0)}</span>
          </div>

          {couponDiscount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>優惠券折扣:</span>
              <span>-NT${couponDiscount.toFixed(0)}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span>運費:</span>
            <span>NT${editedShippingFee.toFixed(0)}</span>
          </div>

          {feesTotal !== 0 && (
            <div className="flex justify-between">
              <span>自訂費用:</span>
              <span className={feesTotal >= 0 ? '' : 'text-red-600'}>
                {feesTotal >= 0 ? '+' : ''}NT${feesTotal.toFixed(0)}
              </span>
            </div>
          )}
        </div>

        <div className="border-t-2 border-black pt-2 flex justify-between font-bold text-xl">
          <span>訂單總額:</span>
          <span
            className={
              newTotalAmount !== order.total_amount ? 'text-red-600' : ''
            }
          >
            NT${newTotalAmount.toFixed(0)}
          </span>
        </div>

        {newTotalAmount !== order.total_amount && (
          <p className="text-sm text-gray-600">
            原總額: NT${order.total_amount.toFixed(0)}
          </p>
        )}
      </div>

      {/* 操作按鈕 */}
      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 border-2 border-black"
        >
          取消編輯
        </Button>
        <Button
          onClick={() => handleSave()}
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 border-2 border-black shadow-neo-sm md:shadow-neo active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              儲存中...
            </>
          ) : (
            '💾 儲存變更'
          )}
        </Button>
      </div>
    </div>
  )
}
