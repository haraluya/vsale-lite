# Technical Research: 商品系列與等級價格管理

**Feature**: 003-series-and-pricing
**Date**: 2026-01-02
**Status**: Phase 0 Complete

## Research Overview

本功能實作「分類 > 系列 > 產品」三層架構與等級價格機制。由於專案技術棧已明確（Next.js 15 + Supabase + TypeScript），研究重點在於：

1. **PostgreSQL 商品編號自動產生**的最佳實踐（並發安全）
2. **Next.js Server Actions** 的價格查詢優化策略
3. **Supabase RLS** 與 Server Actions 的職責分離模式
4. **Neo-Brutalism UI** 的系列卡片設計模式

---

## Decision 1: PostgreSQL 商品編號自動產生策略

### 決策

使用 **PostgreSQL Function + BEFORE INSERT Trigger** 自動產生商品編號（如 `DRK-0001`），並透過事務鎖定與 UNIQUE 約束確保並發安全性。

### 實作方式

```sql
-- Function: 產生下一個編號
CREATE OR REPLACE FUNCTION generate_product_code(p_series_id UUID)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
AS $$
DECLARE
  v_category_code VARCHAR(10);
  v_max_number INTEGER;
BEGIN
  -- 1. 取得分類代碼（透過 series 關聯）
  SELECT c.code INTO v_category_code
  FROM series s
  INNER JOIN categories c ON s.category_id = c.id
  WHERE s.id = p_series_id;

  -- 2. 查詢該分類下的最大流水號（使用正則提取數字部分）
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(code FROM '\d+') AS INTEGER)),
    0
  ) INTO v_max_number
  FROM products p
  INNER JOIN series s ON p.series_id = s.id
  INNER JOIN categories c ON s.category_id = c.id
  WHERE c.code = v_category_code
    AND p.code ~ ('^' || v_category_code || '-\d{4}$');

  -- 3. 產生新編號（分類代碼 + 流水號）
  RETURN v_category_code || '-' || LPAD((v_max_number + 1)::TEXT, 4, '0');
END;
$$;

-- Trigger: 在插入前自動產生編號
CREATE TRIGGER trigger_auto_generate_product_code
  BEFORE INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_product_code();
```

### 並發安全性

- PostgreSQL 事務隔離等級預設為 `READ COMMITTED`，足以處理此情況
- `UNIQUE(code)` 約束確保即使並發產生相同編號，資料庫會拒絕重複
- 錯誤處理：Server Action 捕捉 UNIQUE 違反錯誤，重試最多 3 次

### 替代方案（已拒絕）

| 方案 | 拒絕理由 |
|------|---------|
| UUID 作為編號 | 不符合業務需求（需要可讀的分類代碼前綴） |
| 前端產生編號 | 無法保證唯一性，並發風險高 |
| Sequence per Category | 需要動態建立 Sequence，管理複雜 |

---

## Decision 2: 前台價格查詢優化策略

### 決策

使用 **Server Action 批量查詢 + 記憶體快取** 策略，一次 JOIN 查詢取得系列下所有商品的價格，避免 N+1 查詢問題。

### 實作邏輯

```typescript
// lib/actions/shop.ts
export async function getSeriesProductsWithPrice(series_id: string) {
  const supabase = await createClient()
  const user = await checkAuth() // 取得當前用戶與 tier_id

  // 一次查詢取得所有商品與價格（LEFT JOIN tier_prices）
  const { data: products } = await supabase
    .from('products')
    .select(`
      *,
      series:series_id(*),
      tier_price:tier_prices!inner(price)
    `)
    .eq('series_id', series_id)
    .eq('tier_prices.tier_id', user.tier_id)
    .eq('status', 'active')

  // 整合價格資料
  return products.map(p => ({
    ...p,
    user_price: p.tier_price?.price || null,
    retail_price: p.retail_price
  }))
}
```

### 效能目標

- 單次查詢時間 < 100ms（p95）
- 支援 50 個商品/系列（合理業務規模）
- 前端快取策略：Next.js `revalidatePath()` 管理快取

### 替代方案（已拒絕）

| 方案 | 拒絕理由 |
|------|---------|
| 逐個查詢商品價格 | N+1 查詢問題，效能極差 |
| 前端過濾價格 | 安全性風險（洩漏其他等級價格） |
| 資料庫 View | 無法動態過濾 tier_id，仍需 WHERE 條件 |

---

## Decision 3: RLS 與 Server Actions 職責分離

### 決策

`tier_prices` 表 RLS 允許所有已認證用戶讀取（`USING (true)`），由 **Server Action 負責過濾 tier_id**，避免前端洩漏其他等級價格。

### 安全性模型

**資料庫層（RLS）**:
```sql
-- tier_prices: 所有已認證用戶可讀（Server Action 會過濾）
CREATE POLICY "Allow authenticated users to read tier_prices"
  ON tier_prices FOR SELECT
  TO authenticated
  USING (true);
```

**應用層（Server Action）**:
```typescript
// 僅查詢當前用戶的 tier_id 價格
.eq('tier_prices.tier_id', user.tier_id)
```

### 理由

- RLS 策略若限制 `tier_id = auth.uid()`，需要額外的 `profiles` JOIN，查詢複雜度增加
- Server Action 已包含 `checkAuth()`，可直接取得 `tier_id` 並過濾
- 前端無法直接呼叫 Supabase Client（憲章 IV 規定），安全性由 Server Action 保障

### 替代方案（已拒絕）

| 方案 | 拒絕理由 |
|------|---------|
| RLS 過濾 tier_id | 需要 JOIN profiles，查詢效能下降 |
| 前端過濾 | 違反憲章 IV，安全性風險 |

---

## Decision 4: Neo-Brutalism 系列卡片設計模式

### 決策

系列卡片使用 **垂直卡片 + 大觸控熱區** 設計，圖片比例 16:9，點擊整個卡片進入系列詳情頁。

### 設計規格

```tsx
// components/shop/SeriesCard.tsx
<div className="
  rounded-none
  border-3 border-black
  bg-white
  shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
  hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none
  transition-all duration-150
  cursor-pointer
  min-h-[200px]
">
  <img className="w-full aspect-video object-cover border-b-3 border-black" />
  <div className="p-4">
    <h3 className="text-xl font-bold">{series.name}</h3>
    <p className="text-sm text-gray-600 mt-2">{series.description}</p>
  </div>
</div>
```

### 行動優化

- 最小觸控熱區：48x48px（Apple HIG / Material Design 標準）
- 卡片間距：16px（手指寬度）
- 字體大小：標題 20px（1.25rem），描述 14px（0.875rem）

### 替代方案（已拒絕）

| 方案 | 拒絕理由 |
|------|---------|
| 水平滑動卡片 | 不符合 Neo-Brutalism 風格，且滑動操作不直覺 |
| 網格佈局（2 列） | 卡片過小，觸控熱區不足 |

---

## Decision 5: 商品遷移系列後的編號處理

### 決策

商品從「系列 A」遷移到「系列 B」時，**編號不變**（保持原有編號如 `DRK-0001`），即使新系列屬於不同分類（如 `SNK`）。

### 理由

- 商品編號是商品的唯一識別碼，變更會導致歷史訂單關聯錯誤
- 業務上商品遷移系列是少見操作（通常是建立新商品）
- 若需要新編號，應該建立新商品並停用舊商品

### 實作方式

- 商品編號在 **INSERT 時產生**，UPDATE 時不觸發 Trigger
- 編號欄位在前台與後台均為 **唯讀**（disabled input）

### 替代方案（已拒絕）

| 方案 | 拒絕理由 |
|------|---------|
| 遷移時重新產生編號 | 破壞歷史訂單關聯，違反資料一致性 |
| 允許手動修改編號 | 可能導致重複或格式錯誤 |

---

## Best Practices Summary

### PostgreSQL

1. ✅ 使用 Function + Trigger 自動產生編號，確保一致性
2. ✅ UNIQUE 約束作為最後防線，防止並發重複
3. ✅ 使用 REGEX 提取流水號，支援格式驗證

### Next.js Server Actions

1. ✅ 批量查詢避免 N+1 問題
2. ✅ Server Action 負責權限過濾（tier_id）
3. ✅ 使用 `revalidatePath()` 管理快取

### Supabase RLS

1. ✅ RLS 負責基本權限（authenticated vs admin）
2. ✅ Server Action 負責細粒度過濾（tier_id, status）
3. ✅ JOIN 查詢優化（避免多次查詢）

### UI/UX

1. ✅ Neo-Brutalism 風格一致性（黑邊框、硬邊陰影）
2. ✅ 行動優化（大觸控熱區、清晰字體）
3. ✅ 價格顯示清晰（原價 vs 用戶價格）

---

## Risks & Mitigations

| 風險 | 緩解措施 | 狀態 |
|------|---------|------|
| 商品編號並發重複 | UNIQUE 約束 + 重試機制 | ✅ 已規劃 |
| 價格查詢效能問題 | 批量查詢 + 索引優化 | ✅ 已規劃 |
| RLS 權限洩漏 | Server Action 明確過濾 tier_id | ✅ 已規劃 |
| 資料遷移商品遺失 | 備份 + 測試環境驗證 | ✅ 已規劃 |

---

## Phase 0 Complete

**所有技術決策已完成**，無 NEEDS CLARIFICATION 項目。可進入 Phase 1 設計階段。
