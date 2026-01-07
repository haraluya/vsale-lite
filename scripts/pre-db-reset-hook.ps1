# ================================================================
# Pre-DB-Reset Hook - 資料庫重置前攔截
# ================================================================
# 此腳本會在任何 db reset 操作前執行
# 強制要求使用者確認並提供原因
# ================================================================

param(
    [string]$Reason = ""
)

# 設定終端機編碼為 UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# ============================================================
# 🚨 嚴重警告
# ============================================================
Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════╗" -ForegroundColor Red
Write-Host "║                                                       ║" -ForegroundColor Red
Write-Host "║          ⚠️  資料庫重置攔截器已啟動  ⚠️                ║" -ForegroundColor Red
Write-Host "║                                                       ║" -ForegroundColor Red
Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Red
Write-Host ""

Write-Host "偵測到嘗試執行資料庫重置操作！" -ForegroundColor Yellow
Write-Host ""

# ============================================================
# 顯示替代方案
# ============================================================
Write-Host "⚡ 您應該使用增量式 Migration（推薦）：" -ForegroundColor Cyan
Write-Host ""
Write-Host "   pnpm db:migrate" -ForegroundColor White -BackgroundColor DarkGreen
Write-Host ""
Write-Host "優勢：" -ForegroundColor Gray
Write-Host "   ✅ 保留所有現有資料" -ForegroundColor Green
Write-Host "   ✅ 僅套用新的 Migration" -ForegroundColor Green
Write-Host "   ✅ 符合 Supabase 官方最佳實踐" -ForegroundColor Green
Write-Host ""

# ============================================================
# 檢查是否有未套用的 Migration
# ============================================================
Write-Host "📋 檢查 Migration 狀態..." -ForegroundColor Cyan
Write-Host ""

try {
    $migrationList = supabase migration list --local 2>&1 | Out-String

    if ($migrationList -match "Found (\d+) migration") {
        $pendingCount = $matches[1]
        if ([int]$pendingCount -gt 0) {
            Write-Host "⚠️  發現 $pendingCount 個未套用的 Migration" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "建議使用增量式套用：" -ForegroundColor Cyan
            Write-Host "   pnpm db:migrate" -ForegroundColor White
            Write-Host ""
        }
    }
} catch {
    Write-Host "   無法檢查 Migration 狀態" -ForegroundColor Gray
}

# ============================================================
# 雙重確認機制
# ============================================================
Write-Host "╔═══════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║  如果您確定需要重置資料庫，請回答以下問題：          ║" -ForegroundColor Yellow
Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Yellow
Write-Host ""

# 問題 1：為什麼需要重置？
if ([string]::IsNullOrEmpty($Reason)) {
    Write-Host "問題 1/3: 為什麼需要重置資料庫？" -ForegroundColor Yellow
    Write-Host "         (請輸入原因，不可為空)" -ForegroundColor Gray
    Write-Host ""
    $Reason = Read-Host "原因"
    Write-Host ""

    if ([string]::IsNullOrEmpty($Reason)) {
        Write-Host "❌ 未提供原因，操作已取消" -ForegroundColor Red
        exit 1
    }
}

# 問題 2：是否知道會清空資料？
Write-Host "問題 2/3: 您知道此操作會清空所有測試資料嗎？" -ForegroundColor Yellow
Write-Host "         (請輸入 'yes' 確認)" -ForegroundColor Gray
Write-Host ""
$confirm1 = Read-Host "確認"
Write-Host ""

if ($confirm1 -ne "yes") {
    Write-Host "❌ 操作已取消" -ForegroundColor Red
    exit 1
}

# 問題 3：是否已備份？
Write-Host "問題 3/3: 您是否已經備份資料庫？" -ForegroundColor Yellow
Write-Host "         (請輸入 'yes' 確認，或輸入 'auto' 自動備份)" -ForegroundColor Gray
Write-Host ""
$confirm2 = Read-Host "確認"
Write-Host ""

if ($confirm2 -eq "auto") {
    Write-Host "📦 執行自動備份..." -ForegroundColor Cyan
    $backupScript = Join-Path $PSScriptRoot "db-backup.ps1"

    try {
        & $backupScript -Reason "before_reset_$Reason"
        Write-Host "✅ 備份完成" -ForegroundColor Green
        Write-Host ""
    } catch {
        Write-Host "❌ 備份失敗：$_" -ForegroundColor Red
        Write-Host "   操作已取消" -ForegroundColor Red
        exit 1
    }
} elseif ($confirm2 -ne "yes") {
    Write-Host "❌ 請先備份資料庫再執行重置" -ForegroundColor Red
    Write-Host ""
    Write-Host "執行備份：" -ForegroundColor Cyan
    Write-Host "   pnpm db:backup" -ForegroundColor White
    Write-Host ""
    exit 1
}

# ============================================================
# 記錄操作日誌
# ============================================================
$logDir = Join-Path $PSScriptRoot ".." "logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

$logFile = Join-Path $logDir "db-reset-log.txt"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$logEntry = "[$timestamp] DB Reset - Reason: $Reason"

Add-Content -Path $logFile -Value $logEntry

# ============================================================
# 最後警告
# ============================================================
Write-Host "╔═══════════════════════════════════════════════════════╗" -ForegroundColor Red
Write-Host "║            最後警告：即將清空資料庫                   ║" -ForegroundColor Red
Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Red
Write-Host ""
Write-Host "按任意鍵繼續，或 Ctrl+C 取消..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Write-Host ""

Write-Host "✅ 安全檢查通過，允許執行 db reset" -ForegroundColor Green
Write-Host ""

exit 0
