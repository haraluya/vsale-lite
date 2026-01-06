# Quickstart Guide: 優惠券系統

**Feature**: 優惠券系統 (Coupon System)
**Date**: 2026-01-06
**Audience**: 開發者

## 目錄

1. [環境準備](#環境準備)
2. [資料庫 Migration 執行](#資料庫-migration-執行)
3. [Server Actions 使用範例](#server-actions-使用範例)
4. [前端元件整合範例](#前端元件整合範例)
5. [測試資料生成](#測試資料生成)
6. [常見問題](#常見問題)

---

## 環境準備

### 1. 確認相依 Features 已完成

優惠券系統依賴以下 Features：

- ✅ **Feature 001**: 會員等級與客戶管理（等級限制功能依賴）
- ✅ **Feature 003**: 系列與等級價格管理（系列限制功能依賴）
- ✅ **Feature 004**: 購物車與訂單管理系統（優惠券應用與訂單快照依賴）

### 2. 確認本地 Supabase 已啟動

```bash
# 啟動本地 Supabase（首次或重啟電腦後執行）
supabase start

# 查看服務狀態
supabase status
```

---

## 資料庫 Migration 執行

### 步驟 1: 建立 Migration 檔案

```bash
# 建立 Migration 檔案
supabase migration new create_coupons
```

這將產生檔案：`supabase/migrations/YYYYMMDD_create_coupons.sql`

### 步驟 2: 複製 Migration 內容

將以下 SQL 複製到 Migration 檔案中：

```sql
-- ============================================================================
-- Migration: 優惠券系統
-- Feature: 009-coupon-system
-- Date: 2026-01-06
-- ============================================================================

-- 1. 建立 coupons 表（優惠券主表）
-- ============================================================================

CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL CHECK (code ~ '^[A-Z0-9]+$'),
  code_normalized VARCHAR(20) GENERATED ALWAYS AS (UPPER(code)) STORED,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('fixed', 'percentage')),
  discount_value DECIMAL(10, 2) NOT NULL CHECK (
    (discount_type = 'fixed' AND discount_value > 0) OR
    (discount_type = 'percentage' AND discount_value >= 1 AND discount_value <= 100)
  ),
  min_order_amount DECIMAL(10, 2) CHECK (min_order_amount >= 0),
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_time_range CHECK (valid_until > valid_from),
  CONSTRAINT code_length CHECK (LENGTH(code) BETWEEN 4 AND 20)
);

-- 唯一性約束（基於大寫版本）
CREATE UNIQUE INDEX idx_coupons_code_normalized ON coupons(code_normalized) WHERE status != 'deleted';

-- 查詢索引
CREATE INDEX idx_coupons_status ON coupons(status);
CREATE INDEX idx_coupons_valid_time ON coupons(valid_from, valid_until);
CREATE INDEX idx_coupons_discount_type ON coupons(discount_type);

-- 自動更新 updated_at
CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 註解
COMMENT ON TABLE coupons IS '優惠券主表';
COMMENT ON COLUMN coupons.code IS '優惠券代碼（管理員輸入，4-20 字元，僅允許英數字）';
COMMENT ON COLUMN coupons.code_normalized IS '自動轉大寫的優惠券代碼（用於唯一性檢查與查詢）';

-- 2. 建立 coupon_tier_restrictions 表（優惠券等級限制）
-- ============================================================================

CREATE TABLE coupon_tier_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES tiers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (coupon_id, tier_id)
);

CREATE INDEX idx_coupon_tier_restrictions_coupon_id ON coupon_tier_restrictions(coupon_id);
CREATE INDEX idx_coupon_tier_restrictions_tier_id ON coupon_tier_restrictions(tier_id);

COMMENT ON TABLE coupon_tier_restrictions IS '優惠券等級限制表（多對多關聯）';

-- 3. 建立 coupon_series_restrictions 表（優惠券系列限制）
-- ============================================================================

CREATE TABLE coupon_series_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (coupon_id, series_id)
);

CREATE INDEX idx_coupon_series_restrictions_coupon_id ON coupon_series_restrictions(coupon_id);
CREATE INDEX idx_coupon_series_restrictions_series_id ON coupon_series_restrictions(series_id);

COMMENT ON TABLE coupon_series_restrictions IS '優惠券系列限制表（多對多關聯）';

-- 4. 建立 user_coupons 表（客戶優惠券領取記錄）
-- ============================================================================

CREATE TABLE user_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

  UNIQUE (user_id, coupon_id)
);

CREATE INDEX idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX idx_user_coupons_coupon_id ON user_coupons(coupon_id);
CREATE INDEX idx_user_coupons_used_at ON user_coupons(used_at);

COMMENT ON TABLE user_coupons IS '客戶優惠券領取記錄表';

-- 5. 建立 order_coupons 表（訂單優惠券快照）
-- ============================================================================

CREATE TABLE order_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  coupon_code VARCHAR(20) NOT NULL,
  discount_type VARCHAR(20) NOT NULL,
  discount_value DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (order_id)
);

CREATE INDEX idx_order_coupons_order_id ON order_coupons(order_id);
CREATE INDEX idx_order_coupons_coupon_code ON order_coupons(coupon_code);

COMMENT ON TABLE order_coupons IS '訂單優惠券快照表（不使用 FK，保留歷史記錄）';

-- 6. 建立 active_coupons View（有效優惠券）
-- ============================================================================

CREATE VIEW active_coupons AS
SELECT * FROM coupons
WHERE status = 'active'
  AND NOW() BETWEEN valid_from AND valid_until;

COMMENT ON VIEW active_coupons IS '有效優惠券 View（自動過濾過期與已刪除）';

-- 7. 啟用 RLS
-- ============================================================================

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_tier_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_series_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_coupons ENABLE ROW LEVEL SECURITY;

-- 8. 建立 RLS Policies - coupons
-- ============================================================================

CREATE POLICY "Clients can view active coupons"
  ON coupons FOR SELECT
  TO authenticated
  USING (
    status = 'active' AND
    NOW() BETWEEN valid_from AND valid_until
  );

CREATE POLICY "Admins can view all coupons"
  ON coupons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage coupons"
  ON coupons FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 9. 建立 RLS Policies - coupon_tier_restrictions
-- ============================================================================

CREATE POLICY "Authenticated users can view tier restrictions"
  ON coupon_tier_restrictions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage tier restrictions"
  ON coupon_tier_restrictions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 10. 建立 RLS Policies - coupon_series_restrictions
-- ============================================================================

CREATE POLICY "Authenticated users can view series restrictions"
  ON coupon_series_restrictions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage series restrictions"
  ON coupon_series_restrictions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 11. 建立 RLS Policies - user_coupons
-- ============================================================================

CREATE POLICY "Clients can view their own coupons"
  ON user_coupons FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all user coupons"
  ON user_coupons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 12. 建立 RLS Policies - order_coupons
-- ============================================================================

CREATE POLICY "Clients can view their order coupons"
  ON order_coupons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_coupons.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all order coupons"
  ON order_coupons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- Migration 完成
-- ============================================================================
```

### 步驟 3: 執行 Migration

```bash
# 方法 1: 重置本地資料庫（會清空所有資料，慎用！）
supabase db reset

# 方法 2: 僅執行新的 Migrations
supabase db push
```

### 步驟 4: 驗證 Migration

```bash
# 開啟 Supabase Studio
# 瀏覽器訪問: http://127.0.0.1:54323

# 檢查以下項目：
# 1. Tables: coupons, coupon_tier_restrictions, coupon_series_restrictions, user_coupons, order_coupons
# 2. Views: active_coupons
# 3. Policies: 每個表應有對應的 RLS Policies
```

---

## Server Actions 使用範例

### 1. 建立 Server Actions 檔案

建立檔案：`lib/actions/coupons.ts`

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { checkAuth } from '@/lib/actions/helpers';
import { revalidatePath } from 'next/cache';
import {
  createCouponSchema,
  updateCouponSchema,
  claimCouponSchema,
  validateCouponSchema,
  type ActionResult,
  type Coupon,
  type UserCoupon,
  type CouponDiscountResult,
  COUPON_ERROR_MESSAGES,
  COUPON_SUCCESS_MESSAGES,
} from '@/specs/009-coupon-system/contracts/coupons';

/**
 * 建立優惠券（管理員）
 */
export async function createCoupon(
  input: z.infer<typeof createCouponSchema>
): Promise<ActionResult<Coupon>> {
  // 1. 權限檢查
  const { role } = await checkAuth();
  if (role !== 'admin') {
    return { success: false, message: COUPON_ERROR_MESSAGES.PERMISSION_DENIED };
  }

  // 2. 驗證輸入
  const validation = createCouponSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      message: '輸入資料驗證失敗',
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();

  // 3. 檢查代碼唯一性
  const { data: existing } = await supabase
    .from('coupons')
    .select('id')
    .eq('code_normalized', input.code.toUpperCase())
    .neq('status', 'deleted')
    .single();

  if (existing) {
    return { success: false, message: COUPON_ERROR_MESSAGES.DUPLICATE_CODE };
  }

  // 4. 建立優惠券
  const { data: coupon, error } = await supabase
    .from('coupons')
    .insert({
      code: input.code.toUpperCase(),
      discount_type: input.discount_type,
      discount_value: input.discount_value,
      min_order_amount: input.min_order_amount,
      valid_from: input.valid_from,
      valid_until: input.valid_until,
    })
    .select()
    .single();

  if (error) {
    return { success: false, message: `建立失敗: ${error.message}` };
  }

  // 5. 建立等級限制
  if (input.tier_restrictions && input.tier_restrictions.length > 0) {
    const tierRestrictions = input.tier_restrictions.map((tier_id) => ({
      coupon_id: coupon.id,
      tier_id,
    }));

    await supabase.from('coupon_tier_restrictions').insert(tierRestrictions);
  }

  // 6. 建立系列限制
  if (input.series_restrictions && input.series_restrictions.length > 0) {
    const seriesRestrictions = input.series_restrictions.map((series_id) => ({
      coupon_id: coupon.id,
      series_id,
    }));

    await supabase.from('coupon_series_restrictions').insert(seriesRestrictions);
  }

  revalidatePath('/admin/coupons');
  return { success: true, data: coupon, message: COUPON_SUCCESS_MESSAGES.CREATED };
}

/**
 * 客戶領取優惠券
 */
export async function claimCoupon(
  input: z.infer<typeof claimCouponSchema>
): Promise<ActionResult<UserCoupon>> {
  // 1. 權限檢查
  const { userId } = await checkAuth();

  // 2. 驗證輸入
  const validation = claimCouponSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      message: '輸入資料驗證失敗',
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();

  // 3. 查詢優惠券（使用 View 自動過濾過期優惠券）
  const { data: coupon, error: couponError } = await supabase
    .from('active_coupons')
    .select('*')
    .eq('code_normalized', input.couponCode.toUpperCase())
    .single();

  if (couponError || !coupon) {
    return { success: false, message: COUPON_ERROR_MESSAGES.COUPON_EXPIRED };
  }

  // 4. 檢查是否已領取
  const { data: existing } = await supabase
    .from('user_coupons')
    .select('id')
    .eq('user_id', userId)
    .eq('coupon_id', coupon.id)
    .single();

  if (existing) {
    return { success: false, message: COUPON_ERROR_MESSAGES.ALREADY_CLAIMED };
  }

  // 5. 建立領取記錄
  const { data: userCoupon, error } = await supabase
    .from('user_coupons')
    .insert({
      user_id: userId,
      coupon_id: coupon.id,
    })
    .select()
    .single();

  if (error) {
    return { success: false, message: COUPON_ERROR_MESSAGES.CLAIM_FAILED };
  }

  revalidatePath('/coupons');
  return { success: true, data: userCoupon, message: COUPON_SUCCESS_MESSAGES.CLAIMED };
}

// ... 其他 Server Actions 實作
```

---

## 前端元件整合範例

### 1. 優惠券卡片元件（Coupang 風格）

建立檔案：`components/shop/coupons/CouponCard.tsx`

```tsx
'use client';

import { formatDate } from '@/lib/utils';
import type { Coupon } from '@/specs/009-coupon-system/contracts/coupons';

interface CouponCardProps {
  coupon: Coupon;
  onClaim?: () => void;
  isClaimed?: boolean;
}

export function CouponCard({ coupon, onClaim, isClaimed }: CouponCardProps) {
  const discountDisplay = coupon.discount_type === 'fixed'
    ? `$${coupon.discount_value}`
    : `${coupon.discount_value}%`;

  const minAmountText = coupon.min_order_amount
    ? `滿 $${coupon.min_order_amount} 可用`
    : '無金額限制';

  return (
    <div className="relative border-3 border-black shadow-neo bg-white overflow-hidden">
      {/* 鋸齒狀切口（模擬撕邊效果） */}
      <div
        className="absolute top-0 right-24 w-px h-full bg-gradient-to-b from-black via-transparent to-black"
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
      />

      <div className="flex">
        {/* 左側：折扣金額 */}
        <div className="w-32 bg-orange-400 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="text-3xl font-black">{discountDisplay}</div>
            <div className="text-sm font-bold">折扣</div>
          </div>
        </div>

        {/* 右側：優惠券資訊 */}
        <div className="flex-1 p-4">
          <div className="font-bold text-lg mb-2">{coupon.code_normalized}</div>
          <div className="text-sm text-gray-600 mb-1">{minAmountText}</div>
          <div className="text-xs text-gray-500">
            有效期限: {formatDate(coupon.valid_until)}
          </div>

          {/* 領取按鈕 */}
          {!isClaimed && onClaim && (
            <button
              onClick={onClaim}
              className="mt-3 px-4 py-2 bg-black text-white font-bold border-2 border-black
                         shadow-neo-sm hover:translate-x-[2px] hover:translate-y-[2px]
                         hover:shadow-none transition-all"
            >
              立即領取
            </button>
          )}

          {isClaimed && (
            <div className="mt-3 text-sm text-green-600 font-bold">✓ 已領取</div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 2. 優惠券輸入口令元件（Foodpanda 風格）

建立檔案：`components/shop/coupons/CouponCodeInput.tsx`

```tsx
'use client';

import { useState } from 'react';
import { claimCoupon } from '@/lib/actions/coupons';
import { toast } from 'sonner';

export function CouponCodeInput() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClaim = async () => {
    if (!code.trim()) {
      toast.error('請輸入優惠券代碼');
      return;
    }

    setLoading(true);
    const result = await claimCoupon({ couponCode: code.trim() });
    setLoading(false);

    if (result.success) {
      toast.success(result.message);
      setCode('');
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="border-3 border-black shadow-neo bg-white p-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="輸入優惠券代碼"
          className="flex-1 px-4 py-3 border-2 border-black text-lg font-bold
                     placeholder:text-gray-400 focus:outline-none"
          disabled={loading}
        />
        <button
          onClick={handleClaim}
          disabled={loading}
          className="px-6 py-3 bg-orange-400 text-black font-black border-2 border-black
                     shadow-neo hover:translate-x-[2px] hover:translate-y-[2px]
                     hover:shadow-none transition-all disabled:opacity-50"
        >
          {loading ? '領取中...' : '領取'}
        </button>
      </div>
    </div>
  );
}
```

---

## 測試資料生成

### 使用 Supabase Studio SQL Editor

1. 開啟 Supabase Studio: http://127.0.0.1:54323
2. 左側選單 → SQL Editor → New Query
3. 複製以下 SQL 並執行

```sql
-- ============================================================================
-- 測試資料：優惠券系統
-- ============================================================================

-- 1. 建立測試優惠券
-- ============================================================================

-- 優惠券 1: WELCOME100（現金折扣 $100，滿 $500 可用）
INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, valid_from, valid_until)
VALUES ('WELCOME100', 'fixed', 100, 500, NOW(), NOW() + INTERVAL '30 days');

-- 優惠券 2: SUMMER20（百分比折扣 20%，滿 $300 可用）
INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, valid_from, valid_until)
VALUES ('SUMMER20', 'percentage', 20, 300, NOW(), NOW() + INTERVAL '60 days');

-- 優惠券 3: VIP50（現金折扣 $50，無最低金額限制，限批發會員）
INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, valid_from, valid_until)
VALUES ('VIP50', 'fixed', 50, NULL, NOW(), NOW() + INTERVAL '90 days');

-- 2. 建立等級限制（VIP50 限批發會員）
-- ============================================================================

INSERT INTO coupon_tier_restrictions (coupon_id, tier_id)
SELECT
  c.id,
  t.id
FROM coupons c
CROSS JOIN tiers t
WHERE c.code_normalized = 'VIP50'
  AND t.name = '批發';

-- 3. 建立系列限制範例（假設有「水果」系列）
-- ============================================================================

-- 優惠券 4: FRUITS30（百分比折扣 30%，限水果系列）
INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, valid_from, valid_until)
VALUES ('FRUITS30', 'percentage', 30, 200, NOW(), NOW() + INTERVAL '30 days');

-- 建立系列限制（假設 series.name = '水果'）
INSERT INTO coupon_series_restrictions (coupon_id, series_id)
SELECT
  c.id,
  s.id
FROM coupons c
CROSS JOIN series s
WHERE c.code_normalized = 'FRUITS30'
  AND s.name = '水果';

-- 4. 查詢所有測試優惠券
-- ============================================================================

SELECT
  c.code_normalized,
  c.discount_type,
  c.discount_value,
  c.min_order_amount,
  c.valid_until,
  c.status,
  COUNT(DISTINCT ctr.tier_id) AS tier_restriction_count,
  COUNT(DISTINCT csr.series_id) AS series_restriction_count
FROM coupons c
LEFT JOIN coupon_tier_restrictions ctr ON c.id = ctr.coupon_id
LEFT JOIN coupon_series_restrictions csr ON c.id = csr.coupon_id
GROUP BY c.id
ORDER BY c.created_at DESC;
```

---

## 常見問題

### 1. 優惠券代碼大小寫問題

**Q**: 客戶輸入小寫代碼「welcome100」無法識別？

**A**: 確認 Server Action 中使用 `input.couponCode.toUpperCase()` 轉換為大寫再查詢。

```typescript
const { data: coupon } = await supabase
  .from('active_coupons')
  .select('*')
  .eq('code_normalized', input.couponCode.toUpperCase())  // 關鍵！
  .single();
```

### 2. 優惠券顯示為「已過期」但實際未過期

**Q**: 優惠券在前台顯示為「已過期」，但在後台查詢仍在有效期內？

**A**: 檢查前端是否使用 `active_coupons` View 查詢，而非直接查詢 `coupons` 表。

```typescript
// ✅ 正確：使用 View
const { data } = await supabase.from('active_coupons').select('*');

// ❌ 錯誤：直接查詢表
const { data } = await supabase.from('coupons').select('*');
```

### 3. 優惠券領取失敗

**Q**: 客戶領取優惠券時提示「您已領取過此優惠券」，但實際未領取？

**A**: 檢查 `user_coupons` 表是否有殘留記錄（可能因測試刪除優惠券後未清理）。

```sql
-- 清理殘留記錄
DELETE FROM user_coupons WHERE coupon_id NOT IN (SELECT id FROM coupons);
```

### 4. 優惠券折扣計算錯誤

**Q**: 購物車應用優惠券後，折扣金額不正確？

**A**: 確認折扣計算邏輯中是否正確處理系列限制。

```typescript
// 計算適用商品總額（考慮系列限制）
let eligibleAmount = 0;
if (coupon.series_restrictions.length > 0) {
  // ✅ 僅計算限定系列商品
  eligibleAmount = cartItems
    .filter(item => coupon.series_restrictions.includes(item.series_id))
    .reduce((sum, item) => sum + (item.price * item.quantity), 0);
} else {
  // ✅ 計算全部商品
  eligibleAmount = cartItems
    .reduce((sum, item) => sum + (item.price * item.quantity), 0);
}
```

---

## 下一步

1. ✅ 完成 Migration 執行與驗證
2. ✅ 實作 Server Actions（參考 `contracts/coupons.ts`）
3. ✅ 實作前端元件（優惠券卡片、輸入口令）
4. ⏳ 整合購物車（應用優惠券、折扣計算）
5. ⏳ 整合訂單（優惠券快照）
6. ⏳ 實作管理端（優惠券 CRUD、統計報表）

---

**文件版本**: 1.0.0
**最後更新**: 2026-01-06
**維護者**: Claude Sonnet 4.5
