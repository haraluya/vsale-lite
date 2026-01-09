# 雲端備份系統 E2E 測試指南

**功能**: 雲端備份系統（015-cloud-backup）
**測試類型**: End-to-End (E2E) 測試
**建立日期**: 2026-01-09
**測試環境**: 線上生產環境（需部署後執行）

---

## 前提條件

### 1. 環境設定完成
- ✅ Vercel 環境變數已設定（CRON_SECRET, GCS_CREDENTIALS, GCS_PROJECT_ID, GCS_BUCKET_NAME）
- ✅ GCS Bucket 已建立且權限正確
- ✅ Migration 已推送到雲端（`supabase db push`）
- ✅ 程式碼已部署到 Vercel（生產環境）

### 2. 測試帳號
- 管理員帳號已建立
- 管理員帳號可登入後台（`/admin/login`）

---

## 測試流程

### T077: E2E 測試 T1 - 手動備份測試

**目標**: 驗證管理員可手動觸發備份並查看備份記錄

**步驟**:
1. **登入後台**
   - 前往 `/admin/login`
   - 使用管理員帳號登入

2. **前往系統設定頁面**
   - 前往 `/admin/system/settings`
   - 驗證頁面載入正常

3. **觸發手動備份**
   - 捲動到「備份管理」區塊
   - 點擊「立即備份」按鈕
   - 驗證載入狀態顯示（按鈕禁用、顯示載入動畫）

4. **等待備份完成**
   - 等待 30-60 秒（視資料庫大小而定）
   - 驗證成功訊息顯示

5. **驗證備份記錄**
   - 檢查備份列表表格
   - 驗證新備份記錄出現在列表頂部
   - 驗證以下欄位：
     - 檔案名稱（格式：`vsale-backup-YYYYMMDD-HHMMSS.sql.gz`）
     - 檔案大小（應顯示 KB/MB 單位）
     - 類型（應顯示「手動」）
     - 狀態（應顯示綠色成功圖示）
     - 時間（應為當前時間）

6. **驗證 GCS 檔案**
   - 前往 Google Cloud Console
   - 開啟 GCS Bucket（`vsale-backups`）
   - 驗證新備份檔案存在
   - 下載檔案並解壓縮（`gunzip <filename>.sql.gz`）
   - 驗證 SQL 檔案內容正確

**驗收標準**:
- ✅ 手動備份成功觸發
- ✅ 備份記錄出現在列表
- ✅ GCS 檔案成功上傳
- ✅ 備份檔案可解壓縮

**失敗排查**:
- 若備份失敗，檢查 Vercel 函數日誌
- 檢查 GCS 服務帳號金鑰是否正確
- 檢查資料庫連線資訊（DB_HOST, DB_USER, DB_PASSWORD）

---

### T078: E2E 測試 T2 - Cron 測試

**目標**: 驗證 Vercel Cron 自動備份功能

**步驟**:
1. **手動觸發 Cron API**（使用生產環境 URL）
   ```bash
   curl -X POST "https://<your-production-url>.vercel.app/api/cron/backup" \
     -H "Authorization: Bearer <YOUR_CRON_SECRET>"
   ```

2. **驗證 API 回應**
   - 回應狀態碼應為 `200`
   - 回應 JSON 應包含 `{ "success": true, "data": { ... } }`

3. **檢查備份記錄**
   - 前往 `/admin/system/settings`
   - 驗證新備份記錄出現
   - 驗證備份類型為「自動」

4. **檢查 Vercel 日誌**
   - 前往 Vercel Dashboard → Functions → Logs
   - 搜尋 `/api/cron/backup`
   - 驗證執行日誌無錯誤

5. **等待自動執行**（可選）
   - 等到凌晨 2:00（台灣時間）
   - 檢查是否自動建立備份
   - 驗證 Cron 排程正常運作

**驗收標準**:
- ✅ Cron API 回應成功
- ✅ 備份記錄類型為「自動」
- ✅ Vercel 日誌無錯誤
- ✅ （可選）凌晨 2:00 自動執行成功

**失敗排查**:
- 若 API 回應 401，檢查 CRON_SECRET 是否正確
- 若 API 回應 500，檢查 Vercel 函數日誌
- 檢查 `vercel.json` 中 Cron 排程設定

---

### T079: E2E 測試 T3 - 下載與還原測試

**目標**: 驗證備份檔案可下載並還原到資料庫

**步驟**:
1. **下載備份檔案**
   - 前往 `/admin/system/settings`
   - 點擊備份記錄的「下載」按鈕
   - 驗證瀏覽器自動下載 `.sql.gz` 檔案

2. **解壓縮備份檔案**
   ```bash
   gunzip vsale-backup-20260109-020000.sql.gz
   ```
   - 驗證解壓縮成功
   - 檢查 SQL 檔案大小（應為壓縮前的 5-10 倍）

3. **檢查 SQL 檔案內容**
   ```bash
   head -n 50 vsale-backup-20260109-020000.sql
   ```
   - 驗證檔案包含 PostgreSQL SQL 語法
   - 驗證包含所有資料表（tiers, profiles, categories, series, products 等）

4. **測試還原到資料庫**（⚠️ 僅在測試環境執行）
   - 前往 Supabase Dashboard → SQL Editor
   - 複製 SQL 檔案內容
   - 執行 SQL（需 5-10 分鐘）
   - 驗證所有資料表恢復成功

5. **驗證資料完整性**
   - 查詢幾個資料表，驗證資料正確
   ```sql
   SELECT COUNT(*) FROM profiles;
   SELECT COUNT(*) FROM products;
   SELECT COUNT(*) FROM orders;
   ```

**驗收標準**:
- ✅ 下載按鈕正常運作
- ✅ 備份檔案可解壓縮
- ✅ SQL 檔案內容正確
- ✅ （可選）還原到資料庫成功

**失敗排查**:
- 若下載失敗，檢查 GCS 簽名 URL 是否過期
- 若 SQL 執行失敗，檢查 pg_dump 參數設定
- 檢查備份檔案是否包含所有必要資料表

---

### T080: E2E 測試 T4 - 滾動刪除測試

**目標**: 驗證自動備份滾動刪除機制

**步驟**:
1. **修改保留數量設定**
   - 前往 Supabase Dashboard → SQL Editor
   - 執行以下 SQL：
   ```sql
   UPDATE system_settings
   SET value = '3'
   WHERE key = 'backup_max_keep';
   ```

2. **建立 5 個自動備份**
   - 使用 Cron API 手動觸發 5 次：
   ```bash
   for i in {1..5}; do
     curl -X POST "https://<production-url>/api/cron/backup" \
       -H "Authorization: Bearer <CRON_SECRET>"
     sleep 30  # 等待 30 秒
   done
   ```

3. **驗證僅保留最新 3 個**
   - 前往 `/admin/system/settings`
   - 檢查備份列表
   - 驗證僅顯示 3 個自動備份

4. **驗證 GCS 檔案**
   - 前往 Google Cloud Console
   - 檢查 GCS Bucket
   - 驗證僅存在 3 個備份檔案

5. **驗證資料庫記錄**
   - 查詢資料庫：
   ```sql
   SELECT COUNT(*)
   FROM backup_jobs
   WHERE backup_type = 'auto' AND status = 'success';
   ```
   - 驗證結果為 3

**驗收標準**:
- ✅ 滾動刪除機制正常運作
- ✅ 僅保留最新 3 個自動備份
- ✅ GCS 檔案與資料庫記錄一致
- ✅ 手動備份不受滾動刪除影響

**失敗排查**:
- 若保留數量不正確，檢查 `system_settings.backup_max_keep`
- 檢查 `lib/backup/cleanup.ts` 滾動刪除邏輯
- 檢查 Vercel 函數日誌

---

### T081: E2E 測試 T5 - 失敗場景測試

**目標**: 驗證備份失敗時錯誤處理與自動切換儲存

**步驟**:
1. **設定錯誤 GCS 金鑰**（⚠️ 測試完後恢復正確值）
   - 前往 Vercel Dashboard → Settings → Environment Variables
   - 暫時修改 `GCS_CREDENTIALS` 為錯誤值（例如 `{"invalid":"json"}`）
   - 重新部署 Vercel

2. **觸發手動備份**
   - 前往 `/admin/system/settings`
   - 點擊「立即備份」按鈕
   - 觀察錯誤處理

3. **驗證錯誤訊息顯示**
   - 檢查備份狀態卡片
   - 驗證顯示紅色錯誤訊息
   - 驗證錯誤訊息內容清晰

4. **檢查備份記錄**
   - 檢查備份列表
   - 驗證失敗備份記錄存在
   - 驗證狀態為「失敗」（紅色圖示）
   - 驗證 `error_message` 欄位包含錯誤資訊

5. **驗證自動切換到 Vercel Blob**（若實作）
   - 檢查備份記錄的 `storage_provider` 欄位
   - 若切換成功，應顯示 `vercel_blob`
   - 驗證備份檔案成功上傳到 Vercel Blob

6. **恢復正確 GCS 金鑰**
   - 恢復正確的 `GCS_CREDENTIALS`
   - 重新部署 Vercel
   - 測試備份功能恢復正常

**驗收標準**:
- ✅ 錯誤訊息顯示正確
- ✅ 失敗備份記錄包含錯誤資訊
- ✅ （可選）自動切換到 Vercel Blob
- ✅ 恢復正確金鑰後功能正常

**失敗排查**:
- 若未顯示錯誤訊息，檢查錯誤處理邏輯
- 若自動切換失敗，檢查 `lib/cloud-storage/index.ts`
- 檢查 Vercel 函數日誌

---

## 測試完成檢查清單

### Phase 11: Testing ✅
- [X] T082: TypeScript 型別檢查通過
- [X] T083: ESLint 檢查通過（4 個警告，0 個錯誤）
- [X] T074: 單元測試 - db-backup.test.ts（10 測試通過）
- [X] T075: 單元測試 - compression.test.ts（13 測試通過）
- [X] T076: 單元測試 - gcs.test.ts（Mock 測試已建立）

### E2E 測試清單（需部署後執行）
- [ ] T077: 手動備份測試
- [ ] T078: Cron 測試
- [ ] T079: 下載與還原測試
- [ ] T080: 滾動刪除測試
- [ ] T081: 失敗場景測試

---

## 測試報告範本

### 測試執行日期
- 日期：YYYY-MM-DD
- 測試者：[姓名]
- 環境：Production / Staging

### 測試結果

| 測試項目 | 狀態 | 備註 |
|---------|------|------|
| T077: 手動備份測試 | ✅ / ❌ |  |
| T078: Cron 測試 | ✅ / ❌ |  |
| T079: 下載與還原測試 | ✅ / ❌ |  |
| T080: 滾動刪除測試 | ✅ / ❌ |  |
| T081: 失敗場景測試 | ✅ / ❌ |  |

### 發現的問題
1. [問題描述]
2. [問題描述]

### 建議改進
1. [建議內容]
2. [建議內容]

---

## 附註

- **測試環境**: E2E 測試需在線上生產環境執行，因為需要驗證 Vercel Cron、GCS 上傳等功能
- **測試頻率**: 每次重大變更後執行完整 E2E 測試
- **測試時間**: 完整測試約需 30-60 分鐘
- **測試先決條件**: 必須完成 Phase 12 (Deployment) 才能執行 E2E 測試

---

**文件建立日期**: 2026-01-09
**最後更新**: 2026-01-09
**負責人**: 系統管理員
