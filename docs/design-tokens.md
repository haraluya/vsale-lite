# 設計 Token 使用文件

**版本**: 1.0.0
**最後更新**: 2026-01-04
**關聯**: `lib/design-tokens.ts`

---

## 目錄

- [簡介](#簡介)
- [設計原則](#設計原則)
- [Token 系統架構](#token-系統架構)
- [使用指南](#使用指南)
- [工具函式](#工具函式)
- [最佳實踐](#最佳實踐)
- [常見問題](#常見問題)

---

## 簡介

Vsale-lite 設計 Token 系統是一套標準化的設計變數集合，用於確保整個應用程式的視覺一致性與響應式行為。所有 Token 定義於 `lib/design-tokens.ts`，並遵循 **Mobile-First** 策略。

### 核心優勢

- ✅ **一致性**: 所有頁面使用相同的間距、文字尺寸與視覺風格
- ✅ **可維護性**: 修改設計只需更新 Token 定義，自動套用到所有元件
- ✅ **響應式**: 內建手機、平板、桌面的斷點定義
- ✅ **類型安全**: TypeScript 型別提示，減少錯誤

---

## 設計原則

### I. Mobile-First 策略

所有 Token 遵循「手機優先，逐步增強」的設計理念：

```tsx
// ✅ 正確: 手機版基礎 + 桌面版增強
className="p-4 md:p-6 lg:p-8"

// ❌ 錯誤: 沒有手機版基礎
className="md:p-6 lg:p-8"
```

### II. 響應式斷點

| 斷點 | 寬度 | 裝置類型 |
|------|------|----------|
| (預設) | < 768px | 手機 |
| `md:` | >= 768px | 平板 |
| `lg:` | >= 1024px | 桌面 |

### III. Neo-Brutalism 風格

所有 UI 元件必須遵循 Neo-Brutalism 設計系統：

- **邊框**: 手機 2px / 桌面 3px
- **陰影**: 手機 2px / 桌面 4px
- **點擊效果**: 位移 + 陰影消失

---

## Token 系統架構

### 1. 容器寬度 (`container`)

限制頁面內容最大寬度，確保大螢幕下可讀性。

```tsx
import { designTokens } from '@/lib/design-tokens'

// 一般頁面 (最大 1280px)
<div className={designTokens.container.default}>

// 表單頁面 (最大 896px)
<div className={designTokens.container.narrow}>

// 儀表板 (最大 1536px, 僅特殊情況)
<div className={designTokens.container.wide}>
```

**使用場景**:
- `default`: 商品列表、訂單列表、客戶管理等一般頁面
- `narrow`: 登入頁面、表單頁面、設定頁面
- `wide`: 儀表板、報表頁面 (需要更多橫向空間)

---

### 2. 間距系統 (`spacing`)

#### 2.1 頁面間距 (`spacing.page`)

```tsx
// 頁面外層 Padding
className={designTokens.spacing.page.padding}
// 輸出: p-4 md:p-6 lg:p-8

// 垂直區塊間距
className={designTokens.spacing.page.gap}
// 輸出: space-y-4 md:space-y-6 lg:space-y-8
```

**範例**:
```tsx
<main className={`${designTokens.container.default} ${designTokens.spacing.page.padding}`}>
  <div className={designTokens.spacing.page.gap}>
    <section>...</section>
    <section>...</section>
  </div>
</main>
```

#### 2.2 卡片間距 (`spacing.card`)

```tsx
// 卡片內距
className={designTokens.spacing.card.padding}
// 輸出: p-4 md:p-6

// 卡片內元素間距
className={designTokens.spacing.card.gap}
// 輸出: space-y-3 md:space-y-4
```

**範例**:
```tsx
<div className={`${getNeoBrutalismClasses()} ${designTokens.spacing.card.padding}`}>
  <div className={designTokens.spacing.card.gap}>
    <h3>標題</h3>
    <p>內容</p>
  </div>
</div>
```

#### 2.3 Grid 間距 (`spacing.grid`)

```tsx
// Grid 列間距
className={designTokens.spacing.grid.gap}
// 輸出: gap-4 md:gap-6
```

**範例**:
```tsx
<div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${designTokens.spacing.grid.gap}`}>
  <ProductCard />
  <ProductCard />
  <ProductCard />
</div>
```

---

### 3. 文字尺寸階梯 (`typography`)

#### 3.1 標題階層

```tsx
// H1 - 頁面主標題
<h1 className={designTokens.typography.h1}>
  客戶管理
</h1>
// 輸出: text-2xl md:text-3xl lg:text-4xl font-bold

// H2 - 區塊標題
<h2 className={designTokens.typography.h2}>
  訂單列表
</h2>
// 輸出: text-xl md:text-2xl lg:text-3xl font-bold

// H3 - 次標題
<h3 className={designTokens.typography.h3}>
  訂單資訊
</h3>
// 輸出: text-lg md:text-xl font-bold
```

#### 3.2 正文與輔助文字

```tsx
// 正文 (預設)
<p className={designTokens.typography.body.base}>
  這是正文內容
</p>
// 輸出: text-sm md:text-base

// 大正文 (強調內容)
<p className={designTokens.typography.body.large}>
  重要說明
</p>
// 輸出: text-base md:text-lg

// 輔助文字 (時間戳、狀態說明)
<span className={designTokens.typography.caption}>
  2026-01-04 10:30
</span>
// 輸出: text-xs md:text-sm

// 表單標籤
<label className={designTokens.typography.label}>
  手機號碼
</label>
// 輸出: text-xs md:text-sm font-medium
```

---

### 4. Neo-Brutalism 響應式 (`neoBrutalism`)

#### 4.1 邊框

```tsx
// 完整響應式邊框 (手機 2px + 桌面 3px)
className={designTokens.neoBrutalism.border.full}
// 輸出: border-2 md:border-3

// 僅手機版邊框
className={designTokens.neoBrutalism.border.mobile}
// 輸出: border-2

// 僅桌面版邊框
className={designTokens.neoBrutalism.border.desktop}
// 輸出: md:border-3
```

#### 4.2 陰影

```tsx
// 完整響應式陰影 (手機 2px + 桌面 4px)
className={designTokens.neoBrutalism.shadow.full}
// 輸出: shadow-neo-sm md:shadow-neo

// 僅手機版陰影
className={designTokens.neoBrutalism.shadow.mobile}
// 輸出: shadow-neo-sm

// 僅桌面版陰影
className={designTokens.neoBrutalism.shadow.desktop}
// 輸出: md:shadow-neo
```

**陰影定義** (定義於 `tailwind.config.ts`):
```js
shadow: {
  'neo-sm': '2px 2px 0px 0px rgba(0,0,0,1)',  // 手機版
  'neo': '4px 4px 0px 0px rgba(0,0,0,1)',     // 桌面版
  'neo-lg': '6px 6px 0px 0px rgba(0,0,0,1)',  // 特殊場景 (不常用)
}
```

#### 4.3 互動效果

```tsx
// Hover 效果 (滑鼠懸停)
className={designTokens.neoBrutalism.hover}
// 輸出: hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none

// Active 效果 (點擊)
className={designTokens.neoBrutalism.active}
// 輸出: active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
```

**完整範例**:
```tsx
<button
  className={`
    ${designTokens.neoBrutalism.border.full}
    ${designTokens.neoBrutalism.shadow.full}
    ${designTokens.neoBrutalism.hover}
    ${designTokens.neoBrutalism.active}
    bg-primary text-white px-4 py-2
  `}
>
  點擊我
</button>
```

---

### 5. 按鈕尺寸 (`button`)

```tsx
// 小按鈕 (操作列、狀態標籤旁)
<button className={designTokens.button.sm}>
  編輯
</button>
// 輸出: px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm

// 中按鈕 (預設，大多數情況)
<button className={designTokens.button.md}>
  提交訂單
</button>
// 輸出: px-4 py-2 text-sm md:px-6 md:py-3 md:text-base

// 大按鈕 (主要 CTA)
<button className={designTokens.button.lg}>
  立即結帳
</button>
// 輸出: px-6 py-3 text-base md:px-8 md:py-4 md:text-lg
```

---

### 6. 輸入框尺寸 (`input`)

```tsx
<input
  type="text"
  className={designTokens.input.base}
/>
// 輸出: px-3 py-2 text-sm md:px-4 md:py-2.5 md:text-base
```

**與 shadcn/ui 整合**:
```tsx
// components/ui/input.tsx 已整合設計 Token
<Input placeholder="請輸入手機號碼" />
// 自動套用響應式尺寸
```

---

## 工具函式

### `getNeoBrutalismClasses()`

快速組合 Neo-Brutalism 完整樣式（邊框 + 陰影 + 互動效果）。

**簽名**:
```tsx
function getNeoBrutalismClasses(options?: {
  hover?: boolean
  active?: boolean
}): string
```

**範例**:
```tsx
import { getNeoBrutalismClasses } from '@/lib/design-tokens'

// 僅邊框 + 陰影
<div className={getNeoBrutalismClasses()}>
  靜態卡片
</div>
// 輸出: border-2 md:border-3 shadow-neo-sm md:shadow-neo

// 包含 Hover 效果
<button className={getNeoBrutalismClasses({ hover: true })}>
  懸停我
</button>
// 輸出: border-2 md:border-3 shadow-neo-sm md:shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none

// 包含 Active 效果 (觸控設備)
<button className={getNeoBrutalismClasses({ active: true })}>
  點擊我
</button>

// 包含兩者
<button className={getNeoBrutalismClasses({ hover: true, active: true })}>
  完整互動
</button>
```

---

### `getPageContainerClasses()`

快速組合頁面容器樣式（背景 + 間距 + 最大寬度）。

**簽名**:
```tsx
function getPageContainerClasses(
  variant?: 'default' | 'narrow' | 'wide'
): string
```

**範例**:
```tsx
import { getPageContainerClasses } from '@/lib/design-tokens'

// 一般頁面 (預設)
<main className={getPageContainerClasses()}>
  <h1>商品列表</h1>
</main>
// 輸出: min-h-screen bg-background p-4 md:p-6 lg:p-8 mx-auto max-w-7xl space-y-4 md:space-y-6 lg:space-y-8

// 表單頁面 (narrow)
<main className={getPageContainerClasses('narrow')}>
  <h1>登入</h1>
</main>
// 輸出: min-h-screen bg-background p-4 md:p-6 lg:p-8 mx-auto max-w-4xl space-y-4 md:space-y-6 lg:space-y-8

// 儀表板 (wide)
<main className={getPageContainerClasses('wide')}>
  <h1>銷售儀表板</h1>
</main>
```

---

## 使用指南

### 建立新頁面

**範例**: 建立「商品管理」頁面

```tsx
// app/(admin)/admin/products/page.tsx
import { getPageContainerClasses } from '@/lib/design-tokens'
import { designTokens } from '@/lib/design-tokens'

export default function ProductsPage() {
  return (
    <main className={getPageContainerClasses()}>
      {/* 頁面標題 */}
      <h1 className={designTokens.typography.h1}>
        商品管理
      </h1>

      {/* 操作區塊 */}
      <div className="flex gap-3 md:gap-4">
        <button className={`${designTokens.button.md} bg-primary text-white`}>
          新增商品
        </button>
      </div>

      {/* 內容區塊 */}
      <div className={getNeoBrutalismClasses()}>
        <ProductTable />
      </div>
    </main>
  )
}
```

---

### 建立新卡片元件

**範例**: 建立「訂單卡片」元件（手機版視圖）

```tsx
// components/admin/order-card.tsx
import { designTokens, getNeoBrutalismClasses } from '@/lib/design-tokens'

interface OrderCardProps {
  orderNumber: string
  customerName: string
  totalAmount: number
}

export function OrderCard({ orderNumber, customerName, totalAmount }: OrderCardProps) {
  return (
    <div className={`${getNeoBrutalismClasses({ hover: true })} ${designTokens.spacing.card.padding} bg-white`}>
      <div className={designTokens.spacing.card.gap}>
        {/* 訂單編號 */}
        <div>
          <span className={designTokens.typography.label}>訂單編號</span>
          <p className={designTokens.typography.body.base}>{orderNumber}</p>
        </div>

        {/* 客戶姓名 */}
        <div>
          <span className={designTokens.typography.label}>客戶姓名</span>
          <p className={designTokens.typography.body.base}>{customerName}</p>
        </div>

        {/* 總金額 */}
        <div>
          <span className={designTokens.typography.label}>總金額</span>
          <p className={`${designTokens.typography.body.large} text-primary font-bold`}>
            ${totalAmount.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  )
}
```

---

### 建立響應式 Grid

**範例**: 商品列表 (1欄 → 2欄 → 3欄)

```tsx
<div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${designTokens.spacing.grid.gap}`}>
  {products.map(product => (
    <ProductCard key={product.id} product={product} />
  ))}
</div>
```

---

## 最佳實踐

### ✅ DO（正確做法）

1. **優先使用設計 Token**
   ```tsx
   // ✅ 正確
   className={designTokens.typography.h1}

   // ❌ 錯誤
   className="text-2xl md:text-3xl lg:text-4xl font-bold"
   ```

2. **使用工具函式簡化程式碼**
   ```tsx
   // ✅ 正確
   className={getNeoBrutalismClasses({ hover: true })}

   // ❌ 錯誤
   className="border-2 md:border-3 shadow-neo-sm md:shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
   ```

3. **遵循 Mobile-First 順序**
   ```tsx
   // ✅ 正確: 預設 → md → lg
   className="p-4 md:p-6 lg:p-8"

   // ❌ 錯誤: 混亂的順序
   className="lg:p-8 p-4 md:p-6"
   ```

4. **使用語意化 Token 名稱**
   ```tsx
   // ✅ 正確
   className={designTokens.typography.h2}  // 明確表達「這是 H2 標題」

   // ❌ 錯誤
   className="text-xl md:text-2xl lg:text-3xl"  // 只是數值，無語意
   ```

---

### ❌ DON'T（錯誤做法）

1. **不要硬編碼響應式樣式**
   ```tsx
   // ❌ 錯誤
   <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">

   // ✅ 正確
   <div className={`${designTokens.spacing.page.padding} ${designTokens.spacing.page.gap}`}>
   ```

2. **不要跳過斷點**
   ```tsx
   // ❌ 錯誤: 沒有 md: 斷點
   <div className="p-4 lg:p-8">

   // ✅ 正確
   <div className="p-4 md:p-6 lg:p-8">
   ```

3. **不要混用 Token 與硬編碼**
   ```tsx
   // ❌ 錯誤
   <h1 className={`${designTokens.typography.h1} text-blue-500`}>

   // ✅ 正確
   <h1 className={`${designTokens.typography.h1} text-primary`}>
   ```

4. **不要忘記觸控目標尺寸**
   ```tsx
   // ❌ 錯誤: 按鈕太小 (< 44px)
   <button className="px-2 py-1 text-xs">點擊</button>

   // ✅ 正確: 使用 Token 確保最小觸控尺寸
   <button className={designTokens.button.sm}>點擊</button>
   ```

---

## 常見問題

### Q1: 什麼時候可以不使用設計 Token？

**A**: 僅在以下特殊情況：

1. **一次性樣式** (不會重複使用)
   ```tsx
   <div className="absolute top-0 right-0">  {/* OK */}
   ```

2. **元件特定樣式** (不屬於設計系統)
   ```tsx
   <div className="bg-gradient-to-r from-blue-500 to-purple-500">  {/* OK */}
   ```

3. **特殊數值** (設計 Token 沒有對應定義)
   ```tsx
   <div className="h-[500px]">  {/* OK */}
   ```

---

### Q2: 如何新增自訂 Token？

**A**: 編輯 `lib/design-tokens.ts`：

```tsx
export const designTokens = {
  // ... 現有 Token

  // 新增自訂 Token
  badge: {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  },
} as const
```

---

### Q3: 設計 Token 與 Tailwind Theme 有何不同？

**A**:

| 項目 | Tailwind Theme | 設計 Token |
|------|----------------|-----------|
| 定義位置 | `tailwind.config.ts` | `lib/design-tokens.ts` |
| 作用範圍 | 底層設計變數 (顏色、間距單位) | 組合樣式 (h1、button.md) |
| 使用方式 | `className="text-primary"` | `className={designTokens.typography.h1}` |
| 響應式 | 需手動組合 | 內建響應式定義 |

**關係**:
- Tailwind Theme 提供「原子」(顏色、間距單位)
- 設計 Token 組合「分子」(h1 = text-2xl + md:text-3xl + lg:text-4xl + font-bold)

---

### Q4: 如何處理舊程式碼的遷移？

**A**: 漸進式遷移策略：

1. **新功能**: 必須使用設計 Token
2. **修改現有頁面**: 順便重構為設計 Token
3. **不修改舊頁面**: 保留原有樣式（技術債）

**批量遷移腳本** (可選):
```bash
# 查找所有硬編碼的 h1 標題
grep -r "text-4xl" app/

# 逐一修改為設計 Token
# text-4xl → designTokens.typography.h1
```

---

### Q5: 設計 Token 是否影響效能？

**A**: **不會**。設計 Token 在編譯時展開為標準 Tailwind 類別，沒有額外執行時成本。

```tsx
// 開發時
className={designTokens.typography.h1}

// 編譯後
className="text-2xl md:text-3xl lg:text-4xl font-bold"
```

---

## 參考資源

- **憲章**: `CLAUDE.md` - 核心憲章原則 VII (響應式設計規範)
- **程式碼**: `lib/design-tokens.ts` - 設計 Token 定義
- **研究文件**: `specs/005-responsive-ui/research.md` - 設計決策理由
- **響應式指南**: `docs/responsive-guide.md` - 響應式開發完整指南
- **元件檢查清單**: `docs/component-responsive-checklist.md` - 元件響應式檢查清單

---

**版本歷史**:
- **1.0.0** (2026-01-04): 初版發布
