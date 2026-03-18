'use client'

import { useReportWebVitals } from 'next/web-vitals'

export function WebVitals() {
  useReportWebVitals((metric) => {
    // 僅在生產環境記錄
    if (process.env.NODE_ENV !== 'production') return

    const { name, value, rating } = metric

    // 記錄到 console（可替換為 analytics 服務）
    if (rating === 'poor') {
      console.warn(`[Web Vitals] ${name}: ${Math.round(value)}ms (${rating})`)
    }
  })

  return null
}
