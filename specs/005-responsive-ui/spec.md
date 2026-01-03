# Feature Specification: 響應式 UI 適配系統

**Feature Branch**: `005-responsive-ui`
**Created**: 2026-01-04
**Status**: Draft
**Input**: 實作前後台全面響應式 UI 適配,統一設計系統,支援手機/平板/桌面三種裝置,改造後台 Sidebar、表格元件,優化前台間距與文字尺寸

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 管理員使用手機查看訂單列表 (Priority: P0)

**場景描述**:
管理員外出時需要使用手機查看新訂單並進行確認操作。當前後台僅針對桌面優化,手機版 Sidebar 固定寬度(256px)會溢出視口,表格橫向滾動體驗差。

**為何是 P0**:
後台支援手機響應式是應急查看與操作的必要場景,訂單確認的即時性對業務至關重要。

**獨立測試方式**:
使用手機(375px 寬度)訪問 `/admin/orders`,能正常瀏覽訂單列表(卡片視圖)、使用漢堡菜單導航,無橫向滾動,所有功能可正常操作。

**Acceptance Scenarios**:

1. **Given** 管理員使用 iPhone SE(375px)登入後台,**When** 訪問訂單列表頁,**Then** 顯示卡片視圖(每筆訂單一張卡片),包含訂單編號、客戶、狀態、金額、時間,無需橫向滾動
2. **Given** 管理員在手機版後台頁面,**When** 點擊左上角漢堡按鈕,**Then** 從左側滑出導航 Drawer,顯示完整導航選單(含圖示與文字)
3. **Given** Sidebar Drawer 已開啟,**When** 點擊任一導航項目,**Then** 導航到對應頁面並自動關閉 Drawer
4. **Given** 管理員在平板(768px)訪問後台,**When** 瀏覽任一頁面,**Then** Sidebar 收縮為圖示列(64px 寬度),僅顯示圖示
5. **Given** 管理員在桌面(1280px)訪問後台,**When** 瀏覽任一頁面,**Then** Sidebar 完整展開(256px 寬度),顯示圖示與文字

---

### User Story 2 - 客戶使用手機瀏覽商品並加入購物車 (Priority: P0)

**場景描述**:
客戶主要使用手機下單,當前前台雖已採用手機優先設計,但部分元件存在硬編碼尺寸(如購物車商品圖片固定 96px),在小屏幕壓縮商品資訊空間,影響閱讀體驗。

**為何是 P0**:
前台是客戶的主要使用場景,商品瀏覽與購物車體驗直接影響下單轉換率。

**獨立測試方式**:
使用手機(375px)訪問 `/store`,瀏覽商品列表、查看商品詳情、加入購物車、查看購物車,所有文字可清晰閱讀,按鈕可輕鬆點擊(觸控目標 >= 44px)。

**Acceptance Scenarios**:

1. **Given** 客戶使用手機訪問商品列表頁,**When** 滾動瀏覽商品卡片,**Then** 每張卡片顯示清晰(單欄布局),圖片自適應,間距適中(16px),邊框與陰影較桌面版輕量(2px 邊框 + 2px 陰影)
2. **Given** 客戶在手機版查看購物車,**When** 瀏覽購物車項目,**Then** 商品圖片尺寸為 64px×64px(而非桌面版 96px),留出更多空間給商品名稱與價格資訊
3. **Given** 客戶在平板(768px)訪問商品列表,**When** 瀏覽頁面,**Then** 顯示雙欄 Grid 布局,卡片間距增加至 24px
4. **Given** 客戶在桌面(1280px)訪問商品列表,**When** 瀏覽頁面,**Then** 顯示三欄 Grid 布局,卡片使用完整 Neo-Brutalism 風格(3px 邊框 + 4px 陰影)
5. **Given** 客戶在任意裝置,**When** 點擊任何按鈕或連結,**Then** 觸控目標區域至少 44px × 44px,可輕鬆點擊

---

### User Story 3 - 開發者新增頁面時使用統一設計 Token (Priority: P1)

**場景描述**:
開發者新增頁面時,當前需要手動撰寫響應式樣式,容器寬度、間距、文字尺寸不統一(max-w-7xl / max-w-4xl 混用,p-4 / p-8 混用),導致視覺不一致。

**為何是 P1**:
統一設計 Token 系統可提升開發效率、保證視覺一致性,減少 Code Review 負擔。

**獨立測試方式**:
開發者新增一個訂單詳情頁面,使用 `lib/design-tokens.ts` 提供的 Token,快速完成響應式布局,無需自訂樣式。

**Acceptance Scenarios**:

1. **Given** 開發者需要建立新頁面,**When** 使用 `getPageContainerClasses('default')` 工具函式,**Then** 自動套用統一的容器寬度(max-w-7xl)、間距(p-4 md:p-6 lg:p-8)、垂直間距(space-y-4 md:space-y-6 lg:space-y-8)
2. **Given** 開發者需要建立卡片元件,**When** 使用 `designTokens.neoBrutalism.border.full` 與 `designTokens.neoBrutalism.shadow.full`,**Then** 自動套用響應式邊框(2px → 3px)與陰影(2px → 4px)
3. **Given** 開發者需要新增標題,**When** 使用 `designTokens.typography.h1`,**Then** 自動套用響應式文字尺寸(text-2xl md:text-3xl lg:text-4xl)
4. **Given** 開發者建立按鈕,**When** 使用統一的 `Button` 元件,**Then** 自動套用響應式尺寸(px-4 py-2 md:px-6 md:py-3)與 Neo-Brutalism 風格

---

### User Story 4 - 設計師檢視所有裝置尺寸的視覺一致性 (Priority: P2)

**場景描述**:
設計師需要驗證 Neo-Brutalism 風格在所有裝置上的一致性,確保手機版不會因過重的邊框與陰影壓縮內容空間。

**為何是 P2**:
視覺一致性是品牌識別的重要部分,但在核心功能完成後進行整體檢視即可。

**獨立測試方式**:
使用 Chrome DevTools 響應式模式,在手機(375px)、平板(768px)、桌面(1280px)三種尺寸下瀏覽所有頁面,檢查邊框、陰影、間距是否符合設計規範。

**Acceptance Scenarios**:

1. **Given** 設計師在手機版(375px)檢視所有卡片元件,**When** 測量邊框與陰影尺寸,**Then** 邊框為 2px,陰影為 2px 2px 0px 0px(shadow-neo-sm)
2. **Given** 設計師在桌面版(1280px)檢視相同卡片,**When** 測量邊框與陰影尺寸,**Then** 邊框為 3px,陰影為 4px 4px 0px 0px(shadow-neo)
3. **Given** 設計師比對手機版與桌面版頁面標題,**When** 測量字體大小,**Then** 手機版為 24px(text-2xl),桌面版為 36px(text-4xl),比例協調
4. **Given** 設計師檢視所有頁面容器,**When** 測量容器寬度,**Then** 一般頁面統一使用 max-w-7xl(1280px),表單頁面使用 max-w-4xl(896px)

---

### Edge Cases

- **極小屏幕(320px)**: 如何確保 Sidebar 漢堡按鈕不與頁面內容重疊? 使用 `fixed top-4 left-4 z-50` 定位
- **超大桌面(2560px)**: 容器是否無限制放大? 使用 `max-w-7xl`(1280px)或 `max-w-screen-2xl`(1536px)限制最大寬度
- **觸控裝置**: 按鈕是否符合 WCAG 2.1 AA 標準(44px × 44px)? 所有按鈕使用響應式尺寸確保符合標準
- **平板橫屏與直屏切換**: Sidebar 是否正常切換? 使用斷點(md: 768px / lg: 1024px)確保正確渲染
- **圖片載入失敗**: 是否顯示 placeholder? 使用 Next.js Image 的 `placeholder="blur"` 或預設圖片
- **表格資料過多**: 手機版卡片是否過長導致滾動困難? 限制每張卡片顯示關鍵資訊,詳情點擊進入詳情頁

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系統必須在手機(<640px)、平板(640-1024px)、桌面(>1024px)三種裝置類型提供適配的 UI
- **FR-002**: 後台 Sidebar 必須實作三階段響應式: 手機版完全隱藏(由漢堡菜單觸發 Drawer),平板版收縮為圖示列(w-16),桌面版完整展開(w-64)
- **FR-003**: 後台所有表格(OrderTable、ClientTable)必須在桌面版顯示完整表格,手機版顯示卡片視圖
- **FR-004**: 所有頁面容器寬度必須統一: 一般頁面 `max-w-7xl`,表單頁面 `max-w-4xl`
- **FR-005**: 所有間距必須使用響應式 Token: 頁面外層 `p-4 md:p-6 lg:p-8`,卡片內距 `p-4 md:p-6`
- **FR-006**: 所有標題文字必須使用響應式尺寸: h1 `text-2xl md:text-3xl lg:text-4xl`,h2 `text-xl md:text-2xl lg:text-3xl`
- **FR-007**: Neo-Brutalism 元素(邊框、陰影)必須實作響應式: 手機版 `border-2 shadow-neo-sm`,桌面版 `md:border-3 md:shadow-neo`
- **FR-008**: 所有按鈕與輸入框必須實作響應式尺寸: 按鈕 `px-4 py-2 md:px-6 md:py-3`,輸入框 `px-3 py-2 md:px-4 md:py-2.5`
- **FR-009**: 所有圖片必須使用 Next.js Image 元件,並設定 `sizes` 屬性優化載入
- **FR-010**: 所有可點擊元素(按鈕、連結)的觸控目標區域必須 >= 44px × 44px(符合 WCAG 2.1 AA 標準)
- **FR-011**: 系統必須建立統一的設計 Token 定義檔(`lib/design-tokens.ts`),供所有元件使用
- **FR-012**: 所有響應式類別必須按順序排列(預設 → sm → md → lg → xl),並使用 `cn()` 工具函式組合

### Key Entities *(include if feature involves data)*

此功能主要是 UI 改造,不涉及新資料實體,但會修改以下現有元件:

- **Sidebar(後台側邊欄)**: 響應式改造(手機隱藏、平板收縮、桌面展開)
- **MobileNav(手機版導航)**: 新增漢堡按鈕與 Drawer 觸發器
- **MobileSidebar(手機版側邊欄內容)**: Drawer 內顯示的完整導航選單
- **OrderTable(訂單表格)**: 桌面版完整表格,手機版卡片視圖
- **ClientTable(客戶表格)**: 桌面版完整表格,手機版卡片視圖
- **Button(按鈕元件)**: 響應式尺寸(sm/md/lg)與 Neo-Brutalism 風格
- **Input(輸入框元件)**: 響應式間距與文字尺寸
- **設計 Token 系統**: `lib/design-tokens.ts`,集中定義容器寬度、間距、文字尺寸、Neo-Brutalism 樣式

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 所有後台頁面在手機版(375px)無橫向滾動,所有內容可正常瀏覽
- **SC-002**: 管理員可使用手機完成訂單查看與確認操作,操作時間不超過桌面版的 1.5 倍
- **SC-003**: 所有前台頁面在手機/平板/桌面三種裝置均可正常使用,文字可清晰閱讀(對比度符合 WCAG 2.1 AA)
- **SC-004**: 所有可點擊元素的觸控目標區域 >= 44px × 44px,95% 的點擊操作一次成功
- **SC-005**: 手機版商品卡片圖片載入時間 < 1 秒(使用 `sizes` 屬性優化)
- **SC-006**: 開發者新增頁面時,使用設計 Token 系統可減少 50% 的樣式撰寫時間
- **SC-007**: 所有頁面在 Chrome DevTools 響應式模式測試通過(375px / 768px / 1280px)
- **SC-008**: 桌面版視覺效果與原設計一致(Neo-Brutalism 風格不降級)
- **SC-009**: 手機版頁面載入速度不受響應式樣式影響(First Contentful Paint < 1.5 秒)
- **SC-010**: 所有元件通過可訪問性測試(鍵盤導航、ARIA 標籤、語意化 HTML)

## Assumptions *(optional)*

- 假設使用 Tailwind CSS 預設斷點系統(sm: 640px, md: 768px, lg: 1024px, xl: 1280px),不需自訂
- 假設 Neo-Brutalism 設計風格為核心品牌識別,必須在所有裝置保持一致性(僅調整邊框與陰影尺寸)
- 假設管理員手機使用場景為應急查看與操作,非主要使用場景(主要仍為桌面)
- 假設客戶主要使用場景為手機(80%),桌面為輔(20%)
- 假設專案已安裝 shadcn/ui Sheet 元件(用作 Drawer),若未安裝需使用 `npx shadcn@latest add sheet`
- 假設所有圖片已使用 Next.js Image 元件,僅需新增 `sizes` 屬性
- 假設專案使用 Zustand 狀態管理(購物車),Drawer 開關狀態可使用 React State 管理

## Dependencies *(optional)*

- **Tailwind CSS v4.0**: 響應式樣式基礎
- **shadcn/ui Sheet 元件**: 用作手機版 Sidebar Drawer
- **Next.js Image 元件**: 圖片優化與 `sizes` 屬性
- **Lucide React**: 圖示(漢堡菜單、關閉按鈕)
- **cn() 工具函式**: `lib/utils.ts`,組合 className

## Scope Boundaries *(optional)*

### In Scope(包含範圍)
- ✅ 後台 Sidebar 響應式改造(手機/平板/桌面三階段)
- ✅ 後台表格元件卡片視圖實作(OrderTable、ClientTable)
- ✅ 前台頁面間距與文字尺寸統一化
- ✅ 設計 Token 系統建立(`lib/design-tokens.ts`)
- ✅ 基礎 UI 元件響應式改造(Button、Input)
- ✅ 圖片 `sizes` 屬性優化
- ✅ Neo-Brutalism 元素響應式調整(邊框、陰影)
- ✅ 手機版導航元件(MobileNav、MobileSidebar)
- ✅ 跨裝置測試與文件撰寫

### Out of Scope(排除範圍)
- ❌ 桌面版設計風格變更(保持與原設計一致)
- ❌ 新增動畫效果(如 Drawer 滑入動畫,可使用 shadcn/ui 預設)
- ❌ 效能優化(如 Code Splitting、Lazy Loading,可後續優化)
- ❌ 暗黑模式支援(未來擴充功能)
- ❌ 其他表格元件改造(ProductTable、TierTable、CategoryTable 列為 P1-P2,可延後實作)
- ❌ 前台 Navbar 重構(僅優化間距,不改變結構)

## Related Documents *(optional)*

- **設計文件**: [docs/responsive-ui-design.md](../../../docs/responsive-ui-design.md) - 完整設計方案與實作計畫
- **憲章文件**: [CLAUDE.md](../../../CLAUDE.md) - 專案核心憲章原則(需更新響應式設計規範)
- **Tailwind 配置**: [tailwind.config.ts](../../../tailwind.config.ts) - Neo-Brutalism 陰影定義
- **工具函式**: [lib/utils.ts](../../../lib/utils.ts) - `cn()` 工具函式
