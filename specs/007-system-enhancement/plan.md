# Implementation Plan: 系統擴充功能集

**Branch**: `007-system-enhancement` | **Date**: 2026-01-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-system-enhancement/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

本功能集包含五大擴充功能，旨在提升系統的溝通效率、管理便利性與使用者體驗：

1. **訂單雙向溝通系統 (P0)**: 允許客戶與管理員在訂單處理過程中即時溝通，取代 LINE/電話溝通，資訊集中可追蹤
2. **客戶資訊完整化管理 (P0)**: 擴充客戶資料表，支援常用地址與管理員備註，提升訂單處理效率
3. **系列頁商品圖片即時預覽 (P1)**: 客戶可在系列頁快速查看商品圖片，無需跳轉詳情頁
4. **廣告輪播系統 (P1)**: 前台首頁展示促銷活動與新品，提升行銷曝光率
5. **價格管理優化 (P2)**: 支援「選擇商品」模式批次設定價格，提升管理效率

技術實現採用 Next.js 15 Server Actions、Supabase PostgreSQL、Zustand（僅限前台狀態）、Neo-Brutalism UI 設計風格。

## Technical Context

**Language/Version**: TypeScript 5.7+, Node.js v22.x LTS
**Primary Dependencies**: Next.js 15.1+ (App Router), React 19.x, @supabase/supabase-js v2.47+, Zustand 5.0+, Zod 3.24+
**Storage**: Supabase PostgreSQL (本地 Docker 開發, 雲端部署至 AWS ap-southeast-1)
**Testing**: Vitest + React Testing Library (jsdom)
**Target Platform**: Web (客戶端 Mobile First, 管理端 Desktop Optimized)
**Project Type**: Web (Next.js App Router 單一專案)
**Performance Goals**:
- 訂單留言提交響應 < 3s
- 圖片切換動畫流暢 (300ms 過渡)
- 廣告輪播自動播放無卡頓 (5s 間隔)
- 搜尋與篩選即時響應 < 300ms (debounce)
**Constraints**:
- 管理員備註必須透過 RLS 完全隔離客戶端查詢
- 圖片上傳限制 5MB (JPG/PNG/WebP)
- 留言字數限制 500 字
- 廣告最多顯示 5 則
**Scale/Scope**:
- 預計新增 3 張資料表 (order_comments, announcements, 擴充 profiles)
- 5 個主要 UI 頁面 (訂單留言、客戶編輯、系列頁圖片切換、廣告管理、價格管理優化)
- 約 10-15 個 Server Actions
- 預計影響範圍：前台 2 頁、後台 4 頁

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. 使用者角色優先 (User Role First) ✅

**檢查項目**:
- ✅ 訂單留言系統：客戶僅能在自己的訂單留言，管理員可在所有訂單留言（符合角色區分）
- ✅ 客戶管理擴充：管理員備註透過 RLS 完全隔離客戶端（符合權限分離）
- ✅ 系列頁圖片切換：僅前台客戶端功能，優化行動裝置體驗（符合裝置優化）
- ✅ 廣告輪播：前台顯示 + 後台管理分離（符合雙入口設計）
- ✅ 價格管理優化：僅後台管理端功能，優化桌面批量操作（符合裝置優化）

**結論**: 完全符合，所有功能均依角色與裝置特性設計。

---

### II. 等級綁定價格 (Tier-Based Pricing) ✅

**檢查項目**:
- ✅ 價格管理優化：使用既有 `tier_prices` 表，不修改價格機制
- ✅ 零售價格透過 `products.retail_price` 管理，等級價格透過 `tier_prices` 管理
- ⚠️ 新功能不涉及價格機制變更，僅優化管理介面

**結論**: 完全符合，不影響既有價格架構。

---

### III. 使用者故事驅動開發 (User Story Driven Development) ✅

**檢查項目**:
- ✅ Spec 文件包含 5 個明確的使用者故事
- ✅ 每個故事包含驗收場景 (Acceptance Scenarios)
- ✅ 優先級標示清楚 (P0: 2 個, P1: 2 個, P2: 1 個)
- ✅ 每個故事可獨立測試與交付

**結論**: 完全符合，遵循使用者故事驅動開發流程。

---

### IV. API 模組化與職責分離 (API Modularization) ✅

**檢查項目**:
- ✅ 所有資料操作透過 Server Actions 執行
- ✅ 訂單留言、客戶管理、廣告管理均需 Server Actions
- ✅ 前台圖片切換為純前端互動，無需 Server Actions（符合職責分離）
- ✅ 所有 Server Actions 必須包含 Zod 驗證與權限檢查

**結論**: 完全符合，UI 元件僅負責顯示與呼叫 API。

---

### V. 設計系統一致性 (Design System Consistency) ✅

**檢查項目**:
- ✅ 所有新增 UI 元件遵循 Neo-Brutalism 設計風格
- ✅ 訂單留言氣泡、廣告輪播按鈕、價格表格均使用 2-3px 黑邊框
- ✅ 圖片切換使用淡入淡出動畫 (300ms)，符合互動一致性
- ✅ 不引入外部 UI 元件庫（使用 shadcn/ui 基礎）

**結論**: 完全符合，視覺語言與既有系統一致。

---

### VI. 負庫存支援 (Negative Stock Support) N/A

**檢查項目**:
- N/A 本功能集不涉及庫存邏輯變更

**結論**: 不適用，無衝突。

---

### VII. 使用者體驗優先 (User Experience First) ✅

**檢查項目**:
- ✅ 訂單留言系統：提升溝通效率，減少 LINE/電話溝通（符合 UX 優化）
- ✅ 系列頁圖片切換：減少頁面跳轉，提升瀏覽效率（符合快捷操作）
- ✅ 廣告輪播：使用色彩與動畫引導使用者注意力（符合視覺引導）
- ✅ 價格管理優化：提供「選擇商品」模式，減少操作步驟（符合操作效率）
- ✅ 客戶管理擴充：在訂單頁快速顯示地址與備註，減少重複查詢（符合快捷操作）

**結論**: 完全符合，所有功能均以提升 UX 為目標。

---

### 總結：憲章符合性 ✅ PASS

**所有檢查項目均通過**，本功能集完全符合專案憲章要求，無需在 Complexity Tracking 記錄任何違反項目。

---

## 設計後驗證：Constitution Check (Phase 1 完成後)

**驗證時間**: 2026-01-03（Phase 1 完成後）

### 資料模型設計驗證 ✅

**檢查項目**:
- ✅ `order_timelines` 表擴充：保持既有架構，僅新增 ENUM 值（符合最小化原則）
- ✅ `profiles` 表擴充：新增欄位不影響既有功能，RLS 策略完整隔離 `admin_notes`
- ✅ `announcements` 表設計：欄位簡潔，索引合理，RLS 策略完整
- ✅ 所有 Migration 腳本使用 `IF NOT EXISTS` 與 `DROP IF EXISTS`，避免重複執行錯誤

**結論**: 資料模型設計符合憲章要求，無過度工程化。

---

### API 合約設計驗證 ✅

**檢查項目**:
- ✅ 所有 Server Actions 包含 Zod Schema 驗證
- ✅ 所有 Server Actions 使用 `ActionResult<T>` 統一回傳格式
- ✅ 客戶端與管理端 API 明確分離（如 `getClientProfile` vs `getAdminClientProfile`）
- ✅ 權限檢查邏輯清晰（透過 `checkAuth()` 與 RLS 雙重控制）

**結論**: API 合約設計符合職責分離原則，無混淆角色的 API。

---

### UI 設計驗證 ✅

**檢查項目**:
- ✅ 訂單留言：氣泡式設計（客戶左灰、管理員右藍），符合 Neo-Brutalism 風格
- ✅ 廣告輪播：自行實作，不引入第三方套件，符合最小化原則
- ✅ 圖片切換：使用 CSS Transition，無額外依賴
- ✅ 價格管理：使用標籤切換，符合管理端桌面優化

**結論**: UI 設計符合使用者體驗優先與設計系統一致性原則。

---

### 安全性設計驗證 ✅

**檢查項目**:
- ✅ 管理員備註：RLS 策略 + Server Actions 雙重隔離，客戶端無法查詢
- ✅ 訂單留言：RLS 策略限制客戶僅能在自己的訂單留言
- ✅ 圖片上傳：Server Actions 包含格式與大小驗證
- ✅ 廣告管理：僅管理員可執行 CRUD 操作

**結論**: 安全性設計完整，符合憲章要求。

---

### 最終驗證結果：✅ 完全符合憲章

**Phase 1 設計完成後再次驗證**，所有檢查項目均通過，無需在 Complexity Tracking 記錄任何違反項目。可進入 Phase 2（任務分解與實作）。

## Project Structure

### Documentation (this feature)

```text
specs/007-system-enhancement/
├── plan.md              # ✅ 本檔案（實作計畫）
├── spec.md              # ✅ 功能規格（使用者故事與驗收標準）
├── research.md          # ✅ Phase 0 技術研究輸出
├── data-model.md        # ✅ Phase 1 資料模型設計輸出
├── quickstart.md        # ✅ Phase 1 快速上手指南輸出
├── contracts/           # ✅ Phase 1 API 合約定義輸出
│   ├── order-comments.ts        # 訂單留言 API 合約
│   ├── client-management.ts     # 客戶管理 API 合約
│   ├── announcements.ts         # 廣告輪播 API 合約
│   └── pricing-management.ts    # 價格管理 API 合約
└── tasks.md             # ⏳ Phase 2 輸出（尚未建立，需執行 /speckit.tasks）
```

---

### Source Code (repository root)

**專案類型**: Web Application (Next.js 15 App Router 單一專案)

```text
vsale/
├── app/                          # Next.js 15 App Router
│   ├── (auth)/                   # 認證路由群組
│   │   ├── login/                # 前台登入（手機號碼）
│   │   └── admin/login/          # 後台登入（Email）
│   │
│   ├── (shop)/                   # 客戶保護路由群組
│   │   ├── layout.tsx            # 客戶端 Layout
│   │   ├── store/                # 商品列表
│   │   ├── series/[id]/          # 系列詳情頁（✨ 新增圖片切換功能）
│   │   └── orders/[id]/          # 訂單詳情頁（✨ 新增留言系統）
│   │
│   └── (admin)/                  # 管理員保護路由群組
│       └── admin/
│           ├── dashboard/        # 管理首頁（✨ 可能新增廣告管理入口）
│           ├── users/            # 客戶管理（✨ 擴充地址與備註欄位）
│           │   ├── page.tsx      # 客戶列表（顯示地址與備註摘要）
│           │   └── [id]/edit/    # 客戶編輯頁（新增地址與備註欄位）
│           ├── orders/[id]/      # 訂單詳情頁（✨ 新增留言系統）
│           ├── announcements/    # ✨ 廣告管理（NEW）
│           │   ├── page.tsx      # 廣告列表與管理
│           │   └── [id]/edit/    # 廣告編輯頁
│           └── pricing/          # ✨ 價格管理（擴充「選擇商品」模式）
│               └── page.tsx      # 新增標籤切換 UI
│
├── components/
│   ├── ui/                       # 基礎 UI（shadcn/ui）
│   ├── announcements/            # ✨ 廣告輪播元件（NEW）
│   │   └── AnnouncementCarousel.tsx
│   ├── orders/                   # 訂單相關元件
│   │   └── OrderTimeline.tsx     # ✨ 訂單時間軸（擴充留言顯示）
│   └── admin/
│       ├── clients/              # 客戶管理元件
│       │   └── ClientEditForm.tsx # ✨ 擴充地址與備註欄位
│       └── pricing/              # 價格管理元件
│           └── ProductPricingForm.tsx # ✨ 新增商品價格表單（NEW）
│
├── lib/
│   ├── actions/                  # Server Actions
│   │   ├── clients.ts            # ✨ 擴充客戶管理 API
│   │   ├── orders.ts             # ✨ 擴充訂單留言 API
│   │   ├── announcements.ts      # ✨ 廣告管理 API（NEW）
│   │   └── pricing.ts            # ✨ 擴充價格管理 API
│   │
│   ├── validations/              # Zod Schemas
│   │   ├── client.schema.ts      # ✨ 擴充客戶驗證
│   │   ├── order.schema.ts       # ✨ 擴充訂單留言驗證
│   │   └── announcement.schema.ts # ✨ 廣告驗證（NEW）
│   │
│   └── supabase/                 # Supabase Clients
│       ├── server.ts             # Server Component Client
│       └── client.ts             # Client Component Client
│
├── supabase/
│   └── migrations/
│       └── 20260103_system_enhancement.sql # ✨ 本功能集 Migration（NEW）
│
└── types/
    └── index.ts                  # ✨ 擴充型別定義（OrderComment, Announcement 等）
```

**結構決策**:
- 採用 Next.js App Router 單一專案架構，無需分離 frontend/backend
- 所有資料操作透過 Server Actions 執行，符合專案憲章
- 新增功能均為既有架構的**擴充**，不新增獨立模組或重構既有架構
- 廣告輪播元件為唯一新增的獨立功能模組，其餘為既有功能的 UI/API 擴充

---

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**本功能集無憲章違反項目**，所有檢查項目均通過，無需記錄。
