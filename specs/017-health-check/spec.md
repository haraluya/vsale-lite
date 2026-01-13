# Feature Specification: 專案健康檢查系統

**Feature Branch**: `017-health-check`
**Created**: 2026-01-13
**Status**: Draft
**Input**: 幫我在目前專案進行一個健康檢查，領域包含架構、API整合度、設計、使用體驗(操作流程、運行速度等)、可能有的BUG、使用邏輯等等，都進行一次深度檢查

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 架構健康度檢查 (Priority: P0)

作為技術負責人，我需要對專案進行全面的架構健康度檢查，確保代碼組織、模組化設計、職責分離等符合最佳實踐，以便維持長期可維護性和擴展性。

**Why this priority**: 架構問題是技術債的根源，會影響所有後續開發的效率和品質。及早發現和修正架構問題，可以避免未來更大的重構成本。

**Independent Test**: 可以獨立檢查專案的目錄結構、模組依賴關係、Server Actions 設計模式、Supabase Client 使用規則等，不需要實際執行功能即可驗證架構合規性。

**Acceptance Scenarios**:

1. **Given** 專案使用 Next.js 15 App Router，**When** 檢查路由結構，**Then** 確認 (auth)、(shop)、(admin) 路由群組正確隔離，middleware.ts 正確實作權限控制
2. **Given** 專案使用 Server Actions 模式，**When** 檢查 lib/actions/ 目錄，**Then** 確認所有資料操作都透過 Server Actions，沒有在 Client Component 直接呼叫 Supabase
3. **Given** 專案需要區分 Server/Client Supabase Client，**When** 檢查 lib/supabase/，**Then** 確認 server.ts 和 client.ts 正確分離，使用場景符合規範
4. **Given** 專案包含多個功能模組，**When** 檢查模組間依賴，**Then** 確認沒有循環依賴，模組職責清晰明確

---

### User Story 2 - API 整合度與資料流檢查 (Priority: P0)

作為技術負責人，我需要檢查所有 Server Actions 的設計品質、錯誤處理、權限驗證、輸入驗證等，確保 API 層的健壯性和安全性。

**Why this priority**: API 是前後端的核心連接點，任何 API 層的問題都會直接影響使用者體驗和系統安全性。這是系統穩定性的關鍵。

**Independent Test**: 可以逐一檢查每個 Server Action 的實作，驗證是否包含 'use server'、checkAuth()、Zod 驗證、revalidatePath() 等必要步驟，確認回傳型別符合 ActionResult<T> 規範。

**Acceptance Scenarios**:

1. **Given** 專案有多個 Server Actions，**When** 檢查所有 actions/ 檔案，**Then** 確認每個 action 都有 'use server' 標記、執行 checkAuth() 權限檢查
2. **Given** Server Actions 需要驗證輸入，**When** 檢查驗證邏輯，**Then** 確認所有輸入都使用 Zod Schema 驗證，驗證規則定義於 lib/validations/
3. **Given** Server Actions 會修改資料，**When** 檢查快取策略，**Then** 確認成功操作後都執行 revalidatePath() 更新快取
4. **Given** Server Actions 需要錯誤處理，**When** 檢查錯誤處理邏輯，**Then** 確認所有 actions 回傳統一的 ActionResult<T> 格式，包含 success、data、errors、message 欄位
5. **Given** 專案使用 RLS (Row Level Security)，**When** 檢查資料庫 policies，**Then** 確認所有資料表都啟用 RLS，客戶/管理員權限正確隔離

---

### User Story 3 - 使用者體驗與操作流程檢查 (Priority: P1)

作為產品負責人，我需要檢查前台（客戶端）和後台（管理端）的操作流程是否順暢、是否符合使用者習慣、是否有不合理的操作步驟，以提升使用者滿意度。

**Why this priority**: 使用者體驗直接影響客戶留存率和業務效率。即使功能完整，如果操作流程不順暢，也會導致使用者放棄使用。

**Independent Test**: 可以逐一走訪前台和後台的核心操作流程（登入、瀏覽商品、加入購物車、下單、訂單管理等），記錄每個流程的步驟數、等待時間、錯誤提示清晰度等。

**Acceptance Scenarios**:

1. **Given** 客戶需要登入前台，**When** 檢查登入流程，**Then** 確認手機號碼輸入格式驗證清晰、錯誤訊息友善、登入成功後自動導向商品列表
2. **Given** 客戶瀏覽商品列表，**When** 檢查商品顯示邏輯，**Then** 確認等級綁定價格正確顯示、未設定價格的商品顯示「N/A」並禁用加入購物車
3. **Given** 客戶加入購物車並結帳，**When** 檢查購物車流程，**Then** 確認購物車持久化儲存、運費自動計算、優惠券應用邏輯正確、訂單確認頁面資訊完整
4. **Given** 管理員需要快速開設客戶帳號，**When** 檢查開戶流程，**Then** 確認手機號碼驗證、預設密碼產生、一鍵複製帳密等功能正常運作
5. **Given** 管理員需要處理訂單，**When** 檢查訂單管理流程，**Then** 確認訂單狀態更新邏輯清晰、庫存扣減時機正確（標記出貨時扣減）、操作歷史完整記錄

---

### User Story 4 - 設計系統一致性檢查 (Priority: P1)

作為設計負責人，我需要檢查所有 UI 元件是否遵循 Neo-Brutalism 設計風格、響應式設計規範、設計 Token 系統是否正確使用，確保視覺一致性和品牌識別。

**Why this priority**: 設計一致性直接影響品牌形象和使用者信任感。不一致的設計會讓使用者覺得產品不專業、不可靠。

**Independent Test**: 可以逐一檢查所有 UI 元件（按鈕、卡片、表單、對話框等），驗證是否使用正確的邊框寬度、陰影效果、點擊狀態、響應式斷點等。

**Acceptance Scenarios**:

1. **Given** 專案採用 Neo-Brutalism 風格，**When** 檢查所有按鈕元件，**Then** 確認使用 2-3px 黑邊框、硬邊陰影（shadow-neo）、點擊時位移效果（translate + shadow-none）
2. **Given** 專案需要響應式設計，**When** 檢查所有元件，**Then** 確認手機版使用 2px 邊框 + shadow-neo-sm，桌面版使用 3px 邊框 + shadow-neo
3. **Given** 專案使用設計 Token 系統，**When** 檢查樣式定義，**Then** 確認使用 lib/design-tokens.ts 定義的 Token，沒有硬編碼的樣式值
4. **Given** 專案需要統一對話框系統，**When** 檢查對話框使用，**Then** 確認所有對話框都使用 useAlert/useConfirm/usePrompt hooks，沒有使用原生 window.alert/confirm/prompt
5. **Given** 專案需要無障礙支援，**When** 檢查 UI 元件，**Then** 確認觸控目標 >= 44px × 44px（WCAG 2.1 AA 標準），ARIA 標籤正確設定

---

### User Story 5 - 效能與速度檢查 (Priority: P1)

作為技術負責人，我需要檢查專案的載入速度、資料庫查詢效能、圖片優化、快取策略等，確保符合效能目標（頁面首次載入 < 2s，資料庫查詢 < 100ms p95）。

**Why this priority**: 效能問題會直接影響使用者體驗和轉換率。研究顯示，頁面載入時間每增加 1 秒，轉換率下降 7%。

**Independent Test**: 可以使用 Chrome DevTools、Lighthouse、Vercel Analytics 等工具測量頁面載入時間、資料庫查詢時間、圖片載入時間等，並與效能目標比較。

**Acceptance Scenarios**:

1. **Given** 專案設定效能目標為頁面首次載入 < 2s，**When** 使用 4G 網路模擬測試前台商品列表頁，**Then** 確認首次載入時間 < 2s（包含 HTML、CSS、JS、圖片）
2. **Given** 專案需要快速響應使用者操作，**When** 測試登入驗證響應時間，**Then** 確認 < 500ms
3. **Given** 專案需要即時搜尋功能，**When** 測試客戶搜尋響應時間，**Then** 確認 < 300ms
4. **Given** 專案使用 Supabase 資料庫，**When** 檢查所有資料庫查詢，**Then** 確認 p95 查詢時間 < 100ms，複雜查詢使用適當的索引
5. **Given** 專案包含商品圖片，**When** 檢查圖片優化，**Then** 確認使用 Next.js Image 元件、設定正確的 sizes 屬性、圖片格式使用 WebP

---

### User Story 6 - 潛在 Bug 與邏輯錯誤檢查 (Priority: P0)

作為 QA 負責人，我需要系統性地檢查專案可能存在的 Bug、邏輯錯誤、邊界條件處理不當等問題，並提供修復建議。

**Why this priority**: Bug 會直接影響系統穩定性和使用者信任。及早發現和修復 Bug，可以避免生產環境的嚴重問題。

**Independent Test**: 可以設計各種邊界條件測試案例（空值、負數、超大數值、特殊字元等），逐一驗證系統行為是否符合預期。

**Acceptance Scenarios**:

1. **Given** 專案支援負庫存，**When** 檢查庫存扣減邏輯，**Then** 確認標記出貨時正確扣減庫存、支援負庫存場景、取消訂單時正確回補庫存
2. **Given** 專案使用等級綁定價格，**When** 檢查價格顯示邏輯，**Then** 確認未設定價格的商品正確顯示「N/A」、禁用加入購物車按鈕、不允許下單
3. **Given** 專案使用訂單編號產生邏輯，**When** 檢查訂單編號唯一性，**Then** 確認使用 PostgreSQL 函數產生唯一編號（ORD-YYYYMMDD-XXXX）、沒有重複風險
4. **Given** 專案使用優惠券系統，**When** 檢查優惠券驗證邏輯，**Then** 確認領取限制、使用限制、等級限制、系列限制等都正確執行
5. **Given** 專案使用運費計算邏輯，**When** 檢查運費計算，**Then** 確認依會員等級和訂單金額正確計算、滿額免運邏輯正確
6. **Given** 專案需要處理並發請求，**When** 檢查資料庫操作原子性，**Then** 確認訂單確認/取消、庫存扣減/回補等操作使用 PostgreSQL Transaction 確保原子性

---

### User Story 7 - 資料庫安全與 Migration 檢查 (Priority: P0)

作為技術負責人，我需要檢查專案的資料庫安全設定、Migration 品質、備份策略等，確保生產環境資料安全無虞。

**Why this priority**: 資料庫是系統的核心資產，任何資料遺失或安全問題都會造成嚴重的業務損失。這是最高優先級的安全議題。

**Independent Test**: 可以檢查 RLS policies、Migration 檔案品質、備份系統設定、資料庫索引等，不需要實際執行操作即可驗證安全性。

**Acceptance Scenarios**:

1. **Given** 專案使用 Supabase 生產資料庫，**When** 檢查資料庫操作指令，**Then** 確認專案文件中明確標示禁止使用 `supabase db reset` 或 `pnpm db:reset`
2. **Given** 專案需要執行 Migration，**When** 檢查 Migration 檔案，**Then** 確認所有 Migration 都是增量式、避免破壞性變更（DROP、TRUNCATE）、包含完整註解
3. **Given** 專案需要資料備份，**When** 檢查備份系統，**Then** 確認自動備份設定（每日 02:00）、雲端儲存整合（Google Cloud Storage + Vercel Blob）、滾動刪除策略（保留最近 10 個）
4. **Given** 專案使用 RLS 保護資料，**When** 檢查所有資料表，**Then** 確認所有表都啟用 RLS、客戶僅能讀取 status = 'active' 資料、管理員可讀取所有資料
5. **Given** 專案需要效能優化，**When** 檢查資料庫索引，**Then** 確認所有外鍵都有索引、常用查詢欄位有索引、複合索引順序正確

---

### Edge Cases

- **並發操作**: 多個管理員同時修改同一訂單/商品時，資料庫如何保證一致性？是否有適當的樂觀鎖或悲觀鎖機制？
- **大量資料處理**: 當商品數量 > 1000、訂單數量 > 10000 時，列表頁面是否會效能下降？是否有適當的分頁和索引？
- **錯誤恢復**: 當 Supabase 服務暫時不可用時，系統如何處理？是否有適當的錯誤提示和重試機制？
- **圖片上傳失敗**: 當圖片上傳到 Supabase Storage 失敗時，資料庫記錄如何處理？是否會產生不一致狀態？
- **優惠券邊界條件**: 當優惠券已過期但客戶在購物車中已套用時，結帳時如何處理？是否會產生折扣計算錯誤？
- **負庫存極端情況**: 當庫存為 -999 時，系統是否仍允許下單？是否有最低庫存限制？

---

## Functional Requirements *(mandatory)*

### FR1 - 架構合規性自動檢查

系統應該能夠自動檢查專案架構是否符合規範，包含：
- 路由結構檢查（路由群組隔離、middleware 權限控制）
- Server Actions 模式檢查（'use server'、checkAuth()、Zod 驗證、revalidatePath()）
- Supabase Client 使用檢查（Server/Client 分離、使用場景正確）
- 模組依賴檢查（無循環依賴、職責清晰）

**Assumptions**:
- 使用 TypeScript AST 分析工具（如 ts-morph）靜態分析程式碼
- 輸出格式為 JSON，包含檢查項目、通過/失敗狀態、錯誤位置

### FR2 - API 整合度自動檢查

系統應該能夠自動檢查所有 Server Actions 的品質，包含：
- 必要步驟檢查（'use server'、checkAuth()、Zod 驗證、revalidatePath()）
- 回傳型別檢查（ActionResult<T> 格式）
- 錯誤處理檢查（try-catch、錯誤訊息友善性）
- RLS policies 檢查（所有表啟用 RLS、權限隔離正確）

**Assumptions**:
- 使用 TypeScript 型別檢查 API 回傳型別
- 使用 Supabase CLI 查詢 RLS policies 設定

### FR3 - 使用者體驗流程測試

系統應該提供完整的操作流程測試清單，包含：
- 前台核心流程（登入 → 瀏覽商品 → 加入購物車 → 套用優惠券 → 結帳 → 查看訂單）
- 後台核心流程（登入 → 開設客戶 → 商品管理 → 訂單管理 → 會員等級管理）
- 每個流程的步驟數、預期結果、常見問題檢查點

**Assumptions**:
- 提供手動測試清單（Markdown Checklist 格式）
- 記錄每個流程的實際測試結果和發現的問題

### FR4 - 設計系統一致性檢查

系統應該能夠自動檢查 UI 元件是否遵循設計規範，包含：
- Neo-Brutalism 風格檢查（邊框寬度、陰影效果、點擊狀態）
- 響應式設計檢查（斷點使用、手機/桌面樣式差異）
- 設計 Token 使用檢查（避免硬編碼樣式）
- 對話框系統檢查（使用 hooks 而非原生對話框）

**Assumptions**:
- 使用正規表示式搜尋 className 屬性，檢查是否包含正確的樣式類別
- 使用 ESLint 規則檢查是否使用原生對話框（no-restricted-globals）

### FR5 - 效能測量與分析

系統應該提供效能測量工具和分析報告，包含：
- 頁面載入時間測量（首次載入、互動時間、完全載入）
- 資料庫查詢時間測量（p50、p95、p99）
- 圖片優化檢查（Next.js Image 使用、sizes 屬性、WebP 格式）
- 快取策略檢查（revalidatePath 使用、ISR 設定）

**Assumptions**:
- 使用 Chrome DevTools Performance API 測量頁面載入時間
- 使用 Supabase Dashboard 查詢資料庫查詢時間統計
- 提供 Lighthouse 測試報告

### FR6 - Bug 與邏輯錯誤檢查

系統應該提供常見 Bug 檢查清單和測試案例，包含：
- 邊界條件測試（空值、負數、超大數值、特殊字元）
- 資料一致性檢查（庫存扣減/回補、訂單狀態更新、優惠券使用）
- 並發操作測試（多使用者同時操作、資料庫鎖機制）
- 錯誤恢復測試（服務不可用、網路中斷、操作失敗）

**Assumptions**:
- 提供手動測試案例清單（Given-When-Then 格式）
- 使用自動化測試框架（Vitest）覆蓋核心邏輯

### FR7 - 資料庫安全與 Migration 檢查

系統應該能夠自動檢查資料庫安全設定和 Migration 品質，包含：
- RLS policies 完整性檢查（所有表啟用 RLS）
- Migration 檔案品質檢查（增量式、無破壞性變更、包含註解）
- 備份系統檢查（自動備份設定、雲端儲存整合、滾動刪除）
- 索引檢查（外鍵索引、常用查詢索引、複合索引）

**Assumptions**:
- 使用 Supabase CLI 查詢 RLS policies 和索引設定
- 使用靜態分析工具檢查 Migration 檔案（檢查 DROP、TRUNCATE 關鍵字）

### FR8 - 綜合健康檢查報告

系統應該產生完整的健康檢查報告，包含：
- 各領域檢查結果摘要（架構、API、UX、設計、效能、Bug、安全）
- 發現的問題清單（依嚴重程度排序：Critical / High / Medium / Low）
- 修復建議（具體的修復步驟、預估工作量、優先順序）
- 健康度評分（0-100 分，依各領域加權平均）

**Assumptions**:
- 報告格式為 Markdown，包含表格、清單、連結等
- 提供問題追蹤清單（可匯出為 GitHub Issues）

---

## Success Criteria *(mandatory)*

1. **架構合規性**: 95% 以上的架構檢查項目通過，所有 Critical 問題都已修復
2. **API 品質**: 100% 的 Server Actions 包含必要步驟（checkAuth、Zod 驗證、revalidatePath），回傳型別統一為 ActionResult<T>
3. **使用者體驗**: 前台和後台核心流程測試通過率 >= 90%，操作流程順暢無卡頓
4. **設計一致性**: 95% 以上的 UI 元件遵循 Neo-Brutalism 風格和響應式設計規範
5. **效能達標**: 頁面首次載入 < 2s、登入驗證 < 500ms、客戶搜尋 < 300ms、資料庫查詢 p95 < 100ms
6. **Bug 修復**: 所有 Critical 和 High 優先級的 Bug 都已修復，Medium 和 Low 優先級的 Bug 已記錄並排程
7. **資料安全**: 所有資料表啟用 RLS、所有 Migration 都是增量式、備份系統正常運作
8. **健康度評分**: 專案整體健康度評分 >= 85 分（滿分 100）

---

## Key Entities *(if applicable)*

### 健康檢查報告 (Health Check Report)

- report_id: string (UUID)
- created_at: timestamp
- branch: string (檢查的分支名稱，如 "017-health-check")
- overall_score: number (0-100，整體健康度評分)
- architecture_score: number (0-100，架構健康度)
- api_score: number (0-100，API 整合度)
- ux_score: number (0-100，使用者體驗)
- design_score: number (0-100，設計一致性)
- performance_score: number (0-100，效能表現)
- security_score: number (0-100，安全性)
- issues: Issue[] (發現的問題清單)
- recommendations: Recommendation[] (修復建議清單)

### 問題 (Issue)

- issue_id: string (UUID)
- report_id: string (所屬報告 ID)
- category: string (架構 / API / UX / 設計 / 效能 / Bug / 安全)
- severity: string (Critical / High / Medium / Low)
- title: string (問題標題)
- description: string (問題描述)
- location: string (問題位置，如檔案路徑 + 行號)
- impact: string (影響範圍和嚴重性說明)
- status: string (Open / Fixed / Acknowledged)

### 修復建議 (Recommendation)

- recommendation_id: string (UUID)
- issue_id: string (對應的問題 ID)
- priority: string (P0 / P1 / P2)
- action: string (具體的修復步驟)
- estimated_effort: string (預估工作量，如 "1-2 小時" / "1 天" / "1 週")
- references: string[] (參考資料連結，如文件、範例程式碼等)

---

## Dependencies & Assumptions *(mandatory)*

### Dependencies

1. **TypeScript AST 分析工具**: 使用 ts-morph 或類似工具進行靜態程式碼分析
2. **Supabase CLI**: 查詢 RLS policies、索引、Migration 狀態等
3. **Chrome DevTools / Lighthouse**: 測量頁面載入時間和效能指標
4. **Vitest / React Testing Library**: 自動化測試框架（專案已安裝）
5. **ESLint**: 檢查程式碼品質和設計規範遵循度（專案已設定）

### Assumptions

1. **專案已完成主要功能開發**: 健康檢查針對已完成的功能模組（001-016），不包含未開發的功能
2. **檢查環境為開發環境**: 部分檢查（如效能測量）在本地開發環境執行，不影響生產環境
3. **手動測試為主**: 部分檢查項目（如操作流程測試）需要手動執行，因為自動化測試覆蓋率尚未達到 100%
4. **檢查結果需人工判斷**: 自動化工具產生的報告需要技術負責人人工審查，判斷嚴重程度和優先順序
5. **修復工作在獨立分支進行**: 所有發現的問題都在 017-health-check 分支修復，通過驗證後再合併到 master

---

## Scope Boundaries *(mandatory)*

### In Scope

1. **架構檢查**: 路由結構、Server Actions 模式、Supabase Client 使用、模組依賴
2. **API 檢查**: Server Actions 品質、錯誤處理、權限驗證、RLS policies
3. **使用者體驗檢查**: 前台/後台核心操作流程、錯誤提示、載入狀態
4. **設計檢查**: Neo-Brutalism 風格、響應式設計、設計 Token、對話框系統
5. **效能檢查**: 頁面載入時間、資料庫查詢時間、圖片優化、快取策略
6. **Bug 檢查**: 邊界條件、資料一致性、並發操作、錯誤恢復
7. **安全檢查**: RLS policies、Migration 品質、備份系統、索引
8. **報告產生**: 綜合健康檢查報告、問題清單、修復建議

### Out of Scope

1. **新功能開發**: 健康檢查不包含開發新功能，僅檢查和修復現有功能
2. **生產環境部署**: 健康檢查在開發環境執行，不涉及生產環境部署和測試
3. **第三方服務整合**: 不檢查金流、物流等尚未整合的第三方服務
4. **自動化測試撰寫**: 不在此階段撰寫完整的自動化測試，僅使用現有測試框架執行部分檢查
5. **效能優化實施**: 僅測量和報告效能問題，不在此階段實施大規模效能優化（如 CDN、Redis 快取等）
6. **使用者訪談**: 不進行實際使用者訪談和可用性測試，僅依據最佳實踐和規範檢查

---

## Non-Functional Requirements *(if applicable)*

### 可維護性

- 健康檢查腳本應該模組化設計，每個檢查項目獨立實作，方便未來擴充和維護
- 檢查報告應該使用標準化格式（Markdown + JSON），方便版本控制和自動化處理

### 可重複性

- 所有自動化檢查應該具有可重複性，相同的程式碼狀態應該產生相同的檢查結果
- 手動測試清單應該明確定義測試步驟和預期結果，不同測試人員執行應得到一致的結論

### 效率

- 完整的健康檢查（包含所有自動化和手動測試）應該在 4 小時內完成
- 自動化檢查腳本執行時間應該 < 10 分鐘
- 報告產生時間應該 < 1 分鐘

### 可追蹤性

- 所有發現的問題都應該記錄問題位置（檔案路徑 + 行號），方便快速定位
- 所有修復建議都應該包含參考資料連結，方便後續實施

---

## Open Questions *(if any, to be resolved during clarification or planning)*

無。所有檢查領域和標準都已明確定義。

---

## References *(if any)*

- 專案憲章: `d:\APP\vsale\CLAUDE.md`
- 資料庫安全協議: `docs/DATABASE_SAFETY_PROTOCOL.md`
- 安全 Migration 指南: `docs/SAFE_MIGRATION_GUIDE.md`
- 響應式設計規範: 憲章第 VII 條（005-responsive-ui）
- 統一對話框系統: 憲章第 VIII 條（013-unified-dialog）
- Next.js 15 文件: https://nextjs.org/docs
- Supabase 文件: https://supabase.com/docs
- WCAG 2.1 無障礙標準: https://www.w3.org/WAI/WCAG21/quickref/
