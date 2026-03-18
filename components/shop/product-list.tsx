/**
 * ProductList Component
 * Feature: 002-product-management (US6 - 前台客戶瀏覽商品列表)
 *
 * 商品列表容器元件
 * - 以網格方式顯示商品卡片
 * - 空狀態處理
 * - 響應式設計 (手機單欄、平板雙欄、桌面三欄)
 */

import type { Product } from '@/types'
import { ProductCard } from './product-card'

interface ProductListProps {
  products: Product[]
}

export function ProductList({ products }: ProductListProps) {
  // 空狀態
  if (products.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-theme-sm border-theme bg-surface-secondary p-12">
        <div className="text-center">
          <div className="mb-4 text-6xl">📦</div>
          <h3 className="mb-2 text-xl font-bold">目前沒有商品</h3>
          <p className="text-text-secondary">請稍後再回來查看</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
