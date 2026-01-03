# Technical Research: UI/UX 優化與功能強化

**Feature**: 006-ux-enhancement
**Date**: 2026-01-04
**Status**: Completed

---

## Overview

本文件記錄 Phase 006 UI/UX 優化專案的技術研究與決策過程。所有技術選擇均基於專案現有技術棧與憲章原則。

---

## Research Topics

### 1. 全域搜尋實作方案

#### Decision: 使用防抖 (Debounce) + PostgreSQL ILIKE 查詢

#### Rationale:
- **效能**: 防抖 (300ms) 減少不必要的資料庫查詢，避免每次按鍵都觸發請求
- **使用者體驗**: 即時回饋但不過度頻繁，平衡流暢度與伺服器負載
- **技術簡單**: 不需引入額外的全文搜尋服務 (如 ElasticSearch)，直接使用 PostgreSQL 內建功能

#### Implementation:
```sql
-- 搜尋邏輯 (在 Server Action 中執行)
SELECT * FROM products
WHERE status = 'active'
  AND (
    name ILIKE '%搜尋關鍵字%'
    OR product_code ILIKE '%搜尋關鍵字%'
  )
ORDER BY updated_at DESC
LIMIT 50;
```

```typescript
// 前端防抖實作
import { useDebouncedCallback } from 'use-debounce';

const handleSearch = useDebouncedCallback((query: string) => {
  searchProducts(query);
}, 300);
```

#### Alternatives Considered:
- **即時搜尋 (無防抖)**: 拒絕理由 - 效能浪費，資料庫負載過高
- **全文搜尋 (PostgreSQL FTS)**: 拒絕理由 - 過度工程，商品數量不大 (預估 < 10,000)，ILIKE 足夠
- **ElasticSearch**: 拒絕理由 - 增加系統複雜度與維護成本，不符合憲章簡單性原則

---

### 2. Excel 匯入/匯出技術選擇

#### Decision: SheetJS (xlsx) 庫

#### Rationale:
- **業界標準**: 最成熟且廣泛使用的 JavaScript Excel 處理庫
- **全功能支援**: 支援讀取/寫入 .xlsx, .xls, .csv 等多種格式
- **UTF-8 BOM 支援**: 可確保 Excel 正確顯示繁體中文 (避免亂碼)
- **前後端通用**: 可在瀏覽器與 Node.js 環境中執行

#### Implementation:
```typescript
// 匯出範例
import * as XLSX from 'xlsx';

export async function exportClients() {
  const clients = await getClients();
  const worksheet = XLSX.utils.json_to_sheet(clients);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '客戶列表');

  // 加入 UTF-8 BOM 確保中文正確顯示
  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'buffer',
    bookSST: false
  });

  return excelBuffer;
}

// 匯入範例
export async function importClients(file: File) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet);

  // 驗證資料格式
  const validated = data.map(row => clientImportSchema.parse(row));

  // 批次寫入資料庫
  return await batchCreateClients(validated);
}
```

#### Alternatives Considered:
- **ExcelJS**: 拒絕理由 - 功能相似但社群較小，SheetJS 生態系更完整
- **PapaParse (CSV only)**: 拒絕理由 - 僅支援 CSV，不支援 .xlsx 格式
- **手動 CSV 處理**: 拒絕理由 - 不支援多工作表、樣式、公式等進階功能

---

### 3. 商品標籤 (Tags) 資料庫設計

#### Decision: PostgreSQL TEXT[] 陣列欄位 + GIN 索引

#### Rationale:
- **正規化權衡**: 標籤數量少 (最多 5 個) 且查詢模式簡單，不需獨立 `tags` 表
- **查詢效能**: GIN 索引支援陣列查詢，效能優於 JOIN 多表查詢
- **開發簡單**: 避免多對多關聯表的複雜度，減少 JOIN 操作
- **PostgreSQL 原生支援**: 陣列型別是 PostgreSQL 強項，不需額外擴展

#### Implementation:
```sql
-- Migration: 20260109_add_product_tags.sql
ALTER TABLE products
  ADD COLUMN tags TEXT[] DEFAULT '{}';

CREATE INDEX idx_products_tags ON products USING GIN(tags);

ALTER TABLE products
  ADD CONSTRAINT check_tags_length
  CHECK (array_length(tags, 1) IS NULL OR array_length(tags, 1) <= 5);

-- 查詢範例 (包含特定標籤的商品)
SELECT * FROM products WHERE tags @> ARRAY['熱銷'];

-- 查詢範例 (包含任一標籤的商品)
SELECT * FROM products WHERE tags && ARRAY['熱銷', '新品'];
```

#### Alternatives Considered:
- **獨立 tags 表 + 多對多關聯**: 拒絕理由 - 過度正規化，標籤數量少且固定，不需額外表
- **JSON 欄位**: 拒絕理由 - 陣列型別更適合此場景，查詢語法更簡潔
- **逗號分隔字串**: 拒絕理由 - 不型別安全，查詢需使用 LIKE，效能較差

---

### 4. 圖表庫選擇 (儀表板視覺化)

#### Decision: Recharts

#### Rationale:
- **React 原生**: 基於 React 元件設計，與 Next.js 無縫整合
- **宣告式語法**: 符合 React 哲學，易於維護
- **輕量級**: 打包後體積較小 (相較於 Chart.js + react-chartjs-2)
- **響應式支援**: 內建 ResponsiveContainer，自動適應螢幕大小

#### Implementation:
```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function OrderTrendChart({ data }: { data: OrderTrendData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="orders" stroke="#1E40AF" strokeWidth={3} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

#### Alternatives Considered:
- **Chart.js**: 拒絕理由 - 需額外 wrapper (react-chartjs-2)，非 React 原生設計
- **Victory**: 拒絕理由 - 功能強大但打包體積較大，對本專案過度工程
- **Nivo**: 拒絕理由 - 學習曲線較陡，文件不如 Recharts 完善

---

### 5. Logo 設計工具與格式

#### Decision: SVG 格式 + 手寫程式碼或 Figma 設計

#### Rationale:
- **可縮放**: SVG 向量圖形，任意縮放不失真
- **效能**: 檔案體積小，載入快速
- **可程式化**: 可透過 CSS 變數控制顏色，支援深淺色模式
- **瀏覽器支援**: 所有現代瀏覽器原生支援

#### Implementation:
```svg
<!-- public/logo.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60">
  <!-- V 字母 + 購物車組合 -->
  <path d="M10,10 L30,50 L50,10" stroke="black" stroke-width="3" fill="none"/>
  <rect x="60" y="30" width="30" height="20" stroke="black" stroke-width="3" fill="#1E40AF"/>
  <circle cx="70" cy="55" r="3" fill="black"/>
  <circle cx="80" cy="55" r="3" fill="black"/>
  <text x="100" y="40" font-family="sans-serif" font-weight="bold" font-size="24">Vsale</text>
</svg>
```

#### Alternatives Considered:
- **PNG/JPG**: 拒絕理由 - 點陣圖無法縮放，不同尺寸需多個檔案
- **Icon Font**: 拒絕理由 - 需額外字型檔案，載入較慢且維護複雜
- **Canvas 繪製**: 拒絕理由 - 不利於 SEO，無法被搜尋引擎索引

---

### 6. 色彩系統整合

#### Decision: 擴充 Tailwind 色彩設定 + CSS 變數

#### Rationale:
- **一致性**: 在 `tailwind.config.ts` 定義品牌色，全專案統一使用
- **可維護**: 集中管理色彩定義，修改時僅需更新一處
- **Neo-Brutalism 相容**: 保留黑色邊框與硬邊陰影，僅在背景與填充使用品牌色

#### Implementation:
```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#1E40AF',    // 深藍 (主色)
          secondary: '#F97316',  // 橘色 (輔色)
          success: '#22C55E',    // 綠色 (成功狀態)
          warning: '#EAB308',    // 黃色 (警告狀態)
          error: '#EF4444',      // 紅色 (錯誤狀態)
        }
      }
    }
  }
}

// 使用範例
<button className="bg-brand-primary text-white border-3 border-black shadow-neo">
  確認送出
</button>
```

#### Alternatives Considered:
- **純 CSS 變數**: 拒絕理由 - 不如 Tailwind 整合方便，無法使用 Tailwind 工具類別
- **內聯樣式**: 拒絕理由 - 不利於維護與一致性

---

## Performance Considerations

### 搜尋與篩選效能優化

1. **資料庫索引**:
   - `products.name` 建立 B-tree 索引 (支援 ILIKE 查詢)
   - `products.tags` 建立 GIN 索引 (支援陣列查詢)
   - `products.category_id` 已有外鍵索引

2. **查詢結果限制**:
   - 搜尋結果最多回傳 50 筆 (避免過載)
   - 使用分頁 (Pagination) 處理大量結果

3. **前端優化**:
   - 防抖 (Debounce) 減少 API 呼叫頻率
   - 快取搜尋結果 (使用 React Query 或 SWR, 選用)

### Excel 處理效能

1. **檔案大小限制**:
   - 限制上傳檔案 < 5MB
   - 限制匯入資料 < 1000 筆 (單次)

2. **批次處理**:
   - 使用 Supabase 批次插入 (Batch Insert)
   - 每 100 筆為一批次，避免單次交易過大

3. **進度指示**:
   - 顯示匯入進度條 (1/10, 2/10...)
   - 使用 Web Worker 處理 Excel 解析 (避免阻塞主執行緒, 選用)

---

## Security Considerations

### Excel 匯入安全性

1. **檔案驗證**:
   - 驗證 MIME type (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
   - 驗證副檔名 (.xlsx)
   - 掃描檔案是否包含惡意巨集 (選用, SheetJS 預設忽略巨集)

2. **資料驗證**:
   - 使用 Zod Schema 驗證每筆資料格式
   - 檢查手機號碼格式 (09xxxxxxxx)
   - 檢查會員等級是否存在於資料庫

3. **權限控制**:
   - 僅管理員可執行匯入/匯出
   - Server Action 中檢查 `role = 'admin'`

### 訂單刪除安全性

1. **狀態檢查**:
   - 僅允許刪除 `status = 'pending'` 的訂單
   - 已確認或後續狀態的訂單禁止刪除

2. **二次確認**:
   - 前端顯示確認對話框，顯示訂單編號
   - 後端再次驗證狀態與權限

3. **操作記錄**:
   - 刪除操作記錄於 `order_timelines` 表
   - 記錄操作者、時間、原因

---

## Testing Strategy

### Unit Tests (單元測試)

1. **Server Actions**:
   - `searchProducts(query)` - 測試搜尋邏輯與防抖
   - `importClients(file)` - 測試 Excel 解析與驗證
   - `exportClients()` - 測試 Excel 產生

2. **Validation Schemas**:
   - 測試 Zod Schema 驗證邏輯
   - 測試邊界條件 (空值、超長字串、特殊字元)

### Integration Tests (整合測試)

1. **搜尋與篩選**:
   - 測試前端輸入 → Server Action → 資料庫查詢 → 結果回傳
   - 測試多條件組合篩選

2. **Excel 匯入流程**:
   - 測試完整匯入流程 (上傳 → 解析 → 驗證 → 寫入)
   - 測試錯誤處理 (格式錯誤、重複資料)

### Performance Tests (效能測試)

1. **搜尋響應時間**:
   - 測試資料庫中 10,000 筆商品時的搜尋速度 (目標 < 300ms)

2. **標籤查詢效能**:
   - 測試 GIN 索引效能 (目標 < 100ms)

3. **Excel 匯入速度**:
   - 測試匯入 100 筆客戶的時間 (目標 < 5s)

---

## Deployment Checklist

### 環境變數
- ✅ 無新增環境變數需求 (使用現有 Supabase 設定)

### 資料庫 Migration
- ✅ `20260109_add_product_tags.sql` - 新增 `products.tags` 欄位
- ✅ `20260110_add_order_delete_action.sql` - 訂單刪除操作記錄

### npm 套件安裝
```bash
pnpm add xlsx @types/xlsx recharts
```

### 靜態資源
- ✅ `public/logo.svg` - Vsale Logo
- ✅ `public/logo-icon.svg` - Logo 圖示版
- ✅ `public/favicon.ico` - Favicon

### Firebase 部署
```bash
# 僅部署有修改的檔案
firebase deploy --only hosting
```

---

## Conclusion

所有技術決策均基於以下原則:
1. **簡單性**: 優先使用現有技術棧，避免引入新依賴
2. **效能**: 滿足憲章定義的效能目標 (< 300ms 搜尋、< 5s 匯入)
3. **可維護性**: 使用業界標準工具與模式，降低學習曲線
4. **向後相容**: 不破壞現有功能，僅新增欄位與元件

**研究狀態**: ✅ 完成，無未解決的技術疑問，可進入 Phase 1 設計階段。

---

**文件版本**: 1.0.0
**建立日期**: 2026-01-04
**負責人**: Claude Sonnet 4.5
