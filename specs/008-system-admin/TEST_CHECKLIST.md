# Feature 008 測試項目清單
**功能**: 後台系統管理功能
**測試日期**: 2026-01-04
**測試範圍**: Phase 4-8 全功能測試

---

## 測試環境準備

### 前置條件
- [ ] 確認本地 Supabase 已啟動 (`supabase status`)
- [ ] 確認開發伺服器運行中 (`pnpm dev`)
- [ ] 準備測試帳號（至少 2 個管理員帳號）
- [ ] 清空或備份 `audit_logs` 表

### 測試帳號準備
```sql
-- 建立測試管理員帳號（透過 Supabase Studio 或 SQL Editor）
-- 帳號 1: admin1 / password123
-- 帳號 2: admin2 / password456
```

---

## Phase 4: 管理員帳號管理 (T030-T033)

### ✅ T030: 測試管理員帳號建立流程

**測試步驟**:
1. 登入管理後台 `/admin/login`
2. 訪問 `/admin/system/members`
3. 點擊「新增管理員」按鈕
4. 填寫表單：
   - 帳號: `testadmin`
   - 暱稱: `測試管理員`
   - 密碼: `Password123!`
   - 確認密碼: `Password123!`
5. 提交表單

**預期結果**:
- [ ] 表單驗證通過（帳號格式、密碼強度、密碼一致性）
- [ ] 成功建立帳號並顯示成功訊息
- [ ] 帳號列表立即顯示新帳號
- [ ] `audit_logs` 表記錄一筆 `action_type = 'created'` 的操作
- [ ] `new_values` 包含 `username`、`display_name`、`role`

**驗證 SQL**:
```sql
-- 驗證帳號建立
SELECT id, username, display_name, role
FROM profiles
WHERE username = 'testadmin';

-- 驗證操作日誌
SELECT * FROM audit_logs
WHERE target_type = 'admin'
AND action_type = 'created'
ORDER BY created_at DESC LIMIT 1;
```

**錯誤情境測試**:
- [ ] 使用已存在的帳號 → 顯示「帳號已存在」錯誤
- [ ] 密碼少於 8 碼 → 顯示「密碼至少 8 碼」錯誤
- [ ] 密碼與確認密碼不符 → 顯示「密碼不一致」錯誤
- [ ] 帳號包含特殊字元 → 顯示「帳號格式錯誤」錯誤

---

### ✅ T031: 測試管理員資料編輯

**測試步驟**:
1. 在管理員列表中找到 `testadmin`
2. 點擊「編輯」按鈕
3. 修改暱稱為「測試管理員（已編輯）」
4. 提交表單

**預期結果**:
- [ ] 成功更新暱稱
- [ ] 列表即時顯示新暱稱
- [ ] `audit_logs` 記錄 `action_type = 'updated'`
- [ ] `old_values` 與 `new_values` 正確記錄變更

**驗證 SQL**:
```sql
-- 驗證更新
SELECT display_name FROM profiles WHERE username = 'testadmin';

-- 驗證日誌
SELECT old_values, new_values FROM audit_logs
WHERE target_type = 'admin'
AND action_type = 'updated'
AND target_id = (SELECT id FROM profiles WHERE username = 'testadmin')
ORDER BY created_at DESC LIMIT 1;
```

---

### ✅ T032: 測試重設密碼功能

**測試步驟**:
1. 在管理員列表找到 `testadmin`
2. 點擊「重設密碼」按鈕
3. 輸入新密碼: `NewPass456!`
4. 確認新密碼: `NewPass456!`
5. 提交表單
6. 登出當前帳號
7. 使用 `testadmin` / `NewPass456!` 登入

**預期結果**:
- [ ] 成功重設密碼
- [ ] 顯示成功訊息
- [ ] 可使用新密碼登入
- [ ] `audit_logs` 記錄 `action_type = 'updated'`
- [ ] `notes` 欄位包含「重設密碼」訊息
- [ ] `old_values` / `new_values` 不包含密碼明文（安全性）

**錯誤情境測試**:
- [ ] 新密碼少於 8 碼 → 顯示密碼強度錯誤
- [ ] 密碼不一致 → 顯示密碼不一致錯誤

---

### ✅ T033: 測試管理員帳號刪除

**測試步驟**:
1. 在管理員列表找到 `testadmin`
2. 點擊「刪除」按鈕
3. 確認刪除對話框
4. 提交刪除

**預期結果**:
- [ ] 成功刪除帳號
- [ ] 列表不再顯示該帳號
- [ ] `audit_logs` 記錄 `action_type = 'deleted'`
- [ ] `old_values` 包含被刪除帳號的完整資訊
- [ ] 嘗試使用已刪除帳號登入失敗

**驗證 SQL**:
```sql
-- 驗證刪除（應該查無此帳號）
SELECT * FROM profiles WHERE username = 'testadmin';

-- 驗證刪除日誌
SELECT * FROM audit_logs
WHERE target_type = 'admin'
AND action_type = 'deleted'
ORDER BY created_at DESC LIMIT 1;
```

**邊界情境測試**:
- [ ] 嘗試刪除自己 → 應該被阻止或警告
- [ ] 刪除最後一個管理員 → 應該被阻止（保護機制）

---

## Phase 5: 操作日誌功能 (T045-T050)

### ✅ T045: 測試操作日誌列表查詢（分頁、排序）

**測試步驟**:
1. 訪問 `/admin/system/audit-logs`
2. 驗證日誌按時間倒序排列（最新在上）
3. 驗證分頁顯示（每頁 20 筆）
4. 驗證總記錄數正確
5. 點擊「下一頁」（若有）

**預期結果**:
- [ ] 日誌列表按 `created_at DESC` 排序
- [ ] 每頁最多顯示 20 筆記錄
- [ ] 分頁導航正確運作
- [ ] 總記錄數與實際相符

**驗證查詢**:
```sql
-- 驗證記錄總數
SELECT COUNT(*) FROM audit_logs;

-- 驗證排序（前 20 筆應與頁面一致）
SELECT id, action_type, target_type, created_at
FROM audit_logs
ORDER BY created_at DESC
LIMIT 20;
```

---

### ✅ T046: 測試操作類型篩選（五色編碼）

**測試目標**: 驗證五種操作類型篩選與 Badge 顏色編碼

**測試步驟**:
1. 在操作日誌頁面選擇篩選器「建立」
2. 驗證僅顯示 `action_type = 'created'` 的記錄
3. 驗證 Badge 顯示綠色 (`bg-green-400`)
4. 重複測試其他四種類型

**操作類型顏色編碼**:
- [ ] **建立 (created)**: 綠色 (`bg-green-400 border-green-600`)
- [ ] **更新 (updated)**: 藍色 (`bg-blue-400 border-blue-600`)
- [ ] **刪除 (deleted)**: 紅色 (`bg-red-400 border-red-600`)
- [ ] **庫存調整 (stock_adjusted)**: 橙色 (`bg-orange-400 border-orange-600`)
- [ ] **留言 (comment_added)**: 黃色 (`bg-yellow-400 border-yellow-600`)

**驗證 SQL**:
```sql
-- 驗證每種類型的記錄數
SELECT action_type, COUNT(*)
FROM audit_logs
GROUP BY action_type;
```

---

### ✅ T047: 測試日期範圍篩選

**測試步驟**:
1. 在操作日誌頁面設定「起始日期」為今天
2. 設定「結束日期」為今天
3. 提交篩選
4. 驗證僅顯示今天的記錄

**預期結果**:
- [ ] 日期篩選正確運作
- [ ] 僅顯示指定日期範圍內的記錄
- [ ] URL 查詢參數包含 `date_from` 和 `date_to`

**邊界測試**:
- [ ] 起始日期晚於結束日期 → 顯示錯誤或無結果
- [ ] 清空日期篩選 → 顯示所有記錄

---

### ✅ T048: 測試操作者搜尋

**測試步驟**:
1. 記錄當前操作者名稱（如「管理員」）
2. 在操作日誌中搜尋該操作者
3. 驗證僅顯示該操作者的記錄

**預期結果**:
- [ ] 操作者搜尋功能正常（如果 UI 已實作）
- [ ] 顯示正確的操作者暱稱

**Note**: 當前版本 UI 未包含操作者搜尋輸入框，此功能為 P2 優先級（可選）

---

### ✅ T049: 驗證刪除操作者後日誌仍保留暱稱快照

**測試步驟**:
1. 建立測試管理員「測試員」
2. 使用該帳號執行操作（如建立商品）
3. 刪除「測試員」帳號
4. 檢查操作日誌

**預期結果**:
- [ ] 操作日誌仍顯示「測試員」暱稱
- [ ] `actor_display_name` 欄位保留快照值
- [ ] 即使 `profiles` 表已刪除該記錄，日誌仍保留

**驗證 SQL**:
```sql
-- 刪除帳號後查詢日誌（應仍保留暱稱）
SELECT actor_id, actor_display_name, action_type, created_at
FROM audit_logs
WHERE actor_id = '<已刪除帳號的 ID>'
ORDER BY created_at DESC;
```

---

### ✅ T050: 驗證 JSONB 查詢功能

**測試步驟**:
1. 執行商品更新操作（如修改庫存 100 → 50）
2. 在操作日誌中查看該記錄
3. 驗證顯示「庫存: 100 → 50」
4. 驗證 JSONB 變更內容正確顯示

**預期結果**:
- [ ] `old_values` 與 `new_values` 正確顯示
- [ ] 變更內容以 `key: old → new` 格式呈現
- [ ] 複雜值使用 `JSON.stringify()` 顯示

**驗證 SQL**:
```sql
-- 查詢最近一筆庫存調整記錄
SELECT
  action_type,
  old_values,
  new_values,
  notes
FROM audit_logs
WHERE action_type = 'stock_adjusted'
ORDER BY created_at DESC
LIMIT 1;
```

---

## Phase 6: 系統設定功能 (T064-T069)

### ✅ T064: 測試文字設定更新

**測試步驟**:
1. 訪問 `/admin/system/settings`
2. 找到「網站標題」設定（`site_title`）
3. 修改為「Vsale-lite 測試環境」
4. 離開輸入框（觸發 onBlur）

**預期結果**:
- [ ] 設定立即更新
- [ ] 顯示「更新中...」狀態
- [ ] 成功後顯示成功訊息
- [ ] `system_settings` 表更新正確
- [ ] `audit_logs` 記錄 `action_type = 'updated'`

**驗證 SQL**:
```sql
-- 驗證設定更新
SELECT key, value, updated_at
FROM system_settings
WHERE key = 'site_title';

-- 驗證日誌
SELECT old_values, new_values
FROM audit_logs
WHERE target_type = 'system_setting'
AND target_id = 'site_title'
ORDER BY created_at DESC LIMIT 1;
```

**前台驗證**:
- [ ] 重新載入前台首頁，驗證標題已更新

---

### ✅ T065: 測試數字設定更新

**測試步驟**:
1. 找到「廣告輪播間隔」設定（`carousel_interval`）
2. 修改為 `3000`（3 秒）
3. 離開輸入框

**預期結果**:
- [ ] 成功更新為數字型別 `3000`
- [ ] `value_type` 為 `number`
- [ ] 資料庫儲存為 TEXT `'3000'`，前端解析為 `number` 型別

**驗證 SQL**:
```sql
SELECT key, value, value_type
FROM system_settings
WHERE key = 'carousel_interval';
```

**型別驗證**:
- [ ] 輸入非數字（如 `abc`） → 驗證失敗

---

### ✅ T066: 測試布林值設定更新

**測試步驟**:
1. 找到「廣告輪播自動播放」設定（`carousel_auto_play`）
2. 勾選/取消勾選 checkbox
3. 驗證立即更新

**預期結果**:
- [ ] 成功更新為 `true` 或 `false`
- [ ] 資料庫儲存為 TEXT `'true'` 或 `'false'`
- [ ] 前端解析為 `boolean` 型別

**驗證 SQL**:
```sql
SELECT key, value, value_type
FROM system_settings
WHERE key = 'carousel_auto_play';
```

---

### ✅ T067: 測試完整版 Logo 上傳

**測試步驟**:
1. 在「Logo 管理」區塊找到「完整版 Logo」
2. 點擊「上傳 Logo」按鈕
3. 選擇測試圖片（JPG, 200×60）
4. 等待上傳完成

**預期結果**:
- [ ] 圖片成功上傳到 Supabase Storage (`products/system/logo.{ext}`)
- [ ] 預覽區立即顯示新 Logo
- [ ] `system_settings.logo_url` 更新為公開 URL
- [ ] `audit_logs` 記錄上傳操作
- [ ] 前台 Header 顯示新 Logo

**驗證檔案大小與格式**:
- [ ] 上傳 > 2MB 圖片 → 顯示錯誤「檔案大小不得超過 2MB」
- [ ] 上傳 PDF 檔案 → 顯示錯誤「僅支援 JPG、PNG、WebP、SVG 格式」

**驗證 SQL**:
```sql
SELECT key, value
FROM system_settings
WHERE key = 'logo_url';
```

---

### ✅ T068: 測試圖示版 Logo 與 Favicon 上傳

**測試步驟**:
1. 上傳「圖示版 Logo」（60×60）
2. 上傳「Favicon」（60×60 或 32×32）
3. 驗證預覽與儲存

**預期結果**:
- [ ] 兩種 Logo 分別儲存於不同路徑：
  - `products/system/logo-icon.{ext}`
  - `products/system/favicon.{ext}`
- [ ] `system_settings` 表更新 `logo_icon_url` 與 `favicon_url`
- [ ] 前台 `<head>` 標籤使用新 Favicon

**驗證 SQL**:
```sql
SELECT key, value
FROM system_settings
WHERE key IN ('logo_icon_url', 'favicon_url');
```

---

### ✅ T069: 測試 Logo 刪除功能

**測試步驟**:
1. 點擊「刪除」按鈕（Trash 圖示）
2. 確認刪除對話框
3. 等待刪除完成

**預期結果**:
- [ ] Supabase Storage 檔案已刪除
- [ ] `system_settings` 表該鍵值清空為空字串 `''`
- [ ] 預覽區不再顯示圖片
- [ ] `audit_logs` 記錄刪除操作
- [ ] 前台 Header 不再顯示 Logo（或顯示預設圖）

**驗證 SQL**:
```sql
SELECT key, value
FROM system_settings
WHERE key = 'logo_url';
-- value 應為空字串 ''
```

---

## Phase 7: 操作歷史時間軸 (T074-T076)

### ⚠️ T074: 測試時間軸元件顯示

**狀態**: ⚠️ **UI 未實作（Phase 7 可選）**

**測試步驟**（若實作）:
1. 訪問商品詳情頁
2. 查看「操作歷史」區塊
3. 驗證時間軸顯示所有操作記錄

**預期結果**:
- [ ] 時間軸按時間倒序排列
- [ ] 每筆記錄顯示操作者、操作類型、時間
- [ ] 顯示變更內容（old → new）

---

### ⚠️ T075: 測試訂單操作歷史整合

**狀態**: ⚠️ **UI 未實作（Phase 7 可選）**

**測試步驟**（若實作）:
1. 訪問訂單詳情頁 `/admin/orders/{id}`
2. 查看「操作歷史」時間軸
3. 驗證顯示訂單狀態變更歷史

---

### ⚠️ T076: 測試客戶操作歷史整合

**狀態**: ⚠️ **UI 未實作（Phase 7 可選）**

**測試步驟**（若實作）:
1. 訪問客戶詳情頁 `/admin/clients/{id}`
2. 查看「操作歷史」時間軸
3. 驗證顯示客戶資料變更歷史

---

## Phase 8: 完整測試與效能測試 (T084-T085)

### 🔄 T084: 完整功能測試流程

**測試目標**: 模擬真實使用場景，測試所有功能整合

**完整流程測試**:

#### Step 1: 管理員帳號管理
1. [ ] 建立新管理員「測試管理員 A」
2. [ ] 編輯暱稱為「測試管理員 A（編輯）」
3. [ ] 重設密碼
4. [ ] 使用新密碼登入
5. [ ] 刪除該帳號

#### Step 2: 操作日誌驗證
1. [ ] 訪問操作日誌頁面
2. [ ] 驗證上述 5 筆操作全部記錄
3. [ ] 篩選「建立」類型，驗證僅顯示建立記錄
4. [ ] 篩選今日日期，驗證僅顯示今日記錄

#### Step 3: 系統設定管理
1. [ ] 更新網站標題
2. [ ] 上傳完整版 Logo
3. [ ] 更新廣告輪播間隔
4. [ ] 驗證操作日誌記錄所有變更

#### Step 4: 前台驗證
1. [ ] 訪問前台首頁
2. [ ] 驗證新標題與 Logo 顯示正確
3. [ ] 驗證廣告輪播間隔生效

#### Step 5: 跨功能整合測試
1. [ ] 建立商品，驗證操作日誌記錄
2. [ ] 調整庫存，驗證操作日誌記錄
3. [ ] 新增訂單留言，驗證操作日誌記錄
4. [ ] 更新客戶資料，驗證操作日誌記錄

**預期結果**:
- [ ] 所有功能正常運作
- [ ] 操作日誌完整記錄所有操作
- [ ] 前後台整合無錯誤

---

### 🔄 T085: 效能與安全性測試

**效能測試**:

#### 1. 操作日誌分頁效能
- [ ] 建立 1000 筆測試日誌
- [ ] 查詢第 1 頁，響應時間 < 300ms
- [ ] 查詢第 50 頁，響應時間 < 500ms

**測試 SQL**（生成測試資料）:
```sql
-- 插入 1000 筆測試日誌（請修改 actor_id）
INSERT INTO audit_logs (actor_id, target_type, target_id, action_type, old_values, new_values)
SELECT
  '<管理員 ID>',
  'product',
  gen_random_uuid()::text,
  'updated',
  '{"stock": 100}'::jsonb,
  '{"stock": 50}'::jsonb
FROM generate_series(1, 1000);
```

#### 2. Logo 上傳效能
- [ ] 上傳 100KB 圖片，響應時間 < 1s
- [ ] 上傳 1.5MB 圖片，響應時間 < 3s
- [ ] 上傳 2MB 圖片（邊界值），響應時間 < 5s

#### 3. 系統設定查詢效能
- [ ] `getSettings()` 查詢所有設定，響應時間 < 100ms
- [ ] `getPublicSettings()` 查詢公開設定，響應時間 < 50ms

**安全性測試**:

#### 1. 權限控制測試
- [ ] 非管理員訪問 `/admin/system/members` → 重導向登入頁
- [ ] 客戶訪問 `/admin/system/audit-logs` → 403 Forbidden
- [ ] 未登入訪問系統設定頁 → 重導向登入頁

#### 2. 輸入驗證測試
- [ ] 上傳 .exe 檔案作為 Logo → 拒絕並顯示錯誤
- [ ] 設定 SQL Injection 字串（如 `'; DROP TABLE--`） → 被 Zod 驗證阻擋
- [ ] 上傳超大檔案（10MB） → 拒絕並顯示錯誤

#### 3. JSONB 注入測試
- [ ] 輸入惡意 JSON 字串（如 `{"__proto__": {}}`） → 被正確處理或拒絕

---

## 📋 測試總結模板

### 測試執行紀錄

| 測試階段 | 測試項目 | 通過 | 失敗 | 阻塞 | 備註 |
|---------|---------|------|------|------|------|
| Phase 4 | T030-T033 | - | - | - | 管理員帳號管理 |
| Phase 5 | T045-T050 | - | - | - | 操作日誌功能 |
| Phase 6 | T064-T069 | - | - | - | 系統設定功能 |
| Phase 7 | T074-T076 | - | - | - | 操作歷史時間軸（可選）|
| Phase 8 | T084-T085 | - | - | - | 完整測試與效能測試 |

### 已知問題與修復

| 問題編號 | 描述 | 嚴重性 | 狀態 | 修復方案 |
|---------|------|--------|------|----------|
| - | - | - | - | - |

### 測試環境資訊

- **測試日期**: YYYY-MM-DD
- **分支**: 008-system-admin
- **Commit Hash**: xxxxxxx
- **Node.js 版本**: v22.x
- **Next.js 版本**: 15.1+
- **Supabase CLI 版本**: 查詢 `supabase --version`

---

## 🎯 測試優先級建議

### P0 (必須測試)
- ✅ T030-T033: 管理員帳號管理
- ✅ T045-T047, T049-T050: 操作日誌核心功能
- ✅ T064-T069: 系統設定功能
- 🔄 T084: 完整功能測試流程

### P1 (建議測試)
- 🔄 T085: 效能與安全性測試
- ⚠️ T048: 操作者搜尋（若 UI 已實作）

### P2 (可選測試)
- ⚠️ T074-T076: 操作歷史時間軸（若 Phase 7 已實作）

---

**測試完成標準**:
- [ ] 所有 P0 測試項目通過
- [ ] 至少 80% P1 測試項目通過
- [ ] 無 Critical 或 Blocker 級別的問題
- [ ] TypeScript 型別檢查通過 (`pnpm type-check`)
- [ ] 操作日誌完整記錄所有操作
- [ ] 前後台整合無錯誤

---

**最後更新**: 2026-01-04
**文件版本**: 1.0.0
