# Implementation Plan: 客戶與會員等級管理

**Branch**: `001-user-tier-management` | **Date**: 2026-01-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-user-tier-management/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

建立 Vsale-lite 的客戶與會員等級管理系統,實現雙入口登入機制(客戶使用手機號碼、管理員使用 Email)、會員等級設定、快速開戶功能,為後續的等級綁定價格體系奠定基礎。此功能是整個 B2B 訂貨系統的核心基建,包含 RBAC 權限控制、會員等級 CRUD、客戶帳號管理及列表查詢功能。

## Technical Context

**Language/Version**: TypeScript 5.7+ / Node.js v22.x LTS (Iron)
**Primary Dependencies**:
  - Framework: Next.js 15.1+ (App Router)
  - UI Library: React 19.x
  - Styling: Tailwind CSS v4.0
  - Component Base: shadcn/ui (無頭組件)
  - Icons: Lucide React
  - State Management: Zustand 5.0+ (僅購物車)
  - Validation: Zod 3.24+

**Storage**:
  - Database: Supabase (PostgreSQL)
  - Auth Provider: Supabase Auth
  - SDK: @supabase/supabase-js v2.47+, @supabase/ssr v0.5+

**Testing**: NEEDS CLARIFICATION (建議 Vitest + React Testing Library 或 Jest)

**Target Platform**: Web Application (優先支援 Mobile 端,響應式設計支援 Desktop)
**Project Type**: Web (Next.js SSR/SSG + Server Actions)

**Performance Goals**:
  - 頁面首次載入 < 2s (Mobile 4G)
  - 登入驗證響應 < 500ms
  - 客戶搜尋即時響應 < 300ms

**Constraints**:
  - 必須支援 Taiwan Region (Firebase asia-east1)
  - 必須遵循 Neo-Brutalism 設計系統
  - 前端 Bundle Size < 200KB (初始載入)
  - 資料庫查詢 < 100ms (p95)

**Scale/Scope**:
  - 初期目標: 1000 位客戶
  - 3-5 個會員等級
  - 約 10-15 個管理後台頁面
  - 約 5-8 個前台頁面

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ I. 使用者角色優先 (User Role First)
**狀態**: 完全符合
- ✅ 雙入口設計: 前台 `/login` (手機號碼) vs 後台 `/admin/login` (Email)
- ✅ 客戶端優化行動裝置、管理端優化桌面裝置
- ✅ 嚴格區分 Client 與 Admin 的操作環境與權限

### ✅ II. 等級綁定價格 (Tier-Based Pricing)
**狀態**: 符合(基礎建設階段)
- ✅ 建立 `tiers` 表作為價格體系基礎
- ✅ 客戶建立時必須選擇會員等級
- ✅ 為後續 `prices` 表設計預留擴充性
- ⚠️ 注意: 本功能不包含價格設定,僅建立等級管理

### ✅ III. 使用者故事驅動開發 (User Story Driven Development)
**狀態**: 完全符合
- ✅ Spec 包含 5 個明確的使用者故事
- ✅ 每個故事都有獨立的驗收標準
- ✅ 優先級標示清楚 (P0/P1/P2)
- ✅ 每個故事都可獨立測試與交付

### ✅ IV. API 模組化與職責分離 (API Modularization)
**狀態**: 完全符合
- ✅ 使用 Next.js 15 Server Actions 處理表單提交
- ✅ 使用 Zod 進行輸入驗證
- ✅ 客戶端元件僅負責顯示與呼叫 API
- ✅ 業務邏輯集中於 Server Actions

### ✅ V. 設計系統一致性 (Design System Consistency)
**狀態**: 完全符合
- ✅ 遵循 Neo-Brutalism 設計風格
- ✅ 所有元件使用 2-3px 實心黑邊框
- ✅ 硬邊陰影效果
- ✅ 點擊狀態包含位移效果

### N/A VI. 負庫存支援 (Negative Stock Support)
**狀態**: 不適用
- 本功能不涉及庫存管理

**結論 (Phase 0 前檢查)**: ✅ 所有適用原則皆符合憲章要求,無違規項目,可進入 Phase 0 研究階段。

---

**Phase 1 後重新檢查 (2026-01-01)**:

經過 Phase 0 研究與 Phase 1 設計後,重新檢視設計決策是否符合憲章:

### ✅ 技術決策符合性檢查

#### 測試框架選擇: Vitest
- ✅ 符合「簡化開發流程」目標
- ✅ 零配置,降低複雜度
- ✅ 效能優於 Jest,符合快速迭代需求

#### 資料庫設計
- ✅ 正規化設計 (tiers 與 profiles 分離)
- ✅ 外鍵約束確保參照完整性
- ✅ CHECK 約束確保業務邏輯完整性
- ✅ 為未來擴充預留彈性 (display_name, notes)

#### API 設計
- ✅ Server Actions 集中處理業務邏輯
- ✅ Zod Schema 驗證所有輸入
- ✅ 統一的錯誤處理格式
- ✅ 明確的權限檢查機制

#### UI 元件設計
- ✅ 基礎元件符合 Neo-Brutalism 規範
- ✅ 使用 CVA (class-variance-authority) 管理變體
- ✅ 元件與業務邏輯完全分離

### 📊 複雜度評估

**新增的技術元素**:
1. Supabase RLS 政策 (Row Level Security)
2. Server/Client 雙 Supabase Client
3. Middleware Session 更新機制

**複雜度合理性說明**:
- RLS 政策: 資料安全的必要機制,符合「安全性優先」原則
- 雙 Client 設計: Next.js SSR 架構的標準實踐,非過度設計
- Middleware: 路由保護的必要實作,符合憲章「權限控制」要求

**結論**: ✅ 所有設計決策皆有明確理由,無過度工程化情況,完全符合憲章要求。設計可進入實作階段。

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
vsale/
├── src/
│   ├── app/                          # Next.js 15 App Router
│   │   ├── (auth)/                   # Auth Route Group
│   │   │   ├── login/                # 前台登入 (手機號碼)
│   │   │   │   └── page.tsx
│   │   │   └── admin/
│   │   │       └── login/            # 後台登入 (Email)
│   │   │           └── page.tsx
│   │   ├── (shop)/                   # Client Protected Group
│   │   │   ├── layout.tsx            # Client Layout (Navbar/Footer)
│   │   │   └── store/                # 商品列表 (後續功能)
│   │   └── (admin)/                  # Admin Protected Group
│   │       └── admin/
│   │           ├── layout.tsx        # Admin Layout (Sidebar)
│   │           ├── dashboard/        # 管理首頁
│   │           ├── tiers/            # 會員等級管理
│   │           │   ├── page.tsx      # 等級列表
│   │           │   ├── new/          # 新增等級
│   │           │   └── [id]/edit/    # 編輯等級
│   │           └── users/            # 客戶管理
│   │               ├── page.tsx      # 客戶列表
│   │               ├── new/          # 新增客戶
│   │               └── [id]/edit/    # 編輯客戶
│   │   └── middleware.ts             # 路由保護 (Auth Guard)
│   │
│   ├── components/
│   │   ├── ui/                       # Base UI Components (Neo-Brutalism)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   └── table.tsx
│   │   ├── auth/                     # 登入相關元件
│   │   │   ├── login-form.tsx
│   │   │   └── auth-provider.tsx
│   │   └── admin/                    # 管理後台元件
│   │       ├── tier-form.tsx
│   │       ├── tier-table.tsx
│   │       ├── user-form.tsx
│   │       └── user-table.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # Supabase Browser Client
│   │   │   ├── server.ts             # Supabase Server Client (SSR)
│   │   │   └── middleware.ts         # Supabase Middleware Helper
│   │   ├── actions/                  # Server Actions
│   │   │   ├── auth.ts               # 登入/登出
│   │   │   ├── tiers.ts              # 等級 CRUD
│   │   │   └── users.ts              # 客戶 CRUD
│   │   ├── validations/              # Zod Schemas
│   │   │   ├── auth.schema.ts
│   │   │   ├── tier.schema.ts
│   │   │   └── user.schema.ts
│   │   └── utils.ts                  # 共用工具 (cn, formatters)
│   │
│   ├── types/
│   │   ├── database.types.ts         # Supabase 自動生成型別
│   │   └── index.ts                  # 自定義型別
│   │
│   └── stores/                       # Zustand (本功能不使用)
│       └── cart.ts                   # 購物車狀態 (後續功能)
│
├── public/                           # 靜態資源
│   └── images/
│
├── .specify/                         # SpecKit 配置
├── specs/                            # 功能規格文件
├── supabase/                         # Supabase 本地開發
│   └── migrations/                   # SQL Migration Files
│       └── 20260101_initial_schema.sql
│
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── README.md
```

**Structure Decision**: 採用 Next.js 15 App Router 的 Web Application 架構。使用 Route Groups 嚴格區分前後台路由,符合憲章「使用者角色優先」原則。Server Actions 集中於 `lib/actions/`,UI 元件與業務邏輯完全分離。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**無違規項目** - 本功能設計完全符合憲章所有適用原則,無需額外複雜度說明。
