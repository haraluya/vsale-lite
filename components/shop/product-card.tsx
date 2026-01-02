/**
 * ProductCard Component
 * Feature: 002-product-management (US6 - 前台客戶瀏覽商品列表)
 * Updated: Feature 003-series-and-pricing (US5 - 庫存狀態管理)
 *
 * 商品卡片元件,用於前台商品列表頁面
 * - 顯示商品圖片、名稱、編號、庫存狀態
 * - 不顯示價格 (FR-024)
 * - 不顯示實際庫存數量，僅顯示狀態標籤 (US5)
 * - Neo-Brutalism 設計風格
 */

import type { Product } from '@/types'
import Image from 'next/image'
import Link from 'next/link'
import { StockStatus } from './stock-status'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {

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

        {/* 系列標籤 */}
        {product.series_name && (
          <div className="inline-block rounded-none border-2 border-black bg-yellow-100 px-2 py-1 text-xs font-bold">
            {product.series_name}
          </div>
        )}

        {/* 庫存狀態 - 僅顯示狀態標籤，不顯示實際數量 */}
        <div className="flex justify-start">
          <StockStatus status={product.stock_status} size="sm" />
        </div>

        {/* 單位 */}
        <p className="text-sm text-gray-500">單位: {product.unit}</p>
      </div>
    </Link>
  )
}
