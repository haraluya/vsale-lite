# Implementation Plan: 後台系統管理功能

**Branch**: `008-system-admin` | **Date**: 2026-01-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-system-admin/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

本功能實作後台系統管理核心功能，包含：(1) 管理員帳號管理（使用 username 登入取代 Email）、(2) 系統設定管理（Logo、網站標題、廣告輪播參數）、(3) 操作日誌系統（記錄所有後台寫入操作）。技術方案採用 Supabase 擴充 profiles 表新增 username/display_name 欄位、建立 system_settings 與 audit_logs 資料表，並實作對應的 Server Actions 與前後台介面。

## Technical Context

**Language/Version**: TypeScript 5.7+
**Primary Dependencies**: Next.js 15.1+ (App Router), React 19.x, @supabase/supabase-js v2.47+, Zod 3.24+
**Storage**: Supabase (PostgreSQL) - 擴充 profiles 表，新增 system_settings、audit_logs 資料表，新增 system Storage Bucket
**Testing**: Vitest + React Testing Library
**Target Platform**: Web (前後台雙介面)
**Project Type**: Web Application (Next.js App Router)
**Performance Goals**:
  - 操作日誌查詢 < 2s (載入 20 筆)
  - Logo 上傳後 < 3s 顯示於前後台
  - 系統設定變更 < 5s 生效於前台
  - 管理員登入響應 < 500ms
**Constraints**:
  - Logo 圖片 < 2MB，格式限制為 JPG/PNG/WebP/SVG
  - 操作日誌支援至少 10,000 筆記錄查詢
  - 使用 JSONB 儲存變更前後資料快照（支援複雜結構）
  - 系統設定變更須使用 revalidatePath() 立即更新快取
**Scale/Scope**:
  - 預估管理員數量: 5-10 人
  - 操作日誌預估: 1,000 筆/月
  - 系統設定項目: 約 15-20 個
  - 新增頁面: 5 個（管理員列表/新增/編輯、系統設定、操作日誌）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. 使用者角色優先 ✅ **PASS**
- **符合**: 本功能專注於管理員角色的帳號管理與系統設定，不涉及客戶端功能
- **符合**: 操作日誌僅管理員可查看（RLS 權限控制），客戶無法存取
- **符合**: 管理員介面優化桌面操作（表格、批次操作、篩選）

### II. 等級綁定價格 ✅ **PASS**
- **不適用**: 本功能不涉及價格機制

### III. 使用者故事驅動開發 ✅ **PASS**
- **符合**: Spec 定義了 5 個獨立的使用者故事（P0: 3 個、P1: 1 個、P2: 1 個）
- **符合**: 每個故事都有明確的驗收標準與獨立測試方法
- **符合**: 優先級清晰（P0 優先實作管理員登入與操作日誌）

### IV. API 模組化與職責分離 ✅ **PASS**
- **符合**: 所有資料操作透過 Server Actions 執行（lib/actions/admin.ts, lib/actions/system.ts, lib/actions/audit.ts）
- **符合**: 使用 Zod 驗證輸入（lib/validations/admin.schema.ts, lib/validations/system.schema.ts）
- **符合**: UI 元件僅負責顯示與呼叫 Server Actions

### V. 設計系統一致性 ✅ **PASS**
- **符合**: 遵循 Neo-Brutalism 設計風格（2-3px 邊框、硬邊陰影）
- **符合**: 操作日誌使用色彩編碼（綠建/藍改/紅刪/橙庫存/黃留言）
- **符合**: 系統設定頁面使用設計 Token 系統（lib/design-tokens.ts）

### VI. 負庫存支援 ✅ **PASS**
- **不適用**: 本功能不涉及庫存檢查

### VII. 使用者體驗優先 ✅ **PASS**
- **符合**: 操作日誌支援篩選（操作類型、操作者、日期範圍）與搜尋
- **符合**: 系統設定分類整理（基本資訊、Logo、廣告輪播）
- **符合**: 管理員暱稱顯示於所有互動中（訂單留言、操作日誌）
- **符合**: Logo 上傳即時預覽與驗證

### 技術規範檢查 ✅ **PASS**
- **符合**: 使用 Next.js 15 App Router、Supabase、Tailwind CSS
- **符合**: 部署前執行 type-check 與 build 檢查
- **符合**: Git Commit 使用繁體中文訊息

### 結論
✅ **所有憲章原則檢查通過，無需填寫 Complexity Tracking 表格**

## Project Structure

### Documentation (this feature)

```text
specs/008-system-admin/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── admin-api.md     # 管理員 CRUD Server Actions
│   ├── system-api.md    # 系統設定 Server Actions
│   └── audit-api.md     # 操作日誌 Server Actions
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Next.js App Router 結構（Web Application）

app/
├── (admin)/                      # 後台管理路由群組
│   └── admin/
│       └── system/               # 系統管理模組（新增）
│           ├── admins/           # 管理員管理
│           │   ├── page.tsx      # 管理員列表
│           │   ├── new/
│           │   │   └── page.tsx  # 新增管理員
│           │   └── [id]/
│           │       └── page.tsx  # 編輯管理員
│           ├── settings/
│           │   └── page.tsx      # 系統設定
│           └── audit-logs/
│               └── page.tsx      # 操作日誌
│
├── (auth)/                       # 認證路由群組
│   └── admin/
│       └── login/
│           └── page.tsx          # 更新：支援 username 登入
│
components/
├── admin/                        # 後台元件
│   ├── AdminList.tsx             # 管理員列表（新增）
│   ├── AdminForm.tsx             # 管理員表單（新增）
│   ├── SystemSettingsForm.tsx   # 系統設定表單（新增）
│   ├── AuditLogList.tsx          # 操作日誌列表（新增）
│   └── AuditLogFilters.tsx       # 日誌篩選器（新增）
│
lib/
├── actions/                      # Server Actions
│   ├── admin.ts                  # 管理員 CRUD（新增）
│   ├── system.ts                 # 系統設定（新增）
│   └── audit.ts                  # 操作日誌（新增）
│
├── validations/                  # Zod Schemas
│   ├── admin.schema.ts           # 管理員驗證（新增）
│   └── system.schema.ts          # 系統設定驗證（新增）
│
types/
└── index.ts                      # 型別定義（擴充）
    ├── AdminProfile              # 管理員資料型別
    ├── SystemSetting             # 系統設定型別
    └── AuditLog                  # 操作日誌型別

supabase/
└── migrations/
    └── 20260104_add_admin_system.sql  # 資料庫 Migration（新增）

tests/
├── integration/
│   ├── admin.test.ts             # 管理員功能整合測試
│   ├── system.test.ts            # 系統設定整合測試
│   └── audit.test.ts             # 操作日誌整合測試
└── unit/
    └── validations/
        ├── admin.schema.test.ts  # 管理員驗證單元測試
        └── system.schema.test.ts # 系統設定驗證單元測試
```

**Structure Decision**: 採用 Next.js 15 App Router 結構（Web Application）。本功能為後台管理功能，所有頁面放置於 `app/(admin)/admin/system/` 路由群組，遵循專案既有的路由架構（認證路由群組 + 保護路由群組）。Server Actions 與 Validations 依功能模組拆分（admin/system/audit），確保職責分離。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**無違規項目** - 本功能完全符合憲章原則，無需記錄複雜度追蹤。
