# 主站完整備份 - 2026-01-22 14:56

**備份時間**: 2026-01-22 14:56:53
**備份來源**: 主站 (qwovavytryvgchcowjof.supabase.co)
**備份目標**: 站點二 (rdyvmgomjdglflrcfijs.supabase.co)

---

## 📦 備份檔案清單

| 檔案名稱 | 大小 | 行數 | 說明 |
|---------|------|------|------|
| `main-site-full-backup.sql` | 118KB | 3,777 | **Schema 備份**<br>包含：CREATE TABLE、FUNCTION、TRIGGER、INDEX、CONSTRAINT、RLS POLICY、GRANT |
| `main-site-data.sql` | 617KB | 2,962 | **Data 備份**<br>包含：所有資料表的 COPY 語句（auth、public、storage schema） |

**總大小**: 735KB
**總行數**: 6,739 行

---

## 📊 備份內容詳細

### Schema 備份 (main-site-full-backup.sql)

**包含元件**:
- ✅ Extensions (pg_graphql, pg_stat_statements, pg_trgm, pgcrypto, uuid-ossp, supabase_vault)
- ✅ Functions (16+ 個自訂函數)
- ✅ Tables (19 個資料表)
- ✅ Views (1 個 active_coupons view)
- ✅ Triggers (7+ 個觸發器)
- ✅ Indexes (效能優化索引)
- ✅ Constraints (外鍵、唯一性約束)
- ✅ RLS Policies (Row Level Security 策略)
- ✅ GRANT 權限設定

**關鍵函數**:
- `auto_assign_series_color()` - 自動分配系列顏色
- `auto_generate_product_code()` - 自動產生商品編號
- `calculate_order_total_amount()` - 計算訂單總金額
- `calculate_shipping_fee()` - 計算運費
- `generate_product_code()` - 產生商品編號
- `get_customer_current_tier()` - 取得客戶當前等級
- `get_price_for_tier()` - 取得等級價格
- `handle_updated_at()` - 自動更新時間戳記
- `is_admin_user()` - 檢查管理員權限
- `is_client_user()` - 檢查客戶權限

**資料表清單**:
1. `tiers` - 會員等級
2. `profiles` - 使用者個人資料
3. `categories` - 商品分類
4. `series` - 商品系列
5. `products` - 商品
6. `tier_prices` - 等級價格
7. `orders` - 訂單
8. `order_items` - 訂單項目
9. `order_timelines` - 訂單歷史
10. `order_custom_fees` - 訂單自訂費用
11. `coupons` - 優惠券
12. `user_coupons` - 使用者優惠券
13. `order_coupons` - 訂單優惠券
14. `coupon_tier_restrictions` - 優惠券等級限制
15. `coupon_series_restrictions` - 優惠券系列限制
16. `admin_users` - 管理員帳號
17. `audit_logs` - 稽核日誌
18. `system_settings` - 系統設定
19. `backup_jobs` - 備份記錄
20. `announcements` - 公告
21. `home_page_blocks` - 首頁區塊

### Data 備份 (main-site-data.sql)

**包含資料表** (47 個):

#### auth Schema (19 個表)
- `auth.audit_log_entries` - 稽核日誌
- `auth.flow_state` - 登入流程狀態
- `auth.identities` - 使用者身份
- `auth.instances` - 實例
- `auth.mfa_amr_claims` - MFA 聲明
- `auth.mfa_challenges` - MFA 挑戰
- `auth.mfa_factors` - MFA 因素
- `auth.oauth_authorizations` - OAuth 授權
- `auth.oauth_client_states` - OAuth 客戶端狀態
- `auth.oauth_clients` - OAuth 客戶端
- `auth.oauth_consents` - OAuth 同意
- `auth.one_time_tokens` - 一次性令牌
- `auth.refresh_tokens` - 刷新令牌
- `auth.saml_providers` - SAML 提供者
- `auth.saml_relay_states` - SAML 中繼狀態
- `auth.sessions` - 會話
- `auth.sso_domains` - SSO 域
- `auth.sso_providers` - SSO 提供者
- `auth.users` - 使用者 **(6 個使用者)**

#### public Schema (19 個表)
- `announcements` - 公告
- `audit_logs` - 稽核日誌
- `backup_jobs` - 備份記錄
- `categories` - 商品分類
- `coupon_series_restrictions` - 優惠券系列限制
- `coupon_tier_restrictions` - 優惠券等級限制
- `coupons` - 優惠券
- `home_page_blocks` - 首頁區塊
- `order_coupons` - 訂單優惠券
- `order_custom_fees` - 訂單自訂費用
- `order_items` - 訂單項目
- `order_timelines` - 訂單歷史
- `orders` - 訂單
- `products` - 商品
- `profiles` - 使用者個人資料
- `series` - 商品系列
- `system_settings` - 系統設定
- `tier_prices` - 等級價格
- `tiers` - 會員等級
- `user_coupons` - 使用者優惠券

#### storage Schema (9 個表)
- `storage.buckets` - Bucket 資料
- `storage.buckets_analytics` - Bucket 分析
- `storage.buckets_vectors` - Bucket 向量
- `storage.objects` - Storage 物件 metadata
- `storage.prefixes` - 前綴
- `storage.s3_multipart_uploads` - S3 分段上傳
- `storage.s3_multipart_uploads_parts` - S3 分段上傳部分
- `storage.vector_indexes` - 向量索引

---

## 🚀 如何使用此備份

### 方案 A: 使用 Supabase Dashboard（推薦）⭐

**適用**: 沒有安裝 PostgreSQL 客戶端工具

**步驟**: 參考 `docs/QUICK_MIGRATION_GUIDE.md`

**預計時間**: 10 分鐘

### 方案 B: 使用 psql 命令列（進階）

**適用**: 已安裝 PostgreSQL 客戶端工具

**步驟**:

```powershell
# 設定站點二連線資訊
$env:PGPASSWORD = "Devape-BM69"
$DB_HOST = "db.rdyvmgomjdglflrcfijs.supabase.co"
$DB_USER = "postgres.rdyvmgomjdglflrcfijs"
$DB_NAME = "postgres"

# 1. 清空資料庫
psql -h $DB_HOST -p 5432 -U $DB_USER -d $DB_NAME -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 2. 匯入 Schema
psql -h $DB_HOST -p 5432 -U $DB_USER -d $DB_NAME -f main-site-full-backup.sql

# 3. 匯入 Data
psql -h $DB_HOST -p 5432 -U $DB_USER -d $DB_NAME -f main-site-data.sql
```

**預計時間**: 5 分鐘

---

## ⚠️ 重要注意事項

### 1. Storage 圖片未包含
**此備份僅包含 Storage metadata**,不包含實際圖片檔案。

**解決方案**: 需要另外手動從主站下載圖片並上傳到站點二。

**詳細步驟**: 參考 `docs/QUICK_MIGRATION_GUIDE.md` 步驟 3

### 2. 認證使用者密碼已加密
備份中的 `auth.users` 包含加密後的密碼。

**重要**: 匯入時必須使用 `SET session_replication_role = replica;` 停用觸發器,避免重複加密。

`main-site-data.sql` 已自動包含此設定。

### 3. 執行順序
**必須按照順序執行**:
1. 先匯入 `main-site-full-backup.sql` (Schema)
2. 再匯入 `main-site-data.sql` (Data)

反向執行會導致「資料表不存在」錯誤。

### 4. 清空目標資料庫
建議在匯入前完全清空站點二的 `public` schema,避免衝突。

**清空指令**:
```sql
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

---

## 📊 驗證備份完整性

### 檢查 Schema
```sql
-- 列出所有資料表
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 列出所有函數
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

### 檢查 Data
```sql
-- 檢查記錄數
SELECT
  'auth.users' AS table_name, COUNT(*) FROM auth.users
UNION ALL
SELECT 'tiers', COUNT(*) FROM tiers
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
ORDER BY table_name;
```

---

## 🛡️ 備份安全性

### 敏感資料
此備份包含：
- ✅ 加密後的使用者密碼
- ✅ 客戶個人資料 (姓名、電話、地址)
- ✅ 訂單資料
- ✅ 管理員帳號資訊

### 存放建議
- ❌ **不要** 提交到 Git
- ❌ **不要** 分享給未授權人員
- ✅ 儲存於安全的本地目錄
- ✅ 定期刪除舊備份

---

## 📚 相關文件

- [QUICK_MIGRATION_GUIDE.md](../../docs/QUICK_MIGRATION_GUIDE.md) - 5 步驟快速遷移指南
- [BACKUP_ANALYSIS_REPORT.md](../../docs/BACKUP_ANALYSIS_REPORT.md) - 備份系統分析報告
- [SITE_CREDENTIALS.md](../../docs/SITE_CREDENTIALS.md) - 站點連線資訊
- [MANUAL_MIGRATION_STEPS.md](../../docs/MANUAL_MIGRATION_STEPS.md) - 詳細手動遷移步驟

---

**備份執行者**: Claude Sonnet 4.5
**備份工具**: Supabase CLI v2.70.5
**備份日期**: 2026-01-22 14:56:53
**文件版本**: 1.0.0
