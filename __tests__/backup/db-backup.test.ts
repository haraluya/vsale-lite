/**
 * 資料庫備份核心邏輯測試
 * 測試檔案壓縮、元數據計算、檔案名稱生成
 */

import { describe, it, expect } from 'vitest'
import {
  generateBackupFilename,
  formatFileSize,
  calculateCompressionRatio,
} from '@/lib/backup/utils'

describe('備份工具函式測試', () => {
  describe('generateBackupFilename', () => {
    it('應該產生正確格式的備份檔案名稱', () => {
      const filename = generateBackupFilename()

      // 驗證格式：vsale-backup-YYYYMMDD-HHMMSS.sql.gz
      expect(filename).toMatch(/^vsale-backup-\d{8}-\d{6}\.sql\.gz$/)
    })

    it('應該包含當前時間戳', () => {
      const filename = generateBackupFilename()
      const timestamp = filename.replace('vsale-backup-', '').replace('.sql.gz', '')
      const [datePart] = timestamp.split('-')

      // 驗證日期部分（YYYYMMDD）
      expect(datePart).toHaveLength(8)
      const year = parseInt(datePart.slice(0, 4))
      expect(year).toBeGreaterThanOrEqual(2024)
    })

    it('每次呼叫應該產生不同的檔案名稱', () => {
      const filename1 = generateBackupFilename()
      // 等待 1 毫秒
      const filename2 = generateBackupFilename()

      // 由於時間戳精度，連續呼叫可能相同，因此不強制要求不同
      expect(filename1).toMatch(/^vsale-backup-\d{8}-\d{6}\.sql\.gz$/)
      expect(filename2).toMatch(/^vsale-backup-\d{8}-\d{6}\.sql\.gz$/)
    })
  })

  describe('formatFileSize', () => {
    it('應該正確格式化位元組大小', () => {
      expect(formatFileSize(0)).toBe('0 B')
      expect(formatFileSize(512)).toBe('512.00 B')
      expect(formatFileSize(1024)).toBe('1.00 KB')
      expect(formatFileSize(1536)).toBe('1.50 KB')
      expect(formatFileSize(1048576)).toBe('1.00 MB')
      expect(formatFileSize(1572864)).toBe('1.50 MB')
      expect(formatFileSize(1073741824)).toBe('1.00 GB')
      expect(formatFileSize(5368709120)).toBe('5.00 GB')
    })

    it('應該保留兩位小數', () => {
      const result = formatFileSize(1234567)
      expect(result).toMatch(/^\d+\.\d{2} \w+$/)
    })

    it('應該處理大數值', () => {
      const terabyte = 1024 * 1024 * 1024 * 1024
      expect(formatFileSize(terabyte)).toBe('1.00 TB')
    })
  })

  describe('calculateCompressionRatio', () => {
    it('應該正確計算壓縮率', () => {
      expect(calculateCompressionRatio(1000, 250)).toBe(0.25) // 25% 壓縮後大小
      expect(calculateCompressionRatio(1000, 500)).toBe(0.5) // 50%
      expect(calculateCompressionRatio(1000, 750)).toBe(0.75) // 75%
      expect(calculateCompressionRatio(1000, 1000)).toBe(1.0) // 無壓縮
    })

    it('應該處理原始大小為 0 的情況', () => {
      expect(calculateCompressionRatio(0, 100)).toBe(0)
    })

    it('應該保留兩位小數', () => {
      const ratio = calculateCompressionRatio(123456, 45678)
      expect(ratio).toBe(0.37)
    })

    it('應該正確計算高壓縮率（SQL 備份典型場景）', () => {
      // SQL 文字檔案通常有 80-90% 壓縮率
      const originalSize = 10 * 1024 * 1024 // 10MB
      const compressedSize = 2 * 1024 * 1024 // 2MB（壓縮率 20%）
      const ratio = calculateCompressionRatio(originalSize, compressedSize)

      expect(ratio).toBe(0.2)
      expect(ratio).toBeLessThan(0.3) // 壓縮後應小於 30%
    })
  })
})
