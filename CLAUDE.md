# Vsale-lite - Claude Code Context

**專案名稱**: Vsale-lite
**專案類型**: B2B 批發訂貨系統
**最後更新**: 2026-01-30

---

## ⚠️ 重要：Supabase 生產環境操作協議

**本專案使用線上 Supabase 生產資料庫，所有操作必須極度謹慎**

**核心原則（生產環境）**：
1. ⚠️ **每次操作都影響生產資料** - 所有 Migration 直接在線上資料庫執行
2. ❌ **絕對禁止** `supabase db reset` 或 `pnpm db:reset` - 會清空所有生產資料
3. ✅ **執行前必須備份** - 使用雲端備份系統手動備份
4. ✅ **僅使用增量式 Migration** - 避免破壞性變更（DROP、TRUNCATE）
5. 🔍 **執行前檢查** - 使用 `pnpm db:diff` 確認變更內容

**允許的操作**:
- ✅ `supabase migration new <name>` - 建立新 Migration
- ✅ `pnpm db:migrate` / `supabase db push` - 推送 Migration（執行前必須備份）
- ✅ `supabase migration list` - 查看 Migration 狀態
- ✅ `pnpm db:diff` - 檢查資料庫差異

**⚠️ 多站點 Migration 同步規則**：
- 🔴 **每次資料庫修改都必須同步到站點 2 和站點 3**
- 📋 **必須提供手動執行 SQL 指令**（Dashboard SQL Editor 或 CLI）
- ✅ 站點 2 Dashboard：https://supabase.com/dashboard/project/rdyvmgomjdglflrcfijs/sql/new
- ✅ 站點 3 Dashboard：https://supabase.com/dashboard/project/dewhcpfzrzewgknaqzwy/sql/new

詳見：[資料庫安全協議](docs/DATABASE_SAFETY_PROTOCOL.md)

---

## 🔄 站點資料遷移（多站點管理）

**本專案支援多站點部署（目前管理 3 個站點），使用智慧型 API 遷移方式避免 SQL 檔案過大問題**

### 站點概覽

- **站點 1 (主站)**: `qwovavytryvgchcowjof` - 生產環境主要站點（新加坡）
- **站點 2**: `rdyvmgomjdglflrcfijs` - 第二營運站點（新加坡）
- **站點 3**: `dewhcpfzrzewgknaqzwy` - 第三營運站點（孟買）
- **站點 4 (vsale-vincent)**: `tlgdbvhsnlelwymrircy` - 第四營運站點（新加坡，空白站點）

### 快速指令（站點 2）

```bash
# 1. 比較兩個站點的資料差異
pnpm site2:compare

# 2. 執行遷移（從主站複製到站點二）
pnpm site2:migrate
```

### 站點 3 資訊

站點 3 的完整設定資訊與連線憑證記錄在 [SITE_CREDENTIALS.md](docs/SITE_CREDENTIALS.md)。

**站點 3 待執行任務**:
1. ✅ 填寫站點資訊（已完成）
2. ⏳ 設定環境變數 `.env.local`
3. ⏳ 執行 Migration 同步（3 個待推送的 Migration）
4. ⏳ 執行資料遷移

### 為什麼需要這個功能？

**問題**: 使用 `pg_dump` 產生的 SQL 備份檔案過大（>10MB），導致：
- ❌ 觸發 Prompt 長度限制
- ❌ 需要手動分割檔案
- ❌ 處理複雜且容易出錯

**解決方案**: 使用 Supabase JavaScript API 直接傳輸資料
- ✅ 無需中間 SQL 檔案
- ✅ 批次處理（每次 100 筆）
- ✅ 自動處理外鍵依賴順序
- ✅ 即時進度顯示
- ✅ 失敗自動中斷

### 遷移的資料表

依外鍵依賴順序自動處理：
1. `tiers` - 會員等級
2. `categories` - 商品分類
3. `series` - 商品系列
4. `products` - 商品
5. `tier_prices` - 等級價格
6. `coupons` - 優惠券
7. `coupon_tier_restrictions` - 優惠券等級限制
8. `coupon_series_restrictions` - 優惠券系列限制
9. `combo_deals` - 組合優惠
10. `combo_deal_series` - 組合優惠系列關聯
11. `combo_deal_tiers` - 組合優惠等級限制
12. `combo_deal_mix_match_config` - 組合優惠任選配置
13. `coupon_combo_restrictions` - 優惠券組合優惠限制
14. `system_settings` - 系統設定

### 不遷移的資料（站點獨立）

- `profiles` - 使用者帳號
- `admin_users` - 管理員帳號
- `orders` - 訂單
- `order_items` - 訂單明細
- `order_combo_deal_items` - 訂單組合優惠項目
- `user_coupons` - 使用者優惠券
- `audit_logs` - 操作日誌

### 環境變數設定

在 `.env.local` 新增站點配置：

```env
# 站點二 Supabase 配置（用於資料遷移）
NEXT_PUBLIC_SUPABASE_URL_SITE2=https://rdyvmgomjdglflrcfijs.supabase.co
SUPABASE_SERVICE_ROLE_KEY_SITE2=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkeXZtZ29tamRnbGZscmNmaWpzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTAwNTk2MiwiZXhwIjoyMDg0NTgxOTYyfQ.MzbZsoLp2RdHJj8qSuwnZ3FsQGuIBCAO8ExmC5YyUTE

# 站點三 Supabase 配置（用於資料遷移）
NEXT_PUBLIC_SUPABASE_URL_SITE3=https://dewhcpfzrzewgknaqzwy.supabase.co
SUPABASE_SERVICE_ROLE_KEY_SITE3=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRld2hjcGZ6cnpld2drbmFxend5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTA4MDg5NiwiZXhwIjoyMDg0NjU2ODk2fQ.XDa2SNZLtIMyT4dmlCmKWzIP9RDJwAirruPUyzueO8s
```

**重要**: 必須使用 `service_role` key（非 `anon` key）才有足夠權限。

### 執行步驟（站點 2）

```bash
# 步驟 1: 確認站點二已完成 Migration
supabase link --project-ref rdyvmgomjdglflrcfijs
supabase db push

# 步驟 2: 比較資料差異
pnpm site2:compare

# 步驟 3: 執行遷移（會清空站點二並複製主站資料）
pnpm site2:migrate

# 步驟 4: 驗證結果
pnpm site2:compare  # 應該顯示所有資料表一致
```

### 執行步驟（站點 3）

```bash
# 步驟 1: 連結站點三並推送 Migration
supabase link --project-ref dewhcpfzrzewgknaqzwy
supabase db push

# 步驟 2: 手動執行資料遷移（目前無自動化腳本）
# 參考站點 2 的遷移腳本建立站點 3 版本

# 步驟 3: 驗證結果
# 使用 Supabase Dashboard 確認資料完整性
```

### 詳細文件

- [快速設定指南](docs/SITE2_QUICK_SETUP.md) - 5 分鐘完成設定
- [完整遷移指南](docs/SITE2_MIGRATION_GUIDE.md) - 技術細節與疑難排解
- [站點資訊](docs/SITE_CREDENTIALS.md) - 多站點連線資訊

---

## 專案概述

Vsale-lite 是一個專為批發業務設計的輕量級 B2B 訂貨系統，解決傳統 Excel/LINE 下單混亂、價格不透明的問題。採用「雙入口」設計，嚴格區分買家與賣家的操作環境，並實作等級綁定價格機制。

**核心特色**:
- 🎯 雙入口設計: 客戶使用手機號碼登入，管理員使用 Email 登入
- 💰 等級綁定價格: 不同會員等級看到不同價格
- 📱 行動優先: 客戶端優化單手操作，管理端優化桌面批量操作
- 🎨 Clean Commerce 設計風格: 現代簡約商務（支援多主題切換）

---

## 技術棧

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
- **平台**: Vercel (Serverless)
- **區域**: sin1 (Singapore - 最接近台灣)
- **自動部署**: GitHub Actions (push to master)
- **備份系統**: Supabase 原生備份 + Google Cloud Storage

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
- 客戶端優化行動裝置 (單手操作、觸控友善)
- 管理端響應式設計 (手機應急查看 / 桌面批量操作)
- 雙入口設計不可混淆

### II. 等級綁定價格
- **必須** 強制執行「不同人看不同價」
- 價格資料正規化儲存 (tier_id + product_id)
- **核心原則**：未設定等級價格時，預設使用零售價（retail_price）
  - 所有商品必須有零售價作為基準價格
  - 等級價格為選填（tier_prices 表），未設定時自動回退到零售價
  - 前台顯示：「零售價 $60」或「您的價格 $30（批發）」
  - 購物車與組合優惠邏輯：沒有等級價格 = 使用零售價

### III. 使用者故事驅動開發
- 所有功能從使用者故事開始設計
- 每個故事可獨立測試、獨立交付
- 依優先級 (P0/P1/P2) 排序

### IV. API 模組化與職責分離
- UI 元件僅負責顯示與呼叫 API
- API/Server Actions 負責驗證、權限檢查、DB 操作
- 所有表單使用 Server Actions 處理

### V. 設計系統一致性
- 預設主題: Clean Commerce（現代簡約商務）
- 支援多主題切換: Clean Commerce / Neo-Brutalism / Warm Industrial / Soft Depth
- 主題透過 CSS 變數驅動: `--theme-border-width`, `--theme-radius`, `--shadow-neo` 等
- 邊框: `border-theme`（主題感知寬度）
- 圓角: `rounded-theme` / `rounded-theme-sm` / `rounded-theme-lg`
- 陰影: `shadow-neo-sm`（CSS 變數自動適應主題）
- 互動: `hover:-translate-y-0.5 hover:shadow-theme-hover` + `active:scale-[0.98]`
- 使用設計 Token 系統確保一致性 (`lib/design-tokens.ts`)

### VI. 負庫存支援
- **必須** 支援負庫存下單
- 不檢查 `Stock > 0`
- 庫存可為負數 (欠貨/預購)

### VII. 響應式設計規範
- **必須** 遵循 Mobile-First 策略 (手機 → 平板 → 桌面)
- **必須** 使用設計 Token 系統 (`lib/design-tokens.ts`)
- **必須** 確保觸控目標 >= 44px × 44px (WCAG 2.1 AA 標準)
- **必須** 使用 Next.js Image `sizes` 屬性優化圖片載入
- 響應式斷點: `md: 768px` (平板) / `lg: 1024px` (桌面)
- 後台 Sidebar: 手機隱藏 (Sheet) / 平板收縮 (w-16) / 桌面展開 (w-64)
- 後台表格: 手機卡片視圖 / 桌面完整表格
- 設計 Token 優先於硬編碼樣式

### VIII. 統一對話框系統
- **必須** 使用統一對話框 Hook 替代原生瀏覽器對話框
- **絕對禁止** 使用 `window.alert()`、`window.confirm()`、`window.prompt()`
- ESLint 規則已配置，違反將導致錯誤

**使用方式**:
```typescript
'use client'
import { useAlert, useConfirm, usePrompt } from '@/lib/contexts/dialog-context'

// Alert - 通知型對話框
const alert = useAlert()
await alert({ title: '成功', message: '資料已儲存', variant: 'success' })

// Confirm - 確認型對話框
const confirm = useConfirm()
const confirmed = await confirm({
  title: '確認刪除',
  description: '此操作無法復原',
  variant: 'danger'
})

// Prompt - 輸入型對話框
const prompt = usePrompt()
const value = await prompt({
  title: '請輸入名稱',
  placeholder: '名稱',
  variant: 'info'
})
```

**變體 (variant)**:
- `success` - 綠色（成功操作）
- `error` - 紅色（錯誤訊息）
- `warning` - 黃色（警告）
- `info` - 藍色（資訊，預設）
- `danger` - 紅色（危險操作，用於 confirm）

**詳見**: `specs/013-unified-dialog/quickstart.md`

### IX. 組合優惠與優惠券共用規則

#### 核心原則
- **必須** 支援「各選」與「任選」兩種模式
- **必須** 使用快照機制保存訂單時刻的組合優惠資訊
- **必須** 支援等級限制（不同會員等級看到不同組合優惠）
- **必須** 組合優惠商品與普通商品一樣扣減庫存

#### 優惠券與組合優惠共用規則
- **必須** 實施互斥設定：優惠券允許組合優惠時，不可設定系列限制
- **必須** 優惠券折扣作用於總金額（包含組合優惠優惠後價格）
- 折扣基準計算：
  ```
  IF 優惠券允許組合優惠 AND 無系列限制 THEN
    折扣基準 = 普通商品總價 + 組合優惠優惠價
  ELSE IF 優惠券有系列限制 THEN
    折扣基準 = 符合系列的普通商品總價
  ELSE
    折扣基準 = 普通商品總價
  ```
- 運費計算基準：折扣前金額（普通商品 + 組合優惠優惠價）

#### 資料完整性
- 組合優惠刪除後，歷史訂單仍可完整顯示（透過快照）
- 快照包含：組合優惠名稱、模式、系列資訊、選購明細、價格計算

#### 購物車整合
- 組合優惠與普通商品可混合購物
- localStorage 持久化（版本化，支援遷移）
- 商品變更時自動重新驗證優惠券適用性

#### 訂單處理與庫存
- 訂單建立時建立完整快照
- 支援純組合優惠訂單（無普通商品）
- 級聯刪除訂單時自動刪除組合優惠項目
- **訂單標記為「已出貨」時**：扣減組合優惠中的商品庫存
- **訂單取消時**：回補組合優惠中的商品庫存（僅已出貨訂單）

#### 顯示規範
- 購物車：黃色背景（bg-yellow-50）區分一般商品
- 系列標籤：使用顏色編碼（紫/藍/綠/橙/粉/青）
- 倒數計時器：活動結束前 24 小時顯示
- 前後台訂單詳情：完整顯示組合優惠項目與折扣明細

---

## 已完成核心功能

### 功能模組清單
1. ✅ **會員等級與客戶管理** - 雙入口登入、快速開戶、等級 CRUD、RLS 權限控制
2. ✅ **商品與分類管理** - 分類/商品 CRUD、圖片上傳、前台商品瀏覽
3. ✅ **系列與等級價格管理** - 三層階層架構、等級綁定價格、批次價格設定
4. ✅ **購物車與訂單系統** - Zustand 狀態管理、訂單建立、訂單處理、操作歷史追蹤
5. ✅ **後台系統管理** - 管理員帳號管理、操作日誌系統、系統設定 API
6. ✅ **Excel 匯入匯出** - 系列與商品批次匯入匯出、範本下載、雙階段匯入驗證
7. ✅ **優惠券系統** - 客戶領取使用、管理員 CRUD、使用限制驗證、訂單快照
8. ✅ **運費與訂單修改** - 運費自動計算、滿額免運、訂單狀態流程、訂單修改功能
9. ✅ **統一對話框系統** - 替換原生對話框、Neo-Brutalism 設計、ESLint 規則
10. ✅ **專案健康檢查系統** - 七大領域檢查、並行執行、報告產生
11. ✅ **組合優惠系統** - 各選/任選模式、後台管理、前台展示、購物車整合、訂單快照、廣告連結

### 核心資料模型
- **認證與會員**: `tiers`, `profiles`
- **商品目錄**: `categories`, `series`, `products`, `tier_prices`
- **訂單系統**: `orders`, `order_items`, `order_timelines`, `order_custom_fees`
- **優惠券**: `coupons`, `user_coupons`, `coupon_tier_restrictions`, `coupon_series_restrictions`, `order_coupons`
- **組合優惠**: `combo_deals`, `combo_deal_series`, `combo_deal_tiers`, `combo_deal_mix_match_config`, `order_combo_deal_items`, `coupon_combo_restrictions`
- **系統管理**: `admin_users`, `audit_logs`, `system_settings`

詳細資料模型請參考：`supabase/migrations/README.md`

---

## 開發規範

### Git Commit 規則
- **必須** 使用繁體中文撰寫 commit message
- 格式: `feat: 新增客戶端購物車功能` 或 `fix: 修復價格顯示錯誤`

### 部署策略
- **必須** 遵循 Vercel 自動部署流程（GitHub Actions）
- 部署前自動執行 `pnpm build`、型別檢查與 ESLint
- 僅部署有修改的文件（Vercel 自動最佳化）
- 詳細部署指南參見 [DEPLOYMENT.md](DEPLOYMENT.md)

### 測試策略
- P0 功能必須包含整合測試
- P1 功能應該包含單元測試
- P2 功能可選擇性測試

---

## Migration 工作流程（生產環境）⭐

**⚠️ 重要：本專案使用線上 Supabase 生產資料庫，所有操作必須謹慎執行**

### 標準 Migration 流程

```bash
# 1. 建立新 Migration
supabase migration new add_feature_name

# 2. 編輯 Migration 檔案
# 檔案位置: supabase/migrations/YYYYMMDD_add_feature_name.sql

# 3. 推送到生產環境（會直接影響線上資料）⭐
pnpm db:migrate
# 或
supabase db push
```

### 生產環境操作注意事項
- ⚠️ **每次 Migration 都會直接影響線上資料庫**
- ✅ **執行前必須備份**（使用雲端備份系統）
- ✅ **必須先在測試分支驗證**
- ✅ **增量式更新**（避免破壞性變更）
- ❌ **絕對禁止**使用 `supabase db reset` 或 `pnpm db:reset`

### 完整文件參考
- 📖 **安全 Migration 指南**: [`docs/SAFE_MIGRATION_GUIDE.md`](docs/SAFE_MIGRATION_GUIDE.md)
- 🚀 **快速參考**: [`docs/BACKUP_RESTORE_CHEATSHEET.md`](docs/BACKUP_RESTORE_CHEATSHEET.md)
- ⚡ **安全協議**: [`docs/DATABASE_SAFETY_PROTOCOL.md`](docs/DATABASE_SAFETY_PROTOCOL.md)

### Migration 黃金守則
0. **🛡️ 資料庫安全至上**: 絕對禁止在生產環境執行 `supabase db reset`
1. ✅ **優先使用新增操作**（ADD COLUMN, CREATE TABLE, CREATE INDEX）
2. ⚠️ **避免刪除操作**（DROP COLUMN, DROP TABLE）- 先重新命名，保留 30 天
3. 🛡️ **部署前必須備份**（使用雲端備份系統手動備份）
4. 🔄 **複雜變更分階段執行**（新增 → 遷移 → 清理）
5. 📊 **準備回滾計畫**（備份檔案或反向 Migration）

### Migration 範本位置
- `supabase/migrations/_TEMPLATE_safe_migration.sql` - 安全新增功能範本
- `supabase/migrations/_CHECKLIST.md` - 部署前檢查清單

### Migration 檔案架構

專案已將 Migration 整合為 8 個功能模組化檔案：

| 模組 | 檔案名稱 | 功能說明 |
|------|---------|----------|
| **M1** | `20260107100000_core_auth_and_tiers.sql` | 核心認證與會員等級 |
| **M2** | `20260107110000_product_catalog_system.sql` | 商品目錄系統 |
| **M3** | `20260107120000_orders_and_workflow.sql` | 訂單與工作流程 |
| **M4** | `20260107130000_shipping_and_custom_fees.sql` | 運費與自訂費用 |
| **M5** | `20260107140000_coupon_system.sql` | 優惠券系統 |
| **M6** | `20260107150000_system_admin_and_audit.sql` | 系統管理與稽核 |
| **M7** | `20260107160000_indexes_and_performance.sql` | 索引與效能優化 |
| **M8** | `20260107170000_rls_policies.sql` | RLS 策略 |

詳見：`supabase/migrations/README.md`

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
- `Series`: 系列
- `TierPrice`: 等級價格

### Zod Schema 位置
所有驗證 Schema 位於 `lib/validations/`：
- `user.schema.ts`: 使用者相關（登入、開戶）
- `tier.schema.ts`: 會員等級
- `category.schema.ts`: 分類
- `product.schema.ts`: 商品

---

## 重要開發注意事項

### 負庫存處理
- **必須** 支援負庫存（憲章 VI）
- 驗證時不檢查 `stock >= 0`
- 前台顯示邏輯：
  - `stock > 0`: 顯示「庫存: X」（綠色）
  - `stock === 0`: 顯示「缺貨中」（黃色）
  - `stock < 0`: 顯示「欠貨: X（可預購）」（紅色）

### 價格機制
- 商品有「零售價」（retail_price）作為基準價格（必填）
- 每個商品 × 每個等級 = 一個等級價格（tier_prices 表，選填）
- **價格回退機制**：未設定等級價格時，自動使用零售價
- 前台顯示邏輯：
  - 有等級價格：「零售價 $60  您的價格 $30（批發）」
  - 無等級價格：「零售價 $60」（使用零售價）
- 支援批次價格設定（依系列或商品批量設定）

### Clean Commerce 設計實作
所有 UI 元件遵循主題感知樣式（透過 CSS 變數自動適應主題）：
```tsx
// 卡片樣式（使用 .card-neo 類別或手動組合）
className="rounded-theme border-theme bg-surface shadow-neo-sm"

// 主題 CSS 變數（在 globals.css :root 定義）
--theme-radius: 12px;
--theme-border-width: 1px;
--shadow-neo: 0 1px 3px 0 rgba(0,0,0,0.1);

// 互動效果
hover:-translate-y-0.5 hover:shadow-theme-hover active:scale-[0.98]
```

**可用的主題工具類別**:
- `rounded-theme` / `rounded-theme-sm` / `rounded-theme-lg` — 主題感知圓角
- `border-theme` — 主題感知邊框寬度
- `shadow-neo-sm` / `shadow-neo` / `shadow-neo-lg` — 主題感知陰影
- `shadow-theme-hover` — hover 狀態陰影

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

### Supabase 生產環境管理

```bash
# 建立新 Migration
supabase migration new <name>

# 推送到生產環境（謹慎執行）
pnpm db:migrate
# 或
supabase db push

# 查看 Migration 狀態
supabase migration list

# 查看資料庫差異（執行前檢查）
pnpm db:diff
# 或
supabase db diff
```

### 健康檢查
```bash
# 執行完整健康檢查
pnpm health-check

# 執行特定領域檢查
pnpm health-check:architecture  # 架構檢查
pnpm health-check:api           # API 檢查
pnpm health-check:security      # 安全檢查
```

---

## 生產環境資訊

**Supabase 專案**:
- Dashboard: https://supabase.com/dashboard/project/qwovavytryvgchcowjof
- API URL: https://qwovavytryvgchcowjof.supabase.co
- 區域: AWS ap-southeast-1 (新加坡)
- 專案 ID: `qwovavytryvgchcowjof`

**環境變數** (`.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`: 生產環境 API URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: 公開金鑰
- `SUPABASE_SERVICE_ROLE_KEY`: 服務金鑰（Admin 權限）

---

**最後更新**: 2026-01-14
**憲章版本**: 1.1.0
**當前分支**: master
