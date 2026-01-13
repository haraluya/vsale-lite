# Technical Research: 首頁廣告區塊系統

**Feature**: 016-home-page-blocks | **Date**: 2026-01-13

## Overview

本文件記錄首頁廣告區塊系統的技術研究成果，包含六個核心技術決策的決策理由、替代方案評估與最終選擇。所有決策均基於專案「輕量化、效能優先、減少依賴」的核心原則。

---

## R1: JSONB Config 欄位設計與 Zod 驗證

### 問題陳述
三種區塊類型（圖片輪播、商品展示、文字區塊）的配置差異大，需要選擇適當的資料儲存方式。

### 選項評估

#### 選項 A: JSONB 單一欄位（✅ 選擇）
**優點**:
- 彈性高：新增區塊類型無需變更表結構
- 查詢簡單：單一表 `home_page_blocks`，無需多表 JOIN
- 排序容易：`sort_order` 在同一表中，無需複雜的 UNION 查詢
- PostgreSQL JSONB 支援索引：可對 JSONB 欄位建立 GIN 索引（若需要）

**缺點**:
- 型別安全性較弱：需依賴 Zod Schema 驗證
- 無法使用 SQL 約束驗證 JSONB 內容

**實作細節**:
```sql
CREATE TABLE home_page_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  block_type TEXT NOT NULL CHECK (block_type IN ('image_carousel', 'product_display', 'text_block')),
  config JSONB NOT NULL,  -- ← 彈性儲存不同類型的配置
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Zod 驗證策略** (Discriminated Union):
```typescript
const imageCarouselConfigSchema = z.object({
  images: z.array(
    z.object({
      url: z.string().url(),
      series_id: z.string().uuid().nullable().optional(),
    })
  ).min(1, '至少需要 1 張圖片').max(5, '最多 5 張圖片'),
  auto_play: z.boolean().default(true),
  interval_ms: z.number().int().min(1000, '輪播間隔至少 1 秒').default(5000),
})

const productDisplayConfigSchema = z.object({
  series_ids: z.array(z.string().uuid()).optional(),
  tag_ids: z.array(z.string().uuid()).optional(),
  max_items: z.number().int().min(1).max(50, '最多顯示 50 個商品').optional(),
})

const textBlockConfigSchema = z.object({
  content: z.string().min(1, '內容不可為空').max(1000, '最多 1000 字元'),
  font_size: z.enum(['12', '16', '20', '24', '32', '40', '48']).default('16'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, '顏色格式必須為 #RRGGBB').default('#000000'),
})

// Discriminated Union - 依 block_type 驗證對應的 config
export const createHomeBlockSchema = z.object({
  name: z.string().min(1).max(100),
  blockType: z.enum(['image_carousel', 'product_display', 'text_block']),
  config: z.discriminatedUnion('blockType', [
    z.object({ blockType: z.literal('image_carousel'), ...imageCarouselConfigSchema.shape }),
    z.object({ blockType: z.literal('product_display'), ...productDisplayConfigSchema.shape }),
    z.object({ blockType: z.literal('text_block'), ...textBlockConfigSchema.shape }),
  ]),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
})
```

#### 選項 B: 三個獨立表（❌ 拒絕）
```sql
CREATE TABLE image_carousel_blocks (...);
CREATE TABLE product_display_blocks (...);
CREATE TABLE text_blocks (...);
```

**優點**:
- 型別安全性高：每個表有明確的欄位定義
- 可使用 SQL 約束驗證

**缺點**:
- 排序困難：需要 UNION 三個表才能取得完整排序列表
- 新增類型需變更表結構：違反 Open/Closed Principle
- 查詢複雜：前台需 UNION 三個表並排序

**被拒絕理由**: 排序邏輯過於複雜，違反專案「簡單優先」原則。

#### 選項 C: EAV (Entity-Attribute-Value) 模式（❌ 拒絕）
```sql
CREATE TABLE home_page_blocks (...);
CREATE TABLE block_attributes (
  block_id UUID REFERENCES home_page_blocks(id),
  attribute_key TEXT,
  attribute_value TEXT
);
```

**缺點**:
- 查詢極度複雜：需多次 JOIN 才能取得完整配置
- 型別安全性極差：所有值都是 TEXT
- 效能差：無法使用索引優化查詢

**被拒絕理由**: 過度工程化，查詢效能差。

### 決策

**✅ 選擇選項 A: JSONB 單一欄位 + Zod Discriminated Union 驗證**

**理由**:
1. 彈性支援未來新增區塊類型
2. 排序邏輯簡單（單一表 ORDER BY sort_order）
3. PostgreSQL JSONB 效能佳（支援 GIN 索引）
4. Zod Schema 提供強型別驗證，彌補 SQL 約束不足

---

## R2: 圖片儲存路徑與清理機制

### 問題陳述
圖片輪播區塊支援最多 5 張圖片，需要設計儲存路徑與清理機制，避免孤兒檔案殘留。

### 選項評估

#### 選項 A: 索引式命名（✅ 選擇）
**路徑格式**: `home-page-blocks/{block_id}/image-{index}.{ext}`

**範例**:
```
home-page-blocks/
└── 550e8400-e29b-41d4-a716-446655440000/
    ├── image-0.jpg   ← 第 1 張圖片
    ├── image-1.png   ← 第 2 張圖片
    ├── image-2.webp  ← 第 3 張圖片
    ├── image-3.jpg   ← 第 4 張圖片
    └── image-4.png   ← 第 5 張圖片
```

**優點**:
- 索引明確：易於追蹤哪張圖片對應 `config.images[index]`
- 刪除容易：指定索引即可刪除（如刪除 `image-2.*`）
- 更換簡單：上傳前刪除所有可能的副檔名（`.jpg`, `.png`, `.webp`），避免孤兒檔案

**圖片清理場景**:

**場景 1: 刪除區塊**
```typescript
// Server Action: deleteHomeBlock()
await supabase.storage
  .from('products')
  .remove([`home-page-blocks/${blockId}/`]) // 刪除整個目錄
```

**場景 2: 更換圖片**
```typescript
// Server Action: uploadBlockImage(blockId, index, file)

// 1. 先刪除所有可能的舊圖片（避免孤兒檔案）
await supabase.storage.from('products').remove([
  `home-page-blocks/${blockId}/image-${index}.jpg`,
  `home-page-blocks/${blockId}/image-${index}.png`,
  `home-page-blocks/${blockId}/image-${index}.webp`,
])

// 2. 上傳新圖片
const fileExt = getExtension(file.type)
const filePath = `home-page-blocks/${blockId}/image-${index}.${fileExt}`
await supabase.storage.from('products').upload(filePath, file)
```

**場景 3: 減少圖片數量**
```typescript
// updateHomeBlock() - 從 5 張減少到 3 張

// 刪除第 4、5 張圖片
await supabase.storage.from('products').remove([
  `home-page-blocks/${blockId}/image-3.jpg`,
  `home-page-blocks/${blockId}/image-3.png`,
  `home-page-blocks/${blockId}/image-3.webp`,
  `home-page-blocks/${blockId}/image-4.jpg`,
  `home-page-blocks/${blockId}/image-4.png`,
  `home-page-blocks/${blockId}/image-4.webp`,
])
```

**場景 4: 區塊類型變更**
```typescript
// updateHomeBlock() - 從圖片輪播變更為文字區塊

// 刪除所有圖片
await supabase.storage
  .from('products')
  .remove([`home-page-blocks/${blockId}/`])
```

**容錯機制**:
```typescript
try {
  await deleteBlockImages(blockId)
} catch (error) {
  console.warn('圖片刪除失敗（已忽略）:', error)
  // ⚠️ 不拋出錯誤，避免阻斷主流程
}
```

**理由**: 圖片刪除失敗通常是暫時性網路錯誤，不應阻斷使用者操作（如刪除區塊）。可實作 Cron Job 定期清理孤兒檔案（未來優化）。

#### 選項 B: Hash 命名（❌ 拒絕）
**路徑格式**: `home-page-blocks/{block_id}/{hash}.{ext}`

**優點**:
- 避免檔名衝突

**缺點**:
- 無法直接對應索引：需要在資料庫儲存 `{ hash, index }` 映射
- 清理複雜：需要查詢資料庫才知道哪些檔案需要刪除
- 追蹤困難：無法從檔名判斷是第幾張圖片

**被拒絕理由**: 增加複雜度，違反專案「簡單優先」原則。

### 決策

**✅ 選擇選項 A: 索引式命名 + 批次刪除所有副檔名 + 容錯機制**

**理由**:
1. 索引明確，易於追蹤
2. 刪除簡單，批次刪除避免孤兒檔案
3. 容錯設計不阻斷主流程
4. 參考現有 `announcements` 圖片清理機制，保持一致性

---

## R3: CSS scroll-snap vs 第三方輪播庫

### 問題陳述
商品展示區塊需要支援橫向滑動查看更多商品，需要選擇實作方式。

### 選項評估

#### 選項 A: CSS scroll-snap（✅ 選擇）
**實作範例**:
```tsx
<div className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory">
  {products.map((product) => (
    <div key={product.id} className="flex-shrink-0 w-1/2 md:w-1/3 snap-start">
      <ProductWithPriceCard product={product} />
    </div>
  ))}
</div>

{/* 滑動提示（當商品超過一排時） */}
{products.length > 2 && (
  <p className="text-sm text-gray-600 text-center mt-2">
    ← 左右滑動查看更多 →
  </p>
)}
```

**優點**:
- 原生 CSS：無需額外依賴，打包大小 0KB
- 效能最佳：GPU 加速，60fps 流暢滑動
- 觸控友善：支援原生觸控滑動
- 支援鍵盤導航：左右方向鍵切換
- 已驗證：005-responsive-ui 已使用 scroll-snap 實現購物車橫向滑動

**缺點**:
- 無指示器圓點：需自行實作（可選）
- 無自動播放：僅支援手動滑動

**瀏覽器支援**:
- Chrome 69+ ✅
- Firefox 68+ ✅
- Safari 11+ ✅
- Edge 79+ ✅
- iOS Safari 11+ ✅
- Android Chrome 69+ ✅

**覆蓋率**: 95%+ 全球使用者 ✅

#### 選項 B: Swiper.js（❌ 拒絕）
**打包大小**: ~80KB (gzipped ~30KB)

**優點**:
- 功能完整：支援指示器、自動播放、淡入淡出等
- 自訂性高：豐富的配置選項

**缺點**:
- 打包大小大：增加 80KB（違反專案「輕量化」原則）
- 功能過多：僅需橫向滑動，功能過度（過度工程化）
- 效能較差：JavaScript 驅動，效能不如原生 CSS

**被拒絕理由**: 打包大小過大，功能過度，違反專案「減少依賴」原則。

#### 選項 C: Embla Carousel（❌ 拒絕）
**打包大小**: ~20KB (gzipped ~8KB)

**優點**:
- 輕量：比 Swiper.js 小
- 支援 React Hook

**缺點**:
- 仍需額外依賴：增加打包大小
- 效能不如原生 CSS

**被拒絕理由**: 雖然輕量，但原生 CSS 更佳（0KB、效能最優）。

### 決策

**✅ 選擇選項 A: CSS scroll-snap**

**理由**:
1. 原生 CSS，無需額外依賴（0KB）
2. 效能最佳（GPU 加速、60fps）
3. 觸控友善，支援原生滑動
4. 瀏覽器支援度高（95%+ 覆蓋率）
5. 已在專案中驗證可行（005-responsive-ui 購物車橫向滑動）

**參考實作**: `app/(shop)/store/cart/page.tsx` 的購物車商品橫向滑動

---

## R4: 圖片輪播自動播放與指示器

### 問題陳述
圖片輪播區塊需要支援自動播放與手動切換，需要選擇實作方式。

### 選項評估

#### 選項 A: React useEffect + setInterval（✅ 選擇）
**實作範例**:
```tsx
export function ImageCarousel({ config }: { config: ImageCarouselConfig }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  // 自動播放邏輯
  useEffect(() => {
    if (!config.auto_play) return

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % config.images.length)
    }, config.interval_ms)

    return () => clearInterval(timer)
  }, [config.auto_play, config.interval_ms, config.images.length, currentIndex])

  // 手動切換（點擊指示器圓點）
  const handleDotClick = (index: number) => {
    setCurrentIndex(index)
    // 手動切換後重新計時（useEffect 依賴 currentIndex 會重新執行）
  }

  return (
    <div className="relative">
      {/* 圖片顯示 */}
      <Image
        src={config.images[currentIndex].url}
        alt="輪播圖片"
        className="h-64 md:h-96 w-full object-cover border-2 md:border-3 border-black shadow-neo-sm md:shadow-neo"
      />

      {/* 指示器圓點 */}
      <div className="flex gap-2 justify-center mt-4">
        {config.images.map((_, index) => (
          <button
            key={index}
            onClick={() => handleDotClick(index)}
            className={cn(
              'w-3 h-3 rounded-full border-2 border-black',
              index === currentIndex ? 'bg-black' : 'bg-white'
            )}
            aria-label={`跳到第 ${index + 1} 張圖片`}
          />
        ))}
      </div>
    </div>
  )
}
```

**優點**:
- 簡單：無需額外依賴
- 可控：手動切換後重新計時
- 易維護：邏輯清晰，易於除錯

**缺點**:
- 無淡入淡出動畫（即時切換）

**理由**: Spec 明確說明「不實作淡入淡出動畫（Out of Scope）」，即時切換符合需求。

#### 選項 B: Embla Carousel（❌ 拒絕）
**優點**:
- 支援淡入淡出動畫
- 支援自動播放

**缺點**:
- 增加打包大小（~20KB）
- 功能過多（僅需自動播放 + 指示器）

**被拒絕理由**: 功能過度，違反專案「減少依賴」原則。

### 決策

**✅ 選擇選項 A: React useEffect + setInterval**

**理由**:
1. 無需額外依賴（0KB）
2. 邏輯簡單，易維護
3. 手動切換後重新計時（良好 UX）
4. 符合 Spec 需求（不需淡入淡出動畫）

---

## R5: 上移/下移排序 vs 拖曳排序

### 問題陳述
管理員需要調整區塊的顯示順序，需要選擇排序實作方式。

### 選項評估

#### 選項 A: 上移/下移按鈕（✅ 選擇）
**實作範例**:
```tsx
export function HomeBlockCard({ block, isFirst, isLast }: Props) {
  const handleMoveUp = async () => {
    const result = await moveBlockUp(block.id)
    if (result.success) {
      toast.success('區塊已上移')
      revalidate() // 重新載入列表
    }
  }

  return (
    <div className="border-3 border-black shadow-neo p-4">
      <h3>{block.name}</h3>
      <div className="flex gap-2 mt-4">
        <button
          onClick={handleMoveUp}
          disabled={isFirst}
          className={cn(
            'px-4 py-2 border-2 border-black',
            isFirst ? 'bg-gray-300 cursor-not-allowed' : 'bg-white hover:shadow-none'
          )}
        >
          ↑ 上移
        </button>
        <button
          onClick={handleMoveDown}
          disabled={isLast}
          className={cn(
            'px-4 py-2 border-2 border-black',
            isLast ? 'bg-gray-300 cursor-not-allowed' : 'bg-white hover:shadow-none'
          )}
        >
          ↓ 下移
        </button>
      </div>
    </div>
  )
}
```

**Server Action 實作**:
```typescript
export async function moveBlockUp(blockId: string): Promise<ActionResult<void>> {
  await checkAuth('admin')

  // 1. 查詢當前區塊和上一個區塊
  const blocks = await supabase
    .from('home_page_blocks')
    .select('id, sort_order')
    .order('sort_order', { ascending: true })

  const currentIndex = blocks.findIndex(b => b.id === blockId)
  if (currentIndex === 0) {
    return { success: false, message: '已是第一個區塊' }
  }

  const currentBlock = blocks[currentIndex]
  const prevBlock = blocks[currentIndex - 1]

  // 2. 交換 sort_order
  await supabase
    .from('home_page_blocks')
    .update({ sort_order: prevBlock.sort_order })
    .eq('id', currentBlock.id)

  await supabase
    .from('home_page_blocks')
    .update({ sort_order: currentBlock.sort_order })
    .eq('id', prevBlock.id)

  revalidatePath('/admin/announcements')
  return { success: true, message: '區塊已上移' }
}
```

**優點**:
- 實作簡單：交換兩個區塊的 `sort_order`
- 無需額外依賴：純 React + Server Actions
- 手機友善：按鈕點擊比拖曳更適合觸控
- 易測試：邏輯清晰

**缺點**:
- 一次只能移動一格（若需大幅調整順序較慢）

**緩解**: 區塊數量通常不多（< 10 個），一次移動一格可接受。

#### 選項 B: 拖曳排序 (@dnd-kit)（❌ 拒絕）
**打包大小**: ~50KB (gzipped ~15KB)

**優點**:
- 直覺：可直接拖曳到目標位置
- 一次移動多格

**缺點**:
- 打包大小大：增加 50KB
- 手機體驗差：觸控拖曳不如按鈕點擊精確
- 實作複雜：需處理拖曳狀態、碰撞檢測
- 無障礙性差：鍵盤導航困難

**被拒絕理由**: 增加打包大小、手機體驗差、違反專案「輕量化」原則。

### 決策

**✅ 選擇選項 A: 上移/下移按鈕**

**理由**:
1. 實作簡單，無需額外依賴（0KB）
2. 手機友善，觸控點擊比拖曳精確
3. 易測試，邏輯清晰
4. 符合專案「輕量化、減少依賴」原則
5. 參考業界案例：WordPress 區塊編輯器也提供上移/下移按鈕（可選）

---

## R6: Tab 切換器 vs 獨立頁面

### 問題陳述
需要整合「商品頁廣告」和「首頁廣告」的管理入口，需要選擇架構設計。

### 選項評估

#### 選項 A: Tab 切換器（✅ 選擇）
**URL 設計**: `/admin/announcements?tab=products` 或 `/admin/announcements?tab=home`

**實作範例**:
```tsx
'use client'

import { useSearchParams, useRouter } from 'next/navigation'

export function TabSwitcher() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab') || 'products'

  const handleTabChange = (tab: string) => {
    router.push(`/admin/announcements?tab=${tab}`)
  }

  return (
    <div className="flex gap-2 mb-6">
      <button
        onClick={() => handleTabChange('products')}
        className={cn(
          'px-6 py-3 border-3 border-black font-bold',
          currentTab === 'products'
            ? 'bg-green-400 shadow-neo'
            : 'bg-white shadow-neo-sm hover:shadow-none'
        )}
      >
        商品頁廣告
      </button>
      <button
        onClick={() => handleTabChange('home')}
        className={cn(
          'px-6 py-3 border-3 border-black font-bold',
          currentTab === 'home'
            ? 'bg-green-400 shadow-neo'
            : 'bg-white shadow-neo-sm hover:shadow-none'
        )}
      >
        首頁廣告
      </button>
    </div>
  )
}
```

**頁面實作**:
```tsx
// app/(admin)/admin/announcements/page.tsx
export default function AnnouncementsPage({ searchParams }: Props) {
  const tab = searchParams.tab || 'products'

  return (
    <div>
      <h1>廣告管理</h1>
      <TabSwitcher />

      {tab === 'products' && <AnnouncementList />}       {/* 現有功能 */}
      {tab === 'home' && <HomeBlockList />}              {/* 新功能 */}
    </div>
  )
}
```

**優點**:
- 統一入口：單一頁面管理所有廣告
- 減少導覽層級：無需在側邊欄新增額外連結
- URL 語義化：查詢參數清楚表達當前 Tab
- 狀態保留：切換 Tab 不會重新載入整個頁面（Client Component）

**缺點**:
- URL 查詢參數可能與現有邏輯衝突（需測試）

**緩解**: 現有 `/admin/announcements` 頁面無使用查詢參數，無衝突風險。

#### 選項 B: 獨立頁面（❌ 拒絕）
**URL 設計**: `/admin/home-blocks`

**優點**:
- 完全獨立：無衝突風險
- URL 更短

**缺點**:
- 增加導覽層級：需在側邊欄新增「首頁廣告」連結
- 功能分散：使用者需記住兩個入口
- 管理效率低：切換功能需重新導覽

**被拒絕理由**: 增加導覽複雜度、功能分散，違反專案「使用者體驗優先」原則。

### 決策

**✅ 選擇選項 A: Tab 切換器（URL 查詢參數）**

**理由**:
1. 統一廣告管理入口，提升管理效率
2. 減少導覽層級，提升使用者體驗
3. URL 語義化，易於分享與收藏
4. 無衝突風險（現有頁面無使用查詢參數）
5. 參考業界案例：WordPress、Notion 都使用 Tab 切換器管理不同類型的內容

---

## Summary Table

| 研究項目 | 決策 | 主要理由 | 打包大小影響 |
|---------|------|---------|-------------|
| R1: 資料儲存 | JSONB + Zod | 彈性、排序簡單、型別安全 | 0KB (Zod 已使用) |
| R2: 圖片清理 | 索引式命名 + 容錯 | 易追蹤、刪除簡單、不阻斷流程 | 0KB |
| R3: 橫向滑動 | CSS scroll-snap | 原生、效能佳、觸控友善 | 0KB |
| R4: 圖片輪播 | useEffect + setInterval | 簡單、無依賴、易維護 | 0KB |
| R5: 區塊排序 | 上移/下移按鈕 | 簡單、手機友善、無依賴 | 0KB |
| R6: Tab 切換 | URL 查詢參數 | 統一入口、減少層級、語義化 | 0KB |
| **Total** | | | **0KB** ✅ |

**結論**: 所有技術決策均符合專案「輕量化、效能優先、減少依賴」原則，總打包大小影響 **0KB**。

---

## Performance Benchmarks

### 目標效能指標

| 操作 | 目標時間 | 實測方式 |
|------|---------|---------|
| 首頁載入 (含圖片) | < 2s (Mobile 4G) | Lighthouse Mobile |
| 圖片輪播切換 | < 100ms | Chrome DevTools Performance |
| 商品展示查詢 | < 300ms | `getProductsByBlockConfig()` |
| 區塊排序更新 | < 200ms | `moveBlockUp()` / `moveBlockDown()` |
| 圖片上傳 (1MB) | < 2s | `uploadBlockImage()` |

### 優化策略

1. **圖片載入優化**:
   - 使用 Next.js Image `priority` 屬性優化首屏載入
   - 使用 `sizes` 屬性優化不同裝置的圖片尺寸
   - WebP 格式優先（自動 fallback 到 JPEG）

2. **CSS scroll-snap**:
   - GPU 加速，60fps 流暢滑動
   - 無需 JavaScript 運算，效能最佳

3. **資料庫索引**:
   - `idx_home_blocks_active_sort` (is_active, sort_order) - 優化前台查詢
   - `idx_home_blocks_type` (block_type) - 優化後台篩選

4. **SSR 快取**:
   - 使用 Next.js `unstable_cache` 快取首頁區塊查詢
   - 快取時間 60 秒（可依需求調整）

---

## Browser Compatibility

| 功能 | 最低版本要求 | 覆蓋率 |
|------|-------------|-------|
| CSS scroll-snap | Chrome 69+, Safari 11+, Firefox 68+ | 95%+ |
| Next.js Image | 現代瀏覽器 | 98%+ |
| JSONB (PostgreSQL) | Server-side（無瀏覽器限制） | 100% |

**結論**: 所有功能在現代瀏覽器（2018 年後）都有良好支援，覆蓋率 > 95%。

---

## References

1. **JSONB in PostgreSQL**: https://www.postgresql.org/docs/current/datatype-json.html
2. **Zod Discriminated Unions**: https://zod.dev/?id=discriminated-unions
3. **CSS scroll-snap**: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Scroll_Snap
4. **Next.js Image Optimization**: https://nextjs.org/docs/app/building-your-application/optimizing/images
5. **Supabase Storage**: https://supabase.com/docs/guides/storage
6. **專案參考實作**:
   - 005-responsive-ui: CSS scroll-snap 橫向滑動
   - 007-system-enhancement: Announcements 圖片清理機制
   - 013-unified-dialog: 統一對話框系統

---

**Research Complete** - 所有技術決策已明確，可進入 Phase 1 設計階段。
