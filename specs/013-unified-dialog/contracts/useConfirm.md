# API Contract: useConfirm Hook

**版本**: 1.0.0
**最後更新**: 2026-01-07
**狀態**: ✅ 已實作

---

## 概述

`useConfirm` Hook 提供雙按鈕確認對話框，用於要求使用者確認關鍵操作。取代原生 `window.confirm()`，回傳 Promise<boolean> 表示使用者選擇。

---

## 匯入方式

```typescript
import { useConfirm } from '@/lib/contexts/dialog-context'
```

---

## 型別定義

### ConfirmDialogOptions

```typescript
interface ConfirmDialogOptions {
  /** 對話框標題 */
  title: string

  /** 對話框描述內容（支援多行文字） */
  description: string

  /**
   * 視覺變體
   * @default 'default'
   */
  variant?: 'success' | 'error' | 'warning' | 'info' | 'danger' | 'default'

  /**
   * 確認按鈕文字
   * @default '確定'
   */
  confirmText?: string

  /**
   * 取消按鈕文字
   * @default '取消'
   */
  cancelText?: string

  /**
   * 是否為異步操作（顯示載入動畫）
   * @default false
   */
  isAsync?: boolean

  /**
   * 是否允許 ESC 鍵或背景點擊取消
   * @default true
   */
  closable?: boolean
}
```

---

## 使用方式

### 基本用法

```typescript
'use client'

import { useConfirm } from '@/lib/contexts/dialog-context'

export function MyComponent() {
  const confirm = useConfirm()

  const handleDelete = async () => {
    // 顯示確認對話框
    const confirmed = await confirm({
      title: '確認刪除',
      description: '此操作無法復原，確定要刪除嗎？',
      variant: 'danger'
    })

    if (confirmed) {
      // 使用者點擊「確定」
      await deleteItem()
      toast.success('已刪除')
    } else {
      // 使用者點擊「取消」或關閉對話框
      toast.info('已取消')
    }
  }

  return <button onClick={handleDelete}>刪除</button>
}
```

### 六種變體範例

```typescript
// 1. 成功確認（綠色）
const confirmed = await confirm({
  title: '確認送出',
  description: '資料檢查無誤，確定要送出嗎？',
  variant: 'success'
})

// 2. 錯誤提示（紅色）
const confirmed = await confirm({
  title: '偵測到錯誤',
  description: '部分資料格式不正確，是否繼續？',
  variant: 'error'
})

// 3. 警告提示（黃色）
const confirmed = await confirm({
  title: '注意',
  description: '此操作可能影響其他使用者，確定要繼續嗎？',
  variant: 'warning'
})

// 4. 資訊提示（藍色）
const confirmed = await confirm({
  title: '提示',
  description: '系統將自動儲存變更，是否繼續？',
  variant: 'info'
})

// 5. 危險操作（紅色 + 警告圖示）
const confirmed = await confirm({
  title: '確認刪除',
  description: '此操作無法復原，確定要刪除嗎？',
  variant: 'danger'
})

// 6. 預設樣式（灰色）
const confirmed = await confirm({
  title: '確認操作',
  description: '確定要執行此操作嗎？',
  variant: 'default'
})
```

### 自訂按鈕文字

```typescript
const confirmed = await confirm({
  title: '切換帳號',
  description: '切換帳號將登出目前使用者',
  variant: 'warning',
  confirmText: '切換',
  cancelText: '留在此帳號'
})
```

### 異步操作模式

```typescript
const confirmed = await confirm({
  title: '確認送出',
  description: '資料將上傳至伺服器',
  variant: 'success',
  isAsync: true  // 點擊確定後顯示載入動畫
})

if (confirmed) {
  // 對話框已在內部等待 500ms 模擬異步操作
  // 實際應用中，可在此執行 API 呼叫
  await submitData()
}
```

### 強制確認（禁用取消）

```typescript
const confirmed = await confirm({
  title: '重要協議',
  description: '請仔細閱讀並確認使用條款',
  variant: 'warning',
  closable: false  // 禁用 ESC 鍵與背景點擊，僅能點擊按鈕
})
```

### 多行描述

```typescript
const confirmed = await confirm({
  title: '批次刪除',
  description: `即將刪除以下項目：
• 商品 A
• 商品 B
• 商品 C

此操作無法復原，確定要繼續嗎？`,
  variant: 'danger'
})
```

---

## 回傳值

```typescript
Promise<boolean>
```

- **`true`**: 使用者點擊「確認」按鈕
- **`false`**: 使用者點擊「取消」按鈕、按下 ESC 鍵、或點擊背景遮罩

---

## 行為規範

### 對話框開啟時

1. **背景遮罩**: 顯示半透明黑色遮罩 (`bg-black/50`)
2. **滾動鎖定**: 鎖定背景頁面滾動 (`document.body.style.overflow = 'hidden'`)
3. **焦點管理**: 自動聚焦確認按鈕（`autoFocus` 屬性）
4. **動畫效果**:
   - 背景淡入 (`animate-in fade-in-0 duration-200`)
   - 對話框縮放進入 (`animate-in zoom-in-95 duration-200`)

### 關閉方式

| 操作 | 條件 | 回傳值 |
|------|------|--------|
| 點擊確認按鈕 | 無條件 | `true` |
| 點擊取消按鈕 | 無條件 | `false` |
| 按下 ESC 鍵 | `closable: true` | `false` |
| 點擊背景遮罩 | `closable: true` | `false` |
| 點擊確認按鈕 | `closable: false` + `isAsync: true` | 等待異步操作後回傳 `true` |

### 異步模式行為

當 `isAsync: true` 時：
1. **點擊確認**: 按鈕顯示載入動畫（Loader2 旋轉圖示）
2. **禁用互動**: 確認與取消按鈕同時禁用（防止重複點擊）
3. **模擬延遲**: 內部等待 500ms（實際應用中由外部處理）
4. **自動關閉**: 異步操作完成後關閉對話框並回傳 `true`

```typescript
// isAsync 模式內部實作
const handleConfirm = async () => {
  if (isAsync) {
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 500))  // 模擬延遲
  }
  onClose(true)
}
```

### 對話框關閉後

1. **移除遮罩**: 淡出動畫後移除
2. **解除鎖定**: 恢復背景頁面滾動 (`document.body.style.overflow = ''`)
3. **清除狀態**: DialogContext 狀態重置為 `null`

---

## 樣式規範

### Neo-Brutalism 設計

```css
/* 對話框容器 */
border: 3px solid black;
box-shadow: 8px 8px 0px 0px rgba(0,0,0,1);
border-radius: 0;

/* 按鈕點擊效果 */
hover:translate-x-[2px] hover:translate-y-[2px]
hover:shadow-none
```

### 變體色彩配置

| 變體 | 標題背景 | 標題文字 | 圖示 | 確認按鈕 |
|------|---------|---------|------|---------|
| success | bg-green-400 | text-white | CheckCircle | bg-green-500 hover:bg-green-600 |
| error | bg-red-400 | text-white | XCircle | bg-red-500 hover:bg-red-600 |
| warning | bg-yellow-400 | text-white | AlertTriangle | bg-yellow-500 hover:bg-yellow-600 |
| info | bg-blue-400 | text-white | Info | bg-blue-500 hover:bg-blue-600 |
| danger | bg-red-400 | text-white | AlertTriangle | bg-red-500 hover:bg-red-600 |
| default | bg-gray-200 | text-gray-800 | Info | bg-gray-800 hover:bg-gray-900 |

### 按鈕佈局

```tsx
<div className="flex gap-3">
  {/* 取消按鈕（左側，白色） */}
  <button className="flex-1 bg-white hover:bg-gray-100 border-3 border-black">
    {cancelText}
  </button>

  {/* 確認按鈕（右側，依變體著色） */}
  <button className="flex-1 bg-{variant}-500 border-3 border-black">
    {isLoading && <Loader2 className="animate-spin" />}
    {confirmText}
  </button>
</div>
```

### 響應式設計

- **手機**: 最大寬度 `max-w-md`（28rem / 448px）
- **平板/桌面**: 維持相同寬度，置中顯示
- **按鈕**: 使用 `flex-1` 平分寬度，間距 `gap-3`

---

## 無障礙性 (WCAG 2.1 AA)

### ARIA 屬性

```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="confirm-dialog-title"
  aria-describedby="confirm-dialog-description"
>
  <h2 id="confirm-dialog-title">{title}</h2>
  <p id="confirm-dialog-description">{description}</p>
</div>
```

### 鍵盤支援

| 按鍵 | 行為 |
|------|------|
| `Enter` | 確認（聚焦在確認按鈕上時） |
| `Space` | 確認/取消（依聚焦按鈕） |
| `Escape` | 取消（若 `closable: true`） |
| `Tab` | 在確認與取消按鈕間切換 |

### 螢幕閱讀器

- ✅ 對話框開啟時朗讀標題與描述
- ✅ 按鈕有明確的標籤（confirmText、cancelText）
- ✅ 載入狀態有視覺與語義提示（disabled + Loader 圖示）

---

## 錯誤處理

### 常見錯誤

#### 1. 在 DialogProvider 外呼叫

```typescript
// ❌ 錯誤：未包裹 DialogProvider
const confirm = useConfirm() // Error: useConfirm must be used within DialogProvider
```

**解決方式**: 確保根佈局已包裹 `<DialogProvider>`

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <DialogProvider>
      {children}
    </DialogProvider>
  )
}
```

#### 2. 在 Server Component 呼叫

```typescript
// ❌ 錯誤：Server Component 無法使用 Hook
export default async function Page() {
  const confirm = useConfirm() // Error: Hooks cannot be used in Server Components
}
```

**解決方式**: 將功能移至 Client Component

```tsx
// components/DeleteButton.tsx
'use client'

export function DeleteButton() {
  const confirm = useConfirm()
  // ...
}
```

#### 3. 未處理回傳值

```typescript
// ⚠️ 警告：未處理使用者選擇
confirm({ title: '確認刪除', description: '無法復原' })
// 缺少 await 與條件判斷

// ✅ 正確：處理回傳值
const confirmed = await confirm({
  title: '確認刪除',
  description: '無法復原'
})

if (confirmed) {
  // 執行刪除
}
```

---

## 效能考量

### 最佳實踐

1. **使用 danger 變體表示危險操作**
   ```typescript
   // ✅ 推薦：危險操作使用 danger
   const confirmed = await confirm({
     title: '確認刪除',
     description: '此操作無法復原',
     variant: 'danger'
   })

   // ❌ 不推薦：刪除操作使用 success
   const confirmed = await confirm({
     title: '確認刪除',
     description: '此操作無法復原',
     variant: 'success'  // 誤導使用者
   })
   ```

2. **異步模式僅用於快速操作**
   ```typescript
   // ✅ 推薦：快速 API 呼叫（< 2 秒）
   const confirmed = await confirm({
     title: '確認送出',
     description: '資料將上傳至伺服器',
     isAsync: true
   })

   // ❌ 不推薦：長時間操作（> 2 秒）
   // 應該先關閉對話框，再顯示進度條或 Toast
   const confirmed = await confirm({
     title: '確認匯出',
     description: '可能需要 5-10 分鐘',
     isAsync: true  // 使用者會困惑為何等這麼久
   })
   ```

3. **避免巢狀對話框**
   ```typescript
   // ❌ 不推薦：巢狀確認
   const confirmed1 = await confirm({ title: '確認操作 1' })
   if (confirmed1) {
     const confirmed2 = await confirm({ title: '確認操作 2' })
     if (confirmed2) {
       // ...
     }
   }

   // ✅ 推薦：合併確認
   const confirmed = await confirm({
     title: '批次操作',
     description: `即將執行：
1. 操作 A
2. 操作 B

確定要繼續嗎？`
   })
   ```

---

## 測試建議

### 單元測試範例 (Vitest + React Testing Library)

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DialogProvider, useConfirm } from '@/lib/contexts/dialog-context'

function TestComponent() {
  const confirm = useConfirm()
  const [result, setResult] = useState<boolean | null>(null)

  const handleClick = async () => {
    const confirmed = await confirm({
      title: '確認刪除',
      description: '此操作無法復原'
    })
    setResult(confirmed)
  }

  return (
    <>
      <button onClick={handleClick}>刪除</button>
      {result !== null && <div>結果: {result ? '已確認' : '已取消'}</div>}
    </>
  )
}

describe('useConfirm', () => {
  it('點擊確認應該回傳 true', async () => {
    render(
      <DialogProvider>
        <TestComponent />
      </DialogProvider>
    )

    fireEvent.click(screen.getByText('刪除'))
    fireEvent.click(screen.getByText('確定'))

    await waitFor(() => {
      expect(screen.getByText('結果: 已確認')).toBeInTheDocument()
    })
  })

  it('點擊取消應該回傳 false', async () => {
    render(
      <DialogProvider>
        <TestComponent />
      </DialogProvider>
    )

    fireEvent.click(screen.getByText('刪除'))
    fireEvent.click(screen.getByText('取消'))

    await waitFor(() => {
      expect(screen.getByText('結果: 已取消')).toBeInTheDocument()
    })
  })

  it('按下 ESC 應該回傳 false', async () => {
    render(
      <DialogProvider>
        <TestComponent />
      </DialogProvider>
    )

    fireEvent.click(screen.getByText('刪除'))
    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.getByText('結果: 已取消')).toBeInTheDocument()
    })
  })
})
```

---

## 實際應用範例

### 刪除操作

```typescript
async function handleDelete(id: string) {
  const confirmed = await confirm({
    title: '確認刪除',
    description: '刪除後無法復原，確定要繼續嗎？',
    variant: 'danger',
    confirmText: '刪除',
    cancelText: '保留'
  })

  if (confirmed) {
    await deleteProduct(id)
    toast.success('已刪除商品')
    router.refresh()
  }
}
```

### 登出操作

```typescript
async function handleLogout() {
  const confirmed = await confirm({
    title: '確認登出',
    description: '登出後需要重新登入才能繼續使用',
    variant: 'warning',
    confirmText: '登出',
    cancelText: '留在此頁'
  })

  if (confirmed) {
    await signOut()
    router.push('/login')
  }
}
```

### 表單離開確認

```typescript
function useUnsavedChangesWarning(hasUnsavedChanges: boolean) {
  const confirm = useConfirm()
  const router = useRouter()

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const navigateWithConfirm = async (path: string) => {
    if (!hasUnsavedChanges) {
      router.push(path)
      return
    }

    const confirmed = await confirm({
      title: '尚未儲存變更',
      description: '離開此頁面將遺失未儲存的變更，確定要繼續嗎？',
      variant: 'warning',
      confirmText: '離開',
      cancelText: '繼續編輯'
    })

    if (confirmed) {
      router.push(path)
    }
  }

  return navigateWithConfirm
}
```

---

## 版本歷史

| 版本 | 日期 | 變更內容 |
|------|------|---------|
| 1.0.0 | 2026-01-07 | 初始版本，Phase 0 實作完成 |

---

## 相關文件

- [useAlert API Contract](./useAlert.md)
- [usePrompt API Contract](./usePrompt.md)
- [DialogContext 實作](../../lib/contexts/dialog-context.tsx)
- [ConfirmDialog 元件](../../components/ui/dialogs/confirm-dialog.tsx)
- [設計規範](../../research.md#決策-2-neo-brutalism-設計實作)
