/**
 * Supabase 連線重試工具
 * 處理間歇性的網路錯誤
 */

interface RetryOptions {
  maxRetries?: number
  delayMs?: number
  backoff?: boolean
}

/**
 * 執行帶重試機制的非同步函式
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, delayMs = 1000, backoff = true } = options
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      // 檢查是否為網路錯誤
      const isNetworkError =
        error instanceof Error &&
        (error.message.includes('fetch failed') ||
         error.message.includes('ENOTFOUND') ||
         error.message.includes('ETIMEDOUT') ||
         error.message.includes('ECONNREFUSED'))

      // 如果不是網路錯誤，或已達最大重試次數，直接拋出
      if (!isNetworkError || attempt === maxRetries) {
        throw error
      }

      // 計算延遲時間（指數退避）
      const delay = backoff ? delayMs * Math.pow(2, attempt) : delayMs

      console.warn(
        `[Retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms...`,
        error.message
      )

      // 等待後重試
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}
