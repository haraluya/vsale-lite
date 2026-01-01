# Vsale-lite - Claude Code Context

**專案名稱**: Vsale-lite
**專案類型**: B2B 批發訂貨系統
**最後更新**: 2026-01-01

## 專案概述

Vsale-lite 是一個專為批發業務設計的輕量級 B2B 訂貨系統,解決傳統 Excel/LINE 下單混亂、價格不透明的問題。採用「雙入口」設計,嚴格區分買家與賣家的操作環境,並實作等級綁定價格機制。

**核心特色**:
- 🎯 雙入口設計: 客戶使用手機號碼登入,管理員使用 Email 登入
- 💰 等級綁定價格: 不同會員等級看到不同價格
- 📱 行動優先: 客戶端優化單手操作,管理端優化桌面批量操作
- 🎨 Neo-Brutalism 設計風格: 強烈的品牌識別

---

## 技術棧

<!-- BEGIN TECH_STACK -->
### 核心框架
- **語言**: TypeScript 5.7+
- **執行環境**: Node.js v22.x LTS (Iron)
- **框架**: Next.js 15.1+ (App Router)
- **UI 函式庫**: React 19.x

### 資料庫與後端
- **資料庫**: Supabase (PostgreSQL)
- **認證**: Supabase Auth
- **SDK**: @supabase/supabase-js v2.47+, @supabase/ssr v0.5+

### 前端工具
- **樣式**: Tailwind CSS v4.0
- **UI 元件**: shadcn/ui (無頭組件基礎)
- **圖示**: Lucide React
- **狀態管理**: Zustand 5.0+ (僅購物車)
- **驗證**: Zod 3.24+

### 測試
- **測試框架**: Vitest + React Testing Library
- **測試環境**: jsdom

### 部署
- **平台**: Firebase App Hosting
- **區域**: asia-east1 (Taiwan)
<!-- END TECH_STACK -->

---

## 專案結構

```
vsale/
├── app/                          # Next.js 15 App Router
│   ├── (auth)/                   # 認證路由群組
│   │   ├── login/                # 前台登入 (手機號碼)
│   │   └── admin/login/          # 後台登入 (Email)
│   ├── (shop)/                   # 客戶保護路由群組
│   │   ├── layout.tsx            # 客戶端 Layout
│   │   └── store/                # 商品列表
│   └── (admin)/                  # 管理員保護路由群組
│       └── admin/
│           ├── dashboard/        # 管理首頁
│           ├── tiers/            # 會員等級管理
│           └── users/            # 客戶管理
├── components/
│   ├── ui/                       # 基礎 UI (Neo-Brutalism)
│   ├── auth/                     # 認證相關元件
│   └── admin/                    # 後台元件
├── lib/
│   ├── supabase/                 # Supabase Clients
│   ├── actions/                  # Server Actions
│   ├── validations/              # Zod Schemas
│   └── utils.ts                  # 工具函式
├── types/                        # TypeScript 型別定義
├── stores/                       # Zustand 狀態管理
└── supabase/migrations/          # SQL Migration Files
```

---

## 核心憲章原則

### I. 使用者角色優先
- **必須** 嚴格區分客戶 (Client) 與管理員 (Admin) 的操作環境
- 客戶端優化行動裝置,管理端優化桌面裝置
- 雙入口設計不可混淆

### II. 等級綁定價格
- **必須** 強制執行「不同人看不同價」
- 價格資料正規化儲存 (tier_id + product_id)
- 未設定價格顯示 "N/A" 並禁用加入購物車

### III. 使用者故事驅動開發
- 所有功能從使用者故事開始設計
- 每個故事可獨立測試、獨立交付
- 依優先級 (P0/P1/P2) 排序

### IV. API 模組化與職責分離
- UI 元件僅負責顯示與呼叫 API
- API/Server Actions 負責驗證、權限檢查、DB 操作
- 所有表單使用 Server Actions 處理

### V. 設計系統一致性
- 遵循 Neo-Brutalism 風格
- 所有元件使用 2-3px 實心黑邊框
- 硬邊陰影 (無模糊)
- 點擊狀態包含位移效果

### VI. 負庫存支援
- **必須** 支援負庫存下單
- 不檢查 `Stock > 0`
- 庫存可為負數 (欠貨/預購)

---

## 當前開發重點

### 功能: 001-user-tier-management (客戶與會員等級管理)
**狀態**: 規劃階段完成,準備實作

**核心功能**:
1. ✅ 會員等級 CRUD (管理員)
2. ✅ 快速開戶功能 (自動產生預設密碼)
3. ✅ 雙入口登入驗證 (手機 vs Email)
4. ✅ 權限控制 (RBAC)
5. ✅ 客戶列表與搜尋

**資料庫實體**:
- `tiers`: 會員等級表
- `profiles`: 使用者業務資料表 (關聯 auth.users)

**Server Actions**:
- `loginWithPhone()`: 前台登入
- `loginWithEmail()`: 後台登入
- `createTier()`: 建立等級
- `updateTier()`: 更新等級
- `deleteTier()`: 刪除等級 (含保護檢查)
- `createClient()`: 快速開戶 (自動產生密碼)
- `updateClient()`: 更新客戶 (主要是變更等級)
- `getClients()`: 查詢客戶列表 (含搜尋與分頁)

**文件位置**:
- 規格: `specs/001-user-tier-management/spec.md`
- 實作計畫: `specs/001-user-tier-management/plan.md`
- 資料模型: `specs/001-user-tier-management/data-model.md`
- API 合約: `specs/001-user-tier-management/contracts/server-actions.md`
- 快速上手: `specs/001-user-tier-management/quickstart.md`
- 研究紀錄: `specs/001-user-tier-management/research.md`

---

## 開發規範

### Git Commit 規則
- **必須** 使用繁體中文撰寫 commit message
- 格式: `feat: 新增客戶端購物車功能` 或 `fix: 修復價格顯示錯誤`

### 部署策略
- **必須** 以最小上傳大小部署 Firebase
- 僅部署有修改的文件
- 部署前執行 `pnpm build` 與型別檢查

### 測試策略
- P0 功能必須包含整合測試
- P1 功能應該包含單元測試
- P2 功能可選擇性測試

---

## 重要提醒

### 設計風格
採用 **Neo-Brutalism** 風格,所有 UI 元件必須符合:
- 2-3px 實心黑邊框
- 硬邊陰影: `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`
- 點擊效果: `translate-x-[2px] translate-y-[2px] shadow-none`

### 安全性
- Server Actions 必須包含權限檢查
- 所有輸入使用 Zod 驗證
- 敏感操作記錄於 `order_timelines` 或日誌

### 效能目標
- 頁面首次載入 < 2s (Mobile 4G)
- 登入驗證響應 < 500ms
- 客戶搜尋即時響應 < 300ms
- 資料庫查詢 < 100ms (p95)

---

**最後更新**: 2026-01-01
**憲章版本**: 1.0.0
**當前功能**: 001-user-tier-management (規劃完成)
