'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * 首頁廣告區塊圖片清理工具
 *
 * 四種清理場景:
 * 1. delete_block: 刪除整個區塊目錄
 * 2. replace_image: 刪除特定索引圖片
 * 3. reduce_count: 刪除多餘圖片（從 oldCount 減少到 newCount）
 * 4. change_type: 區塊類型變更時刪除所有圖片
 */

type CleanupScenario = 'delete_block' | 'replace_image' | 'reduce_count' | 'change_type'

interface CleanupOptions {
  index?: number // replace_image 使用
  oldCount?: number // reduce_count 使用
  newCount?: number // reduce_count 使用
}

export async function deleteBlockImages(
  blockId: string,
  scenario: CleanupScenario,
  options?: CleanupOptions
): Promise<{ success: boolean; message?: string }> {
  try {
    const supabase = await createClient()
    const extensions = ['jpg', 'png', 'webp']

    let filesToDelete: string[] = []

    switch (scenario) {
      case 'delete_block':
        // Scenario 1: 刪除整個區塊目錄
        // 列出所有檔案並刪除
        const { data: files, error: listError } = await supabase.storage
          .from('products')
          .list(`home-page-blocks/${blockId}`)

        if (listError) {
          console.warn('列出區塊圖片失敗:', listError)
          return { success: false, message: '列出圖片失敗' }
        }

        if (files && files.length > 0) {
          filesToDelete = files.map((file) => `home-page-blocks/${blockId}/${file.name}`)
        }
        break

      case 'replace_image':
        // Scenario 2: 刪除特定索引圖片
        if (options?.index === undefined) {
          console.warn('replace_image 需要 index 參數')
          return { success: false, message: '缺少 index 參數' }
        }

        filesToDelete = extensions.map((ext) => `home-page-blocks/${blockId}/image-${options.index}.${ext}`)
        break

      case 'reduce_count':
        // Scenario 3: 刪除多餘圖片（從 oldCount 減少到 newCount）
        if (options?.oldCount === undefined || options?.newCount === undefined) {
          console.warn('reduce_count 需要 oldCount 和 newCount 參數')
          return { success: false, message: '缺少 oldCount 或 newCount 參數' }
        }

        // 刪除 image-{newCount} 到 image-{oldCount-1}
        for (let i = options.newCount; i < options.oldCount; i++) {
          extensions.forEach((ext) => {
            filesToDelete.push(`home-page-blocks/${blockId}/image-${i}.${ext}`)
          })
        }
        break

      case 'change_type':
        // Scenario 4: 區塊類型變更時刪除所有圖片
        // 與 delete_block 相同邏輯
        const { data: typeFiles, error: typeListError } = await supabase.storage
          .from('products')
          .list(`home-page-blocks/${blockId}`)

        if (typeListError) {
          console.warn('列出區塊圖片失敗:', typeListError)
          return { success: false, message: '列出圖片失敗' }
        }

        if (typeFiles && typeFiles.length > 0) {
          filesToDelete = typeFiles.map((file) => `home-page-blocks/${blockId}/${file.name}`)
        }
        break

      default:
        console.warn('未知的清理場景:', scenario)
        return { success: false, message: '未知的清理場景' }
    }

    // 執行刪除
    if (filesToDelete.length > 0) {
      const { error: deleteError } = await supabase.storage.from('products').remove(filesToDelete)

      if (deleteError) {
        console.warn('刪除圖片失敗:', deleteError)
        return { success: false, message: `刪除失敗: ${deleteError.message}` }
      }

      return { success: true, message: `成功刪除 ${filesToDelete.length} 個圖片` }
    }

    return { success: true, message: '無圖片需要刪除' }
  } catch (error) {
    // 容錯機制：記錄警告但不拋出錯誤
    console.warn('圖片清理失敗:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '圖片清理失敗',
    }
  }
}
