# Quick Start Guide: UI/UX 優化與功能強化

**Feature**: 006-ux-enhancement
**版本**: 1.0.0
**最後更新**: 2026-01-04

---

## 概述

本指南幫助開發者快速理解 Phase 006 UI/UX 優化專案的核心功能、架構與實作流程。

**目標**: 在 10 分鐘內了解專案結構、關鍵功能與開發流程

---

## 1. 專案簡介

### 核心目標
將 Vsale-lite 從「功能完整的 MVP」提升為「使用者愛用的產品」

### 關鍵交付物
- ✨ 前台: 搜尋、篩選、導航優化、視覺優化 (4 項使用者故事)
- 🛠️ 後台: 側邊欄分類、客戶快篩、Excel 匯入/匯出、訂單刪除、標籤管理、儀表板 (6 項使用者故事)
- 🎨 品牌: Vsale Logo 設計與整合 (1 項使用者故事)

### 技術棧
- **前端**: Next.js 15 (App Router), React 19, Tailwind CSS
- **後端**: Supabase PostgreSQL, Server Actions
- **新增依賴**: SheetJS (xlsx), Recharts (圖表)

---

## 2. 快速上手

### 環境準備

```bash
# 1. 安裝新增的 npm 套件
pnpm add xlsx @types/xlsx recharts

# 2. 啟動本地 Supabase (Docker)
supabase start

# 3. 執行資料庫 Migration
supabase db reset

# 4. 啟動開發伺服器
pnpm dev
```

### 驗證環境

訪問以下頁面驗證功能:
- 前台商店: http://localhost:3000/store
- 後台管理: http://localhost:3000/admin/dashboard

---

## 3. 資料庫變更

### Migration 1: 新增商品標籤

```bash
# 檔案: supabase/migrations/20260109_add_product_tags.sql
supabase migration new add_product_tags
```

**內容**:
```sql
-- 新增 products.tags 欄位
ALTER TABLE products ADD COLUMN tags TEXT[] DEFAULT '{}';

-- 建立 GIN 索引
CREATE INDEX idx_products_tags ON products USING GIN(tags);

-- 新增約束
ALTER TABLE products
  ADD CONSTRAINT check_tags_length
  CHECK (array_length(tags, 1) IS NULL OR array_length(tags, 1) <= 5);
```

**測試**:
```sql
-- 新增測試標籤
UPDATE products SET tags = ARRAY['熱銷', '新品']
WHERE name LIKE '%可口可樂%';

-- 查詢測試
SELECT * FROM products WHERE tags @> ARRAY['熱銷'];
```

---

### Migration 2: 訂單刪除操作記錄

```sql
-- 檔案: supabase/migrations/20260110_add_order_delete_action.sql
COMMENT ON COLUMN order_timelines.type IS '操作類型: created, confirmed, status_changed, cancelled, deleted';
```

---

## 4. 核心功能實作

### 功能 1: 全域搜尋 (US1)

**檔案**: `lib/actions/products.ts`

```typescript
'use server';
import { z } from 'zod';

export async function searchProducts(query: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('products')
    .select(`
      *,
      series:series_id (name, default_image_url, category_id),
      user_price:tier_prices!inner(amount)
    `)
    .ilike('name', `%${query}%`)
    .limit(50);

  return { success: true, data };
}
```

**前端元件**: `components/ui/search-bar.tsx`

```typescript
'use client';
import { useDebouncedCallback } from 'use-debounce';

export function SearchBar() {
  const [results, setResults] = useState([]);

  const handleSearch = useDebouncedCallback(async (query) => {
    if (query.length < 2) return;
    const result = await searchProducts(query);
    setResults(result.data);
  }, 300);

  return (
    <input
      type="search"
      placeholder="搜尋商品..."
      onChange={(e) => handleSearch(e.target.value)}
    />
  );
}
```

---

### 功能 2: Excel 匯入/匯出 (US7)

**匯出**: `lib/actions/clients.ts`

```typescript
import * as XLSX from 'xlsx';

export async function exportClients() {
  const clients = await getClients();
  const excelData = clients.map(c => ({
    '手機號碼': c.phone,
    '姓名': c.name,
    '會員等級': c.tier.name,
    '建立時間': c.created_at
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '客戶列表');

  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'buffer'
  });

  return {
    success: true,
    data: {
      file_name: `客戶資料_${new Date().toISOString().split('T')[0]}.xlsx`,
      file_buffer: excelBuffer
    }
  };
}
```

**匯入**: `lib/actions/clients.ts`

```typescript
export async function importClients(file: File) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet);

  // 驗證與寫入
  const validClients = data.map(row => clientImportSchema.parse(row));
  await batchCreateClients(validClients);

  return { success: true, data: { success_count: validClients.length } };
}
```

---

### 功能 3: 商品標籤管理 (US9)

**批次更新**: `lib/actions/tags.ts`

```typescript
export async function batchUpdateProductTags(
  product_ids: string[],
  operation: 'add' | 'remove',
  tags: string[]
) {
  for (const product_id of product_ids) {
    const { data: product } = await supabase
      .from('products')
      .select('tags')
      .eq('id', product_id)
      .single();

    let newTags = product.tags || [];
    if (operation === 'add') {
      newTags = [...new Set([...newTags, ...tags])];
    } else {
      newTags = newTags.filter(t => !tags.includes(t));
    }

    await supabase
      .from('products')
      .update({ tags: newTags })
      .eq('id', product_id);
  }

  return { success: true };
}
```

---

### 功能 4: 訂單刪除 (US8)

**Server Action**: `lib/actions/orders.ts`

```typescript
export async function deleteOrder(order_id: string, reason?: string) {
  const { user } = await checkAuth();
  if (user.role !== 'admin') {
    return { success: false, message: '無權限' };
  }

  const { data: order } = await supabase
    .from('orders')
    .select('status')
    .eq('id', order_id)
    .single();

  if (order.status !== 'pending') {
    return { success: false, message: '僅允許刪除 pending 狀態的訂單' };
  }

  // 記錄操作歷史
  await supabase.from('order_timelines').insert({
    order_id,
    type: 'deleted',
    content: `管理員刪除訂單 (原因: ${reason || '未提供'})`,
    actor_id: user.id
  });

  // 刪除訂單
  await supabase.from('orders').delete().eq('id', order_id);

  return { success: true };
}
```

---

## 5. UI 元件範例

### Logo 元件

**檔案**: `components/ui/logo.tsx`

```typescript
import Image from 'next/image';
import Link from 'next/link';

export function Logo({ variant = 'full' }: { variant?: 'full' | 'icon' }) {
  return (
    <Link href="/store">
      <Image
        src={variant === 'full' ? '/logo.svg' : '/logo-icon.svg'}
        alt="Vsale"
        width={variant === 'full' ? 120 : 40}
        height={40}
      />
    </Link>
  );
}
```

---

### 標籤徽章元件

**檔案**: `components/ui/tag-badge.tsx`

```typescript
export function TagBadge({ tag }: { tag: string }) {
  const colorMap = {
    '熱銷': 'bg-red-100 border-red-500',
    '新品': 'bg-blue-100 border-blue-500',
    '限量': 'bg-yellow-100 border-yellow-500',
    '促銷': 'bg-green-100 border-green-500'
  };

  return (
    <span
      className={`
        px-2 py-1 text-xs font-bold
        border-2 border-black rounded-none
        ${colorMap[tag] || 'bg-gray-100'}
      `}
    >
      {tag}
    </span>
  );
}
```

---

### 商品卡片 (含庫存狀態色彩)

**檔案**: `components/shop/product-card.tsx`

```typescript
export function ProductCard({ product }: { product: Product }) {
  const getStockColor = (stock: number) => {
    if (stock > 10) return 'border-green-500';
    if (stock > 0) return 'border-yellow-500';
    return 'border-red-500';
  };

  return (
    <div
      className={`
        border-3 border-black rounded-none shadow-neo
        ${getStockColor(product.stock)}
      `}
    >
      {/* 標籤徽章 */}
      <div className="absolute top-2 left-2 flex gap-1">
        {product.tags.slice(0, 2).map(tag => (
          <TagBadge key={tag} tag={tag} />
        ))}
      </div>

      {/* 商品圖片與資訊 */}
      <Image src={product.image_url} alt={product.name} />
      <h3>{product.name}</h3>

      {/* 價格顯示 */}
      <div>
        <span className="line-through text-gray-500">
          ${product.retail_price}
        </span>
        <span className="text-2xl font-bold text-blue-800">
          ${product.user_price}
        </span>
      </div>
    </div>
  );
}
```

---

## 6. 測試與驗證

### 執行測試

```bash
# 單元測試
pnpm test

# 測試覆蓋率
pnpm test:coverage

# UI 測試 (Vitest UI)
pnpm test:ui
```

### 測試案例範例

```typescript
// tests/search.test.ts
import { searchProducts } from '@/lib/actions/products';

describe('searchProducts', () => {
  it('應回傳符合關鍵字的商品', async () => {
    const result = await searchProducts('可樂');
    expect(result.success).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
  });

  it('應支援商品編號搜尋', async () => {
    const result = await searchProducts('COLA-330');
    expect(result.data[0].product_code).toBe('COLA-330');
  });
});
```

---

## 7. 部署流程

### 本地部署檢查

```bash
# 1. 型別檢查
pnpm type-check

# 2. 建置檢查
pnpm build

# 3. 推送 Migration 到雲端 Supabase
supabase db push

# 4. 部署到 Firebase
firebase deploy --only hosting
```

### 部署檢查清單

- ✅ 所有測試通過
- ✅ 型別檢查無錯誤
- ✅ Migration 已推送到雲端
- ✅ Logo SVG 檔案已上傳到 `public/`
- ✅ 環境變數已設定 (無新增需求)

---

## 8. 常見問題

### Q1: 搜尋響應太慢怎麼辦?

**A**: 檢查以下項目:
1. 是否已建立 `products.name` 索引?
2. 防抖時間是否設定為 300ms?
3. 是否限制回傳筆數 (limit 50)?

```sql
-- 建立索引
CREATE INDEX idx_products_name ON products(name);
```

---

### Q2: Excel 匯入出現亂碼?

**A**: 確保使用 UTF-8 BOM:

```typescript
const excelBuffer = XLSX.write(workbook, {
  bookType: 'xlsx',
  type: 'buffer',
  bookSST: false  // 確保正確編碼
});
```

---

### Q3: 標籤查詢效能不佳?

**A**: 確認 GIN 索引是否存在:

```sql
-- 檢查索引
SELECT indexname FROM pg_indexes WHERE tablename = 'products';

-- 若不存在則建立
CREATE INDEX idx_products_tags ON products USING GIN(tags);
```

---

## 9. 下一步

### 完成本專案後
1. 執行 `/speckit.tasks` 生成詳細任務清單
2. 依 Phase 1-5 順序實作功能
3. 每完成一個 Phase 執行測試與 Git Commit

### 學習資源
- [Supabase PostgreSQL Array Types](https://supabase.com/docs/guides/database/arrays)
- [SheetJS Documentation](https://docs.sheetjs.com/)
- [Recharts Examples](https://recharts.org/en-US/examples)

---

## 10. 快速參考

### 關鍵檔案位置

```text
專案根目錄/
├── lib/actions/
│   ├── products.ts         # searchProducts, filterProducts
│   ├── clients.ts          # exportClients, importClients
│   ├── orders.ts           # deleteOrder
│   └── tags.ts             # batchUpdateProductTags
├── components/
│   ├── ui/
│   │   ├── logo.tsx        # Logo 元件
│   │   ├── search-bar.tsx  # 搜尋欄
│   │   └── tag-badge.tsx   # 標籤徽章
│   ├── shop/
│   │   └── product-card.tsx # 商品卡片
│   └── admin/
│       ├── sidebar.tsx     # 側邊欄
│       └── excel-import.tsx # Excel 匯入元件
└── supabase/migrations/
    ├── 20260109_add_product_tags.sql
    └── 20260110_add_order_delete_action.sql
```

### 常用指令

```bash
# 開發
pnpm dev                    # 啟動開發伺服器
supabase start              # 啟動本地 Supabase
supabase db reset           # 重置資料庫

# 測試
pnpm test                   # 執行測試
pnpm type-check             # 型別檢查

# 部署
pnpm build                  # 建置專案
supabase db push            # 推送 Migration
firebase deploy             # 部署到 Firebase
```

---

**文件版本**: 1.0.0
**建立日期**: 2026-01-04
**預估閱讀時間**: 10 分鐘

---

🎉 **恭喜!** 您已掌握 Phase 006 UI/UX 優化專案的核心知識，現在可以開始實作了!
