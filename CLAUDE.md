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

---

## 常用開發指令

### 開發與建置
```bash
pnpm dev              # 啟動開發伺服器 (http://localhost:3000)
pnpm build            # 建置生產環境
pnpm start            # 啟動生產伺服器
pnpm type-check       # TypeScript 型別檢查 (建置前必須執行)
pnpm lint             # ESLint 檢查
```

### 測試
```bash
pnpm test             # 執行所有測試 (Vitest)
pnpm test:ui          # 啟動 Vitest UI 介面
```

### Supabase Migration
```bash
# 在 Supabase SQL Editor 中執行 Migration 檔案
# 檔案位置: supabase/migrations/*.sql
# 執行順序: 依檔案名稱時間戳排序 (20260101, 20260102...)
```

---

## 架構設計要點

### Server Actions 模式
所有資料操作必須透過 Server Actions，不直接在 Client Component 呼叫 Supabase：

```typescript
// ✅ 正確：在 Server Action 中操作資料庫
// lib/actions/products.ts
export async function getProducts() {
  const supabase = await createClient() // Server Client
  const { data } = await supabase.from('products').select()
  return data
}

// ❌ 錯誤：在 Client Component 直接呼叫
'use client'
const supabase = createClient() // 不應該在客戶端直接操作
```

**Server Actions 必備步驟**:
1. 使用 `'use server'` 標記
2. 呼叫 `checkAuth()` 進行權限驗證（lib/actions/helpers.ts）
3. 使用 Zod Schema 驗證輸入（lib/validations/）
4. 回傳 `ActionResult<T>` 型別
5. 成功後執行 `revalidatePath()` 更新快取

### Supabase Client 使用規則
- **Server Component / Server Action**: 使用 `createClient()` from `lib/supabase/server.ts`
- **Client Component**: 使用 `createClient()` from `lib/supabase/client.ts`（僅用於認證，不直接操作資料）
- **Middleware**: 使用 `createServerClient()` from `@supabase/ssr`

### 路由保護機制
Middleware (middleware.ts) 自動檢查：
- `/admin/*` 路由：必須是 `role = 'admin'`
- `/store/*` 路由：必須已登入（任何角色）
- 管理員可訪問所有路由（「上帝視角」）
- 未登入自動導向對應的登入頁

### 認證流程
**前台登入** (`/login`):
- 使用手機號碼 + 密碼
- Server Action: `loginWithPhone(phone, password)`
- 成功後導向 `/store`

**後台登入** (`/admin/login`):
- 使用 Email + 密碼
- Server Action: `loginWithEmail(email, password)`
- 成功後導向 `/admin/dashboard`

### 資料庫關聯規則
- **刪除保護**: 使用 `ON DELETE RESTRICT`（如 categories → products）
- **級聯刪除**: 使用 `ON DELETE CASCADE`（如 tiers → tier_prices）
- **軟刪除**: 使用 `status` 欄位（active/inactive），不實際刪除記錄

### 圖片上傳流程
1. 使用 `uploadProductImage(product_id, file)` Server Action
2. 檔案驗證：格式（JPG/PNG/WebP）、大小（5MB）
3. 上傳至 Supabase Storage: `products/{product_id}/main.{ext}`
4. 覆寫模式（`upsert: true`）
5. 更新 `products.image_url` 欄位

### RLS (Row Level Security) 策略
所有資料表都啟用 RLS，策略如下：
- **客戶**: 僅能讀取 `status = 'active'` 的資料
- **管理員**: 可讀取所有資料、可執行所有操作
- **價格表**: 所有已認證用戶可讀，Server Action 負責過濾等級

---

## 型別定義規範

### ActionResult 回傳格式
```typescript
// 成功
{ success: true, data?: T, message?: string }

// 失敗
{ success: false, errors?: Record<string, string[]>, message: string }
```

### 資料庫實體型別
所有資料表型別定義於 `types/index.ts`：
- `Tier`: 會員等級
- `Profile`: 使用者業務資料
- `Client`: 客戶（含等級資訊）
- `Category`: 商品分類
- `Product`: 商品
- `Series`: 系列（003 新增）
- `TierPrice`: 等級價格（003 新增）

### Zod Schema 位置
所有驗證 Schema 位於 `lib/validations/`：
- `user.schema.ts`: 使用者相關（登入、開戶）
- `tier.schema.ts`: 會員等級
- `category.schema.ts`: 分類
- `product.schema.ts`: 商品

---

## 當前開發狀態

### 已完成功能（已合併到 master）
1. ✅ **001-user-tier-management**: 會員等級與客戶管理
   - 雙入口登入、快速開戶、客戶列表、等級 CRUD
2. ✅ **002-product-management**: 商品與分類管理
   - 分類 CRUD、商品 CRUD、圖片上傳、前台商品瀏覽

### 進行中功能（003-series-and-pricing 分支）
**狀態**: 規劃完成，開始實作
**目標**: 三層階層架構（分類 > 系列 > 產品）+ 等級價格機制

**核心變更**:
1. 新增 `series` 表（系列），商品改為關聯系列而非直接關聯分類
2. 新增 `tier_prices` 表（等級價格），儲存每個商品 × 每個等級的價格
3. 商品新增 `retail_price`（原價）與 `stock_status`（庫存狀態）欄位
4. 商品編號自動產生（分類代碼 + 流水號，如 DRK-0001）
5. 前台根據用戶等級顯示對應價格

**規格文件**: `specs/003-series-and-pricing/spec.md`

---

## 重要開發注意事項

### 負庫存處理
- **必須** 支援負庫存（憲章 VI）
- 驗證時不檢查 `stock >= 0`
- 前台顯示邏輯：
  - `stock > 0`: 顯示「庫存: X」（綠色）
  - `stock === 0`: 顯示「缺貨中」（黃色）
  - `stock < 0`: 顯示「欠貨: X（可預購）」（紅色）

### 價格機制（003 實作中）
- 商品有「原價」（retail_price）用於顯示折扣力度
- 每個商品 × 每個等級 = 一個價格（tier_prices 表）
- 前台顯示：「原價 $60  您的價格 $30（批發）」
- 若未設定該等級價格，顯示「價格未設定」並禁用加入購物車

### Neo-Brutalism 設計實作
所有 UI 元件必須遵循：
```tsx
// 卡片樣式
className="rounded-none border-3 border-black bg-white shadow-neo"

// 陰影定義（tailwind.config.ts）
shadow-neo: '4px 4px 0px 0px rgba(0,0,0,1)'

// 點擊效果
hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none
```

### Git Commit 規範
```bash
# 必須使用繁體中文
feat: 新增商品系列管理功能
fix: 修復價格顯示錯誤
docs: 更新資料庫 Migration 文件
refactor: 重構等級價格查詢邏輯

# Commit 結尾（Claude Code 自動產生）
🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

**最後更新**: 2026-01-02
**憲章版本**: 1.0.0
**當前分支**: 003-series-and-pricing (進行中)
