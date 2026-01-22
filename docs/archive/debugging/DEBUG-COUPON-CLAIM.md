# 優惠券領取問題 Debug 指南

## 問題現象
- 前台輸入 `2024WIN` 優惠券代碼後沒有任何反應
- 沒有出現成功或失敗的 toast 提示
- 瀏覽器 Console 沒有錯誤訊息

---

## Debug 步驟

### 步驟 1: 開啟 Supabase Studio

1. 瀏覽器前往：http://127.0.0.1:54323
2. 左側選單 → **SQL Editor**
3. 點擊 **New Query**

---

### 步驟 2: 執行診斷 SQL（最重要！）

**複製以下完整 SQL 並執行：**

```sql
-- ============================================================================
-- 診斷 2024WIN 優惠券
-- ============================================================================

-- 【檢查 1】優惠券是否存在
SELECT
  '【檢查 1】優惠券是否存在' AS test_name,
  id,
  code,
  code_normalized,
  discount_type,
  discount_value,
  claim_limit,
  status,
  valid_from,
  valid_until,
  NOW() AS current_time
FROM coupons
WHERE code_normalized = '2024WIN'
ORDER BY created_at DESC
LIMIT 1;

-- 【檢查 2】是否在 active_coupons view 中（這個最關鍵！）
SELECT
  '【檢查 2】是否在 active_coupons view 中' AS test_name,
  *
FROM active_coupons
WHERE code_normalized = '2024WIN';

-- 【檢查 3】日期與狀態檢查
SELECT
  '【檢查 3】日期與狀態檢查' AS test_name,
  code_normalized,
  status,
  NOW() AS current_time,
  valid_from,
  valid_until,
  CASE
    WHEN status != 'active' THEN '❌ 狀態未啟用 (status = ' || status || ')'
    WHEN NOW() < valid_from THEN '❌ 尚未生效（開始時間在未來）'
    WHEN NOW() > valid_until THEN '❌ 已過期'
    WHEN NOW() BETWEEN valid_from AND valid_until AND status = 'active' THEN '✅ 通過'
    ELSE '❓ 未知錯誤'
  END AS validity_status
FROM coupons
WHERE code_normalized = '2024WIN'
ORDER BY created_at DESC
LIMIT 1;

-- 【檢查 4】claim_limit 欄位是否存在
SELECT
  '【檢查 4】claim_limit 欄位是否存在' AS test_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'coupons'
  AND column_name = 'claim_limit';

-- 【檢查 5】RLS Policy 是否允許 INSERT
SELECT
  '【檢查 5】RLS INSERT Policy' AS test_name,
  policyname,
  cmd,
  roles,
  with_check
FROM pg_policies
WHERE tablename = 'user_coupons'
  AND cmd = 'INSERT';

-- 【檢查 6】是否有用戶已領取
SELECT
  '【檢查 6】已領取記錄' AS test_name,
  COUNT(*) AS claimed_count
FROM user_coupons
WHERE coupon_id IN (
  SELECT id FROM coupons WHERE code_normalized = '2024WIN'
);
```

---

### 步驟 3: 判斷問題類型

#### 情況 A: 檢查 1 有結果，但檢查 2 沒有結果
**原因**: `active_coupons` view 過濾掉優惠券（日期過期或狀態錯誤）

**解決方案**:
```sql
-- 修復日期與狀態
UPDATE coupons
SET
  status = 'active',
  valid_from = NOW(),
  valid_until = NOW() + INTERVAL '90 days',
  updated_at = NOW()
WHERE code_normalized = '2024WIN';

-- 驗證修復
SELECT * FROM active_coupons WHERE code_normalized = '2024WIN';
```

---

#### 情況 B: 檢查 4 沒有結果（claim_limit 欄位不存在）
**原因**: Migration `20260120_add_coupon_claim_limit.sql` 未執行

**解決方案**:
```bash
# 重置資料庫並執行所有 Migrations
supabase db reset
```

**注意**: 這會清空所有資料！如果有重要資料請先備份。

---

#### 情況 C: 檢查 5 沒有結果（INSERT Policy 不存在）
**原因**: RLS Policy 未建立

**解決方案**:
```sql
-- 手動建立 INSERT Policy
CREATE POLICY "Clients can claim coupons"
  ON user_coupons FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
```

---

#### 情況 D: 所有檢查都通過，但前台仍無法領取
**原因**: 前端 JavaScript 錯誤

**Debug 步驟**:
1. 開啟瀏覽器開發者工具（F12）
2. 切換到 **Console** 標籤
3. 清空 Console（🚫 圖示）
4. 輸入優惠券代碼 `2024WIN` 並點擊「領取」
5. 觀察 Console 是否有紅色錯誤訊息
6. 切換到 **Network** 標籤，查看 POST 請求的 Response

**檢查 Network Response**:
- 找到 `claimCoupon` 或類似的 POST 請求
- 點擊查看 **Response** 標籤
- 應該會看到 `{ success: false, message: "..." }` 或錯誤訊息

---

### 步驟 4: 手動測試領取（模擬前端行為）

如果前面檢查都通過，可以用 SQL 手動測試領取：

```sql
-- 【手動測試】模擬客戶領取優惠券
DO $$
DECLARE
  v_coupon_id UUID;
  v_user_id UUID;
BEGIN
  -- 取得優惠券 ID
  SELECT id INTO v_coupon_id
  FROM active_coupons
  WHERE code_normalized = '2024WIN';

  IF v_coupon_id IS NULL THEN
    RAISE EXCEPTION '優惠券不存在於 active_coupons view';
  END IF;

  -- 使用當前登入用戶（需要從前端複製 user_id）
  -- 替換成你的實際 user_id：
  v_user_id := '你的-user-id-在這裡';

  -- 嘗試插入領取記錄
  INSERT INTO user_coupons (user_id, coupon_id)
  VALUES (v_user_id, v_coupon_id);

  RAISE NOTICE '領取成功！';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '領取失敗: %', SQLERRM;
END $$;
```

---

## 常見錯誤與解決方案

### 錯誤 1: "優惠券不存在或已過期"
```sql
-- 檢查是否在 active_coupons 中
SELECT * FROM active_coupons WHERE code_normalized = '2024WIN';

-- 如果沒有結果，修復日期
UPDATE coupons
SET valid_until = NOW() + INTERVAL '90 days'
WHERE code_normalized = '2024WIN';
```

### 錯誤 2: "您已領取過此優惠券"
```sql
-- 檢查已領取次數
SELECT COUNT(*) AS claimed_count, c.claim_limit
FROM user_coupons uc
JOIN coupons c ON uc.coupon_id = c.id
WHERE c.code_normalized = '2024WIN'
  AND uc.user_id = '你的-user-id'
GROUP BY c.claim_limit;

-- 如果需要增加領取次數
UPDATE coupons
SET claim_limit = 5
WHERE code_normalized = '2024WIN';
```

### 錯誤 3: "權限不足" 或 RLS Policy 錯誤
```sql
-- 檢查 RLS Policies
SELECT * FROM pg_policies WHERE tablename = 'user_coupons';

-- 暫時關閉 RLS 測試（僅用於 Debug！）
ALTER TABLE user_coupons DISABLE ROW LEVEL SECURITY;

-- 測試後記得重新啟用
ALTER TABLE user_coupons ENABLE ROW LEVEL SECURITY;
```

---

## 如何取得當前登入用戶的 user_id

### 方法 1: 前端 Console 執行
```javascript
// 在瀏覽器 Console 執行
const { data: { user } } = await window.supabase.auth.getUser();
console.log('User ID:', user?.id);
```

### 方法 2: Supabase Studio 查詢
```sql
-- 查詢所有用戶（找到你的手機號碼對應的 ID）
SELECT
  id,
  phone,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC;
```

---

## 預期的正常流程

當一切正常時，執行診斷 SQL 應該看到：

1. ✅ 【檢查 1】返回 1 筆優惠券記錄
2. ✅ 【檢查 2】返回 1 筆優惠券記錄（與檢查 1 相同）
3. ✅ 【檢查 3】validity_status 顯示 `✅ 通過`
4. ✅ 【檢查 4】返回 claim_limit 欄位資訊
5. ✅ 【檢查 5】返回至少 1 個 INSERT Policy
6. ✅ 【檢查 6】返回 0（尚未有人領取）

---

## 下一步

**請執行「步驟 2」的診斷 SQL，並將所有查詢結果截圖回報！**

特別關注：
- 【檢查 2】是否有結果（最關鍵！）
- 【檢查 3】validity_status 的值
- 【檢查 4】是否找到 claim_limit 欄位

根據結果我會告訴你確切的修復方案。
