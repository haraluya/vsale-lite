'use client'

import { useState } from 'react'
import { Image as ImageIcon, Package, Type, Save, AlertCircle } from 'lucide-react'
import { useAlert } from '@/lib/contexts/dialog-context'

interface Block {
  id: string
  name: string
  type: string
  sort_order: number
}

interface BlockWithOrder extends Block {
  newOrder: number
}

interface NumberInputSortProps {
  initialBlocks: Block[]
}

export function NumberInputSort({ initialBlocks }: NumberInputSortProps) {
  const alert = useAlert()
  const [blocks, setBlocks] = useState<BlockWithOrder[]>(
    initialBlocks.map((b, i) => ({ ...b, newOrder: i + 1 }))
  )
  const [hasChanges, setHasChanges] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  // 根據類型選擇圖示
  const getIcon = (type: string) => {
    if (type.includes('圖片')) return <ImageIcon className="h-5 w-5" />
    if (type.includes('商品')) return <Package className="h-5 w-5" />
    if (type.includes('文字')) return <Type className="h-5 w-5" />
    return <Package className="h-5 w-5" />
  }

  function handleOrderChange(id: string, value: string) {
    const num = parseInt(value)
    if (isNaN(num) || num < 1 || num > blocks.length) {
      return
    }

    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, newOrder: num } : b))
    )
    setHasChanges(true)
    setErrors([])
  }

  function validateOrders(): string[] {
    const orders = blocks.map((b) => b.newOrder)
    const errors: string[] = []

    // 檢查是否有重複
    const duplicates = orders.filter(
      (order, index) => orders.indexOf(order) !== index
    )
    if (duplicates.length > 0) {
      errors.push(`有重複的順序號碼：${[...new Set(duplicates)].join(', ')}`)
    }

    // 檢查是否有缺漏
    const sortedOrders = [...orders].sort((a, b) => a - b)
    for (let i = 0; i < sortedOrders.length; i++) {
      if (sortedOrders[i] !== i + 1) {
        errors.push(`順序號碼不連續，缺少：${i + 1}`)
        break
      }
    }

    return errors
  }

  async function handleSave() {
    const validationErrors = validateOrders()
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    // 重新排序
    const sortedBlocks = [...blocks].sort((a, b) => a.newOrder - b.newOrder)
    setBlocks(sortedBlocks)
    setHasChanges(false)
    setErrors([])

    // 模擬儲存
    console.log('儲存新順序：', sortedBlocks)
    await alert({
      title: '順序已儲存',
      message: sortedBlocks.map((b, i) => `${i + 1}. ${b.name}`).join('\n'),
      variant: 'success',
    })
  }

  function handleReset() {
    setBlocks(initialBlocks.map((b, i) => ({ ...b, newOrder: i + 1 })))
    setHasChanges(false)
    setErrors([])
  }

  // 依照目前的 newOrder 排序顯示
  const displayBlocks = [...blocks].sort((a, b) => {
    // 先依照 newOrder 排序，如果相同則保持原順序
    if (a.newOrder === b.newOrder) {
      return blocks.indexOf(a) - blocks.indexOf(b)
    }
    return a.newOrder - b.newOrder
  })

  return (
    <div>
      {/* 說明 */}
      <div className="mb-4 rounded-theme-sm border border-blue-600 bg-blue-50 p-3">
        <p className="text-sm text-blue-800">
          💡 <strong>操作方式：</strong>
          在每個項目旁的輸入框輸入想要的順序號碼（1 = 第一位，2 = 第二位，依此類推）。
          順序號碼必須是 1 到 {blocks.length} 之間的數字，且不能重複。
        </p>
      </div>

      {/* 列表 */}
      <div className="space-y-3">
        {displayBlocks.map((block) => (
          <div
            key={block.id}
            className="flex items-center gap-3 rounded-theme-sm border bg-white p-4 shadow-neo-sm"
          >
            {/* 順序輸入框 */}
            <div className="flex-shrink-0">
              <input
                type="number"
                min={1}
                max={blocks.length}
                value={block.newOrder}
                onChange={(e) => handleOrderChange(block.id, e.target.value)}
                className="h-10 w-16 rounded-theme-sm border bg-yellow-300 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>

            {/* 圖示 */}
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-theme-sm border bg-gray-100">
              {getIcon(block.type)}
            </div>

            {/* 資訊 */}
            <div className="flex-1">
              <div className="font-bold">{block.name}</div>
              <div className="text-sm text-gray-600">{block.type}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 錯誤訊息 */}
      {errors.length > 0 && (
        <div className="mt-4 rounded-theme-sm border border-red-600 bg-red-50 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
            <div className="flex-1">
              <p className="font-bold text-red-800">無法儲存：</p>
              <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-red-700">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 操作按鈕 */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className={`flex items-center gap-2 rounded-theme-sm border px-6 py-3 font-bold transition-all ${
            hasChanges
              ? 'bg-green-400 hover:-translate-y-0.5 hover:shadow-theme-hover'
              : 'cursor-not-allowed bg-gray-300 text-gray-500'
          }`}
        >
          <Save className="h-5 w-5" />
          儲存順序
        </button>
        <button
          onClick={handleReset}
          disabled={!hasChanges}
          className={`rounded-theme-sm border px-6 py-3 font-bold transition-all ${
            hasChanges
              ? 'bg-gray-200 hover:-translate-y-0.5 hover:shadow-theme-hover'
              : 'cursor-not-allowed bg-gray-300 text-gray-500'
          }`}
        >
          重置
        </button>
      </div>

      {/* 變更提示 */}
      {hasChanges && errors.length === 0 && (
        <p className="mt-3 text-sm font-bold text-orange-600">
          ⚠️ 你有未儲存的變更！記得點擊「儲存順序」按鈕。
        </p>
      )}
    </div>
  )
}
