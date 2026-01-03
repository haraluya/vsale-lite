# Quickstart: 系統擴充功能集

**Feature**: 007-system-enhancement
**Date**: 2026-01-03
**Status**: Phase 1 - Quick Start Guide

---

## 概述

本快速上手指南提供系統擴充功能集的實作路徑與關鍵技術要點，幫助開發者快速理解整體架構並開始實作。

---

## 功能清單與實作順序

建議依以下順序實作，以確保依賴關係正確：

1. **✅ Phase 1 (P0)**: 客戶管理擴充 - 擴充 `profiles` 表，新增地址與備註欄位
2. **✅ Phase 2 (P0)**: 訂單留言系統 - 擴充 `order_timelines` 表，支援雙向溝通
3. **✅ Phase 3 (P1)**: 廣告輪播系統 - 新增 `announcements` 表與前後台 UI
4. **✅ Phase 4 (P1)**: 系列頁圖片切換 - 前台 UI 優化，無需資料庫變更
5. **✅ Phase 5 (P2)**: 價格管理優化 - 後台 UI 優化，新增「選擇商品」模式

---

## Phase 1: 客戶管理擴充（預計 4 小時）

### 1.1 資料庫 Migration

**檔案**: `supabase/migrations/20260103_system_enhancement.sql`

```sql
-- 擴充 profiles 表新增欄位
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;
```

**執行 Migration**:
```bash
# 本地開發環境
supabase db reset

# 驗證欄位已新增
# 開啟 Supabase Studio: http://127.0.0.1:54323
# 左側 → Table Editor → profiles → 檢查欄位
```

---

### 1.2 更新 Server Actions

**檔案**: `lib/actions/clients.ts`

**新增 API**:
- `getClientProfile(client_id)` - 客戶端查詢自己的資料（**排除 admin_notes**）
- `getAdminClientProfile(client_id)` - 管理端查詢客戶資料（**包含 admin_notes**）
- `updateClient(input)` - 管理端更新客戶資料

**關鍵實作要點**:
```typescript
// ❌ 錯誤：客戶端可查詢 admin_notes
export async function getClientProfile(client_id: string) {
  const { data } = await supabase.from('profiles').select('*').eq('id', client_id).single()
  return { success: true, data } // admin_notes 會被返回
}

// ✅ 正確：明確排除 admin_notes
export async function getClientProfile(client_id: string) {
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, phone, tier_id, address, status, created_at, updated_at')
    .eq('id', client_id)
    .single()
  return { success: true, data }
}
```

---

### 1.3 更新客戶編輯頁（管理端）

**檔案**: `app/(admin)/admin/users/[id]/edit/page.tsx`

**新增表單欄位**:
```tsx
<div className="space-y-2">
  <Label htmlFor="address">常用地址</Label>
  <Textarea
    id="address"
    value={address}
    onChange={(e) => setAddress(e.target.value)}
    rows={3}
    className="border-3 border-black"
  />
</div>

<div className="space-y-2">
  <Label htmlFor="admin_notes">管理員備註</Label>
  <Textarea
    id="admin_notes"
    value={adminNotes}
    onChange={(e) => setAdminNotes(e.target.value)}
    rows={3}
    className="border-3 border-black"
    placeholder="此欄位僅管理員可見"
  />
</div>
```

---

### 1.4 更新客戶列表（管理端）

**檔案**: `app/(admin)/admin/users/page.tsx`

**新增摘要欄位**:
```tsx
<TableCell>
  {client.address?.substring(0, 30)}
  {client.address && client.address.length > 30 && '...'}
</TableCell>

<TableCell>
  {client.admin_notes?.substring(0, 30)}
  {client.admin_notes && client.admin_notes.length > 30 && '...'}
</TableCell>
```

---

### 1.5 測試驗證

**測試案例**:
1. 管理員編輯客戶資料，填寫地址與備註，儲存成功
2. 客戶登入後查看自己的資料，**無法看到** admin_notes 欄位
3. 管理員在客戶列表看到地址與備註摘要（最多 30 字）

**權限測試**:
```bash
# 使用客戶端帳號嘗試查詢 admin_notes（應失敗）
# 在瀏覽器 Console 執行
const { data } = await supabase.from('profiles').select('admin_notes').eq('id', 'my-id').single()
// 預期結果：data.admin_notes 為 undefined 或 null（RLS 阻擋）
```

---

## Phase 2: 訂單留言系統（預計 6 小時）

### 2.1 資料庫 Migration

**檔案**: `supabase/migrations/20260103_system_enhancement.sql`

```sql
-- 擴充 order_timelines.action_type ENUM
ALTER TABLE order_timelines DROP CONSTRAINT IF EXISTS order_timelines_action_type_check;
ALTER TABLE order_timelines ADD CONSTRAINT order_timelines_action_type_check
  CHECK (action_type IN ('created', 'confirmed', 'status_updated', 'cancelled', 'comment'));

-- 建立 RLS 策略（客戶端僅能在自己的訂單留言）
CREATE POLICY "client_insert_comment" ON order_timelines
  FOR INSERT TO authenticated
  WITH CHECK (
    action_type = 'comment' AND
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_timelines.order_id AND orders.user_id = auth.uid())
  );

-- 管理員可在任何訂單留言
CREATE POLICY "admin_insert_comment" ON order_timelines
  FOR INSERT TO authenticated
  WITH CHECK (
    action_type = 'comment' AND
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );
```

---

### 2.2 新增 Server Actions

**檔案**: `lib/actions/orders.ts`

**新增 API**:
```typescript
export async function addOrderComment(input: AddOrderCommentInput): Promise<ActionResult<OrderComment>> {
  'use server'

  // 1. 驗證輸入
  const validation = addOrderCommentSchema.safeParse(input)
  if (!validation.success) {
    return { success: false, message: '輸入資料格式錯誤', errors: validation.error.flatten().fieldErrors }
  }

  // 2. 權限檢查
  const { user, profile } = await checkAuth()

  // 客戶僅能在自己的訂單留言
  if (profile.role === 'client') {
    const { data: order } = await supabase.from('orders').select('user_id').eq('id', input.order_id).single()
    if (order?.user_id !== user.id) {
      return { success: false, message: '您無權在此訂單留言' }
    }
  }

  // 3. 插入留言
  const { data, error } = await supabase
    .from('order_timelines')
    .insert({
      order_id: input.order_id,
      action_type: 'comment',
      content: input.content,
      actor_id: user.id,
      actor_role: profile.role,
    })
    .select('*, profiles!actor_id(display_name)')
    .single()

  if (error) return { success: false, message: '留言失敗' }

  return { success: true, data: { ...data, actor_name: data.profiles.display_name } }
}
```

---

### 2.3 前台訂單詳情頁

**檔案**: `app/(shop)/store/orders/[id]/page.tsx`

**新增留言區塊**:
```tsx
{/* 訂單留言區 */}
<div className="mt-6 border-3 border-black p-4">
  <h3 className="text-lg font-bold mb-4">操作歷史與留言</h3>

  {/* 時間軸 */}
  <div className="space-y-4">
    {timelines.map((item) => (
      <div key={item.id} className={item.action_type === 'comment' ? 'flex' : ''}>
        {/* 留言：左側客戶、右側管理員 */}
        {item.action_type === 'comment' && (
          <div className={`max-w-md p-3 border-2 border-black ${item.actor_role === 'client' ? 'bg-gray-100 mr-auto' : 'bg-blue-100 ml-auto'}`}>
            <div className="text-xs text-gray-600 mb-1">
              {item.actor_name} ({item.actor_role === 'client' ? '客戶' : '管理員'})
            </div>
            <div className="text-sm">{item.content}</div>
            <div className="text-xs text-gray-500 mt-1">{new Date(item.created_at).toLocaleString()}</div>
          </div>
        )}

        {/* 操作歷史：置中顯示 */}
        {item.action_type !== 'comment' && (
          <div className="text-sm text-gray-600">
            {item.action_type} - {new Date(item.created_at).toLocaleString()}
          </div>
        )}
      </div>
    ))}
  </div>

  {/* 留言輸入框 */}
  <form onSubmit={handleSubmit} className="mt-4">
    <Textarea
      value={comment}
      onChange={(e) => setComment(e.target.value)}
      placeholder="輸入留言..."
      maxLength={500}
      rows={3}
      className="border-3 border-black"
    />
    <div className="flex items-center justify-between mt-2">
      <span className="text-sm text-gray-600">{comment.length} / 500</span>
      <Button type="submit" disabled={!comment.trim()}>
        送出留言
      </Button>
    </div>
  </form>
</div>
```

---

### 2.4 後台訂單詳情頁

**檔案**: `app/(admin)/admin/orders/[id]/page.tsx`

**同前台結構，但管理員留言靠右、藍色背景**

---

### 2.5 測試驗證

**測試案例**:
1. 客戶在自己的訂單留言，成功顯示在時間軸（灰色氣泡、靠左）
2. 客戶嘗試在他人訂單留言，顯示 403 錯誤
3. 管理員在任何訂單留言，成功顯示在時間軸（藍色氣泡、靠右）
4. 留言與操作歷史依時間排序（舊 → 新）
5. 留言字數超過 500 字，提交失敗

---

## Phase 3: 廣告輪播系統（預計 5 小時）

### 3.1 資料庫 Migration

```sql
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_announcements_active_sort ON announcements(is_active, sort_order)
  WHERE is_active = true;

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- RLS 策略（所有人可查詢啟用的廣告）
CREATE POLICY "public_select_active_announcements" ON announcements
  FOR SELECT TO public
  USING (is_active = true);
```

---

### 3.2 前台首頁輪播元件

**檔案**: `components/announcements/AnnouncementCarousel.tsx`

```tsx
'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function AnnouncementCarousel({ announcements }: { announcements: Announcement[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  // 自動播放（每 5 秒切換）
  useEffect(() => {
    if (announcements.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [announcements.length])

  if (!announcements.length) return null

  const current = announcements[currentIndex]

  return (
    <div className="relative h-64 w-full border-3 border-black bg-white mb-6">
      {/* 圖片 */}
      <Image src={current.image_url} alt={current.title} fill className="object-cover" priority />

      {/* 左右箭頭 */}
      {announcements.length > 1 && (
        <>
          <button
            onClick={() => setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white border-2 border-black shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % announcements.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white border-2 border-black shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* 指示器 */}
      {announcements.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {announcements.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-3 h-3 rounded-full border-2 border-black ${index === currentIndex ? 'bg-black' : 'bg-white'}`}
            />
          ))}
        </div>
      )}

      {/* 可點擊連結 */}
      {current.link_url && (
        <a href={current.link_url} className="absolute inset-0" target="_blank" rel="noopener noreferrer" />
      )}
    </div>
  )
}
```

---

### 3.3 後台廣告管理頁

**檔案**: `app/(admin)/admin/announcements/page.tsx`

**功能**:
- 列表顯示所有廣告（包含停用的）
- 新增、編輯、刪除、啟用/停用廣告
- 圖片上傳功能

---

### 3.4 測試驗證

**測試案例**:
1. 後台新增廣告並上傳圖片，前台首頁顯示輪播
2. 輪播自動播放（每 5 秒切換）
3. 點擊左右箭頭切換廣告
4. 點擊廣告圖片跳轉至設定的連結
5. 停用廣告後，前台不再顯示

---

## Phase 4: 系列頁圖片切換（預計 3 小時）

### 4.1 系列詳情頁 UI 優化

**檔案**: `app/(shop)/store/series/[id]/page.tsx`

**新增圖片切換邏輯**:
```tsx
'use client'

const [currentImage, setCurrentImage] = useState(series.image_url)
const [isProductImage, setIsProductImage] = useState(false)

// 點擊商品卡片切換圖片
const handleProductClick = (product: Product) => {
  if (!product.image_url) return
  setCurrentImage(product.image_url)
  setIsProductImage(true)
}

// 恢復系列圖片
const handleReset = () => {
  setCurrentImage(series.image_url)
  setIsProductImage(false)
}

return (
  <div>
    {/* 大圖區域 */}
    <div className="relative h-64 w-full border-3 border-black mb-6">
      <Image
        src={currentImage}
        alt="Hero Image"
        fill
        className="object-cover transition-opacity duration-300"
        key={currentImage} // 觸發淡入淡出效果
      />
      {isProductImage && (
        <button
          onClick={handleReset}
          className="absolute top-4 right-4 p-2 bg-white border-2 border-black shadow-neo"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>

    {/* 商品卡片 */}
    <div className="grid grid-cols-2 gap-4">
      {products.map((product) => (
        <div
          key={product.id}
          onClick={() => handleProductClick(product)}
          className={`border-3 border-black p-4 ${product.image_url ? 'cursor-pointer hover:shadow-neo' : 'opacity-50 cursor-not-allowed'}`}
        >
          <h3>{product.name}</h3>
        </div>
      ))}
    </div>
  </div>
)
```

---

### 4.2 測試驗證

**測試案例**:
1. 系列頁載入時，大圖顯示系列代表圖
2. 點擊有圖片的商品卡片，大圖切換為商品圖片（淡入淡出效果）
3. 點擊關閉按鈕或空白處，大圖恢復為系列圖片
4. 點擊無圖片的商品卡片，無反應（卡片呈現禁用狀態）

---

## Phase 5: 價格管理優化（預計 4 小時）

### 5.1 價格管理頁新增標籤切換

**檔案**: `app/(admin)/admin/pricing/page.tsx`

```tsx
'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export default function PricingManagementPage() {
  return (
    <Tabs defaultValue="series">
      <TabsList className="border-3 border-black mb-6">
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
  )
}
```

---

### 5.2 商品價格表單元件

**檔案**: `components/admin/pricing/ProductPricingForm.tsx`

```tsx
'use client'

export function ProductPricingForm() {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [priceMatrix, setPriceMatrix] = useState<ProductPriceMatrix | null>(null)

  // 載入商品列表
  const { data: products } = useSWR('/api/products-for-pricing', getProductsForPricing)

  // 載入價格矩陣
  useEffect(() => {
    if (!selectedProduct) return
    getProductPriceMatrix(selectedProduct).then((result) => {
      if (result.success) setPriceMatrix(result.data)
    })
  }, [selectedProduct])

  // 儲存價格
  const handleSave = async () => {
    const result = await batchSetProductPrices({
      product_id: selectedProduct,
      prices: priceMatrix.prices.filter((p) => !p.is_retail), // 排除零售價格
    })
  }

  return (
    <div>
      {/* 商品下拉選單 */}
      <Select value={selectedProduct} onValueChange={setSelectedProduct}>
        <SelectTrigger>
          <SelectValue placeholder="選擇商品" />
        </SelectTrigger>
        <SelectContent>
          {products?.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.code} - {p.name} ({p.series_name})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 價格矩陣表格 */}
      {priceMatrix && (
        <Table className="mt-6 border-3 border-black">
          <TableHead>
            <TableRow>
              <TableHeader>等級</TableHeader>
              <TableHeader>價格</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {priceMatrix.prices.map((p) => (
              <TableRow key={p.tier_id}>
                <TableCell>{p.tier_name}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={p.amount ?? ''}
                    onChange={(e) => handlePriceChange(p.tier_id, e.target.value)}
                    disabled={p.is_retail} // 零售價格唯讀
                    className={p.is_retail ? 'bg-gray-100' : ''}
                  />
                  {p.is_retail && <span className="text-xs text-gray-600">請至商品編輯頁修改</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Button onClick={handleSave} className="mt-4">
        儲存價格
      </Button>
    </div>
  )
}
```

---

### 5.3 測試驗證

**測試案例**:
1. 點擊「選擇商品」標籤，顯示商品下拉選單
2. 選擇商品後，表格顯示該商品 × 所有等級的價格矩陣
3. 零售等級價格為唯讀，無法修改
4. 修改非零售等級價格並儲存，成功更新資料庫
5. 切換回「選擇系列」標籤，既有功能正常運作

---

## 部署檢查清單

### 資料庫 Migration
- [ ] 執行 Migration 腳本（本地 + 雲端）
- [ ] 驗證所有表格與欄位已建立
- [ ] 驗證 RLS 策略已啟用

### Server Actions
- [ ] 所有 Server Actions 包含 Zod 驗證
- [ ] 所有 Server Actions 包含權限檢查（checkAuth）
- [ ] 所有更新操作執行 revalidatePath

### UI 元件
- [ ] 所有元件遵循 Neo-Brutalism 設計風格
- [ ] 所有表單包含即時驗證與錯誤提示
- [ ] 所有互動元件包含 Loading 狀態

### 安全性
- [ ] 管理員備註完全隔離客戶端（RLS + Server Actions 雙重驗證）
- [ ] 客戶僅能在自己的訂單留言（RLS 策略測試通過）
- [ ] 圖片上傳限制 5MB（Server Actions 驗證）

### 效能
- [ ] 圖片切換動畫流暢（300ms 過渡效果）
- [ ] 廣告輪播自動播放無卡頓（5s 間隔）
- [ ] 價格查詢使用索引（`tier_prices` 已有唯一索引）

---

## 常見問題排查

### Q1: 客戶端仍可查詢 admin_notes？
**檢查項目**:
1. RLS 策略是否正確啟用？
2. Server Actions 是否明確排除 `admin_notes` 欄位？
3. 客戶端是否直接呼叫 Supabase Client（應透過 Server Actions）？

### Q2: 訂單留言時間軸排序錯亂？
**檢查項目**:
1. 查詢時是否使用 `ORDER BY created_at ASC`？
2. `created_at` 欄位是否使用伺服器時間（`NOW()`）？

### Q3: 廣告輪播自動播放卡頓？
**檢查項目**:
1. 是否在 `useEffect` 清除 `setInterval`？
2. 圖片是否使用 Next.js `Image` 元件優化載入？

### Q4: 價格管理「選擇商品」模式無法儲存？
**檢查項目**:
1. 是否排除零售等級價格（`is_retail = true`）？
2. Server Actions 是否使用 UPSERT 邏輯？

---

**快速上手指南完成日期**: 2026-01-03
**下一步**: 更新 Agent Context，進入實作階段
