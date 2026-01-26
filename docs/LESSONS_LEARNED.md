# 多站點部署經驗教訓

**專案**: Vsale-lite 批發訂貨系統
**日期**: 2026-01-22
**經驗來源**: 站點二部署過程（2026-01-22）

---

## 🎯 成功經驗總結

### ✅ 1. 資料遷移策略

**使用 API 而非 SQL 檔案**

**問題**：
- 使用 `pg_dump` 產生的 SQL 檔案過大（>10MB）
- 觸發 Prompt 長度限制
- 手動分割檔案複雜且容易出錯

**成功方案**：
- 使用 Supabase JavaScript SDK 直接傳輸資料
- 批次處理（每次 100 筆）
- 自動處理外鍵依賴順序
- 即時進度顯示

**核心工具**：
- `scripts/compare-sites.js` - 比較資料差異
- `scripts/migrate-to-site2-smart.js` - 智慧型遷移

**結果**：
- ✅ 成功遷移 1,477 筆記錄
- ✅ 成功遷移 100 個 Storage 檔案
- ✅ 100% 資料一致性

---

### ✅ 2. 管理員帳號建立

**使用 Supabase Dashboard 建立 Auth 使用者**

**錯誤方案**：
- ❌ 使用 `supabase.auth.admin.createUser()` API
- ❌ 直接在 SQL 中 INSERT `auth.users` 表

**失敗原因**：
- Auth Admin API 返回「Database error checking email」
- 直接 INSERT auth.users 會導致密碼加密不正確

**成功方案**：
1. 在 Supabase Dashboard → Authentication → Users 手動建立
2. 勾選「Auto Confirm User」
3. 使用腳本建立對應的 `profiles` 和 `admin_users` 記錄

**關鍵要點**：
- ✅ Dashboard 建立的使用者最穩定
- ✅ 必須同時建立三個記錄：
  1. `auth.users`（Dashboard 建立）
  2. `public.profiles`（腳本建立）
  3. `public.admin_users`（腳本建立）
- ✅ 三個表的 `id` 必須一致

---

### ✅ 3. RLS 策略設定

**profiles 表必須允許未認證查詢**

**問題**：
- 登入時需要先查詢 `profiles` 取得 email
- 此時使用者尚未認證（使用 anon key）
- 如果 RLS 要求 `authenticated`，會形成死鎖

**成功方案**：
```sql
-- 允許未認證用戶查詢 profiles（登入時需要）
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);
```

**注意**：
- 這個策略名稱容易誤導，實際上允許 `authenticated` 角色查詢
- 登入時前端使用 Server Action，Server Action 使用 `service_role` key 繞過 RLS

---

### ✅ 4. Vercel 環境變數設定

**環境變數變更需要重新部署**

**問題**：
- 在 Vercel Dashboard 設定環境變數後，沒有立即生效
- 顯示 `process.env.NEXT_PUBLIC_SUPABASE_URL = undefined`

**原因**：
- Vercel 使用建置快取
- 環境變數在建置時就被嵌入程式碼
- 變更環境變數後必須重新建置

**成功方案**：
1. 設定環境變數後，點擊「Redeploy」
2. 或使用「Clear Cache and Redeploy」
3. 或推送新的 Git commit 觸發重新部署

---

### ✅ 5. system_settings 初始化

**必須包含 value_type 和正確的 category**

**問題**：
- 插入 system_settings 時缺少 `value_type` 欄位
- 使用不允許的 `category` 值（如 `sales`）

**成功方案**：
```javascript
const settings = [
  {
    key: 'weekly_sales_target',
    value: '100000',
    value_type: 'number',  // 必須
    category: 'general',    // 使用允許的分類
    is_public: false,
    description: '週銷售目標'
  }
]
```

**允許的 category 值**：
- `general`
- `branding`
- `carousel`
- `system`
- `client_notifications`

---

## ❌ 失敗經驗與教訓

### ❌ 1. 使用 SQL 直接建立 Auth 使用者

**嘗試**：
```sql
INSERT INTO auth.users (id, email, encrypted_password, ...)
VALUES (...);
```

**失敗原因**：
- `encrypted_password` 加密方式不正確
- 缺少必要的 metadata 和關聯表
- 導致登入時返回「Database error querying schema」

**教訓**：
- ✅ **絕對不要**直接操作 `auth.users` 表
- ✅ 永遠使用 Supabase Dashboard 或 Auth Admin API
- ✅ 如果 API 失敗，優先使用 Dashboard

---

### ❌ 2. 混淆 admin_users 與 profiles 的作用

**錯誤理解**：
- 以為 `admin_users` 是登入用的主要表
- 以為只需要建立 `admin_users` 記錄

**實際情況**：
- 登入流程先查詢 `profiles.username`
- 取得 `profiles.email`
- 使用 email 進行 Auth 登入
- `admin_users` 僅用於後台權限管理

**正確流程**：
```
1. 使用者輸入 username (例如：admin)
2. 查詢 profiles WHERE username = 'admin' AND role = 'admin'
3. 取得 email (例如：admin@admin.local)
4. 使用 email + password 進行 Auth 登入
5. 登入後檢查 admin_users 確認權限
```

**教訓**：
- ✅ `profiles` 是登入的關鍵表
- ✅ `auth.users` 儲存認證資訊
- ✅ `admin_users` 僅用於後台功能權限

---

### ❌ 3. 使用錯誤的 User ID

**問題**：
- 建立新的 Auth 使用者後，忘記更新 `admin_users`
- `profiles.id` 與 `admin_users.id` 不一致
- 導致登入後無法訪問後台功能

**錯誤情況**：
```
auth.users.id        = 70f5ff93-41e1-4d26-a4ca-5b27eddda5e1 (新)
profiles.id          = 70f5ff93-41e1-4d26-a4ca-5b27eddda5e1 (新)
admin_users.id       = b3909a55-16b5-4be9-af85-4d36f263259d (舊)
```

**教訓**：
- ✅ 建立新使用者後，立即同步更新所有相關表
- ✅ 三個表的 ID 必須完全一致
- ✅ 刪除舊使用者時，同步清理所有相關記錄

---

### ❌ 4. 忽略 Migration 中的 Generated Columns

**問題**：
- 嘗試插入 `code_normalized` 欄位
- 該欄位是 `GENERATED ALWAYS AS (UPPER(code)) STORED`
- 導致插入失敗

**錯誤**：
```javascript
await supabase.from('coupons').insert({
  code: 'WELCOME100',
  code_normalized: 'WELCOME100'  // ❌ 不應手動設定
})
```

**正確方式**：
```javascript
const EXCLUDED_COLUMNS = {
  coupons: ['code_normalized']
}

// 插入前移除 Generated Columns
cleanedData = batchData.map(row => {
  const newRow = { ...row }
  EXCLUDED_COLUMNS[table].forEach(col => delete newRow[col])
  return newRow
})
```

**教訓**：
- ✅ 檢查資料表 schema，識別 Generated Columns
- ✅ 插入資料前自動移除這些欄位
- ✅ 讓資料庫自動計算這些值

---

### ❌ 5. 未確認目標站點就執行操作

**問題**：
- 連結到主站時，誤以為連結到站點二
- 執行資料清空操作
- 差點刪除生產資料

**教訓**：
- ✅ **每次操作前都確認 Project Ref**
- ✅ 在腳本開頭加入確認訊息
- ✅ 使用顏色標記不同站點
- ✅ 建立專用的站點識別機制

**防護措施**：
```javascript
// 在腳本開頭加入確認
console.log('⚠️  目標站點：站點二')
console.log(`   Project Ref: rdyvmgomjdglflrcfijs`)
console.log(`   確認後按 Enter 繼續...`)

// 或使用環境變數
if (!process.env.CONFIRM_SITE2) {
  throw new Error('請設定 CONFIRM_SITE2=true 確認目標站點')
}
```

---

## 🛠️ 最佳實踐

### 1. 部署前檢查清單

- [ ] 確認目標站點 Project Ref
- [ ] 檢查環境變數設定
- [ ] 備份現有資料（如果有）
- [ ] 準備好管理員帳號資訊
- [ ] 閱讀完整的 SOP 文件

### 2. 資料遷移最佳實踐

- [ ] 先執行比較（compare）確認差異
- [ ] 使用批次處理（每次 100 筆）
- [ ] 記錄遷移日誌
- [ ] 遷移後再次比較驗證
- [ ] 保留原始資料至少 30 天

### 3. 帳號管理最佳實踐

- [ ] 使用 Dashboard 建立 Auth 使用者
- [ ] 立即記錄 User ID、Email、Password
- [ ] 同步建立 profiles 和 admin_users 記錄
- [ ] 驗證三個表的 ID 一致性
- [ ] 測試登入確認可用

### 4. 環境變數管理最佳實踐

- [ ] 使用 `.env.local` 區分本地與生產環境
- [ ] 為每個站點使用獨立的環境變數集
- [ ] 設定環境變數後立即重新部署
- [ ] 使用測試 API 驗證環境變數載入

### 5. RLS 策略最佳實踐

- [ ] 執行 Migration 後立即檢查 RLS 策略
- [ ] 確保 profiles 表允許查詢（登入需要）
- [ ] 使用 service_role key 繞過 RLS 進行管理操作
- [ ] 測試 anon key 的存取權限

---

## 📊 時間估算參考

基於站點二的實際部署經驗：

| 階段 | 預計時間 | 實際時間 |
|------|---------|---------|
| Supabase 設定 | 30 分鐘 | 2 小時 |
| Vercel 設定 | 15 分鐘 | 30 分鐘 |
| 資料遷移 | 20 分鐘 | 15 分鐘 |
| 帳號建立與修復 | 10 分鐘 | 3 小時 |
| RLS 策略修復 | 5 分鐘 | 1 小時 |
| 測試與驗證 | 15 分鐘 | 30 分鐘 |
| **總計** | **95 分鐘** | **7 小時** |

**差異原因**：
- 帳號建立遇到多次失敗（Auth API 錯誤）
- RLS 策略導致登入死鎖
- 環境變數快取問題
- ID 不一致導致功能錯誤

**使用 SOP 後預期時間**：
- 遵循 SOP 應該可以在 **1.5-2 小時**內完成
- 大部分問題都已經有明確解決方案

---

## 🎓 關鍵學習重點

1. **Auth 系統很複雜，不要嘗試手動操作**
   - 使用官方工具（Dashboard 或 API）
   - 如果 API 失敗，優先使用 Dashboard

2. **環境變數需要重新建置才能生效**
   - 設定後必須重新部署
   - 使用測試 API 驗證

3. **資料表關聯必須嚴格一致**
   - auth.users.id = profiles.id = admin_users.id
   - 任何不一致都會導致問題

4. **RLS 策略影響登入流程**
   - profiles 表必須允許查詢
   - 使用 service_role key 繞過限制

5. **永遠先確認目標站點**
   - 檢查 Project Ref
   - 使用環境變數區分
   - 腳本中加入確認訊息

---

## 📞 疑難排解決策樹

```
登入失敗？
├─ 顯示「帳號或密碼錯誤」
│  ├─ 檢查 profiles.username 是否存在
│  ├─ 檢查 profiles.id 與 auth.users.id 是否一致
│  └─ 在 Dashboard 重設密碼
│
├─ 顯示「系統錯誤」
│  ├─ 檢查 admin_users 記錄是否存在
│  ├─ 檢查 admin_users.id 與登入 User ID 是否一致
│  └─ 檢查 RLS 策略是否正確
│
└─ 環境變數 undefined
   ├─ 確認 Vercel 環境變數已設定
   ├─ 重新部署（Clear Cache）
   └─ 使用 /api/env-test 驗證
```

---

---

## 2026-01-26: 訂單詳情頁面 JOIN 查詢失敗事件

### 📌 問題描述

訂單詳情頁面出現 PostgreSQL 錯誤：
```
PGRST200: Could not find a relationship between 'orders' and 'profiles' in the schema cache
```

導致所有訂單詳情頁面返回 404 錯誤。

---

### 🔍 問題根源分析

**引入時間**: 2026-01-25 21:02:32 (提交 `a11c0eb`)
**提交訊息**: `feat: 後台性能優化 Phase 1 - 快取與並行查詢優化`
**問題檔案**: `lib/actions/orders.ts` - `getOrderById` 函式

#### 錯誤的優化嘗試

在效能優化過程中，為了減少查詢次數，嘗試使用 Supabase JOIN 語法：

```typescript
// ❌ 錯誤：嘗試 JOIN orders 和 profiles
supabase
  .from('orders')
  .select(`*, profiles(${selectFields})`)
  .eq('id', orderId)
  .single()
```

#### 為什麼會失敗？

**資料庫結構問題**：

```
orders 表:
  - user_id → 外鍵指向 auth.users(id)

profiles 表:
  - id → 外鍵指向 auth.users(id)

問題：orders 和 profiles 之間沒有「直接」的外鍵關係！
```

兩個表都指向 `auth.users`，但彼此之間沒有直接關聯。Supabase PostgREST 無法自動推斷這種「間接」關係，因此 JOIN 查詢失敗。

#### 對比：優化前後的差異

**優化前（正確）**：
```typescript
// 1. 先查詢訂單
const { data: order } = await supabase
  .from('orders')
  .select('*')
  .eq('id', orderId)
  .single()

// 2. 再使用 user_id 查詢 profile
const { data: profile } = await supabase
  .from('profiles')
  .select(selectFields)
  .eq('id', order.user_id)
  .maybeSingle()

// ✅ 明確的分步查詢，容易理解和除錯
```

**優化後（錯誤）**：
```typescript
// 嘗試一次查詢取得所有資料
const { data: order } = await supabase
  .from('orders')
  .select(`*, profiles(${selectFields})`)  // ❌ 找不到關聯
  .eq('id', orderId)
  .single()

// ❌ 導致 PGRST200 錯誤
```

---

### ✅ 正確的解決方案

**修復時間**: 2026-01-26 18:40 (提交 `ba81317`)

**採用方案：分別查詢 + 並行優化**

```typescript
// 並行查詢：訂單資料與相關資料同時查詢
const [orderResult, orderItemsResult, ...] = await Promise.all([
  // 查詢訂單主表
  supabase.from('orders').select('*').eq('id', orderId).single(),

  // 查詢訂單明細
  supabase.from('order_items').select('*').eq('order_id', orderId),

  // ... 其他相關資料
])

// 查詢完成後，再使用 user_id 查詢 profile
const { data: profile } = await supabase
  .from('profiles')
  .select(selectFields)
  .eq('id', order.user_id)
  .single()
```

**優點**：
- ✅ 明確且可靠，不依賴隱式關聯
- ✅ 保留並行查詢優化（訂單明細、時間軸等仍然並行）
- ✅ 只增加 1 次額外查詢（實際影響小）
- ✅ 易於除錯和維護

---

### 📖 經驗教訓

#### 1. **不要盲目相信 ORM/Query Builder 的 JOIN 語法**

即使 Supabase 提供了類似的語法，也需要確認：
- 表之間是否有「直接」的外鍵關係
- 是否在 PostgREST schema cache 中註冊
- 關聯是否明確定義在資料庫層級

#### 2. **效能優化需要權衡取捨**

| 優化方案 | 優點 | 缺點 | 適用情境 |
|---------|------|------|---------|
| JOIN 查詢 | 減少查詢次數 | 依賴隱式關聯，容易出錯 | 表之間有明確 FK |
| 分別查詢 | 明確可靠 | 增加查詢次數 | 關聯不明確時 |
| 並行查詢 | 總時間不增加 | 程式碼複雜度稍高 | 多個獨立查詢 |

**結論**：在分散式系統中，**穩定性 > 效能**。增加 1 次查詢的成本（~10-50ms）遠低於系統崩潰的成本。

#### 3. **測試不足導致問題延遲發現**

| 階段 | 應該做什麼 | 實際情況 | 改善方案 |
|-----|----------|---------|---------|
| 開發階段 | 手動測試所有修改的頁面 | ❌ 未測試訂單詳情 | ✅ 建立測試檢查清單 |
| 提交前 | 執行端到端測試 | ❌ 無自動化測試 | ✅ 新增 E2E 測試 |
| 部署後 | 監控錯誤日誌 | ⚠️ 錯誤日誌不夠詳細 | ✅ 改善錯誤日誌格式 |

**改善方案**：
- [x] 改善錯誤日誌格式（已完成）
- [ ] 為核心功能新增 E2E 測試（Playwright）
- [ ] 在 CI/CD 中執行測試
- [ ] 建立提交前檢查清單

#### 4. **PostgREST 關聯查詢的限制**

Supabase PostgREST 的 JOIN 語法（Resource Embedding）僅支援：
- ✅ 表之間有明確的 `FOREIGN KEY` 約束
- ✅ 關係已在 schema cache 中註冊
- ✅ 直接的父子關係（一對多、多對一）

**不支援**：
- ❌ 隱式關聯（透過第三個表）
- ❌ 複雜的 JOIN 條件
- ❌ 自定義關聯邏輯
- ❌ 多對多關聯（需要中介表）

**替代方案**：
1. 使用 PostgreSQL RPC 函數（自定義 SQL）
2. 分別查詢後在應用層組合
3. 建立 Materialized View

---

### 🔄 修復過程時間軸

| 時間 | 事件 | 行動 |
|-----|------|------|
| 2026-01-25 21:02 | 引入錯誤（a11c0eb） | 提交效能優化 |
| 2026-01-26 18:10 | 使用者回報問題 | 截圖顯示 PGRST200 錯誤 |
| 2026-01-26 18:15 | 新增詳細錯誤日誌 | 改善診斷資訊 |
| 2026-01-26 18:20 | 使用 git blame 定位 | 找到 a11c0eb 提交 |
| 2026-01-26 18:30 | 修復並測試 | 恢復分步查詢 |
| 2026-01-26 18:40 | 提交修復（ba81317） | 通過所有檢查 |

**總處理時間**: 30 分鐘
**影響範圍**: 後台訂單詳情頁面
**資料損失**: 無
**影響使用者**: 後台管理員

---

### 🎯 預防措施

#### 短期（本週完成）
- [x] 移除錯誤的 JOIN 查詢
- [x] 改善錯誤日誌輸出
- [ ] 檢查專案中其他類似的 JOIN 查詢
- [ ] 建立「效能優化檢查清單」

#### 中期（下週完成）
- [ ] 新增核心頁面的 E2E 測試（訂單列表、訂單詳情、商品管理）
- [ ] 建立提交前測試檢查清單
- [ ] 撰寫 Supabase 查詢最佳實踐文檔
- [ ] Code Review：檢查所有 Supabase 查詢

#### 長期（下個月完成）
- [ ] 建立 CI/CD 自動化測試
- [ ] 設定錯誤監控系統（Sentry）
- [ ] 定期 Code Review 機制
- [ ] 效能監控與告警

---

### 📚 參考資料

- [Supabase PostgREST 文檔 - Resource Embedding](https://postgrest.org/en/stable/references/api/tables_views.html#resource-embedding)
- [PostgreSQL Foreign Key 約束](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK)
- [PostgREST 錯誤代碼](https://postgrest.org/en/stable/references/errors.html)
- [Supabase 查詢優化建議](https://supabase.com/docs/guides/database/postgres/query-performance)

---

### 🤝 致謝

感謝使用者即時回報問題並提供詳細的錯誤截圖，讓我們能快速定位並修復。這次經驗提醒我們：

> **效能優化永遠不應該犧牲系統穩定性。**
> **先確保功能正確，再考慮優化。**

---

**維護者**: Claude Code + haraluya
**最後更新**: 2026-01-26
**下次更新**: 持續記錄重要經驗
