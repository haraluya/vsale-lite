# Vsale-lite 響應式 UI 適配設計方案

**文件版本**: 1.0.0
**建立日期**: 2026-01-04
**專案**: Vsale-lite B2B 批發訂貨系統
**設計目標**: 前後台全面響應式 UI 適配，統一設計系統

---

## 目錄

1. [當前狀況分析](#一當前狀況分析)
2. [響應式斷點策略](#二響應式斷點策略)
3. [設計 Token 系統](#三設計-token-系統)
4. [元件適配策略](#四元件適配策略)
5. [實作範例](#五實作範例)
6. [憲章修訂建議](#六憲章修訂建議)
7. [實作計畫](#七實作計畫分階段)
8. [關鍵文件位置](#八關鍵文件位置)
9. [實作注意事項](#九實作注意事項)

---

## 一、當前狀況分析

### 1.1 已發現的問題

#### 前台（客戶端）

- ✅ 整體設計良好（手機優先設計哲學）
- ⚠️ 部分元件存在硬編碼尺寸
- ⚠️ Navbar 已做響應式處理（sm:/md: 斷點），但間距可優化
- ⚠️ 商品卡片使用固定間距（p-4、gap-6）
- ⚠️ 容器寬度不統一（max-w-7xl / max-w-4xl / container / 無）

**具體問題位置：**

```tsx
// components/shop/cart-item.tsx:43
<div className="h-24 w-24 flex-shrink-0 ...">
// ❌ 問題：96px × 96px 固定，手機屏幕留給商品資訊空間不足

// components/shop/navbar.tsx:62-75
// ❌ 問題：桌面版與手機版重複渲染相同用戶資訊（冗餘）
```

#### 後台（管理端）

- ❌ **關鍵問題 1**：Sidebar 固定寬度 `w-64`（256px），手機上會溢出視口
- ❌ **關鍵問題 2**：訂單表格使用 `grid-cols-6`，無響應式變化
- ❌ **關鍵問題 3**：客戶表格僅使用 `overflow-x-auto` 橫向滾動，無卡片替代視圖
- ⚠️ 容器間距不統一（p-4 / p-8 混用）
- ⚠️ 部分頁面標題文字固定 `text-3xl`，小屏幕過大

**具體問題位置：**

```tsx
// components/admin/sidebar.tsx:78
<aside className="w-64 border-r-3 ...">
// ❌ 問題：256px 固定寬度，在 320-414px 手機屏幕會溢出

// components/admin/order-table.tsx:122
<div className="overflow-x-auto">
  <table className="w-full">
    <!-- 7個欄位，手機上橫向滾動 -->
  </table>
</div>
// ❌ 問題：手機版可用性差，需要卡片視圖

// app/(admin)/admin/layout.tsx
<div className="flex min-h-screen bg-background">
  <Sidebar />  {/* 無響應式隱藏邏輯 */}
  <main className="flex-1 p-8">{children}</main>
</div>
// ❌ 問題：缺少手機版漢堡菜單
```

#### 共通問題

- 間距（padding/margin）硬編碼，未使用響應式類別
- 文字尺寸僅部分使用響應式（專案中共 31 次使用 sm:/md:/lg:）
- 容器寬度混用（max-w-7xl / max-w-4xl / 無限制）
- Neo-Brutalism 陰影與邊框無響應式變化（可能在小屏幕過重）

### 1.2 已做得好的部分

- ✅ Navbar 響應式設計優秀（手機版簡化 UI，Logo 全/簡版切換）
- ✅ 商品卡片 Grid 使用響應式 `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- ✅ 圖片使用 `aspect-square` 自適應尺寸
- ✅ Neo-Brutalism 設計風格完整一致（所有元件統一視覺語言）
- ✅ Next.js Image 元件 `sizes` 屬性優化（部分頁面已實作）

---

## 二、響應式斷點策略

### 2.1 統一斷點系統（Tailwind 預設）

專案採用 Tailwind CSS 預設斷點系統，**不需自訂**，保持與生態系統一致性：

```typescript
// Tailwind 預設斷點（保持不變）
{
  'sm': '640px',   // 手機橫屏 / 小平板
  'md': '768px',   // 平板直屏
  'lg': '1024px',  // 小筆電 / 平板橫屏
  'xl': '1280px',  // 桌面
  '2xl': '1536px', // 大桌面
}
```

### 2.2 前台 vs 後台設計目標

| 裝置類型 | 前台（客戶端） | 後台（管理端） |
|---------|---------------|---------------|
| **手機 (<640px)** | ✅ **主要優化目標**<br>- 單欄布局<br>- 簡化導航<br>- 大按鈕（單手操作） | ✅ **新增優化**<br>- 漢堡菜單<br>- 卡片視圖<br>- 摺疊功能 |
| **平板 (640-1024px)** | 雙欄 Grid<br>適度簡化 | 側邊欄收縮 + 表格簡化 |
| **桌面 (>1024px)** | 三欄 Grid<br>完整功能 | 完整表格 + 側邊欄展開 |

**重要變更：** 修改憲章原則，**後台也需支援手機版響應式 UI**（應急查看與操作場景）。

### 2.3 斷點使用原則

**Mobile-First 開發策略：**

```tsx
// ✅ 正確：從手機版開始，逐步增強
<div className="p-4 md:p-6 lg:p-8">
  // 手機預設 p-4 → 平板 p-6 → 桌面 p-8
</div>

// ❌ 錯誤：桌面優先（不建議）
<div className="p-8 md:p-6 sm:p-4">
</div>
```

**斷點選擇指南：**

- **僅手機/桌面差異**：使用 `md:` 斷點（768px）
- **需要三階段變化**：使用 `md:` + `lg:` 斷點
- **細微調整**：使用 `sm:` 斷點（640px，如 Logo 切換）
- **大屏幕優化**：使用 `xl:` 斷點（1280px，如容器限寬）

---

## 三、設計 Token 系統

### 3.1 統一容器寬度

**規範定義：**

```typescript
// 頁面容器寬度（Container Width Tokens）
{
  page: {
    default: 'mx-auto max-w-7xl',   // 一般頁面（1280px）
    narrow: 'mx-auto max-w-4xl',    // 表單頁面（896px）
    wide: 'mx-auto max-w-screen-2xl', // 儀表板（1536px，僅特殊情況）
  }
}
```

**使用範例：**

```tsx
// ✅ 正確：所有一般頁面統一使用 max-w-7xl
<div className="mx-auto max-w-7xl">
  {/* 商品列表、訂單列表、客戶管理等 */}
</div>

// ✅ 正確：表單頁面使用 max-w-4xl
<div className="mx-auto max-w-4xl">
  {/* 登入表單、新增商品表單等 */}
</div>

// ❌ 錯誤：不統一
<div className="mx-auto max-w-6xl">  // 避免自訂寬度
</div>
```

### 3.2 統一間距系統（Spacing Tokens）

**規範定義：**

```typescript
// Spacing Token System
{
  page: {
    padding: 'p-4 md:p-6 lg:p-8',          // 頁面外層
    gap: 'space-y-4 md:space-y-6 lg:space-y-8', // 垂直區塊間距
  },
  card: {
    padding: 'p-4 md:p-6',                 // 卡片內距
    gap: 'space-y-3 md:space-y-4',         // 卡片內元素間距
  },
  grid: {
    gap: 'gap-4 md:gap-6',                 // Grid 列間距
  },
  section: {
    marginBottom: 'mb-4 md:mb-6 lg:mb-8',  // 區塊下方間距
  }
}
```

**使用範例：**

```tsx
// ✅ 正確：頁面外層間距
<div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
  <div className="mx-auto max-w-7xl space-y-4 md:space-y-6 lg:space-y-8">
    {/* 頁面內容 */}
  </div>
</div>

// ✅ 正確：卡片內距
<div className="border-2 md:border-3 border-black bg-white p-4 md:p-6 shadow-neo-sm md:shadow-neo">
  {/* 卡片內容 */}
</div>

// ✅ 正確：Grid 間距
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
  {/* Grid 項目 */}
</div>
```

### 3.3 統一文字尺寸階梯（Typography Scale）

**規範定義：**

```typescript
// Typography Token System
{
  h1: 'text-2xl md:text-3xl lg:text-4xl font-bold',   // 頁面主標題
  h2: 'text-xl md:text-2xl lg:text-3xl font-bold',    // 區塊標題
  h3: 'text-lg md:text-xl font-bold',                 // 次標題
  body: {
    base: 'text-sm md:text-base',                     // 正文
    large: 'text-base md:text-lg',                    // 大正文
  },
  caption: 'text-xs md:text-sm',                      // 輔助文字
  label: 'text-xs md:text-sm font-medium',            // 表單標籤
}
```

**使用範例：**

```tsx
// ✅ 正確：頁面標題
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
  商品列表
</h1>

// ✅ 正確：區塊標題
<h2 className="text-xl md:text-2xl lg:text-3xl font-bold">
  訂單詳情
</h2>

// ✅ 正確：正文
<p className="text-sm md:text-base text-gray-600">
  這是一段說明文字。
</p>

// ❌ 錯誤：固定尺寸
<h1 className="text-4xl font-bold">  // 手機上過大
  商品列表
</h1>
```

### 3.4 Neo-Brutalism 響應式調整

**策略：** 在小屏幕減輕視覺重量，避免過於厚重的邊框與陰影壓縮內容空間。

**規範定義：**

```typescript
// Neo-Brutalism Responsive Tokens
{
  border: {
    mobile: 'border-2',      // 手機版（減輕 1px）
    desktop: 'md:border-3',  // 桌面版（原設計 3px）
  },
  shadow: {
    mobile: 'shadow-neo-sm', // 2px 陰影 (2px 2px 0px 0px rgba(0,0,0,1))
    desktop: 'md:shadow-neo', // 4px 陰影 (4px 4px 0px 0px rgba(0,0,0,1))
  },
  // 點擊效果保持一致（不需響應式）
  active: 'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
}
```

**使用範例：**

```tsx
// ✅ 正確：卡片響應式 Neo-Brutalism
<div className={cn(
  "rounded-none bg-white",
  "border-2 md:border-3 border-black",      // 邊框響應式
  "shadow-neo-sm md:shadow-neo",            // 陰影響應式
  "p-4 md:p-6",
  "transition-all duration-150",
  "hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
)}>
  {/* 卡片內容 */}
</div>

// ✅ 正確：按鈕響應式 Neo-Brutalism
<button className={cn(
  "bg-brand-primary text-white font-bold",
  "border-2 md:border-3 border-black",
  "shadow-neo-sm md:shadow-neo",
  "px-4 py-2 md:px-6 md:py-3",
  "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
)}>
  確認訂單
</button>
```

**Tailwind 配置更新：**

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      boxShadow: {
        'neo': '4px 4px 0px 0px rgba(0,0,0,1)',     // 原有
        'neo-sm': '2px 2px 0px 0px rgba(0,0,0,1)',  // 原有
        'neo-lg': '6px 6px 0px 0px rgba(0,0,0,1)',  // 原有
      },
      borderWidth: {
        '3': '3px',  // 原有
      },
    },
  },
} satisfies Config
```

---

## 四、元件適配策略

### 4.1 後台 Sidebar 響應式改造

**策略：** 手機版隱藏 + 漢堡菜單 / 平板版收縮（僅圖示）/ 桌面版完整展開

**改造方案：**

```tsx
// components/admin/sidebar.tsx
import { cn } from '@/lib/utils'
import { Logo } from '@/components/ui/logo'
import { Home, Users, Package, ShoppingCart, Tag, LogOut } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Sidebar() {
  const pathname = usePathname()

  const navSections = [
    {
      title: '總覽',
      items: [
        { href: '/admin/dashboard', label: '儀表板', icon: Home },
      ],
    },
    {
      title: '客戶管理',
      items: [
        { href: '/admin/tiers', label: '會員等級', icon: Tag },
        { href: '/admin/clients', label: '客戶管理', icon: Users },
      ],
    },
    {
      title: '商品管理',
      items: [
        { href: '/admin/categories', label: '分類管理', icon: Package },
        { href: '/admin/products', label: '商品管理', icon: Package },
      ],
    },
    {
      title: '訂單管理',
      items: [
        { href: '/admin/orders', label: '訂單列表', icon: ShoppingCart },
      ],
    },
  ]

  return (
    <aside className={cn(
      // 手機版：隱藏（由 MobileNav 觸發 Drawer）
      "hidden md:flex",
      // 平板版：收縮為圖示列（w-16）
      "md:w-16 md:flex-col md:items-center",
      // 桌面版：完整展開（w-64）
      "lg:w-64 lg:items-start",
      // 其他樣式
      "border-r-2 md:border-r-3 border-black bg-white",
      "p-4 md:p-6",
      "min-h-screen"
    )}>
      {/* Logo - 平板版僅顯示圖示 */}
      <div className="mb-6 md:mb-8">
        <Logo variant="icon" className="md:block lg:hidden" />
        <Logo variant="full" className="hidden lg:block" />
      </div>

      {/* 導航 */}
      <nav className="flex-1 w-full">
        {navSections.map((section) => (
          <div key={section.title} className="mb-4 md:mb-6">
            {/* 區塊標題 - 平板版隱藏 */}
            <h3 className="hidden lg:block mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              {section.title}
            </h3>

            {/* 導航項目 */}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      // 基礎樣式
                      "flex items-center rounded-none border-2 md:border-3 border-black font-bold transition-all",
                      // 平板版：僅圖示（正方形）
                      "md:w-12 md:h-12 md:justify-center",
                      // 桌面版：完整（帶文字）
                      "lg:w-full lg:justify-start lg:gap-3 lg:px-4 lg:py-2.5",
                      // 活躍狀態
                      isActive
                        ? "bg-brand-primary text-white shadow-none translate-x-[2px] translate-y-[2px]"
                        : "bg-white shadow-neo-sm md:shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {/* 文字 - 平板版隱藏 */}
                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* 登出按鈕 */}
      <button
        className={cn(
          "flex items-center rounded-none border-2 md:border-3 border-black bg-red-500 text-white font-bold shadow-neo-sm md:shadow-neo transition-all",
          "md:w-12 md:h-12 md:justify-center",
          "lg:w-full lg:justify-start lg:gap-3 lg:px-4 lg:py-2.5",
          "hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
        )}
      >
        <LogOut className="h-5 w-5 flex-shrink-0" />
        <span className="hidden lg:inline">登出</span>
      </button>
    </aside>
  )
}
```

**手機版導航元件（新增）：**

```tsx
// components/admin/mobile-nav.tsx
'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Drawer } from '@/components/ui/drawer'
import { MobileSidebar } from '@/components/admin/mobile-sidebar'
import { cn } from '@/lib/utils'

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* 漢堡按鈕 - 僅在手機版顯示 */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "md:hidden fixed top-4 left-4 z-50",
          "flex h-12 w-12 items-center justify-center",
          "rounded-none border-2 border-black bg-white shadow-neo-sm",
          "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        )}
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Drawer */}
      <Drawer open={isOpen} onClose={() => setIsOpen(false)}>
        <MobileSidebar onClose={() => setIsOpen(false)} />
      </Drawer>
    </>
  )
}
```

```tsx
// components/admin/mobile-sidebar.tsx
'use client'

import { Logo } from '@/components/ui/logo'
import { Home, Users, Package, ShoppingCart, Tag, LogOut, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface MobileSidebarProps {
  onClose: () => void
}

export function MobileSidebar({ onClose }: MobileSidebarProps) {
  const pathname = usePathname()

  const navSections = [
    // ... 同 Sidebar.tsx
  ]

  return (
    <div className="flex h-full flex-col bg-white p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <Logo variant="full" />
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-none border-2 border-black bg-white shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* 導航 */}
      <nav className="flex-1">
        {navSections.map((section) => (
          <div key={section.title} className="mb-6">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-none border-2 border-black px-4 py-2.5 font-bold transition-all",
                      isActive
                        ? "bg-brand-primary text-white shadow-none translate-x-[2px] translate-y-[2px]"
                        : "bg-white shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* 登出 */}
      <button className="flex w-full items-center gap-3 rounded-none border-2 border-black bg-red-500 px-4 py-2.5 font-bold text-white shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
        <LogOut className="h-5 w-5" />
        <span>登出</span>
      </button>
    </div>
  )
}
```

**所需新增基礎元件（Drawer）：**

```bash
# 使用 shadcn/ui CLI 安裝 Sheet 元件（作為 Drawer）
npx shadcn@latest add sheet
```

### 4.2 後台表格響應式改造

**策略：** 桌面版完整表格 / 手機版卡片視圖

**OrderTable 改造範例：**

```tsx
// components/admin/order-table.tsx
'use client'

import { formatDate } from '@/lib/utils'
import { OrderStatusBadge } from '@/components/admin/order-status-badge'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Order } from '@/types'

interface OrderTableProps {
  orders: Order[]
}

export function OrderTable({ orders }: OrderTableProps) {
  if (orders.length === 0) {
    return (
      <div className="border-2 md:border-3 border-dashed border-gray-300 p-8 text-center">
        <p className="text-sm md:text-base text-gray-500">尚無訂單</p>
      </div>
    )
  }

  return (
    <>
      {/* 桌面版：表格 */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="border-b-3 border-black">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-bold">訂單編號</th>
              <th className="px-4 py-3 text-left text-sm font-bold">客戶</th>
              <th className="px-4 py-3 text-left text-sm font-bold">等級</th>
              <th className="px-4 py-3 text-left text-sm font-bold">狀態</th>
              <th className="px-4 py-3 text-right text-sm font-bold">金額</th>
              <th className="px-4 py-3 text-left text-sm font-bold">建立時間</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className="border-b-2 border-gray-200 hover:bg-gray-50"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-mono font-bold text-brand-primary hover:underline"
                  >
                    {order.order_number}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div className="font-bold">{order.user_name}</div>
                  <div className="text-sm text-gray-600">{order.user_phone}</div>
                </td>
                <td className="px-4 py-3">{order.tier_name}</td>
                <td className="px-4 py-3">
                  <OrderStatusBadge status={order.status} />
                </td>
                <td className="px-4 py-3 text-right font-bold">
                  NT$ {order.total_amount.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {formatDate(order.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 手機版：卡片視圖 */}
      <div className="lg:hidden space-y-3 md:space-y-4">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/admin/orders/${order.id}`}
            className={cn(
              "block rounded-none bg-white",
              "border-2 md:border-3 border-black",
              "shadow-neo-sm md:shadow-neo",
              "p-4",
              "transition-all duration-150",
              "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            )}
          >
            {/* 訂單編號 */}
            <div className="mb-2 font-mono text-sm font-bold text-brand-primary">
              {order.order_number}
            </div>

            {/* 客戶資訊 */}
            <div className="mb-3">
              <div className="font-bold text-sm md:text-base">{order.user_name}</div>
              <div className="text-xs md:text-sm text-gray-600">
                {order.user_phone} · {order.tier_name}
              </div>
            </div>

            {/* 狀態與金額 */}
            <div className="flex items-center justify-between">
              <OrderStatusBadge status={order.status} size="sm" />
              <div className="text-base md:text-lg font-bold">
                NT$ {order.total_amount.toLocaleString()}
              </div>
            </div>

            {/* 時間 */}
            <div className="mt-2 text-xs text-gray-500">
              {formatDate(order.created_at)}
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}
```

**ClientTable 改造範例：**

```tsx
// components/admin/client-table.tsx
'use client'

import { TierBadge } from '@/components/admin/tier-badge'
import { StatusBadge } from '@/components/ui/status-badge'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Client } from '@/types'

interface ClientTableProps {
  clients: Client[]
}

export function ClientTable({ clients }: ClientTableProps) {
  if (clients.length === 0) {
    return (
      <div className="border-2 md:border-3 border-dashed border-gray-300 p-8 text-center">
        <p className="text-sm md:text-base text-gray-500">尚無客戶</p>
      </div>
    )
  }

  return (
    <>
      {/* 桌面版：表格 */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="border-b-3 border-black">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-bold">姓名</th>
              <th className="px-4 py-3 text-left text-sm font-bold">手機</th>
              <th className="px-4 py-3 text-left text-sm font-bold">會員等級</th>
              <th className="px-4 py-3 text-left text-sm font-bold">狀態</th>
              <th className="px-4 py-3 text-left text-sm font-bold">註冊時間</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr
                key={client.id}
                className="border-b-2 border-gray-200 hover:bg-gray-50"
              >
                <td className="px-4 py-3 font-bold">{client.name}</td>
                <td className="px-4 py-3 font-mono text-sm">{client.phone}</td>
                <td className="px-4 py-3">
                  <TierBadge tier={client.tier} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={client.status} />
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {formatDate(client.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 手機版：卡片視圖 */}
      <div className="lg:hidden space-y-3 md:space-y-4">
        {clients.map((client) => (
          <div
            key={client.id}
            className={cn(
              "rounded-none bg-white",
              "border-2 md:border-3 border-black",
              "shadow-neo-sm md:shadow-neo",
              "p-4"
            )}
          >
            {/* 姓名 */}
            <div className="mb-2 text-base md:text-lg font-bold">
              {client.name}
            </div>

            {/* 手機號碼 */}
            <div className="mb-3 font-mono text-sm text-gray-600">
              {client.phone}
            </div>

            {/* 等級與狀態 */}
            <div className="flex items-center gap-2 mb-2">
              <TierBadge tier={client.tier} size="sm" />
              <StatusBadge status={client.status} size="sm" />
            </div>

            {/* 註冊時間 */}
            <div className="text-xs text-gray-500">
              註冊於 {formatDate(client.created_at)}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
```

**適用表格：**

- ✅ `OrderTable` - 訂單列表（**優先級 P0**）
- ✅ `ClientTable` - 客戶列表（**優先級 P0**）
- `ProductTable` - 商品列表（**優先級 P1**）
- `TierTable` - 等級列表（**優先級 P2**）
- `CategoryTable` - 分類列表（**優先級 P2**）

### 4.3 圖片響應式改進

**策略：** 使用 Next.js Image 元件 + `sizes` 屬性優化載入

```tsx
// 商品卡片圖片尺寸優化
import Image from 'next/image'

<div className={cn(
  "aspect-square overflow-hidden rounded-none bg-gray-100",
  "border-2 md:border-3 border-black"  // 邊框響應式
)}>
  <Image
    src={product.image_url || '/placeholder-product.png'}
    alt={product.name}
    width={400}
    height={400}
    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
    className="h-full w-full object-cover"
    priority={false}  // 非首屏圖片使用懶加載
  />
</div>
```

**購物車圖片尺寸響應式：**

```tsx
// components/shop/cart-item.tsx
// 改造前：h-24 w-24（固定 96px）
// 改造後：響應式尺寸

<div className={cn(
  "flex-shrink-0 rounded-none bg-gray-100",
  "border-2 border-black",
  "h-16 w-16 md:h-24 md:w-24"  // 手機 64px / 桌面 96px
)}>
  <Image
    src={item.image_url || '/placeholder-product.png'}
    alt={item.name}
    width={96}
    height={96}
    className="h-full w-full object-cover"
  />
</div>
```

### 4.4 按鈕與表單元件

**Button 元件響應式調整：**

```tsx
// components/ui/button.tsx
import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // 基礎樣式
          "inline-flex items-center justify-center font-bold rounded-none transition-all",
          // Neo-Brutalism
          "border-2 md:border-3 border-black",
          "shadow-neo-sm md:shadow-neo",
          "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
          // 尺寸響應式
          size === 'sm' && "px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm",
          size === 'md' && "px-4 py-2 text-sm md:px-6 md:py-3 md:text-base",
          size === 'lg' && "px-6 py-3 text-base md:px-8 md:py-4 md:text-lg",
          // 顏色變體
          variant === 'primary' && "bg-brand-primary text-white hover:bg-blue-700",
          variant === 'secondary' && "bg-brand-secondary text-white hover:bg-orange-600",
          variant === 'outline' && "bg-white text-black hover:bg-gray-100",
          variant === 'danger' && "bg-red-500 text-white hover:bg-red-600",
          // 禁用狀態
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0",
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
```

**Input 元件響應式調整：**

```tsx
// components/ui/input.tsx
import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          // 基礎樣式
          "w-full rounded-none bg-white",
          // Neo-Brutalism
          "border-2 md:border-3 border-black",
          // 響應式間距與文字
          "px-3 py-2 text-sm md:px-4 md:py-2.5 md:text-base",
          // Focus 狀態
          "focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2",
          // 禁用狀態
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100",
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'

export { Input }
```

---

## 五、實作範例

### 5.1 後台 Admin Layout 改造

**改造前：**

```tsx
// app/(admin)/admin/layout.tsx
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />  {/* 固定 w-64，手機上溢出 */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
```

**改造後：**

```tsx
// app/(admin)/admin/layout.tsx
import { Sidebar } from '@/components/admin/sidebar'
import { MobileNav } from '@/components/admin/mobile-nav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* 手機版：漢堡菜單（固定位置） */}
      <MobileNav />

      {/* 平板/桌面版：響應式 Sidebar */}
      <Sidebar />

      {/* Main Content（響應式間距） */}
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        {/* 統一容器寬度（根據內容選擇） */}
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}
```

### 5.2 前台商店頁面改造

**改造前：**

```tsx
// app/(shop)/store/page.tsx
<div className="min-h-screen bg-background p-6">
  <div className="mx-auto max-w-7xl">
    <div className="mb-6 rounded-none border-3 border-black bg-white p-6 shadow-neo">
      <h1 className="mb-2 text-3xl font-bold">商品系列</h1>
      <p className="text-gray-600">瀏覽所有商品系列</p>
    </div>

    {/* 系列列表 */}
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* ... */}
    </div>
  </div>
</div>
```

**改造後：**

```tsx
// app/(shop)/store/page.tsx
<div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
  <div className="mx-auto max-w-7xl space-y-4 md:space-y-6 lg:space-y-8">
    {/* 頁面標題卡片 */}
    <div className={cn(
      "rounded-none bg-white",
      "border-2 md:border-3 border-black",
      "shadow-neo-sm md:shadow-neo",
      "p-4 md:p-6"
    )}>
      <h1 className="mb-2 text-2xl md:text-3xl lg:text-4xl font-bold">
        商品系列
      </h1>
      <p className="text-sm md:text-base text-gray-600">
        瀏覽所有商品系列
      </p>
    </div>

    {/* 系列列表 */}
    <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
      {series.map((item) => (
        <SeriesCard key={item.id} series={item} />
      ))}
    </div>
  </div>
</div>
```

### 5.3 訂單詳情頁面改造

**改造後：**

```tsx
// app/(admin)/admin/orders/[id]/page.tsx
export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const order = await getOrderById(params.id)

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
        {/* 標題與返回按鈕 */}
        <div className={cn(
          "rounded-none bg-white",
          "border-2 md:border-3 border-black",
          "shadow-neo-sm md:shadow-neo",
          "p-4 md:p-6"
        )}>
          <div className="flex items-center gap-4">
            <Link
              href="/admin/orders"
              className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-none border-2 md:border-3 border-black bg-white shadow-neo-sm md:shadow-neo transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">
              訂單詳情
            </h1>
          </div>
        </div>

        {/* 訂單資訊（桌面版雙欄 / 手機版單欄） */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* 訂單基本資訊 */}
          <OrderInfoCard order={order} />

          {/* 客戶資訊 */}
          <CustomerInfoCard customer={order.customer} />
        </div>

        {/* 訂單明細（響應式表格/卡片） */}
        <div className={cn(
          "rounded-none bg-white",
          "border-2 md:border-3 border-black",
          "shadow-neo-sm md:shadow-neo",
          "p-4 md:p-6"
        )}>
          <h2 className="mb-4 text-lg md:text-xl font-bold">訂單明細</h2>
          <OrderItemsTable items={order.items} />
        </div>

        {/* 操作歷史 */}
        <div className={cn(
          "rounded-none bg-white",
          "border-2 md:border-3 border-black",
          "shadow-neo-sm md:shadow-neo",
          "p-4 md:p-6"
        )}>
          <h2 className="mb-4 text-lg md:text-xl font-bold">操作歷史</h2>
          <OrderTimeline timelines={order.timelines} />
        </div>
      </div>
    </div>
  )
}
```

---

## 六、憲章修訂建議

### 6.1 修改「核心憲章原則 I」

**原文：**

```markdown
### I. 使用者角色優先
- **必須** 嚴格區分客戶 (Client) 與管理員 (Admin) 的操作環境
- 客戶端優化行動裝置，管理端優化桌面裝置
- 雙入口設計不可混淆
```

**修訂為：**

```markdown
### I. 使用者角色優先
- **必須** 嚴格區分客戶 (Client) 與管理員 (Admin) 的操作環境
- **前台（客戶端）**：手機優先設計，優化單手操作與快速下單體驗
  - 主要使用情境：手機（80%）、桌面（20%）
  - 設計重點：大按鈕、簡化導航、快速加入購物車
- **後台（管理端）**：桌面優化設計，但 **必須支援手機響應式 UI**
  - 主要使用情境：桌面（70%）、手機（30%，應急查看與操作）
  - 桌面版：完整表格 + 側邊欄展開
  - 手機版：卡片視圖 + 漢堡菜單
- 雙入口設計不可混淆
```

### 6.2 新增「核心憲章原則 VII - 響應式設計規範」

```markdown
### VII. 響應式設計規範

#### 7.1 統一斷點系統
- **必須** 使用 Tailwind 預設斷點（sm: 640px / md: 768px / lg: 1024px / xl: 1280px）
- **必須** 採用 Mobile-First 開發策略（從手機版開始，逐步增強）

#### 7.2 設計 Token 系統
- **容器寬度**：一般頁面 `max-w-7xl`，表單頁面 `max-w-4xl`
- **間距**：頁面外層 `p-4 md:p-6 lg:p-8`，卡片內距 `p-4 md:p-6`
- **文字尺寸**：
  - h1: `text-2xl md:text-3xl lg:text-4xl font-bold`
  - h2: `text-xl md:text-2xl lg:text-3xl font-bold`
  - body: `text-sm md:text-base`

#### 7.3 Neo-Brutalism 響應式
- **邊框**：手機版 `border-2`，桌面版 `md:border-3`
- **陰影**：手機版 `shadow-neo-sm`，桌面版 `md:shadow-neo`
- **點擊效果**：保持一致（`active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`）

#### 7.4 元件適配規則
- **後台 Sidebar**：手機版隱藏 + 漢堡菜單，平板版收縮（w-16，僅圖示），桌面版展開（w-64）
- **後台表格**：桌面版完整表格，手機版卡片視圖
- **圖片**：必須使用 Next.js Image + `sizes` 屬性優化載入
- **按鈕與輸入框**：響應式尺寸與間距

#### 7.5 開發規範
- **必須** 使用 `cn()` 工具函式組合 className
- **必須** 按順序排列響應式類別（預設 → sm → md → lg → xl）
- **禁止** 硬編碼尺寸（除非有充分理由）
- **優先** 使用設計 Token 而非自訂樣式
```

### 6.3 修改「設計系統一致性」原則

**原文：**

```markdown
### V. 設計系統一致性
- 遵循 Neo-Brutalism 風格
- 所有元件使用 2-3px 實心黑邊框
- 硬邊陰影（無模糊）
- 點擊狀態包含位移效果
```

**修訂為：**

```markdown
### V. 設計系統一致性
- 遵循 Neo-Brutalism 風格，並支援響應式調整
- **邊框**：手機版 2px，桌面版 3px（`border-2 md:border-3`）
- **陰影**：硬邊陰影（無模糊），手機版 2px，桌面版 4px（`shadow-neo-sm md:shadow-neo`）
- **點擊效果**：統一位移效果（`active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`）
- **色彩系統**：使用品牌色（brand-primary / brand-secondary / brand-success 等）
- **統一 Token**：容器寬度、間距、文字尺寸必須使用設計 Token 系統
```

---

## 七、實作計畫（分階段）

### Phase 1: 基礎設施與設計系統（P0 - 1-2 天）

#### Task 1.1: 設計 Token 系統建立

- [ ] 更新 `tailwind.config.ts`，確保響應式 shadow 變體正確
- [ ] 建立 `lib/design-tokens.ts`，集中定義所有 Token
- [ ] 建立工具函式 `getResponsiveClasses()` 快速組合樣式（可選）

**檔案：**
- `tailwind.config.ts`
- `lib/design-tokens.ts`（新增）

#### Task 1.2: 共用元件基礎改造

- [ ] `components/ui/button.tsx` - 響應式尺寸與邊框
- [ ] `components/ui/input.tsx` - 響應式間距與文字
- [ ] `components/ui/card.tsx` - 響應式卡片元件（新增）
- [ ] `components/ui/sheet.tsx` - 使用 shadcn/ui 安裝 Sheet（作為 Drawer）

**指令：**
```bash
npx shadcn@latest add sheet
```

#### Task 1.3: Typography 組件（可選，視需求）

- [ ] `components/ui/heading.tsx` - 響應式標題元件（h1/h2/h3）
- [ ] `components/ui/text.tsx` - 響應式文字元件

**產出文件：**
- `docs/design-tokens.md` - 設計 Token 文檔（可選）
- `docs/responsive-guide.md` - 響應式開發指南（可選）

**驗證：**
- [ ] 所有基礎元件在手機/平板/桌面正常顯示
- [ ] Neo-Brutalism 風格一致性檢查

---

### Phase 2: 後台 Sidebar 與 Layout（P0 - 2-3 天）

#### Task 2.1: Sidebar 響應式改造

- [ ] 修改 `components/admin/sidebar.tsx`
  - 手機版：完全隱藏（`hidden md:flex`）
  - 平板版：收縮為圖示列（`md:w-16`）
  - 桌面版：完整展開（`lg:w-64`）
  - 導航項目：平板版僅圖示，桌面版圖示+文字

**檔案：**
- `components/admin/sidebar.tsx`

#### Task 2.2: 手機版導航元件

- [ ] 建立 `components/admin/mobile-nav.tsx` - 漢堡按鈕 + Drawer 觸發
- [ ] 建立 `components/admin/mobile-sidebar.tsx` - 手機版 Sidebar 內容

**檔案：**
- `components/admin/mobile-nav.tsx`（新增）
- `components/admin/mobile-sidebar.tsx`（新增）

#### Task 2.3: Admin Layout 改造

- [ ] 修改 `app/(admin)/admin/layout.tsx`
  - 整合 `<MobileNav />` 與 `<Sidebar />`
  - 統一 Main Content 間距（`p-4 md:p-6 lg:p-8`）
  - 統一容器寬度（`max-w-7xl`）

**檔案：**
- `app/(admin)/admin/layout.tsx`

**驗證：**
- [ ] 手機版（375px）：漢堡菜單正常運作，點擊開啟 Drawer
- [ ] 平板版（768px）：Sidebar 收縮為圖示列
- [ ] 桌面版（1280px）：Sidebar 完整展開
- [ ] 所有後台頁面不溢出視口

---

### Phase 3: 後台表格元件改造（P0 - 3-4 天）

#### Task 3.1: OrderTable 響應式

- [ ] 修改 `components/admin/order-table.tsx`
  - 桌面版：完整表格（`lg:block`）
  - 手機版：卡片視圖（`lg:hidden`）
  - 優化卡片資訊層級（訂單編號、客戶、狀態、金額、時間）

**檔案：**
- `components/admin/order-table.tsx`

#### Task 3.2: ClientTable 響應式

- [ ] 修改 `components/admin/client-table.tsx`
  - 桌面版：完整表格
  - 手機版：卡片視圖（姓名、手機、等級、狀態）

**檔案：**
- `components/admin/client-table.tsx`

#### Task 3.3: 其他表格（P1，可延後）

- [ ] `components/admin/product-table.tsx` - 商品列表
- [ ] `components/admin/tier-table.tsx` - 等級列表（簡單表格，可只優化間距）
- [ ] `components/admin/category-table.tsx` - 分類列表（簡單表格，可只優化間距）

**共用元件（可選）：**
- [ ] `components/admin/responsive-table.tsx` - 響應式表格包裝器
- [ ] `components/admin/table-card-item.tsx` - 卡片視圖項目

**驗證：**
- [ ] 手機版：卡片視圖可讀性良好，資訊層級清晰
- [ ] 桌面版：表格完整功能正常
- [ ] 卡片點擊導向詳情頁正常

---

### Phase 4: 前台響應式優化（P1 - 2-3 天）

#### Task 4.1: Navbar 優化

- [ ] 修改 `components/shop/navbar.tsx`
  - 優化間距（`p-3 md:p-4`）
  - 優化按鈕尺寸（使用 Button 元件的響應式尺寸）
  - 移除重複的用戶資訊區塊（保留一個，使用響應式顯示）

**檔案：**
- `components/shop/navbar.tsx`

#### Task 4.2: 頁面容器統一化

- [ ] 修改所有前台頁面，統一間距與容器寬度
  - `app/(shop)/store/page.tsx` - 商品列表頁
  - `app/(shop)/store/[id]/page.tsx` - 商品詳情頁
  - `app/(shop)/store/cart/page.tsx` - 購物車頁
  - `app/(shop)/store/orders/page.tsx` - 訂單列表頁
  - `app/(shop)/store/orders/[id]/page.tsx` - 訂單詳情頁

**統一樣式：**
```tsx
<div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
  <div className="mx-auto max-w-7xl space-y-4 md:space-y-6 lg:space-y-8">
    {/* 內容 */}
  </div>
</div>
```

#### Task 4.3: 商品列表與詳情

- [ ] 修改 `components/shop/product-card.tsx`
  - 邊框與陰影優化（`border-2 md:border-3`）
  - 間距優化（`p-3 md:p-4`）
- [ ] 修改 `components/shop/product-list.tsx`
  - Grid 間距優化（`gap-4 md:gap-6`）
- [ ] 修改商品詳情頁面布局（標題、間距）

**檔案：**
- `components/shop/product-card.tsx`
- `components/shop/product-list.tsx`
- `app/(shop)/store/[id]/page.tsx`

#### Task 4.4: 購物車與訂單

- [ ] 修改 `components/shop/cart-item.tsx`
  - 圖片尺寸響應式（`h-16 w-16 md:h-24 md:w-24`）
  - 間距優化
- [ ] 修改購物車頁面標題與間距
- [ ] 修改訂單詳情頁面布局

**檔案：**
- `components/shop/cart-item.tsx`
- `app/(shop)/store/cart/page.tsx`
- `app/(shop)/store/orders/[id]/page.tsx`

**驗證：**
- [ ] 所有前台頁面在手機/桌面正常顯示
- [ ] 文字可讀性良好
- [ ] 按鈕可點擊性良好（目標區域 >= 44px）

---

### Phase 5: 文字與間距全面優化（P1 - 2 天）

#### Task 5.1: 標題響應式（批量修改）

使用 Grep 工具批量查找需要修改的標題：

```bash
# 查找所有 text-3xl 或 text-4xl
grep -r "text-3xl\|text-4xl" app/ components/ --include="*.tsx"
```

**修改規則：**
- `text-4xl` → `text-2xl md:text-3xl lg:text-4xl`
- `text-3xl` → `text-xl md:text-2xl lg:text-3xl`
- `text-2xl` → `text-lg md:text-xl lg:text-2xl`

**影響檔案（預估）：**
- 所有頁面標題（`app/` 目錄下約 15-20 個檔案）
- 部分元件標題（`components/` 目錄下約 5-10 個檔案）

#### Task 5.2: 間距統一化（批量修改）

**修改規則：**
- 頁面外層：`p-6` → `p-4 md:p-6 lg:p-8`
- 頁面外層：`p-8` → `p-4 md:p-6 lg:p-8`
- 卡片內距：`p-6` → `p-4 md:p-6`
- Grid 間距：`gap-6` → `gap-4 md:gap-6`
- 垂直間距：`space-y-6` → `space-y-4 md:space-y-6 lg:space-y-8`

**工具：**
- 使用 Grep 批量查找
- 使用 Edit 工具逐一修改（或建立腳本自動化）

#### Task 5.3: Neo-Brutalism 元素優化

**修改規則：**
- 邊框：`border-3` → `border-2 md:border-3`
- 陰影：`shadow-neo` → `shadow-neo-sm md:shadow-neo`

**影響檔案（預估）：**
- 所有卡片元件
- 所有按鈕元件（已在 Phase 1 完成）

**驗證：**
- [ ] 手機版視覺重量減輕，內容空間增加
- [ ] 桌面版保持原設計風格
- [ ] 所有文字在各尺寸屏幕可讀性良好

---

### Phase 6: 圖片與媒體響應式（P2 - 1 天）

#### Task 6.1: 圖片尺寸優化

- [ ] 修改所有 `<Image>` 元件，新增 `sizes` 屬性
  - 商品卡片：`sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"`
  - 商品詳情：`sizes="(max-width: 768px) 100vw, 50vw"`
  - 購物車圖片：`sizes="96px"`

**影響檔案：**
- `components/shop/product-card.tsx`
- `components/shop/cart-item.tsx`
- `app/(shop)/store/[id]/page.tsx`
- `components/shop/series-card.tsx`

#### Task 6.2: 廣告輪播響應式（如有）

- [ ] `components/announcements/AnnouncementCarousel.tsx`
  - 高度響應式（`h-48 md:h-64 lg:h-80`）
  - 內容文字響應式

**驗證：**
- [ ] 圖片載入速度優化（使用 Chrome DevTools Network 檢查）
- [ ] 不同屏幕載入對應尺寸圖片

---

### Phase 7: 測試與文件（P0 - 2 天）

#### Task 7.1: 跨裝置測試

**測試裝置尺寸：**
- [ ] 手機直屏（375px）- iPhone SE
- [ ] 手機橫屏（667px）
- [ ] 手機大屏（414px）- iPhone Pro Max
- [ ] 平板直屏（768px）- iPad
- [ ] 平板橫屏（1024px）- iPad Pro
- [ ] 桌面（1280px）
- [ ] 大桌面（1920px）

**測試重點：**
- [ ] Sidebar 響應式正常（收縮/展開/隱藏）
- [ ] 表格/卡片切換正常
- [ ] 文字可讀性良好
- [ ] 按鈕可點擊性良好（目標區域 >= 44px）
- [ ] 圖片載入正常，無溢出
- [ ] 橫向不出現滾動條（除非必要，如表格）

**測試瀏覽器：**
- [ ] Chrome（最新版）
- [ ] Safari（macOS/iOS）
- [ ] Firefox（最新版）
- [ ] Edge（最新版）

#### Task 7.2: 文件更新

- [ ] 更新 `CLAUDE.md` 憲章（Phase 1 優先完成）
- [ ] 建立 `docs/design-tokens.md`（設計 Token 文檔）
- [ ] 建立 `docs/responsive-guide.md`（響應式開發指南）
- [ ] 建立 `docs/component-responsive-checklist.md`（檢查清單）

#### Task 7.3: Screenshot 文件（可選）

- [ ] 建立響應式效果對比圖
  - 後台 Sidebar（手機/平板/桌面）
  - 訂單表格（手機卡片視圖 vs 桌面表格）
  - 前台商品列表（1欄/2欄/3欄）

**驗證：**
- [ ] 所有測試通過
- [ ] 文件完整且易懂
- [ ] 團隊成員理解新規範

---

## 八、關鍵文件位置

### 8.1 需要建立的新文件

**Phase 1（基礎設施）：**
- `lib/design-tokens.ts` - 設計 Token 定義
- `components/ui/card.tsx` - 響應式卡片元件
- `components/ui/heading.tsx` - 響應式標題元件（可選）

**Phase 2（後台 Sidebar）：**
- `components/admin/mobile-nav.tsx` - 手機版導航（漢堡按鈕）
- `components/admin/mobile-sidebar.tsx` - 手機版 Sidebar 內容

**Phase 3（共用元件，可選）：**
- `components/admin/responsive-table.tsx` - 響應式表格包裝器
- `components/admin/table-card-item.tsx` - 卡片視圖項目

**文件：**
- `docs/design-tokens.md` - Token 文檔
- `docs/responsive-guide.md` - 開發指南
- `docs/component-responsive-checklist.md` - 檢查清單

### 8.2 需要修改的關鍵文件（按優先級排序）

#### P0 - 立即修改（Phase 1-3）

1. **`tailwind.config.ts`** - 確保響應式 shadow 變體正確
2. **`components/admin/sidebar.tsx`** - 響應式改造（手機隱藏/平板收縮/桌面展開）
3. **`app/(admin)/admin/layout.tsx`** - 整合響應式 Sidebar 與 MobileNav
4. **`components/admin/order-table.tsx`** - 卡片視圖實作
5. **`components/admin/client-table.tsx`** - 卡片視圖實作
6. **`components/ui/button.tsx`** - 響應式尺寸與邊框
7. **`components/ui/input.tsx`** - 響應式間距與文字
8. **`CLAUDE.md`** - 憲章更新（Phase 1 完成後立即更新）

#### P1 - 重要修改（Phase 4-5）

9. **`components/shop/navbar.tsx`** - 間距優化與重複區塊移除
10. **`components/shop/cart-item.tsx`** - 圖片尺寸響應式
11. **`components/shop/product-card.tsx`** - 邊框與陰影優化
12. **`app/(shop)/store/page.tsx`** - 統一間距與文字
13. **`app/(shop)/store/cart/page.tsx`** - 統一間距與文字
14. **`app/(admin)/admin/orders/page.tsx`** - 統一間距與文字
15. **`app/(admin)/admin/clients/page.tsx`** - 統一間距與文字
16. **所有頁面標題** - 批量修改文字尺寸（使用 Grep）

#### P2 - 細節優化（Phase 6）

17. **`components/announcements/AnnouncementCarousel.tsx`** - 高度響應式（如有）
18. **所有圖片元件** - 新增 `sizes` 屬性

---

## 九、實作注意事項

### 9.1 向後兼容性

- ✅ **保持 Neo-Brutalism 設計風格** - 所有改動必須符合品牌視覺識別
- ✅ **桌面版視覺不降級** - 桌面版應保持與原設計一致的視覺效果
- ✅ **漸進增強策略** - 手機版可用（核心功能） → 桌面版完美（完整功能）

### 9.2 效能考量

- ✅ **避免過度使用響應式類別** - 導致 CSS 檔案過大（Tailwind CSS v4 已優化）
- ✅ **使用 `sizes` 屬性優化圖片載入** - 不同屏幕載入不同尺寸
- ✅ **Sidebar Drawer 使用懶加載** - 僅在手機版載入（使用 `dynamic()` 或條件渲染）
- ✅ **避免重複渲染相同元件** - 使用 `hidden md:block` 而非兩個獨立元件（如 Navbar 用戶資訊）

### 9.3 測試策略

- ✅ **Chrome DevTools 響應式模式測試** - 開發過程中持續測試
- ✅ **實機測試** - iOS Safari、Android Chrome（關鍵頁面）
- ✅ **桌面瀏覽器縮放測試** - 80% - 150% 縮放比例
- ✅ **觸控目標測試** - 所有可點擊元素 >= 44px × 44px（WCAG 2.1 AA 標準）

### 9.4 程式碼規範

- ✅ **所有響應式類別按順序排列** - 預設 → sm → md → lg → xl
  ```tsx
  // ✅ 正確
  className="p-4 md:p-6 lg:p-8"

  // ❌ 錯誤
  className="lg:p-8 p-4 md:p-6"
  ```

- ✅ **使用 `cn()` 工具函式組合類別** - 提高可讀性
  ```tsx
  import { cn } from '@/lib/utils'

  <div className={cn(
    "rounded-none bg-white",
    "border-2 md:border-3 border-black",
    "shadow-neo-sm md:shadow-neo",
    "p-4 md:p-6"
  )}>
  ```

- ✅ **複雜響應式邏輯抽取為共用元件** - 避免重複程式碼
  ```tsx
  // ✅ 正確：建立 ResponsiveTable 元件
  <ResponsiveTable
    data={orders}
    desktopView={<OrderTableDesktop />}
    mobileView={<OrderCardList />}
  />

  // ❌ 錯誤：每個表格都重複實作響應式邏輯
  ```

- ✅ **優先使用設計 Token 而非自訂樣式** - 保持一致性
  ```tsx
  // ✅ 正確
  import { spacing, typography } from '@/lib/design-tokens'
  className={spacing.page.padding}

  // ❌ 錯誤
  className="p-5 md:p-7 lg:p-9"  // 不符合 Token 系統
  ```

### 9.5 可訪問性（Accessibility）

- ✅ **觸控目標尺寸** - 所有可點擊元素 >= 44px × 44px
- ✅ **文字對比度** - 符合 WCAG 2.1 AA 標準（4.5:1）
- ✅ **鍵盤導航** - 所有功能可使用鍵盤操作
- ✅ **語意化 HTML** - 使用正確的 HTML 標籤（`<nav>`, `<main>`, `<aside>`）
- ✅ **ARIA 標籤** - Drawer、Modal 等元件必須包含適當 ARIA 屬性

### 9.6 Git Commit 規範

**Commit Message 格式（繁體中文）：**

```bash
# Phase 1
feat: 建立響應式設計 Token 系統
feat: 更新 Button 與 Input 元件響應式尺寸
docs: 更新憲章新增響應式設計規範

# Phase 2
feat: 實作後台 Sidebar 響應式改造
feat: 新增手機版漢堡菜單與 Drawer
refactor: 重構 Admin Layout 整合響應式 Sidebar

# Phase 3
feat: 實作訂單表格手機版卡片視圖
feat: 實作客戶表格手機版卡片視圖
refactor: 優化表格響應式邏輯

# Phase 4-5
refactor: 統一前台頁面容器寬度與間距
refactor: 批量更新標題文字尺寸響應式
refactor: 優化 Neo-Brutalism 元素響應式

# Phase 6-7
perf: 優化圖片載入 sizes 屬性
test: 新增跨裝置響應式測試
docs: 建立響應式開發指南文件
```

**Commit 結尾（Claude Code 自動產生）：**
```
🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

## 附錄 A：設計 Token 定義檔案

```typescript
// lib/design-tokens.ts
/**
 * Vsale-lite 響應式設計 Token 系統
 * 統一定義所有設計變數，確保一致性
 */

export const designTokens = {
  /**
   * 容器寬度
   */
  container: {
    default: 'mx-auto max-w-7xl',        // 一般頁面（1280px）
    narrow: 'mx-auto max-w-4xl',         // 表單頁面（896px）
    wide: 'mx-auto max-w-screen-2xl',    // 儀表板（1536px，僅特殊情況）
  },

  /**
   * 間距系統
   */
  spacing: {
    page: {
      padding: 'p-4 md:p-6 lg:p-8',                     // 頁面外層
      gap: 'space-y-4 md:space-y-6 lg:space-y-8',      // 垂直區塊間距
    },
    card: {
      padding: 'p-4 md:p-6',                           // 卡片內距
      gap: 'space-y-3 md:space-y-4',                   // 卡片內元素間距
    },
    grid: {
      gap: 'gap-4 md:gap-6',                           // Grid 列間距
    },
    section: {
      marginBottom: 'mb-4 md:mb-6 lg:mb-8',            // 區塊下方間距
    },
  },

  /**
   * 文字尺寸階梯
   */
  typography: {
    h1: 'text-2xl md:text-3xl lg:text-4xl font-bold',  // 頁面主標題
    h2: 'text-xl md:text-2xl lg:text-3xl font-bold',   // 區塊標題
    h3: 'text-lg md:text-xl font-bold',                // 次標題
    body: {
      base: 'text-sm md:text-base',                    // 正文
      large: 'text-base md:text-lg',                   // 大正文
    },
    caption: 'text-xs md:text-sm',                     // 輔助文字
    label: 'text-xs md:text-sm font-medium',           // 表單標籤
  },

  /**
   * Neo-Brutalism 響應式
   */
  neoBrutalism: {
    border: {
      mobile: 'border-2',                              // 手機版
      desktop: 'md:border-3',                          // 桌面版
      full: 'border-2 md:border-3',                    // 完整（手機+桌面）
    },
    shadow: {
      mobile: 'shadow-neo-sm',                         // 2px 陰影
      desktop: 'md:shadow-neo',                        // 4px 陰影
      full: 'shadow-neo-sm md:shadow-neo',             // 完整（手機+桌面）
    },
    active: 'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
    hover: 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
  },

  /**
   * 按鈕尺寸
   */
  button: {
    sm: 'px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm',
    md: 'px-4 py-2 text-sm md:px-6 md:py-3 md:text-base',
    lg: 'px-6 py-3 text-base md:px-8 md:py-4 md:text-lg',
  },

  /**
   * 輸入框尺寸
   */
  input: {
    base: 'px-3 py-2 text-sm md:px-4 md:py-2.5 md:text-base',
  },
} as const

/**
 * 工具函式：組合 Neo-Brutalism 完整樣式
 */
export function getNeoBrutalismClasses(options?: {
  hover?: boolean
  active?: boolean
}) {
  const classes = [
    designTokens.neoBrutalism.border.full,
    designTokens.neoBrutalism.shadow.full,
  ]

  if (options?.hover) {
    classes.push(designTokens.neoBrutalism.hover)
  }

  if (options?.active) {
    classes.push(designTokens.neoBrutalism.active)
  }

  return classes.join(' ')
}

/**
 * 工具函式：組合頁面容器樣式
 */
export function getPageContainerClasses(variant: 'default' | 'narrow' | 'wide' = 'default') {
  return [
    'min-h-screen bg-background',
    designTokens.spacing.page.padding,
    designTokens.container[variant],
    designTokens.spacing.page.gap,
  ].join(' ')
}
```

**使用範例：**

```tsx
import { designTokens, getNeoBrutalismClasses, getPageContainerClasses } from '@/lib/design-tokens'

// 頁面容器
<div className={getPageContainerClasses('default')}>
  {/* 內容 */}
</div>

// 卡片元件
<div className={cn(
  "rounded-none bg-white",
  getNeoBrutalismClasses({ hover: true }),
  designTokens.spacing.card.padding
)}>
  <h2 className={designTokens.typography.h2}>卡片標題</h2>
  <p className={designTokens.typography.body.base}>卡片內容</p>
</div>

// 按鈕
<button className={cn(
  "bg-brand-primary text-white font-bold",
  getNeoBrutalismClasses({ active: true }),
  designTokens.button.md
)}>
  確認
</button>
```

---

## 附錄 B：響應式開發檢查清單

### 新增元件檢查清單

- [ ] **容器寬度**：是否使用統一的 `max-w-7xl` 或 `max-w-4xl`？
- [ ] **間距**：是否使用響應式間距（`p-4 md:p-6 lg:p-8`）？
- [ ] **文字尺寸**：標題是否使用響應式階梯？
- [ ] **Neo-Brutalism**：邊框與陰影是否響應式（`border-2 md:border-3`）？
- [ ] **圖片**：是否使用 Next.js Image + `sizes` 屬性？
- [ ] **按鈕**：是否使用響應式尺寸？觸控目標 >= 44px？
- [ ] **表格**：是否提供手機版卡片替代視圖？
- [ ] **測試**：是否在手機/平板/桌面測試通過？

### 修改現有元件檢查清單

- [ ] **向後兼容**：桌面版視覺是否與原設計一致？
- [ ] **效能**：是否避免過度使用響應式類別？
- [ ] **可訪問性**：觸控目標、對比度、鍵盤導航是否符合標準？
- [ ] **程式碼品質**：響應式類別是否按順序排列？
- [ ] **設計 Token**：是否優先使用 Token 而非自訂樣式？

---

**文件結尾 - 版本 1.0.0**
