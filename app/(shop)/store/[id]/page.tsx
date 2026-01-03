/**
 * Product Detail Page (商品詳情頁)
 * Feature: 002-product-management (US6 - 前台客戶瀏覽商品列表)
 * Updated: Feature 003-series-and-pricing (US5 - 庫存狀態管理)
 *
 * 前台商品詳情頁面
 * - 顯示商品完整資訊
 * - 不顯示價格 (FR-024)
 * - 不顯示實際庫存數量，僅顯示狀態標籤 (US5)
 * - 提供返回列表連結
 */

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getProduct } from '@/lib/actions/products'
import { StockStatus } from '@/components/shop/stock-status'
import Image from 'next/image'
import Link from 'next/link'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface ProductDetailPageProps {
  params: Promise<{
    id: string
  }>
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

  return (
    <div className={cn(
      "min-h-screen bg-background",
      designTokens.spacing.page.padding
    )}>
      <div className={cn(
        designTokens.container.narrow,
        designTokens.spacing.page.gap
      )}>
        {/* Back Button */}
        <Link
          href="/store"
          className={cn(
            "inline-flex items-center gap-2 rounded-none bg-white font-bold transition-all",
            designTokens.neoBrutalism.border.full,
            "border-black",
            designTokens.neoBrutalism.shadow.mobile,
            "md:shadow-neo",
            designTokens.neoBrutalism.hover,
            "px-3 py-2 md:px-4",
            "min-h-[44px]",
            designTokens.spacing.section.marginBottom
          )}
        >
          ← 返回商品列表
        </Link>

        {/* Product Detail */}
        <div className={cn(
          "grid md:grid-cols-2",
          designTokens.spacing.grid.gap
        )}>
          {/* 商品圖片 */}
          <div className={cn(
            "rounded-none bg-white",
            designTokens.neoBrutalism.border.full,
            "border-black",
            designTokens.neoBrutalism.shadow.full,
            designTokens.spacing.card.padding
          )}>
            <div className={cn(
              "aspect-square overflow-hidden rounded-none bg-gray-100",
              designTokens.neoBrutalism.border.mobile,
              "border-black"
            )}>
              {product.image_url ? (
                <Image
                  src={product.image_url}
                  alt={product.name}
                  width={600}
                  height={600}
                  className="h-full w-full object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-6xl md:text-8xl lg:text-9xl text-gray-300">
                  📦
                </div>
              )}
            </div>
          </div>

          {/* 商品資訊 */}
          <div className={designTokens.spacing.card.gap}>
            <div className={cn(
              "rounded-none bg-white",
              designTokens.neoBrutalism.border.full,
              "border-black",
              designTokens.neoBrutalism.shadow.full,
              designTokens.spacing.card.padding
            )}>
              <h1 className={cn(
                designTokens.typography.h1,
                "mb-3 md:mb-4"
              )}>{product.name}</h1>

              <div className={designTokens.spacing.card.gap}>
                {/* 商品編號 */}
                <div className={cn(
                  "rounded-none bg-gray-50",
                  designTokens.neoBrutalism.border.mobile,
                  "border-black",
                  "p-2.5 md:p-3"
                )}>
                  <p className={cn(
                    designTokens.typography.label,
                    "text-gray-600"
                  )}>商品編號</p>
                  <p className={cn(
                    "font-mono",
                    designTokens.typography.body.large
                  )}>{product.code}</p>
                </div>

                {/* 系列 */}
                {product.series_name && (
                  <div className={cn(
                    "rounded-none bg-gray-50",
                    designTokens.neoBrutalism.border.mobile,
                    "border-black",
                    "p-2.5 md:p-3"
                  )}>
                    <p className={cn(
                      designTokens.typography.label,
                      "text-gray-600"
                    )}>商品系列</p>
                    <p className={designTokens.typography.body.large}>{product.series_name}</p>
                  </div>
                )}

                {/* 單位 */}
                <div className={cn(
                  "rounded-none bg-gray-50",
                  designTokens.neoBrutalism.border.mobile,
                  "border-black",
                  "p-2.5 md:p-3"
                )}>
                  <p className={cn(
                    designTokens.typography.label,
                    "text-gray-600"
                  )}>銷售單位</p>
                  <p className={designTokens.typography.body.large}>{product.unit}</p>
                </div>

                {/* 庫存狀態 - 僅顯示狀態標籤，不顯示實際數量 */}
                <div className={cn(
                  "rounded-none bg-gray-50",
                  designTokens.neoBrutalism.border.mobile,
                  "border-black",
                  "p-3 md:p-4"
                )}>
                  <p className={cn(
                    designTokens.typography.label,
                    "mb-2 text-gray-600"
                  )}>庫存狀態</p>
                  <StockStatus status={product.stock_status} size="lg" />
                </div>
              </div>
            </div>

            {/* 商品描述 */}
            {product.description && (
              <div className={cn(
                "rounded-none bg-white",
                designTokens.neoBrutalism.border.full,
                "border-black",
                designTokens.neoBrutalism.shadow.full,
                designTokens.spacing.card.padding
              )}>
                <h2 className={cn(
                  designTokens.typography.h2,
                  "mb-2 md:mb-3"
                )}>商品描述</h2>
                <p className={cn(
                  "whitespace-pre-wrap text-gray-700",
                  designTokens.typography.body.base
                )}>{product.description}</p>
              </div>
            )}

            {/* 提示訊息 */}
            <div className={cn(
              "rounded-none bg-blue-50",
              "border-2 border-blue-600",
              "p-3 md:p-4"
            )}>
              <p className={cn(
                designTokens.typography.caption,
                "text-blue-800"
              )}>
                💡 如需下單,請聯絡您的業務人員或使用購物車功能
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
