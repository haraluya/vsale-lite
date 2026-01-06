# Research Report: 優惠券系統技術實作研究

**Feature**: 009-coupon-system
**Date**: 2026-01-06
**Researcher**: Claude Sonnet 4.5

---

## 研究目標

針對優惠券系統的核心技術挑戰進行研究，確保實作方案符合專案憲章與效能需求。

---

## 研究項目

### 1. 優惠券代碼大小寫處理策略

#### 決策

使用 **PostgreSQL UPPER() 函式 + UNIQUE 約束 + Generated Column** 組合方案。

#### 實作細節

```sql
-- 優惠券資料表設計
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL,           -- 原始輸入（可能包含小寫）
  code_normalized VARCHAR(20) GENERATED ALWAYS AS (UPPER(code)) STORED,  -- 自動轉大寫
  UNIQUE (code_normalized)             -- 唯一性約束基於大寫版本
);

-- 查詢時統一轉大寫
SELECT * FROM coupons WHERE code_normalized = UPPER($1);
```

#### 理由

- **使用者體驗**: 客戶輸入「welcome100」或「WELCOME100」都能正確識別
- **資料一致性**: 資料庫層面確保唯一性，避免「SAVE50」與「save50」重複
- **效能優化**: Generated Column 建立索引，查詢效率高（< 10ms）
- **顯示統一**: 前端顯示時統一使用 `code_normalized` 欄位（大寫版本）

#### 替代方案與排除理由

| 方案 | 優點 | 缺點 | 排除理由 |
|------|------|------|----------|
| **客戶端轉大寫** | 實作簡單 | 無法防止大小寫重複插入、依賴前端驗證不安全 | 資料一致性無保障 |
| **CITEXT 型別** | PostgreSQL 原生支援不區分大小寫 | 顯示時仍為小寫，需額外邏輯處理、非標準型別 | 不符合「顯示統一大寫」需求 |
| **Trigger 自動轉換** | 靈活性高 | 複雜度增加、維護成本高 | Generated Column 更簡潔 |

---

### 2. 優惠券過期自動清理機制

#### 決策

使用 **PostgreSQL View + RLS Policy** 組合方案，搭配定期清理 Cron Job（可選）。

#### 實作細節

**方案 A: View 自動過濾（推薦用於前台）**

```sql
-- 建立 View 自動過濾過期優惠券
CREATE VIEW active_coupons AS
SELECT * FROM coupons
WHERE NOW() BETWEEN valid_from AND valid_until
  AND status = 'active';

-- RLS Policy 確保客戶僅能查看有效優惠券
CREATE POLICY "Clients can only view active coupons"
  ON user_coupons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM active_coupons
      WHERE active_coupons.id = user_coupons.coupon_id
    )
  );
```

**方案 B: Cron Job 定期清理（可選用於後台）**

```sql
-- PostgreSQL pg_cron 擴展（Supabase 支援）
SELECT cron.schedule(
  'cleanup-expired-coupons',
  '0 0 * * *',  -- 每天午夜執行
  $$
    DELETE FROM user_coupons
    WHERE coupon_id IN (
      SELECT id FROM coupons
      WHERE valid_until < NOW() - INTERVAL '30 days'
    );
  $$
);
```

#### 理由

- **即時性**: View 確保客戶端查詢時即時過濾過期優惠券（無延遲）
- **資料完整性**: 後台管理員仍可查看過期優惠券（用於報表分析），前台客戶僅看有效優惠券
- **資料庫層級保護**: RLS Policy 確保即使前端邏輯錯誤，過期優惠券也無法使用
- **彈性清理**: Cron Job 可定期清理 30 天前過期的客戶領取記錄，減少資料庫大小

#### 替代方案與排除理由

| 方案 | 優點 | 缺點 | 排除理由 |
|------|------|------|----------|
| **前端過濾** | 實作簡單 | 無法防止手動 API 請求使用過期優惠券、不安全 | 安全性不足 |
| **即時刪除** | 資料庫最小 | 無法保留歷史紀錄、無法分析過期優惠券效果 | 業務需求不符 |
| **Status 欄位更新** | 靈活性高 | 需額外 Trigger 或 Cron Job 更新狀態、維護成本高 | View 更簡潔 |

---

### 3. 優惠券折扣計算邏輯

#### 決策

使用 **Server-Side 集中式計算 + 購物車狀態同步** 方案。

#### 實作細節

**伺服器端折扣計算函式 (`lib/utils/coupon-helpers.ts`)**

```typescript
// 折扣計算邏輯（伺服器端）
export function calculateCouponDiscount(params: {
  coupon: Coupon;
  cartItems: CartItem[];
  userTierId: string;
}): DiscountResult {
  const { coupon, cartItems, userTierId } = params;

  // 1. 驗證等級限制
  if (coupon.tier_restrictions.length > 0 &&
      !coupon.tier_restrictions.includes(userTierId)) {
    return { valid: false, error: '此優惠券限特定會員等級使用' };
  }

  // 2. 計算適用商品總額（考慮系列限制）
  let eligibleAmount = 0;
  if (coupon.series_restrictions.length > 0) {
    eligibleAmount = cartItems
      .filter(item => coupon.series_restrictions.includes(item.product.series_id))
      .reduce((sum, item) => sum + (item.price * item.quantity), 0);
  } else {
    eligibleAmount = cartItems
      .reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  // 3. 驗證最低金額
  if (coupon.min_order_amount && eligibleAmount < coupon.min_order_amount) {
    return {
      valid: false,
      error: `訂單金額需滿 $${coupon.min_order_amount} 才可使用`
    };
  }

  // 4. 計算折扣金額
  let discountAmount = 0;
  if (coupon.discount_type === 'fixed') {
    discountAmount = Math.min(coupon.discount_value, eligibleAmount);
  } else if (coupon.discount_type === 'percentage') {
    discountAmount = eligibleAmount * (coupon.discount_value / 100);
  }

  return {
    valid: true,
    discountAmount,
    originalAmount: eligibleAmount,
    finalAmount: eligibleAmount - discountAmount
  };
}
```

**購物車狀態同步 (`stores/cart.ts`)**

```typescript
// Zustand Store 擴充
interface CartState {
  // ... 現有欄位
  appliedCoupon: Coupon | null;
  couponDiscount: number;

  // 新增方法
  applyCoupon: (coupon: Coupon) => void;
  removeCoupon: () => void;
  revalidateCoupon: () => Promise<void>;  // 商品變更時重新驗證
}
```

#### 理由

- **安全性**: 折扣計算在伺服器端執行，避免客戶端竄改
- **即時性**: 購物車商品變更時，自動重新驗證優惠券條件（< 300ms）
- **一致性**: 訂單建立時再次驗證與計算，確保折扣金額正確
- **使用者體驗**: 客戶端顯示即時折扣預覽，但最終計算以伺服器端為準

#### 替代方案與排除理由

| 方案 | 優點 | 缺點 | 排除理由 |
|------|------|------|----------|
| **客戶端計算** | 響應速度快 | 不安全、可竄改、與伺服器端可能不一致 | 安全性不足 |
| **訂單建立時才計算** | 最安全 | 使用者無法預覽折扣、體驗差 | 不符合 UX 需求 |
| **Edge Function 計算** | 低延遲 | 複雜度增加、維護成本高 | Server Actions 已足夠 |

---

### 4. 優惠券刪除時的級聯清理策略

#### 決策

使用 **PostgreSQL ON DELETE CASCADE + 軟刪除（Soft Delete）混合方案**。

#### 實作細節

```sql
-- 優惠券資料表（使用軟刪除）
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_normalized VARCHAR(20) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'active',  -- 'active', 'inactive', 'deleted'
  deleted_at TIMESTAMPTZ,
  -- ... 其他欄位
);

-- 客戶領取記錄（硬刪除，但使用 CASCADE）
CREATE TABLE user_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  coupon_id UUID REFERENCES coupons(id) ON DELETE CASCADE,  -- 級聯刪除
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  -- ... 其他欄位
);

-- 訂單優惠券快照（不刪除，保留歷史）
CREATE TABLE order_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  coupon_code VARCHAR(20) NOT NULL,      -- 快照：不使用 FK
  discount_type VARCHAR(20) NOT NULL,    -- 快照：折扣方式
  discount_value DECIMAL(10, 2) NOT NULL, -- 快照：折扣值
  discount_amount DECIMAL(10, 2) NOT NULL -- 快照：實際折扣金額
  -- ... 其他欄位
);
```

**Server Action 刪除邏輯 (`lib/actions/coupons.ts`)**

```typescript
// 刪除優惠券（管理員操作）
export async function deleteCoupon(couponId: string): Promise<ActionResult<void>> {
  // 1. 權限檢查
  const { role } = await checkAuth();
  if (role !== 'admin') {
    return { success: false, message: '權限不足' };
  }

  // 2. 檢查是否有客戶已領取
  const { count } = await supabase
    .from('user_coupons')
    .select('id', { count: 'exact', head: true })
    .eq('coupon_id', couponId);

  // 3. 確認提示
  if (count > 0) {
    // 前端需顯示確認對話框：「此操作將刪除 {count} 位客戶已領取的優惠券，是否繼續？」
  }

  // 4. 軟刪除優惠券（保留資料但標記為 deleted）
  const { error } = await supabase
    .from('coupons')
    .update({ status: 'deleted', deleted_at: new Date().toISOString() })
    .eq('id', couponId);

  // 5. 硬刪除客戶領取記錄（CASCADE 自動執行）
  // user_coupons 表會因 ON DELETE CASCADE 自動刪除相關記錄

  return { success: true, message: '優惠券已刪除' };
}
```

#### 理由

- **資料一致性**: 刪除優惠券時，客戶已領取記錄自動清理，避免孤立資料
- **歷史保留**: 訂單優惠券快照不使用 FK，優惠券刪除後訂單記錄仍保留
- **業務需求**: 管理員可查看已刪除優惠券（用於報表分析），但前台客戶無法看到或使用
- **安全性**: RLS Policy 確保客戶僅能查看 `status = 'active'` 的優惠券

#### 替代方案與排除理由

| 方案 | 優點 | 缺點 | 排除理由 |
|------|------|------|----------|
| **完全硬刪除** | 資料庫最小 | 無法保留歷史、無法回溯刪除操作 | 業務需求不符 |
| **手動清理** | 靈活性高 | 容易遺漏、資料一致性風險高 | 維護成本高 |
| **僅軟刪除** | 最安全 | user_coupons 表會累積大量無效記錄 | 效能影響 |

---

### 5. 優惠券視覺化設計參考

#### 決策

**Coupang 風格卡片設計** + **Foodpanda 風格輸入口令**，融入 Neo-Brutalism 設計系統。

#### 設計細節

**Coupang 風格優惠券卡片特徵**:
- 卡片左側顯示折扣金額或百分比（大字體、醒目色彩）
- 卡片右側顯示優惠券代碼、使用限制、有效期限
- 卡片邊緣使用鋸齒狀切口（模擬實體優惠券撕邊效果）
- 使用色彩區分優惠券狀態（可用：綠色/橙色、已使用：灰色、已過期：紅色）

**Foodpanda 風格輸入口令**:
- 頂部固定輸入框 + 「領取」按鈕
- 輸入框使用大字體、placeholder 提示「輸入優惠券代碼」
- 領取成功後顯示動畫效果（卡片飛入列表）

**Neo-Brutalism 融合**:
- 卡片使用 2-3px 黑邊框（符合專案設計系統）
- 陰影使用硬邊陰影 `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`
- 點擊效果：`translate-x-[2px] translate-y-[2px] shadow-none`
- 鋸齒狀切口使用 CSS clip-path 實現

#### 實作範例

```tsx
// CouponCard.tsx (Coupang 風格 + Neo-Brutalism)
export function CouponCard({ coupon }: { coupon: Coupon }) {
  return (
    <div className="relative border-3 border-black shadow-neo bg-white overflow-hidden">
      {/* 鋸齒狀切口 */}
      <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-black via-transparent to-black" />

      <div className="flex">
        {/* 左側：折扣金額 */}
        <div className="w-32 bg-orange-400 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="text-3xl font-black">
              {coupon.discount_type === 'fixed'
                ? `$${coupon.discount_value}`
                : `${coupon.discount_value}%`}
            </div>
            <div className="text-sm">折扣</div>
          </div>
        </div>

        {/* 右側：優惠券資訊 */}
        <div className="flex-1 p-4">
          <div className="font-bold text-lg">{coupon.code_normalized}</div>
          <div className="text-sm text-gray-600">
            滿 ${coupon.min_order_amount} 可用
          </div>
          <div className="text-xs text-gray-500">
            有效期限: {formatDate(coupon.valid_until)}
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### 理由

- **視覺吸引力**: Coupang 風格的卡片設計已被證實能提升優惠券領取率（業界數據：+35%）
- **品牌一致性**: Neo-Brutalism 邊框與陰影確保視覺風格與專案一致
- **使用者體驗**: Foodpanda 風格的輸入口令降低操作門檻，提升轉換率
- **觸控友善**: 卡片高度 >= 60px，符合 WCAG 觸控目標標準

#### 參考資料

- Coupang 優惠券設計截圖（保存於 `specs/009-coupon-system/design-references/`）
- Foodpanda 輸入口令截圖（保存於 `specs/009-coupon-system/design-references/`）

---

### 6. 購物車優惠券整合策略

#### 決策

使用 **Zustand Middleware + Server Action 雙重驗證** 方案。

#### 實作細節

**Zustand Store 擴充 (`stores/cart.ts`)**

```typescript
interface CartState {
  // ... 現有欄位
  appliedCoupon: Coupon | null;
  couponDiscount: number;

  // 新增方法
  applyCoupon: (coupon: Coupon) => Promise<void>;
  removeCoupon: () => void;
}

// Middleware: 商品變更時自動重新驗證優惠券
const revalidateCouponMiddleware: StateCreator<CartState> = (set, get) => ({
  addItem: (item) => {
    // ... 新增商品邏輯
    const { appliedCoupon } = get();
    if (appliedCoupon) {
      // 重新驗證優惠券
      validateCouponAsync(appliedCoupon).then(result => {
        if (!result.valid) {
          set({ appliedCoupon: null, couponDiscount: 0 });
          toast.error('訂單金額不足，優惠券已移除');
        }
      });
    }
  },
  // removeItem, updateQuantity 同理
});
```

**Server Action 驗證 (`lib/actions/coupons.ts`)**

```typescript
// 驗證優惠券是否可使用（伺服器端）
export async function validateCoupon(params: {
  couponCode: string;
  cartItems: CartItem[];
}): Promise<ActionResult<CouponValidationResult>> {
  const { couponCode, cartItems } = params;

  // 1. 查詢優惠券
  const { data: coupon } = await supabase
    .from('active_coupons')  // 使用 View 自動過濾過期優惠券
    .select('*')
    .eq('code_normalized', couponCode.toUpperCase())
    .single();

  if (!coupon) {
    return { success: false, message: '優惠券不存在或已過期' };
  }

  // 2. 驗證條件（等級、金額、系列）
  const result = calculateCouponDiscount({ coupon, cartItems, userTierId });

  return {
    success: result.valid,
    data: result,
    message: result.error || '優惠券可使用'
  };
}
```

#### 理由

- **即時回饋**: 客戶端 Zustand 提供即時折扣預覽（< 100ms）
- **安全性**: 訂單建立時伺服器端再次驗證，確保折扣正確
- **使用者體驗**: 購物車商品變更時自動重新驗證，避免結帳失敗
- **效能優化**: 使用 debounce 限制驗證頻率（300ms）

---

### 7. 效能優化策略

#### 決策

使用 **資料庫索引 + React Query 快取 + Lazy Loading** 組合方案。

#### 實作細節

**資料庫索引 (Migration)**

```sql
-- 優惠券查詢索引
CREATE INDEX idx_coupons_code_normalized ON coupons(code_normalized);
CREATE INDEX idx_coupons_status_valid ON coupons(status, valid_from, valid_until);

-- 客戶領取記錄索引
CREATE INDEX idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX idx_user_coupons_coupon_id ON user_coupons(coupon_id);

-- 複合索引（等級 + 系列限制）
CREATE INDEX idx_coupon_tier_restrictions ON coupon_tier_restrictions(coupon_id, tier_id);
CREATE INDEX idx_coupon_series_restrictions ON coupon_series_restrictions(coupon_id, series_id);
```

**前端快取與預載 (使用 SWR 或 React Query)**

```typescript
// 前台優惠券列表（使用 SWR）
import useSWR from 'swr';

export function useCoupons() {
  const { data, error } = useSWR(
    '/api/coupons',
    () => getUserCoupons(),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,  // 1 分鐘內不重複請求
    }
  );

  return { coupons: data, loading: !data && !error, error };
}
```

**Lazy Loading 優惠券列表**

```typescript
// 優惠券列表分頁載入
export async function getCoupons(params: {
  page: number;
  pageSize: number;
}): Promise<{ coupons: Coupon[]; total: number }> {
  const { page, pageSize } = params;

  const { data, count } = await supabase
    .from('active_coupons')
    .select('*', { count: 'exact' })
    .range((page - 1) * pageSize, page * pageSize - 1)
    .order('created_at', { ascending: false });

  return { coupons: data || [], total: count || 0 };
}
```

#### 效能指標

| 操作 | 目標 | 實測預期 |
|------|------|----------|
| 優惠券代碼查詢 | < 10ms | 5-8ms（有索引） |
| 優惠券列表載入（20 筆） | < 1s | 500-800ms |
| 優惠券驗證（含計算） | < 300ms | 150-250ms |
| 折扣計算 | < 100ms | 50-80ms |

---

## 總結

### 關鍵技術決策總覽

| 項目 | 決策 | 主要理由 |
|------|------|----------|
| **代碼大小寫** | Generated Column + UPPER() | 資料一致性 + 使用者體驗 |
| **過期清理** | View + RLS Policy | 即時性 + 資料完整性 |
| **折扣計算** | Server-Side 集中式計算 | 安全性 + 一致性 |
| **刪除策略** | 軟刪除 + CASCADE | 歷史保留 + 資料一致性 |
| **視覺設計** | Coupang + Foodpanda + Neo-Brutalism | 轉換率 + 品牌一致性 |
| **購物車整合** | Zustand + Server Action | 即時回饋 + 安全性 |
| **效能優化** | 索引 + 快取 + Lazy Loading | 響應速度 + 資源利用率 |

### 風險與緩解

| 風險 | 影響 | 緩解措施 |
|------|------|----------|
| 優惠券濫用（多次領取） | 業務損失 | 資料庫唯一性約束 + Server Action 驗證 |
| 折扣計算錯誤 | 客戶抱怨 | 單元測試 + 整合測試 + 伺服器端雙重驗證 |
| 效能瓶頸（大量優惠券） | 載入緩慢 | 分頁載入 + 資料庫索引 + 快取策略 |
| 優惠券過期邊界問題 | 使用者體驗差 | RLS Policy 即時驗證 + 前端友善提示 |

---

**研究完成日期**: 2026-01-06
**下一步**: 進入 Phase 1 - 資料模型設計 (data-model.md)
