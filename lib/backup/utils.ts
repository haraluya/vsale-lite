/**
 * 備份工具函式
 * 提供備份相關的格式化與計算功能
 */

/**
 * 產生備份檔案名稱
 * 格式：vsale-backup-YYYYMMDD-HHMMSS.sql.gz
 */
export function generateBackupFilename(): string {
  const now = new Date()
  const timestamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '-')
    .slice(0, 15) // YYYYMMDD-HHMMSS
  return `vsale-backup-${timestamp}.sql.gz`
}

/**
 * 格式化檔案大小
 * @param bytes 檔案大小（位元組）
 * @returns 格式化字串（例如 "1.23 MB"）
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

/**
 * 計算壓縮率
 * @param originalSize 原始檔案大小（位元組）
 * @param compressedSize 壓縮後檔案大小（位元組）
 * @returns 壓縮率（0.0 ~ 1.0，例如 0.25 表示壓縮後為原始大小的 25%）
 */
export function calculateCompressionRatio(originalSize: number, compressedSize: number): number {
  if (originalSize === 0) return 0
  return parseFloat((compressedSize / originalSize).toFixed(2))
}
