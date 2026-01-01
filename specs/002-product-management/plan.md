# Implementation Plan: 商品管理系統

**Branch**: `002-product-management` | **Date**: 2026-01-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-product-management/spec.md`

## Summary

建立商品管理系統,包含後台商品與分類的完整 CRUD 功能、庫存管理(支援負庫存)、圖片上傳、搜尋篩選,以及前台商品展示。本功能是「等級綁定價格」機制的基礎,商品建立完成後,將在下一個功能(003-price-management)實作價格設定。

技術方案基於 Phase 0 研究成果:
- **圖片管理**: Supabase Storage 單一 bucket + 固定路徑策略
- **搜尋策略**: 初期使用 ILIKE 查詢,待商品數量成長後升級為 GIN Full-Text Search
- **刪除策略**: 分類採硬刪除+保護檢查,商品採混合策略(有訂單則軟刪除,無訂單則硬刪除)

## Technical Context

**Language/Version**: TypeScript 5.7+
**Primary Dependencies**: Next.js 15.1+, React 19.x, Supabase (@supabase/supabase-js v2.47+)
**Storage**: Supabase PostgreSQL + Supabase Storage
**Testing**: Vitest + React Testing Library (jsdom)
**Target Platform**: Web (桌面端管理介面 + 行動端客戶介面)
**Project Type**: Web Application (前後端整合的 Next.js App Router 專案)
**Performance Goals**:
- 商品列表載入 < 300ms
- 商品搜尋響應 < 200ms
- 圖片上傳 < 2s (5MB)
- 分類篩選 < 100ms
**Constraints**:
- 支援負庫存(不檢查 stock >= 0)
- 圖片大小限制 5MB
- 僅支援 JPG/PNG 格式
- 每個商品只支援單一主圖
**Scale/Scope**:
- 預估初期商品數量 < 500 個
- 預估分類數量 < 20 個
- 管理員並發操作 < 5 人
- 前台客戶瀏覽並發 < 100 人

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ I. 使用者角色優先
- ✅ 後台商品管理介面優化桌面裝置(批量操作、高密度資料顯示)
- ✅ 前台商品列表優化行動裝置(大觸控熱區、簡化篩選)
- ✅ 管理員與客戶使用不同的商品頁面組件

### ✅ II. 等級綁定價格
- ✅ 商品表不包含價格欄位(價格將在 003-price-management 實作)
- ✅ 資料模型為下一階段價格綁定預留 product_id 關聯
- ✅ 前台商品列表不顯示價格(FR-024)

### ✅ III. 使用者故事驅動開發
- ✅ 規格包含 6 個優先級明確的使用者故事(P1: 3個, P2: 3個)
- ✅ 每個故事可獨立測試與交付
- ✅ MVP 範圍: US1-3 (商品基本資料、分類管理、編輯功能)

### ✅ IV. API 模組化與職責分離
- ✅ 所有業務邏輯封裝在 Server Actions
- ✅ UI 元件僅負責呼叫 API 與顯示
- ✅ 所有輸入使用 Zod Schema 驗證
- ✅ 權限檢查統一使用 checkAuth('admin')

### ✅ V. 設計系統一致性
- ✅ 遵循 Neo-Brutalism 風格(2-3px 黑邊框、硬邊陰影)
- ✅ 複用現有 UI 元件(Button, Input, Card, Loading, Error)
- ✅ 新增元件(ImageUpload, SearchInput)遵循相同設計語言

### ✅ VI. 負庫存支援
- ✅ stock 欄位為 INTEGER 無約束(支援 -2^31 ~ 2^31-1)
- ✅ 下單流程不檢查庫存(將在 004-shopping-cart 實作)
- ✅ 前台顯示負庫存為「欠貨 X 單位 (可預購)」(FR-023)

**憲章合規性**: ✅ 完全符合

## Project Structure

### Documentation (this feature)

```text
specs/002-product-management/
├── spec.md              # 功能規格 (/speckit.specify 輸出)
├── plan.md              # 本文件 (/speckit.plan 輸出)
├── research.md          # Phase 0 技術研究 (/speckit.plan 輸出)
├── data-model.md        # Phase 1 資料模型設計 (/speckit.plan 輸出)
├── quickstart.md        # Phase 1 快速上手指南 (/speckit.plan 輸出)
├── contracts/           # Phase 1 API 合約定義 (/speckit.plan 輸出)
│   └── server-actions.md  # Server Actions API 規範
├── checklists/
│   └── requirements.md  # 規格品質檢查清單
└── tasks.md             # Phase 2 任務清單 (/speckit.tasks 輸出 - 尚未建立)
```

### Source Code (repository root)

```text
# Next.js 15 App Router 專案結構 (Web Application)

app/
├── (admin)/admin/           # 後台管理路由群組 (已存在於 001)
│   ├── categories/          # 【新增】分類管理
│   │   ├── page.tsx            # 分類列表頁
│   │   ├── new/page.tsx        # 新增分類頁
│   │   └── [id]/edit/page.tsx  # 編輯分類頁
│   └── products/            # 【新增】商品管理
│       ├── page.tsx            # 商品列表頁
│       ├── new/page.tsx        # 新增商品頁
│       └── [id]/edit/page.tsx  # 編輯商品頁
├── (shop)/                  # 前台客戶路由群組 (已存在於 001)
│   └── store/               # 【更新】商品列表展示
│       ├── page.tsx            # 更新為實際商品列表
│       └── [id]/page.tsx       # 【新增】商品詳情頁
└── globals.css              # 全域樣式 (已存在)

components/
├── ui/                      # 基礎 UI 元件 (已存在於 001)
│   └── image-upload.tsx     # 【新增】圖片上傳元件
├── admin/                   # 後台元件 (已存在於 001)
│   ├── category-table.tsx   # 【新增】分類表格元件
│   ├── category-form.tsx    # 【新增】分類表單元件
│   ├── product-table.tsx    # 【新增】商品表格元件
│   ├── product-form.tsx     # 【新增】商品表單元件
│   └── search-input.tsx     # 【新增】搜尋輸入框元件
└── shop/                    # 【新增】前台元件
    ├── product-card.tsx       # 商品卡片元件
    ├── product-list.tsx       # 商品列表元件
    └── category-filter.tsx    # 分類篩選器元件

lib/
├── actions/                 # Server Actions (已存在於 001)
│   ├── categories.ts        # 【新增】分類 CRUD
│   ├── products.ts          # 【新增】商品 CRUD
│   └── helpers.ts           # 工具函式 (已存在)
├── validations/             # Zod Schemas (已存在於 001)
│   ├── category.schema.ts   # 【新增】分類驗證
│   └── product.schema.ts    # 【新增】商品驗證
└── supabase/                # Supabase Clients (已存在於 001)
    ├── client.ts              # Browser Client
    ├── server.ts              # Server Client
    └── storage.ts             # 【新增】Storage Helper

types/
├── database.types.ts        # 【更新】新增 Category, Product 型別
└── index.ts                 # 【更新】匯出新型別

supabase/migrations/         # SQL Migration 檔案
└── 20260102_products_and_categories.sql  # 【新增】商品與分類表
```

**Structure Decision**:
採用 Next.js 15 App Router 的路由群組設計,延續 001-user-tier-management 的專案結構:
- 使用 `(admin)` 路由群組組織後台管理功能
- 使用 `(shop)` 路由群組組織前台客戶功能
- Server Actions 集中於 `lib/actions/`
- UI 元件依角色分為 `admin/` 與 `shop/`
- 資料庫 Migration 使用時間戳命名,確保執行順序

## Complexity Tracking

**無憲章違反,本節留空。**

所有設計決策符合專案憲章原則,無需額外說明。

---

## Phase 0: Research (已完成)

✅ **輸出**: [research.md](./research.md)

**研究主題**:
1. Supabase Storage 圖片管理策略
2. 資料表設計與索引優化
3. 搜尋與篩選效能實作
4. 負庫存處理機制
5. 刪除保護與資料完整性

**關鍵決策**:
- 單一 `products` bucket + 資料夾結構 (`{product_id}/main.{ext}`)
- Server Action 代理上傳 (非客戶端直傳)
- 混合搜尋策略: ILIKE (初期) → GIN Full-Text Search (擴展)
- 混合刪除策略: 分類硬刪除+保護檢查,商品軟/硬刪除混合

---

## Phase 1: Design & Contracts (已完成)

✅ **輸出**:
- [data-model.md](./data-model.md)
- [contracts/server-actions.md](./contracts/server-actions.md)
- [quickstart.md](./quickstart.md)

### 資料模型設計

**核心實體**:
- `categories` - 商品分類 (id, name, rank, created_at, updated_at)
- `products` - 商品 (id, code, name, description, category_id, stock, unit, image_url, status, created_at, updated_at)

**關聯關係**:
- products.category_id → categories.id (ON DELETE RESTRICT)

**索引策略**:
- B-tree 索引: code (UNIQUE), name, category_id, status
- 預留 GIN Full-Text Search (商品數量 > 1000 時啟用)

**Supabase Storage**:
- Bucket: `products` (public: false, file_size_limit: 5MB)
- RLS: 已認證使用者可讀,管理員可寫入/刪除

### API 合約設計

**Categories CRUD** (5 個 Actions):
- `getCategories()` - 查詢所有分類
- `createCategory(data)` - 建立分類
- `updateCategory(id, data)` - 更新分類
- `deleteCategory(id)` - 刪除分類 (含保護檢查)
- `migrateCategoryProducts(fromId, toId)` - 遷移商品至其他分類 (FR-009-A)

**Products CRUD** (5 個 Actions):
- `getProducts(params)` - 查詢商品列表 (含搜尋、篩選、分頁)
- `getProduct(id)` - 取得單一商品
- `createProduct(data)` - 建立商品
- `updateProduct(id, data)` - 更新商品
- `deleteProduct(id)` - 刪除商品 (混合策略)

**Image Management** (2 個 Actions):
- `uploadProductImage(productId, file)` - 上傳商品圖片
- `deleteProductImage(productId)` - 刪除商品圖片

---

## Phase 2: Tasks (待執行)

**下一步**: 執行 `/speckit.tasks` 指令產生 `tasks.md`

**預期任務分組**:
1. **Phase 1: Database Setup**
   - 執行 Migration (建立 categories, products 表)
   - 建立 Supabase Storage bucket
   - 插入測試資料

2. **Phase 2: Categories Management** (US2)
   - 實作 Categories Server Actions
   - 建立分類列表頁面
   - 建立新增/編輯分類表單

3. **Phase 3: Products CRUD** (US1, US3)
   - 實作 Products Server Actions
   - 建立商品列表頁面
   - 建立新增/編輯商品表單

4. **Phase 4: Image Upload** (US4)
   - 實作圖片上傳 Server Action
   - 建立 ImageUpload UI 元件
   - 整合至商品表單

5. **Phase 5: Search & Filter** (US5)
   - 實作搜尋與篩選邏輯
   - 建立 SearchInput 元件
   - 建立分類篩選器

6. **Phase 6: Frontend Display** (US6)
   - 更新前台商品列表頁面
   - 建立商品卡片元件
   - 整合分類篩選

7. **Phase 7: Testing & Polish**
   - 撰寫 Server Actions 測試
   - 效能優化 (索引驗證)
   - UI 優化與錯誤處理

---

## Implementation Notes

### 與 001-user-tier-management 的整合

本功能依賴 001 的基礎建設:
- ✅ 認證系統 (loginWithEmail, checkAuth)
- ✅ UI 元件庫 (Button, Input, Card, Loading, Error)
- ✅ 後台 Layout 與導航
- ✅ Supabase Clients (client.ts, server.ts)

**新增整合點**:
- 商品表單需使用 `checkAuth('admin')` 驗證管理員權限
- 前台商品列表需透過 session 取得當前使用者的 tier_id (為 003-price-management 預留)
- 後台導航需新增「分類管理」與「商品管理」連結

### 效能優化策略

**初期 (商品數量 < 500)**:
- 使用 ILIKE 查詢 + B-tree 索引
- 分頁每頁 20 筆
- Next.js Image 優化商品圖片

**擴展期 (商品數量 > 1000)**:
- 啟用 GIN Full-Text Search 索引
- 增加快取策略 (revalidateTag)
- 考慮 CDN 加速圖片載入

### 安全性考量

- ✅ 所有 Server Actions 使用 `checkAuth('admin')` 驗證
- ✅ 圖片上傳驗證檔案格式與大小 (5MB, JPG/PNG)
- ✅ 商品編號使用 Zod 正則驗證 (`/^[A-Za-z0-9-_]+$/`)
- ✅ Storage RLS 阻止未授權訪問

### 測試策略

**優先級**:
- **P1**: Categories & Products Server Actions (整合測試)
- **P1**: 刪除保護機制 (單元測試)
- **P2**: 圖片上傳流程 (整合測試)
- **P2**: 搜尋與篩選邏輯 (單元測試)

**測試工具**: Vitest + React Testing Library

---

## Success Metrics

基於 spec.md 定義的成功標準:

- **SC-001**: 管理員可在 2 分鐘內完成新商品建立 (含圖片上傳)
- **SC-002**: 系統 100% 支援負庫存案例 (不阻擋儲存)
- **SC-003**: 圖片上傳成功率 > 95% (5MB 以內合法格式)
- **SC-004**: 商品搜尋響應時間 < 3 秒
- **SC-005**: 商品編號重複註冊阻擋率 100%
- **SC-006**: 分類刪除保護機制生效率 100%
- **SC-007**: 前台庫存顯示準確率 100% (含負庫存顯示)

---

## Terminology *(術語規範)*

**中英文對照**: 本專案採用「中文優先，程式碼用英文」策略

| 中文術語 | 英文術語 (程式碼) | 說明 |
|---------|------------------|------|
| 商品編號 | code | 商品的唯一識別碼，建立後不可修改 |
| 商品名稱 | name | 商品的顯示名稱，可重複 |
| 分類 | category | 商品分類 |
| 庫存 | stock | 可為負數，支援預購 |
| 商品 | product | 商品實體 |
| 單位 | unit | 計量單位 (包、箱、瓶等) |

**使用原則**:
- 文件 (spec.md, plan.md, tasks.md) 使用中文術語
- 程式碼、資料庫欄位、API 參數使用英文術語
- 註解與 commit message 使用繁體中文

## Next Steps

1. **執行 Migration**: 依照 `quickstart.md` 建立資料庫表與測試資料
2. **產生任務清單**: ✅ 已完成 (tasks.md)
3. **開始實作**: 依任務優先級開始開發 (建議從 Categories Management 開始)

**預估開發時間**:
- MVP (US1-3): 3-5 工作天
- 完整功能 (US1-6): 6-8 工作天 (含分類遷移與分頁配置功能)

**規劃完成日期**: 2026-01-02
**規格最後更新**: 2026-01-02 (Edge Cases 決策完成)
