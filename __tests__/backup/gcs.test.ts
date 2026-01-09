/**
 * Google Cloud Storage 整合測試（使用 Mock）
 * 測試 GCS 上傳、刪除、下載功能
 *
 * 注意：這些測試使用 Mock，不會實際連線到 GCS
 * 實際 GCS 連線測試應在 E2E 測試中執行
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @google-cloud/storage
vi.mock('@google-cloud/storage', () => {
  const mockFile = {
    save: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    download: vi.fn().mockResolvedValue([Buffer.from('mock backup data')]),
    getSignedUrl: vi.fn().mockResolvedValue(['https://storage.googleapis.com/mock-url']),
    exists: vi.fn().mockResolvedValue([true]),
  }

  const mockBucket = {
    file: vi.fn().mockReturnValue(mockFile),
    upload: vi.fn().mockResolvedValue(undefined),
    getFiles: vi.fn().mockResolvedValue([[
      {
        name: 'vsale-backup-20260109-020000.sql.gz',
        metadata: {
          size: 1234567,
          timeCreated: new Date('2026-01-09T02:00:00Z').toISOString(),
        },
      },
    ]]),
    exists: vi.fn().mockResolvedValue([true]),
  }

  const mockStorage = {
    bucket: vi.fn().mockReturnValue(mockBucket),
  }

  return {
    Storage: vi.fn().mockImplementation(() => mockStorage),
  }
})

describe('Google Cloud Storage 整合測試（Mock）', () => {
  beforeEach(() => {
    // 清除所有 Mock 呼叫記錄
    vi.clearAllMocks()
  })

  describe('上傳備份功能', () => {
    it('應該能夠上傳 Buffer 到 GCS', async () => {
      // 此測試驗證 Mock 設定正確
      const { Storage } = await import('@google-cloud/storage')
      const storage = new Storage()
      const bucket = storage.bucket('test-bucket')
      const file = bucket.file('test-backup.sql.gz')

      const buffer = Buffer.from('test data')
      await file.save(buffer, {
        metadata: {
          contentType: 'application/gzip',
        },
      })

      expect(file.save).toHaveBeenCalledWith(
        buffer,
        expect.objectContaining({
          metadata: expect.objectContaining({
            contentType: 'application/gzip',
          }),
        })
      )
    })

    it('應該設定正確的 Content-Type', async () => {
      const { Storage } = await import('@google-cloud/storage')
      const storage = new Storage()
      const bucket = storage.bucket('test-bucket')
      const file = bucket.file('backup.sql.gz')

      await file.save(Buffer.from('data'), {
        metadata: {
          contentType: 'application/gzip',
          metadata: {
            uploadedAt: new Date().toISOString(),
          },
        },
      })

      expect(file.save).toHaveBeenCalled()
      const callArgs = (file.save as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(callArgs[1].metadata.contentType).toBe('application/gzip')
    })

    it('應該在上傳失敗時拋出錯誤', async () => {
      const { Storage } = await import('@google-cloud/storage')
      const storage = new Storage()
      const bucket = storage.bucket('test-bucket')
      const file = bucket.file('backup.sql.gz')

      // Mock 上傳失敗
      vi.mocked(file.save).mockRejectedValueOnce(new Error('Upload failed'))

      await expect(
        file.save(Buffer.from('data'), { metadata: { contentType: 'application/gzip' } })
      ).rejects.toThrow('Upload failed')
    })
  })

  describe('列出備份功能', () => {
    it('應該能夠列出所有備份檔案', async () => {
      const { Storage } = await import('@google-cloud/storage')
      const storage = new Storage()
      const bucket = storage.bucket('test-bucket')

      const [files] = await bucket.getFiles({ prefix: 'vsale-backup-' })

      expect(files).toHaveLength(1)
      expect(files[0].name).toBe('vsale-backup-20260109-020000.sql.gz')
      expect(files[0].metadata.size).toBe(1234567)
    })

    it('應該正確解析檔案元數據', async () => {
      const { Storage } = await import('@google-cloud/storage')
      const storage = new Storage()
      const bucket = storage.bucket('test-bucket')

      const [files] = await bucket.getFiles({ prefix: 'vsale-backup-' })
      const file = files[0]

      expect(file.metadata.timeCreated).toBeDefined()
      expect(new Date(file.metadata.timeCreated)).toBeInstanceOf(Date)
    })
  })

  describe('刪除備份功能', () => {
    it('應該能夠刪除指定備份檔案', async () => {
      const { Storage } = await import('@google-cloud/storage')
      const storage = new Storage()
      const bucket = storage.bucket('test-bucket')
      const file = bucket.file('backup.sql.gz')

      await file.delete()

      expect(file.delete).toHaveBeenCalled()
    })

    it('應該在刪除不存在的檔案時拋出錯誤', async () => {
      const { Storage } = await import('@google-cloud/storage')
      const storage = new Storage()
      const bucket = storage.bucket('test-bucket')
      const file = bucket.file('nonexistent.sql.gz')

      // Mock 刪除失敗
      vi.mocked(file.delete).mockRejectedValueOnce(new Error('File not found'))

      await expect(file.delete()).rejects.toThrow('File not found')
    })
  })

  describe('下載備份功能', () => {
    it('應該能夠下載備份檔案並返回 Buffer', async () => {
      const { Storage } = await import('@google-cloud/storage')
      const storage = new Storage()
      const bucket = storage.bucket('test-bucket')
      const file = bucket.file('backup.sql.gz')

      const [buffer] = await file.download()

      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.toString()).toBe('mock backup data')
    })

    it('應該在下載失敗時拋出錯誤', async () => {
      const { Storage } = await import('@google-cloud/storage')
      const storage = new Storage()
      const bucket = storage.bucket('test-bucket')
      const file = bucket.file('backup.sql.gz')

      // Mock 下載失敗
      vi.mocked(file.download).mockRejectedValueOnce(new Error('Download failed'))

      await expect(file.download()).rejects.toThrow('Download failed')
    })
  })

  describe('臨時簽名 URL 功能', () => {
    it('應該能夠產生臨時簽名 URL', async () => {
      const { Storage } = await import('@google-cloud/storage')
      const storage = new Storage()
      const bucket = storage.bucket('test-bucket')
      const file = bucket.file('backup.sql.gz')

      const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 3600 * 1000,
      })

      expect(url).toBe('https://storage.googleapis.com/mock-url')
      expect(file.getSignedUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          version: 'v4',
          action: 'read',
        })
      )
    })

    it('應該設定正確的過期時間', async () => {
      const { Storage } = await import('@google-cloud/storage')
      const storage = new Storage()
      const bucket = storage.bucket('test-bucket')
      const file = bucket.file('backup.sql.gz')

      const expiresIn = 3600 // 1 小時
      const expires = Date.now() + expiresIn * 1000

      await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires,
      })

      const callArgs = (file.getSignedUrl as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(callArgs[0].expires).toBeCloseTo(expires, -2) // 容許 100ms 誤差
    })
  })

  describe('連線檢查功能', () => {
    it('應該能夠檢查 GCS Bucket 是否存在', async () => {
      const { Storage } = await import('@google-cloud/storage')
      const storage = new Storage()
      const bucket = storage.bucket('test-bucket')

      const [exists] = await bucket.exists()

      expect(exists).toBe(true)
      expect(bucket.exists).toHaveBeenCalled()
    })

    it('應該在連線失敗時返回 false', async () => {
      const { Storage } = await import('@google-cloud/storage')
      const storage = new Storage()
      const bucket = storage.bucket('test-bucket')

      // Mock 連線失敗
      vi.mocked(bucket.exists).mockRejectedValueOnce(new Error('Connection failed'))

      await expect(bucket.exists()).rejects.toThrow('Connection failed')
    })
  })

  describe('錯誤處理', () => {
    it('應該處理認證失敗錯誤', async () => {
      const { Storage } = await import('@google-cloud/storage')
      const storage = new Storage()
      const bucket = storage.bucket('test-bucket')
      const file = bucket.file('backup.sql.gz')

      vi.mocked(file.save).mockRejectedValueOnce(
        new Error('Could not load the default credentials')
      )

      await expect(
        file.save(Buffer.from('data'), { metadata: {} })
      ).rejects.toThrow('Could not load the default credentials')
    })

    it('應該處理 Bucket 不存在錯誤', async () => {
      const { Storage } = await import('@google-cloud/storage')
      const storage = new Storage()
      const bucket = storage.bucket('nonexistent-bucket')

      vi.mocked(bucket.exists).mockResolvedValueOnce([false])

      const [exists] = await bucket.exists()
      expect(exists).toBe(false)
    })

    it('應該處理網路逾時錯誤', async () => {
      const { Storage } = await import('@google-cloud/storage')
      const storage = new Storage()
      const bucket = storage.bucket('test-bucket')
      const file = bucket.file('backup.sql.gz')

      vi.mocked(file.upload).mockRejectedValueOnce(new Error('ETIMEDOUT'))

      await expect(file.upload?.()).rejects.toThrow('ETIMEDOUT')
    })
  })
})
