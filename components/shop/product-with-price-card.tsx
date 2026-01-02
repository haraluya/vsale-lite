/**
 * ProductWithPriceCard Component
 * Feature: 003-series-and-pricing (US1)
 *
 * 帶價格顯示的商品卡片元件(用於系列詳情頁)
 * - 顯示原價與會員等級價格
 * - 顯示折扣力度
 * - 顯示庫存狀態
 * - Neo-Brutalism 設計風格
 */

'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { ProductWithPrice } from '@/types'

interface ProductWithPriceCardProps {
  product: ProductWithPrice
  tierName: string
}

/**
 * 取得庫存狀態顯示(基於 stock_status 欄位)
 */
function getStockStatusDisplay(status: 'sufficient' | 'low' | 'out_of_stock') {
  switch (status) {
    case 'sufficient':
      return {
        text: '庫存充足',
        bgColor: 'bg-green-100',
        borderColor: 'border-green-600',
        textColor: 'text-green-800',
        icon: '✓',
      }
    case 'low':
      return {
        text: '庫存緊張',
        bgColor: 'bg-yellow-100',
        borderColor: 'border-yellow-600',
        textColor: 'text-yellow-800',
        icon: '⚠',
      }
    case 'out_of_stock':
      return {
        text: '暫時缺貨',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-600',
        textColor: 'text-red-800',
        icon: '✕',
      }
  }
}

export function ProductWithPriceCard({ product, tierName }: ProductWithPriceCardProps) {
  const stockDisplay = getStockStatusDisplay(product.stock_status)

  // 計算折扣百分比
  const discountPercent =
    product.retail_price && product.user_price
      ? Math.round(((product.retail_price - product.user_price) / product.retail_price) * 100)
      : 0

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
      <div className="space-y-3">
        <h3 className="line-clamp-2 text-lg font-bold">{product.name}</h3>

        <p className="text-sm text-gray-600">編號: {product.code}</p>

        {/* 價格顯示 */}
        {product.user_price !== null ? (
          <div className="rounded-none border-2 border-black bg-blue-50 p-3">
            {/* 原價 */}
            {product.retail_price && product.retail_price > product.user_price && (
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs text-gray-500">原價</span>
                <span className="text-sm text-gray-400 line-through">
                  ${product.retail_price}
                </span>
                {discountPercent > 0 && (
                  <span className="rounded-none border border-red-600 bg-red-100 px-1 py-0.5 text-xs font-bold text-red-700">
                    省 {discountPercent}%
                  </span>
                )}
              </div>
            )}

            {/* 會員價 */}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-600">
                ${product.user_price}
              </span>
              <span className="text-xs text-gray-600">
                ({tierName})
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-none border-2 border-gray-400 bg-gray-100 p-3">
            <p className="text-center text-sm font-bold text-gray-600">
              價格未設定
            </p>
          </div>
        )}

        {/* 庫存狀態 */}
        <div
          className={`rounded-none border-2 ${stockDisplay.borderColor} ${stockDisplay.bgColor} p-2 text-center text-sm font-bold ${stockDisplay.textColor}`}
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
