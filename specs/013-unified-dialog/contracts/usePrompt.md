# API Contract: usePrompt Hook

**版本**: 1.0.0
**最後更新**: 2026-01-07
**狀態**: ✅ 已實作

---

## 概述

`usePrompt` Hook 提供多欄位輸入對話框，用於收集使用者輸入資料。取代原生 `window.prompt()`，支援多欄位、即時驗證、字數限制等進階功能。

---

## 匯入方式

```typescript
import { usePrompt } from '@/lib/contexts/dialog-context'
```

---

## 型別定義

### PromptDialogOptions

```typescript
interface PromptDialogOptions {
  /** 對話框標題 */
  title: string

  /** 對話框描述（可選） */
  message?: string

  /** 輸入欄位陣列 */
  fields: PromptDialogField[]

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
}
```

### PromptDialogField

```typescript
interface PromptDialogField {
  /** 欄位名稱（用於 key） */
  name: string

  /** 欄位標籤 */
  label: string

  /**
   * 欄位類型
   * @default 'text'
   */
  type?: 'text' | 'number' | 'textarea'

  /**
   * 預設值
   * @default ''
   */
  defaultValue?: string

  /**
   * 佔位符號
   */
  placeholder?: string

  /**
   * 是否必填
   * @default false
   */
  required?: boolean

  /**
   * 最大字數限制
   */
  maxLength?: number

  /**
   * 自訂驗證函式
   * @param value - 目前輸入值
   * @returns 錯誤訊息，無錯誤時回傳 null
   */
  validation?: (value: string) => string | null
}
```

---

## 使用方式

### 基本用法（單一欄位）

```typescript
'use client'

import { usePrompt } from '@/lib/contexts/dialog-context'

export function MyComponent() {
  const prompt = usePrompt()

  const handleClick = async () => {
    // 顯示輸入對話框
    const result = await prompt({
      title: '輸入名稱',
      fields: [
        {
          name: 'name',
          label: '姓名',
          required: true
        }
      ]
    })

    if (result) {
      // 使用者點擊「確定」
      console.log('輸入的名稱:', result.name)
    } else {
      // 使用者點擊「取消」或關閉對話框
      console.log('已取消')
    }
  }

  return <button onClick={handleClick}>輸入名稱</button>
}
```

### 多欄位輸入

```typescript
const result = await prompt({
  title: '新增客戶',
  message: '請填寫客戶基本資料',
  fields: [
    {
      name: 'name',
      label: '客戶名稱',
      required: true,
      placeholder: '例: 王小明'
    },
    {
      name: 'phone',
      label: '聯絡電話',
      required: true,
      placeholder: '0912345678',
      validation: (value) => {
        const phoneRegex = /^09\d{8}$/
        return phoneRegex.test(value) ? null : '請輸入有效的手機號碼'
      }
    },
    {
      name: 'note',
      label: '備註',
      type: 'textarea',
      maxLength: 200,
      placeholder: '選填'
    }
  ]
})

if (result) {
  console.log('客戶資料:', result)
  // { name: '王小明', phone: '0912345678', note: '...' }
}
```

### 欄位類型範例

```typescript
// 1. 文字輸入（預設）
{
  name: 'title',
  label: '標題',
  type: 'text',
  maxLength: 50
}

// 2. 數字輸入
{
  name: 'quantity',
  label: '數量',
  type: 'number',
  defaultValue: '1',
  validation: (value) => {
    const num = parseInt(value)
    if (isNaN(num) || num < 1) return '數量必須大於 0'
    return null
  }
}

// 3. 多行文字輸入
{
  name: 'description',
  label: '商品描述',
  type: 'textarea',
  maxLength: 500,
  placeholder: '請輸入商品詳細說明...'
}
```

### 必填欄位驗證

```typescript
const result = await prompt({
  title: '建立帳號',
  fields: [
    {
      name: 'username',
      label: '使用者名稱',
      required: true,  // 紅色星號標示
      placeholder: '至少 3 個字元'
    },
    {
      name: 'email',
      label: '電子郵件',
      required: true,
      validation: (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(value) ? null : '請輸入有效的電子郵件'
      }
    }
  ]
})

// 若必填欄位為空或驗證失敗，確認按鈕會禁用
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
      maxLength: 200,  // 顯示「0/200」計數器
      placeholder: '最多 200 字'
    }
  ]
})
```

### 預設值設定

```typescript
const result = await prompt({
  title: '編輯商品',
  fields: [
    {
      name: 'name',
      label: '商品名稱',
      defaultValue: '原有商品名稱',  // 預填現有值
      required: true
    },
    {
      name: 'price',
      label: '價格',
      type: 'number',
      defaultValue: '100'
    }
  ]
})
```

---

## 回傳值

```typescript
Promise<Record<string, string> | null>
```

- **`Record<string, string>`**: 使用者點擊「確定」，回傳所有欄位的值（key 為 field.name）
- **`null`**: 使用者點擊「取消」、按下 ESC 鍵、或點擊背景遮罩

**範例**:
```typescript
const result = await prompt({
  title: '輸入資料',
  fields: [
    { name: 'name', label: '姓名' },
    { name: 'age', label: '年齡', type: 'number' }
  ]
})

// 使用者點擊確定
console.log(result)  // { name: '王小明', age: '25' }

// 使用者點擊取消
console.log(result)  // null
```

---

## 行為規範

### 對話框開啟時

1. **背景遮罩**: 顯示半透明黑色遮罩 (`bg-black/50`)
2. **滾動鎖定**: 鎖定背景頁面滾動 (`document.body.style.overflow = 'hidden'`)
3. **焦點管理**: 自動聚焦第一個輸入欄位
4. **動畫效果**:
   - 背景淡入 (`animate-in fade-in-0 duration-200`)
   - 對話框縮放進入 (`animate-in zoom-in-95 duration-200`)

### 即時驗證行為

```typescript
// 驗證觸發時機
onChange={(e) => {
  const value = e.target.value
  const error = validateField(field, value)
  setErrors(prev => ({ ...prev, [field.name]: error }))
}}

// 驗證邏輯
function validateField(field: PromptDialogField, value: string): string | null {
  // 1. 必填檢查
  if (field.required && !value.trim()) {
    return `${field.label}為必填欄位`
  }

  // 2. 字數限制檢查
  if (field.maxLength && value.length > field.maxLength) {
    return `不得超過 ${field.maxLength} 個字元`
  }

  // 3. 自訂驗證
  if (field.validation) {
    return field.validation(value)
  }

  return null
}
```

### 送出條件

確認按鈕僅在以下情況啟用：
- ✅ 所有必填欄位皆有值
- ✅ 所有欄位驗證通過（無錯誤訊息）

```typescript
const hasErrors = Object.values(errors).some(error => error !== null)
const hasEmptyRequired = fields.some(
  field => field.required && !values[field.name]?.trim()
)

const isSubmitDisabled = hasErrors || hasEmptyRequired
```

### 關閉方式

| 操作 | 回傳值 |
|------|--------|
| 點擊確認按鈕 | `Record<string, string>`（所有欄位值） |
| 點擊取消按鈕 | `null` |
| 按下 ESC 鍵 | `null` |
| 點擊背景遮罩 | `null` |
| 驗證失敗時點擊確認 | 不關閉（按鈕禁用） |

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

/* 輸入欄位 */
border: 2px solid black;
focus:ring-2 focus:ring-black;

/* 錯誤狀態 */
border-red-500;
text-red-600;
```

### 輸入欄位佈局

```tsx
{/* 文字輸入 */}
<input
  type="text"
  className="w-full border-2 border-black p-2 focus:outline-none focus:ring-2 focus:ring-black"
/>

{/* 多行輸入 */}
<textarea
  rows={4}
  className="w-full border-2 border-black p-2 resize-none focus:outline-none focus:ring-2 focus:ring-black"
/>

{/* 必填星號 */}
<label>
  姓名 <span className="text-red-500">*</span>
</label>

{/* 字數計數器 */}
<div className="text-xs text-gray-500 mt-1">
  {value.length}/{maxLength}
</div>

{/* 錯誤訊息 */}
<div className="text-xs text-red-600 mt-1">
  {error}
</div>
```

### 響應式設計

- **手機**: 最大寬度 `max-w-md`（28rem / 448px）
- **平板/桌面**: 維持相同寬度，置中顯示
- **欄位間距**: `space-y-4`（1rem）
- **最大高度**: `max-h-[80vh]` 避免超出視窗，啟用內部滾動

---

## 無障礙性 (WCAG 2.1 AA)

### ARIA 屬性

```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="prompt-dialog-title"
  aria-describedby="prompt-dialog-message"
>
  <h2 id="prompt-dialog-title">{title}</h2>
  {message && <p id="prompt-dialog-message">{message}</p>}

  {/* 輸入欄位 */}
  <label htmlFor={`field-${field.name}`}>
    {field.label}
    {field.required && <span aria-label="必填">*</span>}
  </label>
  <input
    id={`field-${field.name}`}
    aria-required={field.required}
    aria-invalid={!!errors[field.name]}
    aria-describedby={errors[field.name] ? `error-${field.name}` : undefined}
  />
  {errors[field.name] && (
    <div id={`error-${field.name}`} role="alert">
      {errors[field.name]}
    </div>
  )}
</div>
```

### 鍵盤支援

| 按鍵 | 行為 |
|------|------|
| `Tab` | 在欄位與按鈕間切換聚焦 |
| `Enter` | 送出表單（若無錯誤） |
| `Escape` | 取消並關閉對話框 |
| `Shift + Tab` | 反向切換聚焦 |

### 螢幕閱讀器

- ✅ 必填欄位朗讀「必填」(`aria-required="true"`)
- ✅ 錯誤訊息即時朗讀（`role="alert"`）
- ✅ 字數限制提示（`aria-describedby`）
- ✅ 對話框開啟時朗讀標題與描述

---

## 錯誤處理

### 常見錯誤

#### 1. 在 DialogProvider 外呼叫

```typescript
// ❌ 錯誤：未包裹 DialogProvider
const prompt = usePrompt() // Error: usePrompt must be used within DialogProvider
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
  const prompt = usePrompt() // Error: Hooks cannot be used in Server Components
}
```

**解決方式**: 將功能移至 Client Component

```tsx
// components/AddItemButton.tsx
'use client'

export function AddItemButton() {
  const prompt = usePrompt()
  // ...
}
```

#### 3. 忽略驗證錯誤

```typescript
// ⚠️ 警告：未檢查回傳值
const result = await prompt({ title: '輸入資料', fields: [...] })
console.log(result.name)  // 若使用者取消，result 為 null，會拋出錯誤

// ✅ 正確：檢查回傳值
const result = await prompt({ title: '輸入資料', fields: [...] })
if (result) {
  console.log(result.name)  // 安全存取
}
```

---

## 效能考量

### 最佳實踐

1. **避免過多欄位**: 超過 5 個欄位建議改用完整表單頁面
   ```typescript
   // ❌ 不推薦：8 個欄位的對話框
   const result = await prompt({
     title: '完整註冊',
     fields: [
       { name: 'name', label: '姓名' },
       { name: 'email', label: '電子郵件' },
       { name: 'phone', label: '電話' },
       { name: 'address', label: '地址' },
       { name: 'city', label: '城市' },
       { name: 'zipcode', label: '郵遞區號' },
       { name: 'company', label: '公司' },
       { name: 'note', label: '備註', type: 'textarea' }
     ]
   })

   // ✅ 推薦：建立獨立的註冊頁面
   router.push('/register')
   ```

2. **複雜驗證使用防抖動**
   ```typescript
   import { debounce } from 'lodash-es'

   const validateEmail = debounce(async (email: string) => {
     // 呼叫 API 檢查 Email 是否已註冊
     const exists = await checkEmailExists(email)
     return exists ? 'Email 已被使用' : null
   }, 500)

   const result = await prompt({
     title: '註冊',
     fields: [
       {
         name: 'email',
         label: 'Email',
         validation: validateEmail
       }
     ]
   })
   ```

3. **使用 defaultValue 避免重複輸入**
   ```typescript
   // ✅ 推薦：編輯模式預填現有值
   const result = await prompt({
     title: '編輯商品',
     fields: [
       {
         name: 'name',
         label: '商品名稱',
         defaultValue: existingProduct.name
       },
       {
         name: 'price',
         label: '價格',
         type: 'number',
         defaultValue: existingProduct.price.toString()
       }
     ]
   })
   ```

---

## 測試建議

### 單元測試範例 (Vitest + React Testing Library)

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DialogProvider, usePrompt } from '@/lib/contexts/dialog-context'

function TestComponent() {
  const prompt = usePrompt()
  const [result, setResult] = useState<Record<string, string> | null>(null)

  const handleClick = async () => {
    const data = await prompt({
      title: '輸入名稱',
      fields: [
        { name: 'name', label: '姓名', required: true }
      ]
    })
    setResult(data)
  }

  return (
    <>
      <button onClick={handleClick}>開啟</button>
      {result && <div>結果: {result.name}</div>}
    </>
  )
}

describe('usePrompt', () => {
  it('應該顯示輸入對話框', () => {
    render(
      <DialogProvider>
        <TestComponent />
      </DialogProvider>
    )

    fireEvent.click(screen.getByText('開啟'))

    expect(screen.getByText('輸入名稱')).toBeInTheDocument()
    expect(screen.getByLabelText('姓名 *')).toBeInTheDocument()
  })

  it('必填欄位為空時應禁用確認按鈕', () => {
    render(
      <DialogProvider>
        <TestComponent />
      </DialogProvider>
    )

    fireEvent.click(screen.getByText('開啟'))

    const submitButton = screen.getByText('確定')
    expect(submitButton).toBeDisabled()
  })

  it('輸入值後應啟用確認按鈕', async () => {
    render(
      <DialogProvider>
        <TestComponent />
      </DialogProvider>
    )

    fireEvent.click(screen.getByText('開啟'))

    const input = screen.getByLabelText('姓名 *')
    fireEvent.change(input, { target: { value: '王小明' } })

    const submitButton = screen.getByText('確定')
    expect(submitButton).not.toBeDisabled()
  })

  it('點擊確認應回傳輸入值', async () => {
    render(
      <DialogProvider>
        <TestComponent />
      </DialogProvider>
    )

    fireEvent.click(screen.getByText('開啟'))

    const input = screen.getByLabelText('姓名 *')
    fireEvent.change(input, { target: { value: '王小明' } })
    fireEvent.click(screen.getByText('確定'))

    await waitFor(() => {
      expect(screen.getByText('結果: 王小明')).toBeInTheDocument()
    })
  })

  it('點擊取消應回傳 null', async () => {
    render(
      <DialogProvider>
        <TestComponent />
      </DialogProvider>
    )

    fireEvent.click(screen.getByText('開啟'))
    fireEvent.click(screen.getByText('取消'))

    await waitFor(() => {
      expect(screen.queryByText(/結果:/)).not.toBeInTheDocument()
    })
  })
})
```

---

## 實際應用範例

### 快速新增項目

```typescript
async function handleQuickAdd() {
  const result = await prompt({
    title: '快速新增商品',
    message: '填寫基本資料後可在列表中繼續編輯',
    fields: [
      {
        name: 'name',
        label: '商品名稱',
        required: true,
        maxLength: 50
      },
      {
        name: 'price',
        label: '價格',
        type: 'number',
        defaultValue: '0',
        required: true
      }
    ]
  })

  if (result) {
    await createProduct({
      name: result.name,
      price: parseInt(result.price)
    })
    toast.success('商品已新增')
    router.refresh()
  }
}
```

### 編輯現有資料

```typescript
async function handleEdit(item: Item) {
  const result = await prompt({
    title: '編輯項目',
    fields: [
      {
        name: 'name',
        label: '名稱',
        defaultValue: item.name,
        required: true
      },
      {
        name: 'note',
        label: '備註',
        type: 'textarea',
        defaultValue: item.note || '',
        maxLength: 200
      }
    ]
  })

  if (result) {
    await updateItem(item.id, {
      name: result.name,
      note: result.note
    })
    toast.success('已儲存變更')
  }
}
```

### 複雜驗證場景

```typescript
async function handleRegister() {
  const result = await prompt({
    title: '建立帳號',
    fields: [
      {
        name: 'username',
        label: '使用者名稱',
        required: true,
        validation: (value) => {
          if (value.length < 3) return '至少 3 個字元'
          if (!/^[a-zA-Z0-9_]+$/.test(value)) return '僅限英數字與底線'
          return null
        }
      },
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
        placeholder: '0912345678',
        validation: (value) => {
          const phoneRegex = /^09\d{8}$/
          return phoneRegex.test(value) ? null : '請輸入有效的手機號碼（09 開頭 10 碼）'
        }
      }
    ],
    confirmText: '註冊',
    cancelText: '取消'
  })

  if (result) {
    await registerUser(result)
    toast.success('註冊成功')
    router.push('/login')
  }
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
- [useConfirm API Contract](./useConfirm.md)
- [DialogContext 實作](../../lib/contexts/dialog-context.tsx)
- [PromptDialog 元件](../../components/ui/dialogs/prompt-dialog.tsx)
- [設計規範](../../research.md#決策-2-neo-brutalism-設計實作)
