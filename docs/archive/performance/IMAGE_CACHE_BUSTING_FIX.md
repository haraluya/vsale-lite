# 圖片快取問題修復方案

## 問題描述

### 現象
1. 後台更新圖片後，前台仍顯示舊圖片
2. PC 端和手機端的圖片更新時間不一致
3. 有時候會跳回舊版圖片

### 根本原因
在 `lib/supabase/storage.ts:30` 設定了 `cacheControl: '3600'`（1小時快取），導致：
- 瀏覽器快取了舊圖片 URL
- 即使 Supabase Storage 已更新圖片，瀏覽器仍從快取載入舊圖片
- 不同裝置/時間點的快取過期時間不同，造成不一致

## 解決方案：Cache Busting（快取破壞）

### 核心原理
在圖片 URL 加上時間戳記查詢參數（`?t=timestamp`），當圖片更新時：
1. 資料庫的 `updated_at` 欄位自動更新
2. 圖片 URL 的時間戳記改變
3. 瀏覽器視為新 URL，重新載入圖片

### 範例
```typescript
// 原始 URL
https://example.supabase.co/storage/v1/object/public/products/abc123/main.jpg

// 加上快取破壞後
https://example.supabase.co/storage/v1/object/public/products/abc123/main.jpg?t=1705910400000
```

當圖片更新後，`updated_at` 改變，時間戳記也隨之改變：
```typescript
https://example.supabase.co/storage/v1/object/public/products/abc123/main.jpg?t=1705996800000
```

## 實作細節

### 1. 新增工具函式
**檔案**: `lib/utils/image-cache-busting.ts`

```typescript
export function addImageCacheBusting(
  url: string | null | undefined,
  updatedAt?: Date | string | null
): string
```

- 自動將 `updated_at` 轉換為時間戳記
- 若無 `updated_at`，使用當前時間（確保每次都重新載入）
- 支援批次處理多張圖片

### 2. 修改的元件

#### 前台元件
1. **系列卡片** (`components/shop/series-card.tsx`)
   - 使用 `series.updated_at`

2. **圖片輪播** (`components/shop/home-blocks/ImageCarousel.tsx`)
   - 新增 `blockUpdatedAt` prop
   - 使用 `block.updated_at`

3. **商品卡片** (`components/shop/product-card.tsx`)
   - 使用 `product.updated_at`

4. **商品詳情頁** (`app/(shop)/store/[id]/page.tsx`)
   - 使用 `product.updated_at`

5. **帶價格商品卡片** (`components/shop/product-with-price-card.tsx`)
   - 使用 `product.updated_at`
   - 同時更新 ImageModal 的 imageUrl

#### 區塊渲染器
6. **BlockRenderer** (`components/shop/home-blocks/BlockRenderer.tsx`)
   - 傳入 `block.updated_at` 給 ImageCarousel

### 3. 資料庫支援

所有相關資料表都已有 `updated_at` 欄位：
- `series.updated_at`
- `products.updated_at`
- `home_page_blocks.updated_at`

這些欄位在資料更新時自動更新（透過 PostgreSQL trigger）。

## 測試方式

### 手動測試
1. 在後台上傳新圖片（例如：系列圖片）
2. 前往前台查看該系列
3. 應立即顯示新圖片（無需清除快取）

### 跨裝置測試
1. 在 PC 端更新圖片
2. 在手機端重新整理頁面
3. 應立即顯示新圖片

### 驗證方式
開啟瀏覽器開發者工具（F12）：
1. 切換到 Network 標籤
2. 重新整理頁面
3. 檢查圖片請求的 URL
4. 應包含 `?t=` 查詢參數

範例：
```
https://qwovavytryvgchcowjof.supabase.co/storage/v1/object/public/series/xxx/main.jpg?t=1705910400000
```

## 效能影響

### 優點
- ✅ 圖片更新立即生效
- ✅ 無需手動清除快取
- ✅ 跨裝置一致性

### 缺點
- ⚠️ 每次查詢都需要帶上 `updated_at` 欄位（已包含在現有查詢中）
- ⚠️ URL 略長（增加約 15-20 字元）

### 網路流量影響
**無影響**：
- 若圖片未更新，`updated_at` 不變，瀏覽器仍使用快取
- 僅在圖片實際更新時才會重新下載

## 相容性

### 瀏覽器支援
- ✅ 所有現代瀏覽器（Chrome, Firefox, Safari, Edge）
- ✅ 行動裝置瀏覽器（iOS Safari, Chrome Mobile）

### Supabase Storage
- ✅ 完全相容（查詢參數會被 CDN 保留）
- ✅ 不影響 Storage 的快取策略

## 未來改進

### 可選方案 A：調整 cacheControl
```typescript
// lib/supabase/storage.ts
cacheControl: '300', // 5 分鐘（縮短快取時間）
```

優點：更簡單
缺點：仍有 5 分鐘延遲，且增加伺服器負載

### 可選方案 B：版本號
在資料庫新增 `image_version` 欄位：
```typescript
imageUrl?version=${product.image_version}
```

優點：精準控制
缺點：需要改動資料庫結構

## 結論

**推薦使用當前方案（Cache Busting）**：
- 實作簡單，無需改動資料庫
- 圖片更新立即生效
- 利用現有的 `updated_at` 欄位
- 效能影響極小

---

**修復日期**: 2026-01-24
**相關 Issue**: 前台圖片快取問題
**測試狀態**: ✅ TypeScript 型別檢查通過
