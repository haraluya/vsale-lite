# 響應式開發指南

**版本**: 1.0.0
**最後更新**: 2026-01-04
**適用範圍**: Vsale-lite 前後台響應式 UI

---

## 目錄

- [簡介](#簡介)
- [設計哲學](#設計哲學)
- [斷點系統](#斷點系統)
- [開發流程](#開發流程)
- [響應式模式](#響應式模式)
- [測試檢查清單](#測試檢查清單)
- [常見問題](#常見問題)

---

## 簡介

本指南提供 Vsale-lite 響應式 UI 開發的完整規範，確保所有頁面在手機、平板、桌面裝置上都能提供最佳體驗。

### 核心目標

- 📱 **手機優先**: 優化單手操作，觸控目標 >= 44px
- 💻 **桌面增強**: 利用大螢幕空間，提升批量操作效率
- 🎨 **Neo-Brutalism**: 響應式邊框與陰影，保持品牌一致性
- ♿ **可訪問性**: WCAG 2.1 AA 標準，鍵盤導航友善

---

## 設計哲學

### I. Mobile-First 策略

**定義**: 從最小螢幕（手機）開始設計，再逐步增強到更大螢幕（平板、桌面）。

**原因**:
1. ✅ 強制簡化內容，聚焦核心功能
2. ✅ 避免「桌面塞太多，手機塞不下」的問題
3. ✅ Tailwind CSS 預設行為（無前綴 = 手機版）

**實踐**:
```tsx
// ✅ 正確: 手機版基礎 → 桌面版增強
<div className="p-4 md:p-6 lg:p-8">

// ❌ 錯誤: 從桌面版開始 (手機版無樣式)
<div className="md:p-6 lg:p-8">
```

---

### II. 內容優先級

不同裝置的內容顯示策略：

| 裝置 | 內容策略 | 範例 |
|------|---------|------|
| 手機 | 僅核心資訊，隱藏次要內容 | 訂單卡片: 編號、客戶、金額、狀態 |
| 平板 | 增加輔助資訊，開始顯示完整表格 | 訂單表格: + 商品數量 |
| 桌面 | 完整資訊，增加操作欄位 | 訂單表格: + 建立時間、操作按鈕 |

**實作範例**:
```tsx
{/* 手機版: 隱藏「建立時間」欄位 */}
<td className="hidden lg:table-cell">
  {order.created_at}
</td>

{/* 桌面版: 顯示操作按鈕 */}
<td className="hidden lg:table-cell">
  <button>編輯</button>
  <button>刪除</button>
</td>
```

---

### III. 雙入口差異化

**客戶端** (前台):
- 手機優先，單手操作
- 大觸控目標，簡化導航
- 商品瀏覽、下單流程優化

**管理端** (後台):
- 響應式設計，應急查看
- 手機: 基本資訊查看 (Sheet 導航)
- 平板: 收縮 Sidebar (w-16)
- 桌面: 完整 Sidebar (w-64) + 批量操作

---

## 斷點系統

### Tailwind CSS 斷點

| 前綴 | 最小寬度 | 裝置類型 | 範例尺寸 |
|------|---------|----------|---------|
| (無) | 0px | 手機 | 375px (iPhone SE) |
| `sm:` | 640px | 大手機 | 414px (iPhone Pro Max) |
| `md:` | 768px | 平板 | 768px (iPad 直屏) |
| `lg:` | 1024px | 桌面 | 1024px (iPad 橫屏) |
| `xl:` | 1280px | 大桌面 | 1280px |
| `2xl:` | 1536px | 超大桌面 | 1920px |

### Vsale-lite 使用策略

**主要斷點**:
- **手機**: 預設 (無前綴)
- **平板**: `md:` (768px)
- **桌面**: `lg:` (1024px)

**不常用斷點**:
- `sm:` - 僅特殊情況 (如大手機特殊優化)
- `xl:`, `2xl:` - 幾乎不使用 (用 `max-w-7xl` 限制寬度)

---

## 開發流程

### 步驟 1: 設計手機版 (< 768px)

**檢查清單**:
- [ ] 單欄布局 (`grid-cols-1` / `flex-col`)
- [ ] 觸控目標 >= 44px × 44px
- [ ] 文字可清晰閱讀 (`text-sm` 以上)
- [ ] 無橫向滾動
- [ ] 間距適中 (`p-4`, `gap-3`)
- [ ] Neo-Brutalism: `border-2`, `shadow-neo-sm`

**範例**:
```tsx
<div className="flex flex-col gap-3 p-4">
  <h1 className="text-2xl font-bold">訂單管理</h1>
  <button className="px-4 py-3 text-sm border-2 shadow-neo-sm">
    新增訂單
  </button>
</div>
```

---

### 步驟 2: 增強平板版 (768px - 1023px)

**調整項目**:
- [ ] 增加間距 (`md:p-6`, `md:gap-4`)
- [ ] 增強文字尺寸 (`md:text-base`)
- [ ] 考慮雙欄布局 (`md:grid-cols-2`)
- [ ] 增強邊框與陰影 (`md:border-3`, `md:shadow-neo`)
- [ ] 後台 Sidebar 收縮為圖示列 (`md:w-16`)

**範例**:
```tsx
<div className="flex flex-col gap-3 md:gap-4 p-4 md:p-6">
  <h1 className="text-2xl md:text-3xl font-bold">訂單管理</h1>
  <button className="px-4 md:px-6 py-3 text-sm md:text-base border-2 md:border-3 shadow-neo-sm md:shadow-neo">
    新增訂單
  </button>
</div>
```

---

### 步驟 3: 優化桌面版 (>= 1024px)

**調整項目**:
- [ ] 最大間距 (`lg:p-8`, `lg:gap-6`)
- [ ] 最大文字尺寸 (`lg:text-lg`)
- [ ] 多欄布局 (`lg:grid-cols-3`)
- [ ] 顯示完整表格 (`hidden lg:table`)
- [ ] 限制最大寬度 (`max-w-7xl`)
- [ ] 後台 Sidebar 完整展開 (`lg:w-64`)

**範例**:
```tsx
<div className="flex flex-col gap-3 md:gap-4 lg:gap-6 p-4 md:p-6 lg:p-8 mx-auto max-w-7xl">
  <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">訂單管理</h1>
  <button className="px-4 md:px-6 py-3 text-sm md:text-base border-2 md:border-3 shadow-neo-sm md:shadow-neo">
    新增訂單
  </button>
</div>
```

---

## 響應式模式

### 1. 表格 → 卡片視圖

**場景**: 表格資料在手機版無法顯示完整欄位。

**策略**:
- 手機版: 卡片視圖 (垂直布局)
- 桌面版: 完整表格 (橫向布局)

**實作**:
```tsx
{/* 桌面版: 完整表格 */}
<table className="hidden lg:table w-full">
  <thead>
    <tr>
      <th>訂單編號</th>
      <th>客戶姓名</th>
      <th>總金額</th>
      <th>狀態</th>
      <th>建立時間</th>
    </tr>
  </thead>
  <tbody>
    {orders.map(order => (
      <tr key={order.id}>
        <td>{order.order_number}</td>
        <td>{order.customer_name}</td>
        <td>${order.total_amount}</td>
        <td><OrderStatusBadge status={order.status} /></td>
        <td>{order.created_at}</td>
      </tr>
    ))}
  </tbody>
</table>

{/* 手機版: 卡片視圖 */}
<div className="lg:hidden space-y-3">
  {orders.map(order => (
    <div key={order.id} className="p-4 border-2 shadow-neo-sm bg-white">
      <div className="space-y-2">
        <div>
          <span className="text-xs text-muted-foreground">訂單編號</span>
          <p className="text-sm font-medium">{order.order_number}</p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">客戶姓名</span>
          <p className="text-sm">{order.customer_name}</p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">總金額</span>
          <p className="text-base font-bold">${order.total_amount}</p>
        </div>
        <OrderStatusBadge status={order.status} size="sm" />
      </div>
    </div>
  ))}
</div>
```

---

### 2. Sidebar → Sheet (漢堡菜單)

**場景**: 後台導航在手機版佔用過多空間。

**策略**:
- 手機版: 隱藏 Sidebar，顯示漢堡按鈕 (Sheet)
- 平板版: 收縮 Sidebar (僅圖示)
- 桌面版: 完整 Sidebar (圖示 + 文字)

**實作**:
```tsx
// components/admin/sidebar.tsx
<aside className="hidden md:flex md:w-16 lg:w-64 ...">
  {/* 平板版: 僅圖示 */}
  <div className="lg:hidden">
    <HomeIcon />
  </div>

  {/* 桌面版: 圖示 + 文字 */}
  <div className="hidden lg:flex items-center gap-3">
    <HomeIcon />
    <span>首頁</span>
  </div>
</aside>

// components/admin/mobile-nav.tsx (手機版)
<div className="md:hidden">
  <Sheet>
    <SheetTrigger asChild>
      <button className="p-3 border-2 shadow-neo-sm">
        <MenuIcon />
      </button>
    </SheetTrigger>
    <SheetContent side="left">
      {/* 導航項目 */}
    </SheetContent>
  </Sheet>
</div>
```

---

### 3. Grid 響應式欄數

**場景**: 商品列表、卡片網格。

**策略**:
- 手機版: 1 欄
- 平板版: 2 欄
- 桌面版: 3 欄

**實作**:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
  {products.map(product => (
    <ProductCard key={product.id} product={product} />
  ))}
</div>
```

---

### 4. 雙欄 → 單欄布局

**場景**: 訂單詳情頁面（左側訂單資訊 / 右側操作區）。

**策略**:
- 手機版: 單欄 (垂直排列)
- 桌面版: 雙欄 (橫向排列)

**實作**:
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
  {/* 左側: 訂單資訊 */}
  <div className="p-4 border-2 shadow-neo-sm">
    <h2 className="text-lg md:text-xl font-bold">訂單資訊</h2>
    {/* ... */}
  </div>

  {/* 右側: 操作區 */}
  <div className="p-4 border-2 shadow-neo-sm">
    <h2 className="text-lg md:text-xl font-bold">操作</h2>
    {/* ... */}
  </div>
</div>
```

---

### 5. 隱藏/顯示元素

**場景**: 桌面版顯示額外資訊，手機版隱藏。

**策略**:
- 使用 `hidden` / `lg:block` 控制顯示

**實作**:
```tsx
{/* 僅桌面版顯示 */}
<span className="hidden lg:inline-block text-sm text-muted-foreground">
  建立於 2026-01-04
</span>

{/* 僅手機版顯示 */}
<button className="lg:hidden px-4 py-2">
  查看更多
</button>
```

---

## 測試檢查清單

### 視覺測試 (Chrome DevTools)

**測試裝置**:
- [ ] **iPhone SE** (375px × 667px) - 最小手機
- [ ] **iPhone Pro Max** (414px × 896px) - 大手機
- [ ] **iPad 直屏** (768px × 1024px) - 平板直屏
- [ ] **iPad 橫屏** (1024px × 768px) - 平板橫屏
- [ ] **桌面** (1280px × 800px) - 小桌面
- [ ] **大桌面** (1920px × 1080px) - 全高清

**檢查項目**:
- [ ] 無橫向滾動 (Shift + F5 強制重整)
- [ ] 文字可清晰閱讀 (無過小文字)
- [ ] 按鈕觸控目標 >= 44px × 44px
- [ ] 圖片正常載入 (無破圖)
- [ ] 間距適當 (無過度擁擠或留白)
- [ ] Neo-Brutalism 風格完整 (邊框 + 陰影)

---

### 功能測試

**後台 Sidebar**:
- [ ] 手機版: Sidebar 完全隱藏，漢堡菜單可開啟 Sheet
- [ ] 平板版: Sidebar 收縮為 w-16 (僅圖示)
- [ ] 桌面版: Sidebar 展開為 w-64 (圖示 + 文字)

**表格/卡片切換**:
- [ ] 手機版: 表格切換為卡片視圖
- [ ] 桌面版: 卡片切換為完整表格

**Grid 響應式**:
- [ ] 手機版: 1 欄
- [ ] 平板版: 2 欄
- [ ] 桌面版: 3 欄

---

### 可訪問性測試

**工具**:
- Chrome Lighthouse (Accessibility 評分)
- axe DevTools (自動檢測)

**檢查項目**:
- [ ] Lighthouse Accessibility >= 95
- [ ] 無 Critical 或 Serious 問題 (axe DevTools)
- [ ] Tab 鍵盤導航順序合理
- [ ] Enter 可觸發按鈕
- [ ] Esc 可關閉 Modal / Sheet
- [ ] 焦點可視化 (focus ring)

---

### 效能測試

**圖片載入**:
- [ ] `sizes` 屬性正確設定
- [ ] 下載的圖片尺寸符合預期 (Network 面板)

**頁面載入**:
- [ ] First Contentful Paint < 1.5 秒
- [ ] Largest Contentful Paint < 2.5 秒

---

## 常見問題

### Q1: 為什麼 Sidebar 在平板版收縮為 w-16？

**A**: 平板螢幕 (768px - 1023px) 寬度有限，完整 Sidebar (w-64) 會壓縮主要內容區。收縮為圖示列 (w-16) 是最佳平衡：

- ✅ 保留快速導航 (點擊圖示即可切換)
- ✅ 節省橫向空間 (主要內容區更寬)
- ✅ 避免漢堡菜單額外點擊

---

### Q2: 什麼時候使用卡片視圖 vs 表格？

**A**:

| 裝置寬度 | 視圖類型 | 原因 |
|---------|---------|------|
| < 1024px | 卡片視圖 | 螢幕過窄，表格欄位會擠壓 |
| >= 1024px | 完整表格 | 橫向空間足夠，表格可顯示更多資訊 |

**例外**: 如果表格欄位少 (< 4 欄)，可在平板版 (md:) 顯示表格。

---

### Q3: 如何處理超長文字？

**A**: 使用 Tailwind 文字截斷工具：

```tsx
{/* 單行截斷 */}
<p className="truncate">超長的商品名稱...</p>

{/* 兩行截斷 */}
<p className="line-clamp-2">超長的商品描述...</p>

{/* 無限換行 */}
<p className="break-words">允許自動換行的內容</p>
```

---

### Q4: 觸控目標最小尺寸為何是 44px？

**A**: 根據 WCAG 2.1 AA 標準與 Apple Human Interface Guidelines：

- **WCAG 2.1**: 最小 44px × 44px
- **Apple HIG**: 最小 44pt (約 44px)
- **Material Design**: 最小 48dp (約 48px)

Vsale-lite 採用 **44px** 作為最小觸控目標，確保可訪問性。

---

### Q5: 如何測試觸控目標尺寸？

**A**: 使用 Chrome DevTools:

1. 開啟 DevTools → Elements
2. 選取按鈕元素
3. 查看 Computed 面板 → Box Model
4. 確認 `width` 與 `height` >= 44px

**或使用 CSS Outline**:
```tsx
<button className="outline outline-2 outline-red-500">
  測試按鈕
</button>
```
目視檢查是否 >= 44px。

---

### Q6: 為什麼不使用 `sm:` 斷點？

**A**: Vsale-lite 簡化為三個主要斷點：

- **手機**: 預設 (< 768px)
- **平板**: `md:` (768px - 1023px)
- **桌面**: `lg:` (>= 1024px)

`sm:` (640px) 介於手機與平板之間，增加複雜度但收益有限。僅在**特殊情況**使用 (如大手機特殊優化)。

---

### Q7: 如何處理 Navbar 手機版？

**A**: Vsale-lite 前台 Navbar 採用「精簡導航」策略：

```tsx
{/* 手機版: 精簡 Logo + 購物車 */}
<nav className="p-3 md:p-4">
  <div className="flex items-center justify-between">
    <Logo />
    <div className="flex items-center gap-2 md:gap-3">
      <CartButton />
      <UserMenu />
    </div>
  </div>
</nav>
```

**不使用漢堡菜單**，因為前台導航項目少 (首頁、商品、訂單)，直接顯示於 Navbar。

---

### Q8: 如何優化圖片載入速度？

**A**: 使用 Next.js Image 元件的 `sizes` 屬性：

```tsx
import Image from 'next/image'

<Image
  src={product.image_url}
  alt={product.name}
  width={300}
  height={300}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
/>
```

**說明**:
- 手機版 (< 640px): 圖片寬度 = 100vw (全螢幕寬)
- 平板版 (640px - 1023px): 圖片寬度 = 50vw (半螢幕寬)
- 桌面版 (>= 1024px): 圖片寬度 = 33vw (1/3 螢幕寬)

Next.js 會根據 `sizes` 自動下載對應尺寸的圖片。

---

## 參考資源

- **憲章**: `CLAUDE.md` - 核心憲章原則 VII (響應式設計規範)
- **設計 Token**: `docs/design-tokens.md` - 設計 Token 使用文件
- **元件檢查清單**: `docs/component-responsive-checklist.md` - 元件響應式檢查清單
- **研究文件**: `specs/005-responsive-ui/research.md` - 設計決策理由
- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/
- **Apple HIG**: https://developer.apple.com/design/human-interface-guidelines/
- **Tailwind CSS 斷點**: https://tailwindcss.com/docs/responsive-design

---

**版本歷史**:
- **1.0.0** (2026-01-04): 初版發布
