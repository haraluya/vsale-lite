# Vsale-lite 多站點部署架構實作計畫

## 專案概述

將現有的 Vsale-lite B2B 訂貨系統從單站點架構擴展為多站點架構，支援三個獨立客戶/品牌站點共用相同程式碼但資料庫完全隔離。

### 使用需求
- **使用情境**: 三個獨立客戶/品牌站（完全獨立的業務資料）
- **域名需求**: 三個獨立域名（site1.com、site2.com、site3.com）
- **部署策略**: 同時自動部署（push master → 三站同步更新）
- **資料庫結構**: 完全相同（使用同一套 Migration）

---

## 架構設計

### 多站點架構圖

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

### 核心設計原則
1. **一份程式碼，多個獨立站點**: GitHub Actions Matrix Strategy
2. **完全數據隔離**: 每站點獨立 Supabase 專案
3. **相同資料庫結構**: 統一 Migration 檔案
4. **環境變數驅動**: 透過環境變數區分站點配置
5. **安全性優先**: 敏感資訊儲存於 GitHub Secrets

---

## 實作步驟

### 階段 1: 基礎設施準備（30 分鐘）

#### 1.1 建立 Supabase 專案
1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 建立兩個新專案（Site 2、Site 3）
   - 區域選擇: `Southeast Asia (Singapore)`
   - 記錄以下資訊:
     - Project ID
     - Project URL
     - Anon Key
     - Service Role Key
     - Database Password

#### 1.2 建立 Vercel 專案
1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 從同一個 GitHub repo 建立 2 個新專案
   - 專案名稱: `vsale-site2`, `vsale-site3`
   - Framework Preset: Next.js
   - Build Command: `pnpm build`
   - 記錄 Project ID

#### 1.3 域名綁定（可選）
- 在 Vercel 專案設定中綁定自訂域名
- 等待 DNS 生效

---

### 階段 2: 環境變數配置（45 分鐘）

#### 2.1 GitHub Secrets 設定

前往 GitHub Repo → Settings → Secrets and variables → Actions

新增以下 Secrets:

| Secret Name | 說明 | 取得方式 |
|-------------|------|---------|
| `VERCEL_PROJECT_ID_SITE2` | Site 2 Vercel 專案 ID | Vercel 專案設定 |
| `VERCEL_PROJECT_ID_SITE3` | Site 3 Vercel 專案 ID | Vercel 專案設定 |

保留現有 Secrets:
- `VERCEL_TOKEN` (共用)
- `VERCEL_ORG_ID` (共用)
- `VERCEL_PROJECT_ID_SITE1` (現有主站)

#### 2.2 Vercel 環境變數設定

**Site 2 (vsale-site2)**

前往 Vercel 專案 → Settings → Environment Variables

| 變數名稱 | 值 | 環境 |
|---------|---|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[SITE2_PROJECT_ID].supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | [Site 2 Anon Key] | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | [Site 2 Service Role Key] | Production |
| `CRON_SECRET` | [隨機生成 32+ 字元] | Production |
| `GCS_PROJECT_ID` | `vsale-backup` | Production |
| `GCS_BUCKET_NAME` | `vsale-backups-site2` | Production |
| `GCS_SERVICE_ACCOUNT_KEY` | [GCS JSON 金鑰] | Production |
| `DB_HOST` | `aws-0-ap-southeast-1.pooler.supabase.com` | Production |
| `DB_PORT` | `6543` | Production |
| `DB_NAME` | `postgres` | Production |
| `DB_USER` | `postgres.[SITE2_PROJECT_ID]` | Production |
| `DB_PASSWORD` | [Site 2 DB Password] | Production |
| `SITE_IDENTIFIER` | `site2` | Production |

**Site 3 (vsale-site3)**

重複上述步驟，替換為 Site 3 的對應值。

**Site 1 (現有主站 - 需新增)**

新增環境變數:
- `SITE_IDENTIFIER` = `site1`

---

### 階段 3: Migration 初始化（30 分鐘）

#### 3.1 推送 Baseline Migration

**手動推送（首次建議）**:

```bash
# Site 2
supabase db push --project-ref [SITE2_PROJECT_ID]

# Site 3
supabase db push --project-ref [SITE3_PROJECT_ID]
```

**驗證 Migration 狀態**:

```bash
# 查看 Migration 列表
supabase migration list --project-ref [SITE2_PROJECT_ID]
supabase migration list --project-ref [SITE3_PROJECT_ID]
```

#### 3.2 建立管理員帳號

在每個 Supabase 專案的 SQL Editor 執行:

```sql
-- 建立管理員帳號（需替換 email 和 password）
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
  crypt('your-password-here', gen_salt('bf')),  -- 替換為實際密碼
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
```

---

### 階段 4: 程式碼修改（30 分鐘）

#### 4.1 修改 `.github/workflows/vercel-deploy.yml`

**備份現有檔案**:
```bash
cp .github/workflows/vercel-deploy.yml .github/workflows/vercel-deploy.yml.backup
```

**套用新配置**（參考下方完整內容）

#### 4.2 修改 `vercel.json`

**移除硬編碼環境變數**:

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

#### 4.3 建立 Migration 推送腳本

建立 `scripts/deploy-migrations.sh`（參考下方完整內容）

```bash
chmod +x scripts/deploy-migrations.sh
```

#### 4.4 更新備份檔案命名

修改 `lib/backup/db-backup.ts` 加入站點識別:

```typescript
// 從環境變數讀取站點識別
const SITE_IDENTIFIER = process.env.SITE_IDENTIFIER || 'site1'

// 修改檔案命名
const timestamp = format(new Date(), 'yyyyMMdd-HHmmss')
const filename = `${SITE_IDENTIFIER}-backup-${timestamp}.sql.gz`
```

#### 4.5 更新 `.env.local.example`

```env
# Supabase 環境變數
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 站點識別（用於備份檔案命名）
SITE_IDENTIFIER=site1

# Cron Job 驗證
CRON_SECRET=your-cron-secret

# Google Cloud Storage 備份系統
GCS_PROJECT_ID=vsale-backup
GCS_BUCKET_NAME=vsale-backups-site1
GCS_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# 資料庫直連（用於 pg_dump 備份）
DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.your-project-id
DB_PASSWORD=your-db-password
```

---

### 階段 5: 測試與驗證（1 小時）

#### 5.1 測試分支部署

```bash
# 建立測試分支
git checkout -b test/multi-site-deploy

# 推送測試變更
echo "# Multi-site test" >> README.md
git add .
git commit -m "test: 測試多站點部署"
git push origin test/multi-site-deploy
```

觀察 GitHub Actions 執行狀態

#### 5.2 驗證站點功能

**每個站點測試清單**:
- [ ] 訪問首頁 (/)
- [ ] 前台登入 (/login) - 使用測試客戶帳號
- [ ] 後台登入 (/admin/login) - 使用管理員帳號
- [ ] 瀏覽商品 (/store)
- [ ] 測試購物車功能
- [ ] 確認資料隔離（Site 1 的資料在 Site 2 看不到）

#### 5.3 測試 Cron Job

1. 登入後台 → 系統設定 → 資料庫備份
2. 點擊「立即備份」
3. 檢查 GCS bucket 是否有對應的備份檔案
4. 檔案命名格式: `site1-backup-20260122-180000.sql.gz`

#### 5.4 測試 Migration 推送

```bash
# 建立測試 Migration
supabase migration new test_multisite_deployment

# 編輯 Migration 檔案（新增測試欄位）
echo "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS test_field TEXT;" > supabase/migrations/[timestamp]_test_multisite_deployment.sql

# 推送到所有站點
bash scripts/deploy-migrations.sh all

# 驗證所有站點資料庫一致
supabase migration list --project-ref [SITE1_PROJECT_ID]
supabase migration list --project-ref [SITE2_PROJECT_ID]
supabase migration list --project-ref [SITE3_PROJECT_ID]
```

---

### 階段 6: 正式部署（15 分鐘）

#### 6.1 合併到 Master

```bash
# 合併測試分支
git checkout master
git merge test/multi-site-deploy

# 推送到 master
git push origin master
```

#### 6.2 監控部署

1. 前往 [GitHub Actions](https://github.com/haraluya/vsale-lite/actions)
2. 觀察 "Multi-Site Vercel Deploy" 工作流程
3. 確認三個站點都顯示綠色勾勾

#### 6.3 最終驗證

**冒煙測試清單**:
- [ ] Site 1: 登入 + 瀏覽商品 + 下單
- [ ] Site 2: 登入 + 瀏覽商品 + 下單
- [ ] Site 3: 登入 + 瀏覽商品 + 下單
- [ ] 確認三站點資料完全隔離

---

## 關鍵檔案修改內容

### 1. `.github/workflows/vercel-deploy.yml`

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

### 2. `scripts/deploy-migrations.sh`

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
  ["site1"]="qwovavytryvgchcowjof"
  ["site2"]="[SITE2_PROJECT_ID]"  # 替換為 Site 2 Project ID
  ["site3"]="[SITE3_PROJECT_ID]"  # 替換為 Site 3 Project ID
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

### 3. `lib/backup/db-backup.ts` (部分修改)

在檔案命名處加入站點識別:

```typescript
// 在 performBackup 函數中
const SITE_IDENTIFIER = process.env.SITE_IDENTIFIER || 'site1'
const timestamp = format(new Date(), 'yyyyMMdd-HHmmss')
const filename = `${SITE_IDENTIFIER}-backup-${timestamp}.sql.gz`
```

---

## 新增第四、第五個站點流程

### 簡化步驟（每站點約 30 分鐘）

1. **建立基礎設施**（10 分鐘）
   - 建立新的 Supabase 專案
   - 建立新的 Vercel 專案
   - 綁定域名（可選）

2. **配置環境變數**（10 分鐘）
   - GitHub Secrets: 新增 `VERCEL_PROJECT_ID_SITE4`
   - Vercel 環境變數: 完整配置（參考階段 2.2）

3. **更新部署配置**（5 分鐘）
   - 編輯 `.github/workflows/vercel-deploy.yml`
   - 在 `matrix.site` 新增一項配置

4. **推送 Migration**（3 分鐘）
   - 更新 `scripts/deploy-migrations.sh` 的 `SITES` 陣列
   - 執行 `bash scripts/deploy-migrations.sh site4`

5. **測試驗證**（5 分鐘）

---

## 潛在挑戰與解決方案

### 挑戰 1: Migration 版本不同步

**解決方案**:
- 使用腳本批次推送確保順序一致
- 建立狀態檢查腳本定期驗證
- 在 Migration 前手動備份每個資料庫

### 挑戰 2: 環境變數管理複雜

**解決方案**:
- 建立環境變數檢查清單（Excel 或 Notion）
- 使用 Vercel CLI 批次設定
- 文檔化每個變數的取得方式

### 挑戰 3: Cron Job 衝突

**解決方案**:
- 在 Vercel Dashboard 手動設定不同的 Cron 時間
  - Site 1: 每日 18:00 UTC
  - Site 2: 每日 18:30 UTC
  - Site 3: 每日 19:00 UTC
- 或使用獨立 GCS bucket

### 挑戰 4: 部署失敗處理

**解決方案**:
- GitHub Actions Matrix 獨立顯示每站狀態
- 失敗站點不影響其他站點
- 可在 Vercel Dashboard 手動重新部署

---

## 驗證清單

### 部署前檢查

- [ ] 所有 GitHub Secrets 已設定
- [ ] 所有 Vercel 環境變數已設定
- [ ] Migration 已推送到所有 Supabase 專案
- [ ] 管理員帳號已建立
- [ ] `vercel.json` 已移除硬編碼環境變數
- [ ] GitHub Actions workflow 已更新
- [ ] Migration 推送腳本已建立並測試

### 部署後驗證

- [ ] GitHub Actions 三個 deploy job 都顯示成功
- [ ] 每個站點可正常訪問
- [ ] 前台登入功能正常
- [ ] 後台登入功能正常
- [ ] 資料完全隔離（跨站點測試）
- [ ] Cron Job 備份功能正常
- [ ] GCS bucket 有正確命名的備份檔案

---

## 預估時間

| 階段 | 預估時間 |
|------|---------|
| 階段 1: 基礎設施準備 | 30 分鐘 |
| 階段 2: 環境變數配置 | 45 分鐘 |
| 階段 3: Migration 初始化 | 30 分鐘 |
| 階段 4: 程式碼修改 | 30 分鐘 |
| 階段 5: 測試與驗證 | 1 小時 |
| 階段 6: 正式部署 | 15 分鐘 |
| **總計** | **約 3.5 小時** |

---

## 關鍵檔案清單

### 需要修改的檔案
1. `.github/workflows/vercel-deploy.yml` - 改為 Matrix Strategy
2. `vercel.json` - 移除硬編碼環境變數
3. `lib/backup/db-backup.ts` - 加入站點識別
4. `.env.local.example` - 更新說明

### 需要新增的檔案
1. `scripts/deploy-migrations.sh` - Migration 批次推送腳本
2. `docs/MULTI_SITE_DEPLOYMENT.md` - 多站點部署完整指南

### 不需修改的檔案
- `lib/supabase/*.ts` - 環境變數機制已足夠靈活
- `middleware.ts` - 無需修改
- `next.config.ts` - 無需修改
- 所有 Migration 檔案 - 保持不變

---

## 安全性注意事項

1. **環境變數安全**
   - 所有敏感資訊儲存於 GitHub Secrets 和 Vercel
   - 絕對禁止在 `vercel.json` 硬編碼
   - 定期輪換 Service Role Key

2. **CRON_SECRET 管理**
   - 每個站點使用獨立的隨機字串（32+ 字元）
   - 定期輪換（建議每季）

3. **GCS Service Account Key**
   - 使用最小權限原則
   - 定期審查存取日誌

4. **資料隔離驗證**
   - 定期測試跨站點存取（應失敗）
   - 確認 RLS 策略一致

---

## 後續維護

### 新增站點
- 遵循「新增第四、第五個站點流程」
- 預估每站點 30 分鐘

### Migration 更新
```bash
# 建立 Migration
supabase migration new feature_name

# 推送到所有站點
bash scripts/deploy-migrations.sh all
```

### 監控與維護
- 定期檢查 Vercel Function Logs
- 監控 GCS 備份狀態
- 審查 Supabase Dashboard 的資料庫健康狀態

---

## 總結

此多站點部署方案具有以下優勢:

✅ **最小化程式碼變更**: 主要透過配置實現
✅ **完全數據隔離**: 獨立 Supabase 專案
✅ **同時自動部署**: 一次 push 同步更新
✅ **易於擴展**: 輕鬆新增更多站點
✅ **安全性優先**: Secrets 管理敏感資訊
✅ **維護性高**: 清晰文檔與腳本工具

**風險評估**: 低風險（配置變更為主，不涉及核心程式碼）
