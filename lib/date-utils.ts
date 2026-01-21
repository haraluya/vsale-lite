/**
 * 日期格式化工具函數
 * 用於統一專案中所有日期顯示格式，避免 Server/Client Hydration 不一致問題
 */

/**
 * 格式化日期為繁體中文完整格式
 * @param dateString - ISO 8601 日期字串 (例如: "2026-01-22T08:30:45.123Z")
 * @returns 格式化後的日期字串 (例如: "2026/01/22 16:30")
 */
export function formatDateTW(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString

  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * 格式化日期為繁體中文短格式（不含年份）
 * @param dateString - ISO 8601 日期字串
 * @returns 格式化後的日期字串 (例如: "01/22 16:30")
 */
export function formatDateShortTW(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString

  return date.toLocaleDateString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * 格式化日期為繁體中文完整格式（含秒數）
 * @param dateString - ISO 8601 日期字串
 * @returns 格式化後的日期字串 (例如: "2026/01/22 16:30:45")
 */
export function formatDateTimeTW(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString

  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
 * 格式化金額為台幣格式
 * @param amount - 金額數字
 * @returns 格式化後的金額字串 (例如: "NT$ 1,960")
 */
export function formatAmount(amount: number): string {
  return `NT$ ${amount.toLocaleString()}`
}

/**
 * 解析 ISO 8601 日期字串，並確保時區正確
 * 此函數用於在 Server 端安全地處理日期字串，避免時區問題
 * @param dateString - ISO 8601 日期字串
 * @returns Date 物件
 */
export function parseDateSafe(dateString: string): Date {
  // 確保字串是有效的 ISO 8601 格式
  if (!dateString.includes('T')) {
    throw new Error('Invalid date format. Expected ISO 8601 format with timezone.')
  }

  return new Date(dateString)
}

/**
 * 檢查日期字串是否有效
 * @param dateString - 日期字串
 * @returns 是否為有效日期
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString)
  return !isNaN(date.getTime())
}

/**
 * 計算兩個日期之間的天數差
 * @param date1 - 第一個日期
 * @param date2 - 第二個日期
 * @returns 天數差（絕對值）
 */
export function daysBetween(date1: string | Date, date2: string | Date): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2

  const diffTime = Math.abs(d2.getTime() - d1.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * 格式化相對時間（例如：「3 天前」、「剛剛」）
 * @param dateString - ISO 8601 日期字串
 * @returns 相對時間字串
 */
export function formatRelativeTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '剛剛'
  if (diffMins < 60) return `${diffMins} 分鐘前`
  if (diffHours < 24) return `${diffHours} 小時前`
  if (diffDays < 7) return `${diffDays} 天前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} 週前`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} 個月前`
  return `${Math.floor(diffDays / 365)} 年前`
}
