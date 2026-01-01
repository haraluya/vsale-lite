/**
 * Supabase Storage 工具函式
 * Feature: 002-product-management
 */

import { createClient } from '@/lib/supabase/server'

/**
 * 上傳商品圖片至 Supabase Storage
 *
 * @param productId - 商品 ID
 * @param file - 圖片檔案
 * @returns 上傳後的公開 URL
 */
export async function uploadProductImage(
  productId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  try {
    const supabase = await createClient()

    // 取得檔案副檔名
    const ext = file.type.split('/')[1]
    const filePath = `${productId}/main.${ext}`

    // 上傳檔案 (覆寫模式)
    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(filePath, file, {
        cacheControl: '3600', // 1 小時快取
        upsert: true,  // 覆寫舊檔案
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return { url: null, error: uploadError.message }
    }

    // 取得公開 URL
    const { data } = supabase.storage
      .from('products')
      .getPublicUrl(filePath)

    return { url: data.publicUrl, error: null }
  } catch (error) {
    console.error('uploadProductImage error:', error)
    return { url: null, error: '圖片上傳失敗' }
  }
}

/**
 * 刪除商品圖片
 *
 * @param productId - 商品 ID
 * @returns 成功或失敗
 */
export async function deleteProductImage(
  productId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()

    // 刪除所有可能的副檔名 (不檢查錯誤,因為檔案可能不存在)
    await supabase.storage.from('products').remove([
      `${productId}/main.jpg`,
      `${productId}/main.png`,
      `${productId}/main.webp`,
    ])

    return { success: true, error: null }
  } catch (error) {
    console.error('deleteProductImage error:', error)
    return { success: false, error: '圖片刪除失敗' }
  }
}

/**
 * 取得商品圖片公開 URL
 *
 * @param imagePath - 圖片路徑 (例如: {productId}/main.jpg)
 * @returns 公開 URL
 */
export async function getProductImageUrl(imagePath: string): Promise<string> {
  const supabase = await createClient()

  const { data } = supabase.storage
    .from('products')
    .getPublicUrl(imagePath)

  return data.publicUrl
}
