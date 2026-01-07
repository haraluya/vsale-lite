# ================================================================
# 資料庫健康檢查腳本
# Feature: 012-migration-consolidation
# Date: 2026-01-07
# Description: 執行全面的資料庫健康檢查並產生報告
# ================================================================

param(
    [string]$OutputFormat = "console",  # console, json, html
    [switch]$SaveReport = $false,       # 是否儲存報告到檔案
    [string]$ReportDir = ".\reports"    # 報告儲存目錄
)

# 顯示標題
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  資料庫健康檢查工具" -ForegroundColor Cyan
Write-Host "  Database Health Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 檢查 Supabase 是否正在執行
Write-Host "[1/5] 檢查 Supabase 服務狀態..." -ForegroundColor Yellow

try {
    $supabaseStatus = supabase status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[錯誤] 錯誤: Supabase 服務未啟動" -ForegroundColor Red
        Write-Host ""
        Write-Host "請先執行以下指令啟動 Supabase:" -ForegroundColor Yellow
        Write-Host "  supabase start" -ForegroundColor White
        Write-Host ""
        exit 1
    }
    Write-Host "[成功] Supabase 服務正在執行" -ForegroundColor Green
} catch {
    Write-Host "[錯誤] 錯誤: 無法檢查 Supabase 狀態 ($_)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 取得資料庫連線資訊
Write-Host "[2/5] 取得資料庫連線資訊..." -ForegroundColor Yellow

# 從 Supabase status 輸出解析連線資訊
$dbHost = "127.0.0.1"
$dbPort = "54322"
$dbName = "postgres"
$dbUser = "postgres"
$dbPassword = "postgres"

# 設定 PostgreSQL 環境變數（避免密碼提示）
$env:PGPASSWORD = $dbPassword

Write-Host "[成功] 連線資訊已取得" -ForegroundColor Green
Write-Host "   主機: $dbHost" -ForegroundColor Gray
Write-Host "   埠號: $dbPort" -ForegroundColor Gray
Write-Host "   資料庫: $dbName" -ForegroundColor Gray
Write-Host ""

# 執行健康檢查 SQL
Write-Host "[3/5] 執行資料庫健康檢查（預計 30 秒）..." -ForegroundColor Yellow

$healthCheckSql = Join-Path $PSScriptRoot "..\specs\012-migration-consolidation\db-health-check.sql"

if (-not (Test-Path $healthCheckSql)) {
    Write-Host "[錯誤] 錯誤: 找不到健康檢查 SQL 檔案" -ForegroundColor Red
    Write-Host "   預期路徑: $healthCheckSql" -ForegroundColor Gray
    exit 1
}

# 執行 SQL 並擷取輸出
try {
    $sqlOutput = psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f $healthCheckSql 2>&1 | Out-String

    if ($LASTEXITCODE -ne 0) {
        Write-Host "[錯誤] 錯誤: 健康檢查執行失敗" -ForegroundColor Red
        Write-Host $sqlOutput -ForegroundColor Red
        exit 1
    }

    Write-Host "[成功] 健康檢查執行完成" -ForegroundColor Green
} catch {
    Write-Host "[錯誤] 錯誤: 無法執行健康檢查 SQL ($_)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 解析檢查結果
Write-Host "[4/5] 解析檢查結果..." -ForegroundColor Yellow

# 從輸出中提取統計資訊
if ($sqlOutput -match "檢查項目總數:\s*(\d+)") {
    $totalChecks = $Matches[1]
} else {
    $totalChecks = "N/A"
}

if ($sqlOutput -match "通過 \(OK\):\s*(\d+)\s*\(([\d.]+)%\)") {
    $okCount = $Matches[1]
    $okPercent = $Matches[2]
} else {
    $okCount = "N/A"
    $okPercent = "N/A"
}

if ($sqlOutput -match "警告 \(WARNING\):\s*(\d+)\s*\(([\d.]+)%\)") {
    $warningCount = $Matches[1]
    $warningPercent = $Matches[2]
} else {
    $warningCount = "N/A"
    $warningPercent = "N/A"
}

if ($sqlOutput -match "錯誤 \(ERROR\):\s*(\d+)\s*\(([\d.]+)%\)") {
    $errorCount = $Matches[1]
    $errorPercent = $Matches[2]
} else {
    $errorCount = "N/A"
    $errorPercent = "N/A"
}

Write-Host "[成功] 檢查結果已解析" -ForegroundColor Green
Write-Host ""

# 顯示摘要報告
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  健康檢查摘要報告" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "檢查項目總數: $totalChecks" -ForegroundColor White
Write-Host ""

if ($okCount -ne "N/A" -and [int]$okCount -gt 0) {
    Write-Host "[成功] 通過 (OK):    $okCount ($okPercent%)" -ForegroundColor Green
} else {
    Write-Host "[成功] 通過 (OK):    0 (0.0%)" -ForegroundColor Green
}

if ($warningCount -ne "N/A" -and [int]$warningCount -gt 0) {
    Write-Host "[警告]  警告 (WARNING): $warningCount ($warningPercent%)" -ForegroundColor Yellow
} else {
    Write-Host "[警告]  警告 (WARNING): 0 (0.0%)" -ForegroundColor Gray
}

if ($errorCount -ne "N/A" -and [int]$errorCount -gt 0) {
    Write-Host "[錯誤] 錯誤 (ERROR):  $errorCount ($errorPercent%)" -ForegroundColor Red
} else {
    Write-Host "[錯誤] 錯誤 (ERROR):  0 (0.0%)" -ForegroundColor Gray
}

Write-Host ""

# 判斷整體狀態
$healthStatus = "健康"
$healthColor = "Green"

if ($errorCount -ne "N/A" -and [int]$errorCount -gt 0) {
    $healthStatus = "不健康"
    $healthColor = "Red"
} elseif ($warningCount -ne "N/A" -and [int]$warningCount -gt 5) {
    $healthStatus = "需要注意"
    $healthColor = "Yellow"
}

Write-Host "整體狀態: $healthStatus" -ForegroundColor $healthColor
Write-Host ""

# 顯示詳細輸出（僅錯誤與警告）
if (($errorCount -ne "N/A" -and [int]$errorCount -gt 0) -or ($warningCount -ne "N/A" -and [int]$warningCount -gt 0)) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  問題清單（ERROR + WARNING）" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""

    # 從輸出中提取問題清單
    $problemSection = $false
    foreach ($line in $sqlOutput -split "`n") {
        if ($line -match "問題清單.*ERROR.*WARNING") {
            $problemSection = $true
            continue
        }

        if ($problemSection) {
            # 跳過表格分隔線與空行
            if ($line -match "^\s*$" -or $line -match "^-+\+") {
                continue
            }

            # 標示錯誤與警告
            if ($line -match "ERROR") {
                Write-Host $line -ForegroundColor Red
            } elseif ($line -match "WARNING") {
                Write-Host $line -ForegroundColor Yellow
            } else {
                Write-Host $line -ForegroundColor Gray
            }
        }
    }

    Write-Host ""
}

# 儲存報告到檔案（若指定）
if ($SaveReport) {
    Write-Host "[5/5] 儲存檢查報告..." -ForegroundColor Yellow

    # 確保報告目錄存在
    if (-not (Test-Path $ReportDir)) {
        New-Item -ItemType Directory -Path $ReportDir -Force | Out-Null
    }

    # 產生報告檔名
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $reportFilename = "health-check-$timestamp.txt"
    $reportPath = Join-Path $ReportDir $reportFilename

    # 寫入報告
    try {
        $sqlOutput | Out-File -FilePath $reportPath -Encoding UTF8
        Write-Host "[成功] 報告已儲存: $reportPath" -ForegroundColor Green
    } catch {
        Write-Host "[警告]  警告: 無法儲存報告 ($_)" -ForegroundColor Yellow
    }

    Write-Host ""
}

# 顯示完整輸出選項
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "提示" -ForegroundColor Cyan
Write-Host "   若需查看完整報告，請執行以下 SQL 查詢" -ForegroundColor Gray
Write-Host "   SELECT * FROM health_check_results ORDER BY status, category;" -ForegroundColor White
Write-Host ""
Write-Host "   或儲存報告到檔案" -ForegroundColor Gray
Write-Host "   .\scripts\db-health-check.ps1 -SaveReport" -ForegroundColor White
Write-Host ""

# 回傳退出碼
if ($healthStatus -eq "不健康") {
    exit 1
} else {
    exit 0
}
