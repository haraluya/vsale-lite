'use client'

import { ShoppingCart, Plus, Minus } from 'lucide-react'
import { useState } from 'react'

interface MockProduct {
  name: string
  image: string
  retailPrice: number
  tierPrice?: number
  stock: number
  tags?: string[]
  series: string
}

const mockProducts: MockProduct[] = [
  {
    name: '經典美式咖啡豆 1kg',
    image: '☕',
    retailPrice: 680,
    tierPrice: 480,
    stock: 156,
    tags: ['hot'],
    series: '咖啡豆系列',
  },
  {
    name: '有機抹茶粉 500g',
    image: '🍵',
    retailPrice: 1200,
    tierPrice: 850,
    stock: 42,
    tags: ['new'],
    series: '茶品系列',
  },
  {
    name: '黃金曼特寧 精選',
    image: '✨',
    retailPrice: 960,
    stock: 0,
    tags: ['limited'],
    series: '咖啡豆系列',
  },
  {
    name: '伯爵紅茶 罐裝 200g',
    image: '🫖',
    retailPrice: 520,
    tierPrice: 380,
    stock: -5,
    tags: ['sale'],
    series: '茶品系列',
  },
]

function ProductCard({ product }: { product: MockProduct }) {
  const [qty, setQty] = useState(1)
  const hasDiscount = !!product.tierPrice

  const stockLabel =
    product.stock > 0
      ? `庫存 ${product.stock}`
      : product.stock === 0
        ? '缺貨中'
        : `欠貨 ${Math.abs(product.stock)}`

  const stockColor =
    product.stock > 0
      ? 'var(--color-success)'
      : product.stock === 0
        ? 'var(--color-warning)'
        : 'var(--color-error)'

  const tagConfig: Record<string, { label: string; bgVar: string; borderVar: string; textVar: string }> = {
    hot: { label: '熱銷', bgVar: '--color-tag-hot-bg', borderVar: '--color-tag-hot-border', textVar: '--color-tag-hot-text' },
    new: { label: '新品', bgVar: '--color-tag-new-bg', borderVar: '--color-tag-new-border', textVar: '--color-tag-new-text' },
    limited: { label: '限量', bgVar: '--color-tag-limited-bg', borderVar: '--color-tag-limited-border', textVar: '--color-tag-limited-text' },
    sale: { label: '特價', bgVar: '--color-tag-sale-bg', borderVar: '--color-tag-sale-border', textVar: '--color-tag-sale-text' },
  }

  return (
    <div
      className="flex flex-col overflow-hidden transition-all"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: `var(--theme-border-width, 2px) solid var(--color-border)`,
        borderRadius: 'var(--theme-radius, 0px)',
        boxShadow: 'var(--shadow-neo)',
      }}
    >
      {/* 圖片區域 */}
      <div
        className="relative aspect-square flex items-center justify-center text-5xl"
        style={{ backgroundColor: 'var(--color-surface-secondary)' }}
      >
        {product.image}
        {/* 標籤 */}
        {product.tags?.map((tag) => {
          const config = tagConfig[tag]
          if (!config) return null
          return (
            <span
              key={tag}
              className="absolute top-2 left-2 px-2 py-0.5 text-xs font-bold"
              style={{
                backgroundColor: `var(${config.bgVar})`,
                border: `1px solid var(${config.borderVar})`,
                color: `var(${config.textVar})`,
                borderRadius: 'var(--theme-radius-sm, 0px)',
              }}
            >
              {config.label}
            </span>
          )
        })}
      </div>

      {/* 資訊區域 */}
      <div className="flex flex-col gap-1.5 p-3">
        <p
          className="text-[11px]"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {product.series}
        </p>
        <h3
          className="text-sm line-clamp-2 leading-tight"
          style={{
            fontWeight: 'var(--theme-font-weight-heading, 700)' as unknown as number,
            color: 'var(--color-text-primary)',
          }}
        >
          {product.name}
        </h3>

        {/* 價格 */}
        <div className="flex items-baseline gap-2">
          {hasDiscount && (
            <span className="text-base font-bold" style={{ color: 'var(--color-primary)' }}>
              ${product.tierPrice}
            </span>
          )}
          <span
            className={hasDiscount ? 'text-xs line-through' : 'text-base font-bold'}
            style={{ color: hasDiscount ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}
          >
            ${product.retailPrice}
          </span>
        </div>

        {/* 庫存 */}
        <span className="text-xs font-medium" style={{ color: stockColor }}>
          {stockLabel}
        </span>

        {/* 數量選擇 + 加入購物車 */}
        <div className="flex items-center gap-2 mt-1">
          <div
            className="flex items-center"
            style={{
              border: `var(--theme-border-width, 2px) solid var(--color-border)`,
              borderRadius: 'var(--theme-radius-sm, 0px)',
            }}
          >
            <button
              onClick={() => setQty(Math.max(1, qty - 1))}
              className="p-1.5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <Minus className="h-3 w-3" />
            </button>
            <span
              className="px-2 text-sm font-medium min-w-[28px] text-center"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {qty}
            </span>
            <button
              onClick={() => setQty(qty + 1)}
              className="p-1.5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          <button
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-text-inverse)',
              border: `var(--theme-border-width, 2px) solid var(--color-primary)`,
              borderRadius: 'var(--theme-radius-sm, 0px)',
              boxShadow: 'var(--shadow-neo-sm)',
            }}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            加入
          </button>
        </div>
      </div>
    </div>
  )
}

export function DemoProductCard() {
  return (
    <section>
      <h2
        className="text-lg mb-4"
        style={{ fontWeight: 'var(--theme-font-weight-heading, 700)' as unknown as number, color: 'var(--color-text-primary)' }}
      >
        商品卡片
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {mockProducts.map((product) => (
          <ProductCard key={product.name} product={product} />
        ))}
      </div>
    </section>
  )
}
