'use client'

import { useState } from 'react'
import {
  Image as ImageIcon,
  Package,
  Type,
  ChevronsUp,
  ChevronUp,
  ChevronDown,
  ChevronsDown,
} from 'lucide-react'

interface Block {
  id: string
  name: string
  type: string
  sort_order: number
}

interface QuickActionSortProps {
  initialBlocks: Block[]
}

export function QuickActionSort({ initialBlocks }: QuickActionSortProps) {
  const [blocks, setBlocks] = useState(initialBlocks)
  const [lastAction, setLastAction] = useState<string>('')

  // 根據類型選擇圖示
  const getIcon = (type: string) => {
    if (type.includes('圖片')) return <ImageIcon className="h-5 w-5" />
    if (type.includes('商品')) return <Package className="h-5 w-5" />
    if (type.includes('文字')) return <Type className="h-5 w-5" />
    return <Package className="h-5 w-5" />
  }

  function moveToTop(id: string) {
    const index = blocks.findIndex((b) => b.id === id)
    if (index === 0) return

    const newBlocks = [...blocks]
    const [item] = newBlocks.splice(index, 1)
    newBlocks.unshift(item)
    setBlocks(newBlocks)
    setLastAction(`「${item.name}」已移到頂部`)
  }

  function moveUp(id: string) {
    const index = blocks.findIndex((b) => b.id === id)
    if (index === 0) return

    const newBlocks = [...blocks]
    ;[newBlocks[index - 1], newBlocks[index]] = [
      newBlocks[index],
      newBlocks[index - 1],
    ]
    setBlocks(newBlocks)
    setLastAction(`「${newBlocks[index - 1].name}」已上移`)
  }

  function moveDown(id: string) {
    const index = blocks.findIndex((b) => b.id === id)
    if (index === blocks.length - 1) return

    const newBlocks = [...blocks]
    ;[newBlocks[index], newBlocks[index + 1]] = [
      newBlocks[index + 1],
      newBlocks[index],
    ]
    setBlocks(newBlocks)
    setLastAction(`「${newBlocks[index + 1].name}」已下移`)
  }

  function moveToBottom(id: string) {
    const index = blocks.findIndex((b) => b.id === id)
    if (index === blocks.length - 1) return

    const newBlocks = [...blocks]
    const [item] = newBlocks.splice(index, 1)
    newBlocks.push(item)
    setBlocks(newBlocks)
    setLastAction(`「${item.name}」已移到底部`)
  }

  function handleReset() {
    setBlocks(initialBlocks)
    setLastAction('已重置為初始順序')
  }

  return (
    <div>
      {/* 說明 */}
      <div className="mb-4 rounded-theme-sm border border-blue-600 bg-blue-50 p-3">
        <p className="text-sm text-blue-800">
          💡 <strong>操作方式：</strong>
          使用四個按鈕快速調整：「移到頂部」、「上移」、「下移」、「移到底部」。
          每次操作立即生效，不需要額外儲存。
        </p>
      </div>

      {/* 列表 */}
      <div className="space-y-3">
        {blocks.map((block, index) => {
          const isFirst = index === 0
          const isLast = index === blocks.length - 1

          return (
            <div
              key={block.id}
              className="flex items-center gap-3 rounded-theme-sm border bg-white p-4 shadow-neo-sm"
            >
              {/* 順序號碼 */}
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-theme-sm border bg-yellow-300 font-bold">
                {index + 1}
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

              {/* 操作按鈕 */}
              <div className="flex flex-shrink-0 gap-1">
                {/* 移到頂部 */}
                <button
                  onClick={() => moveToTop(block.id)}
                  disabled={isFirst}
                  title="移到頂部"
                  className={`rounded-theme-sm border p-2 transition-all ${
                    isFirst
                      ? 'cursor-not-allowed bg-gray-200 text-gray-400'
                      : 'bg-blue-400 hover:-translate-y-0.5 hover:shadow-theme-hover'
                  }`}
                >
                  <ChevronsUp className="h-4 w-4" />
                </button>

                {/* 上移 */}
                <button
                  onClick={() => moveUp(block.id)}
                  disabled={isFirst}
                  title="上移"
                  className={`rounded-theme-sm border p-2 transition-all ${
                    isFirst
                      ? 'cursor-not-allowed bg-gray-200 text-gray-400'
                      : 'bg-green-400 hover:-translate-y-0.5 hover:shadow-theme-hover'
                  }`}
                >
                  <ChevronUp className="h-4 w-4" />
                </button>

                {/* 下移 */}
                <button
                  onClick={() => moveDown(block.id)}
                  disabled={isLast}
                  title="下移"
                  className={`rounded-theme-sm border p-2 transition-all ${
                    isLast
                      ? 'cursor-not-allowed bg-gray-200 text-gray-400'
                      : 'bg-yellow-400 hover:-translate-y-0.5 hover:shadow-theme-hover'
                  }`}
                >
                  <ChevronDown className="h-4 w-4" />
                </button>

                {/* 移到底部 */}
                <button
                  onClick={() => moveToBottom(block.id)}
                  disabled={isLast}
                  title="移到底部"
                  className={`rounded-theme-sm border p-2 transition-all ${
                    isLast
                      ? 'cursor-not-allowed bg-gray-200 text-gray-400'
                      : 'bg-orange-400 hover:-translate-y-0.5 hover:shadow-theme-hover'
                  }`}
                >
                  <ChevronsDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* 操作記錄 */}
      {lastAction && (
        <div className="mt-4 rounded-theme-sm border border-green-600 bg-green-50 p-3">
          <p className="text-sm font-bold text-green-800">✅ {lastAction}</p>
        </div>
      )}

      {/* 重置按鈕 */}
      <div className="mt-6">
        <button
          onClick={handleReset}
          className="rounded-theme-sm border bg-gray-200 px-6 py-3 font-bold transition-all hover:-translate-y-0.5 hover:shadow-theme-hover"
        >
          重置為初始順序
        </button>
      </div>

      {/* 當前順序預覽 */}
      <div className="mt-6 rounded-theme-sm border border-gray-600 bg-gray-50 p-4">
        <h4 className="mb-2 font-bold text-gray-800">目前順序：</h4>
        <ol className="list-inside list-decimal space-y-1 text-sm text-gray-700">
          {blocks.map((block) => (
            <li key={block.id}>{block.name}</li>
          ))}
        </ol>
      </div>
    </div>
  )
}
