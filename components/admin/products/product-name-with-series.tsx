/**
 * Product Name with Series Badge Component
 * Feature: 016-product-management-enhancements
 * Purpose: 顯示 [系列名稱] 商品名稱，系列 Badge 使用專屬顏色
 */

import { cn } from '@/lib/utils'

interface ProductNameWithSeriesProps {
  productName: string
  seriesName: string
  seriesColor: string
  className?: string
}

export function ProductNameWithSeries({
  productName,
  seriesName,
  seriesColor,
  className,
}: ProductNameWithSeriesProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {/* 系列 Badge - 使用系列專屬顏色，字體放大 */}
      <span
        className="
          inline-flex items-center justify-center
          px-3 py-1.5
          text-sm font-bold
          border-2 border-black
          shadow-neo-sm
          rounded-none
          whitespace-nowrap
          transition-transform
          hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none
        "
        style={{
          backgroundColor: seriesColor,
          color: '#000000',
        }}
      >
        {seriesName}
      </span>

      {/* 商品名稱 - 字體放大，增加識別度 */}
      <span className="text-base font-semibold text-gray-900 leading-relaxed">
        {productName}
      </span>
    </div>
  )
}
