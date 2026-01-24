/**
 * 圖片快取破壞工具函式
 *
 * 問題：Supabase Storage 設定了 1 小時快取，導致圖片更新後前台仍顯示舊圖片
 * 解決方案：在圖片 URL 加上時間戳記查詢參數（?t=timestamp）
 *
 * @example
 * const imageUrl = addImageCacheBusting('https://example.com/image.jpg', new Date('2024-01-01'))
 * // => 'https://example.com/image.jpg?t=1704067200000'
 */

/**
 * 為圖片 URL 加上快取破壞參數
 *
 * @param url - 原始圖片 URL
 * @param updatedAt - 更新時間（Date 或 ISO 字串）
 * @returns 帶有時間戳記的 URL
 */
export function addImageCacheBusting(
  url: string | null | undefined,
  updatedAt?: Date | string | null
): string {
  // 若沒有 URL，回傳空字串
  if (!url) return ''

  // 若沒有更新時間，使用當前時間（確保每次都重新載入）
  const timestamp = updatedAt
    ? new Date(updatedAt).getTime()
    : Date.now()

  // 檢查 URL 是否已經有查詢參數
  const separator = url.includes('?') ? '&' : '?'

  return `${url}${separator}t=${timestamp}`
}

/**
 * 批次處理多張圖片的快取破壞
 *
 * @param images - 圖片物件陣列（包含 url 和 updatedAt）
 * @returns 處理後的圖片物件陣列
 */
export function addImagesCacheBusting<T extends { url?: string | null }>(
  images: T[],
  updatedAt?: Date | string | null
): T[] {
  return images.map(image => ({
    ...image,
    url: addImageCacheBusting(image.url, updatedAt)
  }))
}
