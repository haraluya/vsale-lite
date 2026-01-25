# 優惠券扣減與退還功能測試報告

**日期**: 2026-01-09
**修復版本**: Migration `20260109082841_fix_coupon_restore_on_cancel.sql`

---

## 問題分析

### 原始問題
用戶反映：「優惠券在使用後不會扣掉，取消訂單後也沒有退回」

### 根本原因分析

經過程式碼審查與實際測試，發現兩個關鍵問題：

#### 1. **訂單建立時優惠券標記邏輯** ⚠️ 程式碼正確但 RLS 阻擋
**檔案**: `lib/actions/orders.ts:321-328`

```typescript
// 更新 user_coupons.used_at 與 order_id（使用 userCouponId）
const { error: updateUserCouponError } = await supabase
  .from('user_coupons')
  .update({
    used_at: new Date().toISOString(),
    order_id: order.id,
  })
  .eq('id', couponData.userCouponId)
```

**問題**: 程式碼邏輯正確，但 **RLS Policy 阻擋 UPDATE 操作**
- ✅ 程式碼嘗試更新 `used_at` 與 `order_id`
- ❌ `user_coupons` 表只有 `SELECT` 與 `INSERT` Policy
- ❌ **缺少 `UPDATE` Policy**，導致客戶無法標記優惠券為已使用
- 錯誤被靜默忽略（Line 330-332 只記錄但不回滾）

#### 2. **訂單取消時優惠券未退還** ❌ 兩個問題
**檔案**: `supabase/migrations/20260107130000_shipping_and_custom_fees.sql:292-354`

**問題 2.1**: PostgreSQL 函數未處理優惠券退還
- `cancel_order_and_restore_stock()` 函數只回補庫存
- **沒有重置 `user_coupons.used_at` 與 `order_id`**
- 導致優惠券無法再次使用

**問題 2.2**: 即使函數正確，也會被 RLS 阻擋
- 管理員呼叫函數時，函數內的 UPDATE 操作會被 RLS 檢查
- **缺少管理員 UPDATE Policy**，導致函數無法更新 `user_coupons`

---

## 修復方案

### Migration 1: `20260109082841_fix_coupon_restore_on_cancel.sql`

**核心修改**:
```sql
-- 4. 🆕 退還優惠券（重置 used_at 與 order_id，讓客戶可再次使用）
UPDATE user_coupons
SET used_at = NULL, order_id = NULL
WHERE order_id = p_order_id;
```

**完整流程**:
1. 驗證訂單狀態（pending 或 shipping）
2. 更新訂單狀態為 `cancelled`
3. 回補庫存（僅 shipping 狀態訂單）
4. **🆕 退還優惠券**（重置 `used_at` 與 `order_id`）
5. 記錄操作歷史

### Migration 2: `20260109083649_fix_user_coupons_update_policy.sql` 🔑 **關鍵修復**

**核心問題**: RLS Policy 阻擋 UPDATE 操作

**解決方案**: 新增兩個 UPDATE Policy

```sql
-- 客戶可標記自己的優惠券為已使用（訂單建立時）
CREATE POLICY "Clients can mark their coupons as used"
  ON user_coupons FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 管理員可更新所有客戶優惠券（訂單取消時退還）
CREATE POLICY "Admins can update all user coupons"
  ON user_coupons FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

**影響**:
- ✅ 客戶建立訂單時可標記優惠券為已使用
- ✅ 管理員取消訂單時可退還優惠券
- ✅ PostgreSQL 函數 `cancel_order_and_restore_stock()` 不再被 RLS 阻擋

---

## 測試場景

### 場景 1: 訂單建立後優惠券扣減

**步驟**:
1. 客戶領取優惠券 → `user_coupons` 記錄建立（`used_at = NULL`）
2. 客戶下單並使用優惠券 → 呼叫 `createOrder()`
3. 檢查 `user_coupons` 表

**預期結果**:
```sql
SELECT id, used_at, order_id FROM user_coupons WHERE id = '<user_coupon_id>';

-- 應顯示：
-- used_at: '2026-01-09T08:30:00.000Z'
-- order_id: '<order_id>'
```

**實際結果**:
- ❌ 修復前：RLS 阻擋，優惠券未標記
- ✅ 修復後：通過（Migration 2 新增 UPDATE Policy）

---

### 場景 2: 訂單取消後優惠券退還

**步驟**:
1. 管理員取消訂單 → 呼叫 `cancelOrder()` → 觸發 `cancel_order_and_restore_stock()`
2. 檢查 `user_coupons` 表

**預期結果**:
```sql
SELECT id, used_at, order_id FROM user_coupons WHERE id = '<user_coupon_id>';

-- 應顯示：
-- used_at: NULL
-- order_id: NULL
```

**實際結果**:
- ❌ 修復前：函數未處理優惠券 + RLS 阻擋
- ✅ 修復後：通過（Migration 1 新增退還邏輯 + Migration 2 新增 UPDATE Policy）

---

### 場景 3: 退還的優惠券可再次使用

**步驟**:
1. 客戶再次下單 → 使用同一張優惠券
2. 驗證優惠券驗證邏輯（`validateCoupon()`）

**預期結果**:
- 優惠券驗證通過（`used_at = NULL`）
- 訂單建立成功
- 優惠券再次標記為已使用

**實際結果**: ✅ 通過

---

## 功能驗證清單

| 項目 | 修復前 | 修復後 | 說明 |
|------|--------|--------|------|
| 訂單建立時扣減優惠券 | ❌ RLS 阻擋 | ✅ 正常 | Migration 2 新增 UPDATE Policy |
| 優惠券驗證拒絕重複使用 | ✅ 正常 | ✅ 正常 | `validateCoupon()` 檢查 `used_at` |
| 訂單取消時退還優惠券 | ❌ 未實作 | ✅ 修復 | Migration 1 + 2 完整修復 |
| 退還的優惠券可再次使用 | ❌ 無法退還 | ✅ 正常 | `used_at` 重置後可再次使用 |
| 庫存回補邏輯不受影響 | ✅ 正常 | ✅ 正常 | 僅 shipping 狀態訂單回補庫存 |
| 操作歷史正確記錄 | ✅ 正常 | ✅ 正常 | `order_timelines` 包含優惠券退還資訊 |

---

## 資料庫結構

### `user_coupons` 表結構

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | UUID | 主鍵 |
| `user_id` | UUID | 客戶 ID |
| `coupon_id` | UUID | 優惠券 ID |
| `claimed_at` | TIMESTAMP | 領取時間 |
| `used_at` | TIMESTAMP | 使用時間（NULL = 未使用） |
| `order_id` | UUID | 關聯訂單 ID（NULL = 未使用） |

### 優惠券狀態判斷邏輯

```sql
-- 未使用的優惠券
SELECT * FROM user_coupons WHERE used_at IS NULL;

-- 已使用的優惠券
SELECT * FROM user_coupons WHERE used_at IS NOT NULL;

-- 已退還的優惠券（取消訂單後）
SELECT * FROM user_coupons WHERE used_at IS NULL AND order_id IS NULL;
```

---

## 程式碼檢查清單

### Server Actions (`lib/actions/orders.ts`)

- [x] `createOrder()` - 正確標記優惠券為已使用（Line 321-328）
- [x] `cancelOrder()` - 呼叫 PostgreSQL Function（Line 815）

### PostgreSQL Functions (`supabase/migrations/`)

- [x] `cancel_order_and_restore_stock()` - 已修復優惠券退還邏輯
- [x] 訂單歷史記錄包含優惠券退還資訊

### 前端驗證 (`lib/actions/coupons.ts`)

- [x] `validateCoupon()` - 檢查 `used_at IS NULL`（Line 686-699）
- [x] `getUserCoupons()` - 篩選未使用優惠券（Line 596-600）

---

## 後續建議

### 1. 單元測試
建議新增以下測試案例：
- 優惠券使用後無法重複使用
- 訂單取消後優惠券可再次使用
- 多張優惠券領取與退還

### 2. 邊緣案例處理
- [ ] 訂單刪除時優惠券處理（目前僅支援取消）
- [ ] 優惠券過期後無法使用（已實作於 `active_coupons` View）
- [ ] 優惠券刪除後歷史記錄保留（已實作於 `order_coupons` 快照）

### 3. 使用者體驗優化
- [ ] 前端顯示「已退還」狀態的優惠券
- [ ] 訂單取消成功提示包含優惠券退還資訊（✅ 已實作於操作歷史）

---

## 結論

**修復狀態**: ✅ 完成

**核心問題**:
1. ❌ **RLS Policy 缺失** - `user_coupons` 表缺少 UPDATE Policy（根本原因）
2. ❌ **函數邏輯缺失** - `cancel_order_and_restore_stock()` 未處理優惠券退還

**修復方式**:
1. **Migration 1** (`20260109082841`): 在 `cancel_order_and_restore_stock()` 函數中新增優惠券退還邏輯
2. **Migration 2** (`20260109083649`): 新增 `user_coupons` 表的 UPDATE Policy（客戶 + 管理員）

**影響範圍**:
- 影響訂單建立與取消流程
- 不影響優惠券領取、驗證等其他功能
- 向後相容，不需要修改現有資料

**測試結果**: 所有場景測試通過 ✅

**重要提醒**:
- 原始程式碼邏輯是正確的，但被 RLS Policy 阻擋
- Line 330-332 的錯誤處理導致問題被靜默忽略
- 建議後續改為拋出錯誤或記錄警告日誌

---

**最後更新**: 2026-01-09 (完整修復)
**Migration 檔案**:
- `20260109082841_fix_coupon_restore_on_cancel.sql` (訂單取消時退還優惠券)
- `20260109083649_fix_user_coupons_update_policy.sql` (RLS Policy) 🔑
- `20260109084244_fix_delete_order_restore_coupon.sql` (訂單刪除時退還優惠券)
**修復者**: Claude Sonnet 4.5
