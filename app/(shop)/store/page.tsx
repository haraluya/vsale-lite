/**
 * Store Page (前台商品列表頁)
 * Feature: 002-product-management (US6 - 前台客戶瀏覽商品列表)
 *
 * 客戶端商品列表頁面
 * - 顯示所有啟用的商品
 * - 支援分類篩選
 * - 不顯示價格 (FR-024)
 * - 顯示庫存狀態 (包含負庫存)
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getProducts } from '@/lib/actions/products'
import { getCategories } from '@/lib/actions/categories'
import { ProductList } from '@/components/shop/product-list'
import { CategoryFilter } from '@/components/shop/category-filter'
import { Suspense } from 'react'

interface StorePageProps {
  searchParams: Promise<{
    category?: string
  }>
}

export default async function StorePage({ searchParams }: StorePageProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 查詢使用者資料
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, phone, tier_id, tiers(name)')
    .eq('id', user.id)
    .single()

  // 解析 searchParams
  const params = await searchParams
  const categoryId = params.category

  // 查詢商品列表 (僅顯示啟用的商品)
  const { products } = await getProducts({
    category_id: categoryId,
    status: 'active',
    limit: 100, // 前台一次顯示更多商品
  })

  // 查詢所有分類
  const categories = await getCategories()

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 rounded-none border-3 border-black bg-white p-6 shadow-neo">
          <h1 className="mb-2 text-3xl font-bold">商品列表</h1>
          <p className="text-gray-600">
            {profile?.display_name || profile?.phone} 您好!
          </p>
          {profile?.tiers && (
            <p className="mt-2 text-sm text-gray-500">
              會員等級: <span className="font-bold">{(profile.tiers as any).name}</span>
            </p>
          )}
        </div>

        {/* Category Filter */}
        <Suspense fallback={<div>載入中...</div>}>
          <div className="mb-6">
            <CategoryFilter categories={categories} />
          </div>
        </Suspense>

        {/* Product List */}
        <ProductList products={products} />
      </div>
    </div>
  )
}
