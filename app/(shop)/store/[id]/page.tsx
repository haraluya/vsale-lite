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
import { generatePageMetadata } from '@/lib/metadata'

// ISR 快取策略：10 分鐘（商品詳情變動較少）
export const revalidate = 600

interface ProductDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: ProductDetailPageProps) {
  const { id } = await params
  const product = await getProduct(id)

  if (!product) {
    return generatePageMetadata('商品詳情', '查看商品詳細資訊')
  }

  return generatePageMetadata(
    product.name,
    `查看 ${product.name} 的詳細資訊`
  )
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

  const imageUrl = product.image_url

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
            "inline-flex items-center gap-2 rounded-theme-sm bg-surface font-bold transition-all",
            designTokens.cleanCommerce.border.full,
            "border-border",
            designTokens.cleanCommerce.shadow.base,
            "md:shadow-neo",
            designTokens.cleanCommerce.hover,
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
            "rounded-theme-sm bg-surface",
            designTokens.cleanCommerce.border.full,
            "border-border",
            designTokens.cleanCommerce.shadow.full,
            designTokens.spacing.card.padding
          )}>
            <div className={cn(
              "aspect-square overflow-hidden rounded-theme-sm bg-surface-secondary",
              designTokens.cleanCommerce.border.base,
              "border-border"
            )}>
              {imageUrl ? (
                <Image
                  src={imageUrl}
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
              "rounded-theme-sm bg-surface",
              designTokens.cleanCommerce.border.full,
              "border-border",
              designTokens.cleanCommerce.shadow.full,
              designTokens.spacing.card.padding
            )}>
              <h1 className={cn(
                designTokens.typography.h1,
                "mb-3 md:mb-4"
              )}>{product.name}</h1>

              <div className={designTokens.spacing.card.gap}>
                {/* 商品編號 */}
                <div className={cn(
                  "rounded-theme-sm bg-surface-secondary",
                  designTokens.cleanCommerce.border.base,
                  "border-border",
                  "p-2.5 md:p-3"
                )}>
                  <p className={cn(
                    designTokens.typography.label,
                    "text-text-secondary"
                  )}>商品編號</p>
                  <p className={cn(
                    "font-mono",
                    designTokens.typography.body.large
                  )}>{product.code}</p>
                </div>

                {/* 系列 */}
                {product.series_name && (
                  <div className={cn(
                    "rounded-theme-sm bg-surface-secondary",
                    designTokens.cleanCommerce.border.base,
                    "border-border",
                    "p-2.5 md:p-3"
                  )}>
                    <p className={cn(
                      designTokens.typography.label,
                      "text-text-secondary"
                    )}>商品系列</p>
                    <p className={designTokens.typography.body.large}>{product.series_name}</p>
                  </div>
                )}

                {/* 單位 */}
                <div className={cn(
                  "rounded-theme-sm bg-surface-secondary",
                  designTokens.cleanCommerce.border.base,
                  "border-border",
                  "p-2.5 md:p-3"
                )}>
                  <p className={cn(
                    designTokens.typography.label,
                    "text-text-secondary"
                  )}>銷售單位</p>
                  <p className={designTokens.typography.body.large}>{product.unit}</p>
                </div>

                {/* 庫存狀態 - 僅顯示狀態標籤，不顯示實際數量 */}
                <div className={cn(
                  "rounded-theme-sm bg-surface-secondary",
                  designTokens.cleanCommerce.border.base,
                  "border-border",
                  "p-3 md:p-4"
                )}>
                  <p className={cn(
                    designTokens.typography.label,
                    "mb-2 text-text-secondary"
                  )}>庫存狀態</p>
                  <StockStatus status={product.stock_status} size="lg" />
                </div>
              </div>
            </div>

            {/* 商品描述 */}
            {product.description && (
              <div className={cn(
                "rounded-theme-sm bg-gradient-to-br from-blue-50 to-purple-50",
                designTokens.cleanCommerce.border.full,
                "border-border",
                designTokens.cleanCommerce.shadow.full,
                designTokens.spacing.card.padding
              )}>
                <div className="flex items-center gap-2 mb-3 md:mb-4">
                  <div className={cn(
                    "rounded-theme-sm bg-blue-400",
                    "border",
                    "w-1 h-6 md:h-7"
                  )} />
                  <h2 className={cn(
                    designTokens.typography.h2,
                    "m-0"
                  )}>商品簡介</h2>
                </div>
                <p className={cn(
                  "whitespace-pre-wrap text-foreground leading-relaxed",
                  designTokens.typography.body.base
                )}>{product.description}</p>
                <div className={cn(
                  "mt-3 rounded-theme-sm bg-surface/70",
                  "border",
                  "px-3 py-2"
                )}>
                  <p className="text-xs text-text-secondary">
                    💡 商品列表顯示時，簡介會自動截短至約50字（3行）
                  </p>
                </div>
              </div>
            )}

            {/* 提示訊息 */}
            <div className={cn(
              "rounded-theme-sm bg-info-bg",
              "border border-info-border",
              "p-3 md:p-4"
            )}>
              <p className={cn(
                designTokens.typography.caption,
                "text-info"
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
