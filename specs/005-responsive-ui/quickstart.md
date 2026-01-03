# Quickstart: 響應式 UI 適配系統

**Feature**: 005-responsive-ui
**Date**: 2026-01-04
**Target Audience**: 開發者、設計師

## 概述

本指南幫助開發者快速上手響應式 UI 適配系統,包含設計 Token 使用、新增響應式元件的標準流程,以及常見問題解決方案。

---

## 開發環境設定

### 1. 安裝必要依賴

```bash
# 安裝 shadcn/ui Sheet 元件 (手機版 Sidebar Drawer)
npx shadcn@latest add sheet

# 驗證安裝成功
ls components/ui/sheet.tsx
```

### 2. 確認 Tailwind 配置

確保 `tailwind.config.ts` 包含 Neo-Brutalism 陰影定義:

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      boxShadow: {
        'neo': '4px 4px 0px 0px rgba(0,0,0,1)',
        'neo-sm': '2px 2px 0px 0px rgba(0,0,0,1)',
        'neo-lg': '6px 6px 0px 0px rgba(0,0,0,1)',
      },
      borderWidth: {
        '3': '3px',
      },
    },
  },
} satisfies Config
```

### 3. 建立設計 Token 系統

建立 `lib/design-tokens.ts`:

```typescript
/**
 * Vsale-lite 響應式設計 Token 系統
 * 統一定義所有設計變數,確保一致性
 */

export const designTokens = {
  /**
   * 容器寬度
   */
  container: {
    default: 'mx-auto max-w-7xl',        // 一般頁面 (1280px)
    narrow: 'mx-auto max-w-4xl',         // 表單頁面 (896px)
    wide: 'mx-auto max-w-screen-2xl',    // 儀表板 (1536px,僅特殊情況)
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
      full: 'border-2 md:border-3',                    // 完整 (手機+桌面)
    },
    shadow: {
      mobile: 'shadow-neo-sm',                         // 2px 陰影
      desktop: 'md:shadow-neo',                        // 4px 陰影
      full: 'shadow-neo-sm md:shadow-neo',             // 完整 (手機+桌面)
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
 * 工具函式: 組合 Neo-Brutalism 完整樣式
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
 * 工具函式: 組合頁面容器樣式
 */
export function getPageContainerClasses(
  variant: 'default' | 'narrow' | 'wide' = 'default'
) {
  return [
    'min-h-screen bg-background',
    designTokens.spacing.page.padding,
    designTokens.container[variant],
    designTokens.spacing.page.gap,
  ].join(' ')
}
```

---

## 使用範例

### 1. 建立響應式頁面

```tsx
// app/(admin)/admin/example/page.tsx
import { designTokens, getPageContainerClasses } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

export default function ExamplePage() {
  return (
    <div className={getPageContainerClasses('default')}>
      {/* 頁面標題卡片 */}
      <div className={cn(
        "rounded-none bg-white",
        designTokens.neoBrutalism.border.full,
        designTokens.neoBrutalism.shadow.full,
        designTokens.spacing.card.padding
      )}>
        <h1 className={designTokens.typography.h1}>
          範例頁面
        </h1>
        <p className={designTokens.typography.body.base}>
          這是一個響應式頁面範例
        </p>
      </div>

      {/* 內容區塊 */}
      <div className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        designTokens.spacing.grid.gap
      )}>
        {/* Grid 項目 */}
      </div>
    </div>
  )
}
```

### 2. 建立響應式卡片元件

```tsx
// components/example-card.tsx
import { designTokens, getNeoBrutalismClasses } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface ExampleCardProps {
  title: string
  description: string
}

export function ExampleCard({ title, description }: ExampleCardProps) {
  return (
    <div className={cn(
      "rounded-none bg-white",
      getNeoBrutalismClasses({ hover: true }),
      designTokens.spacing.card.padding
    )}>
      <h2 className={designTokens.typography.h2}>
        {title}
      </h2>
      <p className={designTokens.typography.body.base}>
        {description}
      </p>
    </div>
  )
}
```

### 3. 建立響應式按鈕

```tsx
// components/ui/button.tsx (修改現有檔案)
import { designTokens, getNeoBrutalismClasses } from '@/lib/design-tokens'
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
          getNeoBrutalismClasses({ active: true }),
          // 響應式尺寸
          designTokens.button[size],
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

### 4. 使用 Next.js Image 優化圖片載入

```tsx
// 商品卡片圖片
import Image from 'next/image'

<div className={cn(
  "aspect-square overflow-hidden rounded-none bg-gray-100",
  designTokens.neoBrutalism.border.full
)}>
  <Image
    src={product.image_url || '/placeholder-product.png'}
    alt={product.name}
    width={400}
    height={400}
    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
    className="h-full w-full object-cover"
    loading="lazy"
  />
</div>

// 購物車商品圖片 (響應式尺寸)
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
    sizes="96px"
    className="h-full w-full object-cover"
  />
</div>
```

### 5. 建立響應式表格 (桌面表格 + 手機卡片)

```tsx
// components/example-table.tsx
import { designTokens, getNeoBrutalismClasses } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Item {
  id: string
  name: string
  status: string
  amount: number
}

interface ExampleTableProps {
  items: Item[]
}

export function ExampleTable({ items }: ExampleTableProps) {
  return (
    <>
      {/* 桌面版: 完整表格 */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="border-b-3 border-black">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-bold">名稱</th>
              <th className="px-4 py-3 text-left text-sm font-bold">狀態</th>
              <th className="px-4 py-3 text-right text-sm font-bold">金額</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b-2 border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-3 font-bold">{item.name}</td>
                <td className="px-4 py-3">{item.status}</td>
                <td className="px-4 py-3 text-right font-bold">
                  NT$ {item.amount.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 手機版: 卡片視圖 */}
      <div className="lg:hidden space-y-3 md:space-y-4">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/example/${item.id}`}
            className={cn(
              "block rounded-none bg-white",
              getNeoBrutalismClasses({ active: true }),
              designTokens.spacing.card.padding
            )}
          >
            <div className={cn("font-bold", designTokens.typography.body.base)}>
              {item.name}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className={designTokens.typography.caption}>{item.status}</span>
              <span className={cn("font-bold", designTokens.typography.body.base)}>
                NT$ {item.amount.toLocaleString()}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}
```

---

## 開發規範

### 1. 響應式類別排列順序

**必須按順序排列**: 預設 → sm → md → lg → xl

```tsx
// ✅ 正確
<div className="p-4 md:p-6 lg:p-8">

// ❌ 錯誤 (順序錯亂)
<div className="lg:p-8 p-4 md:p-6">
```

### 2. 使用 cn() 工具函式組合類別

**必須使用 `cn()`** 組合多個類別,提高可讀性:

```tsx
import { cn } from '@/lib/utils'

// ✅ 正確
<div className={cn(
  "rounded-none bg-white",
  designTokens.neoBrutalism.border.full,
  designTokens.neoBrutalism.shadow.full,
  designTokens.spacing.card.padding
)}>

// ❌ 錯誤 (字串拼接,難以閱讀)
<div className={`rounded-none bg-white ${designTokens.neoBrutalism.border.full} ${designTokens.neoBrutalism.shadow.full}`}>
```

### 3. 優先使用設計 Token

**優先使用設計 Token** 而非自訂樣式:

```tsx
// ✅ 正確
<h1 className={designTokens.typography.h1}>
  標題
</h1>

// ❌ 錯誤 (自訂樣式,不一致)
<h1 className="text-3xl md:text-4xl lg:text-5xl font-bold">
  標題
</h1>
```

### 4. 觸控目標 >= 44px × 44px

**確保所有按鈕與連結** 的觸控目標區域 >= 44px × 44px:

```tsx
// ✅ 正確 (使用 designTokens.button.md,確保 44px+)
<button className={cn(
  "inline-flex items-center justify-center",
  designTokens.button.md,  // px-4 py-2 md:px-6 md:py-3
  getNeoBrutalismClasses({ active: true })
)}>
  確認
</button>

// ✅ 正確 (圖示按鈕使用 min-w / min-h)
<button className={cn(
  "inline-flex items-center justify-center",
  "min-w-[44px] min-h-[44px]",
  getNeoBrutalismClasses({ active: true })
)}>
  <Icon className="h-5 w-5" />
</button>
```

---

## 測試流程

### 1. 視覺測試 (Chrome DevTools)

```bash
# 開啟 Chrome DevTools → Device Toolbar (Ctrl+Shift+M)
# 測試以下尺寸:
- 手機: 375px × 667px (iPhone SE)
- 手機大屏: 414px × 896px (iPhone Pro Max)
- 平板直屏: 768px × 1024px (iPad)
- 平板橫屏: 1024px × 768px (iPad 橫屏)
- 桌面: 1280px × 800px
- 大桌面: 1920px × 1080px
```

**檢查清單**:
- [ ] 手機版無橫向滾動
- [ ] Sidebar 響應式正常 (手機隱藏 / 平板收縮 / 桌面展開)
- [ ] 表格/卡片切換正常
- [ ] 文字可清晰閱讀
- [ ] 按鈕可輕鬆點擊 (觸控目標 >= 44px)
- [ ] 圖片載入正常,無溢出

### 2. 可訪問性測試

**使用 Lighthouse**:
```bash
# Chrome DevTools → Lighthouse → Accessibility
# 目標: 評分 >= 95
```

**使用 axe DevTools**:
```bash
# 安裝 Chrome 擴充套件: https://www.deque.com/axe/devtools/
# 執行自動檢測
# 確保無 Critical 或 Serious 問題
```

**手動鍵盤測試**:
- [ ] Tab / Shift+Tab 可正常導航
- [ ] Enter 可觸發按鈕
- [ ] Esc 可關閉 Drawer / Modal
- [ ] 焦點順序合理

### 3. 效能測試

**使用 Chrome DevTools Performance**:
```bash
# Chrome DevTools → Performance → Record
# 檢查 First Contentful Paint < 1.5 秒
```

**使用 Network 測試圖片載入**:
```bash
# Chrome DevTools → Network → Img
# 檢查 sizes 屬性是否生效
# 檢查下載的圖片尺寸是否符合預期
```

---

## 常見問題

### Q1: 如何決定使用哪個容器寬度 (default / narrow / wide)?

**A**: 根據頁面內容決定:
- **一般頁面** (商品列表、訂單列表、客戶列表): 使用 `default` (max-w-7xl)
- **表單頁面** (登入、新增商品、新增客戶): 使用 `narrow` (max-w-4xl)
- **儀表板** (數據圖表、統計資訊): 使用 `wide` (max-w-screen-2xl)

### Q2: 什麼時候使用 getNeoBrutalismClasses() 工具函式?

**A**: 當元件需要完整的 Neo-Brutalism 風格 (邊框 + 陰影 + 互動效果) 時:
- 按鈕: 使用 `getNeoBrutalismClasses({ active: true })`
- 卡片 (可點擊): 使用 `getNeoBrutalismClasses({ hover: true, active: true })`
- 卡片 (不可點擊): 直接使用 `designTokens.neoBrutalism.border.full` + `designTokens.neoBrutalism.shadow.full`

### Q3: 如何處理長文字在手機版溢出?

**A**: 使用 Tailwind 的文字處理類別:
```tsx
// 單行省略
<div className="truncate">
  這是一段很長的文字...
</div>

// 多行省略 (2 行)
<div className="line-clamp-2">
  這是一段很長的文字...
</div>

// 自動換行
<div className="break-words">
  thisisaverylongwordwithoutspaces
</div>
```

### Q4: 如何在不破壞設計的前提下確保觸控目標 >= 44px?

**A**: 使用以下技巧:
1. **增加 padding**: `px-4 py-2.5` 確保高度 >= 44px
2. **使用 min-w / min-h**: `min-w-[44px] min-h-[44px]`
3. **桌面版增加尺寸**: `px-4 py-2 md:px-6 md:py-3` (手機 44px / 桌面 52px)
4. **使用較輕的視覺元素**: 手機版使用 `border-2 shadow-neo-sm`

### Q5: shadcn/ui Sheet 元件如何與 Neo-Brutalism 風格整合?

**A**: 修改 `components/ui/sheet.tsx` 的 `SheetContent` 元件:
```tsx
const SheetContent = React.forwardRef<...>(({ side = "left", className, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(
        // 移除預設圓角與陰影
        "fixed z-50 gap-4 bg-white p-6 transition ease-in-out",
        // 新增 Neo-Brutalism 風格
        "border-2 border-black shadow-neo",
        side === "left" && "inset-y-0 left-0 h-full w-3/4 sm:max-w-sm",
        className
      )}
      {...props}
    >
      {children}
    </SheetPrimitive.Content>
  </SheetPortal>
))
```

---

## 下一步

完成開發環境設定後,請參考:
- [plan.md](./plan.md) - 完整實作計畫與架構設計
- [research.md](./research.md) - 技術研究與決策理由
- [docs/responsive-ui-design.md](../../../docs/responsive-ui-design.md) - 完整設計方案與實作計畫

準備開始實作時,執行:
```bash
/speckit.tasks  # 產生任務清單
```

---

**Document Version**: 1.0
**Last Updated**: 2026-01-04
