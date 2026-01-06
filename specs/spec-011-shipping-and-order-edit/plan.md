# Feature 011: 實作計畫 - 運費設定與訂單修改

**專案**: Vsale-lite
**功能**: 運費設定與訂單修改系統
**建立日期**: 2026-01-06
**預估工作量**: 15-16 小時

---

## 摘要 (Summary)

本功能擴展現有訂單系統（Feature 004），新增運費設定與訂單修改能力。核心目標為：
1. **運費自動化**：依會員等級自動計算運費，支援滿額免運機制
2. **訂單修改彈性**：管理員可修改待確認訂單的商品、價格、運費，完整記錄修改歷程
3. **流程簡化**：移除 `confirmed` 狀態，將庫存扣減時機移至出貨階段（pending → shipping → completed）

**關鍵技術決策**：
- 使用 PostgreSQL Functions 確保批次修改的原子性（Transaction）
- JSONB 欄位儲存修改歷程，靈活記錄各種變更類型
- 優惠券與運費分離驗證（免運門檻依原始商品金額，不含折扣）

**影響範圍**：
- 資料庫：新增 3 個欄位、1 個新表（order_custom_fees）、3 個 PostgreSQL Functions
- 後端：擴展 2 個 Server Actions（orders.ts, tiers.ts），新增 1 個工具檔案（shipping-calculator.ts）
- 前端：新增 5 個 UI 元件，擴展 2 個管理頁面

---

## 一、開發策略

### 1.1 實作原則

1. **分階段交付**：將功能拆分為獨立的 Phase，每個 Phase 可獨立測試與部署
2. **向下相容優先**：確保新功能不破壞現有訂單資料（舊訂單 shipping_fee 預設為 0）
3. **安全第一**：使用 PostgreSQL Transaction 確保批次修改的原子性，完整測試後再部署
4. **使用者體驗**：直覺的編輯介面（一次性提交所有修改）、清晰的修改歷程顯示（結構化 JSONB）

### 1.2 技術策略

- **Migration 流程**：嚴格遵守[資料庫安全協議](../../docs/DATABASE_SAFETY_PROTOCOL.md)
- **測試策略**：本地環境完整測試 → 部署到生產環境
- **Rollback 準備**：每個 Phase 都有回滾 SQL（若部署失敗）
- **優惠券互動**：訂單修改時驗證優惠券條件，不符合則提示管理員移除

---

## 二、技術背景 (Technical Context)

### 語言與版本 (Language/Version)
- **語言**: TypeScript 5.7+
- **執行環境**: Node.js v22.x LTS (Iron)

### 主要依賴 (Primary Dependencies)
- **前端框架**: Next.js 15.1+ (App Router)
- **UI 函式庫**: React 19.x
- **資料庫 SDK**: @supabase/supabase-js v2.47+, @supabase/ssr v0.5+
- **狀態管理**: Zustand 5.0+ (購物車)
- **驗證函式庫**: Zod 3.24+
- **樣式系統**: Tailwind CSS v4.0

### 儲存系統 (Storage)
- **資料庫**: Supabase (PostgreSQL 15+)
- **認證**: Supabase Auth
- **檔案儲存**: Supabase Storage (商品圖片)

### 測試框架 (Testing)
- **測試框架**: Vitest
- **元件測試**: React Testing Library
- **測試環境**: jsdom

### 目標平台 (Target Platform)
- **部署平台**: Firebase App Hosting
- **區域**: asia-east1 (Taiwan)
- **瀏覽器**: Chrome/Edge/Safari 最新版本（客戶端優化行動裝置）

### 專案類型 (Project Type)
Web application（B2B 批發訂貨系統）

### 效能目標 (Performance Goals)
- 運費計算響應時間 < 200ms
- 訂單修改儲存響應時間 < 1s（含 Transaction 提交）
- 修改歷程查詢響應時間 < 300ms
- 訂單列表載入時間 < 500ms（50 筆訂單）

### 限制條件 (Constraints)
- **向下相容性**：必須支援現有訂單資料（舊訂單沒有 shipping_fee 欄位，預設為 0）
- **狀態移除**：移除 `confirmed` 狀態需完整 Migration，包含現有訂單狀態轉換
- **原子性要求**：訂單批次修改必須使用 PostgreSQL Transaction，確保全部成功或全部失敗
- **優惠券驗證**：訂單修改後若不符合優惠券條件，需提示管理員並允許移除優惠券
- **RLS 安全**：所有資料表必須啟用 RLS，確保客戶僅能查看自己的訂單

### 規模與範圍 (Scale/Scope)
- **資料庫變更**：
  - 新增 3 個欄位（tiers.shipping_fee, tiers.free_shipping_threshold, orders.shipping_fee）
  - 新增 1 個資料表（order_custom_fees）
  - 擴展 1 個欄位（order_timelines.modifications: JSONB）
  - 新增 3 個 PostgreSQL Functions（calculate_shipping_fee, mark_order_as_shipping, update_order_with_modifications）
- **後端變更**：
  - 擴展 2 個 Server Actions 檔案（lib/actions/orders.ts, lib/actions/tiers.ts）
  - 新增 1 個工具檔案（lib/utils/shipping-calculator.ts）
  - 擴展 1 個驗證 Schema（lib/validations/order.schema.ts）
- **前端變更**：
  - 新增 5 個 UI 元件（OrderEditor, OrderModificationTimeline, OrderCustomFees, ShippingFeeSettings, ShippingFeePreview）
  - 擴展 2 個管理頁面（app/(admin)/admin/tiers, app/(admin)/admin/orders/[id]）
  - 擴展 1 個購物車元件（components/shop/cart-summary.tsx）

---

## 三、憲章遵循檢查 (Constitution Check)

### ✅ 符合憲章原則

| 原則 | 符合狀況 | 說明 |
|------|---------|------|
| **I. 使用者角色優先** | ✅ 完全符合 | 嚴格區分管理員與客戶權限：僅管理員可修改訂單，客戶僅能查看修改歷程 |
| **II. 等級綁定價格** | ✅ 完全符合 | 運費依會員等級設定（tiers.shipping_fee），不同等級看到不同運費 |
| **III. 使用者故事驅動開發** | ✅ 完全符合 | 所有功能基於 6 個使用者故事（US1-US6），每個故事可獨立測試與交付 |
| **IV. API 模組化與職責分離** | ✅ 完全符合 | 所有業務邏輯在 Server Actions 處理，UI 元件僅負責顯示與呼叫 API |
| **V. 設計系統一致性** | ✅ 完全符合 | 遵循 Neo-Brutalism 風格（2-3px 邊框、硬邊陰影、點擊位移效果） |
| **VI. 負庫存支援** | ✅ 不受影響 | 訂單修改不涉及庫存驗證，維持現有負庫存支援機制 |
| **VII. 響應式設計規範** | ✅ 完全符合 | 後台訂單編輯器優化桌面操作，前台運費顯示優化行動裝置 |
| **VIII. 資料庫安全至上** | ✅ 完全符合 | 所有 Migration 遵循安全流程（本機測試 → Migration → 備份 → 部署） |

### 🔍 特別注意事項

1. **狀態流程變更（移除 confirmed）**：
   - **影響範圍**：所有訂單相關 Server Actions、UI 元件、型別定義
   - **緩解措施**：完整回歸測試，確保所有狀態轉換邏輯正確
   - **向下相容**：Migration 自動將現有 `confirmed` 訂單轉為 `shipping`

2. **優惠券與運費互動**：
   - **設計決策**：免運門檻依原始商品金額計算（不含優惠券折扣）
   - **理由**：避免客戶濫用優惠券規避運費（例：使用大額優惠券後低於免運門檻）
   - **實作**：`calculateShippingFee()` 函數接收 `subtotal`（商品原始金額），不考慮優惠券

3. **訂單修改原子性**：
   - **設計決策**：使用單一 PostgreSQL Function `update_order_with_modifications()` 處理所有修改
   - **理由**：確保商品價格、數量、費用、運費修改在同一 Transaction 中完成
   - **失敗處理**：任何步驟失敗自動 ROLLBACK，前端顯示錯誤訊息

---

## 四、專案結構 (Project Structure)

### 資料庫層 (Database)
```
supabase/migrations/
├── 20260106_add_shipping_features.sql        # Migration 1: 運費功能
│   ├── ALTER TABLE tiers (新增 shipping_fee, free_shipping_threshold)
│   ├── ALTER TABLE orders (新增 shipping_fee)
│   ├── CREATE TABLE order_custom_fees
│   └── CREATE FUNCTION calculate_shipping_fee()
├── 20260107_remove_confirmed_status.sql      # Migration 2: 移除 confirmed 狀態
│   ├── UPDATE orders (confirmed → shipping)
│   ├── ALTER TABLE orders (修改 status CHECK 約束)
│   ├── DROP FUNCTION confirm_order_and_deduct_stock()
│   ├── CREATE FUNCTION mark_order_as_shipping()
│   └── CREATE FUNCTION update_order_status()
└── 20260108_extend_order_timelines.sql       # Migration 3: 修改歷程擴展
    ├── ALTER TABLE order_timelines (新增 modifications JSONB)
    ├── ALTER TABLE order_timelines (擴展 action_type CHECK 約束)
    └── CREATE FUNCTION update_order_with_modifications()
```

### 後端層 (Backend)
```
lib/
├── actions/
│   ├── orders.ts                             # 擴展：訂單修改 Server Actions
│   │   ├── createOrder() [修改] - 新增運費計算
│   │   ├── markAsShipping() [新增] - 標記出貨並扣減庫存
│   │   ├── updateOrderDetails() [新增] - 批次修改訂單
│   │   ├── updateOrderStatus() [修改] - 移除 confirmed 相關邏輯
│   │   └── [刪除] confirmOrder() - 由 markAsShipping 取代
│   └── tiers.ts                              # 擴展：運費設定 Server Actions
│       └── updateTier() [修改] - 新增 shipping_fee, free_shipping_threshold
├── validations/
│   └── order.schema.ts                       # 擴展：訂單修改驗證 Schema
│       ├── orderCustomFeeSchema [新增]
│       └── orderModificationsSchema [新增]
└── utils/
    └── shipping-calculator.ts                # 新增：運費計算工具函式
        ├── calculateShippingFee()
        └── validateShippingFee()
```

### 前端層 (Frontend)
```
app/
├── (admin)/admin/
│   ├── tiers/page.tsx                        # 擴展：新增運費設定區塊
│   └── orders/
│       └── [id]/page.tsx                     # 擴展：新增編輯模式與修改歷程顯示
└── (shop)/
    └── cart/page.tsx                         # 擴展：新增運費預覽

components/
├── admin/
│   ├── tiers/
│   │   └── shipping-fee-settings.tsx        # 新增：運費設定元件
│   └── orders/
│       ├── order-editor.tsx                  # 新增：訂單編輯器（核心）
│       ├── order-modification-timeline.tsx   # 新增：修改歷程顯示器
│       ├── order-custom-fees.tsx             # 新增：自訂費用元件
│       └── order-actions.tsx                 # 修改：移除 confirmOrder，新增 markAsShipping
└── shop/
    └── cart/
        └── shipping-fee-preview.tsx          # 新增：運費預覽元件

types/
└── index.ts                                  # 擴展：新增 OrderCustomFee, OrderModifications 型別
```

---

## 五、錯誤處理規範 (Error Handling Standards)

### 5.1 錯誤訊息設計原則

**核心原則**:
- ✅ 使用繁體中文，避免技術術語
- ✅ 明確說明「發生什麼問題」+「如何解決」
- ✅ 避免暴露系統內部資訊（如 SQL 錯誤、堆疊追蹤）
- ✅ 提供可操作的下一步建議

### 5.2 錯誤訊息範本

#### A. 表單驗證錯誤

**情境**: 使用者輸入不符合格式要求

```typescript
// ❌ 不良範例
"Invalid input"
"Field is required"

// ✅ 良好範例
"運費金額不可為負數，請輸入 0 或正數"
"免運門檻必須大於 0，請輸入有效金額"
"等級名稱不可為空，請輸入等級名稱"
```

#### B. 權限錯誤

**情境**: 使用者嘗試執行無權限的操作

```typescript
// ❌ 不良範例
"Access denied"
"Unauthorized"

// ✅ 良好範例
"您沒有權限修改訂單，請聯絡管理員"
"此操作僅限管理員使用"
```

#### C. 狀態錯誤

**情境**: 訂單狀態不允許執行某操作

```typescript
// ❌ 不良範例
"Invalid state transition"
"Operation not allowed"

// ✅ 良好範例
"僅待確認訂單可修改，此訂單已出貨無法編輯"
"訂單已完成，無法取消"
"僅出貨中訂單可標記為已完成"
```

#### D. 資料不存在錯誤

**情境**: 使用者查詢的資料不存在

```typescript
// ❌ 不良範例
"Not found"
"Record does not exist"

// ✅ 良好範例
"找不到此訂單，請確認訂單編號是否正確"
"此商品不存在或已被刪除"
```

#### E. 業務邏輯錯誤

**情境**: 違反業務規則

```typescript
// ❌ 不良範例
"Validation failed"
"Business rule violation"

// ✅ 良好範例
"訂單修改後商品金額 (NT$800) 不符合優惠券條件 (需滿 NT$1000)"
"訂單至少需保留一個商品，無法全部移除"
"運費不可為負數"
```

#### F. 系統錯誤

**情境**: 伺服器內部錯誤或意外錯誤

```typescript
// ❌ 不良範例
"Internal server error"
"Database connection failed"

// ✅ 良好範例
"系統處理失敗，請稍後再試或聯絡客服"
"訂單修改失敗，請重新嘗試"
"資料儲存失敗，請檢查網路連線後重試"
```

### 5.3 錯誤訊息結構

**標準格式**:
```typescript
interface ErrorMessage {
  // 簡短摘要（顯示在 alert 或 toast）
  message: string;

  // 詳細說明（可選，顯示在錯誤頁面）
  detail?: string;

  // 錯誤代碼（用於日誌追蹤）
  code?: string;

  // 建議操作（可選）
  suggestion?: string;
}
```

**範例**:
```typescript
{
  message: "訂單修改失敗",
  detail: "訂單修改後商品金額 (NT$800) 不符合優惠券條件 (需滿 NT$1000)",
  code: "COUPON_MIN_AMOUNT_NOT_MET",
  suggestion: "您可以選擇移除優惠券並繼續修改，或增加商品金額至 1000 元"
}
```

### 5.4 前端顯示規範

**Toast 通知** (成功/一般錯誤):
- 簡短訊息（< 50 字）
- 顯示 3-5 秒後自動消失
- 使用色彩區分（綠色=成功、紅色=錯誤、黃色=警告）

**Modal 彈窗** (需使用者確認的錯誤):
- 完整錯誤訊息 + 詳細說明
- 提供明確的操作按鈕（「確定」、「取消」、「重試」）
- 使用 Neo-Brutalism 風格（2-3px 黑邊框）

**Inline 驗證** (表單欄位錯誤):
- 即時顯示於欄位下方
- 紅色文字 + 驚嘆號圖示
- 不等到提交才顯示錯誤

### 5.5 實作檢查清單

**Server Actions 錯誤處理**:
- [ ] 所有 Server Actions 回傳 `ActionResult<T>`
- [ ] 使用 Zod 驗證輸入，將 `ZodError` 轉換為友善訊息
- [ ] 捕捉 PostgreSQL 錯誤，轉換為使用者可理解的訊息
- [ ] 記錄詳細錯誤至 `console.error`（含堆疊追蹤）

**UI 元件錯誤處理**:
- [ ] 所有表單驗證使用即時反饋
- [ ] 所有 API 呼叫包含 Loading 與 Error 狀態
- [ ] 錯誤訊息遵循設計系統（Neo-Brutalism 風格）
- [ ] 提供「重試」或「返回」操作

### 5.6 錯誤日誌記錄

**日誌等級**:
- `ERROR`: 系統錯誤、資料庫錯誤、意外例外
- `WARN`: 業務邏輯錯誤、驗證失敗
- `INFO`: 正常操作記錄（訂單建立、狀態變更）

**記錄內容**:
```typescript
console.error('[訂單修改失敗]', {
  orderId: 'order-123',
  error: error.message,
  stack: error.stack, // 僅開發環境
  userId: user.id,
  timestamp: new Date().toISOString(),
});
```

---

## 六、Phase 劃分

### Phase 0: 準備工作（Setup）
**目標**: 環境準備與依賴檢查
**工作量**: 0.5 小時

#### 任務清單
- [ ] 確認本地 Supabase 正常運行（`supabase start`）
- [ ] 檢查現有訂單資料（確認是否有 `confirmed` 狀態訂單）
- [ ] 備份生產環境資料庫（`pg_dump`）
- [ ] 建立 Feature Branch: `feature/011-shipping-and-order-edit`

---

### Phase 1: 運費設定基礎建設
**目標**: 新增運費相關資料表欄位與函數
**工作量**: 2 小時

#### 1.1 資料庫 Migration

**檔案**: `supabase/migrations/20260106_add_shipping_features.sql`

```sql
-- 1. 擴展 tiers 表
ALTER TABLE tiers ADD COLUMN IF NOT EXISTS shipping_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE tiers ADD COLUMN IF NOT EXISTS free_shipping_threshold DECIMAL(10,2);

ALTER TABLE tiers ADD CONSTRAINT check_shipping_fee_non_negative
  CHECK (shipping_fee >= 0);
ALTER TABLE tiers ADD CONSTRAINT check_free_shipping_threshold_positive
  CHECK (free_shipping_threshold IS NULL OR free_shipping_threshold > 0);

-- 2. 擴展 orders 表
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_fee DECIMAL(10,2) DEFAULT 0;

ALTER TABLE orders ADD CONSTRAINT check_orders_shipping_fee_non_negative
  CHECK (shipping_fee >= 0);

-- 3. 新增 order_custom_fees 表
CREATE TABLE IF NOT EXISTS order_custom_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  fee_name VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  CONSTRAINT check_fee_name_not_empty CHECK (TRIM(fee_name) <> '')
);

CREATE INDEX IF NOT EXISTS idx_order_custom_fees_order_id ON order_custom_fees(order_id);
CREATE INDEX IF NOT EXISTS idx_order_custom_fees_created_by ON order_custom_fees(created_by);

-- 4. 啟用 RLS
ALTER TABLE order_custom_fees ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Users can view their order custom fees"
  ON order_custom_fees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_custom_fees.order_id
        AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all order custom fees"
  ON order_custom_fees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 6. 運費計算函數
CREATE OR REPLACE FUNCTION calculate_shipping_fee(
  p_user_id UUID,
  p_subtotal DECIMAL
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
AS $$
DECLARE
  v_tier_id UUID;
  v_shipping_fee DECIMAL(10,2);
  v_free_threshold DECIMAL(10,2);
BEGIN
  SELECT t.id, t.shipping_fee, t.free_shipping_threshold
  INTO v_tier_id, v_shipping_fee, v_free_threshold
  FROM profiles p
  JOIN tiers t ON t.id = p.tier_id
  WHERE p.id = p_user_id;

  IF v_tier_id IS NULL THEN
    RETURN 0;
  END IF;

  IF v_shipping_fee = 0 THEN
    RETURN 0;
  END IF;

  IF v_free_threshold IS NOT NULL AND p_subtotal >= v_free_threshold THEN
    RETURN 0;
  END IF;

  RETURN v_shipping_fee;
END;
$$;
```

#### 1.2 TypeScript 型別定義

**檔案**: `types/index.ts`

```typescript
// 擴展 Tier 型別
export interface Tier {
  id: string;
  name: string;
  rank: number;
  shipping_fee?: number;  // 新增
  free_shipping_threshold?: number;  // 新增
  created_at: string;
  updated_at: string;
}

// 新增 OrderCustomFee 型別
export interface OrderCustomFee {
  id: string;
  order_id: string;
  fee_name: string;
  amount: number;
  created_at: string;
  created_by?: string;
}

// 擴展 Order 型別
export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  total_amount: number;
  shipping_fee?: number;  // 新增
  status: OrderStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}
```

#### 1.3 Zod Schema 驗證

**檔案**: `lib/validations/tier.schema.ts`

```typescript
export const updateTierSchema = z.object({
  name: z.string().min(1, '等級名稱不可為空'),
  rank: z.number().int().positive('排序必須為正整數'),
  shipping_fee: z.number().min(0, '運費不可為負數').optional(),
  free_shipping_threshold: z.number().positive('免運門檻必須為正數').nullable().optional(),
});
```

**檔案**: `lib/validations/order.schema.ts`

```typescript
export const orderCustomFeeSchema = z.object({
  fee_name: z.string().min(1, '費用名稱不可為空').max(100),
  amount: z.number(),  // 允許負數（減免）
});
```

#### 測試驗收
- [ ] Migration 成功執行（本地環境）
- [ ] `tiers` 表新增欄位正確
- [ ] `orders` 表新增欄位正確
- [ ] `order_custom_fees` 表建立成功
- [ ] RLS Policy 測試通過
- [ ] `calculate_shipping_fee()` 函數測試通過

---

### Phase 2: 會員等級運費設定 UI
**目標**: 管理員可設定會員等級的運費規則
**工作量**: 1.5 小時

#### 2.1 Server Actions

**檔案**: `lib/actions/tiers.ts`（修改現有）

```typescript
export async function updateTier(
  tierId: string,
  data: z.infer<typeof updateTierSchema>
): Promise<ActionResult<Tier>> {
  try {
    const supabase = await createClient();
    const { user } = await checkAuth();

    if (!user) {
      return { success: false, message: '請先登入' };
    }

    // 權限檢查（僅管理員）
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return { success: false, message: '權限不足' };
    }

    // 驗證輸入
    const validated = updateTierSchema.parse(data);

    // 更新等級
    const { data: tier, error } = await supabase
      .from('tiers')
      .update({
        name: validated.name,
        rank: validated.rank,
        shipping_fee: validated.shipping_fee ?? 0,
        free_shipping_threshold: validated.free_shipping_threshold,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tierId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/admin/tiers');
    return { success: true, data: tier };
  } catch (error) {
    console.error('更新等級失敗:', error);
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.flatten().fieldErrors };
    }
    return { success: false, message: '更新等級失敗' };
  }
}
```

#### 2.2 UI 元件

**檔案**: `components/admin/tiers/tier-form.tsx`（修改現有）

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { updateTier } from '@/lib/actions/tiers';
import type { Tier } from '@/types';

interface TierFormProps {
  tier?: Tier;
  mode: 'create' | 'edit';
}

export function TierForm({ tier, mode }: TierFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // 表單狀態
  const [name, setName] = useState(tier?.name ?? '');
  const [rank, setRank] = useState(tier?.rank ?? 1);
  const [enableShipping, setEnableShipping] = useState(
    tier ? (tier.shipping_fee ?? 0) > 0 : false
  );
  const [shippingFee, setShippingFee] = useState(tier?.shipping_fee ?? 100);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(
    tier?.free_shipping_threshold ?? 1000
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await updateTier(tier!.id, {
        name,
        rank,
        shipping_fee: enableShipping ? shippingFee : 0,
        free_shipping_threshold: enableShipping ? freeShippingThreshold : null,
      });

      if (result.success) {
        router.push('/admin/tiers');
        router.refresh();
      } else {
        alert(result.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 現有欄位：等級名稱、排序 */}
      <div>
        <Label htmlFor="name">等級名稱</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="rank">排序順序</Label>
        <Input
          id="rank"
          type="number"
          value={rank}
          onChange={(e) => setRank(Number(e.target.value))}
          required
        />
      </div>

      {/* 新增：運費設定 */}
      <div className="border-2 border-black p-4 space-y-4">
        <h3 className="font-bold text-lg">運費設定</h3>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="enableShipping"
            checked={enableShipping}
            onCheckedChange={(checked) => setEnableShipping(checked === true)}
          />
          <Label htmlFor="enableShipping">收取運費</Label>
        </div>

        {enableShipping && (
          <>
            <div>
              <Label htmlFor="shippingFee">基本運費 (元)</Label>
              <Input
                id="shippingFee"
                type="number"
                min="0"
                step="0.01"
                value={shippingFee}
                onChange={(e) => setShippingFee(Number(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="freeShippingThreshold">
                滿額免運門檻 (元，留空表示不提供免運)
              </Label>
              <Input
                id="freeShippingThreshold"
                type="number"
                min="0"
                step="0.01"
                value={freeShippingThreshold}
                onChange={(e) => setFreeShippingThreshold(Number(e.target.value))}
              />
              <p className="text-sm text-gray-600 mt-1">
                例：設定 1000，表示商品金額滿 1000 元免運
              </p>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          取消
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? '儲存中...' : '儲存'}
        </Button>
      </div>
    </form>
  );
}
```

#### 測試驗收
- [ ] 會員等級編輯頁面顯示運費設定區塊
- [ ] 勾選「收取運費」後顯示相關欄位
- [ ] 儲存後運費設定正確寫入資料庫
- [ ] 取消勾選「收取運費」後運費設為 0

---

### Phase 3: 訂單建立時計算運費
**目標**: 客戶結帳時自動計算運費並顯示
**工作量**: 2 小時

#### 3.1 Server Actions

**檔案**: `lib/actions/orders.ts`（修改現有 `createOrder`）

```typescript
export async function createOrder(
  items: CartItem[],
  userCouponId?: string,
  notes?: string
): Promise<ActionResult<Order>> {
  try {
    const supabase = await createClient();
    const { user } = await checkAuth();

    if (!user) {
      return { success: false, message: '請先登入' };
    }

    // 1. 計算商品總額（現有邏輯）
    let totalAmount = 0;
    // ... 現有商品金額計算邏輯 ...

    // 2. 計算優惠券折扣（現有邏輯）
    let couponDiscount = 0;
    // ... 現有優惠券計算邏輯 ...

    // 3. 計算運費（新增）
    const { data: shippingFeeData } = await supabase.rpc('calculate_shipping_fee', {
      p_user_id: user.id,
      p_subtotal: totalAmount,  // 依原始商品金額計算
    });

    const shippingFee = shippingFeeData ?? 0;

    // 4. 計算最終總額
    const finalTotalAmount = totalAmount - couponDiscount + shippingFee;

    // 5. 建立訂單（新增 shipping_fee 欄位）
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        total_amount: finalTotalAmount,
        shipping_fee: shippingFee,  // 新增
        notes: notes || null,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 6. 建立訂單明細（現有邏輯）
    // ...

    // 7. 建立優惠券快照（現有邏輯）
    // ...

    // 8. 記錄操作歷史（現有邏輯）
    // ...

    revalidatePath('/store/orders');
    return { success: true, data: order };
  } catch (error) {
    console.error('建立訂單失敗:', error);
    return { success: false, message: '建立訂單失敗' };
  }
}
```

#### 3.2 購物車摘要元件

**檔案**: `components/shop/cart-summary.tsx`（修改現有）

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useCartStore } from '@/stores/cart';
import { createClient } from '@/lib/supabase/client';

export function CartSummary() {
  const { items, appliedCoupon, couponDiscount } = useCartStore();
  const [shippingFee, setShippingFee] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // 計算商品總額
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);

  // 計算運費
  useEffect(() => {
    async function fetchShippingFee() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setShippingFee(0);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc('calculate_shipping_fee', {
        p_user_id: user.id,
        p_subtotal: subtotal,
      });

      if (error) {
        console.error('計算運費失敗:', error);
        setShippingFee(0);
      } else {
        setShippingFee(data ?? 0);
      }

      setLoading(false);
    }

    fetchShippingFee();
  }, [subtotal]);

  // 計算最終總額
  const total = subtotal - couponDiscount + (shippingFee ?? 0);

  return (
    <div className="border-2 border-black p-4 space-y-2">
      <h3 className="font-bold text-lg">訂單摘要</h3>

      <div className="flex justify-between">
        <span>商品金額</span>
        <span>NT${subtotal.toFixed(0)}</span>
      </div>

      {appliedCoupon && (
        <div className="flex justify-between text-red-600">
          <span>優惠券折扣 ({appliedCoupon.code})</span>
          <span>-NT${couponDiscount.toFixed(0)}</span>
        </div>
      )}

      <div className="flex justify-between">
        <span>運費</span>
        {loading ? (
          <span className="text-gray-400">計算中...</span>
        ) : shippingFee === 0 ? (
          <span className="text-green-600 font-bold">免運</span>
        ) : (
          <span>NT${shippingFee.toFixed(0)}</span>
        )}
      </div>

      <div className="border-t-2 border-black pt-2 flex justify-between font-bold text-lg">
        <span>訂單總額</span>
        <span>NT${total.toFixed(0)}</span>
      </div>
    </div>
  );
}
```

#### 測試驗收
- [ ] 購物車摘要顯示運費金額
- [ ] 零售客戶（收運費）顯示正確運費
- [ ] 批發客戶（免運）顯示「免運」
- [ ] 商品金額達到免運門檻時顯示「免運」
- [ ] 訂單建立後 `shipping_fee` 欄位正確儲存

---

### Phase 4: 移除 confirmed 狀態
**目標**: 簡化訂單流程，將庫存扣減移至出貨階段
**工作量**: 2.5 小時

#### 4.1 資料庫 Migration

**檔案**: `supabase/migrations/20260107_remove_confirmed_status.sql`

```sql
-- 1. 更新現有訂單狀態
UPDATE orders SET status = 'shipping' WHERE status = 'confirmed';

-- 2. 修改 CHECK 約束
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'shipping', 'completed', 'cancelled'));

-- 3. 刪除舊函數
DROP FUNCTION IF EXISTS confirm_order_and_deduct_stock(UUID);
DROP FUNCTION IF EXISTS update_order_status(UUID, TEXT, UUID);

-- 4. 新增 mark_order_as_shipping 函數
CREATE OR REPLACE FUNCTION mark_order_as_shipping(
  p_order_id UUID,
  p_actor_id UUID
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_status TEXT;
  v_item RECORD;
BEGIN
  -- 檢查訂單狀態
  SELECT status INTO v_current_status FROM orders WHERE id = p_order_id FOR UPDATE;

  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT FALSE, '訂單不存在';
    RETURN;
  END IF;

  IF v_current_status <> 'pending' THEN
    RETURN QUERY SELECT FALSE, '僅待確認訂單可標記出貨';
    RETURN;
  END IF;

  -- 扣減庫存
  FOR v_item IN
    SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id
  LOOP
    UPDATE products SET stock = stock - v_item.quantity WHERE id = v_item.product_id;
  END LOOP;

  -- 更新訂單狀態
  UPDATE orders SET status = 'shipping', updated_at = NOW() WHERE id = p_order_id;

  -- 記錄操作歷史
  INSERT INTO order_timelines (order_id, action_type, actor_id, actor_role, old_status, new_status)
  VALUES (p_order_id, 'status_changed', p_actor_id, 'admin', 'pending', 'shipping');

  RETURN QUERY SELECT TRUE, '訂單已標記為出貨中，庫存已扣減';
END;
$$;

-- 5. 新增 update_order_status 函數（簡化版）
CREATE OR REPLACE FUNCTION update_order_status(
  p_order_id UUID,
  p_new_status TEXT,
  p_actor_id UUID
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_status TEXT;
BEGIN
  -- 檢查訂單
  SELECT status INTO v_old_status FROM orders WHERE id = p_order_id FOR UPDATE;

  IF v_old_status IS NULL THEN
    RETURN QUERY SELECT FALSE, '訂單不存在';
    RETURN;
  END IF;

  -- 驗證狀態流程
  IF v_old_status = 'shipping' AND p_new_status = 'completed' THEN
    -- 允許：shipping → completed
  ELSIF v_old_status = 'pending' AND p_new_status = 'cancelled' THEN
    -- 允許：pending → cancelled
  ELSIF v_old_status = 'shipping' AND p_new_status = 'cancelled' THEN
    -- 允許：shipping → cancelled（但需回補庫存）
    DECLARE
      v_item RECORD;
    BEGIN
      FOR v_item IN
        SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id
      LOOP
        UPDATE products SET stock = stock + v_item.quantity WHERE id = v_item.product_id;
      END LOOP;
    END;
  ELSE
    RETURN QUERY SELECT FALSE, '不允許的狀態轉換';
    RETURN;
  END IF;

  -- 更新狀態
  UPDATE orders SET status = p_new_status, updated_at = NOW() WHERE id = p_order_id;

  -- 記錄歷史
  INSERT INTO order_timelines (order_id, action_type, actor_id, actor_role, old_status, new_status)
  VALUES (p_order_id, 'status_changed', p_actor_id, 'admin', v_old_status, p_new_status);

  RETURN QUERY SELECT TRUE, '訂單狀態已更新';
END;
$$;
```

#### 4.2 TypeScript 型別更新

**檔案**: `types/index.ts`

```typescript
// 修改 OrderStatus
export type OrderStatus = 'pending' | 'shipping' | 'completed' | 'cancelled';  // 移除 'confirmed'
```

#### 4.3 Server Actions 更新

**檔案**: `lib/actions/orders.ts`

```typescript
// 新增：標記出貨
export async function markAsShipping(orderId: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { user } = await checkAuth();

    if (!user) {
      return { success: false, message: '請先登入' };
    }

    // 權限檢查
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return { success: false, message: '權限不足' };
    }

    // 呼叫 PostgreSQL Function
    const { data, error } = await supabase.rpc('mark_order_as_shipping', {
      p_order_id: orderId,
      p_actor_id: user.id,
    });

    if (error) throw error;

    const result = data[0];
    if (!result.success) {
      return { success: false, message: result.message };
    }

    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true, message: result.message };
  } catch (error) {
    console.error('標記出貨失敗:', error);
    return { success: false, message: '標記出貨失敗' };
  }
}

// 修改：更新訂單狀態（移除 confirmed 相關邏輯）
export async function updateOrderStatus(
  orderId: string,
  newStatus: 'shipping' | 'completed' | 'cancelled'  // 移除 'confirmed'
): Promise<ActionResult<void>> {
  // ... 實作同上 ...
}

// 刪除：confirmOrder（已由 markAsShipping 取代）
// export async function confirmOrder(...) { ... }  ← 移除此函數
```

#### 4.4 UI 元件更新

**檔案**: `components/admin/order-actions.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { markAsShipping, updateOrderStatus, cancelOrder } from '@/lib/actions/orders';
import type { OrderStatus } from '@/types';

interface OrderActionsProps {
  orderId: string;
  currentStatus: OrderStatus;
}

export function OrderActions({ orderId, currentStatus }: OrderActionsProps) {
  const [loading, setLoading] = useState(false);

  const handleMarkAsShipping = async () => {
    if (!confirm('確認標記為出貨中？（將扣減庫存）')) return;

    setLoading(true);
    const result = await markAsShipping(orderId);
    setLoading(false);

    if (result.success) {
      alert('訂單已標記為出貨中');
      window.location.reload();
    } else {
      alert(result.message);
    }
  };

  const handleUpdateStatus = async (newStatus: 'completed') => {
    setLoading(true);
    const result = await updateOrderStatus(orderId, newStatus);
    setLoading(false);

    if (result.success) {
      alert('訂單狀態已更新');
      window.location.reload();
    } else {
      alert(result.message);
    }
  };

  const handleCancel = async () => {
    const reason = prompt('請輸入取消原因：');
    if (!reason) return;

    setLoading(true);
    const result = await cancelOrder(orderId, reason);
    setLoading(false);

    if (result.success) {
      alert('訂單已取消');
      window.location.reload();
    } else {
      alert(result.message);
    }
  };

  return (
    <div className="flex gap-3">
      {currentStatus === 'pending' && (
        <>
          <Button onClick={handleMarkAsShipping} disabled={loading}>
            標記出貨（扣減庫存）
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={loading}>
            取消訂單
          </Button>
        </>
      )}

      {currentStatus === 'shipping' && (
        <>
          <Button onClick={() => handleUpdateStatus('completed')} disabled={loading}>
            標記為已完成
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={loading}>
            取消訂單（回補庫存）
          </Button>
        </>
      )}
    </div>
  );
}
```

**檔案**: `components/shop/order-status-badge.tsx`

```tsx
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = {
    pending: { label: '待確認', color: 'bg-yellow-500' },
    shipping: { label: '出貨中', color: 'bg-blue-500' },
    completed: { label: '已完成', color: 'bg-green-500' },
    cancelled: { label: '已取消', color: 'bg-gray-500' },
  };

  const { label, color } = config[status];

  return (
    <span className={`px-3 py-1 text-white font-bold ${color}`}>
      {label}
    </span>
  );
}
```

#### 測試驗收
- [ ] Migration 成功執行（現有 `confirmed` 訂單轉為 `shipping`）
- [ ] `markAsShipping()` 函數正確扣減庫存
- [ ] 訂單詳情頁顯示「標記出貨」按鈕（pending 狀態）
- [ ] 狀態更新流程正確（pending → shipping → completed）
- [ ] 取消訂單時正確回補庫存（shipping → cancelled）

---

### Phase 5: 訂單修改核心功能
**目標**: 管理員可修改訂單商品、價格、運費、自訂費用
**工作量**: 3.5 小時

#### 5.1 資料庫擴展

**檔案**: `supabase/migrations/20260108_extend_order_timelines.sql`

```sql
-- 1. 新增 modifications 欄位
ALTER TABLE order_timelines ADD COLUMN IF NOT EXISTS modifications JSONB;

-- 2. 擴展 action_type
ALTER TABLE order_timelines DROP CONSTRAINT IF EXISTS order_timelines_action_type_check;
ALTER TABLE order_timelines ADD CONSTRAINT order_timelines_action_type_check
  CHECK (action_type IN ('created', 'status_changed', 'cancelled', 'comment', 'order_modified'));

-- 3. 新增 JSONB 索引
CREATE INDEX IF NOT EXISTS idx_order_timelines_modifications
  ON order_timelines USING GIN(modifications);

-- 4. 新增批次修改訂單函數
CREATE OR REPLACE FUNCTION update_order_with_modifications(
  p_order_id UUID,
  p_modifications JSONB,
  p_actor_id UUID
)
RETURNS TABLE(success BOOLEAN, message TEXT, new_total DECIMAL)
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_status TEXT;
  v_new_total DECIMAL(10,2);
  v_item JSONB;
  v_fee JSONB;
BEGIN
  -- 檢查訂單狀態
  SELECT status INTO v_current_status FROM orders WHERE id = p_order_id FOR UPDATE;

  IF v_current_status NOT IN ('pending') THEN
    RETURN QUERY SELECT FALSE, '僅待確認訂單可修改', NULL::DECIMAL;
    RETURN;
  END IF;

  -- 處理商品修改
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_modifications->'items')
  LOOP
    CASE v_item->>'type'
      WHEN 'price_changed' THEN
        UPDATE order_items
        SET deal_price = (v_item->>'new_price')::DECIMAL,
            subtotal = (v_item->>'new_price')::DECIMAL * quantity
        WHERE id = (v_item->>'item_id')::UUID;

      WHEN 'quantity_changed' THEN
        UPDATE order_items
        SET quantity = (v_item->>'new_quantity')::INTEGER,
            subtotal = deal_price * (v_item->>'new_quantity')::INTEGER
        WHERE id = (v_item->>'item_id')::UUID;

      WHEN 'removed' THEN
        DELETE FROM order_items WHERE id = (v_item->>'item_id')::UUID;

      WHEN 'added' THEN
        INSERT INTO order_items (order_id, product_id, product_name_snapshot, deal_price, quantity, subtotal)
        VALUES (
          p_order_id,
          (v_item->>'product_id')::UUID,
          v_item->>'product_name',
          (v_item->>'new_price')::DECIMAL,
          (v_item->>'new_quantity')::INTEGER,
          (v_item->>'new_price')::DECIMAL * (v_item->>'new_quantity')::INTEGER
        );
    END CASE;
  END LOOP;

  -- 處理費用修改
  IF p_modifications->'fees' IS NOT NULL THEN
    FOR v_fee IN SELECT * FROM jsonb_array_elements(p_modifications->'fees')
    LOOP
      CASE v_fee->>'type'
        WHEN 'added' THEN
          INSERT INTO order_custom_fees (order_id, fee_name, amount, created_by)
          VALUES (
            p_order_id,
            v_fee->>'fee_name',
            (v_fee->>'amount')::DECIMAL,
            p_actor_id
          );

        WHEN 'removed' THEN
          DELETE FROM order_custom_fees
          WHERE order_id = p_order_id AND fee_name = v_fee->>'fee_name';
      END CASE;
    END LOOP;
  END IF;

  -- 處理運費修改
  IF p_modifications->'shipping' IS NOT NULL THEN
    UPDATE orders
    SET shipping_fee = (p_modifications->'shipping'->>'new_fee')::DECIMAL
    WHERE id = p_order_id;
  END IF;

  -- 重新計算總金額
  SELECT
    COALESCE(SUM(oi.subtotal), 0) - COALESCE(oc.discount_amount, 0) + o.shipping_fee + COALESCE(SUM(ocf.amount), 0)
  INTO v_new_total
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_id = o.id
  LEFT JOIN order_coupons oc ON oc.order_id = o.id
  LEFT JOIN order_custom_fees ocf ON ocf.order_id = o.id
  WHERE o.id = p_order_id
  GROUP BY o.id, o.shipping_fee, oc.discount_amount;

  -- 更新訂單總金額
  UPDATE orders SET total_amount = v_new_total, updated_at = NOW() WHERE id = p_order_id;

  -- 記錄修改歷程
  INSERT INTO order_timelines (order_id, action_type, actor_id, actor_role, modifications)
  VALUES (p_order_id, 'order_modified', p_actor_id, 'admin', p_modifications);

  RETURN QUERY SELECT TRUE, '訂單修改成功', v_new_total;
END;
$$;
```

#### 5.2 Server Actions

**檔案**: `lib/actions/orders.ts`

```typescript
// 新增：批次修改訂單
export async function updateOrderDetails(
  orderId: string,
  modifications: OrderModifications
): Promise<ActionResult<{ new_total: number }>> {
  try {
    const supabase = await createClient();
    const { user } = await checkAuth();

    if (!user) {
      return { success: false, message: '請先登入' };
    }

    // 權限檢查
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return { success: false, message: '權限不足' };
    }

    // 呼叫 PostgreSQL Function
    const { data, error } = await supabase.rpc('update_order_with_modifications', {
      p_order_id: orderId,
      p_modifications: modifications,
      p_actor_id: user.id,
    });

    if (error) throw error;

    const result = data[0];
    if (!result.success) {
      return { success: false, message: result.message };
    }

    revalidatePath(`/admin/orders/${orderId}`);
    return {
      success: true,
      data: { new_total: result.new_total },
      message: result.message,
    };
  } catch (error) {
    console.error('修改訂單失敗:', error);
    return { success: false, message: '修改訂單失敗' };
  }
}
```

**檔案**: `lib/validations/order.schema.ts`

```typescript
// 訂單修改 Schema
export const orderModificationsSchema = z.object({
  summary: z.object({
    old_total: z.number(),
    new_total: z.number(),
    items_changed: z.number(),
    fees_added: z.number(),
  }),

  items: z.array(
    z.object({
      type: z.enum(['price_changed', 'quantity_changed', 'removed', 'added']),
      item_id: z.string().uuid().optional(),
      product_id: z.string().uuid().optional(),
      product_name: z.string(),
      old_price: z.number().optional(),
      new_price: z.number().optional(),
      old_quantity: z.number().optional(),
      new_quantity: z.number().optional(),
    })
  ),

  fees: z
    .array(
      z.object({
        type: z.enum(['added', 'removed']),
        fee_name: z.string(),
        amount: z.number(),
      })
    )
    .optional(),

  shipping: z
    .object({
      old_fee: z.number(),
      new_fee: z.number(),
    })
    .nullable()
    .optional(),

  coupon: z
    .object({
      action: z.enum(['removed', 'kept']),
      reason: z.string().optional(),
    })
    .nullable()
    .optional(),
});

export type OrderModifications = z.infer<typeof orderModificationsSchema>;
```

#### 5.3 UI 元件：訂單編輯器

**檔案**: `components/admin/orders/order-editor.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateOrderDetails } from '@/lib/actions/orders';
import type { Order, OrderItem, OrderCustomFee, OrderModifications } from '@/types';

interface OrderEditorProps {
  order: Order;
  items: OrderItem[];
  customFees: OrderCustomFee[];
  onSave: () => void;
  onCancel: () => void;
}

export function OrderEditor({ order, items, customFees, onSave, onCancel }: OrderEditorProps) {
  const [editedItems, setEditedItems] = useState(items);
  const [editedFees, setEditedFees] = useState(customFees);
  const [editedShippingFee, setEditedShippingFee] = useState(order.shipping_fee ?? 0);
  const [loading, setLoading] = useState(false);

  // 商品單價修改
  const handlePriceChange = (itemId: string, newPrice: number) => {
    setEditedItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, deal_price: newPrice, subtotal: newPrice * item.quantity }
          : item
      )
    );
  };

  // 商品數量修改
  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    setEditedItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, quantity: newQuantity, subtotal: item.deal_price * newQuantity }
          : item
      )
    );
  };

  // 移除商品
  const handleRemoveItem = (itemId: string) => {
    setEditedItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // 新增費用
  const handleAddFee = () => {
    const feeName = prompt('請輸入費用名稱（例：手續費、包裝費）：');
    if (!feeName) return;

    const amount = prompt('請輸入金額（可為負數表示減免）：');
    if (!amount) return;

    setEditedFees((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        order_id: order.id,
        fee_name: feeName,
        amount: Number(amount),
        created_at: new Date().toISOString(),
      },
    ]);
  };

  // 儲存變更
  const handleSave = async () => {
    // 建構修改資料
    const modifications: OrderModifications = {
      summary: {
        old_total: order.total_amount,
        new_total: calculateNewTotal(),
        items_changed: editedItems.filter(
          (ei) => items.find((i) => i.id === ei.id && (i.deal_price !== ei.deal_price || i.quantity !== ei.quantity))
        ).length,
        fees_added: editedFees.length - customFees.length,
      },
      items: [
        // 價格變更
        ...editedItems
          .filter((ei) => {
            const original = items.find((i) => i.id === ei.id);
            return original && original.deal_price !== ei.deal_price;
          })
          .map((ei) => {
            const original = items.find((i) => i.id === ei.id)!;
            return {
              type: 'price_changed' as const,
              item_id: ei.id,
              product_name: ei.product_name_snapshot,
              old_price: original.deal_price,
              new_price: ei.deal_price,
            };
          }),
        // 數量變更
        ...editedItems
          .filter((ei) => {
            const original = items.find((i) => i.id === ei.id);
            return original && original.quantity !== ei.quantity;
          })
          .map((ei) => {
            const original = items.find((i) => i.id === ei.id)!;
            return {
              type: 'quantity_changed' as const,
              item_id: ei.id,
              product_name: ei.product_name_snapshot,
              old_quantity: original.quantity,
              new_quantity: ei.quantity,
            };
          }),
        // 移除商品
        ...items
          .filter((i) => !editedItems.find((ei) => ei.id === i.id))
          .map((i) => ({
            type: 'removed' as const,
            item_id: i.id,
            product_name: i.product_name_snapshot,
          })),
      ],
      fees: editedFees
        .filter((ef) => !customFees.find((cf) => cf.id === ef.id))
        .map((ef) => ({
          type: 'added' as const,
          fee_name: ef.fee_name,
          amount: ef.amount,
        })),
      shipping:
        editedShippingFee !== order.shipping_fee
          ? {
              old_fee: order.shipping_fee ?? 0,
              new_fee: editedShippingFee,
            }
          : null,
    };

    // 確認變更
    const confirmMsg = `
      確認以下變更：
      - 商品變更: ${modifications.summary.items_changed} 項
      - 費用新增: ${modifications.summary.fees_added} 項
      - 新總額: NT$${modifications.summary.new_total}

      是否儲存？
    `;

    if (!confirm(confirmMsg)) return;

    setLoading(true);
    const result = await updateOrderDetails(order.id, modifications);
    setLoading(false);

    if (result.success) {
      alert('訂單修改成功');
      onSave();
    } else {
      alert(result.message);
    }
  };

  // 計算新總額
  const calculateNewTotal = () => {
    const itemsTotal = editedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const feesTotal = editedFees.reduce((sum, fee) => sum + fee.amount, 0);
    return itemsTotal + editedShippingFee + feesTotal;
  };

  return (
    <div className="border-2 border-black p-4 space-y-4">
      <h3 className="font-bold text-lg">編輯訂單</h3>

      {/* 商品列表 */}
      <div className="space-y-3">
        {editedItems.map((item) => {
          const original = items.find((i) => i.id === item.id);
          const priceChanged = original && original.deal_price !== item.deal_price;
          const quantityChanged = original && original.quantity !== item.quantity;

          return (
            <div key={item.id} className="border border-gray-300 p-3 space-y-2">
              <div className="font-bold">{item.product_name_snapshot}</div>

              <div className="flex items-center gap-3">
                <span>單價:</span>
                {priceChanged && (
                  <span className="line-through text-gray-400">NT${original!.deal_price}</span>
                )}
                <Input
                  type="number"
                  value={item.deal_price}
                  onChange={(e) => handlePriceChange(item.id, Number(e.target.value))}
                  className="w-24"
                />
                {priceChanged && <span className="text-red-600 font-bold">已修改</span>}
              </div>

              <div className="flex items-center gap-3">
                <span>數量:</span>
                {quantityChanged && (
                  <span className="line-through text-gray-400">{original!.quantity}</span>
                )}
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleQuantityChange(item.id, Number(e.target.value))}
                  className="w-24"
                />
                {quantityChanged && <span className="text-red-600 font-bold">已修改</span>}
              </div>

              <div className="flex justify-between items-center">
                <span>小計: NT${item.subtotal}</span>
                <Button variant="destructive" size="sm" onClick={() => handleRemoveItem(item.id)}>
                  移除
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 自訂費用 */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="font-bold">自訂費用</span>
          <Button onClick={handleAddFee}>新增費用</Button>
        </div>

        {editedFees.map((fee) => (
          <div key={fee.id} className="flex justify-between">
            <span>{fee.fee_name}</span>
            <span>NT${fee.amount}</span>
          </div>
        ))}
      </div>

      {/* 運費 */}
      <div className="flex items-center gap-3">
        <span>運費:</span>
        {editedShippingFee !== order.shipping_fee && (
          <span className="line-through text-gray-400">NT${order.shipping_fee}</span>
        )}
        <Input
          type="number"
          value={editedShippingFee}
          onChange={(e) => setEditedShippingFee(Number(e.target.value))}
          className="w-24"
        />
        {editedShippingFee !== order.shipping_fee && (
          <span className="text-red-600 font-bold">已修改</span>
        )}
      </div>

      {/* 總額 */}
      <div className="border-t-2 border-black pt-3 flex justify-between font-bold text-lg">
        <span>訂單總額</span>
        <span>NT${calculateNewTotal()}</span>
      </div>

      {/* 操作按鈕 */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel}>
          取消編輯
        </Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? '儲存中...' : '儲存變更'}
        </Button>
      </div>
    </div>
  );
}
```

#### 5.4 訂單詳情頁整合

**檔案**: `app/(admin)/admin/orders/[id]/page.tsx`（修改現有）

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { OrderEditor } from '@/components/admin/orders/order-editor';
import type { Order, OrderItem, OrderCustomFee } from '@/types';

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const [editMode, setEditMode] = useState(false);
  // ... 現有邏輯：載入訂單資料 ...

  const canEdit = order.status === 'pending';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">訂單詳情</h1>

        {canEdit && !editMode && (
          <Button onClick={() => setEditMode(true)}>編輯訂單</Button>
        )}
      </div>

      {editMode ? (
        <OrderEditor
          order={order}
          items={items}
          customFees={customFees}
          onSave={() => {
            setEditMode(false);
            // 重新載入訂單資料
          }}
          onCancel={() => setEditMode(false)}
        />
      ) : (
        <>
          {/* 現有訂單詳情顯示 */}
        </>
      )}
    </div>
  );
}
```

#### 測試驗收
- [ ] 訂單詳情頁顯示「編輯訂單」按鈕（pending 狀態）
- [ ] 進入編輯模式後可修改商品單價、數量
- [ ] 可新增自訂費用項目
- [ ] 可修改運費
- [ ] 儲存後訂單總額正確更新
- [ ] 修改歷程記錄於 `order_timelines`

---

### Phase 6: 修改歷程顯示
**目標**: 客戶與管理員可查看訂單修改歷程
**工作量**: 1.5 小時

#### 6.1 UI 元件：修改歷程顯示器

**檔案**: `components/admin/orders/order-modification-timeline.tsx`

```tsx
'use client';

import type { OrderTimeline } from '@/types';

interface OrderModificationTimelineProps {
  timelines: OrderTimeline[];
}

export function OrderModificationTimeline({ timelines }: OrderModificationTimelineProps) {
  const modificationTimelines = timelines.filter((t) => t.action_type === 'order_modified');

  if (modificationTimelines.length === 0) {
    return <p className="text-gray-500">尚無修改記錄</p>;
  }

  return (
    <div className="space-y-4">
      {modificationTimelines.map((timeline) => {
        const mods = timeline.modifications;

        return (
          <div key={timeline.id} className="border-2 border-yellow-500 bg-yellow-50 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-bold">🔧 系統管理員</span>
              <span className="text-sm text-gray-600">
                {new Date(timeline.created_at).toLocaleString('zh-TW')}
              </span>
            </div>

            <div className="space-y-1 text-sm">
              {/* 商品修改 */}
              {mods.items?.map((item, idx) => (
                <div key={idx}>
                  {item.type === 'price_changed' && (
                    <div>
                      • {item.product_name}: 單價 NT${item.old_price} → NT${item.new_price}
                    </div>
                  )}
                  {item.type === 'quantity_changed' && (
                    <div>
                      • {item.product_name}: 數量 {item.old_quantity} → {item.new_quantity}
                    </div>
                  )}
                  {item.type === 'removed' && <div>• 移除商品: {item.product_name}</div>}
                  {item.type === 'added' && (
                    <div>
                      • 新增商品: {item.product_name} × {item.new_quantity} (NT${item.new_price})
                    </div>
                  )}
                </div>
              ))}

              {/* 費用修改 */}
              {mods.fees?.map((fee, idx) => (
                <div key={idx}>
                  {fee.type === 'added' && (
                    <div>
                      • 新增費用: {fee.fee_name} {fee.amount >= 0 ? '+' : ''}NT${fee.amount}
                    </div>
                  )}
                </div>
              ))}

              {/* 運費修改 */}
              {mods.shipping && (
                <div>
                  • 運費: NT${mods.shipping.old_fee} → NT${mods.shipping.new_fee}
                  {mods.shipping.new_fee === 0 && <span className="text-green-600"> (免運)</span>}
                </div>
              )}

              {/* 總額變更 */}
              <div className="border-t border-yellow-600 pt-2 font-bold">
                訂單總額: NT${mods.summary.old_total} → NT${mods.summary.new_total}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

#### 6.2 整合至訂單詳情頁

**檔案**: `app/(admin)/admin/orders/[id]/page.tsx`

```tsx
import { OrderModificationTimeline } from '@/components/admin/orders/order-modification-timeline';
import { OrderTimeline } from '@/components/admin/orders/order-timeline';  // 現有留言顯示

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  // ... 載入訂單資料 ...

  return (
    <div className="space-y-6">
      {/* 訂單詳情 */}
      {/* ... */}

      {/* 操作歷史 */}
      <div className="border-2 border-black p-4 space-y-4">
        <h3 className="font-bold text-lg">訂單操作歷史</h3>

        {/* 修改歷程（黃色背景） */}
        <OrderModificationTimeline timelines={timelines} />

        {/* 留言歷程（藍色背景） */}
        <OrderTimeline timelines={timelines.filter((t) => t.action_type === 'comment')} />

        {/* 狀態變更歷程（灰色背景） */}
        {/* ... */}
      </div>
    </div>
  );
}
```

#### 測試驗收
- [ ] 訂單詳情頁顯示修改歷程區塊
- [ ] 修改歷程與留言歷程視覺上區分（黃色 vs 藍色）
- [ ] 修改歷程顯示所有變更項目（商品、費用、運費、總額）
- [ ] 時間顯示正確（繁體中文格式）

---

### Phase 7: 優惠券與運費互動處理
**目標**: 訂單修改後驗證優惠券條件
**工作量**: 1 小時

#### 7.1 Server Actions 擴展

**檔案**: `lib/actions/orders.ts`（修改 `updateOrderDetails`）

```typescript
export async function updateOrderDetails(
  orderId: string,
  modifications: OrderModifications
): Promise<ActionResult<{ new_total: number; coupon_warning?: string }>> {
  try {
    // ... 現有邏輯 ...

    // 檢查優惠券條件（若訂單有使用優惠券）
    const { data: orderCoupon } = await supabase
      .from('order_coupons')
      .select('*, user_coupons!inner(coupon_id)')
      .eq('order_id', orderId)
      .single();

    if (orderCoupon) {
      // 取得優惠券資訊
      const { data: coupon } = await supabase
        .from('coupons')
        .select('min_order_amount')
        .eq('id', orderCoupon.user_coupons.coupon_id)
        .single();

      // 計算新的商品總額（不含運費）
      const newSubtotal = editedItems.reduce((sum, item) => sum + item.subtotal, 0);

      // 驗證最低金額限制
      if (coupon && coupon.min_order_amount && newSubtotal < coupon.min_order_amount) {
        return {
          success: false,
          message: `訂單修改後商品金額 (NT$${newSubtotal}) 不符合優惠券條件 (需滿 NT$${coupon.min_order_amount})`,
          data: {
            new_total: modifications.summary.new_total,
            coupon_warning: '是否移除優惠券並繼續修改？',
          },
        };
      }
    }

    // ... 繼續執行修改 ...
  } catch (error) {
    // ...
  }
}
```

#### 7.2 UI 提示處理

**檔案**: `components/admin/orders/order-editor.tsx`（修改 `handleSave`）

```tsx
const handleSave = async () => {
  // ... 建構 modifications ...

  setLoading(true);
  const result = await updateOrderDetails(order.id, modifications);
  setLoading(false);

  if (!result.success && result.data?.coupon_warning) {
    // 優惠券條件不符
    const removeCoupon = confirm(`${result.message}\n\n${result.data.coupon_warning}`);

    if (removeCoupon) {
      // 移除優惠券並重新儲存
      modifications.coupon = { action: 'removed', reason: '訂單修改後不符合優惠券條件' };

      setLoading(true);
      const retryResult = await updateOrderDetails(order.id, modifications);
      setLoading(false);

      if (retryResult.success) {
        alert('訂單修改成功（已移除優惠券）');
        onSave();
      } else {
        alert(retryResult.message);
      }
    }
  } else if (result.success) {
    alert('訂單修改成功');
    onSave();
  } else {
    alert(result.message);
  }
};
```

#### 測試驗收
- [ ] 訂單修改後若不符合優惠券條件，顯示警告提示
- [ ] 管理員可選擇移除優惠券並繼續修改
- [ ] 若選擇保留優惠券，修改失敗並顯示錯誤訊息

---

### Phase 8: 測試與部署
**目標**: 完整測試並部署到生產環境
**工作量**: 2 小時

#### 8.1 單元測試

**檔案**: `__tests__/lib/actions/orders.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { updateOrderDetails, markAsShipping } from '@/lib/actions/orders';

describe('訂單修改功能', () => {
  it('應該正確修改商品單價', async () => {
    // ...
  });

  it('應該正確計算運費', async () => {
    // ...
  });

  it('應該驗證優惠券條件', async () => {
    // ...
  });
});
```

#### 8.2 整合測試（本地環境）

**測試清單**:
- [ ] 完整訂單流程：建立 → 修改 → 出貨 → 完成
- [ ] 運費計算正確（零售/批發/滿額免運）
- [ ] 訂單修改後總額正確
- [ ] 庫存扣減與回補正確
- [ ] 修改歷程記錄完整
- [ ] 優惠券驗證邏輯正確

#### 8.3 部署檢查清單

**參考**: [`docs/BACKUP_RESTORE_CHEATSHEET.md`](../../docs/BACKUP_RESTORE_CHEATSHEET.md)

**Phase 1 部署（運費功能）**:
- [ ] 備份生產環境資料庫
- [ ] 執行 Migration: `20260106_add_shipping_features.sql`
- [ ] 驗證資料表欄位正確
- [ ] 測試運費計算函數
- [ ] 部署前端程式碼（會員等級設定 UI）

**Phase 2 部署（移除 confirmed）**:
- [ ] 再次備份資料庫
- [ ] 執行 Migration: `20260107_remove_confirmed_status.sql`
- [ ] 驗證現有訂單狀態轉換正確
- [ ] 測試新的狀態流程
- [ ] 部署前端程式碼（訂單操作 UI）

**Phase 3 部署（訂單修改）**:
- [ ] 再次備份資料庫
- [ ] 執行 Migration: `20260108_extend_order_timelines.sql`
- [ ] 測試批次修改函數
- [ ] 部署前端程式碼（訂單編輯器）

---

## 三、Rollback 計畫

### Phase 1 Rollback

```sql
-- 回滾運費功能
ALTER TABLE tiers DROP COLUMN IF EXISTS shipping_fee;
ALTER TABLE tiers DROP COLUMN IF EXISTS free_shipping_threshold;
ALTER TABLE orders DROP COLUMN IF EXISTS shipping_fee;
DROP TABLE IF EXISTS order_custom_fees CASCADE;
DROP FUNCTION IF EXISTS calculate_shipping_fee(UUID, DECIMAL);
```

### Phase 2 Rollback

```sql
-- 回滾 confirmed 狀態移除
ALTER TABLE orders DROP CONSTRAINT orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'confirmed', 'shipping', 'completed', 'cancelled'));

-- 恢復舊函數（需從備份還原）
```

### Phase 3 Rollback

```sql
-- 回滾修改歷程擴展
ALTER TABLE order_timelines DROP COLUMN IF EXISTS modifications;
ALTER TABLE order_timelines DROP CONSTRAINT order_timelines_action_type_check;
ALTER TABLE order_timelines ADD CONSTRAINT order_timelines_action_type_check
  CHECK (action_type IN ('created', 'status_changed', 'cancelled', 'comment'));
DROP FUNCTION IF EXISTS update_order_with_modifications(UUID, JSONB, UUID);
```

---

## 四、里程碑與時程

| Phase | 功能 | 預估時間 | 完成標準 |
|-------|------|---------|---------|
| Phase 0 | 準備工作 | 0.5h | 環境就緒、備份完成 |
| Phase 1 | 運費基礎建設 | 2h | Migration 成功、函數測試通過 |
| Phase 2 | 會員等級運費設定 UI | 1.5h | UI 正常運作、儲存成功 |
| Phase 3 | 訂單建立時計算運費 | 2h | 結帳頁顯示運費、訂單正確儲存 |
| Phase 4 | 移除 confirmed 狀態 | 2.5h | 狀態流程正確、庫存邏輯正確 |
| Phase 5 | 訂單修改核心功能 | 3.5h | 編輯器正常運作、修改儲存成功 |
| Phase 6 | 修改歷程顯示 | 1.5h | 歷程清晰可讀、區分留言 |
| Phase 7 | 優惠券互動處理 | 1h | 驗證邏輯正確、提示清晰 |
| Phase 8 | 測試與部署 | 2h | 所有測試通過、生產環境部署成功 |
| **總計** | | **15-16h** | 功能完整、穩定運行 |

---

## 五、風險緩解措施

1. **資料遺失風險** → 每個 Phase 部署前完整備份
2. **狀態轉換錯誤** → Migration 前在本地環境完整測試
3. **效能問題** → 使用索引優化查詢、監控慢查詢
4. **使用者體驗問題** → UI 原型設計、使用者測試

---

**最後更新**: 2026-01-06
**版本**: v1.0.0
