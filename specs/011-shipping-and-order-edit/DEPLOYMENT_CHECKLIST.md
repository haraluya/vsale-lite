# Feature 011: 部署檢查清單

**專案**: Vsale-lite
**功能**: 運費設定與訂單修改系統
**建立日期**: 2026-01-06
**最後更新**: 2026-01-06

---

## 部署前準備

### ⚠️ 重要安全提醒

**絕對禁止**在遠端/生產環境執行 `supabase db reset`！
必須使用 `supabase db push` 推送 Migration（保留現有資料）。

詳見: [資料庫安全協議](../../docs/DATABASE_SAFETY_PROTOCOL.md)

---

## Phase 1: 運費功能部署

### 前置檢查

- [ ] **備份生產環境資料庫**
  ```bash
  # 執行完整備份
  pg_dump -h <host> -p <port> -U postgres -d postgres -F c -f backup_011_phase1_$(date +%Y%m%d_%H%M%S).dump

  # 或使用專案備份腳本
  pnpm deploy:db:backup
  ```

- [ ] **確認本地環境測試通過**
  - [ ] Migration 成功執行
  - [ ] 運費計算函數測試通過
  - [ ] 會員等級運費設定 UI 正常運作
  - [ ] 購物車運費預覽顯示正確
  - [ ] 訂單建立時運費正確儲存

### Migration 1: 運費功能

- [ ] **推送 Migration 到雲端**
  ```bash
  # 確認 Migration 檔案存在
  ls supabase/migrations/20260122_add_shipping_features.sql

  # 推送到雲端（保留現有資料）
  supabase db push
  ```

- [ ] **驗證 Migration 成功執行**
  ```sql
  -- 檢查 tiers 表新增欄位
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'tiers'
    AND column_name IN ('shipping_fee', 'free_shipping_threshold');

  -- 檢查 orders 表新增欄位
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'orders'
    AND column_name = 'shipping_fee';

  -- 檢查 order_custom_fees 表建立成功
  SELECT * FROM information_schema.tables WHERE table_name = 'order_custom_fees';

  -- 檢查函數建立成功
  SELECT proname FROM pg_proc WHERE proname = 'calculate_shipping_fee';
  ```

- [ ] **測試運費計算函數**
  ```sql
  -- 手動呼叫函數（替換 user-id 為實際 UUID）
  SELECT calculate_shipping_fee(
    'user-id'::UUID,
    800.00  -- 商品金額
  );
  -- 預期結果: 100.00 (未滿免運門檻)

  SELECT calculate_shipping_fee(
    'user-id'::UUID,
    1200.00  -- 商品金額
  );
  -- 預期結果: 0.00 (滿足免運門檻)
  ```

### 前端程式碼部署

- [ ] **建置前端程式碼**
  ```bash
  # TypeScript 型別檢查
  pnpm type-check

  # 建置生產版本
  pnpm build
  ```

- [ ] **部署到 Firebase App Hosting**
  ```bash
  # 部署（僅上傳有修改的檔案）
  firebase deploy --only hosting
  ```

### 功能驗證

- [ ] **會員等級運費設定**
  - [ ] 登入後台
  - [ ] 前往會員等級管理 (`/admin/tiers`)
  - [ ] 編輯零售等級
  - [ ] 設定運費: 100 元，滿 1000 免運
  - [ ] 儲存成功並驗證資料庫更新

- [ ] **購物車運費預覽**
  - [ ] 客戶登入前台（零售等級）
  - [ ] 加入商品至購物車（總額 800 元）
  - [ ] 檢查運費顯示: NT$100
  - [ ] 增加商品至 1200 元
  - [ ] 檢查運費顯示: 免運（綠色）

- [ ] **訂單建立與運費儲存**
  - [ ] 建立測試訂單（商品 800 元）
  - [ ] 檢查訂單明細顯示運費 100 元
  - [ ] 檢查資料庫 `orders.shipping_fee` 欄位為 100
  - [ ] 檢查 `total_amount` = 商品金額 + 運費

### Rollback 準備

- [ ] **準備 Rollback 腳本**
  - Rollback 檔案: `rollback/01_rollback_shipping_features.sql`
  - 若部署失敗，執行: `psql -f rollback/01_rollback_shipping_features.sql`

---

## Phase 2: 移除 confirmed 狀態

### 前置檢查

- [ ] **再次備份生產環境資料庫**
  ```bash
  pg_dump -h <host> -p <port> -U postgres -d postgres -F c -f backup_011_phase2_$(date +%Y%m%d_%H%M%S).dump
  ```

- [ ] **檢查現有訂單狀態分佈**
  ```sql
  SELECT status, COUNT(*) FROM orders GROUP BY status;
  ```

### Migration 2: 移除 confirmed 狀態

- [ ] **推送 Migration 到雲端**
  ```bash
  supabase db push
  ```

- [ ] **驗證現有訂單狀態轉換正確**
  ```sql
  -- 檢查是否還有 confirmed 狀態訂單
  SELECT COUNT(*) FROM orders WHERE status = 'confirmed';
  -- 預期結果: 0

  -- 檢查 shipping 狀態訂單數量
  SELECT COUNT(*) FROM orders WHERE status = 'shipping';
  -- 預期結果: 應該包含原本的 confirmed 訂單
  ```

- [ ] **測試新的狀態流程函數**
  ```sql
  -- 建立測試訂單
  INSERT INTO orders (order_number, user_id, total_amount, status)
  VALUES ('TEST-ORDER', 'user-id'::UUID, 1000.00, 'pending');

  -- 測試標記出貨
  SELECT * FROM mark_order_as_shipping('order-id'::UUID, 'admin-id'::UUID);
  -- 預期結果: (true, '訂單已標記為出貨中，庫存已扣減')

  -- 驗證訂單狀態
  SELECT status FROM orders WHERE id = 'order-id'::UUID;
  -- 預期結果: shipping

  -- 驗證庫存扣減（檢查 products.stock）
  ```

### 前端程式碼部署

- [ ] **建置與部署**
  ```bash
  pnpm type-check
  pnpm build
  firebase deploy --only hosting
  ```

### 功能驗證

- [ ] **標記出貨功能**
  - [ ] 登入後台
  - [ ] 前往 pending 狀態訂單
  - [ ] 點擊「標記出貨（扣減庫存）」按鈕
  - [ ] 確認訂單狀態變為 shipping
  - [ ] 檢查商品庫存已扣減

- [ ] **標記完成功能**
  - [ ] 前往 shipping 狀態訂單
  - [ ] 點擊「標記為已完成」按鈕
  - [ ] 確認訂單狀態變為 completed

- [ ] **取消訂單（回補庫存）**
  - [ ] 前往 shipping 狀態訂單
  - [ ] 點擊「取消訂單（回補庫存）」按鈕
  - [ ] 輸入取消原因
  - [ ] 確認訂單狀態變為 cancelled
  - [ ] 檢查商品庫存已回補

### Rollback 準備

- [ ] **準備 Rollback 腳本**
  - Rollback 檔案: `rollback/02_rollback_confirmed_status_removal.sql`
  - ⚠️ 注意: 回滾會恢復 confirmed 狀態與舊函數

---

## Phase 3: 訂單修改功能

### 前置檢查

- [ ] **再次備份生產環境資料庫**
  ```bash
  pg_dump -h <host> -p <port> -U postgres -d postgres -F c -f backup_011_phase3_$(date +%Y%m%d_%H%M%S).dump
  ```

### Migration 3: 修改歷程擴展

- [ ] **推送 Migration 到雲端**
  ```bash
  supabase db push
  ```

- [ ] **驗證 Migration 成功執行**
  ```sql
  -- 檢查 order_timelines.modifications 欄位
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'order_timelines'
    AND column_name = 'modifications';
  -- 預期結果: modifications | jsonb

  -- 檢查 action_type 包含 order_modified
  SELECT consrc FROM pg_constraint
  WHERE conname = 'order_timelines_action_type_check';
  -- 預期結果: 包含 'order_modified'

  -- 檢查函數建立成功
  SELECT proname FROM pg_proc WHERE proname = 'update_order_with_modifications';
  ```

- [ ] **測試批次修改訂單函數**
  ```sql
  -- 建立測試訂單與明細（略）

  -- 測試修改訂單
  SELECT * FROM update_order_with_modifications(
    'order-id'::UUID,
    '{
      "summary": {"old_total": 1000, "new_total": 950, "items_changed": 1, "fees_added": 0},
      "items": [
        {"type": "price_changed", "item_id": "item-id", "product_name": "商品 A", "old_price": 50, "new_price": 40}
      ],
      "fees": [],
      "shipping": null,
      "coupon": null
    }'::JSONB,
    'admin-id'::UUID
  );
  -- 預期結果: (true, '訂單修改成功', 950.00)
  ```

### 前端程式碼部署

- [ ] **建置與部署**
  ```bash
  pnpm type-check
  pnpm build
  firebase deploy --only hosting
  ```

### 功能驗證

- [ ] **訂單編輯器 - 修改商品單價與數量**
  - [ ] 登入後台
  - [ ] 前往 pending 狀態訂單詳情
  - [ ] 點擊「編輯訂單」按鈕
  - [ ] 修改商品單價: 50 → 40 元
  - [ ] 修改商品數量: 10 → 8 個
  - [ ] 檢查即時小計更新
  - [ ] 儲存變更並確認成功

- [ ] **新增自訂費用**
  - [ ] 進入編輯模式
  - [ ] 點擊「新增費用」
  - [ ] 輸入費用名稱: 手續費，金額: 50
  - [ ] 儲存並驗證訂單總額更新

- [ ] **修改運費**
  - [ ] 進入編輯模式
  - [ ] 修改運費: 100 → 0（免運）
  - [ ] 儲存並驗證總額扣除運費

- [ ] **修改歷程顯示**
  - [ ] 客戶登入前台
  - [ ] 前往訂單詳情
  - [ ] 檢查「訂單操作歷史」區塊
  - [ ] 確認修改歷程以黃色背景顯示
  - [ ] 確認顯示所有變更項目（商品、費用、運費、總額）

### Rollback 準備

- [ ] **準備 Rollback 腳本**
  - Rollback 檔案: `rollback/03_rollback_order_modifications.sql`

---

## Phase 4: 部署後驗證

### 監控與日誌檢查

- [ ] **Supabase Logs 監控**
  ```bash
  # 檢查最近 1 小時的錯誤日誌
  supabase logs --type postgres --filter "error" --since 1h

  # 檢查 RPC 函數呼叫日誌
  supabase logs --type api --filter "rpc" --since 1h
  ```

- [ ] **前端 Console 錯誤監控**
  - [ ] 檢查 Browser Console 無錯誤
  - [ ] 檢查 Network 面板 API 呼叫成功率

### 效能驗證

- [ ] **運費計算響應時間**
  - 目標: < 200ms
  - 測試: 購物車載入時計算運費
  - 使用 Chrome DevTools → Network 面板監控

- [ ] **訂單修改儲存響應時間**
  - 目標: < 1s（含 Transaction 提交）
  - 測試: 修改訂單並儲存
  - 使用 Chrome DevTools → Performance 面板監控

- [ ] **修改歷程查詢響應時間**
  - 目標: < 300ms
  - 測試: 載入訂單詳情頁面
  - 使用 Chrome DevTools → Network 面板監控

### 完整測試流程

- [ ] **執行 quickstart.md 所有測試案例**
  - [ ] 測試 1: 運費設定（管理員）
  - [ ] 測試 2: 訂單建立與運費計算（客戶）
    - [ ] 情境 A: 未滿免運門檻
    - [ ] 情境 B: 滿額免運
    - [ ] 情境 C: 優惠券 + 免運門檻
  - [ ] 測試 3: 訂單修改（管理員）
    - [ ] 情境 A: 修改商品單價與數量
    - [ ] 情境 B: 新增自訂費用
    - [ ] 情境 C: 修改運費
  - [ ] 測試 4: 修改歷程查看（客戶 + 管理員）
  - [ ] 測試 5: 訂單狀態流程（管理員）
    - [ ] 情境 A: 標記出貨並扣減庫存
    - [ ] 情境 B: 標記完成
    - [ ] 情境 C: 取消出貨中訂單（回補庫存）
  - [ ] 測試 6: 優惠券與運費互動

---

## 部署報告

### 部署資訊

- **部署日期**: _______________
- **部署人員**: _______________
- **部署環境**: 生產環境 (Firebase App Hosting + Supabase)
- **部署分支**: `011-shipping-and-order-edit`

### Migration 執行結果

| Migration | 執行時間 | 狀態 | 備註 |
|-----------|---------|------|------|
| 20260122_add_shipping_features.sql | ________ | ✅ / ❌ | |
| 20260123_remove_confirmed_status.sql | ________ | ✅ / ❌ | |
| 20260124_extend_order_timelines.sql | ________ | ✅ / ❌ | |

### 功能驗證結果

| 功能 | 狀態 | 備註 |
|------|------|------|
| 會員等級運費設定 | ✅ / ❌ | |
| 購物車運費預覽 | ✅ / ❌ | |
| 訂單建立與運費儲存 | ✅ / ❌ | |
| 標記出貨並扣減庫存 | ✅ / ❌ | |
| 訂單修改（商品單價、數量） | ✅ / ❌ | |
| 新增自訂費用 | ✅ / ❌ | |
| 修改運費 | ✅ / ❌ | |
| 修改歷程顯示 | ✅ / ❌ | |

### 效能指標

| 指標 | 目標 | 實際 | 狀態 |
|------|------|------|------|
| 運費計算響應時間 | < 200ms | _______ | ✅ / ❌ |
| 訂單修改儲存時間 | < 1s | _______ | ✅ / ❌ |
| 修改歷程查詢時間 | < 300ms | _______ | ✅ / ❌ |
| 訂單列表載入時間 | < 500ms | _______ | ✅ / ❌ |

### 問題與解決方案

（記錄部署過程中遇到的問題與解決方式）

---

## 緊急回滾程序

若部署後發現重大問題，執行以下步驟：

1. **停止前端服務**
   ```bash
   # 回滾到上一個 Firebase 版本
   firebase hosting:rollback
   ```

2. **回滾資料庫 Migration**
   ```bash
   # Phase 3 回滾
   psql -h <host> -p <port> -U postgres -d postgres -f rollback/03_rollback_order_modifications.sql

   # Phase 2 回滾
   psql -h <host> -p <port> -U postgres -d postgres -f rollback/02_rollback_confirmed_status_removal.sql

   # Phase 1 回滾
   psql -h <host> -p <port> -U postgres -d postgres -f rollback/01_rollback_shipping_features.sql
   ```

3. **恢復備份資料庫（最後手段）**
   ```bash
   # 恢復最新備份
   pg_restore -h <host> -p <port> -U postgres -d postgres -c backup_011_phase3_*.dump
   ```

---

**部署完成簽核**:

- [ ] 所有 Migration 成功執行
- [ ] 所有功能驗證通過
- [ ] 效能指標達標
- [ ] 無重大錯誤日誌
- [ ] Rollback 腳本已準備

**簽核人員**: _______________
**簽核日期**: _______________

---

**最後更新**: 2026-01-06
**文件版本**: v1.0.0
