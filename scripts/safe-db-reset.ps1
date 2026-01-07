# ================================================================
# 安全資料庫重置腳本
# Feature: 012-migration-consolidation
# Date: 2026-01-07
# Description: 自動備份 + 執行 supabase db reset
# ================================================================

param(
    [switch]$SkipBackup = $false,  # 跳過自動備份（僅限測試環境）
    [string]$BackupReason = "before_reset"  # 備份原因
)

# 設定終端機編碼為 UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# 顯示標題
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  安全資料庫重置工具" -ForegroundColor Cyan
Write-Host "  Safe Database Reset" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 警告訊息
Write-Host "[警告]  警告: 此操作會清空本機資料庫並重新執行所有 Migration" -ForegroundColor Yellow
Write-Host ""

# ============================================================
# [1/3] 執行備份（若未跳過）
# ============================================================

if ($SkipBackup) {
    Write-Host "[1/3] 跳過備份（使用者指定 -SkipBackup）" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "[1/3] 執行備份..." -ForegroundColor Yellow
    Write-Host ""

    # 執行備份腳本
    $backupScript = Join-Path $PSScriptRoot "db-backup.ps1"

    if (-not (Test-Path $backupScript)) {
        Write-Host "[錯誤] 錯誤: 找不到備份腳本" -ForegroundColor Red
        Write-Host "   預期路徑: $backupScript" -ForegroundColor Gray
        exit 1
    }

    try {
        & $backupScript -Reason $BackupReason

        if ($LASTEXITCODE -ne 0) {
            Write-Host "[錯誤] 錯誤: 備份失敗" -ForegroundColor Red
            Write-Host ""
            Write-Host "建議: 手動執行備份後再重試" -ForegroundColor Yellow
            Write-Host "  .\scripts\db-backup.ps1 -Reason $BackupReason" -ForegroundColor White
            Write-Host ""
            exit 1
        }

        Write-Host ""
        Write-Host "[成功] 備份完成" -ForegroundColor Green
        Write-Host ""
    } catch {
        Write-Host "[錯誤] 錯誤: 無法執行備份腳本 ($_)" -ForegroundColor Red
        exit 1
    }
}

# ============================================================
# [2/3] 執行資料庫重置
# ============================================================
Write-Host "[2/3] 執行資料庫重置..." -ForegroundColor Yellow
Write-Host ""

# 確認操作
if (-not $SkipBackup) {
    Write-Host "請輸入 'yes' 確認繼續 (或按 Enter 取消): " -NoNewline -ForegroundColor Yellow
    $confirmation = Read-Host

    if ($confirmation -ne "yes") {
        Write-Host "[錯誤] 操作已取消" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
}

# 執行 supabase db reset
try {
    Write-Host "正在執行 supabase db reset..." -ForegroundColor Gray
    Write-Host ""

    $resetOutput = supabase db reset 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Host "[錯誤] 錯誤: supabase db reset 執行失敗" -ForegroundColor Red
        Write-Host $resetOutput -ForegroundColor Red
        Write-Host ""
        Write-Host "建議: 檢查 Migration 檔案是否有語法錯誤" -ForegroundColor Yellow
        Write-Host ""

        if (-not $SkipBackup) {
            Write-Host "若需還原備份:" -ForegroundColor Yellow
            Write-Host "  .\scripts\db-restore.ps1" -ForegroundColor White
            Write-Host ""
        }

        exit 1
    }

    Write-Host "[成功] 資料庫重置完成" -ForegroundColor Green
} catch {
    Write-Host "[錯誤] 錯誤: 無法執行 supabase db reset ($_)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================================
# [3/3] 驗證重置結果
# ============================================================
Write-Host "[3/3] 驗證重置結果..." -ForegroundColor Yellow

# 取得資料庫連線資訊
$dbHost = "127.0.0.1"
$dbPort = "54322"
$dbName = "postgres"
$dbUser = "postgres"
$dbPassword = "postgres"

# 設定環境變數（避免密碼提示）
$env:PGPASSWORD = $dbPassword

# 查詢資料表數量
try {
    $tableCountQuery = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
    $tableCountOutput = psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -t -c $tableCountQuery 2>&1
    $tableCount = [int]($tableCountOutput -replace '\s+', '')

    Write-Host "[成功] 資料庫驗證成功" -ForegroundColor Green
    Write-Host "   表數量: $tableCount" -ForegroundColor Gray
} catch {
    Write-Host "[警告]  警告: 無法驗證重置結果 ($_)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================
# 完成
# ============================================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  重置成功完成" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not $SkipBackup) {
    Write-Host "提示" -ForegroundColor Cyan
    Write-Host "   若需還原到重置前狀態" -ForegroundColor Gray
    Write-Host "   .\scripts\db-restore.ps1" -ForegroundColor White
    Write-Host ""
}

Write-Host "   執行健康檢查驗證資料庫狀態" -ForegroundColor Gray
Write-Host "   .\scripts\db-health-check.ps1" -ForegroundColor White
Write-Host ""

exit 0
