# Quick Start: 統一對話框系統

**版本**: 1.0.0
**預估閱讀時間**: 5 分鐘
**最後更新**: 2026-01-07

---

## 🎯 快速導覽

本指南幫助開發者在 **5 分鐘內** 開始使用統一對話框系統，取代原生瀏覽器對話框（alert、confirm、prompt）。

---

## 📦 安裝與設定

### 1. 確認 DialogProvider 已安裝

對話框系統已整合至根佈局，無需額外設定：

```tsx
// app/layout.tsx（已完成）
import { DialogProvider } from '@/lib/contexts/dialog-context'
import { Toaster } from 'sonner'

export default function RootLayout({ children }) {
  return (
    <DialogProvider>
      {children}
      <Toaster position="top-right" />
    </DialogProvider>
  )
}
```

### 2. 確認依賴已安裝

```bash
# sonner Toast 已安裝
pnpm list sonner
```

---

## 🚀 基本使用

### AlertDialog - 通知型對話框

```typescript
'use client'

import { useAlert } from '@/lib/contexts/dialog-context'

export function MyComponent() {
  const alert = useAlert()

  const handleSave = async () => {
    // 執行儲存操作
    await saveData()

    // 顯示成功訊息
    await alert({
      title: '儲存成功',
      message: '您的變更已儲存',
      variant: 'success'
    })
  }

  return <button onClick={handleSave}>儲存</button>
}
```

**四種變體**:
- `success` - 綠色（成功）
- `error` - 紅色（錯誤）
- `warning` - 黃色（警告）
- `info` - 藍色（資訊，預設）

---

### ConfirmDialog - 確認型對話框

```typescript
'use client'

import { useConfirm } from '@/lib/contexts/dialog-context'
import { toast } from 'sonner'

export function DeleteButton({ id }: { id: string }) {
  const confirm = useConfirm()

  const handleDelete = async () => {
    // 顯示確認對話框
    const confirmed = await confirm({
      title: '確認刪除',
      description: '此操作無法復原，確定要刪除嗎？',
      variant: 'danger'
    })

    if (confirmed) {
      await deleteItem(id)
      toast.success('已刪除')
    }
  }

  return <button onClick={handleDelete}>刪除</button>
}
```

**六種變體**:
- `success` - 綠色（成功確認）
- `error` - 紅色（錯誤提示）
- `warning` - 黃色（警告）
- `info` - 藍色（資訊）
- `danger` - 紅色 + 警告圖示（危險操作）
- `default` - 灰色（一般確認）

---

### PromptDialog - 輸入型對話框

```typescript
'use client'

import { usePrompt } from '@/lib/contexts/dialog-context'
import { toast } from 'sonner'

export function AddItemButton() {
  const prompt = usePrompt()

  const handleAdd = async () => {
    // 顯示輸入對話框
    const result = await prompt({
      title: '新增項目',
      fields: [
        {
          name: 'name',
          label: '名稱',
          required: true,
          maxLength: 50
        },
        {
          name: 'note',
          label: '備註',
          type: 'textarea',
          maxLength: 200
        }
      ]
    })

    if (result) {
      await createItem(result.name, result.note)
      toast.success('已新增')
    }
  }

  return <button onClick={handleAdd}>新增</button>
}
```

**欄位類型**:
- `text` - 單行文字（預設）
- `number` - 數字輸入
- `textarea` - 多行文字

---

## 📚 常見使用場景

### 1. 儲存成功通知

```typescript
await alert({
  title: '成功',
  message: '資料已儲存',
  variant: 'success'
})
```

### 2. 錯誤提示

```typescript
await alert({
  title: '儲存失敗',
  message: '網路連線異常，請稍後再試',
  variant: 'error'
})
```

### 3. 刪除確認

```typescript
const confirmed = await confirm({
  title: '確認刪除',
  description: '此操作無法復原，確定要刪除嗎？',
  variant: 'danger'
})

if (confirmed) {
  await deleteItem()
}
```

### 4. 登出確認

```typescript
const confirmed = await confirm({
  title: '確認登出',
  description: '登出後需要重新登入才能繼續使用',
  variant: 'warning',
  confirmText: '登出',
  cancelText: '留在此頁'
})

if (confirmed) {
  await signOut()
}
```

### 5. 快速新增項目

```typescript
const result = await prompt({
  title: '快速新增商品',
  fields: [
    {
      name: 'name',
      label: '商品名稱',
      required: true
    },
    {
      name: 'price',
      label: '價格',
      type: 'number',
      defaultValue: '0'
    }
  ]
})

if (result) {
  await createProduct(result.name, parseInt(result.price))
}
```

### 6. 編輯現有資料

```typescript
const result = await prompt({
  title: '編輯項目',
  fields: [
    {
      name: 'name',
      label: '名稱',
      defaultValue: existingItem.name,  // 預填現有值
      required: true
    },
    {
      name: 'note',
      label: '備註',
      type: 'textarea',
      defaultValue: existingItem.note || ''
    }
  ]
})

if (result) {
  await updateItem(result)
}
```

---

## 🎨 進階功能

### 自訂按鈕文字

```typescript
await confirm({
  title: '切換帳號',
  description: '切換帳號將登出目前使用者',
  confirmText: '切換',
  cancelText: '留在此帳號'
})
```

### 禁用關閉功能

```typescript
await alert({
  title: '重要通知',
  message: '請務必閱讀完畢',
  closable: false  // 禁用 ESC 鍵與背景點擊
})
```

### 異步操作模式

```typescript
await confirm({
  title: '確認送出',
  description: '資料將上傳至伺服器',
  isAsync: true  // 點擊確定後顯示載入動畫
})
```

### 欄位驗證

```typescript
const result = await prompt({
  title: '建立帳號',
  fields: [
    {
      name: 'email',
      label: '電子郵件',
      required: true,
      validation: (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(value) ? null : '請輸入有效的電子郵件'
      }
    },
    {
      name: 'phone',
      label: '手機號碼',
      required: true,
      validation: (value) => {
        const phoneRegex = /^09\d{8}$/
        return phoneRegex.test(value) ? null : '請輸入有效的手機號碼'
      }
    }
  ]
})
```

### 字數限制與即時顯示

```typescript
const result = await prompt({
  title: '編輯備註',
  fields: [
    {
      name: 'note',
      label: '備註',
      type: 'textarea',
      maxLength: 200  // 顯示「0/200」計數器
    }
  ]
})
```

---

## 🔧 遷移指南

### 從原生 alert 遷移

**原始寫法**:
```typescript
// ❌ 原生 alert
window.alert('儲存成功')
```

**新寫法**:
```typescript
// ✅ 統一對話框
const alert = useAlert()
await alert({
  title: '成功',
  message: '儲存成功',
  variant: 'success'
})
```

---

### 從原生 confirm 遷移

**原始寫法**:
```typescript
// ❌ 原生 confirm
if (window.confirm('確定要刪除嗎？')) {
  await deleteItem()
}
```

**新寫法**:
```typescript
// ✅ 統一對話框
const confirm = useConfirm()
const confirmed = await confirm({
  title: '確認刪除',
  description: '確定要刪除嗎？',
  variant: 'danger'
})

if (confirmed) {
  await deleteItem()
}
```

---

### 從原生 prompt 遷移

**原始寫法**:
```typescript
// ❌ 原生 prompt
const name = window.prompt('請輸入名稱')
if (name) {
  await createItem(name)
}
```

**新寫法**:
```typescript
// ✅ 統一對話框
const prompt = usePrompt()
const result = await prompt({
  title: '輸入名稱',
  fields: [
    {
      name: 'name',
      label: '名稱',
      required: true
    }
  ]
})

if (result) {
  await createItem(result.name)
}
```

---

## ⚠️ 常見錯誤

### 錯誤 1: 在 Server Component 使用

```typescript
// ❌ 錯誤：Server Component 無法使用 Hook
export default async function Page() {
  const alert = useAlert()  // Error!
}
```

**解決方式**: 將功能移至 Client Component

```typescript
// ✅ 正確：Client Component
'use client'

export function MyClientComponent() {
  const alert = useAlert()
  // ...
}
```

---

### 錯誤 2: 忽略回傳值

```typescript
// ⚠️ 警告：未檢查使用者選擇
confirm({ title: '確認刪除', description: '無法復原' })
await deleteItem()  // 不論使用者選擇都會執行！
```

**解決方式**: 檢查回傳值

```typescript
// ✅ 正確：檢查使用者選擇
const confirmed = await confirm({
  title: '確認刪除',
  description: '無法復原'
})

if (confirmed) {
  await deleteItem()
}
```

---

### 錯誤 3: prompt 回傳值為 null

```typescript
// ⚠️ 警告：未檢查 null
const result = await prompt({ title: '輸入', fields: [...] })
console.log(result.name)  // 若使用者取消，會拋出錯誤！
```

**解決方式**: 檢查 null

```typescript
// ✅ 正確：檢查 null
const result = await prompt({ title: '輸入', fields: [...] })
if (result) {
  console.log(result.name)  // 安全存取
}
```

---

## 🧪 測試範例

### 檢視所有對話框樣式

前往樣本頁面查看所有變體與測試按鈕：

```
http://localhost:3000/admin/dialog-samples
```

此頁面包含：
- ✅ 4 種 AlertDialog 變體
- ✅ 6 種 ConfirmDialog 變體
- ✅ 2 種 PromptDialog 範例（單欄位、多欄位）
- ✅ 4 種 Toast 類型
- ✅ 即時結果顯示
- ✅ 測試檢查清單

---

## 📖 完整文件

- **API 合約**:
  - [useAlert API Contract](./contracts/useAlert.md)
  - [useConfirm API Contract](./contracts/useConfirm.md)
  - [usePrompt API Contract](./contracts/usePrompt.md)
- **技術研究**: [research.md](./research.md)
- **實作計畫**: [plan.md](./plan.md)
- **規格文件**: [spec.md](./spec.md)

---

## 💡 最佳實踐

1. **使用 Toast 替代短訊息**
   ```typescript
   // ✅ 推薦：短訊息使用 Toast
   import { toast } from 'sonner'
   toast.success('已複製到剪貼簿')

   // ❌ 不推薦：短訊息使用 Alert
   await alert({ title: '成功', message: '已複製到剪貼簿' })
   ```

2. **危險操作使用 danger 變體**
   ```typescript
   // ✅ 推薦：刪除操作使用 danger
   await confirm({
     title: '確認刪除',
     description: '此操作無法復原',
     variant: 'danger'
   })
   ```

3. **避免過多欄位**
   ```typescript
   // ❌ 不推薦：8 個欄位的對話框
   const result = await prompt({
     title: '完整註冊',
     fields: [/* 8 個欄位 */]
   })

   // ✅ 推薦：建立獨立表單頁面
   router.push('/register')
   ```

4. **必填欄位標示清楚**
   ```typescript
   // ✅ 推薦：明確標示必填
   {
     name: 'name',
     label: '姓名',
     required: true  // 顯示紅色星號
   }
   ```

5. **提供預設值避免重複輸入**
   ```typescript
   // ✅ 推薦：編輯模式預填現有值
   {
     name: 'name',
     label: '商品名稱',
     defaultValue: existingProduct.name
   }
   ```

---

## 🎯 下一步

1. **瀏覽 API 合約**: 深入了解所有選項與行為規範
2. **查看樣本頁面**: `/admin/dialog-samples` 測試所有變體
3. **遷移現有對話框**: 參考本指南的遷移章節
4. **閱讀實作計畫**: 了解遷移優先級與策略

---

## 📞 支援

- **問題回報**: 參考 [plan.md](./plan.md) 的遷移優先級表
- **設計規範**: 參考 [research.md](./research.md) 的 Neo-Brutalism 設計章節
- **型別定義**: 參考 [types/dialog.ts](../../types/dialog.ts)

---

**版本**: 1.0.0
**最後更新**: 2026-01-07
**狀態**: ✅ Phase 0 完成，準備進入 Phase 2 遷移
