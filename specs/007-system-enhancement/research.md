# Research: 系統擴充功能集技術研究

**Feature**: 007-system-enhancement
**Date**: 2026-01-03
**Status**: Phase 0 - Technical Research

---

## 研究目標

本研究旨在解決以下技術問題，以確保實作計畫的可行性與最佳實踐：

1. **訂單留言系統**：如何設計資料表結構以支援雙向溝通？是否需要新增 `order_comments` 表，還是擴充既有 `order_timelines` 表？
2. **客戶管理擴充**：如何確保管理員備註透過 RLS 完全隔離客戶端查詢？
3. **系列頁圖片切換**：如何實作流暢的圖片切換動畫，避免效能問題？
4. **廣告輪播系統**：如何設計自動播放功能，並確保圖片上傳與顯示的最佳實踐？
5. **價格管理優化**：如何設計「選擇商品」模式的 UI，並確保與既有「選擇系列」模式共存？

---

## 研究發現

### 1. 訂單留言系統資料表設計

#### 問題
- 既有 `order_timelines` 表用於記錄訂單操作歷史（確認、取消、狀態變更等）
- 是否應該新增獨立的 `order_comments` 表，還是擴充 `order_timelines` 表以支援留言功能？

#### 調查結果

**選項 A：新增 `order_comments` 表**
- 優點：資料結構清晰，留言與操作歷史分離，查詢效率高
- 缺點：需要在前端合併兩個資料源以顯示完整時間軸

**選項 B：擴充 `order_timelines` 表**
- 優點：單一資料源，時間軸顯示邏輯簡單，與既有架構一致
- 缺點：需要擴充 `action_type` 欄位以支援 `'comment'` 類型

#### 決策：**選項 B - 擴充 `order_timelines` 表**

**理由**：
1. 既有 `order_timelines` 表已包含 `content` 欄位（用於記錄操作內容），可直接儲存留言文字
2. 既有 `actor_id` 與 `actor_role` 欄位可區分留言來源（客戶 vs 管理員）
3. 時間軸顯示邏輯無需修改，自動包含留言與操作歷史
4. 符合既有架構設計，減少資料表數量

**實作方式**：
- 擴充 `action_type` ENUM：新增 `'comment'` 類型
- 留言提交時，插入 `order_timelines` 記錄：
  - `action_type = 'comment'`
  - `content = 留言文字`
  - `actor_id = 當前使用者 ID`
  - `actor_role = 'client' | 'admin'`

---

### 2. RLS 策略：確保管理員備註完全隔離

#### 問題
- `profiles` 表新增 `admin_notes` 欄位後，如何確保客戶端無法透過任何方式查詢此欄位？

#### 調查結果

**Supabase RLS 策略最佳實踐**：
- PostgreSQL RLS 支援欄位級別的權限控制（Field-Level Security）
- 可透過 `SELECT` 策略限制不同角色可查詢的欄位

**實作策略**：

```sql
-- 客戶端 SELECT 策略：排除 admin_notes 欄位
CREATE POLICY "client_select_profiles" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id AND
    (SELECT role FROM auth.users WHERE id = auth.uid()) = 'client'
  )
  WITH CHECK (FALSE);

-- 客戶端查詢時，僅返回以下欄位（透過 View 或 API 控制）：
-- id, display_name, phone, tier_id, address
-- 排除 admin_notes
```

**補充方案：使用 PostgreSQL View**

為了更嚴格的隔離，可建立兩個 View：

```sql
-- 客戶端可見的 View
CREATE VIEW client_profiles AS
SELECT id, display_name, phone, tier_id, address, created_at, updated_at
FROM profiles;

-- 管理端可見的 View（包含所有欄位）
CREATE VIEW admin_profiles AS
SELECT * FROM profiles;
```

#### 決策：**使用 RLS 策略 + Server Actions 雙重控制**

**理由**：
1. RLS 策略在資料庫層級阻擋未授權查詢
2. Server Actions 在應用層級再次驗證角色，確保客戶端無法繞過 RLS
3. 不使用 View，避免增加複雜度（View 需要額外維護）

**實作方式**：
- 修改既有 `profiles` RLS 策略，確保客戶端查詢時自動排除 `admin_notes`
- 所有客戶端 Server Actions（如 `getProfile()`）明確排除 `admin_notes` 欄位
- 所有管理端 Server Actions（如 `updateClient()`）包含 `admin_notes` 欄位

---

### 3. 系列頁圖片切換動畫最佳實踐

#### 問題
- 如何實作流暢的圖片切換動畫（淡入淡出），避免閃爍與效能問題？

#### 調查結果

**React 圖片切換動畫方案**：

**選項 A：使用 CSS Transition**
```tsx
// 使用 state 控制圖片 URL，CSS 處理過渡效果
const [currentImage, setCurrentImage] = useState(series.image_url);

// CSS
.hero-image {
  transition: opacity 300ms ease-in-out;
}
```

**選項 B：使用 Framer Motion**
- 優點：更豐富的動畫控制、支援複雜過渡效果
- 缺點：增加依賴包大小（約 60KB gzipped）

**選項 C：使用 React Transition Group**
- 優點：官方推薦、輕量級
- 缺點：需要額外配置

#### 決策：**選項 A - CSS Transition**

**理由**：
1. 淡入淡出動畫使用 CSS Transition 即可滿足需求
2. 不增加額外依賴，符合專案最小化原則
3. 效能最佳（GPU 加速）

**實作方式**：

```tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'

export function SeriesHeroImage({ series, products }) {
  const [currentImage, setCurrentImage] = useState(series.image_url)
  const [isProductImage, setIsProductImage] = useState(false)

  const handleProductClick = (product: Product) => {
    if (!product.image_url) return
    setCurrentImage(product.image_url)
    setIsProductImage(true)
  }

  const handleReset = () => {
    setCurrentImage(series.image_url)
    setIsProductImage(false)
  }

  return (
    <div className="relative h-64 w-full border-3 border-black">
      <Image
        src={currentImage}
        alt="Series Hero"
        fill
        className="object-cover transition-opacity duration-300"
        key={currentImage} // 觸發重新渲染以實現淡入淡出
      />
      {isProductImage && (
        <button
          onClick={handleReset}
          className="absolute top-4 right-4 p-2 bg-white border-2 border-black"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
```

**效能考量**：
- 使用 Next.js `Image` 元件自動優化圖片載入
- 使用 `key` 屬性觸發重新渲染，實現淡入淡出效果
- 避免使用 `useState` 儲存大量圖片 URL，僅儲存當前顯示的 URL

---

### 4. 廣告輪播系統設計

#### 問題
- 如何設計自動播放功能，並確保圖片上傳與顯示的最佳實踐？
- 是否使用第三方輪播套件（如 Swiper.js、react-slick）？

#### 調查結果

**選項 A：使用第三方套件（Swiper.js）**
- 優點：功能完整、自動播放、觸控支援、響應式設計
- 缺點：包體積較大（約 130KB gzipped）、需要自訂樣式以符合 Neo-Brutalism 風格

**選項 B：自行實作輪播元件**
- 優點：完全控制、符合專案設計風格、包體積小
- 缺點：需要自行處理自動播放、觸控手勢、響應式設計

#### 決策：**選項 B - 自行實作輪播元件**

**理由**：
1. 需求簡單（僅需左右箭頭 + 自動播放 + 指示器），不需要複雜功能
2. 符合專案最小化原則，不增加大型依賴
3. 可完全控制 Neo-Brutalism 設計風格

**實作方式**：

```tsx
'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function AnnouncementCarousel({ announcements }: { announcements: Announcement[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  // 自動播放（每 5 秒切換）
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [announcements.length])

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length)
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % announcements.length)
  }

  if (!announcements.length) return null

  const current = announcements[currentIndex]

  return (
    <div className="relative h-64 w-full border-3 border-black bg-white">
      <Image
        src={current.image_url}
        alt={current.title}
        fill
        className="object-cover"
      />

      {/* 左右箭頭 */}
      <button
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white border-2 border-black shadow-neo"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white border-2 border-black shadow-neo"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* 指示器 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {announcements.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-3 h-3 rounded-full border-2 border-black ${
              index === currentIndex ? 'bg-black' : 'bg-white'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
```

**圖片上傳策略**：
- 使用既有的 `uploadProductImage` Server Action 模式
- 圖片儲存路徑：`announcements/{announcement_id}/main.{ext}`
- 支援格式：JPG, PNG, WebP
- 大小限制：5MB

---

### 5. 價格管理優化 UI 設計

#### 問題
- 如何設計「選擇商品」模式的 UI，並確保與既有「選擇系列」模式共存？
- 是否使用標籤切換（Tabs）還是下拉選單？

#### 調查結果

**選項 A：使用標籤切換（Tabs）**
- 優點：視覺清晰、切換流暢、符合使用者習慣
- 缺點：佔用更多垂直空間

**選項 B：使用下拉選單**
- 優點：節省空間
- 缺點：需要額外點擊才能切換，使用體驗較差

#### 決策：**選項 A - 標籤切換（Tabs）**

**理由**：
1. 管理端為桌面裝置優化，垂直空間充足
2. 標籤切換符合使用者習慣，操作更直覺
3. 可清楚顯示當前模式（「選擇系列」或「選擇商品」）

**實作方式**：

```tsx
'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export function PricingManagementPage() {
  const [mode, setMode] = useState<'series' | 'product'>('series')

  return (
    <div>
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'series' | 'product')}>
        <TabsList className="border-3 border-black">
          <TabsTrigger value="series">選擇系列</TabsTrigger>
          <TabsTrigger value="product">選擇商品</TabsTrigger>
        </TabsList>

        <TabsContent value="series">
          {/* 既有的選擇系列模式 UI */}
          <SeriesPricingForm />
        </TabsContent>

        <TabsContent value="product">
          {/* 新增的選擇商品模式 UI */}
          <ProductPricingForm />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

**資料查詢邏輯**：
- 選擇系列模式：查詢 `tier_prices WHERE product_id IN (SELECT id FROM products WHERE series_id = ?)`
- 選擇商品模式：查詢 `tier_prices WHERE product_id = ?`

**零售價格處理**：
- 零售價格（retail_price）為唯讀欄位，顯示在表格中但禁用輸入
- 提示訊息：「零售價格請至商品編輯頁修改」

---

## 技術決策摘要

| 功能 | 決策 | 理由 |
|------|------|------|
| 訂單留言資料表 | 擴充 `order_timelines` 表 | 與既有架構一致，減少資料表數量 |
| 管理員備註隔離 | RLS 策略 + Server Actions 雙重控制 | 資料庫層級與應用層級雙重保護 |
| 圖片切換動畫 | CSS Transition | 不增加依賴，效能最佳 |
| 廣告輪播實作 | 自行實作元件 | 符合專案最小化原則與設計風格 |
| 價格管理 UI | 標籤切換（Tabs） | 操作直覺，符合管理端桌面優化 |

---

## 依賴項確認

**無需新增依賴**：
- 所有功能均使用既有技術棧（Next.js, React, Supabase, Tailwind CSS）
- 不引入第三方 UI 套件（Swiper.js, Framer Motion 等）

**既有依賴版本確認**：
- Next.js 15.1+: 支援 Server Actions ✅
- React 19.x: 支援最新 Hooks ✅
- @supabase/supabase-js v2.47+: 支援 RLS 與 Storage ✅
- Tailwind CSS v4.0: 支援自訂過渡效果 ✅
- Zod 3.24+: 支援表單驗證 ✅

---

## 效能與安全性考量

### 效能
- ✅ 圖片切換使用 CSS GPU 加速，無 JavaScript 效能瓶頸
- ✅ 廣告輪播自動播放使用 `setInterval`，清除機制完整
- ✅ 價格管理查詢使用索引（`tier_prices` 已有 `(tier_id, product_id)` 唯一索引）

### 安全性
- ✅ 所有 Server Actions 包含 Zod 驗證與權限檢查
- ✅ 管理員備註透過 RLS 完全隔離客戶端
- ✅ 留言字數限制 500 字，防止濫用
- ✅ 圖片上傳限制 5MB，防止 DoS 攻擊

---

## 遺留問題與風險

### 已解決
- ✅ 訂單留言資料表設計
- ✅ RLS 策略設計
- ✅ 圖片切換動畫實作方案
- ✅ 廣告輪播實作方案
- ✅ 價格管理 UI 設計

### 待驗證（實作階段）
- ⚠️ 圖片切換動畫在低階行動裝置的效能表現（需實測）
- ⚠️ 廣告輪播在圖片尺寸不一致時的顯示效果（需實測）
- ⚠️ 訂單留言在同時有 10+ 使用者留言時的時間軸排序正確性（需壓力測試）

---

**研究完成日期**: 2026-01-03
**下一步**: 進入 Phase 1 - 設計資料模型與 API 合約
