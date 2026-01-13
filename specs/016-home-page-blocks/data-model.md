# Data Model: 首頁廣告區塊系統

**Feature**: 016-home-page-blocks | **Date**: 2026-01-13

## Overview

首頁廣告區塊系統使用單一資料表 `home_page_blocks`，透過 JSONB `config` 欄位彈性儲存三種區塊類型的不同配置。本文件定義資料表結構、JSONB Config 格式、索引設計與 RLS Policy。

---

## Entity Relationship Diagram

```
home_page_blocks (主表)
├── id (UUID, PK)
├── name (TEXT)
├── block_type (TEXT) ← 'image_carousel' | 'product_display' | 'text_block'
├── config (JSONB) ← 依 block_type 不同結構
├── sort_order (INTEGER)
├── is_active (BOOLEAN)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

關聯：
- config.images[].series_id → series.id (外部參考，非 FK)
- config.series_ids[] → series.id (外部參考，非 FK)
- config.tag_ids[] → product_tags.id (外部參考，非 FK)
```

**設計決策**:
- ✅ 使用 JSONB 欄位避免過度正規化（三種區塊類型差異大）
- ✅ 不使用 FK 約束（彈性支援系列/標籤刪除，前端容錯處理）
- ✅ 單一表設計簡化排序邏輯（ORDER BY sort_order）

---

## Table Schema

### home_page_blocks

```sql
CREATE TABLE home_page_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  block_type TEXT NOT NULL CHECK (block_type IN ('image_carousel', 'product_display', 'text_block')),
  config JSONB NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_home_blocks_active_sort ON home_page_blocks(is_active, sort_order);
CREATE INDEX idx_home_blocks_type ON home_page_blocks(block_type);

-- 觸發器（自動更新 updated_at）
CREATE TRIGGER update_home_page_blocks_updated_at
BEFORE UPDATE ON home_page_blocks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 註解
COMMENT ON TABLE home_page_blocks IS '首頁廣告區塊表（支援圖片輪播、商品展示、文字區塊）';
COMMENT ON COLUMN home_page_blocks.block_type IS '區塊類型：image_carousel（圖片輪播）、product_display（商品展示）、text_block（文字區塊）';
COMMENT ON COLUMN home_page_blocks.config IS '區塊配置（JSONB）：依 block_type 不同結構';
COMMENT ON COLUMN home_page_blocks.sort_order IS '排序順序（數字越小越靠前）';
COMMENT ON COLUMN home_page_blocks.is_active IS '是否啟用（僅啟用的區塊會顯示在前台）';
```

---

## JSONB Config Schema

### 1. Image Carousel Config (圖片輪播)

**block_type**: `'image_carousel'`

**Config 結構**:
```typescript
interface ImageCarouselConfig {
  images: Array<{
    url: string                  // 圖片 URL（Supabase Storage 公開 URL）
    series_id?: string | null    // 可選：連結到系列頁面的 UUID
  }>
  auto_play: boolean             // 是否自動播放
  interval_ms: number            // 輪播間隔（毫秒，最小 1000ms）
}
```

**範例 JSON**:
```json
{
  "images": [
    {
      "url": "https://xxx.supabase.co/storage/v1/object/public/products/home-page-blocks/...",
      "series_id": "550e8400-e29b-41d4-a716-446655440000"
    },
    {
      "url": "https://xxx.supabase.co/storage/v1/object/public/products/home-page-blocks/...",
      "series_id": null
    }
  ],
  "auto_play": true,
  "interval_ms": 5000
}
```

**驗證規則**:
- `images`: 最少 1 張、最多 5 張
- `url`: 必須為有效 URL 格式
- `series_id`: 可選，若提供必須為 UUID 格式
- `interval_ms`: 最小 1000ms（1 秒）

---

### 2. Product Display Config (商品展示)

**block_type**: `'product_display'`

**Config 結構**:
```typescript
interface ProductDisplayConfig {
  series_ids?: string[] | null   // 可選：系列 UUID 陣列（AND 邏輯）
  tag_ids?: string[] | null      // 可選：標籤 UUID 陣列（AND 邏輯）
  max_items?: number | null      // 可選：最大顯示數量（預設 50）
}
```

**範例 JSON**:
```json
{
  "series_ids": ["550e8400-e29b-41d4-a716-446655440000"],
  "tag_ids": ["660f9511-f39c-42e5-b817-557766551111"],
  "max_items": 12
}
```

**驗證規則**:
- `series_ids`: 若提供，每個元素必須為 UUID 格式
- `tag_ids`: 若提供，每個元素必須為 UUID 格式
- `max_items`: 最小 1、最大 50

**查詢邏輯**:
```sql
-- 若提供 series_ids 和 tag_ids，使用 AND 邏輯
SELECT * FROM products
WHERE series_id = ANY(series_ids)
  AND EXISTS (
    SELECT 1 FROM product_tags
    WHERE product_id = products.id
      AND tag_id = ANY(tag_ids)
  )
LIMIT max_items;
```

---

### 3. Text Block Config (文字區塊)

**block_type**: `'text_block'`

**Config 結構**:
```typescript
interface TextBlockConfig {
  content: string                // 文字內容（最多 1000 字元）
  font_size: '12' | '16' | '20' | '24' | '32' | '40' | '48'  // 字體大小（px）
  color: string                  // 字體顏色（Hex 格式 #RRGGBB）
}
```

**範例 JSON**:
```json
{
  "content": "新春優惠，全館 8 折起！",
  "font_size": "32",
  "color": "#FF0000"
}
```

**驗證規則**:
- `content`: 最少 1 字元、最多 1000 字元
- `font_size`: 僅允許 7 個固定值（'12', '16', '20', '24', '32', '40', '48'）
- `color`: 必須符合 Hex 格式 #RRGGBB（正則表達式 `/^#[0-9A-Fa-f]{6}$/`）

---

## Indexes

### idx_home_blocks_active_sort
**類型**: B-tree Composite Index
**欄位**: `(is_active, sort_order)`
**用途**: 優化前台查詢啟用區塊的排序

**查詢範例**:
```sql
-- 前台查詢啟用區塊（使用此索引）
SELECT * FROM home_page_blocks
WHERE is_active = true
ORDER BY sort_order ASC;
```

**效能提升**: 從全表掃描 → 索引掃描（查詢時間 < 10ms）

### idx_home_blocks_type
**類型**: B-tree Index
**欄位**: `(block_type)`
**用途**: 優化後台依區塊類型篩選

**查詢範例**:
```sql
-- 後台查詢所有圖片輪播區塊（使用此索引）
SELECT * FROM home_page_blocks
WHERE block_type = 'image_carousel';
```

---

## RLS (Row Level Security) Policies

### 1. 客戶端查詢策略
**Policy Name**: `allow_authenticated_users_to_read_active_blocks`

**規則**:
```sql
CREATE POLICY "allow_authenticated_users_to_read_active_blocks"
  ON home_page_blocks FOR SELECT
  TO authenticated
  USING (is_active = true);
```

**說明**: 客戶端僅能查詢 `is_active = true` 的區塊，停用區塊不可見。

### 2. 管理員管理策略
**Policy Name**: `allow_admin_to_manage_blocks`

**規則**:
```sql
CREATE POLICY "allow_admin_to_manage_blocks"
  ON home_page_blocks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

**說明**: 管理員可查看所有區塊（含停用）、建立、更新、刪除。

---

## TypeScript Types

### Database Types
```typescript
// types/database.types.ts
export interface Database {
  public: {
    Tables: {
      home_page_blocks: {
        Row: {
          id: string
          name: string
          block_type: 'image_carousel' | 'product_display' | 'text_block'
          config: ImageCarouselConfig | ProductDisplayConfig | TextBlockConfig
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          block_type: 'image_carousel' | 'product_display' | 'text_block'
          config: ImageCarouselConfig | ProductDisplayConfig | TextBlockConfig
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          block_type?: 'image_carousel' | 'product_display' | 'text_block'
          config?: ImageCarouselConfig | ProductDisplayConfig | TextBlockConfig
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
```

### Application Types
```typescript
// types/index.ts
export type BlockType = 'image_carousel' | 'product_display' | 'text_block'

export interface ImageCarouselConfig {
  images: Array<{
    url: string
    series_id?: string | null
  }>
  auto_play: boolean
  interval_ms: number
}

export interface ProductDisplayConfig {
  series_ids?: string[] | null
  tag_ids?: string[] | null
  max_items?: number | null
}

export interface TextBlockConfig {
  content: string
  font_size: '12' | '16' | '20' | '24' | '32' | '40' | '48'
  color: string
}

export interface HomePageBlock {
  id: string
  name: string
  block_type: BlockType
  config: ImageCarouselConfig | ProductDisplayConfig | TextBlockConfig
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}
```

---

## Migration File

**檔案位置**: `supabase/migrations/20260113_home_page_blocks.sql`

**內容**:
```sql
-- ================================================
-- Vsale-lite Home Page Blocks Schema Migration
-- Feature: 016-home-page-blocks
-- Date: 2026-01-13
-- ================================================

-- 1. 建立首頁廣告區塊表
CREATE TABLE home_page_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  block_type TEXT NOT NULL CHECK (block_type IN ('image_carousel', 'product_display', 'text_block')),
  config JSONB NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 建立索引
CREATE INDEX idx_home_blocks_active_sort ON home_page_blocks(is_active, sort_order);
CREATE INDEX idx_home_blocks_type ON home_page_blocks(block_type);

-- 3. 建立觸發器（自動更新 updated_at）
CREATE TRIGGER update_home_page_blocks_updated_at
BEFORE UPDATE ON home_page_blocks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 4. 新增註解
COMMENT ON TABLE home_page_blocks IS '首頁廣告區塊表（支援圖片輪播、商品展示、文字區塊）';
COMMENT ON COLUMN home_page_blocks.block_type IS '區塊類型：image_carousel（圖片輪播）、product_display（商品展示）、text_block（文字區塊）';
COMMENT ON COLUMN home_page_blocks.config IS '區塊配置（JSONB）：依 block_type 不同結構';
COMMENT ON COLUMN home_page_blocks.sort_order IS '排序順序（數字越小越靠前）';
COMMENT ON COLUMN home_page_blocks.is_active IS '是否啟用（僅啟用的區塊會顯示在前台）';

-- 5. 啟用 RLS
ALTER TABLE home_page_blocks ENABLE ROW LEVEL SECURITY;

-- 6. 建立 RLS 策略
CREATE POLICY "allow_authenticated_users_to_read_active_blocks"
  ON home_page_blocks FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "allow_admin_to_manage_blocks"
  ON home_page_blocks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

**執行指令**:
```bash
# 執行 Migration
pnpm db:migrate

# 或使用 Supabase CLI
supabase db push
```

---

## Storage Structure

**Bucket**: `products`（使用現有 bucket）

**路徑規則**:
```
products/
└── home-page-blocks/
    └── {block_id}/
        ├── image-0.jpg   ← 第 1 張圖片
        ├── image-1.png   ← 第 2 張圖片
        ├── image-2.webp  ← 第 3 張圖片
        ├── image-3.jpg   ← 第 4 張圖片
        └── image-4.png   ← 第 5 張圖片
```

**Storage RLS Policy**:
- 已由 002-product-management 建立，無需額外配置
- 公開讀取：所有人可讀取（`bucket_id = 'products'`）
- 管理員上傳：僅管理員可上傳/更新/刪除

---

## Data Constraints

### 業務規則
1. **區塊名稱唯一性**: ❌ 不強制（允許重複，由管理員自行管理）
2. **啟用區塊數量限制**: ❌ 不強制（不限制數量，但建議 < 10 個）
3. **圖片數量限制**: ✅ Zod Schema 驗證（1-5 張）
4. **商品數量限制**: ✅ Zod Schema 驗證（max_items 1-50）
5. **文字長度限制**: ✅ Zod Schema 驗證（content 1-1000 字元）

### 外部參考（非 FK）
- `config.images[].series_id` → `series.id`（可選）
- `config.series_ids[]` → `series.id`（可選）
- `config.tag_ids[]` → `product_tags.id`（可選）

**設計決策**: 不使用 FK 約束，允許系列/標籤被刪除。前端容錯處理（若系列不存在，跳過連結）。

---

## Sample Data

```sql
-- 範例 1: 圖片輪播區塊
INSERT INTO home_page_blocks (name, block_type, config, sort_order, is_active) VALUES (
  '首頁主視覺輪播',
  'image_carousel',
  '{
    "images": [
      {
        "url": "https://xxx.supabase.co/storage/v1/object/public/products/home-page-blocks/550e8400-e29b-41d4-a716-446655440000/image-0.jpg",
        "series_id": "660f9511-f39c-42e5-b817-557766551111"
      },
      {
        "url": "https://xxx.supabase.co/storage/v1/object/public/products/home-page-blocks/550e8400-e29b-41d4-a716-446655440000/image-1.png",
        "series_id": null
      }
    ],
    "auto_play": true,
    "interval_ms": 5000
  }'::jsonb,
  0,
  true
);

-- 範例 2: 商品展示區塊
INSERT INTO home_page_blocks (name, block_type, config, sort_order, is_active) VALUES (
  '熱銷商品推薦',
  'product_display',
  '{
    "series_ids": ["770g0622-g40d-43f6-c828-668877662222"],
    "tag_ids": null,
    "max_items": 12
  }'::jsonb,
  1,
  true
);

-- 範例 3: 文字區塊
INSERT INTO home_page_blocks (name, block_type, config, sort_order, is_active) VALUES (
  '新春促銷標語',
  'text_block',
  '{
    "content": "新春優惠，全館 8 折起！",
    "font_size": "32",
    "color": "#FF0000"
  }'::jsonb,
  2,
  true
);
```

---

**Data Model Complete** - 資料表結構、JSONB Config、索引、RLS 策略已完整定義。
