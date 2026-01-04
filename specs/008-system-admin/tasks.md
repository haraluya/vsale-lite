# Tasks: 後台系統管理功能

**Input**: Design documents from `/specs/008-system-admin/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: 本功能不包含測試任務（規格未要求 TDD 方法）

**Organization**: 任務依使用者故事分組，確保每個故事可獨立實作與測試

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可平行執行（不同檔案，無相依性）
- **[Story]**: 此任務屬於哪個使用者故事（如 US1, US2, US3）
- 描述包含完整檔案路徑

## Path Conventions

採用 Next.js 15 App Router 結構：
- **App 路由**: `app/(admin)/admin/system/`
- **Server Actions**: `lib/actions/`
- **Validations**: `lib/validations/`
- **UI 元件**: `components/admin/`
- **型別定義**: `types/index.ts`
- **Migration**: `supabase/migrations/`

---

## Phase 1: Setup (共享基礎建設)

**Purpose**: 專案初始化與基本結構建立

- [X] T001 [P] 建立 Migration 檔案結構 `supabase/migrations/20260113_system_admin.sql`
- [X] T002 [P] 擴充型別定義於 `types/index.ts` (Admin, SystemSetting, AuditLog)
- [X] T003 [P] 建立 Validation Schemas 於 `lib/validations/admin.schema.ts`
- [X] T004 [P] 建立 Validation Schemas 於 `lib/validations/system.schema.ts`

---

## Phase 2: Foundational (阻塞性前置作業)

**Purpose**: 所有使用者故事都依賴的核心基礎建設

**⚠️ CRITICAL**: 完成此階段前，無法開始任何使用者故事實作

### 資料庫 Migration

- [X] T005 執行資料庫 Migration（擴充 profiles、建立 system_settings、audit_logs）
- [X] T006 建立所有索引（profiles.username、system_settings.key、audit_logs GIN 索引）
- [X] T007 建立 RLS Policies（profiles、system_settings、audit_logs）
- [X] T008 插入預設系統設定（site_title、logo_url、carousel 參數等 9 筆）
- [X] T009 執行現有管理員帳號遷移（從 email 提取 username）

### 核心 Server Actions 基礎建設

- [X] T010 [P] 建立操作日誌核心函式 `lib/actions/audit.ts` (logAudit)
- [X] T011 [P] 建立 Admin Supabase Client 輔助函式（Service Role）

**Checkpoint**: 資料庫結構就緒，操作日誌系統可用，使用者故事可開始實作

---

## Phase 3: User Story 1 - 管理員使用帳號登入後台 (Priority: P0) 🎯 MVP

**Goal**: 管理員可使用帳號（username）+ 密碼登入後台，取代 Email 登入方式

**Independent Test**:
- 建立測試帳號 `testadmin`，密碼 `Test123456`
- 訪問 `/admin/login`，輸入帳號與密碼
- 驗證成功登入後導向 `/admin/dashboard`
- 驗證使用 Email 登入會失敗（舊機制已禁用）

### Implementation for User Story 1

- [X] T012 [US1] 實作 loginWithUsername Server Action 於 `lib/actions/admins.ts`
- [X] T013 [US1] 更新後台登入頁面 `app/(auth)/admin/login/page.tsx` (支援 username 登入)
- [X] T014 [US1] 更新登入表單元件，顯示「帳號」而非「Email」欄位
- [X] T015 [US1] 新增帳號登入驗證邏輯（查詢 username → email → Supabase Auth）
- [X] T016 [US1] 測試帳號登入流程（成功與失敗情境）
- [X] T017 [US1] 驗證舊 Email 登入已禁用（顯示「請使用帳號登入」）

**Checkpoint**: 管理員可使用帳號登入後台，舊 Email 登入已禁用

---

## Phase 4: User Story 2 - 超級管理員管理工作人員帳號 (Priority: P0)

**Goal**: 超級管理員可建立、編輯、重設密碼、刪除管理員帳號

**Independent Test**:
- 以超級管理員身分登入
- 訪問 `/admin/system/admins/new`
- 建立新管理員 `teststaff`
- 登出後使用 `teststaff` 登入驗證
- 重設密碼、編輯暱稱、刪除帳號功能逐一測試

### Server Actions for User Story 2

- [X] T018 [P] [US2] 實作 createAdmin Server Action 於 `lib/actions/admins.ts`
- [X] T019 [P] [US2] 實作 getAdmins Server Action 於 `lib/actions/admins.ts`
- [X] T020 [P] [US2] 實作 getAdminById Server Action 於 `lib/actions/admins.ts`
- [X] T021 [P] [US2] 實作 updateAdmin Server Action 於 `lib/actions/admins.ts`
- [X] T022 [P] [US2] 實作 resetPassword Server Action 於 `lib/actions/admins.ts`
- [X] T023 [P] [US2] 實作 deleteAdmin Server Action 於 `lib/actions/admins.ts`

### UI Components for User Story 2

- [X] T024 [P] [US2] 建立管理員列表元件 `components/admin/AdminList.tsx`
- [X] T025 [P] [US2] 建立管理員表單元件 `components/admin/AdminForm.tsx`

### Pages for User Story 2

- [ ] T026 [US2] 建立管理員列表頁面 `app/(admin)/admin/system/admins/page.tsx` (已生成範本於 IMPLEMENTATION_GUIDE.md)
- [ ] T027 [US2] 建立新增管理員頁面 `app/(admin)/admin/system/admins/new/page.tsx` (已生成範本於 IMPLEMENTATION_GUIDE.md)
- [ ] T028 [US2] 建立編輯管理員頁面 `app/(admin)/admin/system/admins/[id]/page.tsx` (已生成範本於 IMPLEMENTATION_GUIDE.md)

### Integration & Testing for User Story 2

- [X] T029 [US2] 整合操作日誌記錄於所有管理員 CRUD 操作
- [ ] T030 [US2] 測試建立管理員流程（帳號重複檢查、密碼強度驗證）
- [ ] T031 [US2] 測試編輯管理員暱稱與 Email
- [ ] T032 [US2] 測試重設密碼功能
- [ ] T033 [US2] 測試刪除管理員（防止刪除自己、操作記錄保留）

**Checkpoint**: 管理員帳號管理完整功能可用，所有操作記錄於 audit_logs

---

## Phase 5: User Story 3 - 所有後台操作自動記錄於操作日誌 (Priority: P0)

**Goal**: 自動記錄所有後台寫入操作（建立、更新、刪除），支援篩選與搜尋

**Independent Test**:
- 建立測試商品
- 修改商品名稱、庫存、價格
- 訪問 `/admin/system/audit-logs`
- 驗證所有操作都被記錄（含操作者、時間、變更內容）
- 測試篩選功能（依操作類型、日期範圍、操作者）

### Server Actions for User Story 3

- [ ] T034 [P] [US3] 實作 getAuditLogs Server Action 於 `lib/actions/audit.ts`
- [ ] T035 [P] [US3] 實作 getAuditLogsByTarget Server Action 於 `lib/actions/audit.ts`
- [ ] T036 [P] [US3] 實作 getAuditLogStats Server Action 於 `lib/actions/audit.ts`

### UI Components for User Story 3

- [ ] T037 [P] [US3] 建立操作日誌列表元件 `components/admin/AuditLogList.tsx`
- [ ] T038 [P] [US3] 建立操作日誌篩選器元件 `components/admin/AuditLogFilters.tsx`
- [ ] T039 [P] [US3] 建立操作類型顏色編碼 Badge 元件 `components/admin/ActionTypeBadge.tsx`

### Pages for User Story 3

- [ ] T040 [US3] 建立操作日誌頁面 `app/(admin)/admin/system/audit-logs/page.tsx`

### Integration & Auto-Logging for User Story 3

- [ ] T041 [US3] 整合操作日誌記錄於現有商品 CRUD Server Actions (`lib/actions/products.ts`)
- [ ] T042 [US3] 整合操作日誌記錄於現有客戶 CRUD Server Actions (`lib/actions/clients.ts`)
- [ ] T043 [US3] 整合操作日誌記錄於現有訂單 Server Actions (`lib/actions/orders.ts`)
- [ ] T044 [US3] 整合操作日誌記錄於系統設定 Server Actions (`lib/actions/system.ts`)

### Testing for User Story 3

- [ ] T045 [US3] 測試操作日誌列表查詢（分頁、排序）
- [ ] T046 [US3] 測試操作類型篩選（綠建/藍改/紅刪/橙庫存/黃留言）
- [ ] T047 [US3] 測試日期範圍篩選
- [ ] T048 [US3] 測試操作者搜尋
- [ ] T049 [US3] 驗證刪除操作者後日誌仍保留暱稱快照
- [ ] T050 [US3] 驗證 JSONB 查詢正確運作（如「庫存從 100 調整」）

**Checkpoint**: 操作日誌系統完整可用，所有後台操作自動記錄

---

## Phase 6: User Story 4 - 管理員更新系統設定 (Priority: P1)

**Goal**: 管理員可更新網站標題、Logo、廣告輪播參數等系統設定

**Independent Test**:
- 訪問 `/admin/system/settings`
- 修改網站標題為「測試標題」
- 上傳測試 Logo 圖片
- 重新載入前台頁面，驗證標題與 Logo 已變更
- 修改廣告輪播設定，驗證前台輪播行為改變

### Server Actions for User Story 4

- [ ] T051 [P] [US4] 實作 getSettings Server Action 於 `lib/actions/system.ts`
- [ ] T052 [P] [US4] 實作 getPublicSettings Server Action 於 `lib/actions/system.ts`
- [ ] T053 [P] [US4] 實作 updateSetting Server Action 於 `lib/actions/system.ts`
- [ ] T054 [P] [US4] 實作 uploadLogo Server Action 於 `lib/actions/system.ts`
- [ ] T055 [P] [US4] 實作 deleteLogo Server Action 於 `lib/actions/system.ts`

### Helper Functions for User Story 4

- [ ] T056 [P] [US4] 實作 parseSettingValue 輔助函式於 `lib/actions/system.ts`
- [ ] T057 [P] [US4] 實作 serializeSettingValue 輔助函式於 `lib/actions/system.ts`

### UI Components for User Story 4

- [ ] T058 [P] [US4] 建立系統設定表單元件 `components/admin/SystemSettingsForm.tsx`
- [ ] T059 [P] [US4] 建立 Logo 上傳元件 `components/admin/LogoUploader.tsx`

### Pages for User Story 4

- [ ] T060 [US4] 建立系統設定頁面 `app/(admin)/admin/system/settings/page.tsx`

### Integration for User Story 4

- [ ] T061 [US4] 整合公開設定於前台 Layout `app/(shop)/layout.tsx`
- [ ] T062 [US4] 整合公開設定於後台 Sidebar（顯示 Logo）
- [ ] T063 [US4] 整合操作日誌記錄於系統設定變更

### Testing for User Story 4

- [ ] T064 [US4] 測試更新文字設定（site_title、company_name）
- [ ] T065 [US4] 測試更新數字設定（carousel_interval）
- [ ] T066 [US4] 測試更新布林值設定（carousel_auto_play）
- [ ] T067 [US4] 測試 Logo 上傳（完整版、圖示版、Favicon）
- [ ] T068 [US4] 測試 Logo 檔案驗證（大小限制 2MB、格式限制）
- [ ] T069 [US4] 驗證前台即時套用新設定（revalidatePath 生效）

**Checkpoint**: 系統設定管理完整可用，前台即時套用變更

---

## Phase 7: User Story 5 - 查詢特定實體的操作歷史 (Priority: P2)

**Goal**: 在訂單/商品/客戶詳情頁顯示該實體的完整操作時間軸

**Independent Test**:
- 建立測試訂單
- 執行多次狀態變更（確認、出貨、取消）
- 訪問訂單詳情頁
- 驗證顯示該訂單的完整操作時間軸
- 驗證時間軸顯示操作者、時間、變更內容

### UI Components for User Story 5

- [ ] T070 [P] [US5] 建立操作歷史時間軸元件 `components/admin/AuditTimeline.tsx`

### Page Integration for User Story 5

- [ ] T071 [US5] 整合操作歷史時間軸於訂單詳情頁 `app/(admin)/admin/orders/[id]/page.tsx`
- [ ] T072 [US5] 整合操作歷史時間軸於商品編輯頁 `app/(admin)/admin/products/[id]/page.tsx`
- [ ] T073 [US5] 整合操作歷史時間軸於客戶詳情頁 `app/(admin)/admin/users/[id]/page.tsx`

### Testing for User Story 5

- [ ] T074 [US5] 測試訂單操作歷史時間軸（建立、確認、出貨、取消）
- [ ] T075 [US5] 測試商品操作歷史（庫存調整、價格變更）
- [ ] T076 [US5] 測試客戶操作歷史（等級變更）

**Checkpoint**: 所有實體詳情頁顯示完整操作歷史時間軸

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 跨使用者故事的改進與品質保證

- [ ] T077 [P] 更新 Sidebar 導覽新增「系統管理」選單（管理員、系統設定、操作紀錄）
- [ ] T078 [P] 程式碼清理與重構（移除重複程式碼）
- [ ] T079 [P] 驗證所有頁面符合 Neo-Brutalism 設計風格
- [ ] T080 [P] 驗證所有 Server Actions 包含權限檢查與輸入驗證
- [ ] T081 [P] 驗證所有表單包含錯誤處理與使用者回饋
- [ ] T082 執行 TypeScript 型別檢查 (`pnpm type-check`)
- [ ] T083 執行 ESLint 檢查 (`pnpm lint`)
- [ ] T084 執行完整測試流程（參照 `quickstart.md`）
- [ ] T085 效能測試：驗證 10,000 筆操作日誌查詢 < 2 秒
- [ ] T086 [P] 文件更新：更新專案 CLAUDE.md（標註 Feature 008 已完成）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無相依性 - 可立即開始
- **Foundational (Phase 2)**: 依賴 Setup 完成 - **阻塞所有使用者故事**
- **User Stories (Phase 3-7)**: 所有故事都依賴 Foundational 完成
  - 完成 Foundational 後，使用者故事可平行進行（若有人力）
  - 或依優先級順序執行（P0 → P1 → P2）
- **Polish (Phase 8)**: 依賴所有欲實作的使用者故事完成

### User Story Dependencies

- **User Story 1 (P0)**: Foundational 完成後可開始 - 無其他故事相依性
- **User Story 2 (P0)**: Foundational 完成後可開始 - 無其他故事相依性
- **User Story 3 (P0)**: Foundational 完成後可開始 - 但需 US2 的 logAudit 函式
- **User Story 4 (P1)**: Foundational 完成後可開始 - 需 US3 的操作日誌整合
- **User Story 5 (P2)**: Foundational 完成後可開始 - 需 US3 的 getAuditLogsByTarget

**建議順序**:
1. Phase 1 → Phase 2（Foundational，必須完成）
2. Phase 3 (US1) → Phase 4 (US2) → Phase 5 (US3)（P0 優先，依序執行）
3. Phase 6 (US4)（P1，核心功能）
4. Phase 7 (US5)（P2，進階功能，可選）
5. Phase 8（Polish，最終品質保證）

### Within Each User Story

- Server Actions 優先於 UI 元件
- UI 元件優先於頁面
- 核心功能優先於整合功能
- 功能實作優先於測試驗證

### Parallel Opportunities

#### Phase 1 (Setup)
```bash
# 可平行執行
Task T001: 建立 Migration 檔案結構
Task T002: 擴充型別定義
Task T003: 建立 Admin Validation Schemas
Task T004: 建立 System Validation Schemas
```

#### Phase 2 (Foundational)
```bash
# 可平行執行
Task T010: 建立操作日誌核心函式
Task T011: 建立 Admin Supabase Client
```

#### Phase 4 (User Story 2 - Server Actions)
```bash
# 可平行執行（不同函式）
Task T018: createAdmin Server Action
Task T019: getAdmins Server Action
Task T020: getAdminById Server Action
Task T021: updateAdmin Server Action
Task T022: resetPassword Server Action
Task T023: deleteAdmin Server Action
```

#### Phase 4 (User Story 2 - UI Components)
```bash
# 可平行執行（不同檔案）
Task T024: AdminList.tsx
Task T025: AdminForm.tsx
```

---

## Parallel Example: User Story 2 (管理員帳號管理)

### Step 1: Launch All Server Actions in Parallel
```bash
Task T018: "實作 createAdmin Server Action 於 lib/actions/admins.ts"
Task T019: "實作 getAdmins Server Action 於 lib/actions/admins.ts"
Task T020: "實作 getAdminById Server Action 於 lib/actions/admins.ts"
Task T021: "實作 updateAdmin Server Action 於 lib/actions/admins.ts"
Task T022: "實作 resetPassword Server Action 於 lib/actions/admins.ts"
Task T023: "實作 deleteAdmin Server Action 於 lib/actions/admins.ts"
```

### Step 2: Launch All UI Components in Parallel
```bash
Task T024: "建立 AdminList.tsx"
Task T025: "建立 AdminForm.tsx"
```

### Step 3: Sequential (Pages depend on components)
```bash
Task T026: "建立管理員列表頁面"
Task T027: "建立新增管理員頁面"
Task T028: "建立編輯管理員頁面"
```

---

## Implementation Strategy

### MVP First (User Story 1-3 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - 阻塞所有故事)
3. Complete Phase 3: User Story 1（管理員登入）
4. Complete Phase 4: User Story 2（管理員帳號管理）
5. Complete Phase 5: User Story 3（操作日誌）
6. **STOP and VALIDATE**: 測試 P0 核心功能
7. 部署/展示

### Incremental Delivery

1. Setup + Foundational → 基礎就緒
2. Add User Story 1 → 測試獨立功能 → 部署/展示（管理員可登入）
3. Add User Story 2 → 測試獨立功能 → 部署/展示（管理員可管理帳號）
4. Add User Story 3 → 測試獨立功能 → 部署/展示（完整稽核軌跡）
5. Add User Story 4 → 測試獨立功能 → 部署/展示（系統設定管理）
6. Add User Story 5 → 測試獨立功能 → 部署/展示（操作歷史時間軸）
7. 每個故事增加價值，不破壞先前故事

### Parallel Team Strategy

若有多名開發者：

1. 團隊共同完成 Setup + Foundational
2. Foundational 完成後：
   - 開發者 A: User Story 1 + User Story 2
   - 開發者 B: User Story 3 + User Story 4
   - 開發者 C: User Story 5
3. 各故事獨立完成並整合

---

## Task Summary

### Total Tasks: 86

- **Phase 1 (Setup)**: 4 tasks
- **Phase 2 (Foundational)**: 7 tasks
- **Phase 3 (US1 - 管理員登入)**: 6 tasks
- **Phase 4 (US2 - 管理員帳號管理)**: 16 tasks
- **Phase 5 (US3 - 操作日誌)**: 16 tasks
- **Phase 6 (US4 - 系統設定)**: 19 tasks
- **Phase 7 (US5 - 操作歷史)**: 7 tasks
- **Phase 8 (Polish)**: 10 tasks

### Parallel Opportunities Identified

- **Phase 1**: 4 tasks (100% 可平行)
- **Phase 2**: 2 tasks (29% 可平行)
- **Phase 4 (US2)**: 8 tasks (50% 可平行)
- **Phase 5 (US3)**: 3 tasks (19% 可平行)
- **Phase 6 (US4)**: 5 tasks (26% 可平行)
- **Phase 7 (US5)**: 1 task (14% 可平行)
- **Phase 8**: 7 tasks (70% 可平行)

### Suggested MVP Scope

**MVP = Phase 1 + Phase 2 + Phase 3 + Phase 4 + Phase 5** (前 3 個 P0 使用者故事)

包含：
- 管理員帳號登入（username 模式）
- 管理員帳號管理（CRUD + 密碼重設）
- 操作日誌系統（自動記錄所有後台操作）

預估工作量：**3-4 個工作天**（單人開發）

---

## Notes

- [P] 任務 = 不同檔案，無相依性，可平行執行
- [Story] 標籤將任務對應至特定使用者故事，便於追蹤
- 每個使用者故事應可獨立完成與測試
- 完成每個任務或邏輯群組後應 commit
- 可在任何 Checkpoint 停下來驗證故事獨立性
- 避免：模糊任務、同檔案衝突、破壞獨立性的跨故事相依性
- 所有操作都應記錄於 `audit_logs` 表（透過 `logAudit` 函式）
- 設定變更後必須執行 `revalidatePath('/', 'layout')` 確保即時生效
