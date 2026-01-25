# 優惠券功能測試指南

**最後更新**: 2026-01-09
**狀態**: ✅ 已修復

---

## 快速測試步驟

### 測試 1: 優惠券扣減（訂單建立）

1. **準備測試資料**
   - 以客戶身分登入前台
   - 確認已領取至少一張未使用的優惠券

2. **執行測試**
   - 加入商品到購物車
   - 在結帳頁面輸入優惠券代碼或選擇優惠券
   - 確認優惠券折扣正確顯示
   - 提交訂單

3. **驗證結果**
   ```sql
   -- 檢查優惠券是否已標記為已使用
   SELECT
     uc.id,
     c.code AS coupon_code,
     uc.used_at,
     uc.order_id,
     o.order_number
   FROM user_coupons uc
   JOIN coupons c ON c.id = uc.coupon_id
   LEFT JOIN orders o ON o.id = uc.order_id
   WHERE uc.user_id = '<your_user_id>'
   ORDER BY uc.claimed_at DESC
   LIMIT 5;
   ```

   **預期結果**:
   - ✅ `used_at` 不為 NULL（已標記使用時間）
   - ✅ `order_id` 不為 NULL（已關聯訂單）
   - ✅ 訂單編號正確顯示

---

### 測試 2: 優惠券退還（訂單取消）

1. **準備測試資料**
   - 使用上個測試建立的訂單（狀態為 `pending`）
   - 確認訂單有使用優惠券

2. **執行測試**
   - 以管理員身分登入後台
   - 進入訂單詳情頁面
   - 點擊「取消訂單」按鈕

---

### 測試 2-2: 優惠券退還（訂單刪除）

1. **準備測試資料**
   - 建立測試訂單（狀態為 `pending`）
   - 確認訂單有使用優惠券

2. **執行測試**
   - 以管理員身分登入後台
   - 進入訂單詳情頁面
   - 點擊「刪除訂單」按鈕（僅 pending 狀態可刪除）

3. **驗證結果**
   ```sql
   -- 檢查優惠券是否已退還
   SELECT
     uc.id,
     c.code AS coupon_code,
     uc.used_at,
     uc.order_id,
     CASE
       WHEN uc.used_at IS NULL THEN '已退還 ✅'
       ELSE '已使用 ❌'
     END AS status
   FROM user_coupons uc
   JOIN coupons c ON c.id = uc.coupon_id
   WHERE uc.user_id = '<your_user_id>'
   ORDER BY uc.claimed_at DESC
   LIMIT 5;
   ```

   **預期結果**:
   - ✅ `used_at` 為 NULL（已重置）
   - ✅ `order_id` 為 NULL（已重置）
   - ✅ 狀態顯示「已退還」

---

### 測試 3: 退還的優惠券可再次使用

1. **執行測試**
   - 使用同一張優惠券再次下單
   - 確認優惠券驗證通過
   - 提交訂單

2. **驗證結果**
   - ✅ 優惠券驗證通過（沒有「已使用」錯誤）
   - ✅ 訂單建立成功
   - ✅ 優惠券再次標記為已使用

---

## 常見問題排查

### 問題 1: 優惠券無法標記為已使用

**症狀**:
- 訂單建立成功
- 但 `user_coupons.used_at` 仍為 NULL

**檢查步驟**:
```sql
-- 1. 檢查 user_coupons 表的 UPDATE Policy
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'user_coupons'
AND cmd = 'UPDATE';

-- 應該有 2 個 UPDATE Policy：
-- 1. Clients can mark their coupons as used
-- 2. Admins can update all user coupons
```

**解決方案**:
- 確認已套用 Migration `20260109083649_fix_user_coupons_update_policy.sql`
- 重新執行 `pnpm db:migrate`

---

### 問題 2: 訂單取消後優惠券未退還

**症狀**:
- 訂單取消成功
- 但 `user_coupons.used_at` 仍有值

**檢查步驟**:
```sql
-- 檢查 cancel_order_and_restore_stock 函數版本
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'cancel_order_and_restore_stock';

-- 函數內應包含：
-- UPDATE user_coupons
-- SET used_at = NULL, order_id = NULL
-- WHERE order_id = p_order_id;
```

**解決方案**:
- 確認已套用 Migration `20260109082841_fix_coupon_restore_on_cancel.sql`
- 確認已套用 Migration `20260109083649_fix_user_coupons_update_policy.sql`
- 重新執行 `pnpm db:migrate`

---

## 完整測試腳本

使用 SQL 腳本自動測試（需手動替換 `<user_id>` 等變數）：

```bash
# 檢查優惠券狀態
cat scripts/check-coupon-status.sql | supabase db reset --local

# 執行完整測試流程
cat scripts/test-coupon-usage.sql | supabase db reset --local
```

---

## Migration 清單

| Migration | 說明 | 狀態 |
|-----------|------|------|
| `20260109082841_fix_coupon_restore_on_cancel.sql` | 修復訂單取消時退還優惠券 | ✅ 已套用 |
| `20260109083649_fix_user_coupons_update_policy.sql` | 修復 RLS Policy（新增 UPDATE） | ✅ 已套用 |
| `20260109084244_fix_delete_order_restore_coupon.sql` | 修復訂單刪除時退還優惠券 | ✅ 已套用 |

---

## 相關文件

- [COUPON_USAGE_TEST.md](./COUPON_USAGE_TEST.md) - 完整測試報告與技術分析
- [scripts/test-coupon-usage.sql](../scripts/test-coupon-usage.sql) - 自動化測試腳本
- [scripts/check-coupon-status.sql](../scripts/check-coupon-status.sql) - 狀態檢查腳本

---

**測試完成後請回報**:
- ✅ 訂單建立時優惠券扣減正常
- ✅ 訂單取消時優惠券退還正常
- ✅ 退還的優惠券可再次使用

有問題請參考 [COUPON_USAGE_TEST.md](./COUPON_USAGE_TEST.md) 的故障排除章節。
