#!/usr/bin/env pwsh
<#
.SYNOPSIS
    本地資料庫增量 Migration 工具

.DESCRIPTION
    使用 Supabase 官方推薦的 `supabase db push --local` 指令
    套用新 Migration 到本地資料庫，**完全保留現有資料**

.PARAMETER DryRun
    預覽模式，僅顯示將執行的 Migration，不實際套用

.EXAMPLE
    .\scripts\db-migrate-local.ps1
    # 套用所有待處理的 Migration

.EXAMPLE
    .\scripts\db-migrate-local.ps1 -DryRun
    # 預覽將執行的 Migration

.NOTES
    - 此指令不會清空資料
    - 僅套用尚未執行的 Migration
    - 適合日常開發使用
#>

param(
    [switch]$DryRun
)

# 設定錯誤處理
$ErrorActionPreference = "Stop"

# 設定終端機編碼為 UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# ============================================
# 顏色輸出函式
# ============================================
function Write-Step {
    param([string]$Message)
    Write-Host "`n[$((Get-Date).ToString('HH:mm:ss'))] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error-Message {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Warning-Message {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Host "   $Message" -ForegroundColor Gray
}

# ============================================
# 主要流程
# ============================================

Write-Host @"
========================================
  本地資料庫增量 Migration 工具
  Incremental Database Migration
========================================
"@ -ForegroundColor Cyan

Write-Host @"

💡 使用 Supabase 官方推薦的增量更新方式
   - 僅套用尚未執行的 Migration
   - 完全保留現有資料
   - 適合日常開發使用

"@ -ForegroundColor White

# ============================================
# Step 1: 檢查 Supabase 服務狀態
# ============================================
Write-Step "Step 1/4: 檢查 Supabase 服務狀態"

try {
    $status = supabase status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Message "Supabase 服務未運行"
        Write-Warning-Message "請先執行: supabase start"
        exit 1
    }
    Write-Success "Supabase 服務正在運行"
} catch {
    Write-Error-Message "無法連接 Supabase CLI"
    exit 1
}

# ============================================
# Step 2: 檢查待處理的 Migration
# ============================================
Write-Step "Step 2/4: 檢查待處理的 Migration"

try {
    Write-Info "查詢 Migration 狀態..."
    $migrationList = supabase migration list 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Error-Message "無法查詢 Migration 狀態"
        Write-Host $migrationList -ForegroundColor Red
        exit 1
    }

    Write-Host $migrationList -ForegroundColor Gray
    Write-Success "Migration 狀態查詢完成"
} catch {
    Write-Warning-Message "Migration 狀態查詢失敗: $_"
}

# ============================================
# Step 3: 執行 Migration（增量更新）
# ============================================
Write-Step "Step 3/4: 套用 Migration"

if ($DryRun) {
    Write-Warning-Message "預覽模式：僅顯示將執行的 Migration，不實際套用"
    Write-Info "執行指令: supabase db push --local --dry-run"

    try {
        $dryRunOutput = supabase db push --local --dry-run 2>&1

        if ($LASTEXITCODE -ne 0) {
            Write-Error-Message "預覽失敗"
            Write-Host $dryRunOutput -ForegroundColor Red
            exit 1
        }

        Write-Host "`n$dryRunOutput" -ForegroundColor Yellow
        Write-Success "預覽完成"

        Write-Host @"

💡 若要實際套用，請執行：
   .\scripts\db-migrate-local.ps1

"@ -ForegroundColor Cyan

    } catch {
        Write-Error-Message "預覽過程發生錯誤: $_"
        exit 1
    }

} else {
    Write-Info "執行指令: supabase db push --local"
    Write-Info "這將僅套用尚未執行的 Migration"
    Write-Info "現有資料將完全保留"
    Write-Host ""

    try {
        $pushOutput = supabase db push --local 2>&1

        if ($LASTEXITCODE -ne 0) {
            Write-Error-Message "Migration 套用失敗"
            Write-Host $pushOutput -ForegroundColor Red

            Write-Host @"

🔍 可能的原因：
   1. Migration 檔案語法錯誤
   2. 資料庫約束衝突
   3. RLS Policy 設定問題

💡 建議：
   1. 檢查 Migration 檔案語法
   2. 查看上方錯誤訊息詳情
   3. 使用 --dry-run 預覽變更

"@ -ForegroundColor Yellow

            exit 1
        }

        Write-Host $pushOutput -ForegroundColor Gray
        Write-Success "Migration 套用成功"

    } catch {
        Write-Error-Message "Migration 套用過程發生錯誤: $_"
        exit 1
    }
}

# ============================================
# Step 4: 驗證結果（僅非預覽模式）
# ============================================
if (-not $DryRun) {
    Write-Step "Step 4/4: 驗證結果"

    try {
        Write-Info "執行健康檢查..."

        # 檢查資料庫連線
        $env:PGPASSWORD = "postgres"
        $testQuery = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
        $tableCount = psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -t -c $testQuery 2>&1

        if ($LASTEXITCODE -eq 0) {
            $tableCount = [int]($tableCount.Trim())
            Write-Success "資料庫連線正常"
            Write-Info "資料表數量: $tableCount"
        } else {
            Write-Warning-Message "資料庫連線檢查失敗"
        }

        # 檢查 Migration 狀態
        Write-Info "最新 Migration 狀態:"
        $finalStatus = supabase migration list 2>&1 | Select-Object -Last 5
        Write-Host $finalStatus -ForegroundColor Gray

    } catch {
        Write-Warning-Message "驗證過程發生錯誤: $_"
    }
}

# ============================================
# 完成
# ============================================
Write-Host @"

========================================
  ✅ Migration 操作完成
========================================

"@ -ForegroundColor Green

if (-not $DryRun) {
    Write-Host @"
📊 下一步：
   1. 啟動開發伺服器測試新功能：pnpm dev
   2. 執行型別檢查：pnpm type-check
   3. 執行完整健康檢查：.\scripts\db-health-check.ps1

"@ -ForegroundColor Cyan
}

exit 0
