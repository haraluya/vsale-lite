# Supabase Docker 本地開發環境安裝教學

**專案**: Vsale-lite
**日期**: 2026-01-02
**目標**: 在 Windows 11 使用 Docker 建立 Supabase 本地開發環境

---

## 📋 前置需求

### ✅ 已安裝
- [x] Docker Desktop (版本 29.1.3)
- [x] Supabase CLI (版本 2.70.5)
- [x] Node.js (v22.x)
- [x] Git

### ⚙️ 系統需求
- Windows 11
- 至少 8GB RAM (建議 16GB)
- 至少 10GB 可用磁碟空間
- WSL2 已啟用 (Docker Desktop 需要)

---

## 🚀 步驟 1: 確認 Docker 運作

```powershell
# 檢查 Docker 狀態
docker ps

# 如果出現錯誤,請啟動 Docker Desktop
# 位置: 開始選單 → Docker Desktop
```

**預期輸出**: 顯示容器列表 (可能是空的)

---

## 🔧 步驟 2: 初始化 Supabase 專案

### 2.1 檢查專案是否已連結

```bash
cd D:\APP\vsale
supabase status
```

**如果出現錯誤**: 表示本地環境尚未啟動 (正常)

### 2.2 生成 Supabase 配置

Supabase CLI 已自動連結到遠端專案,我們只需要啟動本地環境:

```bash
# 確認專案已連結
supabase projects list
```

應該看到 `vasle-lite` 專案標記為 `LINKED ●`

---

## 🐳 步驟 3: 啟動本地 Supabase

### 3.1 首次啟動

```bash
cd D:\APP\vsale
supabase start
```

**這個指令會:**
1. 下載 Supabase Docker 映像檔 (~1-2GB)
2. 啟動以下服務:
   - PostgreSQL 資料庫
   - PostgREST API
   - GoTrue Auth 服務
   - Storage API
   - Realtime 服務
   - Studio (管理介面)
   - Edge Functions

**預期時間**: 首次執行約 3-5 分鐘 (下載映像檔)

### 3.2 啟動成功後的輸出

```
Started supabase local development setup.

         API URL: http://localhost:54321
     GraphQL URL: http://localhost:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**重要**: 記下這些連線資訊!

---

## 📝 步驟 4: 建立本地環境變數

### 4.1 建立 `.env.local.docker` 檔案

建立一個新的環境變數檔案專門用於本地開發:

```bash
# 位置: D:\APP\vsale\.env.local.docker
```

**內容** (使用 `supabase start` 輸出的值):

```env
# Supabase 本地開發環境
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 本地資料庫連線 (供 migration 使用)
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

### 4.2 切換環境

**使用本地環境**:
```bash
# 複製本地設定
cp .env.local.docker .env.local

# 啟動開發伺服器
pnpm dev
```

**切換回遠端環境**:
```bash
# 復原遠端設定 (從 Git 復原)
git checkout .env.local

# 或手動設定回遠端 URL
```

---

## 🗄️ 步驟 5: 套用 Migrations

### 5.1 重置本地資料庫

```bash
# 套用所有 migrations
supabase db reset
```

**這個指令會:**
1. 清空本地資料庫
2. 按順序套用所有 migrations:
   - `20260101_initial_schema.sql`
   - `20260102_products_and_categories.sql`
3. 建立所有資料表、索引、RLS 政策
4. 插入預設資料 (tiers, categories)

### 5.2 驗證資料表

```bash
# 檢查資料表是否建立成功
supabase db dump --schema public
```

應該看到:
- `tiers`
- `profiles`
- `categories`
- `products`

---

## 🎨 步驟 6: 開啟 Supabase Studio

### 6.1 訪問管理介面

在瀏覽器開啟:
```
http://localhost:54323
```

### 6.2 Studio 功能

**Table Editor** - 查看/編輯資料表
- 點擊 "Table Editor"
- 可直接新增/編輯/刪除資料
- 即時預覽資料

**SQL Editor** - 執行 SQL 查詢
- 點擊 "SQL Editor"
- 可執行任何 SQL 指令
- 驗證 migrations 是否正確

**Authentication** - 管理使用者
- 查看所有註冊使用者
- 手動建立測試帳號

**Storage** - 管理檔案
- 查看 `products` bucket
- 上傳測試圖片

---

## 🧪 步驟 7: 建立測試資料

### 7.1 建立測試管理員

在 Studio → Authentication → Users → Add user:

```
Email: admin@local.test
Password: admin123456
```

### 7.2 建立 Profile (SQL Editor)

```sql
-- 在 SQL Editor 執行
INSERT INTO profiles (id, role, email, tier_id)
SELECT
  auth.uid(),
  'admin',
  'admin@local.test',
  NULL
FROM auth.users
WHERE email = 'admin@local.test';
```

### 7.3 建立測試客戶

```sql
-- 建立零售客戶
INSERT INTO profiles (id, role, phone, tier_id)
VALUES (
  gen_random_uuid(),
  'client',
  '0912345678',
  (SELECT id FROM tiers WHERE name = '零售' LIMIT 1)
);
```

### 7.4 建立測試商品

```sql
-- 建立測試商品
INSERT INTO products (code, name, category_id, stock, unit)
VALUES
  ('TEST001', '測試商品 A', (SELECT id FROM categories LIMIT 1), 100, '件'),
  ('TEST002', '測試商品 B', (SELECT id FROM categories LIMIT 1), 50, '箱'),
  ('TEST003', '測試商品 C', (SELECT id FROM categories LIMIT 1), -10, '件');
```

---

## 🔄 步驟 8: 啟動 Next.js 開發伺服器

### 8.1 確認環境變數

```bash
# 確認使用本地環境
cat .env.local | grep SUPABASE_URL
```

應該顯示: `http://localhost:54321`

### 8.2 啟動開發伺服器

```bash
pnpm dev
```

### 8.3 測試登入

訪問:
```
http://localhost:3000/admin/login
```

使用測試帳號登入:
- Email: `admin@local.test`
- Password: `admin123456`

---

## 📊 步驟 9: 驗證功能

### 9.1 檢查清單

- [ ] 管理員可登入後台
- [ ] 可查看會員等級列表
- [ ] 可查看商品分類列表
- [ ] 可查看商品列表
- [ ] 可新增商品
- [ ] 可上傳商品圖片
- [ ] 客戶可登入前台 (如有測試帳號)

### 9.2 查看日誌

**Supabase 日誌**:
```bash
supabase logs
```

**Next.js 開發伺服器日誌**:
在終端機中查看

---

## 🛠️ 常用指令

### 啟動/停止服務

```bash
# 啟動 Supabase
supabase start

# 停止 Supabase
supabase stop

# 重啟 Supabase
supabase restart
```

### 資料庫操作

```bash
# 重置資料庫 (套用所有 migrations)
supabase db reset

# 查看 migrations 狀態
supabase migration list

# 建立新 migration
supabase migration new feature_name

# 從遠端拉取 schema
supabase db pull
```

### 查看狀態

```bash
# 查看所有服務狀態
supabase status

# 查看服務日誌
supabase logs

# 查看資料庫日誌
supabase logs --db
```

---

## 🔀 同步本地與遠端

### 從遠端拉取最新 Schema

```bash
# 拉取遠端 schema 到本地
supabase db pull
```

### 推送本地 Migrations 到遠端

```bash
# 推送所有未套用的 migrations
supabase db push
```

**警告**: 推送前請確認 migrations 正確!

---

## 🐛 常見問題排解

### 問題 1: Docker 無法啟動

**症狀**: `supabase start` 顯示 Docker 連線錯誤

**解決**:
1. 開啟 Docker Desktop
2. 確認 Docker 圖示顯示為綠色 (執行中)
3. 執行 `docker ps` 確認 Docker 運作

### 問題 2: Port 被佔用

**症狀**: `Error: port 54321 is already in use`

**解決**:
```bash
# 停止現有 Supabase 實例
supabase stop

# 或停止佔用 port 的服務
netstat -ano | findstr :54321
taskkill /PID <PID> /F
```

### 問題 3: Migration 失敗

**症狀**: `supabase db reset` 失敗

**解決**:
```bash
# 檢查 migration 檔案語法
cat supabase/migrations/*.sql

# 清空資料庫重新開始
supabase db reset --db-url postgresql://postgres:postgres@localhost:54322/postgres
```

### 問題 4: 連不到本地資料庫

**症狀**: Next.js 顯示連線錯誤

**解決**:
1. 確認 `.env.local` 使用正確的 URL
2. 確認 Supabase 服務正在執行: `supabase status`
3. 重啟 Next.js: `pnpm dev`

---

## 📚 進階設定

### 自訂 Port

編輯 `supabase/config.toml`:

```toml
[api]
port = 54321

[db]
port = 54322

[studio]
port = 54323
```

### 持久化資料

本地資料儲存在:
```
D:\APP\vsale\.supabase\
```

**備份資料**:
```bash
# 匯出資料
supabase db dump -f backup.sql

# 復原資料
psql -h localhost -p 54322 -U postgres -d postgres -f backup.sql
```

---

## 🎯 最佳實踐

### 1. 工作流程

```bash
# 早上開始工作
supabase start          # 啟動本地環境
pnpm dev                # 啟動 Next.js

# 開發中建立新功能
supabase migration new add_feature
# 編輯 migration 檔案
supabase db reset       # 套用到本地

# 下班前
git add .
git commit -m "feat: 新功能"
supabase stop           # 停止 Supabase (節省資源)
```

### 2. 環境切換

**建議使用不同的環境變數檔案**:
- `.env.local` - 遠端 Supabase (正式環境)
- `.env.local.docker` - 本地 Docker (開發環境)
- `.env.test` - 測試環境

### 3. Migration 管理

**原則**:
1. 每個功能一個 migration
2. 使用有意義的檔案名稱
3. 本地測試後再推送到遠端
4. 永遠不要刪除已套用的 migration

---

## ✅ 完成檢查清單

安裝完成後,確認以下項目:

- [ ] Docker Desktop 執行中
- [ ] `supabase start` 成功啟動
- [ ] Studio 可正常訪問 (http://localhost:54323)
- [ ] 資料表已建立 (tiers, profiles, categories, products)
- [ ] Next.js 可連接本地 Supabase
- [ ] 測試帳號可登入
- [ ] 可新增/查看/編輯資料

---

## 🔗 相關資源

- [Supabase CLI 文件](https://supabase.com/docs/guides/cli)
- [Docker Desktop 下載](https://www.docker.com/products/docker-desktop/)
- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)

---

**最後更新**: 2026-01-02
**維護者**: Claude Code
**專案**: Vsale-lite
