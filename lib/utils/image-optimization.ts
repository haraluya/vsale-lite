/**
 * Image Optimization Utilities
 * ⭐ 優化：圖片格式優化
 *
 * 提供圖片 URL 優化功能：
 * - Cloudinary 圖片：直接返回原始 URL（由 Next.js Image loader 自動優化）
 * - Supabase 圖片：添加 Image Transformation 參數
 * - 其他圖片：直接返回原始 URL
 */

/**
 * Supabase Image Transformation 參數
 */
export interface ImageTransformOptions {
  width?: number // 圖片寬度
  height?: number // 圖片高度
  quality?: number // 品質（1-100，預設 80）
  format?: 'webp' | 'avif' | 'origin' // 輸出格式
  resize?: 'cover' | 'contain' | 'fill' // 調整模式
}

/**
 * 優化圖片 URL
 *
 * @param url - 原始圖片 URL
 * @param options - 轉換選項（僅適用於 Supabase）
 * @returns 優化後的圖片 URL
 *
 * @example
 * ```ts
 * // Cloudinary 圖片 - 直接返回（Next.js Image 會自動優化）
 * const url1 = optimizeImage('vsale/products/xxx.jpg')
 * // → 'vsale/products/xxx.jpg'
 *
 * // Supabase 圖片 - 添加轉換參數
 * const url2 = optimizeImage('https://xxx.supabase.co/storage/...', { width: 600 })
 * // → 'https://xxx.supabase.co/storage/...?width=600&format=webp&quality=80'
 * ```
 */
export function optimizeImage(
  url: string | null | undefined,
  options: ImageTransformOptions = {}
): string {
  if (!url) return ''

  // 1. Cloudinary 圖片 - 直接返回（Next.js Image loader 會自動處理）
  if (url.includes('cloudinary.com') || !url.startsWith('http')) {
    return url
  }

  // 2. Supabase Storage URL - 直接返回原始 URL
  // Image Transformation 為 Pro Plan 功能，Free Plan 加參數會回傳 400
  // Next.js Image 元件已內建圖片優化（格式轉換、尺寸調整）
  return url
}

/**
 * 為商品卡片優化圖片
 * - Cloudinary: 由 Next.js Image 自動優化
 * - Supabase: 寬度 300px, WebP 格式, 品質 80%
 */
export function optimizeProductCardImage(url: string | null | undefined): string {
  return optimizeImage(url, {
    width: 300,
    quality: 80,
    format: 'webp'
  })
}

/**
 * 為輪播圖優化圖片
 * - Cloudinary: 由 Next.js Image 自動優化
 * - Supabase: 寬度 1920px, WebP 格式, 品質 85%
 */
export function optimizeCarouselImage(url: string | null | undefined): string {
  return optimizeImage(url, {
    width: 1920,
    quality: 85,
    format: 'webp'
  })
}

/**
 * 為系列卡片優化圖片
 * - Cloudinary: 由 Next.js Image 自動優化
 * - Supabase: 寬度 600px, WebP 格式, 品質 80%
 */
export function optimizeSeriesCardImage(url: string | null | undefined): string {
  return optimizeImage(url, {
    width: 600,
    quality: 80,
    format: 'webp'
  })
}

/**
 * 為商品詳情頁優化圖片
 * - Cloudinary: 由 Next.js Image 自動優化
 * - Supabase: 寬度 1200px, WebP 格式, 品質 85%
 */
export function optimizeProductDetailImage(url: string | null | undefined): string {
  return optimizeImage(url, {
    width: 1200,
    quality: 85,
    format: 'webp'
  })
}
