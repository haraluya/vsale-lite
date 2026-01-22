# Migration 推送指南（多客戶管理）

**用途**: 當主專案有資料庫結構變更時，批次推送 Migration 到所有客戶的 Supabase 專案

**適用情境**:
- 新增資料表
- 修改欄位結構
- 更新 RLS 策略
- 新增索引

---

## 核心概念

### Migration 工作流程

```
主專案開發
    ↓
建立 Migration 檔案
    ↓
在主專案測試
    ↓
推送到所有客戶 Supabase
    ↓
驗證所有客戶資料庫一致
```

---

## 方法 1: 手動推送（適合少量客戶）

### 步驟 1: 在主專案建立 Migration

```bash
# 切換到主專案目錄
cd d:\APP\vsale

# 建立新 Migration
supabase migration new add_new_feature

# 編輯 Migration 檔案
# 檔案位置: supabase/migrations/[timestamp]_add_new_feature.sql
```

**Migration 範例**:
```sql
-- supabase/migrations/20260122100000_add_product_tags.sql

-- 新增商品標籤表
CREATE TABLE IF NOT EXISTS product_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 建立索引
CREATE INDEX idx_product_tags_product_id ON product_tags(product_id);
CREATE INDEX idx_product_tags_tag_name ON product_tags(tag_name);

-- RLS 策略
ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "所有已認證用戶可讀取標籤"
  ON product_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "管理員可管理標籤"
  ON product_tags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

### 步驟 2: 在主專案測試（如有測試環境）

```bash
# 推送到主專案的 Supabase
supabase db push --project-ref YOUR_MAIN_PROJECT_ID

# 驗證 Migration
supabase migration list --project-ref YOUR_MAIN_PROJECT_ID
```

### 步驟 3: 建立客戶列表

**建立檔案**: `clients-list.txt`

```
# 客戶列表（格式：客戶名稱=Supabase Project ID）
client-abc=abcdefgh12345678
client-xyz=xyzabcde87654321
client-test=testtest99999999
```

### 步驟 4: 逐一推送到客戶

```bash
# 客戶 A
supabase db push --project-ref abcdefgh12345678

# 客戶 B
supabase db push --project-ref xyzabcde87654321

# 客戶 C
supabase db push --project-ref testtest99999999
```

### 步驟 5: 驗證所有客戶

```bash
# 檢查客戶 A
supabase migration list --project-ref abcdefgh12345678

# 檢查客戶 B
supabase migration list --project-ref xyzabcde87654321

# 檢查客戶 C
supabase migration list --project-ref testtest99999999
```

所有客戶都應該顯示新的 Migration 為 ✅ Applied

---

## 方法 2: 批次推送腳本（適合多個客戶）

### 步驟 1: 建立批次推送腳本

**建立檔案**: `scripts/push-migrations-to-all-clients.ps1`

```powershell
# scripts/push-migrations-to-all-clients.ps1
# 批次推送 Migration 到所有客戶的 Supabase 專案

# 客戶列表（替換為實際的 Project ID）
$clients = @{
    "client-abc" = "abcdefgh12345678"
    "client-xyz" = "xyzabcde87654321"
    "client-test" = "testtest99999999"
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  批次推送 Migration 到所有客戶" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 檢查 Supabase CLI
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 錯誤：未安裝 Supabase CLI" -ForegroundColor Red
    Write-Host "安裝方式：npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# 確認操作
Write-Host "即將推送 Migration 到以下客戶：" -ForegroundColor Yellow
foreach ($client in $clients.Keys) {
    Write-Host "  - $client ($($clients[$client]))" -ForegroundColor White
}
Write-Host ""

$confirm = Read-Host "確認推送？(y/n)"
if ($confirm -ne "y") {
    Write-Host "已取消" -ForegroundColor Yellow
    exit 0
}

Write-Host ""

# 推送 Migration
$success = 0
$failed = 0
$failedClients = @()

foreach ($clientName in $clients.Keys) {
    $projectId = $clients[$clientName]

    Write-Host "📤 推送到 $clientName ($projectId)..." -ForegroundColor Cyan

    try {
        $result = supabase db push --project-ref $projectId 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $clientName 推送成功" -ForegroundColor Green
            $success++
        } else {
            Write-Host "❌ $clientName 推送失敗" -ForegroundColor Red
            Write-Host "   錯誤訊息：$result" -ForegroundColor Red
            $failed++
            $failedClients += $clientName
        }
    } catch {
        Write-Host "❌ $clientName 推送發生例外：$_" -ForegroundColor Red
        $failed++
        $failedClients += $clientName
    }

    Write-Host ""
}

# 總結
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  推送結果總結" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ 成功：$success 個客戶" -ForegroundColor Green
Write-Host "❌ 失敗：$failed 個客戶" -ForegroundColor Red

if ($failed -gt 0) {
    Write-Host ""
    Write-Host "失敗的客戶：" -ForegroundColor Red
    foreach ($client in $failedClients) {
        Write-Host "  - $client" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "建議：執行驗證腳本確認所有客戶資料庫一致" -ForegroundColor Yellow
Write-Host "指令：powershell scripts/verify-migrations.ps1" -ForegroundColor Cyan
```

### 步驟 2: 執行批次推送

```powershell
# 在 PowerShell 執行
cd d:\APP\vsale
powershell -ExecutionPolicy Bypass -File scripts/push-migrations-to-all-clients.ps1
```

### 步驟 3: 建立驗證腳本

**建立檔案**: `scripts/verify-migrations.ps1`

```powershell
# scripts/verify-migrations.ps1
# 驗證所有客戶的 Migration 狀態是否一致

# 客戶列表（需與推送腳本一致）
$clients = @{
    "client-abc" = "abcdefgh12345678"
    "client-xyz" = "xyzabcde87654321"
    "client-test" = "testtest99999999"
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  驗證所有客戶 Migration 狀態" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allMigrations = @{}

foreach ($clientName in $clients.Keys) {
    $projectId = $clients[$clientName]

    Write-Host "🔍 檢查 $clientName ($projectId)..." -ForegroundColor Cyan

    try {
        $result = supabase migration list --project-ref $projectId 2>&1

        # 解析 Migration 列表（簡化版本）
        Write-Host $result -ForegroundColor Gray

        $allMigrations[$clientName] = $result

    } catch {
        Write-Host "❌ $clientName 檢查失敗：$_" -ForegroundColor Red
    }

    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  驗證完成" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "請手動比對上述結果，確認所有客戶的 Migration 列表一致" -ForegroundColor Yellow
```

### 步驟 4: 驗證所有客戶

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-migrations.ps1
```

---

## 方法 3: 使用客戶管理表格（Excel）

### 步驟 1: 建立客戶管理表格

**檔案**: `客戶管理表.xlsx`

| 客戶名稱 | Supabase Project ID | Vercel URL | 最後 Migration | 狀態 | 備註 |
|---------|---------------------|------------|---------------|------|------|
| 客戶A | abcdefgh12345678 | https://client-a.vercel.app | 20260122_add_tags | ✅ | - |
| 客戶B | xyzabcde87654321 | https://client-b.vercel.app | 20260122_add_tags | ✅ | - |
| 客戶C | testtest99999999 | https://client-c.vercel.app | 20260120_old_version | ⚠️ | 待更新 |

### 步驟 2: 手動推送並更新表格

每次推送後，更新「最後 Migration」和「狀態」欄位。

---

## Migration 最佳實務

### 1. 安全 Migration 原則

**✅ 推薦操作**:
- `CREATE TABLE IF NOT EXISTS` - 新增資料表（冪等性）
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` - 新增欄位
- `CREATE INDEX IF NOT EXISTS` - 新增索引
- `INSERT ... ON CONFLICT DO NOTHING` - 新增預設資料

**⚠️ 謹慎操作**:
- `ALTER TABLE ... DROP COLUMN` - 刪除欄位（不可逆）
- `DROP TABLE` - 刪除資料表（不可逆）
- `UPDATE` - 批次更新資料（需測試）

**❌ 禁止操作**:
- `DROP DATABASE` - 刪除資料庫（災難性）
- `TRUNCATE TABLE` - 清空資料表（不可逆）

### 2. Migration 檔案命名規範

**格式**: `YYYYMMDDHHMMSS_brief_description.sql`

**範例**:
- ✅ `20260122100000_add_product_tags.sql`
- ✅ `20260122110000_update_orders_add_tracking.sql`
- ❌ `new_migration.sql`（缺少時間戳記）
- ❌ `20260122_新增標籤.sql`（不使用中文）

### 3. 測試流程

**在推送到客戶前，必須先測試**：

1. **在主專案測試**（如有測試環境）
2. **在單一客戶測試**（選擇測試用客戶）
3. **確認無誤後才批次推送**

### 4. 回滾計畫

**如果 Migration 推送後發現問題**:

**方法 A: 建立反向 Migration**

```sql
-- 如果原 Migration 是新增欄位
ALTER TABLE products ADD COLUMN new_field TEXT;

-- 反向 Migration 是刪除欄位
ALTER TABLE products DROP COLUMN IF EXISTS new_field;
```

**方法 B: 從備份還原**（最後手段）

```bash
# 從 GCS 下載備份
gsutil cp gs://vsale-backups-client-abc/client-abc-backup-20260122-180000.sql.gz .

# 解壓縮
gunzip client-abc-backup-20260122-180000.sql.gz

# 還原（需使用 Supabase CLI 或 psql）
```

---

## 常見問題

### Q1: 推送失敗，顯示 "Permission denied"

**原因**: 未登入 Supabase CLI 或權限不足

**解決方式**:
```bash
# 登入 Supabase
supabase login

# 確認已登入
supabase projects list
```

### Q2: 推送失敗，顯示 "Migration already applied"

**原因**: 該 Migration 已經推送過

**解決方式**:
```bash
# 查看 Migration 狀態
supabase migration list --project-ref PROJECT_ID

# 如果確實需要重新執行，使用 repair
supabase migration repair --status reverted 20260122100000 --project-ref PROJECT_ID
supabase db push --project-ref PROJECT_ID
```

### Q3: 不同客戶的 Migration 版本不一致怎麼辦？

**原因**: 可能某些客戶跳過了某些 Migration

**解決方式**:
```bash
# 查看差異
supabase migration list --project-ref CLIENT_A_ID
supabase migration list --project-ref CLIENT_B_ID

# 推送缺少的 Migration
supabase db push --project-ref CLIENT_B_ID
```

### Q4: 如何在不影響現有資料的情況下修改欄位？

**安全方式**（分三階段）:

**階段 1: 新增新欄位**
```sql
ALTER TABLE products ADD COLUMN new_field TEXT;
```

**階段 2: 遷移資料**
```sql
UPDATE products SET new_field = old_field WHERE new_field IS NULL;
```

**階段 3: 刪除舊欄位**（一週後執行，確認無問題）
```sql
ALTER TABLE products DROP COLUMN old_field;
```

---

## 批次管理工具（進階）

### 建立中央控制腳本

**檔案**: `scripts/migration-manager.ps1`

```powershell
# scripts/migration-manager.ps1
# Migration 中央管理工具

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("push", "verify", "list", "status")]
    [string]$Action = "status"
)

# 客戶配置（從外部檔案載入）
$configPath = "scripts/clients-config.json"

if (-not (Test-Path $configPath)) {
    Write-Host "❌ 找不到配置檔案：$configPath" -ForegroundColor Red
    Write-Host "請建立 clients-config.json 檔案" -ForegroundColor Yellow
    exit 1
}

$clients = Get-Content $configPath | ConvertFrom-Json

switch ($Action) {
    "push" {
        Write-Host "執行批次推送..." -ForegroundColor Cyan
        # 推送邏輯
    }
    "verify" {
        Write-Host "驗證 Migration 一致性..." -ForegroundColor Cyan
        # 驗證邏輯
    }
    "list" {
        Write-Host "客戶列表：" -ForegroundColor Cyan
        $clients | Format-Table -AutoSize
    }
    "status" {
        Write-Host "顯示所有客戶 Migration 狀態..." -ForegroundColor Cyan
        # 狀態邏輯
    }
}
```

**配置檔案**: `scripts/clients-config.json`

```json
{
  "clients": [
    {
      "name": "客戶A",
      "identifier": "client-abc",
      "supabaseProjectId": "abcdefgh12345678",
      "vercelUrl": "https://client-a.vercel.app",
      "githubRepo": "haraluya/vsale-client-abc"
    },
    {
      "name": "客戶B",
      "identifier": "client-xyz",
      "supabaseProjectId": "xyzabcde87654321",
      "vercelUrl": "https://client-b.vercel.app",
      "githubRepo": "haraluya/vsale-client-xyz"
    }
  ]
}
```

---

## 檢查清單

### Migration 推送前

- [ ] 已在主專案建立 Migration 檔案
- [ ] Migration 檔案命名符合規範
- [ ] 已在測試環境驗證（如有）
- [ ] 已檢查是否為破壞性變更
- [ ] 已準備回滾計畫
- [ ] 已更新客戶管理表格（記錄推送計畫）

### Migration 推送中

- [ ] 逐一推送到客戶 Supabase
- [ ] 每推送一個客戶就驗證狀態
- [ ] 記錄推送結果（成功/失敗）
- [ ] 如有失敗，立即暫停並調查

### Migration 推送後

- [ ] 所有客戶 Migration 狀態一致
- [ ] 已測試至少一個客戶的功能正常
- [ ] 已更新客戶管理表格（記錄最新 Migration）
- [ ] 已通知客戶（如需要）
- [ ] 已記錄本次 Migration 內容到文件

---

## 快速參考

```bash
# 建立 Migration
supabase migration new feature_name

# 推送到單一客戶
supabase db push --project-ref PROJECT_ID

# 查看 Migration 狀態
supabase migration list --project-ref PROJECT_ID

# 修復 Migration 狀態
supabase migration repair --status applied 20260122100000 --project-ref PROJECT_ID
```

---

**文件版本**: 1.0.0
**最後更新**: 2026-01-22
