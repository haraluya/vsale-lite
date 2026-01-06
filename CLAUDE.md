# Vsale-lite - Claude Code Context

**專案名稱**: Vsale-lite
**專案類型**: B2B 批發訂貨系統
**最後更新**: 2026-01-06

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
- 客戶端優化行動裝置 (單手操作、觸控友善)
- 管理端響應式設計 (手機應急查看 / 桌面批量操作)
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
- 響應式邊框: 手機 2px / 桌面 3px (`border-2 md:border-3`)
- 響應式陰影: 手機 neo-sm / 桌面 neo (`shadow-neo-sm md:shadow-neo`)
- 點擊狀態包含位移效果 (translate + shadow-none)
- 使用設計 Token 系統確保一致性 (`lib/design-tokens.ts`)

### VI. 負庫存支援
- **必須** 支援負庫存下單
- 不檢查 `Stock > 0`
- 庫存可為負數 (欠貨/預購)

### VII. 響應式設計規範 (005-responsive-ui)
- **必須** 遵循 Mobile-First 策略 (手機 → 平板 → 桌面)
- **必須** 使用設計 Token 系統 (`lib/design-tokens.ts`)
- **必須** 確保觸控目標 >= 44px × 44px (WCAG 2.1 AA 標準)
- **必須** 使用 Next.js Image `sizes` 屬性優化圖片載入
- 響應式斷點: `md: 768px` (平板) / `lg: 1024px` (桌面)
- 後台 Sidebar: 手機隱藏 (Sheet) / 平板收縮 (w-16) / 桌面展開 (w-64)
- 後台表格: 手機卡片視圖 / 桌面完整表格
- 設計 Token 優先於硬編碼樣式

---

## 當前開發狀態

### ✅ 已完成功能（已合併到 master）

#### 1. **001-user-tier-management**: 會員等級與客戶管理 ✅
- 雙入口登入、快速開戶、客戶列表、等級 CRUD
- RLS 權限控制與 RBAC

#### 2. **002-product-management**: 商品與分類管理 ✅
- 分類 CRUD、商品 CRUD、圖片上傳、前台商品瀏覽

#### 3. **003-series-and-pricing**: 系列與等級價格管理 ✅
- 三層階層架構（分類 > 系列 > 產品）
- 等級綁定價格機制（tier_prices 表）
- 批次價格設定功能

#### 4. **004-cart-and-orders**: 購物車與訂單管理系統 ✅ **NEW!**
**狀態**: Phase 1-7 已完成 (2026-01-03)

**核心功能**:
1. ✅ 購物車功能（Zustand 狀態管理、持久化儲存）
2. ✅ 訂單建立（訂單編號產生、價格快照）
3. ✅ 管理員訂單處理（確認、狀態更新、取消）
4. ✅ 客戶訂單查詢（RLS 權限控制）
5. ✅ 訂單操作歷史追蹤（完整稽核軌跡）

**資料庫實體**:
- `orders`: 訂單主表（訂單編號、總金額、狀態、備註）
- `order_items`: 訂單明細（商品快照、成交價格）
- `order_timelines`: 訂單操作歷史（操作類型、操作者、狀態變更）

**Server Actions**:
- `createOrder()`: 建立訂單（含訂單編號產生與價格快照）
- `getOrders()`: 查詢訂單列表（支援狀態篩選與搜尋）
- `getOrderById()`: 查詢訂單詳情（含明細與操作歷史）
- `confirmOrder()`: 確認訂單並扣減庫存（原子性操作）
- `updateOrderStatus()`: 更新訂單狀態（confirmed → shipping → completed）
- `cancelOrder()`: 取消訂單並回補庫存（原子性操作）
- `validateCartItem()`: 驗證購物車商品（價格設定檢查）
- `validateCartBeforeCheckout()`: 下單前購物車驗證

**PostgreSQL Functions**:
- `generate_order_number()`: 產生唯一訂單編號（ORD-YYYYMMDD-XXXX）
- `confirm_order_and_deduct_stock()`: 訂單確認與庫存扣減（原子性）
- `cancel_order_and_restore_stock()`: 訂單取消與庫存回補（原子性）
- `update_order_status()`: 更新訂單狀態並記錄歷史

**Zustand Store**:
- `stores/cart.ts`: 購物車狀態管理（含 persist middleware）

**UI 元件**:
- 客戶端：購物車頁面、訂單確認頁面、訂單列表、訂單詳情
- 管理端：訂單列表（含篩選搜尋）、訂單詳情、狀態更新器、取消訂單按鈕、操作歷史時間軸

**文件位置**:
- 規格: `specs/004-cart-and-orders/spec.md`
- 實作計畫: `specs/004-cart-and-orders/plan.md`
- 資料模型: `specs/004-cart-and-orders/data-model.md`
- API 合約: `specs/004-cart-and-orders/contracts/`
- 快速上手: `specs/004-cart-and-orders/quickstart.md`
- 研究紀錄: `specs/004-cart-and-orders/research.md`
- 測試資料: `specs/004-cart-and-orders/seed-test-data.sql`

**進度**: 53/63 任務完成 (84%)
- Phase 1-7: ✅ 全部完成（MVP 核心功能）
- Phase 8: ⏳ 進行中（Polish & 品質保證）

#### 5. **008-system-admin**: 後台系統管理功能 ✅ **NEW!**
**狀態**: Phase 1-5, Phase 6 後端, Phase 8 核心 已完成 (2026-01-04)

**核心功能**:
1. ✅ 管理員帳號管理（建立、編輯、刪除、重設密碼）
2. ✅ 管理員登入系統（username 模式，無需 email）
3. ✅ 操作日誌系統（完整稽核軌跡，五種操作類型）
4. ✅ 系統設定 API（設定查詢、更新、Logo 上傳）

**資料庫實體**:
- `admin_users`: 管理員帳號表（username、密碼、暱稱）
- `audit_logs`: 操作日誌表（操作類型、目標、變更內容、操作者快照）
- `system_settings`: 系統設定表（key-value 儲存，支援多種型別）

**Server Actions**:
- 管理員管理: `createAdmin()`, `getAdmins()`, `updateAdmin()`, `resetPassword()`, `deleteAdmin()`
- 操作日誌: `logAudit()`, `getAuditLogs()`, `getAuditLogsByTarget()`, `getAuditLogStats()`
- 系統設定: `getSettings()`, `getPublicSettings()`, `updateSetting()`, `uploadLogo()`, `deleteLogo()`

**UI 元件**:
- 管理端：成員列表、成員表單、操作日誌列表、操作日誌篩選器、操作類型 Badge

**文件位置**:
- 規格: `specs/008-system-admin/spec.md`
- 實作計畫: `specs/008-system-admin/plan.md`
- 任務清單: `specs/008-system-admin/tasks.md`
- API 合約: `specs/008-system-admin/contracts/`
- 實作指引: `specs/008-system-admin/IMPLEMENTATION_GUIDE.md`
- 測試報告: `specs/008-system-admin/TESTING_REPORT.md`

**進度**: 69/86 任務完成 (80%)
- Phase 1-5: ✅ 完整（成員管理 + 操作日誌）
- Phase 6: 🔄 後端完成（系統設定 Server Actions）
- Phase 7: 📋 UI 可選（操作歷史時間軸）
- Phase 8: ✅ 核心完成（TypeScript 型別檢查通過）

#### 6. **系列與商品管理 Excel 匯入匯出功能** ✅ **NEW!**
**狀態**: Phase 1-5 完成 (2026-01-05)

**核心功能**:
1. ✅ 資料庫 Migration（系列與商品名稱唯一性約束）
2. ✅ 系列管理匯入匯出（範本下載、匯出、雙階段匯入）
3. ✅ 商品管理匯入匯出（範本下載、匯出、雙階段匯入）
4. ✅ 批次查詢優化（避免 N+1 查詢問題）
5. ✅ 完整錯誤處理（唯一性約束違反、Trigger 失敗、試算驗證）

**資料庫變更**:
- `series.name`: 新增 UNIQUE 約束與索引
- `products.name`: 新增 UNIQUE 約束與索引
- Migration: `20260116_add_unique_name_constraints.sql`

**Server Actions** (`lib/actions/series.ts`, `lib/actions/products.ts`):
- `exportSeries()` / `exportProducts()`: 匯出為 Excel（含篩選支援）
- `importSeries()` / `importProducts()`: 批次匯入（試算模式 + 正式匯入）
- `downloadSeriesTemplate()` / `downloadProductTemplate()`: 下載匯入範本

**UI 元件** (`components/admin/series/`, `components/admin/products/`):
- `ExcelExport`: 匯出按鈕（白色、Neo-Brutalism 風格）
- `ExcelImport`: 匯入區塊（可收合、即時結果顯示、錯誤明細）
- `ExcelTemplateDownload`: 範本下載按鈕（藍色）

**頁面整合**:
- `/admin/series`: 系列管理頁面（新增三個按鈕 + 匯入區塊）
- `/admin/products`: 商品管理頁面（新增三個按鈕 + 匯入區塊）

**特色**:
- ✅ 名稱重複檢查：匯入時禁止名稱重複
- ✅ 商品編號自動產生：由 PostgreSQL Trigger 自動產生
- ✅ 系列狀態檢查：僅允許匯入到 active 系列
- ✅ 批次查詢優化：使用 Set/Map 避免 N+1 查詢
- ✅ 雙階段匯入：試算驗證 → 正式匯入
- ✅ 匯入成功提示：提醒管理員設定等級價格

**實作檔案**:
| 類型 | 檔案數量 | 位置 |
|------|---------|------|
| Migration | 1 | `supabase/migrations/20260116_add_unique_name_constraints.sql` |
| Zod Schema | 1 | `lib/validations/excel.schema.ts` |
| Server Actions | 6 函式 | `lib/actions/series.ts`, `lib/actions/products.ts` |
| UI 元件 | 6 | `components/admin/series/`, `components/admin/products/` |
| 頁面整合 | 2 | `app/(admin)/admin/series/page.tsx`, `app/(admin)/admin/products/page.tsx` |

#### 7. **009-coupon-system**: 優惠券系統 ✅ **NEW!**
**狀態**: Phase 1-8 核心功能完成 (2026-01-06)

**核心功能**:
1. ✅ 客戶領取與使用優惠券（輸入口令、購物車應用、訂單折扣）
2. ✅ 管理員建立與管理優惠券（代碼、折扣方式、使用限制、生效時間）
3. ✅ 優惠券使用限制與驗證（等級限制、最低金額、系列限制）
4. ✅ 訂單優惠券快照（永久保留，即使優惠券被刪除）
5. ✅ 優惠券代碼唯一性與大小寫處理（自動轉大寫、重複檢查）
6. ✅ 購物車商品變更時自動重新驗證優惠券

**資料庫實體**:
- `coupons`: 優惠券主表（代碼、折扣方式、折扣值、使用限制、生效時間）
- `coupon_tier_restrictions`: 優惠券等級限制表（多對多關聯）
- `coupon_series_restrictions`: 優惠券系列限制表（多對多關聯）
- `user_coupons`: 客戶優惠券領取記錄表（領取時間、使用狀態）
- `order_coupons`: 訂單優惠券快照表（代碼、折扣方式、折扣金額）
- `active_coupons`: 有效優惠券 View（自動過濾過期與已刪除）

**Server Actions** (`lib/actions/coupons.ts`):
- 管理員: `createCoupon()`, `updateCoupon()`, `deleteCoupon()`, `getCoupons()`, `getCouponById()`, `getCouponStats()`
- 客戶: `claimCoupon()`, `getUserCoupons()`, `validateCoupon()`
- 工具函式: `calculateCouponDiscount()`, `validateCouponConditions()` (`lib/utils/coupon-helpers.ts`)

**UI 元件**:
- 前台：`CouponCard` (Coupang 風格)、`CouponCodeInput` (Foodpanda 風格)、`CouponSelector`
- 後台：`CouponForm`、`CouponList`、`CouponFilters`

**Zustand Store 擴充** (`stores/cart.ts`):
- 新增優惠券狀態：`appliedCoupon`, `couponDiscount`, `couponValidationCallback`
- 新增方法：`applyCoupon()`, `removeCoupon()`, `setCouponValidationCallback()`, `triggerCouponRevalidation()`
- 購物車商品變更時自動重新驗證優惠券並移除不符合條件的優惠券

**文件位置**:
- 規格: `specs/009-coupon-system/spec.md`
- 技術研究: `specs/009-coupon-system/research.md`
- 資料模型: `specs/009-coupon-system/data-model.md`
- API 合約: `specs/009-coupon-system/contracts/coupons.ts`
- 任務清單: `specs/009-coupon-system/tasks.md`
- 快速上手: `specs/009-coupon-system/quickstart.md`
- 測試資料: `specs/009-coupon-system/seed-test-data.sql`

**進度**: 49/55 任務完成 (89%)
- Phase 1-2 (Setup & Foundational): ✅ 完整
- Phase 3-4 (US1-US2 - MVP): ✅ 完整（客戶領取使用 + 管理員 CRUD）
- Phase 5 (US3 - 使用限制驗證): ✅ 完整
- Phase 6 (US4 - 視覺化設計): 🔄 基礎完成（可選優化）
- Phase 7 (US5 - 訂單快照): ✅ 完整
- Phase 8 (US6 - 代碼唯一性): ✅ 完整
- Phase 9 (US7 - 刪除清理): 🔄 基礎完成（可選優化）
- Phase 10 (Polish): 🔄 進行中（統計功能可選）

**特色亮點**:
- ✅ 優惠券代碼大小寫不敏感（使用 Generated Column `code_normalized`）
- ✅ 購物車商品變更時自動重新驗證優惠券
- ✅ 訂單優惠券快照永久保留（不使用 FK，保留歷史記錄）
- ✅ 支援現金折扣與百分比折扣
- ✅ 支援等級限制、最低金額限制、系列限制
- ✅ RLS Policy 確保客戶僅能查看有效優惠券
- ✅ Coupang 風格優惠券卡片 + Foodpanda 風格輸入口令


#### 8. **011-shipping-and-order-edit**: 運費設定與訂單修改系統 ✅ **NEW!**
**狀態**: Phase 1-6 核心功能完成 (2026-01-06)

**核心功能**:
1. ✅ 會員等級運費設定（基本運費、滿額免運門檻）
2. ✅ 訂單建立時自動計算運費（RPC 函數、購物車預覽）
3. ✅ 訂單狀態流程簡化（移除 confirmed 狀態，pending → shipping → completed）
4. ✅ 庫存扣減時機調整（從確認訂單移至標記出貨階段）
5. ✅ 訂單修改核心功能（商品單價、數量、運費、自訂費用）
6. ✅ 批次修改原子性保證（PostgreSQL Transaction）

**資料庫實體**:
- `tiers`: 擴展運費欄位（shipping_fee, free_shipping_threshold）
- `orders`: 擴展運費欄位（shipping_fee）
- `order_custom_fees`: 訂單自訂費用表（手續費、包裝費、總額調整）
- `order_timelines`: 擴展修改歷程欄位（modifications JSONB）

**PostgreSQL Functions**:
- `calculate_shipping_fee()`: 計算運費（依會員等級與訂單金額）
- `mark_order_as_shipping()`: 標記出貨並扣減庫存（原子性操作）
- `update_order_with_modifications()`: 批次修改訂單（商品、費用、運費）

**Server Actions** (`lib/actions/orders.ts`, `lib/actions/tiers.ts`):
- 訂單管理: `markAsShipping()`, `updateOrderDetails()`, `updateOrderStatus()` (更新)
- 等級管理: `updateTier()` (擴展運費欄位)

**UI 元件**:
- 前台：`CartSummary` (運費預覽)、`ShippingFeeDisplay`
- 後台：`TierForm` (運費設定)、`OrderEditor` (訂單編輯器)、`OrderActions` (標記出貨按鈕)

**文件位置**:
- 規格: `specs/011-shipping-and-order-edit/spec.md`
- 實作計畫: `specs/011-shipping-and-order-edit/plan.md`
- 資料模型: `specs/011-shipping-and-order-edit/data-model.md`
- API 合約: `specs/011-shipping-and-order-edit/contracts/`
- 任務清單: `specs/011-shipping-and-order-edit/tasks.md`
- 快速上手: `specs/011-shipping-and-order-edit/quickstart.md`
- 測試資料: `specs/011-shipping-and-order-edit/seed-test-data.sql`

**進度**: 63/101 任務完成 (62%)
- Phase 1 (Setup): ✅ 完整
- Phase 2 (Foundational): ✅ 完整（資料庫 Migration、型別定義）
- Phase 3 (US1 - 運費設定): ✅ 完整
- Phase 4 (US2 - 運費計算): ✅ 完整
- Phase 5 (US6 - 狀態流程調整): ✅ 完整
- Phase 6 (US3 - 訂單修改核心): ✅ 完整
- Phase 7 (US4 - 修改歷程顯示): 📋 可選（P2 優先級）
- Phase 8 (US5 - 優惠券互動): 📋 可選（P2 優先級）
- Phase 9 (Polish): ✅ 完整（程式碼品質檢查、TypeScript 型別檢查、權限驗證、RLS Policy、錯誤訊息規範）
- Phase 10 (Deployment): 📋 待部署

**特色亮點**:
- ✅ 運費自動化計算（依會員等級與訂單金額）
- ✅ 滿額免運機制（支援不同等級設定不同門檻）
- ✅ 訂單狀態流程簡化（pending → shipping → completed）
- ✅ 庫存扣減時機優化（從確認訂單移至出貨階段）
- ✅ 訂單修改原子性保證（PostgreSQL Transaction 確保資料一致性）
- ✅ 支援負庫存（預購/欠貨場景）
- ✅ 自訂費用支援（手續費、包裝費、額外運費、總額調整）
- ✅ 批次修改功能（商品單價、數量、運費一次性提交）

---

### 🚀 待開發功能
目前所有核心功能已完成，以下是可能的擴充方向：
- 📊 **報表與分析**: 銷售報表、庫存分析、優惠券使用統計
- 🎨 **視覺化優化**: 優惠券卡片鋸齒狀切口、領取動畫效果
- 🔔 **通知系統**: 訂單狀態通知、庫存警示、優惠券過期提醒
- 💳 **付款整合**: 金流串接
- 🚚 **物流整合**: 出貨與追蹤

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

### ⚠️ 資料庫安全最高指導原則

**🛡️ 絕對禁止在遠端/生產環境執行 `supabase db reset`**

此指令會**清除所有資料庫資料**。若需要更新資料庫結構，必須嚴格遵守以下流程：

**標準開發流程（SOP）**:
1. **本機優先**: 確保本機 Supabase 正在執行（`supabase start`），先在本機環境測試
2. **生成遷移**: 執行 `supabase migration new <描述性名稱>` 或使用安全腳本 `.\scripts\safe-migration.ps1 -Name "add_feature"`
3. **編輯 SQL**: 編輯生成的 Migration 檔案，檢查是否有意外的 `DROP` 指令
4. **安全部署**: 使用 `supabase db push` 推送變更（**保留現有資料**）
5. **本機開發禁令**: **絕對禁止**使用 `supabase db reset`，除非獲得使用者明確同意

**🚨 重要：本機開發資料保護**:
- ❌ **絕對禁止**: 在本機環境執行 `supabase db reset`（會清空測試資料）
- ✅ **必須使用**: `supabase db push` 推送 Migration（保留現有資料）
- ⚠️ **例外情況**: 若必須重置，**必須先詢問使用者**並獲得明確同意
- 📝 **使用者測試資料**: 使用者在測試過程中會建立資料（訂單、商品、客戶），這些資料必須被保留

**指令管控**:
- ✅ **推薦使用**:
  - `supabase migration new <name>` - 建立新 Migration
  - `supabase db push` - 推送 Migration (保留資料)
  - `.\scripts\safe-migration.ps1` - 安全 Migration 輔助腳本
- ⚠️ **謹慎使用**:
  - `supabase db reset` - **必須先詢問使用者同意**
- ❌ **嚴格禁止**:
  - 在遠端/生產環境執行任何重置指令
  - 未經使用者同意在本機執行 `supabase db reset`

**四層安全機制**:
1. **預防層**: Migration 流程 + 增量式更新 + Git Pre-commit Hook
2. **提示層**: Pre-DB-Reset Hook (需雙重確認)
3. **檢查層**: 部署前檢查清單（6 Phase） + 自動備份腳本
4. **回滾層**: 完整備份（pg_dump） + 回滾程序

📖 **完整安全指南**: [docs/SAFE_MIGRATION_GUIDE.md](docs/SAFE_MIGRATION_GUIDE.md)
🚀 **快速參考**: [docs/BACKUP_RESTORE_CHEATSHEET.md](docs/BACKUP_RESTORE_CHEATSHEET.md)
⚡ **協議全文**: [docs/DATABASE_SAFETY_PROTOCOL.md](docs/DATABASE_SAFETY_PROTOCOL.md)
🛠️ **安全腳本**: `.\scripts\safe-migration.ps1` - 增量式 Migration 工作流程

---

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

### Supabase CLI 管理

**⚠️ 重要：當前使用本地 Docker Supabase 進行開發**

專案配置為使用**本地 Docker Supabase**，完成後再部署到雲端。

---

#### 本地開發環境（Docker）✅ 當前使用

**⚠️ 安全提醒**:
- `supabase db reset` **僅限本機環境**使用
- **絕不**在遠端/生產環境執行此指令
- 遠端部署**必須**使用 `supabase db push`（Migration 流程）
- 詳見 [資料庫管理與遷移協議](docs/DATABASE_SAFETY_PROTOCOL.md)

```bash
# 1. 啟動本地 Supabase（首次或重啟電腦後執行）
supabase start

# 2. 重置資料庫並執行所有 Migrations
supabase db reset

# 3. 查看本地服務資訊
supabase status

# 4. 停止本地 Supabase
supabase stop
```

**本地服務連結**:
- Supabase Studio: http://127.0.0.1:54323
- API URL: http://127.0.0.1:54321
- Database: postgresql://postgres:postgres@127.0.0.1:54322/postgres

**環境變數** (`.env.local`):
- ✅ 已設定為本地 Supabase
- 部署時需手動切換到雲端設定

---

#### 測試資料生成（本地）

```bash
# 方法 1: 使用 Supabase Studio SQL Editor（推薦）
# 1. 開啟 http://127.0.0.1:54323
# 2. 左側 → SQL Editor → New Query
# 3. 複製 specs/003-series-and-pricing/seed-test-data.sql
# 4. 執行

# 方法 2: psql 直接執行
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f specs/003-series-and-pricing/seed-test-data.sql
# 密碼: postgres
```

---

#### Migration 管理

**⚠️ Migration 安全提醒**:
- 新增 Migration 前**必須**參考 [安全 Migration 指南](docs/SAFE_MIGRATION_GUIDE.md)
- 使用 [Migration 範本](supabase/migrations/_TEMPLATE_safe_migration.sql) 確保正確格式
- 部署前使用 [檢查清單](supabase/migrations/_CHECKLIST.md) 逐項驗證

```bash
# 執行所有 Migrations（開發時常用）
supabase db reset

# 新增 Migration
supabase migration new <name>

# 查看 Migration 狀態
supabase migration list
```

**Migration 檔案位置**:
- `supabase/migrations/*.sql` - 按時間戳排序 (20260101, 20260102, 20260103...)

**⚠️ Migration 安全原則** - **必讀！**

在建立 Migration 前，請務必參考以下文件：
- 📖 **完整指南**: [`docs/SAFE_MIGRATION_GUIDE.md`](docs/SAFE_MIGRATION_GUIDE.md) - 詳細說明安全與危險操作
- 🚀 **快速參考**: [`docs/BACKUP_RESTORE_CHEATSHEET.md`](docs/BACKUP_RESTORE_CHEATSHEET.md) - 部署檢查清單與指令

**黃金守則（按優先級排序）**:
0. **🛡️ 資料庫安全至上**: 絕對禁止在遠端/生產環境執行 `supabase db reset`（見 [資料庫安全協議](docs/DATABASE_SAFETY_PROTOCOL.md)）
1. ✅ **優先使用新增操作**（ADD COLUMN, CREATE TABLE, CREATE INDEX）
2. ⚠️ **避免刪除操作**（DROP COLUMN, DROP TABLE）- 先重新命名，保留 30 天
3. 🛡️ **部署前必須備份**（使用 `pnpm deploy:db` 或手動 `pg_dump`）
4. 🔄 **複雜變更分階段執行**（新增 → 遷移 → 清理）
5. 📊 **準備回滾計畫**（備份檔案或反向 Migration）

**Migration 範本位置**:
- `supabase/migrations/_TEMPLATE_safe_migration.sql` - 安全新增功能範本
- `supabase/migrations/_CHECKLIST.md` - 部署前檢查清單

---

#### 雲端部署（生產環境）- 僅部署時使用

**🔴 危險區域 - 生產環境操作**:
- 執行任何操作前**必須**先備份（使用 `pnpm deploy:db` 或手動 `pg_dump`）
- **絕對禁止**執行 `supabase db reset`
- Migration 推送前**必須**完成 6 Phase 檢查清單
- 詳見 [備份與還原快速參考](docs/BACKUP_RESTORE_CHEATSHEET.md)

```bash
# 1. 連結雲端專案
supabase link --project-ref qwovavytryvgchcowjof

# 2. 推送 Migrations 到雲端
supabase db push

# 3. 從雲端拉取 Schema
supabase db pull
```

**雲端設定**:
- 專案 ID: `qwovavytryvgchcowjof`
- 區域: AWS ap-southeast-1
- URL: `https://qwovavytryvgchcowjof.supabase.co`

**部署流程**:
1. 更新 `.env.local` 切換到雲端設定
2. `supabase db push` 推送 Migrations
3. 驗證雲端資料庫
4. 部署到 Firebase

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
3. ✅ **003-series-and-pricing**: 系列與等級價格管理（2026-01-03 完成）
   - 三層階層架構（分類 > 系列 > 產品）
   - 等級綁定價格機制（tier_prices 表）
   - 系列管理（CRUD、系列代碼）
   - 批次價格設定功能
   - 商品原價與庫存狀態
   - 前台根據用戶等級顯示對應價格

### 待開發功能
目前所有核心功能已完成，以下是可能的擴充方向：
- 📦 **購物車與訂單系統**: 完整的下單流程
- 📊 **報表與分析**: 銷售報表、庫存分析
- 🔔 **通知系統**: 訂單狀態通知、庫存警示
- 💳 **付款整合**: 金流串接
- 🚚 **物流整合**: 出貨與追蹤

---

## 重要開發注意事項

### 負庫存處理
- **必須** 支援負庫存（憲章 VI）
- 驗證時不檢查 `stock >= 0`
- 前台顯示邏輯：
  - `stock > 0`: 顯示「庫存: X」（綠色）
  - `stock === 0`: 顯示「缺貨中」（黃色）
  - `stock < 0`: 顯示「欠貨: X（可預購）」（紅色）

### 價格機制（003 已實作）
- 商品有「原價」（retail_price）用於顯示折扣力度
- 每個商品 × 每個等級 = 一個價格（tier_prices 表）
- 前台顯示：「原價 $60  您的價格 $30（批發）」
- 若未設定該等級價格，顯示「價格未設定」並禁用加入購物車
- 支援批次價格設定（依系列或商品批量設定）

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

**最後更新**: 2026-01-03
**憲章版本**: 1.0.0
**當前分支**: master
