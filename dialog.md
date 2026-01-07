# 統一對話框系統重構計畫

## 專案目標
將專案中所有原生瀏覽器對話框（alert、confirm、prompt）替換為符合 Neo-Brutalism 設計風格的自訂對話框元件。

## 現狀分析

### 當前問題
1. **72 個原生對話框分散在 18 個檔案中**
   - 50 個 `alert()` 呼叫（69%）
   - 20 個 `confirm()` 呼叫（28%）
   - 2 個 `prompt()` 呼叫（3%）

2. **設計不一致**
   - 原生對話框無法控制樣式
   - 現有的 shadcn/ui Dialog 元件未使用 Neo-Brutalism 風格
   - 僅有 `ConfirmDialog` 元件符合設計規範（但僅 2 個地方使用）

3. **使用者體驗問題**
   - 原生對話框外觀與品牌設計不符
   - 行動裝置上原生對話框體驗較差
   - 無法統一管理對話框行為（動畫、快捷鍵等）

### 現有資源
✅ **可用元件**:
- `components/ui/confirm-dialog.tsx` - 已符合 Neo-Brutalism 風格的確認對話框
- `components/ui/dialog.tsx` - shadcn/ui 基礎對話框（需要重新設計）

✅ **設計規範**:
- 3px 黑色邊框
- 硬陰影: `shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`
- 點擊位移效果
- 無圓角（Neo-Brutalism 特色）

## 實作策略

### Phase 1: 建立統一對話框元件庫與基礎設施

#### 1.1 安裝 sonner（Toast 通知函式庫）
```bash
pnpm add sonner
```

#### 1.2 建立型別定義檔案
**檔案**: `types/dialog.ts`

```typescript
export type DialogVariant = 'success' | 'error' | 'warning' | 'info' | 'danger' | 'default'

export interface AlertDialogOptions {
  title: string
  message: string
  variant?: 'success' | 'error' | 'warning' | 'info'
  confirmText?: string
}

export interface ConfirmDialogOptions {
  title: string
  description: string
  variant?: DialogVariant
  confirmText?: string
  cancelText?: string
  isAsync?: boolean  // 支援異步操作
}

export interface PromptDialogField {
  name: string
  label: string
  type?: 'text' | 'number' | 'textarea'
  placeholder?: string
  defaultValue?: string
  required?: boolean
  maxLength?: number
  validation?: (value: string) => string | null  // 回傳錯誤訊息或 null
}

export interface PromptDialogOptions {
  title: string
  message?: string
  fields: PromptDialogField[]
  confirmText?: string
  cancelText?: string
}
```

#### 1.3 建立 DialogProvider 與 Context
**檔案**: `lib/contexts/dialog-context.tsx`

提供統一的對話框狀態管理，包含：
- `useAlert()` Hook - 回傳 `(options: AlertDialogOptions) => Promise<void>`
- `useConfirm()` Hook - 回傳 `(options: ConfirmDialogOptions) => Promise<boolean>`
- `usePrompt()` Hook - 回傳 `(options: PromptDialogOptions) => Promise<Record<string, string> | null>`

#### 1.4 AlertDialog 元件（替代 alert()）
**檔案**: `components/ui/dialogs/alert-dialog.tsx`

**功能需求**:
- 單一確認按鈕
- 支援四種變體: success（綠色 bg-green-400）、error（紅色 bg-red-400）、warning（黃色 bg-yellow-400）、info（藍色 bg-blue-400）
- 彩色標題欄包含對應圖示（CheckCircle、XCircle、AlertTriangle、Info）
- ESC 鍵關閉、外部點擊關閉
- 簡潔動畫：`animate-in fade-in zoom-in-95 duration-200`

**設計細節**:
```typescript
// 容器
"fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"

// 對話框
"w-full max-w-md border-3 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in fade-in zoom-in-95 duration-200"

// 標題欄（success 範例）
"border-b-3 border-black bg-green-400 text-white p-4 flex items-center gap-3"

// 確認按鈕
"w-full border-3 border-black bg-green-500 hover:bg-green-600 text-white px-4 py-2 font-bold transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
```

#### 1.5 ConfirmDialog 元件（增強現有版本）
**檔案**: `components/ui/dialogs/confirm-dialog.tsx`（移動位置並增強）

**增強功能**:
1. 新增 `success` 變體（綠色標題欄 bg-green-400）
2. 新增 `info` 變體（藍色標題欄 bg-blue-400）
3. 支援 `isLoading` 狀態（顯示載入動畫，禁用按鈕）
4. 支援異步確認操作（`onConfirm` 可以是 async function）
5. 整合 Focus Trap（開啟時焦點鎖定在對話框內）

**現有功能保留**:
- danger（紅色 bg-red-400）、warning（黃色 bg-yellow-400）、default（灰色 bg-gray-200）
- ESC 鍵和外部點擊關閉
- Neo-Brutalism 設計風格
- 無障礙 ARIA 標籤

#### 1.6 PromptDialog 元件（替代 prompt()）
**檔案**: `components/ui/dialogs/prompt-dialog.tsx`

**功能需求**:
- 支援多個輸入欄位（fields 陣列）
- 即時驗證（輸入時顯示錯誤訊息）
- 支援 text、number、textarea 三種類型
- 輸入欄位使用 3px 黑邊框（Neo-Brutalism）
- Enter 鍵提交（單行輸入）
- 錯誤訊息顯示在欄位下方（紅色文字）

**設計細節**:
```typescript
// 輸入欄位
"w-full border-3 border-black px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"

// 錯誤狀態
"border-red-500"  // 邊框變紅

// 錯誤訊息
"text-xs text-red-600 mt-1"
```

#### 1.7 Toast 通知（使用 sonner）
**檔案**: 整合到 `app/layout.tsx`

使用 sonner 函式庫並自訂 Neo-Brutalism 樣式：
```typescript
import { Toaster } from 'sonner'

<Toaster
  position="top-right"
  toastOptions={{
    style: {
      border: '3px solid black',
      boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)',
      borderRadius: '0',
    },
    className: 'font-bold',
  }}
/>
```

使用範例：
```typescript
import { toast } from 'sonner'

toast.success('儲存成功')
toast.error('刪除失敗')
toast.warning('請先填寫必填欄位')
toast.info('系統維護通知')
```

### Phase 2: 整合 DialogProvider 到應用程式
**檔案**: `app/layout.tsx`

在 RootLayout 中包裹 DialogProvider 和 Toaster：
```typescript
import { DialogProvider } from '@/lib/contexts/dialog-context'
import { Toaster } from 'sonner'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <DialogProvider>
          {children}
          <Toaster position="top-right" {...toastOptions} />
        </DialogProvider>
      </body>
    </html>
  )
}
```

### Phase 3: 逐步遷移原生對話框（18 個檔案，72 個對話框）

#### 遷移範例：tier-table.tsx
**原始程式碼**（Line 141）:
```typescript
const handleDelete = async (id: string, name: string) => {
  if (!confirm(`確定要刪除「${name}」等級嗎?`)) {
    return
  }

  setLoading(id)
  const result = await deleteTier(id)
  setLoading(null)

  if (result.success) {
    toast.success(result.message || '刪除成功')
    setTiers(tiers.filter(t => t.id !== id))
  } else {
    toast.error(result.message || '刪除失敗')
  }
}
```

**遷移後**:
```typescript
import { useConfirm } from '@/lib/contexts/dialog-context'

export function TierTable() {
  const confirm = useConfirm()

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: '確認刪除',
      description: `確定要刪除「${name}」等級嗎？此操作無法復原。`,
      variant: 'danger',
      confirmText: '刪除',
      cancelText: '取消'
    })

    if (!confirmed) return

    setLoading(id)
    const result = await deleteTier(id)
    setLoading(null)

    if (result.success) {
      toast.success(result.message || '刪除成功')
      setTiers(tiers.filter(t => t.id !== id))
    } else {
      toast.error(result.message || '刪除失敗')
    }
  }
}
```

**遷移檢查清單**（每個檔案）:
1. ✅ 在元件頂部匯入 Hook（`useAlert` / `useConfirm` / `usePrompt`）
2. ✅ 在元件內呼叫 Hook 取得函式
3. ✅ 替換 `alert()` 為 `await alert({ ... })`
4. ✅ 替換 `confirm()` 為 `const confirmed = await confirm({ ... })`
5. ✅ 替換 `prompt()` 為 `const result = await prompt({ ... })`
6. ✅ 選擇適當的 variant（success / error / warning / info / danger）
7. ✅ 測試對話框功能正常
8. ✅ 確認 ESC 和外部點擊關閉正常
9. ✅ TypeScript 型別檢查通過
10. ✅ Git commit 紀錄變更

---

#### 3.1 優先級 P0 - 高頻使用核心功能（5 個檔案，7 個對話框）
**策略**: 先遷移使用頻率最高、功能最核心的檔案

| 檔案 | 對話框數量 | 類型 | 遷移重點 |
|------|-----------|------|---------|
| `components/admin/tier-table.tsx` | 1 confirm | 刪除確認 | 使用 `useConfirm()` + variant: 'danger' |
| `components/admin/coupons/CouponList.tsx` | 1 confirm | 刪除確認 | 同上 |
| `components/admin/order-actions.tsx` | 1 confirm | 取消訂單 | 同上 |
| `components/admin/product-table.tsx` | 3 confirm<br>3 alert | 刪除、錯誤提示 | `useConfirm()` + `useAlert()` |
| `components/admin/category-table.tsx` | 1 confirm | 刪除確認 | `useConfirm()` + variant: 'danger' |

**預計時間**: 1-2 天

---

#### 3.2 優先級 P1 - 中頻使用功能（10 個檔案，40 個對話框）

| 檔案 | 對話框數量 | 類型 | 遷移重點 |
|------|-----------|------|---------|
| `components/admin/announcements/AnnouncementForm.tsx` | 5 alert | 表單驗證 | 考慮改用 Toast（即時回饋）|
| `components/admin/announcements/AnnouncementListClient.tsx` | 3 alert<br>1 confirm | 通知、刪除 | `useAlert()` + `useConfirm()` |
| `components/admin/LogoUploader.tsx` | 2 alert<br>1 confirm | 檔案驗證、刪除 | `useAlert()` variant: 'error' |
| `components/admin/series-delete-button.tsx` | 2 alert<br>1 confirm | 錯誤、刪除 | 同上 |
| `components/admin/product-table-with-tags.tsx` | 3 confirm<br>3 alert | 刪除、錯誤 | `useConfirm()` + `useAlert()` |
| `components/admin/MemberListClient.tsx` | 2 alert<br>1 confirm<br>1 prompt | 錯誤、刪除、重設密碼 | 完整三種 Hook |
| `components/admin/client-table.tsx` | 3 alert | 錯誤提示 | 已有 ConfirmDialog，僅需遷移 alert |
| `components/admin/tier-form.tsx` | 1 alert | 表單驗證 | 考慮改用 Toast |
| `components/admin/update-password-form.tsx` | 1 alert | 成功提示 | 改用 Toast |
| `components/admin/pricing/ProductPricingForm.tsx` | 2 alert | 成功/錯誤 | 改用 Toast |

**預計時間**: 3-4 天

---

#### 3.3 優先級 P2 - 低頻使用功能（9 個檔案，25 個對話框）

| 檔案 | 對話框數量 | 類型 | 遷移重點 |
|------|-----------|------|---------|
| `components/admin/orders/order-editor.tsx` | 3 alert<br>2 confirm<br>2 prompt | 訂單修改 | 完整三種 Hook，prompt 用於輸入費用 |
| `components/admin/orders/order-detail-content.tsx` | 1 confirm | 狀態更新 | `useConfirm()` |
| `components/shop/product-with-price-card.tsx` | 1 alert | 加入購物車 | 改用 Toast |
| `components/shop/navbar.tsx` | 1 confirm<br>1 alert | 登出確認 | `useConfirm()` + Toast |
| `components/ui/image-upload.tsx` | 1 confirm | 刪除圖片 | `useConfirm()` |
| `components/admin/client-form.tsx` | 1 alert | 表單錯誤 | 改用 Toast |
| `components/admin/client-form-v2.tsx` | 1 alert | 表單錯誤 | 改用 Toast |
| `components/admin/category-form.tsx` | 1 alert | 表單錯誤 | 改用 Toast |

**預計時間**: 2-3 天

---

### Phase 3 總結
- **總計**: 18 個檔案、72 個對話框
- **時程**: 6-9 天（含測試）
- **策略**: 依使用頻率和功能重要性排序，逐一遷移並測試

### Phase 4: 品質保證與優化

#### 4.1 建立 ESLint 規則（禁用原生對話框）
**檔案**: `.eslintrc.js`

新增自訂規則防止未來使用原生對話框：
```javascript
module.exports = {
  rules: {
    'no-restricted-globals': [
      'error',
      {
        name: 'alert',
        message: '請使用 useAlert() Hook 替代原生 alert()'
      },
      {
        name: 'confirm',
        message: '請使用 useConfirm() Hook 替代原生 confirm()'
      },
      {
        name: 'prompt',
        message: '請使用 usePrompt() Hook 替代原生 prompt()'
      }
    ]
  }
}
```

#### 4.2 整合測試清單
- ✅ **桌面環境測試**（Chrome、Firefox、Edge）
  - 對話框正常顯示
  - ESC 鍵關閉
  - 外部點擊關閉
  - 按鈕點擊位移效果正確

- ✅ **行動裝置測試**（iOS Safari、Android Chrome）
  - 對話框居中顯示
  - 觸控操作流暢
  - 背景滾動鎖定（body overflow: hidden）
  - Toast 不遮擋重要內容

- ✅ **鍵盤導航測試**
  - Tab 鍵循環焦點
  - Enter 鍵確認（PromptDialog 單行輸入）
  - ESC 鍵取消
  - Focus Trap 正常運作

- ✅ **無障礙測試**
  - ARIA 標籤正確（role、aria-modal、aria-labelledby、aria-describedby）
  - 螢幕閱讀器正確朗讀標題和內容
  - 顏色對比度符合 WCAG AA（至少 4.5:1）

#### 4.3 效能優化
- ✅ 對話框元件使用 `React.memo()` 避免不必要的重新渲染
- ✅ 動畫使用 CSS `transition` 而非 JavaScript（GPU 加速）
- ✅ z-index 管理策略：DialogProvider base 100，每個對話框 +10
- ✅ Toast 最多顯示 3 個（避免畫面過載）

#### 4.4 文件撰寫
**檔案**: `docs/DIALOG_SYSTEM.md`

包含以下內容：
1. **快速開始**：如何使用三種 Hook
2. **API 參考**：完整的型別定義和參數說明
3. **範例程式碼**：常見使用情境（刪除確認、表單驗證、輸入對話框）
4. **設計規範**：Neo-Brutalism 樣式、顏色變體、動畫規範
5. **無障礙指南**：ARIA 標籤、鍵盤導航、螢幕閱讀器支援
6. **疑難排解**：常見問題和解決方案

**更新**: `CLAUDE.md`

在「開發規範」章節加入：
```markdown
### 對話框使用規範
- ❌ 禁止使用原生對話框（alert、confirm、prompt）
- ✅ 使用 useAlert()、useConfirm()、usePrompt() Hook
- ✅ 簡單的成功/失敗提示優先使用 Toast（sonner）
- ✅ 所有對話框必須符合 Neo-Brutalism 設計風格
- ✅ 選擇適當的 variant（success / error / warning / info / danger）
```

## 關鍵檔案清單

### 需要建立的檔案
```
components/ui/
├── alert-dialog.tsx           # 新建 - Alert 對話框
├── confirm-dialog.tsx         # 增強現有 - Confirm 對話框
├── prompt-dialog.tsx          # 新建 - Prompt 對話框
└── toast-notification.tsx     # 新建（選項）- Toast 通知

lib/hooks/
├── use-alert.ts               # 新建 - Alert Hook
├── use-confirm.ts             # 新建 - Confirm Hook
└── use-prompt.ts              # 新建 - Prompt Hook

lib/providers/
└── dialog-provider.tsx        # 新建 - 對話框 Context Provider
```

### 需要修改的檔案（Phase 3）
**共 18 個元件檔案** - 按優先級逐步遷移

## 設計規範參考

### Neo-Brutalism 對話框樣式
```typescript
// 對話框容器
const dialogStyles = cn(
  "fixed inset-0 z-50 flex items-center justify-center p-4",
  "bg-black/50" // 半透明背景
)

// 對話框內容
const contentStyles = cn(
  "bg-white",
  "border-3 border-black",
  "shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]",
  "max-w-md w-full",
  "rounded-none" // 無圓角
)

// 標題欄（依 variant 變色）
const headerStyles = cn(
  "border-b-3 border-black p-4",
  variant === 'success' && "bg-green-400",
  variant === 'error' && "bg-red-400",
  variant === 'warning' && "bg-yellow-400",
  variant === 'info' && "bg-blue-400",
  variant === 'default' && "bg-gray-200"
)

// 按鈕樣式
const buttonStyles = cn(
  "px-6 py-2",
  "border-3 border-black",
  "bg-white",
  "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
  "hover:translate-x-[2px] hover:translate-y-[2px]",
  "hover:shadow-none",
  "transition-all duration-150",
  "font-bold uppercase text-sm"
)
```

### 動畫規範
- 對話框淡入: `animate-in fade-in-0 zoom-in-95 duration-200`
- 對話框淡出: `animate-out fade-out-0 zoom-out-95 duration-200`
- 避免過度動畫，保持簡潔俐落

### 無障礙規範
- 對話框必須有 `role="dialog"` 和 `aria-modal="true"`
- 標題使用 `aria-labelledby`
- 描述使用 `aria-describedby`
- 開啟時 focus trap（焦點鎖定在對話框內）
- ESC 鍵關閉（除非是強制確認的對話框）

## 實作時程預估

### Phase 1: 元件庫建立（預計 3-4 天）
- Day 1: AlertDialog + useAlert Hook
- Day 2: 增強 ConfirmDialog + useConfirm Hook
- Day 3: PromptDialog + usePrompt Hook
- Day 4: Toast Notification（選項）+ 整合測試

### Phase 2: 逐步遷移（預計 4-5 天）
- Day 5-6: P0 商品與訂單管理（12 個對話框）
- Day 7: P0 分類與系列管理（5 個對話框）
- Day 8: P1 客戶與系統管理（13 個對話框）
- Day 9: P2 前台與上傳功能（7 個對話框）

### Phase 3: 測試與優化（預計 1-2 天）
- Day 10: 整合測試、效能優化、文件撰寫

**總計**: 8-11 天（不含 Code Review）

## 成功指標

### 量化指標
- ✅ 0 個原生對話框呼叫（從 72 個減少到 0）
- ✅ 18 個檔案完成遷移
- ✅ 100% 對話框符合 Neo-Brutalism 設計規範
- ✅ 支援鍵盤導航和螢幕閱讀器

### 質化指標
- ✅ 使用者回報：「對話框更美觀、更符合品牌風格」
- ✅ 開發者回報：「對話框 API 更易用」
- ✅ 行動裝置體驗改善（無需處理原生對話框限制）

## 風險評估

### 潛在風險
1. **破壞性變更**: 修改 18 個檔案可能引入 bug
   - **緩解策略**: 逐步遷移，每個檔案測試後再進行下一個

2. **使用者習慣**: 使用者可能習慣原生對話框
   - **緩解策略**: 保持相似的文案和按鈕配置

3. **無障礙問題**: 自訂對話框可能不如原生對話框無障礙
   - **緩解策略**: 嚴格遵循 ARIA 規範，測試螢幕閱讀器

## 下一步行動

1. **使用者確認**: 與使用者確認計畫內容和優先級
2. **Phase 1 實作**: 建立 AlertDialog、ConfirmDialog、PromptDialog 元件
3. **建立 Hook 介面**: 實作 useAlert、useConfirm、usePrompt
4. **P0 遷移測試**: 從商品管理開始遷移，確認流程可行性

## 附錄：對話框使用統計

### 依功能區域分佈
| 功能區域 | 檔案數 | alert | confirm | prompt | 合計 |
|---------|-------|-------|---------|--------|------|
| 商品管理 | 2 | 6 | 6 | 0 | 12 |
| 訂單管理 | 3 | 3 | 3 | 2 | 8 |
| 系統管理 | 2 | 8 | 2 | 1 | 11 |
| 客戶管理 | 3 | 5 | 1 | 0 | 6 |
| 分類/系列 | 3 | 3 | 2 | 0 | 5 |
| 前台購物 | 2 | 1 | 2 | 0 | 3 |
| 其他 | 3 | 15 | 4 | 0 | 19 |
| **合計** | **18** | **41** | **20** | **3** | **64** |

## 實作時程規劃

### **總時程**: 10-15 天

| Phase | 任務內容 | 預計時間 | 交付成果 |
|-------|---------|---------|---------|
| **Phase 1**<br>基礎建設 | • 安裝 sonner<br>• 建立型別定義<br>• 實作 DialogProvider<br>• 建立三個對話框元件<br>• 實作三個 Hook | 2-3 天 | 可用的對話框元件庫 |
| **Phase 2**<br>整合與設定 | • 整合 DialogProvider 到 app/layout.tsx<br>• 配置 Toaster (sonner)<br>• 新增 ESLint 規則 | 1 天 | 完整的基礎設施 |
| **Phase 3**<br>遷移 P0 | • 遷移 5 個高頻檔案<br>• 7 個對話框<br>• 測試核心功能 | 1-2 天 | 核心功能完成遷移 |
| **Phase 4**<br>遷移 P1 | • 遷移 10 個中頻檔案<br>• 40 個對話框<br>• 測試次要功能 | 3-4 天 | 主要功能完成遷移 |
| **Phase 5**<br>遷移 P2 | • 遷移 9 個低頻檔案<br>• 25 個對話框<br>• 測試前台功能 | 2-3 天 | 所有檔案完成遷移 |
| **Phase 6**<br>品質保證 | • 整合測試（桌面+行動）<br>• 無障礙測試<br>• 效能優化<br>• 撰寫文件 | 1-2 天 | 完整測試報告與文件 |

---

## 成功驗收標準

### 技術指標（必須 100% 達成）
- ✅ TypeScript 型別檢查 0 errors (`pnpm type-check`)
- ✅ ESLint 檢查 0 errors (`pnpm lint`)
- ✅ 0 個原生對話框呼叫（從 72 個減少到 0）
- ✅ 18 個檔案完成遷移
- ✅ Git commit 包含完整的變更說明

### 功能指標（必須通過測試）
- ✅ AlertDialog 四種變體（success/error/warning/info）正常運作
- ✅ ConfirmDialog 六種變體（success/error/warning/info/danger/default）正常運作
- ✅ ConfirmDialog 異步操作支援（isLoading 狀態）
- ✅ PromptDialog 多欄位輸入和即時驗證正常
- ✅ Toast 通知 3 秒自動消失
- ✅ ESC 鍵和外部點擊關閉正常
- ✅ Enter 鍵提交（PromptDialog 單行輸入）

### 設計指標（必須符合規範）
- ✅ 100% 符合 Neo-Brutalism 風格（3px 邊框、硬陰影、無圓角）
- ✅ 按鈕點擊位移效果正確（translate-x-[2px] translate-y-[2px] shadow-none）
- ✅ 顏色變體正確（success 綠、error 紅、warning 黃、info 藍）
- ✅ 響應式設計正常（手機和桌面都正常顯示）
- ✅ 動畫流暢（60fps，200ms 淡入+縮放）

### 無障礙指標（必須通過驗證）
- ✅ ARIA 標籤完整（role、aria-modal、aria-labelledby、aria-describedby）
- ✅ 鍵盤導航正常（Tab 循環、ESC 關閉、Enter 確認）
- ✅ Focus Trap 運作（焦點鎖定在對話框內）
- ✅ 螢幕閱讀器支援（NVDA/VoiceOver 測試通過）
- ✅ 顏色對比度符合 WCAG AA（至少 4.5:1）

---

## 關鍵參考檔案

### 現有檔案（需參考）
- [components/ui/confirm-dialog.tsx](components/ui/confirm-dialog.tsx) - 現有 ConfirmDialog 實作（Neo-Brutalism 範本）
- [lib/design-tokens.ts](lib/design-tokens.ts) - 設計 Token 系統
- [tailwind.config.ts](tailwind.config.ts) - Tailwind 配置（邊框、陰影定義）
- [components/admin/tier-table.tsx:141](components/admin/tier-table.tsx#L141) - P0 遷移範例

### 需建立的檔案（7 個）
- `types/dialog.ts` - 對話框型別定義
- `lib/contexts/dialog-context.tsx` - DialogProvider + 三個 Hook
- `components/ui/dialogs/alert-dialog.tsx` - AlertDialog 元件
- `components/ui/dialogs/confirm-dialog.tsx` - 增強版 ConfirmDialog
- `components/ui/dialogs/prompt-dialog.tsx` - PromptDialog 元件
- `components/ui/dialogs/index.ts` - 統一匯出
- `docs/DIALOG_SYSTEM.md` - 使用文件

### 需修改的檔案（20 個）
- `app/layout.tsx` - 整合 DialogProvider + Toaster
- `CLAUDE.md` - 更新對話框使用規範
- `.eslintrc.js` - 新增禁用原生對話框規則
- `package.json` - 新增 sonner 依賴
- 18 個元件檔案（詳見 Phase 3 遷移清單）

---

## 下一步行動

1. ✅ **使用者確認**: 計畫已獲得確認（完整遷移 + Toast + 簡潔動畫）
2. 🚀 **開始實作**: Phase 1 - 安裝 sonner 並建立對話框元件庫
3. 🔨 **建立基礎設施**: DialogProvider + 三個 Hook 介面
4. 🧪 **P0 遷移測試**: 從 tier-table.tsx 開始遷移，驗證流程
5. 📈 **持續追蹤**: 使用 Git 記錄每個檔案的遷移進度
