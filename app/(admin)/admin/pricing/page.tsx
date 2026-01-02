/**
 * Pricing Management Page (價格管理頁面)
 * Feature: 003-series-and-pricing (US2)
 *
 * 管理員批量價格設定頁面
 * - 選擇商品
 * - 設定所有等級的價格
 */

import { getProducts } from '@/lib/actions/products'
import { getAllTiersWithPrices } from '@/lib/actions/tier-prices'
import { TierPriceTable } from '@/components/admin/tier-price-table'
import { ProductSelector } from '@/components/admin/product-selector'
import { Suspense } from 'react'

interface PricingPageProps {
  searchParams: Promise<{ product_id?: string }>
}

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const params = await searchParams
  const productId = params.product_id

  // 取得所有商品列表
  const { products } = await getProducts({
    status: 'all',
    limit: 1000,
  })

  // 如果有選擇商品,取得該商品的等級價格資訊
  let selectedProduct = null
  let tiersWithPrices: any[] = []

  if (productId) {
    selectedProduct = products.find((p) => p.id === productId) || null

    if (selectedProduct) {
      const tiersResult = await getAllTiersWithPrices(productId)
      tiersWithPrices = (tiersResult.success ? tiersResult.data : []) || []
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">價格管理</h1>
        <p className="mt-2 text-gray-600">批量設定商品在各等級的價格</p>
      </div>

      {/* 商品選擇 */}
      <ProductSelector products={products} selectedProductId={productId} />

      {/* 等級價格設定表格 */}
      {selectedProduct && tiersWithPrices.length > 0 ? (
        <Suspense fallback={<div>載入中...</div>}>
          <TierPriceTable product={selectedProduct} tiersWithPrices={tiersWithPrices} />
        </Suspense>
      ) : productId ? (
        <div className="rounded-none border-3 border-black bg-white p-12 text-center shadow-neo">
          <p className="text-lg text-gray-500">無法載入商品或等級資料</p>
        </div>
      ) : (
        <div className="rounded-none border-3 border-black bg-white p-12 text-center shadow-neo">
          <p className="text-lg text-gray-500">請先選擇商品</p>
        </div>
      )}
    </div>
  )
}
