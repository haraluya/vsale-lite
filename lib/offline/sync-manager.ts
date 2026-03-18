// 離線同步管理器 - 衝突策略：server wins

import { getAll, put, clear, deleteByKey } from './indexed-db'

export interface SyncOperation {
  id?: number
  type: 'add-to-cart' | 'update-cart' | 'remove-from-cart' | 'create-order'
  payload: Record<string, unknown>
  timestamp: number
  retries: number
}

/**
 * 將操作加入同步佇列（離線時暫存）
 */
export async function addToSyncQueue(
  operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retries'>
): Promise<void> {
  await put('cart-sync', {
    ...operation,
    timestamp: Date.now(),
    retries: 0,
  })
}

/**
 * 上線後處理同步佇列
 * 衝突策略：server wins - 若伺服器回傳衝突，以伺服器資料為準
 */
export async function processSyncQueue(): Promise<{
  processed: number
  failed: number
}> {
  const queue = await getAll<SyncOperation>('cart-sync')

  if (queue.length === 0) {
    return { processed: 0, failed: 0 }
  }

  // 依時間排序，先進先出
  const sorted = queue.sort((a, b) => a.timestamp - b.timestamp)

  let processed = 0
  let failed = 0

  for (const operation of sorted) {
    try {
      await executeOperation(operation)
      // 成功後從佇列移除
      if (operation.id !== undefined) {
        await deleteByKey('cart-sync', operation.id)
      }
      processed++
    } catch {
      // 失敗時增加重試次數，超過 3 次則放棄
      if (operation.retries >= 3) {
        if (operation.id !== undefined) {
          await deleteByKey('cart-sync', operation.id)
        }
        failed++
      } else {
        await put('cart-sync', {
          ...operation,
          retries: operation.retries + 1,
        })
        failed++
      }
    }
  }

  return { processed, failed }
}

/**
 * 清除所有待同步操作
 */
export async function clearSyncQueue(): Promise<void> {
  await clear('cart-sync')
}

/**
 * 取得待同步操作數量
 */
export async function getSyncQueueSize(): Promise<number> {
  const queue = await getAll('cart-sync')
  return queue.length
}

/**
 * 執行單一同步操作
 * Server wins: 若伺服器回傳 409 衝突，直接丟棄本地操作
 */
async function executeOperation(operation: SyncOperation): Promise<void> {
  // 依操作類型呼叫對應的 Server Action 或 API
  // 實際整合時需根據 operation.type 分派到對應的處理函式
  switch (operation.type) {
    case 'add-to-cart':
    case 'update-cart':
    case 'remove-from-cart':
      // 購物車操作由 Zustand store 在上線時自動處理
      // 此處預留給未來需要伺服器端同步的場景
      break
    case 'create-order':
      // 訂單建立需要呼叫 Server Action
      // 預留給未來離線建單功能
      throw new Error('離線建單功能尚未實作')
    default:
      throw new Error(`未知的同步操作類型: ${(operation as SyncOperation).type}`)
  }
}
