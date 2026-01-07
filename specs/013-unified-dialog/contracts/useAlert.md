# API Contract: useAlert Hook

**版本**: 1.0.0
**最後更新**: 2026-01-07
**狀態**: ✅ 已實作

---

## 概述

`useAlert` Hook 提供非阻塞式通知對話框，用於顯示訊息並等待使用者確認。取代原生 `window.alert()`，提供更好的使用者體驗與品牌一致性。

---

## 匯入方式

```typescript
import { useAlert } from '@/lib/contexts/dialog-context'
```

---

## 型別定義

### AlertDialogOptions

```typescript
interface AlertDialogOptions {
  /** 對話框標題 */
  title: string

  /** 對話框訊息內容（支援多行文字） */
  message: string

  /**
   * 視覺變體
   * @default 'info'
   */
  variant?: 'success' | 'error' | 'warning' | 'info'

  /**
   * 確認按鈕文字
   * @default '確定'
   */
  confirmText?: string

  /**
   * 是否允許 ESC 鍵或背景點擊關閉
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

import { useAlert } from '@/lib/contexts/dialog-context'

export function MyComponent() {
  const alert = useAlert()

  const handleClick = async () => {
    // 顯示對話框並等待使用者確認
    await alert({
      title: '成功',
      message: '資料已儲存',
      variant: 'success'
    })

    // 對話框關閉後繼續執行
    console.log('使用者已確認')
  }

  return <button onClick={handleClick}>儲存</button>
}
```

### 四種變體範例

```typescript
// 1. 成功訊息（綠色）
await alert({
  title: '儲存成功',
  message: '您的變更已儲存',
  variant: 'success'
})

// 2. 錯誤訊息（紅色）
await alert({
  title: '儲存失敗',
  message: '網路連線異常，請稍後再試',
  variant: 'error'
})

// 3. 警告訊息（黃色）
await alert({
  title: '注意',
  message: '此操作可能需要較長時間',
  variant: 'warning'
})

// 4. 資訊訊息（藍色，預設）
await alert({
  title: '提示',
  message: '系統將於 5 分鐘後維護',
  variant: 'info'
})
```

### 自訂按鈕文字

```typescript
await alert({
  title: '操作完成',
  message: '檔案已下載至您的裝置',
  variant: 'success',
  confirmText: '我知道了'
})
```

### 強制確認（禁用關閉）

```typescript
await alert({
  title: '重要通知',
  message: '請務必閱讀使用條款',
  variant: 'warning',
  closable: false  // 禁用 ESC 鍵與背景點擊
})
```

### 多行訊息

```typescript
await alert({
  title: '系統更新',
  message: `以下功能已更新：
1. 新增優惠券系統
2. 修復訂單列表效能問題
3. 改善購物車體驗`,
  variant: 'info'
})
```

---

## 回傳值

```typescript
Promise<void>
```

- **說明**: 當使用者點擊確認按鈕或關閉對話框時，Promise 會 resolve
- **錯誤處理**: 不會 reject（使用者無論如何關閉都視為確認）

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

| 操作 | 條件 | 行為 |
|------|------|------|
| 點擊確認按鈕 | 無條件 | 關閉對話框，Promise resolve |
| 按下 ESC 鍵 | `closable: true` | 關閉對話框，Promise resolve |
| 點擊背景遮罩 | `closable: true` | 關閉對話框，Promise resolve |
| 點擊確認按鈕 | `closable: false` | 僅此方式可關閉 |

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

/* 背景遮罩 */
background: rgba(0, 0, 0, 0.5);
```

### 變體色彩配置

| 變體 | 標題背景 | 圖示 | 按鈕背景 |
|------|---------|------|---------|
| success | bg-green-400 | CheckCircle | bg-green-500 hover:bg-green-600 |
| error | bg-red-400 | XCircle | bg-red-500 hover:bg-red-600 |
| warning | bg-yellow-400 | AlertTriangle | bg-yellow-500 hover:bg-yellow-600 |
| info | bg-blue-400 | Info | bg-blue-500 hover:bg-blue-600 |

### 響應式設計

- **手機**: 最大寬度 `max-w-md`（28rem / 448px）
- **平板/桌面**: 維持相同寬度，置中顯示
- **邊距**: 四周 `p-4` (1rem) 避免貼邊

---

## 無障礙性 (WCAG 2.1 AA)

### ARIA 屬性

```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="alert-dialog-title"
  aria-describedby="alert-dialog-message"
>
  <h2 id="alert-dialog-title">{title}</h2>
  <p id="alert-dialog-message">{message}</p>
</div>
```

### 鍵盤支援

| 按鍵 | 行為 |
|------|------|
| `Enter` | 確認（聚焦在按鈕上時） |
| `Space` | 確認（聚焦在按鈕上時） |
| `Escape` | 關閉（若 `closable: true`） |
| `Tab` | 僅在對話框內循環聚焦 |

### 螢幕閱讀器

- ✅ 對話框開啟時朗讀標題與內容
- ✅ 按鈕有明確的標籤（confirmText）
- ✅ 對話框關閉後焦點返回觸發元素

---

## 錯誤處理

### 常見錯誤

#### 1. 在 DialogProvider 外呼叫

```typescript
// ❌ 錯誤：未包裹 DialogProvider
const alert = useAlert() // Error: useAlert must be used within DialogProvider
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
  const alert = useAlert() // Error: Hooks cannot be used in Server Components
}
```

**解決方式**: 將功能移至 Client Component

```tsx
// components/MyClientComponent.tsx
'use client'

export function MyClientComponent() {
  const alert = useAlert()
  // ...
}
```

---

## 效能考量

### 最佳實踐

1. **避免頻繁呼叫**: 連續顯示多個對話框會造成使用者困擾
   ```typescript
   // ❌ 不推薦
   await alert({ title: '訊息 1', message: '內容 1' })
   await alert({ title: '訊息 2', message: '內容 2' })
   await alert({ title: '訊息 3', message: '內容 3' })

   // ✅ 推薦：合併訊息或使用 Toast
   await alert({
     title: '批次操作完成',
     message: '已處理 3 個項目',
     variant: 'success'
   })
   ```

2. **使用 Toast 替代短訊息**: 非關鍵訊息使用 Toast 更友善
   ```typescript
   import { toast } from 'sonner'

   // ✅ 推薦：短訊息使用 Toast
   toast.success('已複製到剪貼簿')

   // ❌ 不推薦：短訊息使用 Alert
   await alert({ title: '成功', message: '已複製到剪貼簿' })
   ```

3. **記憶體管理**: DialogContext 會自動清除狀態，無需手動處理

---

## 測試建議

### 單元測試範例 (Vitest + React Testing Library)

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { DialogProvider, useAlert } from '@/lib/contexts/dialog-context'

function TestComponent() {
  const alert = useAlert()

  return (
    <button onClick={() => alert({ title: '測試', message: '訊息' })}>
      開啟對話框
    </button>
  )
}

describe('useAlert', () => {
  it('應該顯示對話框', async () => {
    render(
      <DialogProvider>
        <TestComponent />
      </DialogProvider>
    )

    fireEvent.click(screen.getByText('開啟對話框'))

    expect(screen.getByText('測試')).toBeInTheDocument()
    expect(screen.getByText('訊息')).toBeInTheDocument()
  })

  it('點擊確認按鈕應該關閉對話框', async () => {
    render(
      <DialogProvider>
        <TestComponent />
      </DialogProvider>
    )

    fireEvent.click(screen.getByText('開啟對話框'))
    fireEvent.click(screen.getByText('確定'))

    expect(screen.queryByText('測試')).not.toBeInTheDocument()
  })
})
```

---

## 版本歷史

| 版本 | 日期 | 變更內容 |
|------|------|---------|
| 1.0.0 | 2026-01-07 | 初始版本，Phase 0 實作完成 |

---

## 相關文件

- [useConfirm API Contract](./useConfirm.md)
- [usePrompt API Contract](./usePrompt.md)
- [DialogContext 實作](../../lib/contexts/dialog-context.tsx)
- [AlertDialog 元件](../../components/ui/dialogs/alert-dialog.tsx)
- [設計規範](../../research.md#決策-2-neo-brutalism-設計實作)
