# Implementation Plan: 統一對話框系統

**Branch**: `013-unified-dialog` | **Date**: 2026-01-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-unified-dialog/spec.md`

## Summary

**主要需求**: 將專案中 72 個原生瀏覽器對話框（分散在 18 個檔案）替換為符合 Neo-Brutalism 設計風格的統一自訂對話框元件庫。

**技術方法**:
1. **Phase 0 (已完成)**: 建立三個基礎對話框元件（AlertDialog、ConfirmDialog、PromptDialog）+ DialogProvider + sonner Toast 整合 + 樣本頁面，讓使用者確認設計風格
2. **Phase 1 (本階段)**: 建立完整的遷移計畫，包含 API 合約、遷移策略、測試計畫
3. **Phase 2**: 遷移 P0 高頻核心功能（5 個檔案，7 個對話框）
2. **Phase 3**: 遷移 P1 中頻功能（10 個檔案，40 個對話框）
3. **Phase 4**: 遷移 P2 低頻功能（9 個檔案，25 個對話框）
4. **Phase 5**: 配置 ESLint 規則、完整測試、文件撰寫

**Phase 0 完成成果**:
- ✅ AlertDialog 元件（四種變體：success、error、warning、info）
- ✅ ConfirmDialog 元件（六種變體：success、error、warning、info、danger、default，支援異步載入）
- ✅ PromptDialog 元件（多欄位輸入、即時驗證、字數限制）
- ✅ DialogProvider Context（useAlert、useConfirm、usePrompt Hook）
- ✅ sonner Toast 整合（Neo-Brutalism 樣式）
- ✅ 樣本頁面 `/admin/dialog-samples`（14 個測試按鈕、即時結果顯示、測試檢查清單）
- ✅ 使用者確認設計無誤

---

## Technical Context

**Language/Version**: TypeScript 5.7+
**Primary Framework**: Next.js 15 (App Router) + React 19
**UI Library**: Tailwind CSS v4 + shadcn/ui (無頭組件基礎)
**State Management**: React Context API (Dialog state management)
**Storage**: N/A（對話框為純 UI 元件，無資料持久化需求）
**Testing**: Vitest + React Testing Library + Manual Testing（跨瀏覽器與裝置）
**Target Platform**: Web (Desktop: Chrome/Firefox/Edge, Mobile: iOS Safari 14+, Android Chrome 90+)
**Project Type**: Web Application (Next.js App Router 單一專案)
**Performance Goals**:
- 對話框響應時間 < 200ms（從觸發到顯示）
- 動畫流暢度 60fps
- Toast 通知最多同時顯示 3 個
**Constraints**:
- 必須符合 Neo-Brutalism 設計規範（3px 黑邊框、硬陰影、無圓角）
- 必須支援 ESC 鍵、背景點擊關閉
- 必須包含完整 ARIA 標籤（WCAG 2.1 AA）
- 必須支援鍵盤導航（Tab 循環、Enter 提交）
- 必須鎖定背景滾動
**Scale/Scope**:
- 遷移 18 個檔案、72 個原生對話框
- 新增 3 個對話框元件、1 個 Context Provider、3 個 Hook
- 新增 1 個 ESLint 規則配置
- 預計影響 ~1500 行程式碼變更

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ I. 使用者角色優先 (User Role First)
- **符合性**: 對話框系統為通用 UI 元件，前後台共用但設計保持一致
- **實施方式**:
  - 對話框元件為無狀態元件，不包含角色邏輯
  - 樣本頁面位於後台 `/admin/dialog-samples`，但元件可在前後台使用
  - 遷移時將保留前後台各自的業務邏輯，僅替換對話框 UI
- **合規狀態**: ✅ 通過

### ✅ II. 等級綁定價格 (Tier-Based Pricing)
- **符合性**: N/A（對話框系統不涉及價格邏輯）
- **合規狀態**: ✅ 不適用

### ✅ III. 使用者故事驅動開發 (User Story Driven Development)
- **符合性**: Spec 包含 5 個獨立可測試的使用者故事（P0 樣本確認 + P1 基礎設施 + P1 設計一致性 + P2 批量遷移 + P3 ESLint 規則）
- **實施方式**:
  - Phase 0 (P0): 樣本確認 - 已完成並獲使用者同意
  - Phase 2 (P1): 基礎設施使用與設計一致性驗證 - 遷移 P0 高頻檔案並測試
  - Phase 3 (P2): 批量遷移 - 遷移 P1/P2 檔案
  - Phase 4 (P3): ESLint 規則 - 預防未來引入原生對話框
- **合規狀態**: ✅ 通過

### ✅ IV. API 模組化與職責分離 (API Modularization)
- **符合性**: DialogProvider 使用 React Context，對話框元件為純 UI，無業務邏輯
- **實施方式**:
  - `lib/contexts/dialog-context.tsx` - Context Provider + Hook（狀態管理）
  - `components/ui/dialogs/*.tsx` - 純 UI 元件（接收 props、觸發 callbacks）
  - 業務邏輯由呼叫方（Server Actions、Client Components）負責
- **合規狀態**: ✅ 通過

### ✅ V. 設計系統一致性 (Design System Consistency)
- **符合性**: 100% 符合 Neo-Brutalism 設計規範
- **實施方式**:
  - 3px 黑色邊框（`border-3 border-black`）
  - 硬陰影（`shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`）
  - 按鈕點擊位移效果（`translate-x-[2px] translate-y-[2px] shadow-none`）
  - 無圓角（`rounded-none`）
  - 標題欄顏色依變體（success 綠、error 紅、warning 黃、info 藍）
  - sonner Toast 使用相同 Neo-Brutalism 樣式
- **合規狀態**: ✅ 通過（已在 Phase 0 驗證）

### ✅ VI. 負庫存支援 (Negative Stock Support)
- **符合性**: N/A（對話框系統不涉及庫存邏輯）
- **合規狀態**: ✅ 不適用

### ✅ VII. 使用者體驗優先 (User Experience First)
- **符合性**: 對話框系統大幅提升 UX
- **實施方式**:
  - **視覺引導**: 標題欄顏色依變體區分（success 綠、error 紅等）
  - **操作效率**: ESC 鍵、背景點擊關閉、Enter 鍵提交
  - **即時反饋**: Toast 通知 3 秒自動消失、PromptDialog 即時驗證
  - **無障礙**: 完整 ARIA 標籤、鍵盤導航、螢幕閱讀器支援
  - **行動友善**: 觸控友善、背景滾動鎖定、響應式佈局
- **合規狀態**: ✅ 通過

### ✅ VIII. 資料庫安全至上 (Database Safety First)
- **符合性**: N/A（對話框系統不涉及資料庫操作）
- **合規狀態**: ✅ 不適用

**總結**: ✅ 所有適用原則都已符合，無違反項目，可進入 Phase 1 設計。

---

## Project Structure

### Documentation (this feature)

```text
specs/013-unified-dialog/
├── spec.md              # 功能規格（已完成）
├── checklists/
│   └── requirements.md  # 規格品質檢查清單（已完成）
├── plan.md              # 本檔案（實作計畫）
├── research.md          # Phase 0 研究文件（將產生）
├── data-model.md        # N/A（對話框無資料模型）
├── quickstart.md        # 快速上手指南（將產生）
└── contracts/           # API 合約（將產生）
    ├── useAlert.md
    ├── useConfirm.md
    └── usePrompt.md
```

### Source Code (repository root)

```text
# Next.js 15 App Router 專案結構

app/
├── layout.tsx                              # ✅ 已整合 DialogProvider + Toaster
├── (admin)/
│   └── admin/
│       └── dialog-samples/
│           └── page.tsx                    # ✅ 樣本頁面（Phase 0）
└── ... (其他路由)

components/
└── ui/
    ├── dialogs/                            # ✅ 對話框元件目錄（Phase 0）
    │   ├── alert-dialog.tsx                # ✅ AlertDialog 元件
    │   ├── confirm-dialog.tsx              # ✅ ConfirmDialog 元件
    │   └── prompt-dialog.tsx               # ✅ PromptDialog 元件
    └── ... (其他 UI 元件)

lib/
├── contexts/
│   └── dialog-context.tsx                  # ✅ DialogProvider + Hooks（Phase 0）
└── ... (其他 lib)

types/
├── dialog.ts                               # ✅ 對話框型別定義（Phase 0）
└── ... (其他型別)

# 待遷移的 18 個檔案（Phase 2-4）
components/
├── admin/
│   ├── tier-table.tsx                      # P0 - 1 confirm
│   ├── coupons/
│   │   └── CouponList.tsx                  # P0 - 1 confirm
│   ├── order-actions.tsx                   # P0 - 1 confirm
│   ├── product-table.tsx                   # P0 - 3 confirm + 3 alert
│   ├── category-table.tsx                  # P0 - 1 confirm
│   ├── announcements/
│   │   ├── AnnouncementForm.tsx            # P1 - 5 alert
│   │   └── AnnouncementListClient.tsx      # P1 - 3 alert + 1 confirm
│   ├── LogoUploader.tsx                    # P1 - 2 alert + 1 confirm
│   ├── series-delete-button.tsx            # P1 - 2 alert + 1 confirm
│   ├── product-table-with-tags.tsx         # P1 - 3 confirm + 3 alert
│   ├── MemberListClient.tsx                # P1 - 2 alert + 1 confirm + 1 prompt
│   ├── client-table.tsx                    # P1 - 3 alert
│   ├── tier-form.tsx                       # P1 - 1 alert
│   ├── update-password-form.tsx            # P1 - 1 alert
│   ├── pricing/
│   │   └── ProductPricingForm.tsx          # P1 - 2 alert
│   ├── orders/
│   │   ├── order-editor.tsx                # P2 - 3 alert + 2 confirm + 2 prompt
│   │   └── order-detail-content.tsx        # P2 - 1 confirm
│   ├── client-form.tsx                     # P2 - 1 alert
│   ├── client-form-v2.tsx                  # P2 - 1 alert
│   └── category-form.tsx                   # P2 - 1 alert
├── shop/
│   ├── product-with-price-card.tsx         # P2 - 1 alert
│   └── navbar.tsx                          # P2 - 1 confirm + 1 alert
└── ui/
    └── image-upload.tsx                    # P2 - 1 confirm

# ESLint 配置（Phase 5）
.eslintrc.json                              # 將新增 no-restricted-globals 規則
```

**Structure Decision**: 採用 Next.js 15 App Router 標準結構，對話框元件集中在 `components/ui/dialogs/`，Context Provider 位於 `lib/contexts/`。遷移將逐步修改 18 個現有檔案，不改變專案整體架構。

---

## Complexity Tracking

**無違反項目**: 本實作完全符合專案憲章所有適用原則，無需額外複雜度說明。

---

## Phase 0: Outline & Research ✅ 已完成

### 研究任務清單

Phase 0 已在建立樣本元件時完成，研究結果如下：

#### R1: Neo-Brutalism 設計規範研究
- **決策**: 使用 3px 黑邊框、硬陰影、無圓角、點擊位移效果
- **理由**: 符合專案既有設計風格，已有成功案例（現有 ConfirmDialog）
- **替代方案**: Material Design、Fluent Design - 被拒絕（不符合品牌識別）

#### R2: React Context vs Zustand 狀態管理
- **決策**: 使用 React Context API
- **理由**: 對話框為短期狀態（開啟-關閉），無需持久化或複雜狀態管理，Context API 足夠且更輕量
- **替代方案**: Zustand、Redux - 過度工程化（對話框狀態簡單）

#### R3: Toast 通知函式庫選擇
- **決策**: sonner v1.x
- **理由**: 輕量（~5KB gzipped）、效能佳、支援自訂樣式、與 React 19 相容
- **替代方案**: react-hot-toast、react-toastify - 功能過多或樣式客製化較困難

#### R4: 無障礙（ARIA）最佳實踐
- **決策**: 使用 `role="dialog"`、`aria-modal="true"`、`aria-labelledby`、`aria-describedby`、Focus Trap
- **理由**: WCAG 2.1 AA 標準要求，確保螢幕閱讀器支援
- **參考**: W3C ARIA Authoring Practices Guide - Dialog Pattern

#### R5: 遷移策略（大爆炸 vs 增量）
- **決策**: 增量遷移（P0 → P1 → P2，每個檔案單獨測試）
- **理由**: 降低風險、易於回滾、每個檔案遷移後立即驗證功能正常
- **替代方案**: 大爆炸遷移（一次替換所有 72 個對話框）- 風險過高

### 研究結論

✅ 所有技術決策已在 Phase 0 樣本元件建立時驗證可行性，使用者已確認設計無誤。

---

## Phase 1: Design & Contracts

### A. Data Model

**結論**: 對話框系統為純 UI 元件，無需資料模型。狀態僅存在於 React Context 中，為短期記憶體狀態（對話框開啟/關閉、當前選項）。

**狀態定義**（位於 `lib/contexts/dialog-context.tsx`）:

```typescript
interface DialogState {
  type: 'alert' | 'confirm' | 'prompt' | null
  options: AlertDialogOptions | ConfirmDialogOptions | PromptDialogOptions | null
  resolve: ((value: any) => void) | null
}
```

**說明**:
- `type`: 當前對話框類型（null 表示無對話框開啟）
- `options`: 對話框選項（標題、內容、變體等）
- `resolve`: Promise resolve 函式（用於回傳使用者選擇結果）

此狀態為 React 元件狀態，無需資料庫儲存或持久化。

### B. API Contracts

對話框系統提供三個 Hook API，合約文件將位於 `specs/013-unified-dialog/contracts/`：

#### Contract 1: useAlert Hook

**檔案**: `contracts/useAlert.md`

**簽名**:
```typescript
function useAlert(): (options: AlertDialogOptions) => Promise<void>
```

**輸入**:
```typescript
interface AlertDialogOptions {
  title: string                // 必填: 對話框標題
  message: string              // 必填: 對話框內容
  variant?: 'success' | 'error' | 'warning' | 'info'  // 選填: 變體（預設 info）
  confirmText?: string         // 選填: 確認按鈕文字（預設「確定」）
  closable?: boolean           // 選填: 是否允許 ESC/背景關閉（預設 true）
}
```

**輸出**: `Promise<void>` - 使用者點擊確認後 resolve

**使用範例**:
```typescript
const alert = useAlert()

// 成功提示
await alert({
  title: '儲存成功',
  message: '您的資料已成功儲存',
  variant: 'success',
})

// 錯誤提示
await alert({
  title: '發生錯誤',
  message: '無法連接到伺服器，請稍後再試',
  variant: 'error',
  confirmText: '知道了',
})
```

**行為規範**:
- 對話框開啟時，背景滾動鎖定（`body { overflow: hidden }`）
- ESC 鍵或點擊背景關閉對話框（若 `closable: true`）
- 關閉後 Promise resolve，繼續執行後續程式碼
- 同時只能開啟一個對話框（若連續呼叫，第二個會在第一個關閉後才顯示）

#### Contract 2: useConfirm Hook

**檔案**: `contracts/useConfirm.md`

**簽名**:
```typescript
function useConfirm(): (options: ConfirmDialogOptions) => Promise<boolean>
```

**輸入**:
```typescript
interface ConfirmDialogOptions {
  title: string                // 必填: 對話框標題
  description: string          // 必填: 對話框描述
  variant?: 'success' | 'error' | 'warning' | 'info' | 'danger' | 'default'  // 選填: 變體（預設 default）
  confirmText?: string         // 選填: 確認按鈕文字（預設「確定」）
  cancelText?: string          // 選填: 取消按鈕文字（預設「取消」）
  isAsync?: boolean            // 選填: 是否顯示載入狀態（預設 false）
  closable?: boolean           // 選填: 是否允許 ESC/背景關閉（預設 true）
}
```

**輸出**: `Promise<boolean>` - 使用者選擇確認回傳 `true`，取消回傳 `false`

**使用範例**:
```typescript
const confirm = useConfirm()

// 刪除確認
const confirmed = await confirm({
  title: '確認刪除',
  description: '您確定要刪除「高級會員」等級嗎？此操作無法復原。',
  variant: 'danger',
  confirmText: '刪除',
  cancelText: '取消',
})

if (confirmed) {
  // 執行刪除操作
  await deleteTier(id)
}
```

**行為規範**:
- 對話框包含雙按鈕佈局（取消 + 確認）
- 點擊確認按鈕回傳 `true`，點擊取消或 ESC/背景關閉回傳 `false`
- 若 `isAsync: true`，點擊確認後按鈕顯示載入動畫並禁用，避免重複提交
- 預設焦點在確認按鈕（`autoFocus`）

#### Contract 3: usePrompt Hook

**檔案**: `contracts/usePrompt.md`

**簽名**:
```typescript
function usePrompt(): (options: PromptDialogOptions) => Promise<Record<string, string> | null>
```

**輸入**:
```typescript
interface PromptDialogOptions {
  title: string                // 必填: 對話框標題
  message?: string             // 選填: 對話框描述
  fields: PromptDialogField[]  // 必填: 輸入欄位陣列
  confirmText?: string         // 選填: 確認按鈕文字（預設「確定」）
  cancelText?: string          // 選填: 取消按鈕文字（預設「取消」）
}

interface PromptDialogField {
  name: string                 // 必填: 欄位名稱（回傳資料的 key）
  label: string                // 必填: 欄位標籤
  type?: 'text' | 'number' | 'textarea'  // 選填: 欄位類型（預設 text）
  placeholder?: string         // 選填: 提示文字
  defaultValue?: string        // 選填: 預設值
  required?: boolean           // 選填: 是否必填（預設 false）
  maxLength?: number           // 選填: 最大長度限制
  validation?: (value: string) => string | null  // 選填: 自訂驗證函式
}
```

**輸出**: `Promise<Record<string, string> | null>` - 使用者提交回傳表單資料物件，取消回傳 `null`

**使用範例**:
```typescript
const prompt = usePrompt()

// 單欄位輸入
const result = await prompt({
  title: '重設密碼',
  message: '請輸入新密碼（至少 6 個字元）',
  fields: [
    {
      name: 'password',
      label: '新密碼',
      type: 'text',
      placeholder: '請輸入密碼',
      required: true,
      maxLength: 20,
      validation: (value) => {
        if (value.length < 6) return '密碼至少需要 6 個字元'
        return null
      },
    },
  ],
})

if (result) {
  console.log(result.password) // 使用者輸入的密碼
  await resetPassword(userId, result.password)
}

// 多欄位輸入
const customerData = await prompt({
  title: '新增客戶',
  fields: [
    { name: 'name', label: '客戶名稱', required: true, maxLength: 50 },
    { name: 'phone', label: '聯絡電話', required: true },
    { name: 'notes', label: '備註', type: 'textarea', maxLength: 200 },
  ],
})

if (customerData) {
  await createCustomer(customerData)
}
```

**行為規範**:
- 支援多個輸入欄位（text、number、textarea）
- 即時驗證：輸入時執行 `validation` 函式，顯示錯誤訊息（紅色文字）
- 提交前驗證：所有必填欄位都已填寫且無錯誤才啟用確認按鈕
- Enter 鍵提交：僅限單行輸入（text、number），textarea 不觸發
- 字數提示：若設定 `maxLength`，顯示當前字數 / 最大字數

### C. Quickstart Guide

將建立 `quickstart.md` 文件，包含以下內容：

**章節**:
1. **快速開始**: 如何在元件中使用三個 Hook
2. **遷移指南**: 從原生對話框遷移到自訂對話框的步驟
3. **常見使用情境**: 刪除確認、表單驗證、輸入對話框範例
4. **設計規範**: Neo-Brutalism 樣式、顏色變體、動畫規範
5. **無障礙指南**: ARIA 標籤、鍵盤導航、螢幕閱讀器支援
6. **疑難排解**: 常見問題與解決方案

---

## Phase 2: Migration Planning

### Migration Strategy

**原則**: 增量遷移 + 每檔案測試 + Git 單一檔案 Commit

**流程**:
1. **選擇待遷移檔案**（依優先級 P0 → P1 → P2）
2. **讀取檔案內容**，識別所有原生對話框呼叫
3. **匯入 Hook**（`useAlert`、`useConfirm`、`usePrompt`）
4. **逐一替換**原生對話框為 Hook 呼叫
5. **選擇適當變體**（success/error/warning/info/danger）
6. **測試功能**，確認對話框顯示正確且功能無異常
7. **Git Commit**（單一檔案變更）
8. **進行下一個檔案**

### Migration Priority

#### P0: 高頻核心功能（5 個檔案，7 個對話框）- 預計 1-2 天

| 檔案 | 對話框數量 | 類型 | 遷移重點 |
|------|----------|------|---------|
| `components/admin/tier-table.tsx:141` | 1 confirm | 刪除確認 | `useConfirm()` + variant: 'danger' |
| `components/admin/coupons/CouponList.tsx` | 1 confirm | 刪除確認 | 同上 |
| `components/admin/order-actions.tsx` | 1 confirm | 取消訂單 | 同上 |
| `components/admin/product-table.tsx` | 3 confirm + 3 alert | 刪除、錯誤 | `useConfirm()` + `useAlert()` |
| `components/admin/category-table.tsx` | 1 confirm | 刪除確認 | `useConfirm()` + variant: 'danger' |

**驗收標準**:
- ✅ 所有刪除確認對話框顯示紅色標題欄（variant: 'danger'）
- ✅ ESC 鍵和背景點擊可關閉對話框
- ✅ 按鈕點擊位移效果正確
- ✅ 功能測試通過（刪除操作正常執行）

#### P1: 中頻功能（10 個檔案，40 個對話框）- 預計 3-4 天

| 檔案 | 對話框數量 | 類型 | 遷移重點 |
|------|----------|------|---------|
| `components/admin/announcements/AnnouncementForm.tsx` | 5 alert | 表單驗證 | 考慮改用 Toast（即時回饋）|
| `components/admin/announcements/AnnouncementListClient.tsx` | 3 alert + 1 confirm | 通知、刪除 | `useAlert()` + `useConfirm()` |
| `components/admin/LogoUploader.tsx` | 2 alert + 1 confirm | 檔案驗證 | `useAlert()` variant: 'error' |
| `components/admin/series-delete-button.tsx` | 2 alert + 1 confirm | 錯誤、刪除 | 同上 |
| `components/admin/product-table-with-tags.tsx` | 3 confirm + 3 alert | 刪除、錯誤 | `useConfirm()` + `useAlert()` |
| `components/admin/MemberListClient.tsx` | 2 alert + 1 confirm + 1 prompt | 錯誤、刪除、重設密碼 | 完整三種 Hook |
| `components/admin/client-table.tsx` | 3 alert | 錯誤提示 | 已有 ConfirmDialog，僅需遷移 alert |
| `components/admin/tier-form.tsx` | 1 alert | 表單驗證 | 考慮改用 Toast |
| `components/admin/update-password-form.tsx` | 1 alert | 成功提示 | 改用 Toast |
| `components/admin/pricing/ProductPricingForm.tsx` | 2 alert | 成功/錯誤 | 改用 Toast |

**驗收標準**:
- ✅ 表單驗證錯誤使用 Toast 或 Alert（依情境選擇）
- ✅ 檔案驗證錯誤顯示 error variant
- ✅ 重設密碼使用 PromptDialog（即時驗證、字數限制）
- ✅ 功能測試通過

#### P2: 低頻功能（9 個檔案，25 個對話框）- 預計 2-3 天

| 檔案 | 對話框數量 | 類型 | 遷移重點 |
|------|----------|------|---------|
| `components/admin/orders/order-editor.tsx` | 3 alert + 2 confirm + 2 prompt | 訂單修改 | 完整三種 Hook，prompt 用於輸入費用 |
| `components/admin/orders/order-detail-content.tsx` | 1 confirm | 狀態更新 | `useConfirm()` |
| `components/shop/product-with-price-card.tsx` | 1 alert | 加入購物車 | 改用 Toast |
| `components/shop/navbar.tsx` | 1 confirm + 1 alert | 登出確認 | `useConfirm()` + Toast |
| `components/ui/image-upload.tsx` | 1 confirm | 刪除圖片 | `useConfirm()` |
| `components/admin/client-form.tsx` | 1 alert | 表單錯誤 | 改用 Toast |
| `components/admin/client-form-v2.tsx` | 1 alert | 表單錯誤 | 改用 Toast |
| `components/admin/category-form.tsx` | 1 alert | 表單錯誤 | 改用 Toast |

**驗收標準**:
- ✅ 訂單修改使用 PromptDialog（輸入自訂費用、運費調整）
- ✅ 前台加入購物車使用 Toast（簡潔、不中斷操作）
- ✅ 登出確認使用 ConfirmDialog（variant: 'warning'）
- ✅ 功能測試通過

### Migration Checklist (每個檔案)

```markdown
- [ ] 1. 在元件頂部匯入 Hook（`useAlert` / `useConfirm` / `usePrompt`）
- [ ] 2. 在元件內呼叫 Hook 取得函式
- [ ] 3. 替換 `alert()` 為 `await alert({ ... })`
- [ ] 4. 替換 `confirm()` 為 `const confirmed = await confirm({ ... })`
- [ ] 5. 替換 `prompt()` 為 `const result = await prompt({ ... })`
- [ ] 6. 選擇適當的 variant（success / error / warning / info / danger）
- [ ] 7. 測試對話框功能正常（ESC 鍵、背景點擊、按鈕位移效果）
- [ ] 8. 測試業務邏輯正常（刪除、表單提交等）
- [ ] 9. TypeScript 型別檢查通過（`pnpm type-check`）
- [ ] 10. Git commit 紀錄變更（單一檔案 commit）
```

---

## Phase 3: ESLint Configuration

### ESLint Rule: no-restricted-globals

**檔案**: `.eslintrc.json`（或 `.eslintrc.js`）

**新增規則**:
```json
{
  "rules": {
    "no-restricted-globals": [
      "error",
      {
        "name": "alert",
        "message": "請使用 useAlert() Hook 替代原生 alert()。範例：const alert = useAlert(); await alert({ title: '提示', message: '內容', variant: 'info' });"
      },
      {
        "name": "confirm",
        "message": "請使用 useConfirm() Hook 替代原生 confirm()。範例：const confirm = useConfirm(); const result = await confirm({ title: '確認', description: '描述', variant: 'danger' });"
      },
      {
        "name": "prompt",
        "message": "請使用 usePrompt() Hook 替代原生 prompt()。範例：const prompt = usePrompt(); const result = await prompt({ title: '輸入', fields: [{ name: 'value', label: '標籤', required: true }] });"
      }
    ]
  }
}
```

**驗證方式**:
```bash
# 測試 ESLint 規則生效
pnpm lint

# 預期結果：若程式碼包含 alert()、confirm()、prompt()，顯示錯誤訊息
```

**排除清單**:
- `**/*.test.ts`、`**/*.test.tsx` - 測試檔案可使用原生對話框
- `node_modules/**` - 第三方套件

---

## Phase 4: Testing Strategy

### A. Unit Testing

**測試框架**: Vitest + React Testing Library

**測試檔案**:
```text
tests/
├── dialogs/
│   ├── alert-dialog.test.tsx
│   ├── confirm-dialog.test.tsx
│   ├── prompt-dialog.test.tsx
│   └── dialog-context.test.tsx
```

**測試範圍**:
1. **AlertDialog 元件測試**:
   - ✅ 四種變體顯示正確顏色
   - ✅ ESC 鍵關閉對話框
   - ✅ 背景點擊關閉對話框
   - ✅ 確認按鈕點擊觸發 onClose
   - ✅ ARIA 標籤正確

2. **ConfirmDialog 元件測試**:
   - ✅ 六種變體顯示正確顏色
   - ✅ 確認按鈕點擊回傳 true
   - ✅ 取消按鈕點擊回傳 false
   - ✅ isAsync 模式顯示載入動畫
   - ✅ ARIA 標籤正確

3. **PromptDialog 元件測試**:
   - ✅ 多欄位輸入正確顯示
   - ✅ 即時驗證顯示錯誤訊息
   - ✅ 必填欄位驗證
   - ✅ Enter 鍵提交（單行輸入）
   - ✅ 提交回傳正確資料
   - ✅ 取消回傳 null

4. **DialogContext 測試**:
   - ✅ useAlert Hook 正常運作
   - ✅ useConfirm Hook 正常運作
   - ✅ usePrompt Hook 正常運作
   - ✅ 佇列機制正確（連續呼叫）
   - ✅ 背景滾動鎖定生效

### B. Integration Testing

**測試範圍**:
- ✅ 遷移後的 18 個檔案功能測試（手動測試）
- ✅ 跨瀏覽器測試（Chrome、Firefox、Edge）
- ✅ 行動裝置測試（iOS Safari、Android Chrome）

**測試清單**:
```markdown
**桌面環境測試**（Chrome、Firefox、Edge）:
- [ ] 對話框正常顯示
- [ ] ESC 鍵關閉
- [ ] 外部點擊關閉
- [ ] 按鈕點擊位移效果正確

**行動裝置測試**（iOS Safari、Android Chrome）:
- [ ] 對話框居中顯示
- [ ] 觸控操作流暢
- [ ] 背景滾動鎖定（body overflow: hidden）
- [ ] Toast 不遮擋重要內容

**鍵盤導航測試**:
- [ ] Tab 鍵循環焦點
- [ ] Enter 鍵確認（PromptDialog 單行輸入）
- [ ] ESC 鍵取消
- [ ] Focus Trap 正常運作

**無障礙測試**:
- [ ] ARIA 標籤正確（role、aria-modal、aria-labelledby、aria-describedby）
- [ ] 螢幕閱讀器正確朗讀標題和內容
- [ ] 顏色對比度符合 WCAG AA（至少 4.5:1）
```

### C. Performance Testing

**效能監控**:
- **對話框響應時間**: 使用 Chrome DevTools Performance 面板監控從觸發到顯示的時間（目標 < 200ms）
- **動畫流暢度**: 錄製動畫過程，驗證 60fps（無掉幀）
- **記憶體使用**: 監控對話框開啟/關閉是否有記憶體洩漏

**測試工具**:
- Chrome DevTools Performance
- Lighthouse（無障礙評分）
- axe DevTools（自動化無障礙測試）

---

## Phase 5: Documentation

### A. User Documentation

**檔案**: `specs/013-unified-dialog/quickstart.md`

**內容**:
1. 快速開始
2. API 參考（三個 Hook 完整說明）
3. 範例程式碼（常見使用情境）
4. 設計規範（Neo-Brutalism 樣式）
5. 無障礙指南
6. 疑難排解

### B. Developer Documentation

**更新 `CLAUDE.md`**:

新增「對話框使用規範」章節：

```markdown
### 對話框使用規範

- ❌ 禁止使用原生對話框（alert、confirm、prompt）
- ✅ 使用 useAlert()、useConfirm()、usePrompt() Hook
- ✅ 簡單的成功/失敗提示優先使用 Toast（sonner）
- ✅ 所有對話框必須符合 Neo-Brutalism 設計風格
- ✅ 選擇適當的 variant（success / error / warning / info / danger）

**範例**:
\`\`\`typescript
// ❌ 錯誤：使用原生對話框
if (confirm('確定刪除?')) {
  await deleteTier(id)
}

// ✅ 正確：使用 Hook
const confirm = useConfirm()
const confirmed = await confirm({
  title: '確認刪除',
  description: '此操作無法復原',
  variant: 'danger',
})
if (confirmed) {
  await deleteTier(id)
}
\`\`\`
```

### C. API Contracts

**檔案**:
- `contracts/useAlert.md` - AlertDialog Hook 完整 API 文件
- `contracts/useConfirm.md` - ConfirmDialog Hook 完整 API 文件
- `contracts/usePrompt.md` - PromptDialog Hook 完整 API 文件

---

## Timeline Estimation

| Phase | 任務內容 | 預計時間 | 累計時間 |
|-------|---------|---------|---------|
| **Phase 0** | 基礎建設（已完成）| 1 天 | 1 天 |
| **Phase 1** | 研究與設計（本階段）| 0.5 天 | 1.5 天 |
| **Phase 2** | 遷移 P0（5 個檔案，7 個對話框）| 1-2 天 | 3-3.5 天 |
| **Phase 3** | 遷移 P1（10 個檔案，40 個對話框）| 3-4 天 | 6-7.5 天 |
| **Phase 4** | 遷移 P2（9 個檔案，25 個對話框）| 2-3 天 | 8-10.5 天 |
| **Phase 5** | ESLint、測試、文件 | 1-2 天 | 9-12.5 天 |
| **Total** | | **9-12.5 天** | |

**風險緩衝**: 預留 2-3 天處理意外問題（測試失敗、設計調整等）

**最終預估**: **10-15 天**（符合規格文件時程限制）

---

## Risk Mitigation

### 高風險項目

1. **破壞性變更**: 修改 18 個檔案可能引入 bug
   - **緩解**: 逐步遷移、每檔案測試、Git 單一 commit、立即回滾失敗變更

2. **使用者習慣**: 使用者可能習慣原生對話框
   - **緩解**: Phase 0 樣本確認已完成、保持相似文案和按鈕配置

3. **無障礙問題**: 自訂對話框可能不如原生無障礙
   - **緩解**: 完整 ARIA 標籤、axe DevTools 自動化測試、螢幕閱讀器測試

### 中風險項目

4. **效能影響**: 自訂對話框可能較慢
   - **緩解**: React.memo()、CSS transition（GPU 加速）、效能監控

5. **行動裝置體驗**: 樣式或互動問題
   - **緩解**: 實體裝置測試、觸控目標 >= 44px、背景滾動鎖定

6. **佇列機制複雜度**: 連續觸發可能混亂
   - **緩解**: 簡單陣列佇列（FIFO）、Edge Case 測試

### 低風險項目

7. **ESLint 規則衝突**: 可能與現有規則衝突
   - **緩解**: 測試分支先驗證、排除測試檔案

8. **sonner 套件相容性**: 可能與 React 19 不相容
   - **緩解**: 已在 Phase 0 驗證相容性，功能正常

---

## Success Criteria

### 量化指標
- ✅ 0 個原生對話框呼叫（從 72 個減少到 0）
- ✅ 18 個檔案完成遷移
- ✅ 100% 對話框符合 Neo-Brutalism 設計規範
- ✅ TypeScript 型別檢查 0 errors
- ✅ ESLint 檢查 0 errors
- ✅ 對話框響應時間 < 200ms
- ✅ 動畫流暢度 60fps

### 質化指標
- ✅ 支援鍵盤導航和螢幕閱讀器
- ✅ 跨瀏覽器與裝置相容性
- ✅ 使用者反饋：設計一致性和品牌識別度提升
- ✅ 開發者反饋：Hook API 易用性和可維護性提升

---

## Next Steps

1. **產生 research.md**: 整合 Phase 0 研究結果（已在建立樣本元件時完成）
2. **產生 contracts/**: 建立三個 Hook 的 API 合約文件
3. **產生 quickstart.md**: 建立快速上手指南
4. **更新 agent context**: 執行 `.specify/scripts/powershell/update-agent-context.ps1`
5. **重新評估 Constitution Check**: 確認設計符合憲章（已通過）

**Planning Command Complete** - 準備進入 Phase 2 實作（遷移 P0 檔案）
