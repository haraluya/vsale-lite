# Implementation Plan: 響應式 UI 適配系統

**Branch**: `005-responsive-ui` | **Date**: 2026-01-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-responsive-ui/spec.md`

## Summary

本功能實作前後台全面響應式 UI 適配,統一設計系統,支援手機(<640px)、平板(640-1024px)、桌面(>1024px)三種裝置。核心改造包括:
1. 後台 Sidebar 三階段響應式(手機漢堡菜單 / 平板圖示列 / 桌面完整展開)
2. 後台表格元件卡片視圖(OrderTable、ClientTable)
3. 前台元件響應式優化(購物車圖片、商品卡片、間距文字)
4. 統一設計 Token 系統(`lib/design-tokens.ts`)
5. Neo-Brutalism 元素響應式調整(邊框 2px→3px / 陰影 2px→4px)

**技術方案**: 使用 Tailwind CSS 預設斷點系統,建立設計 Token 定義檔,改造現有元件而非重寫,保持向後兼容,桌面版視覺效果不降級。

## Technical Context

**Language/Version**: TypeScript 5.7+, React 19.x, Next.js 15.1+
**Primary Dependencies**:
- Tailwind CSS v4.0 (響應式樣式基礎)
- shadcn/ui Sheet 元件 (手機版 Sidebar Drawer)
- Lucide React (圖示: Menu, X, ArrowLeft)
- Next.js Image (圖片優化與 `sizes` 屬性)

**Storage**: N/A (純 UI 改造,不涉及新資料實體)
**Testing**: Vitest + React Testing Library (元件測試) + Chrome DevTools (視覺測試)
**Target Platform**: Web (手機/平板/桌面瀏覽器)
**Project Type**: Web (前端 UI 改造)
**Performance Goals**:
- 手機版頁面 First Contentful Paint < 1.5 秒
- 響應式類別不顯著增加 CSS 檔案大小 (Tailwind CSS v4 自動優化)
- 所有互動操作響應時間 < 300ms

**Constraints**:
- 必須保持 Neo-Brutalism 設計風格一致性
- 桌面版視覺效果不降級 (邊框 3px / 陰影 4px)
- 所有可點擊元素觸控目標 >= 44px × 44px (WCAG 2.1 AA)
- 手機版無橫向滾動 (除必要表格)
- 改造現有元件,禁止重寫整個頁面結構

**Scale/Scope**:
- 影響範圍: 約 30+ 個元件與頁面
- 關鍵元件: Sidebar, OrderTable, ClientTable, Button, Input, Navbar, ProductCard, CartItem
- 新增元件: MobileNav, MobileSidebar, 設計 Token 系統
- 預估工作量: 7 個 Phase,約 13-17 工作天

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ I. 使用者角色優先 (User Role First)
- **符合**: 後台新增手機響應式支援應急查看場景,前台優化手機體驗
- **修訂憲章**: 憲章原文「管理端優化桌面裝置」需更新為「管理端優化桌面裝置,但必須支援手機響應式 UI」
- **實作要求**:
  - 後台手機版使用漢堡菜單 + Drawer,不影響桌面版完整功能
  - 前台保持手機優先設計哲學,桌面版為漸進增強

### ✅ V. 設計系統一致性 (Design System Consistency)
- **符合**: 建立統一設計 Token 系統,確保 Neo-Brutalism 風格一致性
- **強化實施**:
  - 手機版使用輕量化 Neo-Brutalism (2px 邊框 + 2px 陰影)
  - 桌面版保持原設計 (3px 邊框 + 4px 陰影)
  - 所有元件必須使用 `cn()` 工具函式組合樣式
  - 響應式類別必須按順序排列 (預設 → sm → md → lg → xl)

### ✅ VII. 使用者體驗優先 (User Experience First)
- **符合**: 響應式 UI 改造直接提升所有裝置的使用體驗
- **實作要求**:
  - 所有按鈕與連結符合 WCAG 2.1 AA 標準 (觸控目標 >= 44px × 44px)
  - 手機版表格使用卡片視圖,避免橫向滾動
  - 文字尺寸響應式調整,確保可讀性 (手機 text-2xl / 桌面 text-4xl)
  - 圖片使用 Next.js Image `sizes` 屬性優化載入速度

### ⚠️ 憲章修訂建議
根據本功能需求,建議修訂憲章如下:

**修訂位置**: `I. 使用者角色優先`
**原文**:
```markdown
- 客戶端優化行動裝置,管理端優化桌面裝置
```

**修訂為**:
```markdown
- 客戶端優化行動裝置 (手機優先設計)
- 管理端優化桌面裝置,但必須支援手機響應式 UI (應急查看與操作場景)
```

**新增章節**: `V. 設計系統一致性 - 響應式設計規範`
```markdown
### 響應式設計規範

**斷點系統**:
- 必須使用 Tailwind CSS 預設斷點 (sm: 640px, md: 768px, lg: 1024px, xl: 1280px)
- 採用 Mobile-First 開發策略 (從手機版開始,逐步增強)

**設計 Token 系統**:
- 容器寬度: 一般頁面 `max-w-7xl`, 表單頁面 `max-w-4xl`
- 間距: 頁面外層 `p-4 md:p-6 lg:p-8`, 卡片內距 `p-4 md:p-6`
- 文字尺寸: h1 `text-2xl md:text-3xl lg:text-4xl`, h2 `text-xl md:text-2xl lg:text-3xl`

**Neo-Brutalism 響應式**:
- 邊框: 手機版 `border-2`, 桌面版 `md:border-3`
- 陰影: 手機版 `shadow-neo-sm`, 桌面版 `md:shadow-neo`
- 點擊效果: 統一 `active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`

**開發規範**:
- 必須使用 `cn()` 工具函式組合 className
- 響應式類別必須按順序排列 (預設 → sm → md → lg → xl)
- 優先使用設計 Token 而非自訂樣式
```

### 🚫 無憲章違規
本功能為 UI 改造,不涉及業務邏輯變更,無需額外複雜度說明。

## Project Structure

### Documentation (this feature)

```text
specs/005-responsive-ui/
├── spec.md              # 功能規格 (已完成)
├── plan.md              # 本實作計畫
├── research.md          # Phase 0 研究文件 (待產生)
├── data-model.md        # Phase 1 資料模型 (N/A - 純 UI 改造)
├── quickstart.md        # Phase 1 快速上手指南 (待產生)
├── contracts/           # Phase 1 API 合約 (N/A - 純 UI 改造)
│   └── design-tokens.ts.example  # 設計 Token 範例
└── tasks.md             # Phase 2 任務清單 (由 /speckit.tasks 產生)
```

### Source Code (repository root)

```text
# Next.js 15 App Router 結構 (現有專案)
vsale/
├── app/
│   ├── (admin)/                 # 後台路由群組
│   │   └── admin/
│   │       ├── layout.tsx       # 🔧 修改: 整合響應式 Sidebar
│   │       ├── dashboard/       # 🔧 修改: 統一間距與文字
│   │       ├── orders/          # 🔧 修改: 統一間距與文字
│   │       └── clients/         # 🔧 修改: 統一間距與文字
│   └── (shop)/                  # 前台路由群組
│       └── store/
│           ├── page.tsx         # 🔧 修改: 統一間距與文字
│           ├── cart/            # 🔧 修改: 購物車圖片響應式
│           └── orders/          # 🔧 修改: 統一間距與文字
│
├── components/
│   ├── ui/                      # 基礎 UI 元件
│   │   ├── button.tsx           # 🔧 修改: 響應式尺寸
│   │   ├── input.tsx            # 🔧 修改: 響應式間距與文字
│   │   ├── card.tsx             # ✨ 新增: 響應式卡片元件
│   │   └── sheet.tsx            # ✨ 新增: shadcn/ui Sheet (Drawer)
│   │
│   ├── admin/                   # 後台元件
│   │   ├── sidebar.tsx          # 🔧 修改: 三階段響應式
│   │   ├── mobile-nav.tsx       # ✨ 新增: 手機版導航 (漢堡按鈕)
│   │   ├── mobile-sidebar.tsx   # ✨ 新增: 手機版 Sidebar 內容
│   │   ├── order-table.tsx      # 🔧 修改: 桌面表格 + 手機卡片視圖
│   │   └── client-table.tsx     # 🔧 修改: 桌面表格 + 手機卡片視圖
│   │
│   └── shop/                    # 前台元件
│       ├── navbar.tsx           # 🔧 修改: 優化間距
│       ├── product-card.tsx     # 🔧 修改: 邊框與陰影響應式
│       └── cart-item.tsx        # 🔧 修改: 圖片尺寸響應式
│
├── lib/
│   ├── design-tokens.ts         # ✨ 新增: 設計 Token 定義檔
│   └── utils.ts                 # 現有: cn() 工具函式
│
├── tailwind.config.ts           # 🔧 修改: 確保 shadow 變體正確
└── docs/
    └── responsive-ui-design.md  # 現有: 完整設計方案文件
```

**Structure Decision**:
本專案為 Next.js 15 Web 應用,採用 App Router 架構。響應式 UI 改造主要修改現有元件,新增少量元件 (MobileNav、MobileSidebar、設計 Token 系統)。不涉及資料庫變更或新 API 端點,純前端 UI 改造。

**符號說明**:
- 🔧 = 修改現有檔案
- ✨ = 新增檔案
- 📦 = 安裝依賴 (shadcn/ui Sheet)

## Complexity Tracking

> **無憲章違規,本表格留空**

本功能為 UI 改造,遵循所有憲章原則,無額外複雜度需說明。

---

## Phase 0: Research & Technical Decisions

### Research Goals

根據 Technical Context 標記的 "NEEDS CLARIFICATION" 項目,需要研究以下主題:

1. **Tailwind CSS v4.0 響應式最佳實踐**
   - 研究 Mobile-First 開發策略實作細節
   - 確認 Tailwind CSS v4 的 JIT 編譯是否影響響應式類別效能
   - 研究如何組織大量響應式類別以提高可讀性

2. **shadcn/ui Sheet 元件整合**
   - 確認 Sheet 元件是否已安裝,若無需執行 `npx shadcn@latest add sheet`
   - 研究 Sheet 元件的 API 與自訂選項 (側邊、寬度、動畫)
   - 確認 Sheet 元件與 Neo-Brutalism 風格的整合方式

3. **Next.js Image `sizes` 屬性最佳實踐**
   - 研究不同 Grid 布局的 `sizes` 屬性設定
   - 確認 `sizes` 對圖片載入速度的實際影響
   - 研究 placeholder 與 lazy loading 的最佳組合

4. **設計 Token 系統架構**
   - 研究業界設計 Token 系統最佳實踐 (Tailwind Labs、Chakra UI、Material Design)
   - 確認 TypeScript 定義方式 (`as const` vs `readonly`)
   - 研究工具函式設計 (getNeoBrutalismClasses, getPageContainerClasses)

5. **WCAG 2.1 AA 觸控目標標準**
   - 確認 44px × 44px 的具體實作方式
   - 研究如何在不破壞設計的前提下確保觸控目標區域
   - 研究可訪問性測試工具 (axe DevTools、Lighthouse)

### Research Tasks

詳細研究任務將記錄於 `research.md`。

---

## Phase 1: Design & Architecture

### 1.1 Data Model

**N/A** - 本功能為純 UI 改造,不涉及新資料實體或資料庫變更。

現有資料表保持不變:
- `users`, `tiers`, `products`, `orders`, `order_items` 等

UI 改造僅影響前端元件的顯示邏輯,不修改資料結構。

### 1.2 API Contracts

**N/A** - 本功能為純 UI 改造,不新增或修改 API 端點。

現有 Server Actions 保持不變:
- `lib/actions/orders.ts` (getOrders, getOrderById, confirmOrder, etc.)
- `lib/actions/products.ts` (getProducts, etc.)
- `lib/actions/users.ts` (getClients, etc.)

UI 改造僅影響前端元件如何呼叫與顯示這些 API 的資料,不修改 API 合約。

### 1.3 Component Architecture

#### 1.3.1 設計 Token 系統

**檔案**: `lib/design-tokens.ts`

**架構設計**:
```typescript
// 核心 Token 定義
export const designTokens = {
  container: {
    default: 'mx-auto max-w-7xl',
    narrow: 'mx-auto max-w-4xl',
    wide: 'mx-auto max-w-screen-2xl',
  },
  spacing: {
    page: {
      padding: 'p-4 md:p-6 lg:p-8',
      gap: 'space-y-4 md:space-y-6 lg:space-y-8',
    },
    card: {
      padding: 'p-4 md:p-6',
      gap: 'space-y-3 md:space-y-4',
    },
    grid: {
      gap: 'gap-4 md:gap-6',
    },
  },
  typography: {
    h1: 'text-2xl md:text-3xl lg:text-4xl font-bold',
    h2: 'text-xl md:text-2xl lg:text-3xl font-bold',
    h3: 'text-lg md:text-xl font-bold',
    body: {
      base: 'text-sm md:text-base',
      large: 'text-base md:text-lg',
    },
    caption: 'text-xs md:text-sm',
  },
  neoBrutalism: {
    border: {
      mobile: 'border-2',
      desktop: 'md:border-3',
      full: 'border-2 md:border-3',
    },
    shadow: {
      mobile: 'shadow-neo-sm',
      desktop: 'md:shadow-neo',
      full: 'shadow-neo-sm md:shadow-neo',
    },
    active: 'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
    hover: 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
  },
  button: {
    sm: 'px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm',
    md: 'px-4 py-2 text-sm md:px-6 md:py-3 md:text-base',
    lg: 'px-6 py-3 text-base md:px-8 md:py-4 md:text-lg',
  },
  input: {
    base: 'px-3 py-2 text-sm md:px-4 md:py-2.5 md:text-base',
  },
} as const

// 工具函式
export function getNeoBrutalismClasses(options?: {
  hover?: boolean
  active?: boolean
}): string

export function getPageContainerClasses(
  variant: 'default' | 'narrow' | 'wide' = 'default'
): string
```

**設計理由**:
- 使用 `as const` 確保 TypeScript 型別推論
- 分層結構 (container / spacing / typography / neoBrutalism / button / input)
- 提供工具函式簡化元件使用
- 所有 Token 值為 Tailwind CSS 類別字串,方便 `cn()` 組合

#### 1.3.2 後台 Sidebar 響應式架構

**修改元件**: `components/admin/sidebar.tsx`
**新增元件**: `components/admin/mobile-nav.tsx`, `components/admin/mobile-sidebar.tsx`

**響應式策略**:
```typescript
// Sidebar.tsx (桌面版)
<aside className={cn(
  "hidden md:flex",              // 手機版隱藏
  "md:w-16 md:flex-col md:items-center",  // 平板版收縮
  "lg:w-64 lg:items-start",      // 桌面版展開
  "border-r-2 md:border-r-3 border-black bg-white"
)}>
  {/* Logo - 平板僅顯示圖示 */}
  <Logo variant="icon" className="md:block lg:hidden" />
  <Logo variant="full" className="hidden lg:block" />

  {/* 導航項目 - 平板僅圖示,桌面圖示+文字 */}
  <Link className={cn(
    "md:w-12 md:h-12 md:justify-center",  // 平板: 正方形,僅圖示
    "lg:w-full lg:justify-start lg:gap-3 lg:px-4 lg:py-2.5"  // 桌面: 完整
  )}>
    <Icon className="h-5 w-5" />
    <span className="hidden lg:inline">{label}</span>
  </Link>
</aside>

// MobileNav.tsx (手機版漢堡按鈕)
<button
  onClick={() => setIsOpen(true)}
  className="md:hidden fixed top-4 left-4 z-50 h-12 w-12 ..."
>
  <Menu className="h-6 w-6" />
</button>

<Drawer open={isOpen} onClose={() => setIsOpen(false)}>
  <MobileSidebar onClose={() => setIsOpen(false)} />
</Drawer>
```

**設計理由**:
- 使用斷點隱藏/顯示不同版本,避免重複渲染相同 DOM
- 平板版收縮為圖示列 (w-16),節省空間同時保留導航可見性
- 手機版使用 Drawer,避免固定寬度 Sidebar 溢出視口
- 所有三種狀態共用相同導航資料結構,僅視覺呈現不同

#### 1.3.3 後台表格響應式架構

**修改元件**: `components/admin/order-table.tsx`, `components/admin/client-table.tsx`

**響應式策略**:
```typescript
// OrderTable.tsx
export function OrderTable({ orders }: OrderTableProps) {
  return (
    <>
      {/* 桌面版: 完整表格 */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          {/* 完整表格結構 */}
        </table>
      </div>

      {/* 手機版: 卡片視圖 */}
      <div className="lg:hidden space-y-3 md:space-y-4">
        {orders.map((order) => (
          <Link
            href={`/admin/orders/${order.id}`}
            className={cn(
              "block rounded-none bg-white",
              "border-2 md:border-3 border-black",
              "shadow-neo-sm md:shadow-neo",
              "p-4",
              "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            )}
          >
            {/* 卡片內容: 訂單編號、客戶、狀態、金額、時間 */}
          </Link>
        ))}
      </div>
    </>
  )
}
```

**設計理由**:
- 桌面版使用 `<table>` 元素,保持語意化 HTML
- 手機版使用 `<Link>` 卡片,可點擊導向詳情頁
- 使用 `lg:hidden` / `hidden lg:block` 切換,避免渲染兩次
- 卡片內容僅顯示關鍵資訊,詳情點擊進入詳情頁

#### 1.3.4 基礎 UI 元件響應式架構

**修改元件**: `components/ui/button.tsx`, `components/ui/input.tsx`

**Button 元件**:
```typescript
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ size = 'md', variant = 'primary', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-bold rounded-none transition-all",
          designTokens.neoBrutalism.border.full,
          designTokens.neoBrutalism.shadow.full,
          designTokens.neoBrutalism.active,
          designTokens.button[size],  // 響應式尺寸
          // 顏色變體...
        )}
        {...props}
      />
    )
  }
)
```

**Input 元件**:
```typescript
const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-none bg-white",
          designTokens.neoBrutalism.border.full,
          designTokens.input.base,  // 響應式間距與文字
          "focus:outline-none focus:ring-2 focus:ring-brand-primary"
        )}
        {...props}
      />
    )
  }
)
```

**設計理由**:
- 使用 `forwardRef` 支援 ref 傳遞
- 尺寸參數化 (sm/md/lg),由設計 Token 定義響應式樣式
- 所有元件統一使用 Neo-Brutalism 風格
- 使用 `cn()` 組合類別,提高可讀性

### 1.4 File Organization

```text
修改檔案 (🔧):
- app/(admin)/admin/layout.tsx
- app/(admin)/admin/orders/page.tsx
- app/(admin)/admin/clients/page.tsx
- app/(shop)/store/page.tsx
- app/(shop)/store/cart/page.tsx
- components/admin/sidebar.tsx
- components/admin/order-table.tsx
- components/admin/client-table.tsx
- components/ui/button.tsx
- components/ui/input.tsx
- components/shop/navbar.tsx
- components/shop/product-card.tsx
- components/shop/cart-item.tsx
- tailwind.config.ts

新增檔案 (✨):
- lib/design-tokens.ts
- components/admin/mobile-nav.tsx
- components/admin/mobile-sidebar.tsx
- components/ui/card.tsx (可選)
- components/ui/sheet.tsx (shadcn/ui CLI 安裝)

文件檔案 (📄):
- specs/005-responsive-ui/research.md
- specs/005-responsive-ui/quickstart.md
- specs/005-responsive-ui/contracts/design-tokens.ts.example
- docs/responsive-guide.md (可選)
```

### 1.5 Testing Strategy

**元件測試** (Vitest + React Testing Library):
- Button 元件: 測試不同尺寸與變體的響應式樣式
- Input 元件: 測試響應式間距與 focus 狀態
- Sidebar 元件: 測試三階段響應式切換
- OrderTable / ClientTable: 測試桌面表格與手機卡片視圖切換

**視覺測試** (Chrome DevTools):
- 手機 (375px): 所有頁面無橫向滾動,漢堡菜單正常運作
- 平板 (768px): Sidebar 收縮為圖示列,表格/卡片切換正常
- 桌面 (1280px): Sidebar 完整展開,所有元件使用完整 Neo-Brutalism 風格

**可訪問性測試** (axe DevTools / Lighthouse):
- 所有按鈕與連結觸控目標 >= 44px × 44px
- 對比度符合 WCAG 2.1 AA 標準
- 鍵盤導航正常運作
- ARIA 標籤正確設定 (Drawer、Modal)

**效能測試** (Chrome DevTools Performance):
- First Contentful Paint < 1.5 秒 (手機版)
- 響應式類別不顯著增加 CSS 檔案大小
- 圖片使用 `sizes` 屬性後載入時間 < 1 秒

### 1.6 Quickstart

詳細快速上手指南將產生於 `quickstart.md`,包含:
- 開發環境設定 (安裝 shadcn/ui Sheet)
- 設計 Token 系統使用範例
- 新增響應式元件的標準流程
- 常見問題與解決方案

---

## Next Steps

### Immediate Actions (完成 Phase 0 & 1 後)

1. ✅ **產生 research.md**: 研究 Tailwind CSS v4、shadcn/ui Sheet、Next.js Image、設計 Token、WCAG 2.1 AA
2. ✅ **產生 quickstart.md**: 撰寫快速上手指南
3. ✅ **產生 contracts/design-tokens.ts.example**: 設計 Token 範例檔案
4. 🔜 **執行 /speckit.tasks**: 產生 Phase 2 任務清單 (tasks.md)

### Phase 2 Preview (任務拆分方向)

根據 [docs/responsive-ui-design.md](../../../docs/responsive-ui-design.md) 的實作計畫,預計拆分為 7 個 Phase:

- **Phase 1 (P0)**: 基礎設施與設計 Token 系統 (1-2 天)
- **Phase 2 (P0)**: 後台 Sidebar 與 Layout 改造 (2-3 天)
- **Phase 3 (P0)**: 後台表格元件改造 (3-4 天)
- **Phase 4 (P1)**: 前台響應式優化 (2-3 天)
- **Phase 5 (P1)**: 文字與間距全面優化 (2 天)
- **Phase 6 (P2)**: 圖片與媒體響應式 (1 天)
- **Phase 7 (P0)**: 測試與文件 (2 天)

**總計**: 約 13-17 工作天,53+ 個任務

---

**Plan Status**: Phase 0 & 1 完成,等待產生 research.md 與 quickstart.md
**Next Command**: `/speckit.tasks` (產生任務清單)
