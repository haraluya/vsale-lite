# Tasks: 響應式 UI 適配系統

**Feature**: 005-responsive-ui
**Input**: Design documents from `/specs/005-responsive-ui/`
**Prerequisites**: plan.md, research.md, quickstart.md, docs/responsive-ui-design.md

**Tests**: 本功能為 UI 改造,不包含測試任務。測試將透過手動跨裝置測試完成。

**Organization**: 任務依階段組織,優先完成基礎設施 (P0),再逐步改造後台 (P0) 與前台 (P1)。

---

## Format: `[ID] [P?] Description`

- **[P]**: 可平行執行 (不同檔案,無相依性)
- 包含完整檔案路徑

---

## Phase 1: 基礎設施與設計系統 (P0 - 優先級最高)

**目的**: 建立設計 Token 系統、安裝必要依賴、更新共用元件

**完成標準**: 所有基礎元件支援響應式,設計 Token 系統可用

### 1.1 環境設定與依賴

- [X] T001 安裝 shadcn/ui Sheet 元件 (`npx shadcn@latest add sheet`)
- [X] T002 驗證 `tailwind.config.ts` 包含響應式 shadow 定義 (neo / neo-sm / neo-lg)

### 1.2 設計 Token 系統

- [X] T003 建立設計 Token 定義檔案 `lib/design-tokens.ts`
- [X] T004 實作 `getNeoBrutalismClasses()` 工具函式於 `lib/design-tokens.ts`
- [X] T005 實作 `getPageContainerClasses()` 工具函式於 `lib/design-tokens.ts`

### 1.3 基礎 UI 元件改造

- [X] T006 [P] 更新 Button 元件支援響應式尺寸 (`components/ui/button.tsx`)
- [X] T007 [P] 更新 Input 元件支援響應式間距與文字 (`components/ui/input.tsx`)
- [X] T008 [P] 修改 Sheet 元件樣式整合 Neo-Brutalism 風格 (`components/ui/sheet.tsx`)

### 1.4 憲章文件更新

- [X] T009 更新 `CLAUDE.md` 新增「核心憲章原則 VII - 響應式設計規範」
- [X] T010 修改 `CLAUDE.md` 中「核心憲章原則 I - 使用者角色優先」
- [X] T011 修改 `CLAUDE.md` 中「核心憲章原則 V - 設計系統一致性」

**Checkpoint**: 基礎設施完成,可開始後台改造

---

## Phase 2: 後台 Sidebar 與 Layout (P0 - 關鍵改造)

**目的**: 實作後台響應式導航 (手機漢堡菜單 / 平板收縮 / 桌面展開)

**完成標準**: 後台在手機/平板/桌面正常運作,Sidebar 響應式切換流暢

### 2.1 Sidebar 響應式改造

- [X] T012 修改 `components/admin/sidebar.tsx` 實作響應式布局
  - 手機版: 完全隱藏 (`hidden md:flex`)
  - 平板版: 收縮為圖示列 (`md:w-16`,僅圖示)
  - 桌面版: 完整展開 (`lg:w-64`,圖示+文字)
  - Logo 響應式切換 (平板僅圖示 / 桌面完整)
  - 導航項目響應式 (平板正方形按鈕 / 桌面完整按鈕)

### 2.2 手機版導航元件

- [X] T013 [P] 建立手機版漢堡按鈕元件 `components/admin/mobile-nav.tsx`
- [X] T014 [P] 建立手機版 Sidebar 內容元件 `components/admin/mobile-sidebar.tsx`

### 2.3 Admin Layout 整合

- [X] T015 修改 `app/(admin)/admin/layout.tsx` 整合響應式 Sidebar 與 MobileNav
  - 整合 `<MobileNav />` (手機版)
  - 整合 `<Sidebar />` (平板/桌面版)
  - 統一 Main Content 間距 (`p-4 md:p-6 lg:p-8`)
  - 統一容器寬度 (`max-w-7xl`)

**Checkpoint**: 後台 Sidebar 響應式完成,測試手機/平板/桌面切換

---

## Phase 3: 後台表格元件改造 (P0 - 關鍵改造)

**目的**: 實作表格響應式 (桌面版完整表格 / 手機版卡片視圖)

**完成標準**: 訂單表格與客戶表格在手機版顯示卡片視圖,桌面版顯示完整表格

### 3.1 訂單表格響應式

- [X] T016 修改 `components/admin/order-table.tsx` 實作響應式表格/卡片視圖
  - 桌面版: 完整表格 (`hidden lg:block`)
  - 手機版: 卡片視圖 (`lg:hidden space-y-3 md:space-y-4`)
  - 卡片資訊層級: 訂單編號 / 客戶資訊 / 狀態 / 金額 / 時間
  - 卡片可點擊導向詳情頁
  - 優化 OrderStatusBadge 支援 `size="sm"` prop

### 3.2 客戶表格響應式

- [X] T017 修改 `components/admin/client-table.tsx` 實作響應式表格/卡片視圖
  - 桌面版: 完整表格 (`hidden lg:block`)
  - 手機版: 卡片視圖 (`lg:hidden space-y-3 md:space-y-4`)
  - 卡片資訊層級: 姓名 / 手機號碼 / 等級 / 狀態 / 註冊時間
  - 優化 TierBadge 與 StatusBadge 支援 `size="sm"` prop

### 3.3 其他表格響應式 (P1 - 可延後)

- [X] T018 [P] 修改 `components/admin/product-table.tsx` 實作響應式表格/卡片視圖
- [X] T019 [P] 修改 `components/admin/tier-table.tsx` 優化間距與文字尺寸
- [X] T020 [P] 修改 `components/admin/category-table.tsx` 優化間距與文字尺寸

**Checkpoint**: 後台表格響應式完成,測試手機卡片視圖與桌面表格

---

## Phase 4: 後台頁面容器統一化 (P0)

**目的**: 統一所有後台頁面的容器寬度、間距與文字尺寸

**完成標準**: 所有後台頁面使用一致的設計 Token

### 4.1 訂單管理頁面

- [X] T021 [P] 修改 `app/(admin)/admin/orders/page.tsx` 統一容器與間距
- [X] T022 [P] 修改 `app/(admin)/admin/orders/[id]/page.tsx` 統一容器與間距,實作響應式布局
  - 訂單資訊雙欄布局 (桌面版) / 單欄布局 (手機版)
  - 標題響應式文字尺寸
  - 返回按鈕響應式尺寸

### 4.2 客戶管理頁面

- [X] T023 [P] 修改 `app/(admin)/admin/clients/page.tsx` 統一容器與間距
- [X] T024 [P] 修改 `app/(admin)/admin/tiers/page.tsx` 統一容器與間距

### 4.3 商品管理頁面

- [X] T025 [P] 修改 `app/(admin)/admin/products/page.tsx` 統一容器與間距
- [X] T026 [P] 修改 `app/(admin)/admin/categories/page.tsx` 統一容器與間距
- [X] T027 [P] 修改 `app/(admin)/admin/series/page.tsx` 統一容器與間距

### 4.4 儀表板與其他頁面

- [X] T028 [P] 修改 `app/(admin)/admin/dashboard/page.tsx` 統一容器與間距

**Checkpoint**: 所有後台頁面容器統一化完成 ✅

---

## Phase 5: 前台響應式優化 (P1)

**目的**: 優化前台頁面容器、間距與圖片載入

**完成標準**: 前台在手機/桌面正常顯示,圖片載入優化

### 5.1 Navbar 優化

- [X] T029 修改 `components/shop/navbar.tsx` 優化響應式
  - 優化間距 (`p-3 md:p-4`)
  - 優化按鈕尺寸 (使用 Button 元件響應式尺寸)
  - 移除重複的用戶資訊區塊 (合併為一個,使用響應式顯示)

### 5.2 前台頁面容器統一化

- [ ] T030 [P] 修改 `app/(shop)/store/page.tsx` 統一容器與間距
- [ ] T031 [P] 修改 `app/(shop)/store/[seriesId]/page.tsx` 統一容器與間距 (系列商品列表)
- [ ] T032 [P] 修改 `app/(shop)/store/cart/page.tsx` 統一容器與間距
- [ ] T033 [P] 修改 `app/(shop)/store/orders/page.tsx` 統一容器與間距
- [ ] T034 [P] 修改 `app/(shop)/store/orders/[id]/page.tsx` 統一容器與間距

### 5.3 商品相關元件優化

- [ ] T035 [P] 修改 `components/shop/product-card.tsx` 優化響應式
  - 邊框與陰影 (`border-2 md:border-3 shadow-neo-sm md:shadow-neo`)
  - 間距優化 (`p-3 md:p-4`)
  - 文字尺寸響應式

- [ ] T036 [P] 修改 `components/shop/series-card.tsx` 優化響應式
  - 邊框與陰影響應式
  - 間距優化
  - 文字尺寸響應式

### 5.4 購物車元件優化

- [ ] T037 修改 `components/shop/cart-item.tsx` 優化響應式
  - 圖片尺寸響應式 (`h-16 w-16 md:h-24 md:w-24`)
  - 間距優化
  - 文字尺寸響應式

**Checkpoint**: 前台響應式優化完成

---

## Phase 6: 圖片與媒體優化 (P1)

**目的**: 優化圖片載入速度,使用 Next.js Image `sizes` 屬性

**完成標準**: 所有圖片使用 `sizes` 屬性,載入速度改善

### 6.1 商品圖片優化

- [ ] T038 [P] 修改 `components/shop/product-card.tsx` 新增 Image `sizes` 屬性
  - `sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"`

- [ ] T039 [P] 修改 `components/shop/series-card.tsx` 新增 Image `sizes` 屬性
  - `sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"`

### 6.2 購物車與訂單圖片優化

- [ ] T040 [P] 修改 `components/shop/cart-item.tsx` 新增 Image `sizes` 屬性
  - `sizes="96px"` (固定尺寸)

- [ ] T041 [P] 修改訂單明細相關元件圖片 (如有使用 Image 元件)

**Checkpoint**: 圖片優化完成,驗證載入速度改善

---

## Phase 7: 批量文字尺寸優化 (P1)

**目的**: 批量修改所有頁面標題文字尺寸為響應式

**完成標準**: 所有標題使用響應式文字尺寸

### 7.1 批量查找與修改

- [ ] T042 使用 Grep 查找所有 `text-3xl` 或 `text-4xl` 的頁面標題
- [ ] T043 批量修改頁面標題為響應式文字尺寸
  - `text-4xl` → `text-2xl md:text-3xl lg:text-4xl`
  - `text-3xl` → `text-xl md:text-2xl lg:text-3xl`
  - `text-2xl` → `text-lg md:text-xl lg:text-2xl`

### 7.2 區塊標題優化

- [ ] T044 批量修改區塊標題 (h2) 為響應式文字尺寸
- [ ] T045 批量修改次標題 (h3) 為響應式文字尺寸

**Checkpoint**: 所有文字尺寸響應式完成

---

## Phase 8: 測試與驗證 (P0 - 必須完成)

**目的**: 跨裝置測試與可訪問性驗證

**完成標準**: 所有測試通過,無橫向滾動,觸控目標 >= 44px

### 8.1 視覺測試 (Chrome DevTools)

- [ ] T046 測試手機直屏 (375px × 667px - iPhone SE)
  - 檢查無橫向滾動
  - 檢查 Sidebar 完全隱藏,漢堡菜單可運作
  - 檢查表格切換為卡片視圖
  - 檢查文字可清晰閱讀
  - 檢查按鈕觸控目標 >= 44px

- [ ] T047 測試手機大屏 (414px × 896px - iPhone Pro Max)
  - 檢查布局正常
  - 檢查間距適當

- [ ] T048 測試平板直屏 (768px × 1024px - iPad)
  - 檢查 Sidebar 收縮為圖示列 (w-16)
  - 檢查表格仍為卡片視圖或開始顯示表格 (視設計決策)
  - 檢查間距增加 (md: 斷點生效)

- [ ] T049 測試平板橫屏 (1024px × 768px - iPad 橫屏)
  - 檢查 Sidebar 完整展開 (w-64)
  - 檢查表格切換為完整表格
  - 檢查文字尺寸增加 (lg: 斷點生效)

- [ ] T050 測試桌面 (1280px × 800px)
  - 檢查所有元素正常顯示
  - 檢查容器寬度限制 (max-w-7xl)
  - 檢查 Neo-Brutalism 風格完整 (border-3 / shadow-neo)

- [ ] T051 測試大桌面 (1920px × 1080px)
  - 檢查容器置中且寬度限制
  - 檢查無過度留白

### 8.2 跨瀏覽器測試

- [ ] T052 [P] 測試 Chrome (最新版)
- [ ] T053 [P] 測試 Safari (macOS/iOS)
- [ ] T054 [P] 測試 Firefox (最新版)
- [ ] T055 [P] 測試 Edge (最新版)

### 8.3 可訪問性測試

- [ ] T056 使用 Chrome Lighthouse 執行可訪問性評分
  - 目標: Accessibility 評分 >= 95

- [ ] T057 使用 axe DevTools 檢測可訪問性問題
  - 確保無 Critical 或 Serious 問題

- [ ] T058 手動鍵盤導航測試
  - Tab / Shift+Tab 可正常導航
  - Enter 可觸發按鈕
  - Esc 可關閉 Drawer / Modal
  - 焦點順序合理

### 8.4 效能測試

- [ ] T059 使用 Chrome DevTools Network 測試圖片載入
  - 檢查 `sizes` 屬性是否生效
  - 檢查下載的圖片尺寸是否符合預期

- [ ] T060 使用 Chrome DevTools Performance 測試頁面載入
  - 檢查 First Contentful Paint < 1.5 秒

**Checkpoint**: 所有測試通過,響應式 UI 適配完成

---

## Phase 9: 文件與收尾 (P1)

**目的**: 更新文件、建立 Screenshot、清理程式碼

**完成標準**: 文件完整,團隊成員理解新規範

### 9.1 文件更新

- [ ] T061 建立 `docs/design-tokens.md` 設計 Token 使用文件
- [ ] T062 建立 `docs/responsive-guide.md` 響應式開發指南
- [ ] T063 建立 `docs/component-responsive-checklist.md` 元件響應式檢查清單

### 9.2 Screenshot 文件 (可選)

- [ ] T064 [P] 建立後台 Sidebar 響應式效果對比圖 (手機/平板/桌面)
- [ ] T065 [P] 建立訂單表格響應式效果對比圖 (手機卡片 vs 桌面表格)
- [ ] T066 [P] 建立前台商品列表響應式效果對比圖 (1欄/2欄/3欄)

### 9.3 程式碼清理

- [ ] T067 移除未使用的響應式類別或註解
- [ ] T068 確保所有響應式類別按順序排列 (預設 → sm → md → lg → xl)
- [ ] T069 執行 TypeScript 型別檢查 (`pnpm type-check`)
- [ ] T070 執行 ESLint 檢查 (`pnpm lint`)

**Checkpoint**: 響應式 UI 適配系統完成,文件齊全

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (基礎設施)**: 無相依性,可立即開始 - **MUST 最先完成**
- **Phase 2 (後台 Sidebar)**: 依賴 Phase 1 完成 (需要設計 Token 與 Sheet 元件)
- **Phase 3 (後台表格)**: 依賴 Phase 1 完成 (需要設計 Token)
- **Phase 4 (後台頁面)**: 依賴 Phase 1-3 完成 (需要統一的設計 Token 與元件)
- **Phase 5 (前台優化)**: 依賴 Phase 1 完成 (需要設計 Token)
- **Phase 6 (圖片優化)**: 可與 Phase 5 平行執行
- **Phase 7 (文字優化)**: 可在 Phase 4-5 完成後執行
- **Phase 8 (測試)**: 依賴 Phase 1-7 完成 - **MUST 在部署前完成**
- **Phase 9 (文件)**: 可在開發過程中持續進行,最後收尾

### Critical Path (最短實作路徑)

```
Phase 1 (基礎設施)
  → Phase 2 (後台 Sidebar)
  → Phase 3 (後台表格)
  → Phase 8 (測試)
  → 完成
```

### Parallel Opportunities (平行執行機會)

**Phase 1 內部平行**:
- T006, T007, T008 (Button / Input / Sheet 元件改造)
- T009, T010, T011 (憲章文件更新)

**Phase 3 內部平行**:
- T018, T019, T020 (其他表格改造)

**Phase 4 內部平行**:
- 所有頁面修改任務 (T021-T028) 可平行執行

**Phase 5 內部平行**:
- T030-T034 (前台頁面容器統一化)
- T035, T036 (商品卡片元件優化)

**Phase 6 內部平行**:
- T038-T041 (圖片優化)

**跨 Phase 平行**:
- Phase 5 (前台) 與 Phase 2-4 (後台) 可由不同開發者平行執行
- Phase 6 (圖片) 可與 Phase 5 平行執行
- Phase 9 (文件) 可在開發過程中持續進行

---

## Implementation Strategy

### MVP First (最小可行產品)

**目標**: 優先完成後台響應式改造 (應急查看場景)

1. **Phase 1**: 基礎設施 (3-4 小時)
2. **Phase 2**: 後台 Sidebar (4-6 小時)
3. **Phase 3**: 後台表格 (訂單 + 客戶) (6-8 小時)
4. **Phase 8**: 測試驗證 (2-3 小時)
5. **STOP 並驗證**: 後台可在手機/平板/桌面正常使用
6. **部署/展示**: 後台響應式 MVP 完成 ✅

**預估時間**: 15-21 小時 (2-3 個工作日)

### Incremental Delivery (漸進式交付)

**第一階段** (後台響應式 - P0):
- Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 8 → 部署

**第二階段** (前台優化 - P1):
- Phase 5 → Phase 6 → Phase 7 → Phase 8 (重測) → 部署

**第三階段** (文件與收尾 - P1):
- Phase 9 → 完成

### Parallel Team Strategy (多人平行開發)

**如有 2 位開發者**:

**Developer A**:
1. Phase 1 (基礎設施) - 共同完成
2. Phase 2-4 (後台改造)
3. Phase 8 (後台測試)

**Developer B**:
1. Phase 1 (基礎設施) - 共同完成
2. Phase 5-7 (前台優化)
3. Phase 8 (前台測試)

**最後共同**:
- Phase 9 (文件與收尾)

---

## Notes

- **[P]** 標記的任務可平行執行 (不同檔案,無相依性)
- 所有任務包含完整檔案路徑
- 每完成一個 Phase 應執行對應的 Checkpoint 測試
- 使用 Git Commit 記錄每個 Phase 完成 (繁體中文 commit message)
- 遵循 Mobile-First 開發策略 (從手機版開始,逐步增強)
- 優先使用設計 Token 而非硬編碼樣式
- 確保所有觸控目標 >= 44px × 44px (WCAG 2.1 AA 標準)
- 避免過度使用響應式類別,保持可讀性

---

## 總結

**總任務數**: 70 個任務

**任務分布**:
- Phase 1 (基礎設施): 11 個任務
- Phase 2 (後台 Sidebar): 4 個任務
- Phase 3 (後台表格): 5 個任務
- Phase 4 (後台頁面): 8 個任務
- Phase 5 (前台優化): 9 個任務
- Phase 6 (圖片優化): 4 個任務
- Phase 7 (文字優化): 4 個任務
- Phase 8 (測試驗證): 15 個任務
- Phase 9 (文件收尾): 10 個任務

**平行執行機會**: 約 30 個任務可平行執行 (標記 [P])

**預估時間**:
- MVP (後台響應式): 15-21 小時 (2-3 個工作日)
- 完整實作 (前台+後台): 40-60 小時 (5-8 個工作日)
- 多人平行開發: 25-35 小時 (3-5 個工作日)

**建議 MVP 範圍**: Phase 1-4 + Phase 8 (後台測試) = 後台響應式完成

---

**Generated**: 2026-01-04
**Feature**: 005-responsive-ui
**Status**: Ready for Implementation
