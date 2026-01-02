/**
 * ProductCard Component
 * Feature: 002-product-management (US6 - 前台客戶瀏覽商品列表)
 *
 * 商品卡片元件,用於前台商品列表頁面
 * - 顯示商品圖片、名稱、編號、庫存狀態
 * - 不顯示價格 (FR-024)
 * - 支援負庫存顯示
 * - Neo-Brutalism 設計風格
 */

import type { Product } from '@/types'
import Image from 'next/image'
import Link from 'next/link'

interface ProductCardProps {
  product: Product
}

/**
 * 取得庫存狀態顯示
 * @param stock 庫存數量
 * @returns 包含樣式和文字的物件
 */
function getStockDisplay(stock: number) {
  if (stock > 0) {
    return {
      text: `庫存: ${stock}`,
      bgColor: 'bg-green-100',
      borderColor: 'border-green-600',
      textColor: 'text-green-800',
      icon: '✓',
    }
  } else if (stock === 0) {
    return {
      text: '缺貨中',
      bgColor: 'bg-yellow-100',
      borderColor: 'border-yellow-600',
      textColor: 'text-yellow-800',
      icon: '⏳',
    }
  } else {
    // 負庫存 (欠貨/預購)
    return {
      text: `欠貨: ${Math.abs(stock)}`,
      bgColor: 'bg-red-100',
      borderColor: 'border-red-600',
      textColor: 'text-red-800',
      icon: '⚠',
    }
  }
}

export function ProductCard({ product }: ProductCardProps) {
  const stockDisplay = getStockDisplay(product.stock)

  return (
    <Link
      href={`/store/${product.id}`}
      className="group block rounded-none border-3 border-black bg-white p-4 shadow-neo transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
    >
      {/* 商品圖片 */}
      <div className="mb-4 aspect-square overflow-hidden rounded-none border-2 border-black bg-gray-100">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            width={300}
            height={300}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl text-gray-300">
            📦
          </div>
        )}
      </div>

      {/* 商品資訊 */}
      <div className="space-y-2">
        <h3 className="line-clamp-2 text-lg font-bold">{product.name}</h3>

        <p className="text-sm text-gray-600">編號: {product.code}</p>

        {/* 分類標籤 */}
        {product.category_name && (
          <div className="inline-block rounded-none border-2 border-black bg-yellow-100 px-2 py-1 text-xs font-bold">
            {product.category_name}
          </div>
        )}

        {/* 庫存狀態 */}
        <div
          className={`rounded-none border-2 ${stockDisplay.borderColor} ${stockDisplay.bgColor} p-2 text-sm font-bold ${stockDisplay.textColor}`}
        >
          <span className="mr-1">{stockDisplay.icon}</span>
          {stockDisplay.text}
        </div>

        {/* 單位 */}
        <p className="text-sm text-gray-500">單位: {product.unit}</p>
      </div>
    </Link>
  )
}
