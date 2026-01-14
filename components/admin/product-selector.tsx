'use client'

/**
 * Product Selector Component
 * Feature: 003-series-and-pricing
 * 商品選擇器（用於價格管理頁面）
 */

import { useRouter } from 'next/navigation'
import type { Product } from '@/types'

interface ProductSelectorProps {
  products: Product[]
  selectedProductId?: string
}

export function ProductSelector({ products, selectedProductId }: ProductSelectorProps) {
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const productId = e.target.value
    if (productId) {
      router.push(`/admin/pricing?product_id=${productId}`)
    }
  }

  return (
    <div className="mb-6 rounded-none border-2 md:border-3 border-black bg-white p-6 shadow-neo">
      <h2 className="mb-4 text-xl font-bold">選擇商品</h2>

      <select
        name="product_id"
        defaultValue={selectedProductId || ''}
        onChange={handleChange}
        className="w-full rounded-none border-2 border-black px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">請選擇商品...</option>
        {products.map((product) => (
          <option key={product.id} value={product.id}>
            {product.code} - {product.name} {product.series_name && `(${product.series_name})`}
          </option>
        ))}
      </select>
    </div>
  )
}
