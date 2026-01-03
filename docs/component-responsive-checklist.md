# 元件響應式檢查清單

**版本**: 1.0.0
**最後更新**: 2026-01-04
**用途**: 開發/審查新元件時的響應式檢查清單

---

## 使用說明

本檢查清單用於確保所有新建立或修改的 UI 元件符合 Vsale-lite 響應式設計規範。

**使用時機**:
1. ✅ 建立新元件時 (開發階段)
2. ✅ 修改現有元件時 (重構階段)
3. ✅ Code Review 時 (審查階段)
4. ✅ 測試驗證時 (QA 階段)

**檢查方式**:
- 逐項檢查每個項目
- 所有項目都必須 ✅ 通過才能合併程式碼
- 如有特殊原因無法符合，需在 PR 中說明

---

## 目錄

- [基礎檢查](#基礎檢查)
- [間距與尺寸](#間距與尺寸)
- [文字與排版](#文字與排版)
- [Neo-Brutalism 風格](#neo-brutalism-風格)
- [互動元素](#互動元素)
- [圖片與媒體](#圖片與媒體)
- [布局與網格](#布局與網格)
- [可訪問性](#可訪問性)
- [效能優化](#效能優化)

---

## 基礎檢查

### Mobile-First 策略

- [ ] **樣式從手機版開始定義** (無前綴 = 手機版)
- [ ] **使用 `md:` 和 `lg:` 增強桌面版** (不跳過斷點)
- [ ] **手機版可正常運作** (不依賴桌面版樣式)

**範例**:
```tsx
// ✅ 正確
<div className="p-4 md:p-6 lg:p-8">

// ❌ 錯誤: 沒有手機版基礎
<div className="md:p-6 lg:p-8">

// ❌ 錯誤: 跳過 md: 斷點
<div className="p-4 lg:p-8">
```

---

### 設計 Token 使用

- [ ] **優先使用設計 Token** 而非硬編碼樣式
- [ ] **間距使用 `designTokens.spacing.*`**
- [ ] **文字尺寸使用 `designTokens.typography.*`**
- [ ] **按鈕尺寸使用 `designTokens.button.*`**

**範例**:
```tsx
// ✅ 正確
import { designTokens } from '@/lib/design-tokens'

<h1 className={designTokens.typography.h1}>
<button className={designTokens.button.md}>

// ❌ 錯誤
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
<button className="px-4 py-2 text-sm md:px-6 md:py-3 md:text-base">
```

---

### 響應式斷點

- [ ] **僅使用 `md:` (768px) 和 `lg:` (1024px)** 作為主要斷點
- [ ] **避免使用 `sm:` / `xl:` / `2xl:`** (除非特殊需求)
- [ ] **斷點順序正確** (預設 → md → lg)

**範例**:
```tsx
// ✅ 正確
<div className="p-4 md:p-6 lg:p-8">

// ❌ 錯誤: 順序混亂
<div className="lg:p-8 p-4 md:p-6">

// ❌ 錯誤: 使用過多斷點
<div className="p-2 sm:p-3 md:p-4 lg:p-6 xl:p-8">
```

---

## 間距與尺寸

### 容器寬度

- [ ] **頁面容器限制最大寬度** (`max-w-7xl` / `max-w-4xl`)
- [ ] **容器置中對齊** (`mx-auto`)
- [ ] **使用 `getPageContainerClasses()` 工具函式** (如適用)

**範例**:
```tsx
// ✅ 正確
<main className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">

// 或使用工具函式
import { getPageContainerClasses } from '@/lib/design-tokens'
<main className={getPageContainerClasses()}>

// ❌ 錯誤: 沒有限制寬度
<main className="p-4 md:p-6 lg:p-8">
```

---

### 內距 (Padding)

- [ ] **使用響應式內距** (`p-4 md:p-6 lg:p-8`)
- [ ] **卡片內距使用 `designTokens.spacing.card.padding`**
- [ ] **頁面內距使用 `designTokens.spacing.page.padding`**

**範例**:
```tsx
// ✅ 正確: 頁面內距
<main className={designTokens.spacing.page.padding}>

// ✅ 正確: 卡片內距
<div className={designTokens.spacing.card.padding}>

// ❌ 錯誤: 硬編碼
<div className="p-4 md:p-6">
```

---

### 外距 (Margin) 與間距 (Gap)

- [ ] **垂直間距使用 `space-y-*` 或 `gap-*`**
- [ ] **響應式間距** (`space-y-3 md:space-y-4` / `gap-4 md:gap-6`)
- [ ] **使用設計 Token** (`designTokens.spacing.page.gap`)

**範例**:
```tsx
// ✅ 正確: 垂直間距
<div className={designTokens.spacing.page.gap}>

// ✅ 正確: Grid 間距
<div className={`grid ${designTokens.spacing.grid.gap}`}>

// ❌ 錯誤: 硬編碼
<div className="space-y-4 md:space-y-6">
```

---

## 文字與排版

### 標題階層

- [ ] **H1 使用 `designTokens.typography.h1`**
- [ ] **H2 使用 `designTokens.typography.h2`**
- [ ] **H3 使用 `designTokens.typography.h3`**
- [ ] **正文使用 `designTokens.typography.body.base` 或 `.large`**

**範例**:
```tsx
// ✅ 正確
<h1 className={designTokens.typography.h1}>頁面標題</h1>
<h2 className={designTokens.typography.h2}>區塊標題</h2>
<p className={designTokens.typography.body.base}>正文內容</p>

// ❌ 錯誤
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
```

---

### 文字尺寸響應式

- [ ] **最小文字尺寸 >= `text-xs`** (避免過小)
- [ ] **正文文字 `text-sm md:text-base`**
- [ ] **輔助文字 `text-xs md:text-sm`**

**範例**:
```tsx
// ✅ 正確: 正文
<p className="text-sm md:text-base">

// ✅ 正確: 輔助文字
<span className="text-xs md:text-sm text-muted-foreground">

// ❌ 錯誤: 文字過小 (手機版 < 12px)
<p className="text-[10px] md:text-xs">
```

---

### 文字截斷

- [ ] **超長文字使用 `truncate` 或 `line-clamp-*`**
- [ ] **允許換行的內容使用 `break-words`**

**範例**:
```tsx
// ✅ 正確: 單行截斷
<p className="truncate">{productName}</p>

// ✅ 正確: 兩行截斷
<p className="line-clamp-2">{description}</p>

// ✅ 正確: 自動換行
<p className="break-words">{userInput}</p>
```

---

## Neo-Brutalism 風格

### 邊框

- [ ] **使用響應式邊框** (`border-2 md:border-3`)
- [ ] **或使用 `designTokens.neoBrutalism.border.full`**
- [ ] **邊框顏色 `border-black`** (預設)

**範例**:
```tsx
// ✅ 正確
<div className="border-2 md:border-3 border-black">

// 或使用設計 Token
<div className={designTokens.neoBrutalism.border.full}>

// ❌ 錯誤: 固定邊框寬度
<div className="border-2">
```

---

### 陰影

- [ ] **使用響應式陰影** (`shadow-neo-sm md:shadow-neo`)
- [ ] **或使用 `designTokens.neoBrutalism.shadow.full`**
- [ ] **陰影與邊框同時使用**

**範例**:
```tsx
// ✅ 正確
<div className="border-2 md:border-3 shadow-neo-sm md:shadow-neo">

// 或使用設計 Token
<div className={`${designTokens.neoBrutalism.border.full} ${designTokens.neoBrutalism.shadow.full}`}>

// 或使用工具函式
import { getNeoBrutalismClasses } from '@/lib/design-tokens'
<div className={getNeoBrutalismClasses()}>

// ❌ 錯誤: 僅有陰影，沒有邊框
<div className="shadow-neo">
```

---

### 互動效果

- [ ] **可點擊元素包含 Hover 效果** (`hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none`)
- [ ] **觸控設備包含 Active 效果** (`active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`)
- [ ] **或使用 `getNeoBrutalismClasses({ hover: true, active: true })`**

**範例**:
```tsx
// ✅ 正確: 使用工具函式
import { getNeoBrutalismClasses } from '@/lib/design-tokens'

<button className={getNeoBrutalismClasses({ hover: true, active: true })}>
  點擊我
</button>

// ✅ 正確: 手動定義
<button className="border-2 md:border-3 shadow-neo-sm md:shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">

// ❌ 錯誤: 沒有互動效果
<button className="border-2 shadow-neo-sm">
```

---

## 互動元素

### 按鈕

- [ ] **使用 `designTokens.button.*` 尺寸** (sm / md / lg)
- [ ] **包含 Neo-Brutalism 風格** (邊框 + 陰影 + 互動效果)
- [ ] **觸控目標 >= 44px × 44px**

**範例**:
```tsx
// ✅ 正確
import { designTokens, getNeoBrutalismClasses } from '@/lib/design-tokens'

<button className={`${designTokens.button.md} ${getNeoBrutalismClasses({ hover: true, active: true })} bg-primary text-white`}>
  提交訂單
</button>

// ❌ 錯誤: 按鈕過小 (觸控目標 < 44px)
<button className="px-2 py-1 text-xs">
```

---

### 輸入框

- [ ] **使用 `designTokens.input.base` 尺寸**
- [ ] **包含 Neo-Brutalism 風格**
- [ ] **高度 >= 44px** (符合觸控目標)

**範例**:
```tsx
// ✅ 正確: 使用 shadcn/ui Input 元件 (已整合設計 Token)
import { Input } from '@/components/ui/input'
<Input placeholder="請輸入手機號碼" />

// ✅ 正確: 手動定義
<input className={`${designTokens.input.base} border-2 md:border-3`} />

// ❌ 錯誤: 輸入框過小
<input className="px-2 py-1 text-xs" />
```

---

### 連結

- [ ] **使用響應式尺寸** (`text-sm md:text-base`)
- [ ] **包含 Hover 效果** (`hover:underline`)
- [ ] **顏色區分** (`text-primary`)

**範例**:
```tsx
// ✅ 正確
<a href="/store" className="text-sm md:text-base text-primary hover:underline">
  前往商店
</a>

// ❌ 錯誤: 無 Hover 效果
<a href="/store" className="text-sm md:text-base text-primary">
```

---

## 圖片與媒體

### Next.js Image 元件

- [ ] **使用 Next.js `<Image>` 元件** (不使用 `<img>`)
- [ ] **設定 `width` 和 `height` 屬性**
- [ ] **設定 `sizes` 屬性** (優化載入速度)
- [ ] **設定 `alt` 描述** (可訪問性)

**範例**:
```tsx
// ✅ 正確
import Image from 'next/image'

<Image
  src={product.image_url}
  alt={product.name}
  width={300}
  height={300}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
/>

// ❌ 錯誤: 使用 <img>
<img src={product.image_url} alt={product.name} />

// ❌ 錯誤: 沒有 sizes 屬性
<Image src={product.image_url} alt={product.name} width={300} height={300} />
```

---

### 圖片尺寸

- [ ] **使用響應式尺寸** (`h-16 w-16 md:h-24 md:w-24`)
- [ ] **圖片比例固定** (`aspect-square` / `aspect-video`)

**範例**:
```tsx
// ✅ 正確: 響應式尺寸
<Image
  className="h-16 w-16 md:h-24 md:w-24"
  src={product.image_url}
  alt={product.name}
  width={96}
  height={96}
/>

// ✅ 正確: 固定比例
<Image
  className="aspect-square"
  src={product.image_url}
  alt={product.name}
  width={300}
  height={300}
/>

// ❌ 錯誤: 固定尺寸
<Image className="h-24 w-24" ... />
```

---

## 布局與網格

### Grid 響應式

- [ ] **使用響應式欄數** (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`)
- [ ] **使用響應式間距** (`gap-4 md:gap-6`)
- [ ] **使用 `designTokens.spacing.grid.gap`**

**範例**:
```tsx
// ✅ 正確
<div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${designTokens.spacing.grid.gap}`}>

// ❌ 錯誤: 固定欄數
<div className="grid grid-cols-3 gap-4">
```

---

### Flexbox 響應式

- [ ] **使用響應式方向** (`flex-col md:flex-row`)
- [ ] **使用響應式間距** (`gap-3 md:gap-4`)

**範例**:
```tsx
// ✅ 正確: 手機版垂直 / 桌面版橫向
<div className="flex flex-col md:flex-row gap-3 md:gap-4">

// ❌ 錯誤: 固定方向
<div className="flex flex-row gap-4">
```

---

### 隱藏/顯示元素

- [ ] **使用 `hidden` / `md:block` / `lg:block` 控制顯示**
- [ ] **確保手機版核心內容可見** (不隱藏重要資訊)

**範例**:
```tsx
// ✅ 正確: 僅桌面版顯示次要資訊
<span className="hidden lg:inline-block text-sm text-muted-foreground">
  建立於 2026-01-04
</span>

// ❌ 錯誤: 手機版隱藏重要資訊 (訂單編號)
<span className="hidden md:inline-block">
  {order.order_number}
</span>
```

---

## 可訪問性

### 語意化 HTML

- [ ] **使用語意化標籤** (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`)
- [ ] **標題階層正確** (H1 → H2 → H3，不跳級)
- [ ] **按鈕使用 `<button>` 標籤** (不使用 `<div>` + `onClick`)

**範例**:
```tsx
// ✅ 正確
<main>
  <h1>訂單管理</h1>
  <section>
    <h2>訂單列表</h2>
  </section>
</main>

// ❌ 錯誤: 使用 <div>
<div>
  <div className="text-4xl">訂單管理</div>
</div>

// ❌ 錯誤: 使用 <div> 模擬按鈕
<div onClick={handleClick}>點擊我</div>
```

---

### ARIA 屬性

- [ ] **互動元素包含 `aria-label`** (如圖示按鈕)
- [ ] **表單輸入包含 `aria-describedby`** (如錯誤訊息)
- [ ] **Loading 狀態包含 `aria-busy`**

**範例**:
```tsx
// ✅ 正確: 圖示按鈕包含 aria-label
<button aria-label="開啟選單">
  <MenuIcon />
</button>

// ✅ 正確: 錯誤訊息關聯
<input
  id="phone"
  aria-describedby="phone-error"
  aria-invalid={!!errors.phone}
/>
{errors.phone && (
  <span id="phone-error" className="text-red-500">
    {errors.phone}
  </span>
)}

// ❌ 錯誤: 圖示按鈕沒有 aria-label
<button>
  <MenuIcon />
</button>
```

---

### 鍵盤導航

- [ ] **所有互動元素可用 Tab 鍵導航**
- [ ] **焦點可視化** (`focus:ring-2 focus:ring-primary`)
- [ ] **Enter 可觸發按鈕**
- [ ] **Esc 可關閉 Modal / Sheet**

**範例**:
```tsx
// ✅ 正確: 包含焦點樣式
<button className="px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none">

// ❌ 錯誤: 移除焦點樣式
<button className="outline-none">
```

---

### 顏色對比度

- [ ] **文字與背景對比度 >= 4.5:1** (WCAG AA 標準)
- [ ] **使用 Tailwind 預設顏色** (已符合對比度要求)

**檢查工具**:
- Chrome DevTools → Lighthouse → Accessibility
- https://webaim.org/resources/contrastchecker/

---

## 效能優化

### 圖片優化

- [ ] **使用 Next.js Image 元件**
- [ ] **設定 `sizes` 屬性**
- [ ] **使用 WebP 格式** (如可能)
- [ ] **圖片延遲載入** (Next.js Image 預設啟用)

---

### 樣式優化

- [ ] **避免過度使用響應式類別** (保持可讀性)
- [ ] **使用設計 Token 減少重複樣式**
- [ ] **避免內聯樣式** (`style={{}}`)

**範例**:
```tsx
// ✅ 正確: 使用設計 Token
<div className={designTokens.spacing.page.padding}>

// ❌ 錯誤: 重複定義樣式
<div className="p-4 md:p-6 lg:p-8">
<div className="p-4 md:p-6 lg:p-8">

// ❌ 錯誤: 內聯樣式
<div style={{ padding: '16px' }}>
```

---

### 載入狀態

- [ ] **長時間操作顯示 Loading 狀態**
- [ ] **使用 Skeleton UI** (如資料載入)
- [ ] **包含 `aria-busy` 屬性**

**範例**:
```tsx
// ✅ 正確: Loading 狀態
{isLoading ? (
  <div className="p-4" aria-busy="true">
    <div className="animate-pulse bg-gray-200 h-8 w-full"></div>
  </div>
) : (
  <div>{data}</div>
)}
```

---

## 總結

### 必檢項目 (Critical)

- [x] Mobile-First 策略
- [x] 使用設計 Token
- [x] 響應式斷點正確
- [x] 觸控目標 >= 44px
- [x] Neo-Brutalism 風格
- [x] 語意化 HTML
- [x] 鍵盤導航

### 建議項目 (Recommended)

- [x] ARIA 屬性
- [x] 顏色對比度
- [x] 圖片優化 (sizes 屬性)
- [x] Loading 狀態

---

## 參考資源

- **憲章**: `CLAUDE.md` - 核心憲章原則 VII (響應式設計規範)
- **設計 Token**: `docs/design-tokens.md` - 設計 Token 使用文件
- **響應式指南**: `docs/responsive-guide.md` - 響應式開發完整指南
- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/
- **Tailwind CSS**: https://tailwindcss.com/docs

---

**版本歷史**:
- **1.0.0** (2026-01-04): 初版發布
