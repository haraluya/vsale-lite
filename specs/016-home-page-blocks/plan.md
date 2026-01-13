# Implementation Plan: 首頁廣告區塊系統

**Branch**: `016-home-page-blocks` | **Date**: 2026-01-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/016-home-page-blocks/spec.md`

## Summary

**主要需求**: 前台改造為雙入口模式（首頁/商品頁），支援三種區塊類型（圖片輪播、商品展示、文字區塊），後台統一管理，並實作圖片清理與資料一致性機制。

**技術方法**:
1. **Phase 0 (Setup & Foundational)**: 資料庫 Migration、型別定義、Zod Schema
2. **Phase 1 (US1 - 前台路由架構)**: 路由重構、Segment Control、歡迎字樣
3. **Phase 2 (US2/US3/US4 - 前台區塊顯示)**: 三種區塊類型的前台渲染元件
4. **Phase 3 (US5 - 後台區塊管理)**: CRUD Server Actions、表單元件
5. **Phase 4 (US6 - 區塊排序)**: 上移/下移按鈕、排序邏輯
6. **Phase 5 (US7 - 圖片清理)**: 四種清理場景、容錯機制
7. **Phase 6 (US8 - Tab 整合)**: 廣告管理頁面 Tab 切換器
8. **Phase 7 (Polish)**: 測試、文件、效能優化

**核心亮點**:
- ✅ 雙入口設計：首頁（廣告區塊）vs 商品頁（系列商品）
- ✅ JSONB Config 彈性儲存：支援三種區塊類型的不同配置
- ✅ 圖片清理機制：自動清理孤兒檔案（刪除、更換、減少數量、類型變更）
- ✅ CSS scroll-snap 原生滑動：無需第三方套件
- ✅ Neo-Brutalism 設計：響應式邊框、硬陰影、點擊效果

---

## Technical Context

**Language/Version**: TypeScript 5.7+
**Primary Framework**: Next.js 15 (App Router) + React 19
**UI Library**: Tailwind CSS v4 + shadcn/ui (無頭組件基礎)
**State Management**: N/A（區塊為靜態內容，無需客戶端狀態管理）
**Database**: Supabase (PostgreSQL) + JSONB Config
**Storage**: Supabase Storage (使用現有 `products` bucket)
**Testing**: Vitest + React Testing Library + Manual Testing
**Target Platform**: Web (Desktop + Mobile)
**Performance Goals**:
- 首頁載入時間 < 2 秒（Mobile 4G）
- 商品查詢時間 < 300ms
- 圖片輪播切換響應 < 100ms
**Constraints**:
- 必須符合 Neo-Brutalism 設計規範（3px 黑邊框、硬陰影、無圓角）
- 必須支援響應式設計（手機一排 2 個、桌面一排 3 個）
- 必須實作圖片清理機制（避免孤兒檔案）
- 圖片總大小不得超過 Supabase 免費版限制（1GB）
**Scale/Scope**:
- 新增 1 個資料表 (`home_page_blocks`)
- 新增 8 個 Server Actions（前台 2 個、後台 6 個）
- 新增 1 個 Migration 檔案
- 新增 6 個前台元件、5 個後台元件
- 重構前台路由架構（`/store` → `/store/home` + `/store/products`）
- 預計影響 ~2000 行程式碼變更

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ I. 使用者角色優先 (User Role First)
- **符合性**: 完全符合雙入口設計理念
- **實施方式**:
  - 前台首頁：客戶使用 `/store/home` 查看廣告區塊（視覺吸引）
  - 前台商品頁：客戶使用 `/store/products` 查看系列商品（購買主流程）
  - 後台管理：管理員使用 `/admin/announcements` 管理首頁廣告（Tab 切換器整合）
  - RLS Policy 確保客戶僅能查看 `is_active = true` 的區塊
- **合規狀態**: ✅ 通過

### ✅ II. 等級綁定價格 (Tier-Based Pricing)
- **符合性**: 商品展示區塊整合等級價格查詢
- **實施方式**:
  - 商品展示區塊使用現有的 `ProductWithPriceCard` 元件
  - 自動查詢用戶等級價格並顯示在商品卡片
  - 未設定價格顯示「價格未設定」並禁用加入購物車
- **合規狀態**: ✅ 通過

### ✅ III. 使用者故事驅動開發 (User Story Driven Development)
- **符合性**: Spec 包含 8 個獨立可測試的使用者故事（P0 × 6、P1 × 2）
- **實施方式**:
  - US1 (P0): 前台路由與導覽切換
  - US2 (P0): 圖片輪播區塊
  - US3 (P0): 商品展示區塊
  - US4 (P1): 文字區塊
  - US5 (P0): 管理員建立與管理首頁廣告區塊
  - US6 (P0): 管理員調整區塊排序
  - US7 (P0): 圖片清理與資料一致性
  - US8 (P1): 後台廣告管理整合與 Tab 切換
- **合規狀態**: ✅ 通過

### ✅ IV. API 模組化與職責分離 (API Modularization)
- **符合性**: 完全符合 Server Actions 模式
- **實施方式**:
  - `lib/actions/home-blocks.ts` - 所有區塊 CRUD 操作
  - UI 元件僅負責顯示與呼叫 API
  - Server Actions 負責驗證、權限檢查、DB 操作
  - 所有表單使用 Server Actions 處理
  - `checkAuth('admin')` 強制執行權限驗證
- **合規狀態**: ✅ 通過

### ✅ V. 設計系統一致性 (Design System Consistency)
- **符合性**: 100% 符合 Neo-Brutalism 設計規範
- **實施方式**:
  - 響應式邊框: 手機 2px / 桌面 3px (`border-2 md:border-3`)
  - 響應式陰影: 手機 neo-sm / 桌面 neo (`shadow-neo-sm md:shadow-neo`)
  - 點擊位移效果: `translate-x-[2px] translate-y-[2px] shadow-none`
  - 無圓角: `rounded-none`
  - Segment Control 高亮: 綠色背景 + Neo-Brutalism 陰影
  - 使用設計 Token 系統 (`lib/design-tokens.ts`)
- **合規狀態**: ✅ 通過

### ✅ VI. 負庫存支援 (Negative Stock Support)
- **符合性**: N/A（區塊系統不涉及庫存邏輯）
- **合規狀態**: ✅ 不適用

### ✅ VII. 響應式設計規範 (Responsive Design)
- **符合性**: 完全符合 Mobile-First 策略
- **實施方式**:
  - Segment Control: 觸控目標 >= 44px × 44px
  - 圖片輪播: 手機 h-64 (256px) / 桌面 h-96 (384px)
  - 商品展示: 手機一排 2 個 / 桌面一排 3 個
  - 文字區塊: 寬度自適應螢幕寬度
  - Next.js Image `sizes` 屬性優化圖片載入
- **合規狀態**: ✅ 通過

### ✅ VIII. 統一對話框系統 (Unified Dialog)
- **符合性**: 使用統一對話框 Hook 替代原生瀏覽器對話框
- **實施方式**:
  - 刪除區塊: `useConfirm({ variant: 'danger' })`
  - 表單驗證錯誤: `useAlert({ variant: 'error' })`
  - 成功提示: `useAlert({ variant: 'success' })`
- **合規狀態**: ✅ 通過

**總結**: ✅ 所有適用原則都已符合，無違反項目，可進入 Phase 0 研究。

---

## Project Structure

### Documentation (this feature)

```text
specs/016-home-page-blocks/
├── spec.md              # 功能規格（已完成）
├── checklists/
│   └── requirements.md  # 規格品質檢查清單（已完成）
├── plan.md              # 本檔案（實作計畫）
├── research.md          # Phase 0 研究文件（將產生）
├── data-model.md        # Phase 1 資料模型文件（將產生）
├── quickstart.md        # 快速上手指南（將產生）
└── contracts/           # API 合約（將產生）
    ├── home-blocks.ts   # Server Actions 合約
    └── types.ts         # TypeScript 型別定義
```

### Source Code (repository root)

```text
# Next.js 15 App Router 專案結構

# ========== 前台路由重構 ==========
app/(shop)/
├── layout.tsx                              # 📝 新增 Segment Control
└── store/
    ├── page.tsx                            # 📝 重定向到 /store/home
    ├── home/
    │   └── page.tsx                        # ✅ 新增首頁（廣告區塊容器）
    └── products/
        └── page.tsx                        # 📝 移動現有的系列商品列表

# ========== 後台管理整合 ==========
app/(admin)/admin/
└── announcements/
    └── page.tsx                            # 📝 新增 Tab 切換器（商品頁廣告 + 首頁廣告）

# ========== 前台區塊元件 ==========
components/shop/
└── home-blocks/
    ├── BlockRenderer.tsx                   # ✅ 區塊渲染器（依類型顯示）
    ├── ImageCarousel.tsx                   # ✅ 圖片輪播區塊
    ├── ProductDisplay.tsx                  # ✅ 商品展示區塊
    ├── TextBlock.tsx                       # ✅ 文字區塊
    └── SegmentControl.tsx                  # ✅ 首頁/商品切換器

# ========== 後台管理元件 ==========
components/admin/home-blocks/
├── HomeBlockList.tsx                       # ✅ 區塊列表
├── HomeBlockForm.tsx                       # ✅ 區塊表單（依類型顯示欄位）
├── HomeBlockCard.tsx                       # ✅ 區塊卡片（縮圖、排序按鈕）
├── BlockTypeSelector.tsx                   # ✅ 區塊類型選擇器
└── ImageUploadMultiple.tsx                 # ✅ 多圖上傳元件

# ========== Server Actions ==========
lib/actions/
└── home-blocks.ts                          # ✅ 新增所有區塊 CRUD 操作

# ========== Zod Schemas ==========
lib/validations/
└── home-block.schema.ts                    # ✅ 新增區塊驗證 Schema

# ========== TypeScript Types ==========
types/
└── index.ts                                # 📝 擴充 HomePageBlock 型別

# ========== Database Migration ==========
supabase/migrations/
└── 20260113_home_page_blocks.sql           # ✅ 新增 home_page_blocks 表
```

**Structure Decision**: 採用 Next.js 15 App Router 標準結構，前台區塊元件集中在 `components/shop/home-blocks/`，後台管理元件集中在 `components/admin/home-blocks/`。Server Actions 集中在 `lib/actions/home-blocks.ts`。

---

## Complexity Tracking

**無違反項目**: 本實作完全符合專案憲章所有適用原則，無需額外複雜度說明。

**技術挑戰**:
1. **JSONB Config 彈性驗證**: 使用 Zod discriminated union 確保不同區塊類型的 config 正確驗證
2. **圖片清理容錯**: 圖片刪除失敗不阻斷主流程，記錄警告但允許繼續操作
3. **響應式圖片載入**: 使用 Next.js Image `sizes` 屬性優化不同裝置的圖片載入

---

## Phase 0: Outline & Research

### 研究任務清單

#### R1: JSONB Config 欄位設計與 Zod 驗證
- **決策**: 使用 JSONB 欄位儲存不同區塊類型的配置（圖片輪播、商品展示、文字區塊）
- **理由**: 三種區塊類型的配置差異大，使用 JSONB 避免過度正規化，彈性支援未來新增區塊類型
- **替代方案**: 三個獨立表（`image_carousel_blocks`、`product_display_blocks`、`text_blocks`）- 被拒絕（過度正規化、難以維護排序）
- **Zod 驗證策略**: 使用 `z.discriminatedUnion()` 依 `block_type` 驗證對應的 config 結構

#### R2: 圖片儲存路徑與清理機制
- **決策**: 儲存路徑 `home-page-blocks/{block_id}/image-{index}.{ext}`，刪除時批次清理所有可能的副檔名
- **理由**: 參考現有的 `announcements` 圖片清理機制，避免孤兒檔案殘留
- **替代方案**: 使用檔案名稱 Hash - 被拒絕（增加複雜度、難以追蹤）
- **清理場景**: 刪除區塊、更換圖片、減少圖片數量、區塊類型變更

#### R3: CSS scroll-snap vs 第三方輪播庫
- **決策**: 使用 CSS scroll-snap 實現商品展示區塊的橫向滑動
- **理由**: 原生 CSS 效能最佳，支援觸控滑動，無需引入重量級套件（Swiper、Slick）
- **替代方案**: Swiper.js - 被拒絕（打包大小 ~80KB gzipped、過度工程化）
- **參考**: 005-responsive-ui 已使用 scroll-snap 實現購物車橫向滑動

#### R4: 圖片輪播自動播放與指示器
- **決策**: 使用 React `useEffect` + `setInterval` 實現自動輪播，指示器圓點手動切換
- **理由**: 簡單、易維護、無需額外依賴
- **替代方案**: 使用 Embla Carousel - 被拒絕（打包大小 ~20KB、功能過多）
- **自動播放邏輯**: 預設 5 秒間隔，手動切換後重新計時

#### R5: 上移/下移排序 vs 拖曳排序
- **決策**: 使用上移/下移按鈕調整區塊順序
- **理由**: 實作簡單、無需引入 @dnd-kit 庫（~50KB）、符合專案「輕量化」原則
- **替代方案**: 拖曳排序 (@dnd-kit) - 被拒絕（增加打包大小、手機觸控體驗不佳）
- **排序邏輯**: 交換兩個區塊的 `sort_order` 值，立即重新載入列表

#### R6: Tab 切換器 vs 獨立頁面
- **決策**: 在 `/admin/announcements` 頁面新增 Tab 切換器（商品頁廣告 + 首頁廣告）
- **理由**: 統一廣告管理入口，提升管理效率，減少導覽層級
- **替代方案**: 建立新頁面 `/admin/home-blocks` - 被拒絕（增加導覽複雜度、功能分散）
- **實施方式**: 使用 URL 查詢參數 `?tab=home` 或 `?tab=products` 切換 Tab

### 研究結論

✅ 所有技術決策已明確，Phase 0 研究完成。詳細研究報告參見 `research.md`。

---

## Phase 1: Design & Contracts

### A. Data Model

**資料表**: `home_page_blocks`

**欄位定義**:

| 欄位名稱 | 型別 | 約束 | 說明 |
|---------|------|------|------|
| `id` | UUID | PRIMARY KEY | 區塊 ID（自動產生） |
| `name` | TEXT | NOT NULL | 區塊名稱（管理員識別用） |
| `block_type` | TEXT | NOT NULL | 區塊類型：`image_carousel` / `product_display` / `text_block` |
| `config` | JSONB | NOT NULL | 區塊配置（依類型不同） |
| `sort_order` | INTEGER | NOT NULL DEFAULT 0 | 排序順序（數字越小越靠前） |
| `is_active` | BOOLEAN | NOT NULL DEFAULT true | 是否啟用（僅啟用的區塊會顯示在前台） |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 建立時間 |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | 更新時間 |

**索引**:
- `idx_home_blocks_active_sort`: `(is_active, sort_order)` - 前台查詢優化
- `idx_home_blocks_type`: `(block_type)` - 後台篩選優化

**RLS 策略**:
- 客戶端: `SELECT WHERE is_active = true ORDER BY sort_order`
- 管理端: `ALL USING (role = 'admin')`

**JSONB Config 結構**:

```typescript
// 圖片輪播區塊
{
  images: [
    { url: string, series_id?: string | null }
  ],
  auto_play: boolean,
  interval_ms: number
}

// 商品展示區塊
{
  series_ids?: string[] | null,
  tag_ids?: string[] | null,
  max_items?: number | null
}

// 文字區塊
{
  content: string,
  font_size: 12 | 16 | 20 | 24 | 32 | 40 | 48,
  color: string  // Hex 格式 #RRGGBB
}
```

**Migration 檔案**: `supabase/migrations/20260113_home_page_blocks.sql`

詳細資料模型參見 `data-model.md`。

### B. API Contracts

區塊管理系統提供以下 Server Actions，合約文件位於 `specs/016-home-page-blocks/contracts/`：

#### Contract 1: getActiveHomeBlocks (前台查詢)

**檔案**: `contracts/home-blocks.ts`

**簽名**:
```typescript
export async function getActiveHomeBlocks(): Promise<ActionResult<HomePageBlock[]>>
```

**輸入**: 無

**輸出**: `ActionResult<HomePageBlock[]>` - 啟用的區塊列表（依 sort_order 排序）

**使用範例**:
```typescript
const result = await getActiveHomeBlocks()
if (result.success) {
  result.data.forEach(block => {
    // 依 block_type 渲染對應元件
  })
}
```

**行為規範**:
- 僅返回 `is_active = true` 的區塊
- 依 `sort_order` 升序排序
- RLS Policy 確保客戶端無法查詢停用區塊

#### Contract 2: getAllHomeBlocks (管理端查詢)

**簽名**:
```typescript
export async function getAllHomeBlocks(): Promise<ActionResult<HomePageBlock[]>>
```

**輸入**: 無

**輸出**: `ActionResult<HomePageBlock[]>` - 所有區塊列表（含停用）

**權限**: 需要 `checkAuth('admin')`

#### Contract 3: createHomeBlock (管理端建立)

**簽名**:
```typescript
export async function createHomeBlock(
  input: CreateHomeBlockInput
): Promise<ActionResult<HomePageBlock>>
```

**輸入**:
```typescript
interface CreateHomeBlockInput {
  name: string
  blockType: 'image_carousel' | 'product_display' | 'text_block'
  config: ImageCarouselConfig | ProductDisplayConfig | TextBlockConfig
  sortOrder?: number
  isActive?: boolean
}
```

**輸出**: `ActionResult<HomePageBlock>` - 建立的區塊

**權限**: 需要 `checkAuth('admin')`

**行為規範**:
- Zod Schema 驗證 `config` 結構（依 `blockType` 不同）
- 預設 `sortOrder` 為當前最大值 + 1
- 預設 `isActive` 為 `true`
- 建立成功後 `revalidatePath('/store/home')` 更新快取

#### Contract 4: updateHomeBlock (管理端更新)

**簽名**:
```typescript
export async function updateHomeBlock(
  input: UpdateHomeBlockInput
): Promise<ActionResult<HomePageBlock>>
```

**輸入**:
```typescript
interface UpdateHomeBlockInput {
  blockId: string
  name?: string
  config?: ImageCarouselConfig | ProductDisplayConfig | TextBlockConfig
  isActive?: boolean
}
```

**輸出**: `ActionResult<HomePageBlock>` - 更新的區塊

**權限**: 需要 `checkAuth('admin')`

**行為規範**:
- 僅更新提供的欄位（partial update）
- 若更新 `config`，需驗證與 `block_type` 一致
- 更新成功後 `revalidatePath('/store/home')` + `revalidatePath('/admin/announcements')`

#### Contract 5: deleteHomeBlock (管理端刪除)

**簽名**:
```typescript
export async function deleteHomeBlock(blockId: string): Promise<ActionResult<void>>
```

**輸入**: `blockId: string`

**輸出**: `ActionResult<void>`

**權限**: 需要 `checkAuth('admin')`

**行為規範**:
- 刪除區塊記錄前，先查詢 `block_type` 和 `config`
- 若為 `image_carousel` 類型，批次刪除所有圖片檔案
- 圖片刪除失敗時記錄警告但不阻斷主流程（容錯設計）
- 刪除成功後 `revalidatePath('/store/home')` + `revalidatePath('/admin/announcements')`

#### Contract 6: moveBlockUp (管理端上移)

**簽名**:
```typescript
export async function moveBlockUp(blockId: string): Promise<ActionResult<void>>
```

**輸入**: `blockId: string`

**輸出**: `ActionResult<void>`

**權限**: 需要 `checkAuth('admin')`

**行為規範**:
- 查詢當前區塊和上一個區塊（依 sort_order 排序）
- 交換兩個區塊的 `sort_order` 值
- 若當前區塊已是第一個，返回錯誤訊息
- 更新成功後 `revalidatePath('/admin/announcements')`

#### Contract 7: moveBlockDown (管理端下移)

**簽名**:
```typescript
export async function moveBlockDown(blockId: string): Promise<ActionResult<void>>
```

**輸入**: `blockId: string`

**輸出**: `ActionResult<void>`

**權限**: 需要 `checkAuth('admin')`

**行為規範**:
- 查詢當前區塊和下一個區塊（依 sort_order 排序）
- 交換兩個區塊的 `sort_order` 值
- 若當前區塊已是最後一個，返回錯誤訊息
- 更新成功後 `revalidatePath('/admin/announcements')`

#### Contract 8: uploadBlockImage (管理端圖片上傳)

**簽名**:
```typescript
export async function uploadBlockImage(
  blockId: string,
  index: number,
  file: File
): Promise<ActionResult<string>>
```

**輸入**:
- `blockId: string` - 區塊 ID
- `index: number` - 圖片索引（0-4）
- `file: File` - 圖片檔案

**輸出**: `ActionResult<string>` - 圖片公開 URL

**權限**: 需要 `checkAuth('admin')`

**行為規範**:
- 檢查檔案格式（JPG/PNG/WebP）、大小（5MB）
- 儲存路徑: `home-page-blocks/{blockId}/image-{index}.{ext}`
- 上傳前先刪除所有可能的舊圖片（`.jpg` / `.png` / `.webp`）
- 上傳成功後返回公開 URL
- 更新區塊 `config.images[index].url` 欄位
- 更新成功後 `revalidatePath('/admin/announcements')`

#### Contract 9: getProductsByBlockConfig (商品展示區塊查詢)

**簽名**:
```typescript
export async function getProductsByBlockConfig(
  config: ProductDisplayConfig
): Promise<ActionResult<ProductWithPrice[]>>
```

**輸入**:
```typescript
interface ProductDisplayConfig {
  series_ids?: string[] | null
  tag_ids?: string[] | null
  max_items?: number | null
}
```

**輸出**: `ActionResult<ProductWithPrice[]>` - 商品列表（含等級價格）

**行為規範**:
- 查詢條件: 系列 ID + 標籤 ID (AND 邏輯)
- 限制數量: `max_items` 或預設 50
- 整合等級價格查詢（依當前用戶等級）
- 未設定價格的商品仍返回，但 `price` 為 `null`

### C. Quickstart Guide

將建立 `quickstart.md` 文件，包含以下內容：

**章節**:
1. **快速開始**: 如何在前台顯示首頁廣告區塊
2. **前台使用**: Segment Control 切換、區塊渲染器使用
3. **後台管理**: 建立區塊、上傳圖片、調整排序
4. **區塊類型指南**: 三種區塊類型的配置說明
5. **圖片上傳規範**: 格式、大小、命名規則
6. **疑難排解**: 常見問題與解決方案

---

## Phase 2: Implementation Planning

### Phase 0: Setup & Foundational (1-2 天)

**Task 0.1**: 建立資料庫 Migration
- 建立 `supabase/migrations/20260113_home_page_blocks.sql`
- 定義 `home_page_blocks` 表結構
- 建立索引 (`idx_home_blocks_active_sort`, `idx_home_blocks_type`)
- 建立 RLS Policy（客戶端 SELECT、管理端 ALL）
- 建立 `updated_at` 觸發器
- 執行 Migration: `pnpm db:migrate`

**Task 0.2**: 建立 TypeScript 型別定義
- 更新 `types/index.ts`:
  - `HomePageBlock` 型別
  - `ImageCarouselConfig` 型別
  - `ProductDisplayConfig` 型別
  - `TextBlockConfig` 型別

**Task 0.3**: 建立 Zod Validation Schemas
- 建立 `lib/validations/home-block.schema.ts`:
  - `imageCarouselConfigSchema` (Zod)
  - `productDisplayConfigSchema` (Zod)
  - `textBlockConfigSchema` (Zod)
  - `createHomeBlockSchema` (discriminated union)
  - `updateHomeBlockSchema` (partial)

**驗收標準**:
- ✅ Migration 執行成功，表已建立
- ✅ TypeScript 型別檢查通過
- ✅ Zod Schema 測試通過（單元測試）

---

### Phase 1: US1 - 前台路由架構 (1 天)

**Task 1.1**: 前台路由重構
- 修改 `app/(shop)/store/page.tsx`:
  - 新增 `redirect('/store/home')` 永久重定向（301）
- 建立 `app/(shop)/store/home/page.tsx`:
  - 首頁容器（載入廣告區塊）
- 建立 `app/(shop)/store/products/page.tsx`:
  - 移動現有的 `/store/page.tsx` 商品列表內容

**Task 1.2**: Segment Control 元件
- 建立 `components/shop/home-blocks/SegmentControl.tsx`:
  - 兩個按鈕：「首頁」、「商品」
  - 當前頁面高亮（綠色背景 + Neo-Brutalism 陰影）
  - 觸控目標 >= 44px × 44px
  - 響應式設計（手機/桌面）

**Task 1.3**: 前台 Layout 整合
- 修改 `app/(shop)/layout.tsx`:
  - 新增 Segment Control 元件
  - 顯示歡迎字樣：「{用戶名} 您好！會員等級: {等級名稱}」
  - 使用 `usePathname()` 判斷當前頁面高亮

**驗收標準**:
- ✅ 訪問 `/store` 自動重定向到 `/store/home`
- ✅ Segment Control 可切換首頁/商品頁
- ✅ 當前頁面按鈕高亮顯示（綠色背景）
- ✅ 歡迎字樣顯示正確

---

### Phase 2: US2/US3/US4 - 前台區塊顯示 (2-3 天)

**Task 2.1**: 圖片輪播區塊元件
- 建立 `components/shop/home-blocks/ImageCarousel.tsx`:
  - 自動播放邏輯 (`useEffect` + `setInterval`)
  - 指示器圓點（手動切換）
  - 圖片點擊跳轉到系列頁面（若有 `series_id`）
  - 響應式圖片高度（手機 h-64 / 桌面 h-96）
  - Next.js Image 優化載入（`sizes` 屬性）
  - Neo-Brutalism 樣式（黑邊框、硬陰影）

**Task 2.2**: 商品展示區塊元件
- 建立 `components/shop/home-blocks/ProductDisplay.tsx`:
  - 呼叫 `getProductsByBlockConfig()` 查詢商品
  - 使用 `ProductWithPriceCard` 元件顯示商品卡片
  - 響應式網格（手機一排 2 個 / 桌面一排 3 個）
  - CSS scroll-snap 橫向滑動
  - 滑動提示（當商品超過一排時）

**Task 2.3**: 文字區塊元件
- 建立 `components/shop/home-blocks/TextBlock.tsx`:
  - 顯示自訂字體大小與顏色
  - 響應式設計（寬度自適應）
  - Neo-Brutalism 樣式

**Task 2.4**: 區塊渲染器
- 建立 `components/shop/home-blocks/BlockRenderer.tsx`:
  - 依 `block_type` 渲染對應元件
  - 支援三種區塊類型
  - 錯誤處理（未知類型顯示警告）

**Task 2.5**: 首頁整合
- 修改 `app/(shop)/store/home/page.tsx`:
  - 呼叫 `getActiveHomeBlocks()` 查詢區塊
  - 使用 `BlockRenderer` 渲染所有區塊
  - 依 `sort_order` 順序顯示

**驗收標準**:
- ✅ 圖片輪播可自動播放與手動切換
- ✅ 商品展示顯示正確的等級價格
- ✅ 文字區塊顯示自訂字體大小與顏色
- ✅ 所有區塊符合 Neo-Brutalism 設計規範
- ✅ 響應式設計在手機/桌面正常顯示

---

### Phase 3: US5 - 後台區塊管理 (2-3 天)

**Task 3.1**: Server Actions 實作
- 建立 `lib/actions/home-blocks.ts`:
  - `getActiveHomeBlocks()` - 前台查詢
  - `getAllHomeBlocks()` - 管理端查詢
  - `createHomeBlock()` - 建立區塊
  - `updateHomeBlock()` - 更新區塊
  - `deleteHomeBlock()` - 刪除區塊（含圖片清理）
  - `getProductsByBlockConfig()` - 商品展示查詢

**Task 3.2**: 區塊表單元件
- 建立 `components/admin/home-blocks/HomeBlockForm.tsx`:
  - 區塊名稱欄位
  - 區塊類型下拉選單（圖片輪播/商品展示/文字區塊）
  - 啟用狀態開關
  - 依區塊類型顯示對應欄位:
    - 圖片輪播: 上傳圖片（最多 5 張）、自動播放、輪播間隔
    - 商品展示: 選擇系列、選擇標籤、最大顯示數量
    - 文字區塊: 文字內容、字體大小、字體顏色
  - 表單驗證與錯誤提示

**Task 3.3**: 區塊列表元件
- 建立 `components/admin/home-blocks/HomeBlockList.tsx`:
  - 呼叫 `getAllHomeBlocks()` 查詢所有區塊
  - 使用 `HomeBlockCard` 顯示區塊卡片
  - 新增區塊按鈕

**Task 3.4**: 區塊卡片元件
- 建立 `components/admin/home-blocks/HomeBlockCard.tsx`:
  - 顯示縮圖（圖片輪播類型）
  - 顯示區塊名稱、類型、啟用狀態
  - 編輯按鈕、刪除按鈕
  - 上移/下移按鈕（Phase 4 實作）
  - Neo-Brutalism 樣式

**Task 3.5**: 多圖上傳元件
- 建立 `components/admin/home-blocks/ImageUploadMultiple.tsx`:
  - 支援上傳最多 5 張圖片
  - 每張圖片可設定連結系列
  - 圖片預覽與刪除
  - 拖曳排序（可選）

**驗收標準**:
- ✅ 管理員可建立三種類型的區塊
- ✅ 區塊表單依類型顯示對應欄位
- ✅ 區塊列表顯示所有區塊（含停用）
- ✅ 編輯與刪除功能正常運作
- ✅ 圖片上傳成功並顯示預覽

---

### Phase 4: US6 - 區塊排序 (1 天)

**Task 4.1**: 排序 Server Actions
- 擴充 `lib/actions/home-blocks.ts`:
  - `moveBlockUp()` - 上移區塊
  - `moveBlockDown()` - 下移區塊

**Task 4.2**: 排序按鈕整合
- 修改 `components/admin/home-blocks/HomeBlockCard.tsx`:
  - 新增上移/下移按鈕
  - 第一個區塊的上移按鈕禁用（灰色）
  - 最後一個區塊的下移按鈕禁用（灰色）
  - 點擊後重新載入列表

**驗收標準**:
- ✅ 上移/下移按鈕正常運作
- ✅ 第一個/最後一個區塊的按鈕正確禁用
- ✅ 前台立即反映排序變更

---

### Phase 5: US7 - 圖片清理 (1 天)

**Task 5.1**: 圖片上傳 Server Action
- 擴充 `lib/actions/home-blocks.ts`:
  - `uploadBlockImage()` - 上傳圖片並更新 config
  - 檢查檔案格式、大小
  - 刪除舊圖片（所有副檔名）
  - 上傳新圖片
  - 更新區塊 `config.images[index].url`

**Task 5.2**: 圖片清理函式
- 建立 `lib/utils/block-image-cleanup.ts`:
  - `deleteBlockImages()` - 批次刪除區塊圖片
  - 支援四種清理場景:
    1. 刪除區塊: 刪除整個目錄
    2. 更換圖片: 刪除指定索引的圖片
    3. 減少數量: 刪除多餘的圖片
    4. 類型變更: 刪除所有圖片（若新類型不需圖片）
  - 容錯機制: 刪除失敗記錄警告但不拋出錯誤

**Task 5.3**: 整合圖片清理
- 修改 `deleteHomeBlock()`:
  - 刪除前查詢 `block_type` 和 `config`
  - 若為 `image_carousel`，呼叫 `deleteBlockImages()`
  - 刪除失敗記錄警告但繼續執行
- 修改 `updateHomeBlock()`:
  - 若 `block_type` 變更為非 `image_carousel`，呼叫 `deleteBlockImages()`

**驗收標準**:
- ✅ 刪除區塊時自動清理圖片
- ✅ 更換圖片時刪除舊圖片
- ✅ 減少圖片數量時刪除多餘圖片
- ✅ 區塊類型變更時清理圖片
- ✅ 圖片刪除失敗不阻斷主流程

---

### Phase 6: US8 - Tab 整合 (1 天)

**Task 6.1**: Tab 切換器元件
- 建立 `components/admin/announcements/TabSwitcher.tsx`:
  - 兩個 Tab：「商品頁廣告」、「首頁廣告」
  - 使用 URL 查詢參數 `?tab=products` / `?tab=home`
  - 當前 Tab 高亮（綠色背景）
  - Neo-Brutalism 樣式

**Task 6.2**: 廣告管理頁面整合
- 修改 `app/(admin)/admin/announcements/page.tsx`:
  - 新增 `TabSwitcher` 元件
  - 依 Tab 顯示對應內容:
    - `tab=products`: 現有的商品頁廣告列表
    - `tab=home`: 新的首頁廣告區塊列表
  - 預設顯示商品頁廣告

**驗收標準**:
- ✅ Tab 切換器可切換商品頁廣告/首頁廣告
- ✅ URL 查詢參數正確更新
- ✅ 兩個功能互不干擾

---

### Phase 7: Polish & Testing (1-2 天)

**Task 7.1**: 效能優化
- 圖片輪播: 使用 `React.memo()` 避免不必要的重新渲染
- 商品展示: 使用 Next.js Image `priority` 屬性優化首屏載入
- 區塊列表: 使用虛擬滾動（若區塊數量 > 20）

**Task 7.2**: 錯誤處理與 Loading 狀態
- 所有 Server Actions 加入 try-catch
- 前台區塊渲染失敗顯示佔位符（避免白屏）
- 後台表單提交顯示 Loading 動畫

**Task 7.3**: 測試
- 單元測試: Zod Schema 驗證
- 整合測試: Server Actions CRUD 操作
- 手動測試: 前台區塊顯示、後台管理流程
- 跨瀏覽器測試: Chrome、Firefox、Edge
- 行動裝置測試: iOS Safari、Android Chrome

**Task 7.4**: 文件撰寫
- 產生 `research.md`: 整合 Phase 0 研究結果
- 產生 `data-model.md`: 資料表結構與關聯
- 產生 `contracts/`: Server Actions API 合約
- 產生 `quickstart.md`: 快速上手指南

**驗收標準**:
- ✅ 首頁載入時間 < 2 秒（Mobile 4G）
- ✅ 商品查詢時間 < 300ms
- ✅ 圖片輪播切換響應 < 100ms
- ✅ TypeScript 型別檢查通過
- ✅ ESLint 檢查通過
- ✅ 所有測試通過

---

## Timeline Estimation

| Phase | 任務內容 | 預計時間 | 累計時間 |
|-------|---------|---------|---------|
| **Phase 0** | Setup & Foundational | 1-2 天 | 1-2 天 |
| **Phase 1** | US1 - 前台路由架構 | 1 天 | 2-3 天 |
| **Phase 2** | US2/US3/US4 - 前台區塊顯示 | 2-3 天 | 4-6 天 |
| **Phase 3** | US5 - 後台區塊管理 | 2-3 天 | 6-9 天 |
| **Phase 4** | US6 - 區塊排序 | 1 天 | 7-10 天 |
| **Phase 5** | US7 - 圖片清理 | 1 天 | 8-11 天 |
| **Phase 6** | US8 - Tab 整合 | 1 天 | 9-12 天 |
| **Phase 7** | Polish & Testing | 1-2 天 | 10-14 天 |
| **Total** | | **10-14 天** | |

**風險緩衝**: 預留 2-3 天處理意外問題（效能調優、設計調整等）

**最終預估**: **12-17 天**

---

## Risk Mitigation

### 高風險項目

1. **JSONB Config 驗證複雜度**: 不同區塊類型的 config 結構差異大
   - **緩解**: 使用 Zod discriminated union，Phase 0 建立完整的測試案例

2. **圖片清理失敗導致孤兒檔案**: Storage 操作可能因網路錯誤失敗
   - **緩解**: 容錯設計（記錄警告但不阻斷主流程）、未來實作 Cron Job 定期清理孤兒檔案

3. **商品展示效能問題**: 單一區塊查詢 50 個商品可能影響效能
   - **緩解**: 限制最大數量、資料庫索引優化、SSR 快取、使用 Next.js `unstable_cache`

### 中風險項目

4. **前台路由重構影響 SEO**: `/store` 重定向可能影響搜尋引擎排名
   - **緩解**: 使用 301 永久重定向、更新 sitemap.xml、保留舊路由 30 天後再移除

5. **圖片輪播自動播放體驗**: 自動播放可能干擾使用者
   - **緩解**: 手動切換後暫停自動播放、提供暫停按鈕（可選）、預設間隔 5 秒

6. **Tab 切換器狀態管理**: URL 查詢參數可能與現有邏輯衝突
   - **緩解**: 使用 `useSearchParams()` 管理查詢參數、測試與現有功能的相容性

### 低風險項目

7. **Segment Control 觸控目標**: 手機觸控目標可能小於 44px
   - **緩解**: 使用 `min-h-[44px]` 確保符合 WCAG 2.1 AA 標準

8. **圖片格式相容性**: WebP 在舊瀏覽器不支援
   - **緩解**: Next.js Image 自動 fallback 到 JPEG、建議管理員上傳 JPEG 格式

---

## Success Criteria

### 量化指標
- ✅ 8 個 User Story 全部通過驗收測試
- ✅ 首頁載入時間 < 2 秒（Mobile 4G）
- ✅ 商品查詢時間 < 300ms
- ✅ 圖片輪播切換響應 < 100ms
- ✅ TypeScript 型別檢查 0 errors
- ✅ ESLint 檢查 0 errors
- ✅ 圖片清理成功率 > 95%

### 質化指標
- ✅ 所有 UI 元件符合 Neo-Brutalism 設計規範
- ✅ 響應式設計在手機/桌面正常顯示
- ✅ 無障礙支援（ARIA 標籤、鍵盤導航）
- ✅ 使用者反饋：首頁視覺吸引力提升
- ✅ 管理員反饋：區塊管理流程順暢

---

## Next Steps

1. **產生 research.md**: 整合 Phase 0 研究結果（JSONB 設計、圖片清理、CSS scroll-snap、排序機制、Tab 切換器）
2. **產生 data-model.md**: 資料表結構、JSONB Config 定義、索引設計、RLS Policy
3. **產生 contracts/**: 建立所有 Server Actions 的 API 合約文件
4. **產生 quickstart.md**: 建立快速上手指南（前台使用、後台管理、區塊類型指南）
5. **重新評估 Constitution Check**: 確認設計符合憲章（已通過）

**Planning Command Complete** - 準備進入 Phase 0 實作（建立 Migration、型別定義、Zod Schema）
