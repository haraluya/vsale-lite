/**
 * 客戶端圖片壓縮工具
 *
 * 使用 browser-image-compression 將圖片壓縮至 1-2MB
 * 目的：縮短上傳時間，節省網路流量
 *
 * Feature: 圖片上傳超時問題改善
 * Related: lib/supabase/client-upload.ts
 */

import imageCompression from 'browser-image-compression'

export interface CompressionOptions {
  maxSizeMB?: number // 最大檔案大小（MB）
  maxWidthOrHeight?: number // 最大寬高（px）
  useWebWorker?: boolean // 使用 Web Worker（避免阻塞 UI）
}

/**
 * 壓縮商品圖片
 *
 * @param file 原始圖片檔案
 * @param options 壓縮選項
 * @returns 壓縮後的 File 物件
 *
 * @example
 * ```typescript
 * const file = e.target.files[0]
 * const compressed = await compressProductImage(file)
 * console.log('原始大小:', file.size, '壓縮後:', compressed.size)
 * ```
 */
export async function compressProductImage(
  file: File,
  options?: CompressionOptions
): Promise<File> {
  const defaultOptions: CompressionOptions = {
    maxSizeMB: 1.5, // 壓縮至 1.5MB（平衡品質與速度）
    maxWidthOrHeight: 1920, // 最大 1920px（符合 Full HD）
    useWebWorker: true, // 使用 Worker 避免阻塞
  }

  const finalOptions = { ...defaultOptions, ...options }

  try {
    const compressedFile = await imageCompression(file, finalOptions)

    console.log('🖼️ 圖片壓縮完成:', {
      原始大小: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      壓縮後大小: `${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`,
      壓縮率: `${((1 - compressedFile.size / file.size) * 100).toFixed(1)}%`,
    })

    return compressedFile
  } catch (error) {
    console.error('圖片壓縮失敗，使用原始檔案:', error)
    return file // 壓縮失敗則使用原檔
  }
}

/**
 * 檢查是否需要壓縮
 *
 * @param file 圖片檔案
 * @returns 是否需要壓縮
 *
 * @example
 * ```typescript
 * if (shouldCompress(file)) {
 *   file = await compressProductImage(file)
 * }
 * ```
 */
export function shouldCompress(file: File): boolean {
  const threshold = 1.5 * 1024 * 1024 // 1.5MB
  return file.size > threshold
}
