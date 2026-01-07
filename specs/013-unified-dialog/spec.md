# Feature Specification: 統一對話框系統

**Feature Branch**: `013-unified-dialog`
**Created**: 2026-01-08
**Status**: Draft
**Input**: 將專案中所有原生瀏覽器對話框（alert、confirm、prompt）替換為符合 Neo-Brutalism 設計風格的自訂對話框元件，並在實作前先建立樣本元件讓使用者確認設計樣式

## 專案概述

將 Vsale-lite 專案中所有 72 個原生瀏覽器對話框（分散在 18 個檔案中）替換為符合 Neo-Brutalism 設計風格的統一自訂對話框元件庫。此專案旨在解決設計不一致、使用者體驗差異、以及行動裝置體驗不佳的問題。

### 現狀分析

**當前問題**:
- **72 個原生對話框分散在 18 個檔案中**（50 個 alert、20 個 confirm、2 個 prompt）
- **設計不一致**: 原生對話框無法控制樣式，與 Neo-Brutalism 品牌風格不符
- **使用者體驗問題**: 行動裝置上原生對話框體驗較差，無法統一管理行為（動畫、快捷鍵）
- **維護困難**: 無法集中管理對話框邏輯，未來修改需要逐一更新 18 個檔案

**現有資源**:
- ✅ `components/ui/confirm-dialog.tsx` - 已符合 Neo-Brutalism 風格（僅 2 個地方使用）
- ✅ Neo-Brutalism 設計規範（3px 黑邊框、硬陰影、點擊位移效果）
- ✅ 設計 Token 系統（`lib/design-tokens.ts`）

---

## User Scenarios & Testing

### **Phase 0: 設計樣本確認（優先於所有實作）** *(Priority: P0)*

在進行任何大規模實作前，先建立一個獨立的樣本頁面讓使用者確認設計樣式。

**Why this priority**: 避免錯誤的設計導致後續大量返工，確保設計符合使用者期望後再進行全專案遷移。

**Independent Test**: 可透過訪問 `/admin/dialog-samples` 頁面查看所有對話框變體，確認設計風格無誤。

**Acceptance Scenarios**:

1. **Given** 使用者訪問樣本頁面，**When** 點擊「顯示 Success Alert」按鈕，**Then** 顯示綠色標題欄的 Alert 對話框，包含 CheckCircle 圖示、3px 黑邊框、硬陰影效果
2. **Given** 使用者訪問樣本頁面，**When** 點擊「顯示 Danger Confirm」按鈕，**Then** 顯示紅色標題欄的 Confirm 對話框，包含雙按鈕佈局、正確的 Neo-Brutalism 風格
3. **Given** 使用者訪問樣本頁面，**When** 點擊「顯示 Prompt」按鈕，**Then** 顯示包含輸入欄位的對話框，欄位具備 3px 黑邊框、即時驗證功能
4. **Given** 使用者在樣本頁面測試任一對話框，**When** 按下 ESC 鍵或點擊外部背景，**Then** 對話框正確關閉
5. **Given** 使用者在樣本頁面測試按鈕點擊，**When** 點擊確認/取消按鈕，**Then** 按鈕顯示 translate-x-[2px] translate-y-[2px] 位移效果，陰影消失
6. **Given** 使用者在行動裝置上訪問樣本頁面，**When** 打開任一對話框，**Then** 對話框居中顯示、背景滾動鎖定、觸控操作流暢
7. **Given** 使用者確認設計樣式無誤，**When** 審核樣本頁面，**Then** 明確同意進入後續實作階段

**樣本頁面包含內容**:
- AlertDialog 四種變體（success、error、warning、info）
- ConfirmDialog 六種變體（success、error、warning、info、danger、default）
- PromptDialog 單欄位與多欄位輸入範例
- Toast 通知四種類型（sonner 整合）
- 鍵盤導航測試說明（Tab、ESC、Enter）
- 行動裝置體驗測試說明

**交付成果**:
- `/app/(admin)/admin/dialog-samples/page.tsx` - 樣本頁面
- 三個基礎對話框元件（AlertDialog、ConfirmDialog、PromptDialog）
- DialogProvider 與三個 Hook（useAlert、useConfirm、usePrompt）
- sonner Toast 整合
- 使用者書面確認繼續實作

---

### User Story 1 - 開發者使用統一 Hook 替代原生對話框 *(Priority: P1)*

開發者在元件中使用 `useAlert()`、`useConfirm()`、`usePrompt()` Hook 替代原生的 `alert()`、`confirm()`、`prompt()` 函式，享受一致的 API 和設計風格。

**Why this priority**: 核心基礎設施，所有後續遷移工作的前提條件。

**Independent Test**: 可在任一元件中匯入 Hook 並呼叫，驗證對話框正常顯示且符合設計規範。

**Acceptance Scenarios**:

1. **Given** 開發者在元件頂部匯入 `useAlert`，**When** 呼叫 `await alert({ title: '成功', message: '儲存完成', variant: 'success' })`，**Then** 顯示綠色標題欄的 Alert 對話框，使用者點擊確認後 Promise resolve
2. **Given** 開發者在元件中使用 `useConfirm`，**When** 呼叫 `const confirmed = await confirm({ title: '確認刪除', description: '此操作無法復原', variant: 'danger' })`，**Then** 顯示紅色標題欄的 Confirm 對話框，使用者選擇後回傳 boolean
3. **Given** 開發者在元件中使用 `usePrompt`，**When** 呼叫 `const result = await prompt({ title: '輸入名稱', fields: [{ name: 'name', label: '姓名', required: true }] })`，**Then** 顯示包含單一輸入欄位的 Prompt 對話框，使用者提交後回傳表單資料
4. **Given** 開發者呼叫任一 Hook，**When** 使用者按下 ESC 或點擊背景，**Then** 對話框關閉，Promise resolve 為 null 或 false
5. **Given** 開發者在同一個 async 函式中連續呼叫兩個 Hook，**When** 第一個對話框關閉，**Then** 第二個對話框正確顯示（佇列機制）

---

### User Story 2 - 使用者在所有頁面看到一致的對話框設計 *(Priority: P1)*

使用者在操作任何功能時，所有對話框（通知、確認、輸入）都呈現一致的 Neo-Brutalism 設計風格，提升品牌識別度和視覺一致性。

**Why this priority**: 直接影響使用者體驗和品牌形象，與 P1 技術基礎設施同等重要。

**Independent Test**: 瀏覽專案中任一功能（商品管理、訂單管理、客戶管理），觸發對話框時驗證設計一致性。

**Acceptance Scenarios**:

1. **Given** 使用者在後台刪除會員等級，**When** 觸發刪除確認對話框，**Then** 對話框顯示紅色標題欄、3px 黑邊框、硬陰影，符合 Neo-Brutalism 風格
2. **Given** 使用者在前台加入購物車，**When** 觸發成功通知，**Then** Toast 通知顯示綠色背景、3px 黑邊框、硬陰影，位於右上角
3. **Given** 使用者在行動裝置上操作，**When** 打開任一對話框，**Then** 對話框居中顯示、觸控友善、背景滾動鎖定
4. **Given** 使用者在後台重設客戶密碼，**When** 觸發輸入對話框，**Then** 輸入欄位顯示 3px 黑邊框、即時驗證錯誤訊息（紅色文字）
5. **Given** 使用者完成任一操作，**When** 對話框顯示動畫，**Then** 使用淡入+縮放效果（200ms duration），流暢且不過度華麗

---

### User Story 3 - 系統管理員批量遷移現有對話框 *(Priority: P2)*

系統管理員按照優先級（P0 → P1 → P2）逐步遷移 18 個檔案中的 72 個原生對話框，確保每個檔案遷移後功能正常且符合設計規範。

**Why this priority**: 實際遷移工作，依賴於 P0（樣本確認）和 P1（基礎設施）完成。

**Independent Test**: 每個檔案遷移後執行功能測試，驗證對話框替換正確且功能無異常。

**Acceptance Scenarios**:

1. **Given** P0 高頻核心功能檔案（5 個檔案，7 個對話框），**When** 完成遷移，**Then** 商品管理、訂單管理、會員等級刪除確認功能正常運作
2. **Given** P1 中頻功能檔案（10 個檔案，40 個對話框），**When** 完成遷移，**Then** 表單驗證、檔案上傳、通知管理功能正常運作
3. **Given** P2 低頻功能檔案（9 個檔案，25 個對話框），**When** 完成遷移，**Then** 訂單修改、前台購物車、客戶端功能正常運作
4. **Given** 所有 18 個檔案完成遷移，**When** 執行全專案搜尋 `alert(`、`confirm(`、`prompt(`，**Then** 僅找到型別定義和測試檔案中的引用，無業務邏輯中的原生呼叫
5. **Given** 遷移完成後，**When** 執行 TypeScript 型別檢查和 ESLint 檢查，**Then** 0 errors，所有檔案符合程式碼規範

**遷移優先級**:

| 優先級 | 檔案數 | 對話框數 | 包含檔案 | 預計時間 |
|--------|-------|---------|---------|---------|
| **P0** | 5 | 7 | tier-table, coupon-list, order-actions, product-table, category-table | 1-2 天 |
| **P1** | 10 | 40 | announcements, logo-uploader, series-delete, product-table-with-tags, member-list, client-table, tier-form 等 | 3-4 天 |
| **P2** | 9 | 25 | order-editor, order-detail-content, product-with-price-card, navbar, image-upload, client-form 等 | 2-3 天 |

---

### User Story 4 - 開發者被 ESLint 阻止使用原生對話框 *(Priority: P3)*

開發者在撰寫新程式碼時，若嘗試使用原生的 `alert()`、`confirm()`、`prompt()`，ESLint 會顯示錯誤提示，強制使用統一的 Hook 介面。

**Why this priority**: 預防性措施，確保未來不會引入新的原生對話框，依賴於 P2 完成後才有意義。

**Independent Test**: 在任一元件中撰寫 `alert('test')`，執行 ESLint 檢查應顯示錯誤訊息。

**Acceptance Scenarios**:

1. **Given** 開發者在元件中撰寫 `alert('測試')`，**When** 執行 `pnpm lint`，**Then** ESLint 顯示錯誤：「請使用 useAlert() Hook 替代原生 alert()」
2. **Given** 開發者在元件中撰寫 `if (confirm('確定?'))`，**When** 執行 ESLint 檢查，**Then** 顯示錯誤：「請使用 useConfirm() Hook 替代原生 confirm()」
3. **Given** 開發者在元件中撰寫 `const name = prompt('姓名')`，**When** 執行 ESLint 檢查，**Then** 顯示錯誤：「請使用 usePrompt() Hook 替代原生 prompt()」
4. **Given** ESLint 規則已配置，**When** 執行 Git pre-commit hook，**Then** 包含原生對話框的 commit 被阻止，必須修正後才能提交

---

### Edge Cases

- **佇列機制**: 當使用者在對話框開啟時又觸發另一個對話框，系統應該佇列處理（第一個關閉後才顯示第二個），避免對話框重疊
- **異步操作載入狀態**: ConfirmDialog 在執行異步操作時（例如刪除 API 呼叫），確認按鈕應顯示載入動畫並禁用，避免重複提交
- **長文字處理**: 當對話框標題或內容過長時，應該使用滾動而非破版，確保在小螢幕上可用
- **鍵盤導航**: 使用 Tab 鍵在對話框內循環焦點時，不應跳出對話框（Focus Trap）
- **背景滾動鎖定**: 對話框開啟時，背景頁面應禁止滾動（body overflow: hidden），避免使用者誤操作
- **多欄位驗證**: PromptDialog 有多個欄位時，僅在所有必填欄位都有效時才啟用提交按鈕
- **快速連續點擊**: 使用者快速點擊按鈕多次時，應該防抖處理，避免重複觸發對話框
- **螢幕閱讀器支援**: 對話框開啟時，螢幕閱讀器應自動朗讀標題和描述，確保無障礙體驗

---

## Requirements

### Functional Requirements

#### 核心元件與基礎設施

- **FR-001**: 系統必須提供 AlertDialog 元件，支援四種變體（success、error、warning、info），包含對應的標題欄顏色和圖示
- **FR-002**: 系統必須提供 ConfirmDialog 元件，支援六種變體（success、error、warning、info、danger、default），包含雙按鈕佈局（確認/取消）
- **FR-003**: 系統必須提供 PromptDialog 元件，支援多個輸入欄位（text、number、textarea），包含即時驗證和錯誤訊息顯示
- **FR-004**: 系統必須提供 DialogProvider Context，管理對話框狀態和佇列機制
- **FR-005**: 系統必須提供 `useAlert()` Hook，回傳 `(options: AlertDialogOptions) => Promise<void>` 函式
- **FR-006**: 系統必須提供 `useConfirm()` Hook，回傳 `(options: ConfirmDialogOptions) => Promise<boolean>` 函式
- **FR-007**: 系統必須提供 `usePrompt()` Hook，回傳 `(options: PromptDialogOptions) => Promise<Record<string, string> | null>` 函式

#### 設計規範

- **FR-008**: 所有對話框元件必須符合 Neo-Brutalism 設計風格：3px 黑色邊框、硬陰影 `shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`、無圓角
- **FR-009**: 對話框按鈕必須包含點擊位移效果：`hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none`
- **FR-010**: 對話框標題欄顏色必須依變體正確顯示：success 綠色、error 紅色、warning 黃色、info 藍色、danger 紅色、default 灰色
- **FR-011**: 對話框必須包含淡入+縮放動畫：`animate-in fade-in-0 zoom-in-95 duration-200`
- **FR-012**: 對話框在行動裝置上必須居中顯示、響應式寬度（max-w-md）、背景滾動鎖定

#### Toast 通知整合

- **FR-013**: 系統必須整合 sonner 函式庫作為 Toast 通知系統
- **FR-014**: Toast 必須包含 Neo-Brutalism 樣式：3px 黑邊框、硬陰影 `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`、無圓角
- **FR-015**: Toast 必須支援四種類型：success、error、warning、info，包含對應的顏色和圖示
- **FR-016**: Toast 必須顯示於右上角（top-right），最多同時顯示 3 個，自動 3 秒消失

#### 互動行為

- **FR-017**: 使用者必須能按 ESC 鍵關閉對話框（除非 `closable: false`）
- **FR-018**: 使用者必須能點擊背景（半透明遮罩）關閉對話框（除非 `closable: false`）
- **FR-019**: 使用者必須能按 Enter 鍵提交 PromptDialog（僅單行 text/number 輸入）
- **FR-020**: 使用者必須能使用 Tab 鍵在對話框內循環焦點（Focus Trap）
- **FR-021**: ConfirmDialog 在執行異步操作時，確認按鈕必須顯示載入動畫並禁用

#### 遷移與驗證

- **FR-022**: 系統必須逐步遷移 18 個檔案中的 72 個原生對話框，按優先級順序（P0 → P1 → P2）
- **FR-023**: 每個檔案遷移後必須執行功能測試，確保對話框功能正常且符合設計規範
- **FR-024**: 系統必須配置 ESLint 規則 `no-restricted-globals`，禁止使用 `alert`、`confirm`、`prompt`
- **FR-025**: ESLint 錯誤訊息必須提示開發者使用對應的 Hook（例如：「請使用 useAlert() Hook 替代原生 alert()」）

#### 無障礙規範

- **FR-026**: 所有對話框必須包含 `role="dialog"` 和 `aria-modal="true"` 屬性
- **FR-027**: 對話框標題必須使用 `aria-labelledby` 關聯，描述必須使用 `aria-describedby` 關聯
- **FR-028**: 對話框開啟時，焦點必須自動移至第一個可互動元素（按鈕或輸入欄位）
- **FR-029**: 對話框關閉時，焦點必須回到觸發對話框的元素（Focus Restoration）
- **FR-030**: 顏色對比度必須符合 WCAG AA 標準（至少 4.5:1）

### Key Entities

#### DialogOptions 型別族

**AlertDialogOptions**:
- `title`: 對話框標題（必填）
- `message`: 對話框內容（必填）
- `variant`: 變體類型（success | error | warning | info，預設 info）
- `confirmText`: 確認按鈕文字（預設「確定」）
- `closable`: 是否允許 ESC/背景點擊關閉（預設 true）

**ConfirmDialogOptions**:
- `title`: 對話框標題（必填）
- `description`: 對話框描述（必填）
- `variant`: 變體類型（success | error | warning | info | danger | default，預設 default）
- `confirmText`: 確認按鈕文字（預設「確定」）
- `cancelText`: 取消按鈕文字（預設「取消」）
- `isAsync`: 是否為異步操作（預設 false，啟用時顯示載入動畫）
- `closable`: 是否允許 ESC/背景點擊關閉（預設 true）

**PromptDialogOptions**:
- `title`: 對話框標題（必填）
- `message`: 對話框描述（選填）
- `fields`: 輸入欄位陣列（必填）
  - `name`: 欄位名稱（必填）
  - `label`: 欄位標籤（必填）
  - `type`: 欄位類型（text | number | textarea，預設 text）
  - `placeholder`: 提示文字（選填）
  - `defaultValue`: 預設值（選填）
  - `required`: 是否必填（預設 false）
  - `maxLength`: 最大長度限制（選填）
  - `validation`: 自訂驗證函式（選填，回傳錯誤訊息或 null）
- `confirmText`: 確認按鈕文字（預設「確定」）
- `cancelText`: 取消按鈕文字（預設「取消」）

#### DialogContext 狀態

- `dialogQueue`: 對話框佇列（陣列，先進先出）
- `currentDialog`: 當前顯示的對話框（AlertDialog | ConfirmDialog | PromptDialog | null）
- `isOpen`: 是否有對話框開啟（boolean）
- `openDialog()`: 開啟對話框並加入佇列
- `closeDialog()`: 關閉當前對話框並處理下一個

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% 的原生對話框已替換為自訂元件（從 72 個減少到 0 個）
- **SC-002**: 100% 的對話框符合 Neo-Brutalism 設計規範（3px 邊框、硬陰影、點擊位移效果）
- **SC-003**: 所有 18 個檔案完成遷移，TypeScript 型別檢查和 ESLint 檢查 0 errors
- **SC-004**: 對話框在桌面和行動裝置上響應時間 < 200ms（從觸發到顯示）
- **SC-005**: 對話框動畫流暢度達 60fps，無卡頓或閃爍
- **SC-006**: 螢幕閱讀器測試通過（NVDA/VoiceOver），所有 ARIA 標籤正確
- **SC-007**: 鍵盤導航測試通過（Tab 循環、ESC 關閉、Enter 提交）
- **SC-008**: ESLint 規則成功阻止新程式碼使用原生對話框（測試提交應被拒絕）
- **SC-009**: 使用者反饋：對話框設計一致性和品牌識別度提升（問卷調查 > 4.0/5.0）
- **SC-010**: 開發者反饋：新 Hook API 易用性和可維護性提升（開發團隊評分 > 4.0/5.0）

## Assumptions

1. **開發環境**: 假設開發者已安裝 Node.js 22.x、pnpm、TypeScript 5.7+
2. **套件版本**: 假設 sonner 套件版本為最新穩定版（v1.x），與 React 19 相容
3. **瀏覽器支援**: 假設目標瀏覽器支援 ES2020+ 語法和 CSS Grid/Flexbox
4. **無障礙測試工具**: 假設使用 axe DevTools 和 NVDA/VoiceOver 進行測試
5. **行動裝置測試**: 假設使用實體裝置或模擬器（iOS Simulator、Android Emulator）進行測試
6. **設計 Token**: 假設現有的 `lib/design-tokens.ts` 已包含所需的顏色和邊框定義
7. **Tailwind 配置**: 假設 `tailwind.config.ts` 已包含 `shadow-neo` 和 `border-3` 定義
8. **使用者確認**: 假設使用者在 Phase 0 樣本確認後明確同意進入實作階段

---

## Constraints

1. **技術限制**: 必須使用 Next.js 15 App Router 架構，不支援 Pages Router
2. **設計限制**: 必須嚴格遵循 Neo-Brutalism 風格，不得使用圓角或漸層色
3. **時程限制**: 總開發時間預計 10-15 天，分為 Phase 0 (1 天) + Phase 1 (2-3 天) + Phase 2 (1 天) + Phase 3 (6-9 天) + Phase 4 (1-2 天)
4. **相容性限制**: 必須支援 iOS Safari 14+、Android Chrome 90+、桌面 Chrome/Firefox/Edge 最新兩個版本
5. **效能限制**: 對話框響應時間必須 < 200ms，動畫必須達 60fps
6. **無障礙限制**: 必須符合 WCAG 2.1 AA 標準
7. **維護限制**: 不得引入過度複雜的狀態管理（使用 React Context 即可，不使用 Redux/Zustand）
8. **破壞性變更**: 必須確保遷移過程不影響現有功能（逐步遷移 + 每檔案測試）

---

## Dependencies

### 內部依賴

- `lib/design-tokens.ts` - 設計 Token 系統（顏色、邊框、陰影）
- `components/ui/confirm-dialog.tsx` - 現有 ConfirmDialog 元件（作為參考範本）
- `tailwind.config.ts` - Tailwind 配置（shadow-neo、border-3 定義）
- Next.js 15 App Router - 路由系統（樣本頁面）
- React 19 Context API - DialogProvider 狀態管理

### 外部依賴

- **sonner** (v1.x) - Toast 通知函式庫
  - 安裝指令: `pnpm add sonner`
  - 用途: 替代簡單的 alert 通知（成功/失敗提示）
  - 選擇理由: 輕量、效能佳、支援自訂樣式
- **lucide-react** (已安裝) - 圖示函式庫
  - 用途: 對話框標題欄圖示（CheckCircle、XCircle、AlertTriangle、Info）
- **tailwindcss** (已安裝) - CSS 框架
  - 用途: 實作 Neo-Brutalism 樣式
- **@radix-ui/react-dialog** (可選) - 無頭對話框元件
  - 用途: 提供無障礙基礎設施（Focus Trap、ARIA 標籤）
  - 注意: 若現有 shadcn/ui Dialog 已使用 Radix UI，可直接擴充

---

## Risk Assessment

### 高風險項目

1. **破壞性變更**: 修改 18 個檔案可能引入 bug 或破壞現有功能
   - **緩解策略**: 逐步遷移，每個檔案測試後再進行下一個；使用 Git 分支隔離變更；每個 commit 包含單一檔案遷移
   - **回滾計畫**: 若測試失敗，立即回滾該檔案的變更

2. **使用者習慣**: 使用者可能習慣原生對話框的外觀和行為
   - **緩解策略**: Phase 0 樣本確認，讓使用者提前審核設計；保持相似的文案和按鈕配置；提供內部測試期（1-2 週）
   - **備案方案**: 若使用者強烈反對，調整設計風格或保留部分原生對話框

3. **無障礙問題**: 自訂對話框可能不如原生對話框無障礙
   - **緩解策略**: 嚴格遵循 ARIA 規範；使用 axe DevTools 自動化測試；邀請視障使用者測試
   - **驗證方法**: NVDA/VoiceOver 螢幕閱讀器測試，鍵盤導航測試

### 中風險項目

4. **效能影響**: 自訂對話框可能比原生對話框慢
   - **緩解策略**: 使用 React.memo() 避免不必要渲染；動畫使用 CSS transition（GPU 加速）；對話框元件 lazy load
   - **監控指標**: 使用 Chrome DevTools Performance 面板監控響應時間和 FPS

5. **行動裝置體驗**: 行動裝置上可能出現樣式或互動問題
   - **緩解策略**: 使用實體裝置測試（iOS、Android）；確保觸控目標 >= 44px × 44px；背景滾動鎖定
   - **測試裝置**: iPhone 12/13、Samsung Galaxy S21、iPad Air

6. **佇列機制複雜度**: 連續觸發對話框可能導致狀態管理混亂
   - **緩解策略**: 使用簡單的陣列佇列（FIFO）；每個對話框使用唯一 ID；測試連續觸發場景
   - **Edge Case 測試**: 快速連續點擊按鈕 5 次，驗證佇列機制

### 低風險項目

7. **ESLint 規則衝突**: 新增的 `no-restricted-globals` 可能與現有規則衝突
   - **緩解策略**: 在測試分支先驗證 ESLint 配置；確保規則僅針對業務邏輯檔案（排除測試檔案）
   - **驗證方法**: 執行 `pnpm lint` 確認無誤報

8. **sonner 套件相容性**: sonner 可能與 React 19 或 Next.js 15 不相容
   - **緩解策略**: 安裝前檢查套件文件和 GitHub Issues；若不相容則自行實作簡單的 Toast 元件
   - **備案方案**: 使用 react-hot-toast 或自訂實作

---

## Appendix

### 對話框使用統計（來自 dialog.md）

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

*註：dialog.md 提到 72 個對話框，此表為初步統計 64 個，實作時需重新驗證*

### 參考資源

- **現有元件**: [components/ui/confirm-dialog.tsx](../../../components/ui/confirm-dialog.tsx) - Neo-Brutalism 範本
- **設計 Token**: [lib/design-tokens.ts](../../../lib/design-tokens.ts) - 顏色、邊框、陰影定義
- **Tailwind 配置**: [tailwind.config.ts](../../../tailwind.config.ts) - shadow-neo、border-3 定義
- **sonner 文件**: https://sonner.emilkowal.ski/ - Toast 通知函式庫
- **WCAG 2.1 標準**: https://www.w3.org/WAI/WCAG21/quickref/ - 無障礙規範
- **Focus Trap React**: https://github.com/focus-trap/focus-trap-react - 焦點鎖定實作參考
- **dialog.md 完整計畫**: [dialog.md](../../../dialog.md) - 詳細技術研究與實作計畫
