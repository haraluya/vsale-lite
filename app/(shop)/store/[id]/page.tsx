/**
 * Product Detail Page (商品詳情頁)
 * Feature: 002-product-management (US6 - 前台客戶瀏覽商品列表)
 *
 * 前台商品詳情頁面
 * - 顯示商品完整資訊
 * - 不顯示價格 (FR-024)
 * - 顯示庫存狀態 (包含負庫存)
 * - 提供返回列表連結
 */

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getProduct } from '@/lib/actions/products'
import Image from 'next/image'
import Link from 'next/link'

interface ProductDetailPageProps {
  params: Promise<{
    id: string
  }>
}

/**
 * 取得庫存狀態顯示
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
    return {
      text: `欠貨: ${Math.abs(stock)}`,
      bgColor: 'bg-red-100',
      borderColor: 'border-red-600',
      textColor: 'text-red-800',
      icon: '⚠',
    }
  }
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 解析 params
  const { id } = await params

  // 查詢商品詳情
  const product = await getProduct(id)

  if (!product) {
    notFound()
  }

  const stockDisplay = getStockDisplay(product.stock)

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-4xl">
        {/* Back Button */}
        <Link
          href="/store"
          className="mb-6 inline-block rounded-none border-2 border-black bg-white px-4 py-2 font-bold transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
        >
          ← 返回商品列表
        </Link>

        {/* Product Detail */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* 商品圖片 */}
          <div className="rounded-none border-3 border-black bg-white p-6 shadow-neo">
            <div className="aspect-square overflow-hidden rounded-none border-2 border-black bg-gray-100">
              {product.image_url ? (
                <Image
                  src={product.image_url}
                  alt={product.name}
                  width={600}
                  height={600}
                  className="h-full w-full object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-9xl text-gray-300">
                  📦
                </div>
              )}
            </div>
          </div>

          {/* 商品資訊 */}
          <div className="space-y-4">
            <div className="rounded-none border-3 border-black bg-white p-6 shadow-neo">
              <h1 className="mb-4 text-3xl font-bold">{product.name}</h1>

              <div className="space-y-3">
                {/* 商品編號 */}
                <div className="rounded-none border-2 border-black bg-gray-50 p-3">
                  <p className="text-sm font-bold text-gray-600">商品編號</p>
                  <p className="font-mono text-lg">{product.code}</p>
                </div>

                {/* 分類 */}
                {product.category_name && (
                  <div className="rounded-none border-2 border-black bg-gray-50 p-3">
                    <p className="text-sm font-bold text-gray-600">商品分類</p>
                    <p className="text-lg">{product.category_name}</p>
                  </div>
                )}

                {/* 單位 */}
                <div className="rounded-none border-2 border-black bg-gray-50 p-3">
                  <p className="text-sm font-bold text-gray-600">銷售單位</p>
                  <p className="text-lg">{product.unit}</p>
                </div>

                {/* 庫存狀態 */}
                <div
                  className={`rounded-none border-2 ${stockDisplay.borderColor} ${stockDisplay.bgColor} p-4`}
                >
                  <p className="mb-1 text-sm font-bold text-gray-600">庫存狀態</p>
                  <p className={`text-xl font-bold ${stockDisplay.textColor}`}>
                    <span className="mr-2">{stockDisplay.icon}</span>
                    {stockDisplay.text}
                  </p>
                </div>
              </div>
            </div>

            {/* 商品描述 */}
            {product.description && (
              <div className="rounded-none border-3 border-black bg-white p-6 shadow-neo">
                <h2 className="mb-3 text-xl font-bold">商品描述</h2>
                <p className="whitespace-pre-wrap text-gray-700">{product.description}</p>
              </div>
            )}

            {/* 提示訊息 */}
            <div className="rounded-none border-2 border-blue-600 bg-blue-50 p-4">
              <p className="text-sm text-blue-800">
                💡 如需下單,請聯絡您的業務人員或使用購物車功能
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
