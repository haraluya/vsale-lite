/**
 * 壓縮功能測試
 * 測試壓縮率計算與檔案大小格式化
 */

import { describe, it, expect } from 'vitest'
import { formatFileSize, calculateCompressionRatio } from '@/lib/backup/utils'

describe('壓縮功能測試', () => {
  describe('壓縮率計算', () => {
    it('應該正確計算典型 SQL 備份壓縮率', () => {
      // 典型 SQL 備份壓縮率約 80-90%（壓縮後大小為原始的 10-20%）
      const testCases = [
        { original: 10_000_000, compressed: 1_000_000, expected: 0.1 }, // 10MB → 1MB (90% 壓縮率)
        { original: 5_000_000, compressed: 750_000, expected: 0.15 }, // 5MB → 750KB (85% 壓縮率)
        { original: 20_000_000, compressed: 4_000_000, expected: 0.2 }, // 20MB → 4MB (80% 壓縮率)
      ]

      testCases.forEach(({ original, compressed, expected }) => {
        const ratio = calculateCompressionRatio(original, compressed)
        expect(ratio).toBe(expected)
      })
    })

    it('應該處理完全無壓縮的情況', () => {
      const ratio = calculateCompressionRatio(1_000_000, 1_000_000)
      expect(ratio).toBe(1.0)
    })

    it('應該處理非常高的壓縮率', () => {
      // 重複文字檔案可能達到 95% 以上壓縮率
      const ratio = calculateCompressionRatio(10_000_000, 200_000)
      expect(ratio).toBe(0.02) // 壓縮後僅 2%
    })

    it('應該保留兩位小數精度', () => {
      const ratio = calculateCompressionRatio(123_456, 45_678)
      expect(ratio.toString()).toMatch(/^\d\.\d{1,2}$/)
    })
  })

  describe('檔案大小格式化（壓縮前後對比）', () => {
    it('應該正確顯示壓縮前後大小', () => {
      // 模擬 10MB → 1.5MB 的壓縮場景
      const originalSize = 10 * 1024 * 1024 // 10MB
      const compressedSize = 1.5 * 1024 * 1024 // 1.5MB

      expect(formatFileSize(originalSize)).toBe('10.00 MB')
      expect(formatFileSize(compressedSize)).toBe('1.50 MB')
    })

    it('應該處理從 GB 壓縮到 MB 的場景', () => {
      const originalSize = 1 * 1024 * 1024 * 1024 // 1GB
      const compressedSize = 150 * 1024 * 1024 // 150MB

      expect(formatFileSize(originalSize)).toBe('1.00 GB')
      expect(formatFileSize(compressedSize)).toBe('150.00 MB')

      const ratio = calculateCompressionRatio(originalSize, compressedSize)
      expect(ratio).toBe(0.15) // 壓縮率 85%
    })

    it('應該處理小檔案壓縮（KB 等級）', () => {
      const originalSize = 500 * 1024 // 500KB
      const compressedSize = 100 * 1024 // 100KB

      expect(formatFileSize(originalSize)).toBe('500.00 KB')
      expect(formatFileSize(compressedSize)).toBe('100.00 KB')

      const ratio = calculateCompressionRatio(originalSize, compressedSize)
      expect(ratio).toBe(0.2) // 壓縮率 80%
    })
  })

  describe('壓縮效率驗證', () => {
    it('應該識別低效率壓縮（壓縮率 < 50%）', () => {
      // 已壓縮的檔案（如圖片、影片）幾乎無法再壓縮
      const ratio = calculateCompressionRatio(1_000_000, 950_000)
      expect(ratio).toBeGreaterThan(0.9) // 壓縮率 < 10%
    })

    it('應該識別高效率壓縮（壓縮率 > 70%）', () => {
      // 文字檔案（如 SQL、JSON、CSV）通常有高壓縮率
      const ratio = calculateCompressionRatio(10_000_000, 2_000_000)
      expect(ratio).toBe(0.2) // 壓縮率 80%
      expect(ratio).toBeLessThan(0.3)
    })

    it('應該計算節省的儲存空間', () => {
      const originalSize = 50 * 1024 * 1024 // 50MB
      const compressedSize = 8 * 1024 * 1024 // 8MB
      const savedSpace = originalSize - compressedSize

      expect(formatFileSize(savedSpace)).toBe('42.00 MB')

      const ratio = calculateCompressionRatio(originalSize, compressedSize)
      const compressionPercentage = (1 - ratio) * 100
      expect(compressionPercentage).toBe(84) // 節省 84% 空間
    })
  })

  describe('邊界條件測試', () => {
    it('應該處理零大小檔案', () => {
      expect(calculateCompressionRatio(0, 0)).toBe(0)
      expect(formatFileSize(0)).toBe('0 B')
    })

    it('應該處理極大檔案', () => {
      const hugeSize = 100 * 1024 * 1024 * 1024 // 100GB
      const compressedSize = 20 * 1024 * 1024 * 1024 // 20GB

      expect(formatFileSize(hugeSize)).toBe('100.00 GB')
      expect(formatFileSize(compressedSize)).toBe('20.00 GB')

      const ratio = calculateCompressionRatio(hugeSize, compressedSize)
      expect(ratio).toBe(0.2)
    })

    it('應該處理壞情況：壓縮後變大（可能因為檔案太小或已壓縮）', () => {
      const originalSize = 100
      const compressedSize = 120 // 壓縮後反而變大

      const ratio = calculateCompressionRatio(originalSize, compressedSize)
      expect(ratio).toBe(1.2) // 超過 100%
      expect(ratio).toBeGreaterThan(1.0)
    })
  })
})
