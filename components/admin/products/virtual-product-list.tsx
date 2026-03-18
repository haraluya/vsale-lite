'use client'

/**
 * Virtual Product List
 * Feature: Performance Optimization - Phase 3.1
 *
 * 虛擬滾動商品列表，優化大量商品（> 100 筆）的渲染性能
 * - 使用 @tanstack/react-virtual
 * - 每列高度 80px
 * - Overscan 5 列
 * - 預期提升：大列表渲染 -95% (3.5s → 0.15s)
 */

import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import Link from 'next/link'
import { Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductThumbnail } from '@/components/admin/products/product-thumbnail'
import { ProductNameWithSeries } from '@/components/admin/products/product-name-with-series'
import { ProductStatusToggle } from '@/components/admin/product-status-toggle'
import { TagBadgeList } from '@/components/ui/tag-badge'
import { designTokens, getThemeClasses } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import { formatAmount } from '@/lib/date-utils'
import type { Product, Series } from '@/types'

interface VirtualProductListProps {
  products: Product[]
  series: Series[]
  onDelete: (id: string, name: string) => Promise<void>
}

export function VirtualProductList({
  products,
  series,
  onDelete,
}: VirtualProductListProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  // 虛擬滾動配置
  const virtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // 每列高度 80px
    overscan: 5, // 預載 5 列
  })

  // 建立系列 Map 以快速查找
  const seriesMap = new Map(series.map((s) => [s.id, s]))

  return (
    <div className="space-y-4">
      {/* 桌面版：虛擬滾動表格 */}
      <div className="hidden lg:block">
        <div
          className={cn(
            'rounded-theme-sm bg-white overflow-hidden',
            designTokens.cleanCommerce.border.full,
            designTokens.cleanCommerce.shadow.full
          )}
        >
          {/* 表頭（固定） */}
          <div className="grid grid-cols-8 gap-4 border-b bg-gray-100 p-4 font-bold sticky top-0 z-10">
            <div>圖片</div>
            <div className="col-span-2">名稱 / 系列</div>
            <div>標籤</div>
            <div>庫存</div>
            <div className="text-right">建議售價</div>
            <div>狀態</div>
            <div className="text-center">操作</div>
          </div>

          {/* 虛擬滾動容器 */}
          <div
            ref={parentRef}
            className="relative overflow-auto"
            style={{ height: '600px' }} // 固定高度以啟用滾動
          >
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const product = products[virtualRow.index]
                const productSeries = product.series_id
                  ? seriesMap.get(product.series_id)
                  : null

                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    className="absolute top-0 left-0 w-full grid grid-cols-8 gap-4 p-4 border-b border-gray-200 items-center hover:bg-yellow-50 transition-colors"
                    style={{
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {/* 圖片 */}
                    <div>
                      <ProductThumbnail
                        productId={product.id}
                        imageUrl={product.image_url}
                        productName={product.name}
                      />
                    </div>

                    {/* 名稱 / 系列 */}
                    <div className="col-span-2">
                      <ProductNameWithSeries
                        productName={product.name}
                        seriesName={productSeries?.name || '未分類'}
                        seriesColor={productSeries?.color || '#gray'}
                      />
                    </div>

                    {/* 標籤 */}
                    <div>
                      {product.tags && product.tags.length > 0 ? (
                        <TagBadgeList tags={product.tags} maxTags={2} size="sm" />
                      ) : (
                        <span className="text-sm text-gray-400">無標籤</span>
                      )}
                    </div>

                    {/* 庫存 */}
                    <div
                      className={cn(
                        'font-mono font-bold',
                        product.stock <= 0
                          ? 'text-red-600'
                          : product.stock < 10
                            ? 'text-yellow-600'
                            : 'text-green-600'
                      )}
                    >
                      {product.stock}
                    </div>

                    {/* 建議售價 */}
                    <div className="text-right font-mono font-bold text-base text-brand-primary">
                      {product.retail_price ? formatAmount(product.retail_price) : '-'}
                    </div>

                    {/* 狀態 */}
                    <div>
                      <ProductStatusToggle
                        productId={product.id}
                        initialStatus={product.status}
                      />
                    </div>

                    {/* 操作 */}
                    <div className="flex gap-2 justify-center">
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="inline-flex items-center justify-center gap-1 rounded-theme-sm border bg-blue-100 px-3 py-1.5 text-xs font-bold shadow-neo-sm transition-all hover:-translate-y-0.5 hover:shadow-theme-hover"
                      >
                        <Edit className="h-3 w-3" />
                        編輯
                      </Link>

                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => onDelete(product.id, product.name)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 顯示總數 */}
        <div className="text-sm text-gray-600 mt-4">
          顯示 {products.length} 筆商品（虛擬滾動模式）
        </div>
      </div>

      {/* 手機版：卡片視圖（不使用虛擬滾動，因為手機通常使用分頁） */}
      <div className="lg:hidden space-y-3 md:space-y-4">
        {products.map((product) => {
          const productSeries = product.series_id ? seriesMap.get(product.series_id) : null

          return (
            <div
              key={product.id}
              className={cn(
                'rounded-theme-sm bg-white',
                getThemeClasses({ active: true }),
                designTokens.spacing.card.padding
              )}
            >
              <div className="flex gap-3 md:gap-4">
                {/* 圖片 */}
                <ProductThumbnail
                  productId={product.id}
                  imageUrl={product.image_url}
                  productName={product.name}
                />

                {/* 資訊 */}
                <div className="flex-1 min-w-0">
                  <ProductNameWithSeries
                    productName={product.name}
                    seriesName={productSeries?.name || '未分類'}
                    seriesColor={productSeries?.color || '#gray'}
                  />

                  {/* 標籤 */}
                  {product.tags && product.tags.length > 0 && (
                    <div className="mt-2">
                      <TagBadgeList tags={product.tags} maxTags={3} size="sm" />
                    </div>
                  )}

                  {/* 價格與庫存 */}
                  <div className="flex items-center gap-3 mt-2">
                    <div className="text-sm font-medium">
                      庫存:{' '}
                      <span
                        className={cn(
                          'font-mono font-bold',
                          product.stock <= 0
                            ? 'text-red-600'
                            : product.stock < 10
                              ? 'text-yellow-600'
                              : 'text-green-600'
                        )}
                      >
                        {product.stock}
                      </span>
                    </div>
                    {product.retail_price && (
                      <div className="text-base font-bold">
                        建議售價: <span className="font-mono text-brand-primary">{formatAmount(product.retail_price)}</span>
                      </div>
                    )}
                  </div>

                  {/* 狀態與操作 */}
                  <div className="flex items-center gap-2 mt-3">
                    <ProductStatusToggle
                      productId={product.id}
                      initialStatus={product.status}
                    />

                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="inline-flex items-center justify-center gap-1 rounded-theme-sm border bg-blue-100 px-3 py-1.5 text-xs font-bold shadow-neo-sm transition-all hover:-translate-y-0.5 hover:shadow-theme-hover"
                    >
                      <Edit className="h-3 w-3" />
                      編輯
                    </Link>

                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => onDelete(product.id, product.name)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
