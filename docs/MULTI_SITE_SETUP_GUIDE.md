# Vsale-lite 多站點部署完整安裝指引

> **專案**: Vsale-lite B2B 批發訂貨系統
> **目標**: 一份程式碼 → 三個獨立站點（資料庫完全隔離）
> **預估時間**: 3.5 小時
> **難度**: 中等

---

## 📋 目錄

1. [架構概覽](#架構概覽)
2. [前置準備](#前置準備)
3. [階段 1: 基礎設施準備](#階段-1-基礎設施準備)
4. [階段 2: 環境變數配置](#階段-2-環境變數配置)
5. [階段 3: Migration 初始化](#階段-3-migration-初始化)
6. [階段 4: 程式碼修改](#階段-4-程式碼修改)
7. [階段 5: 測試與驗證](#階段-5-測試與驗證)
8. [階段 6: 正式部署](#階段-6-正式部署)
9. [新增更多站點](#新增更多站點)
10. [故障排除](#故障排除)
11. [維護指南](#維護指南)

---

## 架構概覽

### 當前架構（單站點）
```
GitHub Repo → GitHub Actions → Vercel Project 1 → Supabase Project 1
```

### 目標架構（多站點）
```
GitHub Repo (單一)
    │
    ↓ push master
GitHub Actions (並行部署)
    ├─ Quality Check (一次)
    ├─ Deploy Site 1 ─→ Vercel Project 1 ─→ Supabase Project 1
    ├─ Deploy Site 2 ─→ Vercel Project 2 ─→ Supabase Project 2
    └─ Deploy Site 3 ─→ Vercel Project 3 ─→ Supabase Project 3
```

### 核心特性
- ✅ **一份程式碼**: 單一 GitHub repo，統一維護
- ✅ **完全隔離**: 每站點獨立 Supabase 專案（資料互不影響）
- ✅ **同步部署**: 一次 push 同步更新三個站點
- ✅ **相同結構**: 使用同一套 Migration（資料庫結構一致）
- ✅ **獨立配置**: 透過環境變數區分站點

---

## 前置準備

### 需要的帳號與工具

- [x] GitHub 帳號（已有）
- [x] Vercel 帳號（已有）
- [x] Supabase 帳號（已有）
- [ ] Google Cloud Platform 帳號（用於 GCS 備份，可選）
- [x] 本地已安裝:
  - Node.js v22+
  - pnpm v9+
  - Supabase CLI (`npm install -g supabase`)
  - Git

### 準備清單

| 項目 | 數量 | 說明 |
|------|------|------|
| 域名 | 2 個新域名 | Site 2 和 Site 3 使用（或使用 Vercel 預設域名） |
| Supabase 專案 | 2 個新專案 | Site 2 和 Site 3 使用 |
| Vercel 專案 | 2 個新專案 | Site 2 和 Site 3 使用 |
| GCS Buckets | 2 個（可選） | 獨立備份用（或共用現有 bucket） |

---

## 階段 1: 基礎設施準備

**預估時間**: 30 分鐘

### 1.1 建立 Supabase 專案 (Site 2)

1. **前往 Supabase Dashboard**
   - 網址: https://supabase.com/dashboard
   - 點擊 "New Project"

2. **專案設定**
   ```
   Organization: 選擇現有組織
   Project Name: vsale-site2
   Database Password: [產生強密碼並記錄]
   Region: Southeast Asia (Singapore) - ap-southeast-1
   Pricing Plan: Free (可後續升級)
   ```

3. **記錄專案資訊**

   建立一個記錄表（Excel 或 Notion）:

   | 項目 | 值 | 位置 |
   |------|---|------|
   | Project ID | `[自動產生]` | 專案設定 → General |
   | Project URL | `https://[project-id].supabase.co` | 專案設定 → API |
   | Anon Key | `eyJhbGci...` | 專案設定 → API → anon public |
   | Service Role Key | `eyJhbGci...` | 專案設定 → API → service_role (secret) |
   | Database Password | `[你設定的密碼]` | 建立專案時設定 |
   | Connection Pooler Host | `aws-0-ap-southeast-1.pooler.supabase.com` | 專案設定 → Database → Connection Pooling |
   | Connection Pooler Port | `6543` | 同上 |
   | Database User | `postgres.[project-id]` | 同上 |

4. **重複以上步驟建立 Site 3**
   - Project Name: `vsale-site3`
   - 同樣記錄所有資訊

---

### 1.2 建立 Vercel 專案 (Site 2)

1. **前往 Vercel Dashboard**
   - 網址: https://vercel.com/dashboard
   - 點擊 "Add New..." → "Project"

2. **匯入 Git Repository**
   ```
   選擇 GitHub repo: haraluya/vsale-lite
   專案名稱: vsale-site2
   Framework Preset: Next.js
   Root Directory: ./
   Build Command: pnpm build
   Output Directory: .next
   Install Command: pnpm install
   Development Command: pnpm dev
   ```

3. **重要: 暫時不要部署**
   - 點擊 "Configure Project"
   - **暫時跳過環境變數設定**（稍後統一設定）
   - 點擊右上角 "Skip" 或 "Cancel"

4. **記錄 Vercel Project ID**

   進入專案設定頁面:
   - 專案 → Settings → General
   - 複製 "Project ID"（格式: `prj_XXXXXXXXXX`）
   - 記錄到表格中

5. **重複以上步驟建立 Site 3**
   - 專案名稱: `vsale-site3`
   - 同樣記錄 Project ID

---

### 1.3 域名綁定（可選）

**如果有自訂域名**:

1. 進入 Vercel 專案 → Settings → Domains
2. 新增域名（例如 `site2.mydomain.com`）
3. 依照指示設定 DNS 記錄
4. 等待 DNS 生效（通常 5-60 分鐘）

**如果暫時沒有域名**:

- Vercel 會自動提供預設域名: `vsale-site2.vercel.app`
- 可後續再綁定自訂域名

---

### 1.4 GCS Bucket 設定（可選）

**方案 A: 共用現有 Bucket（推薦）**

- 使用現有的 `vsale-backups-haraluya`
- 備份檔案使用不同前綴區分（如 `site1-`, `site2-`）
- **無需額外設定**

**方案 B: 建立獨立 Buckets**

1. 前往 [Google Cloud Console](https://console.cloud.google.com/storage)
2. 建立兩個新 Buckets:
   - `vsale-backups-site2`
   - `vsale-backups-site3`
3. 設定 Storage Class: Standard
4. 設定 Location: asia-southeast1
5. 權限設定: Uniform
6. 為每個 bucket 建立 Service Account 或共用現有的

---

## 階段 2: 環境變數配置

**預估時間**: 45 分鐘

### 2.1 GitHub Secrets 設定

1. **前往 GitHub Repository**
   - 網址: https://github.com/[你的用戶名]/vsale-lite
   - Settings → Secrets and variables → Actions

2. **新增 Secrets**

   點擊 "New repository secret"，依序新增:

   | Name | Secret | 說明 |
   |------|--------|------|
   | `VERCEL_PROJECT_ID_SITE2` | `prj_XXXXXXXXXX` | 從 Vercel Site 2 專案設定複製 |
   | `VERCEL_PROJECT_ID_SITE3` | `prj_YYYYYYYYYYY` | 從 Vercel Site 3 專案設定複製 |

3. **確認現有 Secrets**

   確保以下 Secrets 已存在:
   - `VERCEL_TOKEN` - Vercel API Token（所有站點共用）
   - `VERCEL_ORG_ID` - Vercel 組織 ID（所有站點共用）
   - `VERCEL_PROJECT_ID_SITE1` - Site 1 專案 ID（現有主站）

---

### 2.2 Vercel 環境變數設定

**重要**: 每個 Vercel 專案需要獨立設定環境變數

#### Site 1 (主站) - 補充設定

1. 進入 Vercel 專案: `vsale-site1`
2. Settings → Environment Variables
3. **新增以下變數** (如果尚未設定):

| Variable Name | Value | Environments |
|--------------|-------|--------------|
| `SITE_IDENTIFIER` | `site1` | Production |

#### Site 2 - 完整設定

1. 進入 Vercel 專案: `vsale-site2`
2. Settings → Environment Variables
3. 點擊 "Add New"，依序新增:

| Variable Name | Value | Environments |
|--------------|-------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[SITE2_PROJECT_ID].supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `[Site 2 Anon Key]` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `[Site 2 Service Role Key]` | Production |
| `CRON_SECRET` | `[隨機生成 32+ 字元]` | Production |
| `SITE_IDENTIFIER` | `site2` | Production |
| `GCS_PROJECT_ID` | `vsale-backup` | Production |
| `GCS_BUCKET_NAME` | `vsale-backups-site2` 或 `vsale-backups-haraluya` | Production |
| `GCS_SERVICE_ACCOUNT_KEY` | `{"type":"service_account",...}` | Production |
| `DB_HOST` | `aws-0-ap-southeast-1.pooler.supabase.com` | Production |
| `DB_PORT` | `6543` | Production |
| `DB_NAME` | `postgres` | Production |
| `DB_USER` | `postgres.[SITE2_PROJECT_ID]` | Production |
| `DB_PASSWORD` | `[Site 2 Database Password]` | Production |

**產生 CRON_SECRET 的方式**:

```bash
# 使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 或使用 OpenSSL
openssl rand -base64 32
```

#### Site 3 - 完整設定

重複 Site 2 的步驟，替換為 Site 3 的對應值。

---

### 2.3 環境變數檢查清單

建立一份檢查表確保無遺漏:

```
Site 1:
 [x] NEXT_PUBLIC_SUPABASE_URL
 [x] NEXT_PUBLIC_SUPABASE_ANON_KEY
 [x] SUPABASE_SERVICE_ROLE_KEY
 [x] CRON_SECRET
 [x] SITE_IDENTIFIER
 [x] GCS_PROJECT_ID
 [x] GCS_BUCKET_NAME
 [x] GCS_SERVICE_ACCOUNT_KEY
 [x] DB_HOST
 [x] DB_PORT
 [x] DB_NAME
 [x] DB_USER
 [x] DB_PASSWORD

Site 2:
 [ ] NEXT_PUBLIC_SUPABASE_URL
 [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
 [ ] SUPABASE_SERVICE_ROLE_KEY
 [ ] CRON_SECRET
 [ ] SITE_IDENTIFIER
 [ ] GCS_PROJECT_ID
 [ ] GCS_BUCKET_NAME
 [ ] GCS_SERVICE_ACCOUNT_KEY
 [ ] DB_HOST
 [ ] DB_PORT
 [ ] DB_NAME
 [ ] DB_USER
 [ ] DB_PASSWORD

Site 3:
 [ ] ... (同 Site 2)
```

---

## 階段 3: Migration 初始化

**預估時間**: 30 分鐘

### 3.1 推送 Baseline Migration

**目標**: 將現有的資料庫結構推送到新建的 Site 2 和 Site 3

1. **開啟終端機**，進入專案目錄:
   ```bash
   cd d:\APP\vsale
   ```

2. **確認 Supabase CLI 已安裝**:
   ```bash
   supabase --version
   # 應顯示版本號（如 1.x.x）
   ```

3. **查看可用的 Migration 檔案**:
   ```bash
   ls supabase/migrations/
   # 應顯示: 20260116171402_consolidated_v1_baseline.sql
   ```

4. **推送 Migration 到 Site 2**:
   ```bash
   supabase db push --project-ref [SITE2_PROJECT_ID]
   ```

   範例:
   ```bash
   supabase db push --project-ref abcdefghijklmnopqrst
   ```

   預期輸出:
   ```
   Applying migration 20260116171402_consolidated_v1_baseline.sql...
   Finished supabase db push.
   ```

5. **推送 Migration 到 Site 3**:
   ```bash
   supabase db push --project-ref [SITE3_PROJECT_ID]
   ```

6. **驗證 Migration 狀態**:
   ```bash
   # Site 2
   supabase migration list --project-ref [SITE2_PROJECT_ID]

   # Site 3
   supabase migration list --project-ref [SITE3_PROJECT_ID]
   ```

   預期輸出:
   ```
         LOCAL      │   REMOTE   │     TIME (UTC)      │                  NAME
   ────────────────┼────────────┼─────────────────────┼──────────────────────────────────────
                   │ 2026...    │ 2026-01-22 10:00:00 │ consolidated_v1_baseline
   ```

---

### 3.2 驗證資料庫結構

1. **登入 Supabase Dashboard** (Site 2)
   - 進入專案 → Table Editor
   - 確認以下表格已建立:
     - `tiers` (會員等級)
     - `profiles` (使用者資料)
     - `categories` (商品分類)
     - `series` (商品系列)
     - `products` (商品)
     - `tier_prices` (等級價格)
     - `orders` (訂單)
     - `order_items` (訂單項目)
     - ... (其他表格)

2. **重複檢查 Site 3**

---

### 3.3 建立管理員帳號

**每個站點需要獨立的管理員帳號**

1. **進入 Supabase Dashboard** (Site 2)
   - SQL Editor → New Query

2. **執行以下 SQL** (需替換 email 和 password):

```sql
-- 建立管理員帳號
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@site2.com',  -- 替換為實際 email
  crypt('YourSecurePassword123', gen_salt('bf')),  -- 替換為實際密碼
  now(),
  now(),
  now(),
  '',
  '{"role": "admin"}'::jsonb,
  '{}'::jsonb
);

-- 建立 profiles 記錄
INSERT INTO profiles (user_id, role, display_name)
SELECT id, 'admin', 'Site 2 管理員'
FROM auth.users
WHERE email = 'admin@site2.com';

-- 驗證建立成功
SELECT email, raw_app_meta_data->>'role' as role
FROM auth.users
WHERE email = 'admin@site2.com';
```

3. **記錄管理員帳號資訊**:
   - Email: `admin@site2.com`
   - Password: `[你設定的密碼]`

4. **重複以上步驟建立 Site 3 管理員**:
   - Email: `admin@site3.com`

---

### 3.4 建立測試會員等級

1. **執行以下 SQL** (Site 2):

```sql
-- 建立基本會員等級
INSERT INTO tiers (name, description, discount_rate, status) VALUES
  ('零售', '一般零售客戶', 0, 'active'),
  ('批發', '批發客戶', 20, 'active'),
  ('VIP', 'VIP 客戶', 30, 'active');

-- 驗證建立成功
SELECT * FROM tiers;
```

2. **重複以上步驟 (Site 3)**

---

## 階段 4: 程式碼修改

**預估時間**: 30 分鐘

### 4.1 備份現有設定

```bash
# 備份 GitHub Actions workflow
cp .github/workflows/vercel-deploy.yml .github/workflows/vercel-deploy.yml.backup

# 備份 vercel.json
cp vercel.json vercel.json.backup
```

---

### 4.2 修改 GitHub Actions Workflow

1. **開啟檔案**: `.github/workflows/vercel-deploy.yml`

2. **完全替換內容** (可參考計畫檔案中的完整版本):

```yaml
name: Multi-Site Vercel Deploy

on:
  push:
    branches:
      - master
  pull_request:
    branches:
      - master

jobs:
  quality-checks:
    name: 程式碼品質檢查
    runs-on: ubuntu-latest

    steps:
      - name: Checkout 程式碼
        uses: actions/checkout@v4

      - name: 設定 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: 設定 pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: 安裝依賴
        run: pnpm install --frozen-lockfile

      - name: TypeScript 型別檢查
        run: pnpm type-check

      - name: ESLint 檢查
        run: pnpm lint

  deploy:
    name: 部署到 Vercel (${{ matrix.site.name }})
    needs: quality-checks
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/master'

    strategy:
      matrix:
        site:
          - name: "Site 1 (主站)"
            vercel_project_id: "VERCEL_PROJECT_ID_SITE1"
            site_identifier: "site1"
          - name: "Site 2 (品牌A)"
            vercel_project_id: "VERCEL_PROJECT_ID_SITE2"
            site_identifier: "site2"
          - name: "Site 3 (品牌B)"
            vercel_project_id: "VERCEL_PROJECT_ID_SITE3"
            site_identifier: "site3"

    steps:
      - name: Checkout 程式碼
        uses: actions/checkout@v4

      - name: 部署到 Vercel (Production)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets[matrix.site.vercel_project_id] }}
          vercel-args: '--prod'
          working-directory: ./

      - name: 部署成功通知
        if: success()
        run: |
          echo "✅ ${{ matrix.site.name }} 部署成功"
          echo "Site Identifier: ${{ matrix.site.site_identifier }}"

      - name: 部署失敗通知
        if: failure()
        run: |
          echo "❌ ${{ matrix.site.name }} 部署失敗"
          exit 1
```

---

### 4.3 修改 vercel.json

1. **開啟檔案**: `vercel.json`

2. **移除硬編碼的環境變數**:

```json
{
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["sin1"],
  "crons": [
    {
      "path": "/api/cron/backup",
      "schedule": "0 18 * * *"
    }
  ]
}
```

**移除的部分**:
```json
"env": {
  "NEXT_PUBLIC_SUPABASE_URL": "...",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY": "..."
}
```

---

### 4.4 建立 Migration 推送腳本

1. **建立目錄** (如果不存在):
   ```bash
   mkdir -p scripts
   ```

2. **建立檔案**: `scripts/deploy-migrations.sh`

3. **複製以下內容** (記得替換 Project ID):

```bash
#!/bin/bash
# scripts/deploy-migrations.sh
# 批次推送 Migration 到多個 Supabase 專案

set -e

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 站點配置（需替換為實際 Project ID）
declare -A SITES=(
  ["site1"]="qwovavytryvgchcowjof"          # 現有主站
  ["site2"]="[SITE2_PROJECT_ID]"            # 替換為 Site 2 Project ID
  ["site3"]="[SITE3_PROJECT_ID]"            # 替換為 Site 3 Project ID
)

# 使用說明
usage() {
  echo "用法: $0 [選項] <站點>"
  echo ""
  echo "選項:"
  echo "  all       推送到所有站點"
  echo "  site1     推送到 Site 1 (主站)"
  echo "  site2     推送到 Site 2"
  echo "  site3     推送到 Site 3"
  echo ""
  echo "範例:"
  echo "  $0 all           # 推送到所有站點"
  echo "  $0 site1 site2   # 推送到 Site 1 和 Site 2"
  exit 1
}

# 推送 Migration 到指定專案
push_migrations() {
  local site_name=$1
  local project_id=${SITES[$site_name]}

  if [ -z "$project_id" ]; then
    echo -e "${RED}❌ 無效的站點名稱: $site_name${NC}"
    return 1
  fi

  if [[ "$project_id" == *"["* ]]; then
    echo -e "${RED}❌ 請先替換 $site_name 的 Project ID${NC}"
    return 1
  fi

  echo -e "${YELLOW}📤 正在推送 Migration 到 $site_name ($project_id)...${NC}"

  # 推送 Migration
  if supabase db push --project-ref "$project_id"; then
    echo -e "${GREEN}✅ $site_name 推送成功${NC}"
  else
    echo -e "${RED}❌ $site_name 推送失敗${NC}"
    return 1
  fi

  echo ""
}

# 主程式
main() {
  if [ $# -eq 0 ]; then
    usage
  fi

  # 檢查 Supabase CLI
  if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ 未安裝 Supabase CLI${NC}"
    echo "安裝方式: npm install -g supabase"
    exit 1
  fi

  # 處理參數
  if [ "$1" == "all" ]; then
    for site in "${!SITES[@]}"; do
      push_migrations "$site"
    done
  else
    for site in "$@"; do
      push_migrations "$site"
    done
  fi

  echo -e "${GREEN}🎉 Migration 推送完成${NC}"
}

main "$@"
```

4. **編輯腳本，替換 Project ID**:
   - 將 `[SITE2_PROJECT_ID]` 替換為 Site 2 的實際 Project ID
   - 將 `[SITE3_PROJECT_ID]` 替換為 Site 3 的實際 Project ID

5. **設定執行權限**:
   ```bash
   # Windows Git Bash
   chmod +x scripts/deploy-migrations.sh
   ```

6. **測試腳本**:
   ```bash
   # 測試推送到 Site 2
   bash scripts/deploy-migrations.sh site2
   ```

---

### 4.5 修改備份檔案命名（加入站點識別）

1. **開啟檔案**: `lib/backup/db-backup.ts`

2. **找到 `performBackup` 函數**，修改檔案命名邏輯:

```typescript
// 在檔案開頭或 performBackup 函數內
const SITE_IDENTIFIER = process.env.SITE_IDENTIFIER || 'site1'

// 修改檔案命名處（約在第 XX 行）
const timestamp = format(new Date(), 'yyyyMMdd-HHmmss')
const filename = `${SITE_IDENTIFIER}-backup-${timestamp}.sql.gz`
```

**範例** (假設在第 120 行):

原本:
```typescript
const filename = `vsale-backup-${timestamp}.sql.gz`
```

修改後:
```typescript
const SITE_IDENTIFIER = process.env.SITE_IDENTIFIER || 'site1'
const filename = `${SITE_IDENTIFIER}-backup-${timestamp}.sql.gz`
```

---

### 4.6 更新 .env.local.example

1. **開啟檔案**: `.env.local.example`

2. **更新內容**:

```env
# ================================================
# Vsale-lite 環境變數範本
# ================================================
# 使用說明: 複製此檔案為 .env.local 並填入實際值

# ================================================
# Supabase 連線設定
# ================================================
# Project URL (從 Supabase Dashboard → Settings → API 複製)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co

# Anon Key (公開金鑰，前台可見)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# Service Role Key (管理員權限，後端專用，絕對機密！)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# ================================================
# 站點識別（用於多站點部署）
# ================================================
# 備份檔案命名會使用此識別（如 site1-backup-20260122.sql.gz）
SITE_IDENTIFIER=site1

# ================================================
# Cron Job 驗證
# ================================================
# 用於驗證定時備份請求，建議使用 32+ 字元隨機字串
# 產生方式: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
CRON_SECRET=your-cron-secret-here

# ================================================
# Google Cloud Storage 備份系統（可選）
# ================================================
# GCS 專案 ID
GCS_PROJECT_ID=vsale-backup

# GCS Bucket 名稱（可共用或獨立）
GCS_BUCKET_NAME=vsale-backups-site1

# GCS Service Account 金鑰（JSON 格式，單行）
GCS_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"vsale-backup",...}

# ================================================
# 資料庫直連設定（用於 pg_dump 備份）
# ================================================
# Connection Pooler 主機（從 Supabase → Settings → Database 複製）
DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com

# Connection Pooler 埠號
DB_PORT=6543

# 資料庫名稱（預設 postgres）
DB_NAME=postgres

# 資料庫使用者（格式: postgres.[project-id]）
DB_USER=postgres.your-project-id

# 資料庫密碼（建立 Supabase 專案時設定）
DB_PASSWORD=your-database-password

# ================================================
# 多站點架構說明
# ================================================
# 本專案支援多站點部署，每個站點使用獨立的 Supabase 專案
# 但共用相同的程式碼庫和資料庫結構（Migration）
#
# 部署方式:
# 1. 建立新的 Supabase 和 Vercel 專案
# 2. 在 Vercel 專案設定中配置上述環境變數
# 3. 推送 Migration: bash scripts/deploy-migrations.sh site2
# 4. 更新 GitHub Actions workflow 新增站點配置
#
# 詳見: docs/MULTI_SITE_DEPLOYMENT.md
```

---

## 階段 5: 測試與驗證

**預估時間**: 1 小時

### 5.1 本地測試

1. **確認所有修改已儲存**

2. **執行型別檢查**:
   ```bash
   pnpm type-check
   ```
   預期: ✅ 無錯誤

3. **執行 ESLint 檢查**:
   ```bash
   pnpm lint
   ```
   預期: ✅ 無錯誤

---

### 5.2 測試分支部署

1. **建立測試分支**:
   ```bash
   git checkout -b test/multi-site-deploy
   ```

2. **提交修改**:
   ```bash
   git add .
   git commit -m "feat: 新增多站點部署支援

- 修改 GitHub Actions workflow 支援 Matrix Strategy
- 移除 vercel.json 硬編碼環境變數
- 新增 Migration 批次推送腳本
- 更新備份檔案命名邏輯

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
   ```

3. **推送到 GitHub**:
   ```bash
   git push origin test/multi-site-deploy
   ```

4. **觀察 GitHub Actions**:
   - 前往: https://github.com/[你的用戶名]/vsale-lite/actions
   - 應該看到 "Multi-Site Vercel Deploy" 工作流程
   - **注意**: 因為是 PR，不會實際部署，僅執行品質檢查

5. **確認品質檢查通過**:
   - ✅ TypeScript 型別檢查
   - ✅ ESLint 檢查

---

### 5.3 驗證站點功能

**測試前準備**:
- 確保 Vercel 環境變數已全部設定
- 確保 Migration 已推送到所有 Supabase 專案

#### 測試 Site 1 (主站)

1. **訪問首頁**:
   - 網址: https://[site1-domain] 或 https://vsale-site1.vercel.app
   - 預期: 正常顯示首頁

2. **測試前台登入**:
   - 路徑: `/login`
   - 使用測試客戶帳號（手機號碼登入）
   - 預期: 成功登入並導向 `/store`

3. **測試後台登入**:
   - 路徑: `/admin/login`
   - 使用管理員帳號 (Email 登入)
   - 預期: 成功登入並導向 `/admin/dashboard`

4. **測試商品瀏覽**:
   - 路徑: `/store`
   - 預期: 顯示商品列表（如果有商品資料）

#### 測試 Site 2 和 Site 3

**重複以上步驟**，使用各站點的 URL 和帳號

**資料隔離驗證**:
- 在 Site 1 建立一筆測試訂單
- 登入 Site 2 後台，確認**看不到** Site 1 的訂單
- ✅ 確認資料完全隔離

---

### 5.4 測試 Cron Job 備份

**每個站點獨立測試**:

1. **登入後台** (Site 2):
   - 路徑: `/admin/settings/backup`

2. **手動觸發備份**:
   - 點擊「立即備份」按鈕
   - 預期: 顯示「備份成功」訊息

3. **檢查 GCS Bucket**:
   - 前往 Google Cloud Console → Storage
   - 檢查 bucket `vsale-backups-site2` 或 `vsale-backups-haraluya`
   - 預期: 有檔案 `site2-backup-20260122-XXXXXX.sql.gz`

4. **重複測試 Site 1 和 Site 3**

---

### 5.5 測試 Migration 推送

1. **建立測試 Migration**:
   ```bash
   supabase migration new test_multisite_deployment
   ```

2. **編輯 Migration 檔案**:
   ```bash
   # 開啟 supabase/migrations/[timestamp]_test_multisite_deployment.sql
   # 加入測試內容:
   ```

   ```sql
   -- 測試用 Migration（可後續回滾）
   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS test_multisite TEXT;

   COMMENT ON COLUMN profiles.test_multisite IS '多站點部署測試欄位';
   ```

3. **推送到所有站點**:
   ```bash
   bash scripts/deploy-migrations.sh all
   ```

   預期輸出:
   ```
   📤 正在推送 Migration 到 site1 (qwovavytryvgchcowjof)...
   ✅ site1 推送成功

   📤 正在推送 Migration 到 site2 ([SITE2_ID])...
   ✅ site2 推送成功

   📤 正在推送 Migration 到 site3 ([SITE3_ID])...
   ✅ site3 推送成功

   🎉 Migration 推送完成
   ```

4. **驗證三個站點資料庫一致**:
   ```bash
   # 檢查 Migration 狀態
   supabase migration list --project-ref qwovavytryvgchcowjof
   supabase migration list --project-ref [SITE2_ID]
   supabase migration list --project-ref [SITE3_ID]
   ```

   預期: 三個站點都顯示相同的 Migration 列表

5. **回滾測試 Migration**（可選）:
   ```bash
   # 建立回滾 Migration
   supabase migration new rollback_test_multisite

   # 編輯檔案，加入:
   ALTER TABLE profiles DROP COLUMN IF EXISTS test_multisite;

   # 推送回滾
   bash scripts/deploy-migrations.sh all
   ```

---

## 階段 6: 正式部署

**預估時間**: 15 分鐘

### 6.1 合併到 Master

1. **確認測試分支所有測試通過**

2. **合併分支**:
   ```bash
   git checkout master
   git merge test/multi-site-deploy
   ```

3. **最終檢查**:
   ```bash
   # 確認沒有衝突
   git status

   # 確認 commit 歷史
   git log --oneline -5
   ```

---

### 6.2 推送到 Master（觸發自動部署）

```bash
git push origin master
```

---

### 6.3 監控部署狀態

1. **前往 GitHub Actions**:
   - 網址: https://github.com/[你的用戶名]/vsale-lite/actions
   - 點擊最新的 "Multi-Site Vercel Deploy" workflow

2. **觀察執行狀態**:
   ```
   ✅ quality-checks (程式碼品質檢查)
      ├─ Checkout 程式碼
      ├─ 設定 Node.js
      ├─ 設定 pnpm
      ├─ 安裝依賴
      ├─ TypeScript 型別檢查
      └─ ESLint 檢查

   ⏳ deploy (部署到 Vercel)
      ├─ Site 1 (主站) - Running...
      ├─ Site 2 (品牌A) - Running...
      └─ Site 3 (品牌B) - Running...
   ```

3. **等待完成**（通常 3-5 分鐘）:
   ```
   ✅ deploy
      ├─ ✅ Site 1 (主站) - 部署成功
      ├─ ✅ Site 2 (品牌A) - 部署成功
      └─ ✅ Site 3 (品牌B) - 部署成功
   ```

---

### 6.4 驗證部署結果

**冒煙測試清單**:

#### Site 1
- [ ] 訪問首頁: https://[site1-domain]
- [ ] 前台登入測試 (/login)
- [ ] 後台登入測試 (/admin/login)
- [ ] 瀏覽商品 (/store)
- [ ] 新增測試訂單
- [ ] 查看訂單列表

#### Site 2
- [ ] 訪問首頁: https://[site2-domain]
- [ ] 前台登入測試
- [ ] 後台登入測試
- [ ] 瀏覽商品
- [ ] 新增測試訂單
- [ ] **確認看不到 Site 1 的訂單**

#### Site 3
- [ ] 訪問首頁: https://[site3-domain]
- [ ] 前台登入測試
- [ ] 後台登入測試
- [ ] 瀏覽商品
- [ ] 新增測試訂單
- [ ] **確認看不到 Site 1 和 Site 2 的訂單**

---

### 6.5 檢查 Vercel 部署日誌

1. **前往 Vercel Dashboard**:
   - Site 1: https://vercel.com/[你的組織]/vsale-site1
   - Site 2: https://vercel.com/[你的組織]/vsale-site2
   - Site 3: https://vercel.com/[你的組織]/vsale-site3

2. **檢查 Deployments**:
   - 確認最新部署狀態為 "Ready"
   - 檢查 Build Logs（無錯誤）
   - 檢查 Function Logs（無異常）

---

## 新增更多站點

**預估時間**: 每站點約 30 分鐘

### 簡化流程

1. **建立基礎設施**（10 分鐘）:
   - 建立新的 Supabase 專案 (Site 4)
   - 建立新的 Vercel 專案 (vsale-site4)
   - 綁定域名（可選）

2. **配置環境變數**（10 分鐘）:
   - GitHub Secrets: 新增 `VERCEL_PROJECT_ID_SITE4`
   - Vercel 環境變數: 完整配置 13 個變數

3. **更新部署配置**（5 分鐘）:
   - 編輯 `.github/workflows/vercel-deploy.yml`
   - 在 `matrix.site` 陣列新增一項:
     ```yaml
     - name: "Site 4 (品牌C)"
       vercel_project_id: "VERCEL_PROJECT_ID_SITE4"
       site_identifier: "site4"
     ```

4. **推送 Migration**（3 分鐘）:
   - 編輯 `scripts/deploy-migrations.sh`，新增:
     ```bash
     ["site4"]="[SITE4_PROJECT_ID]"
     ```
   - 執行: `bash scripts/deploy-migrations.sh site4`

5. **測試與驗證**（5 分鐘）:
   - 推送 commit 觸發部署
   - 驗證 Site 4 功能正常

---

## 故障排除

### 問題 1: GitHub Actions 部署失敗

**症狀**: Deploy job 顯示紅色 ❌

**可能原因**:
- GitHub Secrets 設定錯誤
- Vercel Project ID 不正確
- Vercel Token 過期

**解決方式**:
1. 檢查 GitHub Actions 日誌:
   ```
   Error: Project not found
   ```
   → 檢查 `VERCEL_PROJECT_ID_SITE2` 是否正確

2. 重新產生 Vercel Token:
   - Vercel Dashboard → Settings → Tokens
   - Create Token → 更新 GitHub Secret `VERCEL_TOKEN`

---

### 問題 2: Supabase 連線失敗

**症狀**: 網站顯示「Failed to connect to Supabase」

**可能原因**:
- Vercel 環境變數設定錯誤
- Supabase Anon Key 不正確

**解決方式**:
1. 檢查 Vercel 環境變數:
   - `NEXT_PUBLIC_SUPABASE_URL` 格式正確
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` 完整複製

2. 測試 Supabase 連線:
   ```bash
   curl https://[project-id].supabase.co/rest/v1/
   ```

---

### 問題 3: Migration 推送失敗

**症狀**: `supabase db push` 報錯

**可能原因**:
- Supabase CLI 未登入
- Project ID 不正確
- 網路連線問題

**解決方式**:
1. 登入 Supabase CLI:
   ```bash
   supabase login
   ```

2. 確認 Project ID:
   ```bash
   supabase projects list
   ```

3. 手動推送:
   ```bash
   supabase db push --project-ref [PROJECT_ID] --debug
   ```

---

### 問題 4: 備份功能無法使用

**症狀**: 點擊「立即備份」無反應或報錯

**可能原因**:
- GCS Service Account Key 設定錯誤
- DB 連線資訊不正確

**解決方式**:
1. 檢查 Vercel Function Logs:
   - Vercel Dashboard → Deployments → Functions
   - 查看 `/api/cron/backup` 的錯誤訊息

2. 驗證 GCS 金鑰:
   ```bash
   # 測試 GCS 連線
   node -e "
   const {Storage} = require('@google-cloud/storage');
   const storage = new Storage({
     projectId: 'vsale-backup',
     credentials: JSON.parse(process.env.GCS_SERVICE_ACCOUNT_KEY)
   });
   storage.bucket('vsale-backups-site2').exists().then(console.log);
   "
   ```

---

### 問題 5: 資料沒有隔離

**症狀**: Site 2 可以看到 Site 1 的資料

**可能原因**:
- Vercel 環境變數設定錯誤（使用了相同的 Supabase URL）
- RLS 策略失效

**解決方式**:
1. 確認 Vercel 環境變數:
   ```
   Site 1: NEXT_PUBLIC_SUPABASE_URL = https://qwovavytryvgchcowjof.supabase.co
   Site 2: NEXT_PUBLIC_SUPABASE_URL = https://[SITE2_ID].supabase.co
   ```
   → **絕對不可相同**

2. 驗證連線:
   - 開啟瀏覽器開發者工具 (F12)
   - Network 頁籤
   - 檢查 API 請求的 URL（應該不同）

---

## 維護指南

### 日常維護

#### 更新程式碼
```bash
# 修改程式碼
# ...

# Commit
git add .
git commit -m "feat: 新增功能 XXX"

# 推送（自動部署到三個站點）
git push origin master
```

#### 更新資料庫結構
```bash
# 建立 Migration
supabase migration new add_new_feature

# 編輯 Migration 檔案
# supabase/migrations/[timestamp]_add_new_feature.sql

# 推送到所有站點
bash scripts/deploy-migrations.sh all
```

#### 監控備份狀態
- 定期檢查 GCS bucket 的備份檔案
- 確認每日自動備份正常執行
- 建議每月測試一次備份還原

---

### 定期檢查清單

#### 每週檢查
- [ ] 檢查 Vercel Deployment 狀態（無失敗部署）
- [ ] 檢查 Function Logs（無異常錯誤）
- [ ] 檢查 GCS 備份（有新備份檔案）

#### 每月檢查
- [ ] 檢查 Supabase 資料庫健康狀態
- [ ] 審查 Migration 版本一致性
- [ ] 測試備份還原流程
- [ ] 審查 API 使用量（Supabase 和 Vercel）

#### 每季檢查
- [ ] 輪換 CRON_SECRET
- [ ] 輪換 Supabase Service Role Key
- [ ] 審查 GCS 存取日誌
- [ ] 清理過期備份檔案（保留最近 90 天）

---

### 備份與災難恢復

#### 手動備份
```bash
# 使用 Supabase CLI
supabase db dump --project-ref [PROJECT_ID] -f backup-$(date +%Y%m%d).sql

# 或使用 pg_dump（需要資料庫連線資訊）
pg_dump -h [DB_HOST] -p [DB_PORT] -U [DB_USER] -d [DB_NAME] > backup.sql
```

#### 還原備份
```bash
# 從 SQL 檔案還原
psql -h [DB_HOST] -p [DB_PORT] -U [DB_USER] -d [DB_NAME] < backup.sql

# 從 GCS 下載並還原
gsutil cp gs://vsale-backups-site2/site2-backup-20260122.sql.gz .
gunzip site2-backup-20260122.sql.gz
psql ... < site2-backup-20260122.sql
```

---

## 附錄

### A. 環境變數完整清單

| 變數名稱 | 必填 | 說明 | 範例值 |
|---------|------|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase 專案 URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase Anon Key | `eyJhbGci...` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase Service Role Key | `eyJhbGci...` |
| `CRON_SECRET` | ✅ | Cron Job 驗證金鑰 | `l0lliBYg...` |
| `SITE_IDENTIFIER` | ✅ | 站點識別碼 | `site1`, `site2`, `site3` |
| `GCS_PROJECT_ID` | 可選 | GCS 專案 ID | `vsale-backup` |
| `GCS_BUCKET_NAME` | 可選 | GCS Bucket 名稱 | `vsale-backups-site1` |
| `GCS_SERVICE_ACCOUNT_KEY` | 可選 | GCS 服務帳號金鑰 | `{"type":"service_account",...}` |
| `DB_HOST` | 可選 | 資料庫主機 | `aws-0-ap-southeast-1.pooler...` |
| `DB_PORT` | 可選 | 資料庫埠號 | `6543` |
| `DB_NAME` | 可選 | 資料庫名稱 | `postgres` |
| `DB_USER` | 可選 | 資料庫使用者 | `postgres.xxx` |
| `DB_PASSWORD` | 可選 | 資料庫密碼 | `[密碼]` |

---

### B. Supabase Project ID 快速查詢

```bash
# 列出所有專案
supabase projects list

# 輸出範例:
# ┌──────────────────────┬────────────┬───────────────────────┐
# │        NAME          │ PROJECT ID │        REGION         │
# ├──────────────────────┼────────────┼───────────────────────┤
# │ vsale-site1          │ qwovav...  │ ap-southeast-1        │
# │ vsale-site2          │ abcdef...  │ ap-southeast-1        │
# │ vsale-site3          │ ghijkl...  │ ap-southeast-1        │
# └──────────────────────┴────────────┴───────────────────────┘
```

---

### C. Vercel CLI 常用指令

```bash
# 安裝 Vercel CLI
npm install -g vercel

# 登入
vercel login

# 列出專案
vercel list

# 查看環境變數
vercel env ls --project vsale-site2

# 新增環境變數
vercel env add NEXT_PUBLIC_SUPABASE_URL production --project vsale-site2

# 手動部署
vercel --prod --project vsale-site2
```

---

### D. 常見問題 FAQ

**Q1: 可以只部署其中一個站點嗎？**

A: 目前設計是同時部署所有站點。如需單獨部署，可在 Vercel Dashboard 手動觸發部署。

**Q2: 如何暫停某個站點？**

A: 在 Vercel 專案設定中暫停專案，或將該站點從 GitHub Actions matrix 中移除。

**Q3: 可以使用不同的 Vercel 區域嗎？**

A: 可以，但需要為每個專案單獨設定 `vercel.json`（建議改為在 Vercel Dashboard 設定）。

**Q4: 備份檔案如何自動清理？**

A: 可設定 GCS Lifecycle Policy 自動刪除超過 90 天的檔案。

**Q5: 如何監控三個站點的運行狀態？**

A: 可使用 Vercel 的 Monitoring 功能，或整合第三方監控服務（如 UptimeRobot）。

---

## 結語

恭喜你完成多站點部署架構的設置！🎉

**你現在擁有**:
- ✅ 三個獨立運營的站點
- ✅ 完全隔離的資料庫
- ✅ 統一的程式碼管理
- ✅ 自動化的部署流程
- ✅ 完善的備份系統

**後續建議**:
1. 定期執行維護檢查清單
2. 監控 API 使用量（避免超出免費額度）
3. 文檔化每個站點的特定配置（如域名、管理員帳號）
4. 考慮建立監控警報（Vercel Integration）

**需要幫助？**
- 參考專案的 CLAUDE.md 和 README.md
- 查看 Supabase 和 Vercel 官方文件
- GitHub Issues: https://github.com/[你的用戶名]/vsale-lite/issues

---

**版本**: 1.0.0
**最後更新**: 2026-01-22
**作者**: Claude Sonnet 4.5 (Anthropic)
