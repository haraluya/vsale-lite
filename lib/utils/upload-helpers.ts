/**
 * 圖片上傳工具函式
 * 提供重試機制、超時設定與錯誤處理
 */

/**
 * Supabase Storage 錯誤型別
 */
interface StorageError extends Error {
  name: string
  message: string
}

/**
 * 可重試的錯誤類型
 */
const RETRIABLE_ERROR_CODES = [
  '408', // Request Timeout
  '429', // Too Many Requests
  '500', // Internal Server Error
  '502', // Bad Gateway
  '503', // Service Unavailable
  '504', // Gateway Timeout
]

/**
 * 判斷錯誤是否可重試
 */
function isRetriableError(error: StorageError | null): boolean {
  if (!error) return false

  // 檢查錯誤訊息中是否包含可重試的關鍵字
  const errorMessage = error.message?.toLowerCase() || ''
  const retriableKeywords = [
    'timeout',
    'network',
    'connection',
    'econnreset',
    'etimedout',
    'rate limit',
  ]

  return retriableKeywords.some((keyword) => errorMessage.includes(keyword))
}

/**
 * 延遲函式（用於重試間隔）
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 上傳選項
 */
interface UploadOptions {
  upsert?: boolean
  contentType?: string
}

/**
 * 上傳結果
 */
interface UploadResult<T = unknown> {
  data: T | null
  error: StorageError | null
  attempts?: number
}

/**
 * 帶重試機制的上傳函式
 *
 * @param uploadFn - 上傳函式（返回 { data, error }）
 * @param maxRetries - 最大重試次數（預設 3 次）
 * @param timeoutMs - 單次上傳超時時間（預設 30 秒）
 * @returns 上傳結果（含重試次數）
 */
export async function uploadWithRetry<T = unknown>(
  uploadFn: () => Promise<{ data: T | null; error: StorageError | null }>,
  maxRetries = 3,
  timeoutMs = 30000
): Promise<UploadResult<T>> {
  let lastError: StorageError | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // 宣告計時器 ID（需要在 try-catch 外，以便在 catch 中清除）
    let timeoutId: NodeJS.Timeout | undefined

    try {
      // 建立可取消的超時 Promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          const timeoutError = new Error(
            `上傳超時（超過 ${timeoutMs / 1000} 秒）`
          ) as StorageError
          timeoutError.name = 'StorageError'
          reject(timeoutError)
        }, timeoutMs)
      })

      // 競速執行上傳與超時
      const result = await Promise.race([uploadFn(), timeoutPromise])

      // 清除超時計時器（上傳成功或失敗時）
      if (timeoutId) clearTimeout(timeoutId)

      // 上傳成功
      if (!result.error) {
        return {
          data: result.data,
          error: null,
          attempts: attempt,
        }
      }

      lastError = result.error

      // 檢查是否可重試
      if (isRetriableError(result.error) && attempt < maxRetries) {
        // 指數退避延遲（1s, 2s, 4s）
        const delay = Math.pow(2, attempt - 1) * 1000
        console.warn(
          `上傳失敗（嘗試 ${attempt}/${maxRetries}），${delay}ms 後重試...`,
          result.error
        )
        await sleep(delay)
        continue
      }

      // 不可重試錯誤或達到最大重試次數
      return {
        data: null,
        error: result.error,
        attempts: attempt,
      }
    } catch (error) {
      // 清除超時計時器（發生異常時）
      if (timeoutId) clearTimeout(timeoutId)

      // 捕獲超時錯誤或其他異常
      lastError = error as StorageError

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000
        console.warn(
          `上傳異常（嘗試 ${attempt}/${maxRetries}），${delay}ms 後重試...`,
          error
        )
        await sleep(delay)
        continue
      }

      return {
        data: null,
        error: lastError,
        attempts: attempt,
      }
    }
  }

  // 理論上不會執行到這裡，但 TypeScript 需要回傳值
  return {
    data: null,
    error: lastError,
    attempts: maxRetries,
  }
}

/**
 * 格式化錯誤訊息為用戶友善的提示
 */
export function formatUploadError(
  error: StorageError | null,
  attempts?: number
): string {
  if (!error) return '未知錯誤'

  const errorMessage = error.message?.toLowerCase() || ''

  // 超時錯誤
  if (errorMessage.includes('timeout') || errorMessage.includes('超時')) {
    return `上傳超時，請檢查網路連線或減小圖片大小${attempts ? `（已重試 ${attempts} 次）` : ''}`
  }

  // 網路錯誤
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('econnreset')
  ) {
    return `網路連線不穩定，請稍後再試${attempts ? `（已重試 ${attempts} 次）` : ''}`
  }

  // 限流錯誤
  if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
    return '上傳次數過於頻繁，請稍後再試'
  }

  // 權限錯誤
  if (errorMessage.includes('permission') || errorMessage.includes('403')) {
    return '無權限上傳圖片，請聯絡系統管理員'
  }

  // 檔案過大
  if (errorMessage.includes('size') || errorMessage.includes('large')) {
    return '圖片大小超過限制（最大 5MB）'
  }

  // 伺服器錯誤
  if (
    errorMessage.includes('500') ||
    errorMessage.includes('502') ||
    errorMessage.includes('503')
  ) {
    return `伺服器暫時無法處理請求，請稍後再試${attempts ? `（已重試 ${attempts} 次）` : ''}`
  }

  // 預設錯誤訊息
  return `上傳失敗：${error.message || '未知錯誤'}${attempts ? `（已重試 ${attempts} 次）` : ''}`
}
