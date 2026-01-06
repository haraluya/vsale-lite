# 優惠券領取問題排查指南

## 問題：輸入優惠券代碼後無法領取（無反應）

### 根本原因

當優惠券的「結束時間 (valid_until)」已經過期時，優惠券會被 `active_coupons` view 自動過濾，導致客戶無法領取。

**技術細節**：
- `claimCoupon` Server Action 從 `active_coupons` view 查詢優惠券
- `active_coupons` view 只顯示 `NOW() BETWEEN valid_from AND valid_until` 的優惠券
- 如果優惠券過期，查詢會返回空結果，但不會顯示錯誤訊息（因為程式認為優惠券不存在）

---

## 快速修復：更新 OKR100 優惠券有效期限

### 方法 1：使用 Supabase Studio（推薦）

1. 開啟 Supabase Studio: http://127.0.0.1:54323
2. 左側選單 → **SQL Editor**
3. 點擊 **New Query**
4. 複製並執行以下 SQL：

```sql
-- 更新 OKR100 優惠券有效期限（延長 90 天）
UPDATE coupons
SET
  valid_from = NOW(),
  valid_until = NOW() + INTERVAL '90 days',
  updated_at = NOW()
WHERE code_normalized = 'OKR100';

-- 驗證結果
SELECT
  code,
  status,
  valid_from,
  valid_until,
  NOW() AS current_time,
  CASE
    WHEN NOW() BETWEEN valid_from AND valid_until THEN '✅ 有效'
    ELSE '❌ 已過期'
  END AS validity_status
FROM coupons
WHERE code_normalized = 'OKR100';
```

5. 確認第二個查詢結果顯示 `✅ 有效`
6. 回到前台測試領取優惠券

### 方法 2：執行 SQL 腳本檔案

專案根目錄已準備好修復腳本：

```bash
# 在專案根目錄執行
cat fix-okr100-expiry.sql
```

然後將腳本內容複製到 Supabase Studio 執行。

---

## 預防未來問題

### 1. 使用後台表單時的注意事項

後台優惠券表單（`/admin/coupons/new`）已新增以下改善：

- ✅ 預設「結束時間」為 30 天後
- ⚠️ 橘色警告提示：「優惠券過期後將無法領取」
- 📝 建議設定較長期限（30-90 天）

**建立優惠券時請確保**：
1. 「開始時間」設定為現在或未來
2. 「結束時間」設定在未來（至少 30 天）
3. 檢查兩個日期是否正確（避免時區問題）

### 2. 檢查優惠券是否有效

#### 方法 A：Supabase Studio 查詢

```sql
-- 查詢特定優惠券是否有效
SELECT
  code,
  status,
  valid_from,
  valid_until,
  NOW() AS current_time,
  CASE
    WHEN NOW() BETWEEN valid_from AND valid_until THEN '✅ 有效'
    WHEN NOW() < valid_from THEN '⏳ 尚未生效'
    WHEN NOW() > valid_until THEN '❌ 已過期'
    ELSE '❓ 未知'
  END AS validity_status
FROM coupons
WHERE code_normalized = 'OKR100';
```

#### 方法 B：檢查 active_coupons View

```sql
-- 如果查詢有結果，表示優惠券有效
SELECT * FROM active_coupons WHERE code_normalized = 'OKR100';
```

如果此查詢沒有結果，表示優惠券已過期或未啟用。

---

## 常見問題 FAQ

### Q1: 為什麼 POST 請求返回 200，但沒有實際領取？

A: 因為 Server Action 在查詢 `active_coupons` view 時找不到優惠券（已過期），程式會提前返回錯誤訊息，不會執行 INSERT 操作。由於這是正常的錯誤處理流程，HTTP 狀態碼仍然是 200。

### Q2: 如何批次更新所有過期優惠券？

```sql
-- 將所有已過期的優惠券延長 90 天
UPDATE coupons
SET
  valid_until = NOW() + INTERVAL '90 days',
  updated_at = NOW()
WHERE valid_until < NOW()
  AND status = 'active';
```

### Q3: 如何查詢所有即將過期的優惠券（7 天內）？

```sql
SELECT
  code,
  valid_from,
  valid_until,
  EXTRACT(DAY FROM (valid_until - NOW())) AS days_remaining
FROM coupons
WHERE status = 'active'
  AND valid_until BETWEEN NOW() AND NOW() + INTERVAL '7 days'
ORDER BY valid_until ASC;
```

---

## 技術細節：active_coupons View 定義

```sql
CREATE VIEW active_coupons AS
SELECT * FROM coupons
WHERE status = 'active'
  AND NOW() BETWEEN valid_from AND valid_until;
```

**過濾條件**：
1. `status = 'active'` - 優惠券狀態為啟用
2. `NOW() BETWEEN valid_from AND valid_until` - 當前時間在有效期限內

**影響範圍**：
- ❌ 過期優惠券不會出現在此 view
- ❌ 未生效優惠券不會出現在此 view
- ❌ 已停用優惠券不會出現在此 view

---

## 相關檔案位置

- Migration: `supabase/migrations/20260119_create_coupons.sql`
- Server Action: `lib/actions/coupons.ts` (claimCoupon 函式)
- 後台表單: `components/admin/coupons/CouponForm.tsx`
- 前台輸入: `components/shop/coupons/CouponCodeInput.tsx`
- 修復腳本: `fix-okr100-expiry.sql`

---

**最後更新**: 2026-01-06
**適用版本**: 009-coupon-system
