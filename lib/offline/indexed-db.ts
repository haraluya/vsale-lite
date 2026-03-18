// IndexedDB 手動封裝 - 不依賴外部套件

const DB_NAME = 'vsale-offline'
const DB_VERSION = 1
const STORE_NAMES = ['products', 'categories', 'cart-sync', 'order-drafts'] as const

export type StoreName = (typeof STORE_NAMES)[number]

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      for (const storeName of STORE_NAMES) {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true })
        }
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getAll<T = unknown>(storeName: StoreName): Promise<T[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result as T[])
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

export async function put<T extends Record<string, unknown>>(
  storeName: StoreName,
  value: T
): Promise<IDBValidKey> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.put(value)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

export async function clear(storeName: StoreName): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.clear()

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

export async function deleteByKey(
  storeName: StoreName,
  key: IDBValidKey
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.delete(key)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}
