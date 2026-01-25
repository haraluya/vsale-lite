/**
 * Cache Utilities
 * Feature: Performance Optimization - Phase 3.5
 *
 * 使用 Next.js unstable_cache 實作 time-based caching
 * - 系列查詢: 5 分鐘 (300 秒)
 * - 分類查詢: 5 分鐘 (300 秒)
 * - 等級查詢: 10 分鐘 (600 秒)
 * - 預期提升：快取命中率 +30% (60% → 90%)
 */

import { unstable_cache } from 'next/cache'

/**
 * 系列快取配置（5 分鐘）
 * 使用場景：系列列表、系列下拉選單
 */
export const cacheSeriesQuery = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  keyPrefix: string
) => {
  return unstable_cache(fn, [keyPrefix], {
    revalidate: 300, // 5 分鐘
    tags: ['series'], // 標籤用於手動失效
  })
}

/**
 * 分類快取配置（5 分鐘）
 * 使用場景：分類列表、分類下拉選單
 */
export const cacheCategoriesQuery = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  keyPrefix: string
) => {
  return unstable_cache(fn, [keyPrefix], {
    revalidate: 300, // 5 分鐘
    tags: ['categories'], // 標籤用於手動失效
  })
}

/**
 * 等級快取配置（10 分鐘）
 * 使用場景：等級列表、等級下拉選單
 */
export const cacheTiersQuery = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  keyPrefix: string
) => {
  return unstable_cache(fn, [keyPrefix], {
    revalidate: 600, // 10 分鐘
    tags: ['tiers'], // 標籤用於手動失效
  })
}

/**
 * 通用快取配置（自訂時間）
 * @param revalidateSeconds 快取時間（秒）
 * @param tags 快取標籤（用於手動失效）
 */
export const createCachedQuery = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  keyPrefix: string,
  revalidateSeconds: number,
  tags: string[]
) => {
  return unstable_cache(fn, [keyPrefix], {
    revalidate: revalidateSeconds,
    tags,
  })
}

/**
 * 快取配置說明
 *
 * Time-based Cache 策略：
 * - 系列（Series）: 5 分鐘
 *   理由：系列資料變更較少，但需要即時反映新增系列
 *
 * - 分類（Categories）: 5 分鐘
 *   理由：分類資料變更頻率低，5 分鐘足夠
 *
 * - 等級（Tiers）: 10 分鐘
 *   理由：等級是系統核心設定，變更頻率極低
 *
 * 快取失效機制：
 * 1. Time-based：超過設定時間自動重新驗證
 * 2. Tag-based：使用 revalidateTag() 手動失效（已在 Server Actions 中實作）
 *
 * 效能預估：
 * - 快取命中時：查詢時間 ~0ms（記憶體讀取）
 * - 快取未命中時：正常查詢時間（首次或過期後）
 * - 預期快取命中率：60% → 90% (+30%)
 */
