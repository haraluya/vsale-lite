# Quickstart Guide: 首頁廣告區塊系統

**Feature**: 016-home-page-blocks | **Date**: 2026-01-13

## Overview

本指南幫助開發者快速上手首頁廣告區塊系統，包含前台使用、後台管理、三種區塊類型的配置說明與常見問題解答。

**預計閱讀時間**: 15 分鐘

---

## 前置需求

- ✅ Vsale-lite 專案已初始化
- ✅ Supabase 專案已建立並連線
- ✅ 已完成 002-product-management（商品管理）
- ✅ 已完成 003-series-and-pricing（系列與價格）
- ✅ Next.js 開發伺服器可正常啟動

---

## 1. 前台使用

### 1.1 路由架構

```
/store                → 自動重定向到 /store/home（301）
/store/home           → 首頁（顯示廣告區塊）
/store/products       → 商品頁（顯示系列商品列表）
```

### 1.2 Segment Control 切換

前台 Layout 提供「首頁」與「商品」兩個按鈕：

```tsx
// app/(shop)/layout.tsx
import { SegmentControl } from '@/components/shop/home-blocks/SegmentControl'

export default function ShopLayout({ children }: Props) {
  return (
    <div>
      <SegmentControl />
      <p className="text-center text-sm text-gray-600 mb-4">
        {userName} 您好！會員等級: {tierName}
      </p>
      {children}
    </div>
  )
}
```

**特色**:
- 當前頁面按鈕高亮（綠色背景 + Neo-Brutalism 陰影）
- 觸控目標 >= 44px × 44px（符合 WCAG 2.1 AA 標準）
- 響應式設計（手機/桌面）

### 1.3 首頁區塊顯示

```tsx
// app/(shop)/store/home/page.tsx
import { getActiveHomeBlocks } from '@/lib/actions/home-blocks'
import { BlockRenderer } from '@/components/shop/home-blocks/BlockRenderer'

export default async function HomePage() {
  const result = await getActiveHomeBlocks()

  if (!result.success || result.data.length === 0) {
    return <p className="text-center text-gray-600">目前沒有廣告區塊</p>
  }

  return (
    <div className="space-y-6">
      {result.data.map((block) => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </div>
  )
}
```

**BlockRenderer** 會依 `block_type` 自動渲染對應元件：
- `image_carousel` → ImageCarousel 元件
- `product_display` → ProductDisplay 元件
- `text_block` → TextBlock 元件

---

## 2. 後台管理

### 2.1 廣告管理頁面

**URL**: `/admin/announcements?tab=home`

**Tab 切換器**:
- 商品頁廣告（現有功能）
- 首頁廣告（新功能）✨

### 2.2 建立區塊

**步驟**:
1. 訪問 `/admin/announcements?tab=home`
2. 點擊「新增區塊」按鈕
3. 填寫表單:
   - 區塊名稱（管理員識別用）
   - 區塊類型（圖片輪播 / 商品展示 / 文字區塊）
   - 依類型填寫對應欄位（見下方）
   - 啟用狀態（預設啟用）
4. 點擊「建立區塊」按鈕
5. 前台立即顯示新區塊（若為啟用狀態）

### 2.3 編輯區塊

**步驟**:
1. 在區塊列表點擊「編輯」按鈕
2. 修改區塊名稱、配置或啟用狀態
3. 點擊「儲存」按鈕
4. 前台立即更新

### 2.4 刪除區塊

**步驟**:
1. 在區塊列表點擊「刪除」按鈕
2. 確認刪除對話框（使用統一對話框 Hook）
3. 系統自動清理圖片檔案（若為圖片輪播區塊）
4. 前台立即移除該區塊

**⚠️ 注意**: 刪除操作無法復原，請謹慎操作。

### 2.5 調整區塊順序

**步驟**:
1. 在區塊列表使用「↑ 上移」或「↓ 下移」按鈕
2. 第一個區塊的上移按鈕、最後一個區塊的下移按鈕顯示為灰色（禁用）
3. 前台立即反映順序變更

---

## 3. 區塊類型指南

### 3.1 圖片輪播區塊

**使用場景**: 首頁主視覺、促銷活動、新品推薦

**配置欄位**:
- **上傳圖片**: 最少 1 張、最多 5 張（JPG/PNG/WebP，最大 5MB）
- **連結系列**: 每張圖片可選擇連結到指定系列頁面（可選）
- **自動播放**: 開啟或關閉
- **輪播間隔**: 毫秒數（最小 1000ms，預設 5000ms）

**範例配置**:
```json
{
  "images": [
    { "url": "https://...", "series_id": "550e8400-..." },
    { "url": "https://...", "series_id": null }
  ],
  "auto_play": true,
  "interval_ms": 5000
}
```

**前台顯示**:
- 圖片高度: 手機 256px (h-64) / 桌面 384px (h-96)
- 指示器圓點: 黑邊框圓點，當前圖片為黑色填充
- 自動播放: 手動切換後重新計時
- 點擊圖片: 若有 `series_id`，跳轉到系列頁面

**圖片上傳路徑**: `home-page-blocks/{block_id}/image-{index}.{ext}`

### 3.2 商品展示區塊

**使用場景**: 熱銷商品推薦、新品上架、特定系列展示

**配置欄位**:
- **選擇系列**: 多選（可選）
- **選擇標籤**: 多選（可選）
- **最大顯示數量**: 1-50（預設 50）

**範例配置**:
```json
{
  "series_ids": ["550e8400-e29b-41d4-a716-446655440000"],
  "tag_ids": ["660f9511-f39c-42e5-b817-557766551111"],
  "max_items": 12
}
```

**查詢邏輯**:
- 若提供 `series_ids` 和 `tag_ids`，使用 AND 邏輯（同時符合兩者）
- 自動整合等級價格查詢（依當前用戶等級）
- 未設定價格的商品顯示「價格未設定」並禁用加入購物車

**前台顯示**:
- 響應式網格: 手機一排 2 個 / 桌面一排 3 個
- 橫向滑動: CSS scroll-snap 實現原生滑動
- 滑動提示: 當商品數量超過一排時，顯示「← 左右滑動查看更多 →」
- 商品卡片: 使用現有的 `ProductWithPriceCard` 元件

### 3.3 文字區塊

**使用場景**: 促銷標語、公告訊息、品牌口號

**配置欄位**:
- **文字內容**: 最多 1000 字元
- **字體大小**: 7 個固定尺寸（12px, 16px, 20px, 24px, 32px, 40px, 48px）
- **字體顏色**: Hex 格式 #RRGGBB（色彩選擇器）

**範例配置**:
```json
{
  "content": "新春優惠，全館 8 折起！",
  "font_size": "32",
  "color": "#FF0000"
}
```

**前台顯示**:
- 寬度自適應螢幕寬度
- 文字顏色與大小依配置顯示
- Neo-Brutalism 樣式（黑邊框、白底、硬陰影）

---

## 4. 常見使用情境

### 情境 1: 建立首頁主視覺輪播

**需求**: 3 張輪播圖片，分別連結到不同系列，自動播放間隔 5 秒。

**步驟**:
1. 建立圖片輪播區塊
2. 上傳 3 張圖片（建議尺寸 1200×400px）
3. 每張圖片選擇對應的系列連結
4. 開啟自動播放，設定間隔 5000ms
5. 啟用區塊，拖曳到列表第一個位置（使用上移按鈕）
6. 前台查看效果

### 情境 2: 推薦熱銷商品

**需求**: 顯示「水果系列」中標籤為「熱銷」的前 12 個商品。

**步驟**:
1. 建立商品展示區塊
2. 選擇系列: 水果系列
3. 選擇標籤: 熱銷
4. 最大顯示數量: 12
5. 啟用區塊
6. 前台查看效果（手機一排 2 個、桌面一排 3 個）

### 情境 3: 新春促銷標語

**需求**: 顯示紅色大字「新春優惠，全館 8 折起！」

**步驟**:
1. 建立文字區塊
2. 文字內容: 新春優惠，全館 8 折起！
3. 字體大小: 32px
4. 字體顏色: #FF0000（紅色）
5. 啟用區塊
6. 前台查看效果

---

## 5. 效能優化建議

### 5.1 圖片優化

**建議尺寸**:
- 輪播圖片: 1200×400px（16:9 或 3:1 比例）
- 檔案格式: WebP 優先（自動 fallback 到 JPEG）
- 檔案大小: < 500KB（壓縮後）

**工具推薦**:
- TinyPNG (https://tinypng.com/) - 無損壓縮
- Squoosh (https://squoosh.app/) - 轉換 WebP

### 5.2 商品展示限制

**建議設定**:
- 最大顯示數量: 12-20 個（避免查詢過多商品）
- 使用系列或標籤篩選（避免查詢所有商品）

### 5.3 快取策略

**前台快取**:
- `getActiveHomeBlocks()` 使用 Next.js `unstable_cache`
- 快取時間: 60 秒（可依需求調整）
- 更新區塊後自動清除快取（`revalidatePath`）

---

## 6. 疑難排解

### Q1: 首頁沒有顯示任何區塊

**可能原因**:
1. 沒有建立任何區塊
2. 所有區塊都是停用狀態
3. RLS Policy 問題

**解決方案**:
1. 檢查後台是否有建立區塊
2. 確認區塊的 `is_active` 為 `true`
3. 檢查 Supabase RLS Policy 是否正確設定

### Q2: 圖片輪播不會自動播放

**可能原因**:
1. `auto_play` 設定為 `false`
2. JavaScript 錯誤（檢查瀏覽器 Console）

**解決方案**:
1. 編輯區塊，確認「自動播放」開關已開啟
2. 檢查瀏覽器 Console 是否有 React Hydration 錯誤

### Q3: 商品展示區塊沒有顯示任何商品

**可能原因**:
1. 選擇的系列或標籤沒有商品
2. 商品未設定等級價格
3. 商品狀態為 `inactive`

**解決方案**:
1. 檢查選擇的系列或標籤是否有對應商品
2. 確認商品已設定當前用戶等級的價格
3. 確認商品狀態為 `active`

### Q4: 刪除區塊後，圖片檔案還在

**可能原因**:
1. 圖片刪除失敗（網路錯誤）
2. 容錯機制未清理孤兒檔案

**解決方案**:
1. 這是預期行為（容錯設計）
2. 未來實作 Cron Job 定期清理孤兒檔案（可選）
3. 手動刪除: Supabase Dashboard → Storage → products → home-page-blocks → 刪除目錄

### Q5: 區塊排序按鈕無法點擊

**可能原因**:
1. 第一個區塊的上移按鈕、最後一個區塊的下移按鈕為禁用狀態

**解決方案**:
1. 這是預期行為（防止越界）
2. 只能在中間的區塊使用上移/下移按鈕

### Q6: Tab 切換器無法切換

**可能原因**:
1. URL 查詢參數錯誤
2. JavaScript 錯誤

**解決方案**:
1. 手動訪問 `/admin/announcements?tab=home` 測試
2. 檢查瀏覽器 Console 是否有錯誤

---

## 7. 開發指南

### 7.1 新增區塊類型（擴充）

**步驟**:
1. 在 `types/index.ts` 新增 `NewBlockConfig` 型別
2. 在 `lib/validations/home-block.schema.ts` 新增 `newBlockConfigSchema`
3. 在 `createHomeBlockSchema` 的 `discriminatedUnion` 新增分支
4. 建立前台元件 `components/shop/home-blocks/NewBlock.tsx`
5. 在 `BlockRenderer` 新增 `case 'new_block_type'`
6. 建立後台表單欄位（依新類型需求）
7. 更新 Migration 的 `CHECK` 約束（新增新類型）

### 7.2 自訂商品展示排序

**預設**: 依 `created_at` 降序排序（最新商品優先）

**客製化**:
```typescript
// lib/actions/home-blocks.ts - getProductsByBlockConfig()
const { data } = await supabase
  .from('products')
  .select('...')
  .order('name', { ascending: true }) // ← 改為依名稱排序
```

### 7.3 擴充圖片數量限制

**預設**: 最多 5 張

**擴充至 10 張**:
```typescript
// lib/validations/home-block.schema.ts
const imageCarouselConfigSchema = z.object({
  images: z.array(...)
    .min(1)
    .max(10), // ← 改為 10
})
```

---

## 8. 效能基準

| 操作 | 目標時間 | 實測方式 |
|------|---------|---------|
| 首頁載入 (含圖片) | < 2s (Mobile 4G) | Lighthouse Mobile |
| 圖片輪播切換 | < 100ms | Chrome DevTools Performance |
| 商品展示查詢 | < 300ms | `getProductsByBlockConfig()` |
| 區塊排序更新 | < 200ms | `moveBlockUp()` / `moveBlockDown()` |

---

## 9. 最佳實踐

### 9.1 區塊設計建議

**圖片輪播區塊**:
- ✅ 建議圖片尺寸: 1200×400px（3:1 比例）
- ✅ 檔案格式優先順序: WebP > JPEG > PNG
- ✅ 壓縮後檔案大小: < 500KB
- ✅ 輪播數量: 3-5 張（避免過多）
- ✅ 自動播放間隔: 5000ms（5 秒，符合使用者習慣）
- ❌ 避免使用 GIF 動畫（影響效能）

**商品展示區塊**:
- ✅ 最大顯示數量: 12-20 個（一頁最佳）
- ✅ 使用系列或標籤篩選（避免查詢所有商品）
- ✅ 確保所有商品已設定等級價格
- ❌ 避免未篩選條件查詢（會拖慢載入速度）

**文字區塊**:
- ✅ 文字長度: 20-50 字（簡潔有力）
- ✅ 字體大小: 32px 或 40px（適合促銷標語）
- ✅ 顏色對比度: 確保文字清晰可讀（WCAG AAA 標準）
- ❌ 避免使用淺色文字在白底（對比度不足）

### 9.2 區塊排序策略

**推薦順序**:
1. **圖片輪播區塊**（主視覺，吸引注意力）
2. **商品展示區塊**（熱銷商品推薦）
3. **文字區塊**（促銷標語或公告）
4. **商品展示區塊**（新品上架）

**原則**:
- 視覺吸引力高的區塊放前面
- 重要促銷訊息置頂
- 避免連續多個相同類型的區塊
- 前 3 個區塊決定首頁印象

### 9.3 圖片命名規範

**建議命名**:
- `banner-newyear-2026.webp`（輪播圖片）
- `promo-sale-80off.jpg`（促銷圖片）
- `hero-summer-fruits.png`（主視覺圖片）

**原則**:
- 使用小寫英文與連字號
- 包含年份或時間標記（方便管理）
- 說明用途（banner / promo / hero）
- 壓縮後再上傳

### 9.4 錯誤處理策略

**圖片上傳失敗**:
- 檢查檔案格式（僅支援 JPG/PNG/WebP）
- 檢查檔案大小（最大 5MB）
- 檢查網路連線
- 使用 TinyPNG 壓縮後重試

**商品展示無商品**:
- 確認系列或標籤篩選條件
- 確認商品狀態為 active
- 確認商品已設定當前用戶等級的價格
- 調整 max_items 數量

**區塊不顯示**:
- 確認區塊的 is_active 為 true
- 檢查 Supabase RLS Policy
- 清除瀏覽器快取並重新載入
- 檢查瀏覽器 Console 錯誤訊息

---

## 10. 相關資源

- 📖 **功能規格**: `specs/016-home-page-blocks/spec.md`
- 📖 **實作計畫**: `specs/016-home-page-blocks/plan.md`
- 📖 **技術研究**: `specs/016-home-page-blocks/research.md`
- 📖 **資料模型**: `specs/016-home-page-blocks/data-model.md`
- 📖 **API 合約**: `specs/016-home-page-blocks/contracts/home-blocks.ts`
- 📖 **任務清單**: `specs/016-home-page-blocks/tasks.md`

---

**Quickstart Complete** - 現在可以開始使用首頁廣告區塊系統了！
