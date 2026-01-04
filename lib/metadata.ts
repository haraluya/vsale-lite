/**
 * Metadata 輔助函式
 * 統一管理所有頁面的標題格式
 */

import { Metadata } from 'next'
import { getPublicSettings } from '@/lib/actions/system'

/**
 * 產生頁面 Metadata
 * @param pageTitle 頁面標題（如「系統設定」、「操作日誌」）
 * @param description 頁面描述（可選）
 */
export async function generatePageMetadata(
  pageTitle: string,
  description?: string
): Promise<Metadata> {
  // 從資料庫讀取網站標題
  const settingsResult = await getPublicSettings()
  const settings = settingsResult.success ? settingsResult.data : []
  const siteTitle = (settings?.find((s) => s.key === 'site_title')?.value as string) || 'Vsale-lite'

  return {
    title: `${pageTitle} | ${siteTitle}`,
    description: description || `${pageTitle} - ${siteTitle}`,
  }
}
