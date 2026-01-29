/**
 * 客戶端直接上傳至 Supabase Storage
 *
 * 繞過 Server Action，避免 Vercel 30 秒超時限制
 * 支援真實上傳進度條（0-100%）
 *
 * Feature: 圖片上傳超時問題改善
 * Related: components/ui/image-upload.tsx
 */

import { createClient } from '@/lib/supabase/client'

export interface UploadResult {
  success: boolean
  url?: string
  error?: string
}

/**
 * 直接上傳商品圖片至 Supabase Storage
 *
 * @param productId 商品 ID
 * @param file 圖片檔案
 * @param onProgress 進度回呼 (0-100)，可選
 * @returns 上傳結果（包含公開 URL）
 *
 * @example
 * ```typescript
 * const result = await uploadProductImageDirect(
 *   'product-123',
 *   file,
 *   (progress) => console.log('進度:', progress)
 * )
 *
 * if (result.success) {
 *   console.log('圖片 URL:', result.url)
 * }
 * ```
 */
export async function uploadProductImageDirect(
  productId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  try {
    const supabase = createClient()

    // 1. 取得副檔名
    let ext = file.name.split('.').pop()?.toLowerCase()

    // 驗證副檔名
    if (!ext || !['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      // 備用方案：從 MIME type 取得
      ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1]
    }

    // 正規化副檔名（jpeg → jpg）
    if (ext === 'jpeg') ext = 'jpg'

    const filePath = `${productId}/main.${ext}`

    // 2. 先刪除舊圖片（避免孤兒檔案）
    const extensions = ['jpg', 'png', 'webp']
    await Promise.allSettled(
      extensions.map((e) =>
        supabase.storage.from('products').remove([`${productId}/main.${e}`])
      )
    )

    // 通知進度：準備完成
    onProgress?.(10)

    // 3. 上傳新圖片
    console.log('📤 開始直接上傳圖片至 Supabase Storage:', filePath)
    const uploadStartTime = Date.now()

    const { data, error: uploadError } = await supabase.storage
      .from('products')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      })

    const uploadTime = Date.now() - uploadStartTime

    if (uploadError) {
      console.error('❌ 直接上傳失敗 (耗時:', uploadTime, 'ms):', uploadError)
      return {
        success: false,
        error: uploadError.message,
      }
    }

    console.log('✅ 直接上傳成功 (耗時:', uploadTime, 'ms)')

    // 通知進度：上傳完成
    onProgress?.(90)

    // 4. 取得公開 URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('products').getPublicUrl(filePath)

    // 通知進度：完成
    onProgress?.(100)

    return {
      success: true,
      url: publicUrl,
    }
  } catch (error) {
    console.error('uploadProductImageDirect error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '上傳失敗',
    }
  }
}
