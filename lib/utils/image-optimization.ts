/**
 * Image Optimization Utilities
 * ⭐ 優化：圖片格式優化與 Supabase Image Transformation
 *
 * 提供圖片 URL 優化功能：
 * - 自動添加 WebP 格式轉換
 * - 響應式尺寸調整
 * - 品質壓縮
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
 * 優化 Supabase Storage 圖片 URL（使用 Image Transformation API）
 *
 * @param url - 原始圖片 URL
 * @param options - 轉換選項
 * @returns 優化後的圖片 URL
 *
 * @example
 * ```ts
 * // 轉換為 WebP 格式，寬度 600px，品質 80%
 * const optimizedUrl = optimizeSupabaseImage(imageUrl, {
 *   width: 600,
 *   quality: 80,
 *   format: 'webp'
 * })
 * ```
 */
export function optimizeSupabaseImage(
  url: string | null | undefined,
  options: ImageTransformOptions = {}
): string {
  if (!url) return ''

  // 檢查是否為 Supabase Storage URL
  if (!url.includes('supabase.co/storage/v1/object/public/')) {
    return url
  }

  // 預設選項
  const {
    width,
    height,
    quality = 80,
    format = 'webp',
    resize = 'cover'
  } = options

  // 建構查詢參數
  const params = new URLSearchParams()

  if (width) params.append('width', width.toString())
  if (height) params.append('height', height.toString())
  if (quality && quality !== 100) params.append('quality', quality.toString())
  if (format && format !== 'origin') params.append('format', format)
  if (resize && resize !== 'cover') params.append('resize', resize)

  // 如果沒有任何轉換參數，直接返回原始 URL
  if (params.toString() === '') {
    return url
  }

  // 添加查詢參數（保留原有參數）
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}${params.toString()}`
}

/**
 * 為商品卡片優化圖片
 * - 寬度 300px
 * - WebP 格式
 * - 品質 80%
 */
export function optimizeProductCardImage(url: string | null | undefined): string {
  return optimizeSupabaseImage(url, {
    width: 300,
    quality: 80,
    format: 'webp'
  })
}

/**
 * 為輪播圖優化圖片
 * - 寬度 1920px（桌面全寬）
 * - WebP 格式
 * - 品質 85%（較高品質，因為是主視覺）
 */
export function optimizeCarouselImage(url: string | null | undefined): string {
  return optimizeSupabaseImage(url, {
    width: 1920,
    quality: 85,
    format: 'webp'
  })
}

/**
 * 為系列卡片優化圖片
 * - 寬度 600px
 * - WebP 格式
 * - 品質 80%
 */
export function optimizeSeriesCardImage(url: string | null | undefined): string {
  return optimizeSupabaseImage(url, {
    width: 600,
    quality: 80,
    format: 'webp'
  })
}

/**
 * 為商品詳情頁優化圖片
 * - 寬度 1200px
 * - WebP 格式
 * - 品質 85%
 */
export function optimizeProductDetailImage(url: string | null | undefined): string {
  return optimizeSupabaseImage(url, {
    width: 1200,
    quality: 85,
    format: 'webp'
  })
}
