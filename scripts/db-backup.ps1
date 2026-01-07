# ================================================================
# 資料庫備份腳本
# Feature: 012-migration-consolidation
# Date: 2026-01-07
# Description: 備份本機 Supabase 資料庫並產生元數據
# ================================================================

param(
    [string]$Reason = "manual_backup",
    [int]$MaxBackups = 10
)

# 顯示標題
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  資料庫備份工具" -ForegroundColor Cyan
Write-Host "  Database Backup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# [1/5] 檢查 Supabase 服務狀態
# ============================================================
Write-Host "[1/5] 檢查 Supabase 服務狀態..." -ForegroundColor Yellow

try {
    $supabaseStatus = supabase status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[錯誤] Supabase 服務未啟動" -ForegroundColor Red
        Write-Host ""
        Write-Host "請先執行以下指令啟動 Supabase:" -ForegroundColor Yellow
        Write-Host "  supabase start" -ForegroundColor White
        Write-Host ""
        exit 1
    }
    Write-Host "[成功] Supabase 服務正在執行" -ForegroundColor Green
} catch {
    Write-Host "[錯誤] 無法檢查 Supabase 狀態 ($_)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================================
# [2/5] 取得資料庫連線資訊
# ============================================================
Write-Host "[2/5] 取得資料庫連線資訊..." -ForegroundColor Yellow

$dbHost = "127.0.0.1"
$dbPort = "54322"
$dbName = "postgres"
$dbUser = "postgres"
$dbPassword = "postgres"

# 設定環境變數（避免密碼提示）
$env:PGPASSWORD = $dbPassword

Write-Host "[成功] 連線資訊已取得" -ForegroundColor Green
Write-Host "   主機: $dbHost" -ForegroundColor Gray
Write-Host "   埠號: $dbPort" -ForegroundColor Gray
Write-Host "   資料庫: $dbName" -ForegroundColor Gray
Write-Host ""

# ============================================================
# [3/5] 執行資料庫備份
# ============================================================
Write-Host "[3/5] 執行資料庫備份..." -ForegroundColor Yellow

# 確保備份目錄存在
$backupDir = Join-Path $PSScriptRoot "..\backups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

# 產生備份檔名（含時間戳）
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFilename = "${timestamp}_${Reason}.sql"
$backupPath = Join-Path $backupDir $backupFilename

# 執行 pg_dump
$startTime = Get-Date
try {
    $pgDumpOutput = pg_dump -h $dbHost -p $dbPort -U $dbUser -d $dbName `
        --clean `
        --if-exists `
        --no-owner `
        --no-acl `
        --schema=public `
        --schema=storage `
        --schema=auth `
        --file="$backupPath" 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Host "[錯誤] 錯誤: pg_dump 執行失敗" -ForegroundColor Red
        Write-Host $pgDumpOutput -ForegroundColor Red
        exit 1
    }

    $backupDuration = (Get-Date) - $startTime
    $backupDurationMs = [int]$backupDuration.TotalMilliseconds

    Write-Host "[成功] 備份檔案已建立" -ForegroundColor Green
    Write-Host "   路徑: $backupPath" -ForegroundColor Gray
} catch {
    Write-Host "[錯誤] 錯誤: 無法執行 pg_dump ($_)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================================
# [4/5] 產生備份元數據
# ============================================================
Write-Host "[4/5] 產生備份元數據..." -ForegroundColor Yellow

# 取得備份檔案大小
$backupFileInfo = Get-Item $backupPath
$backupSizeBytes = $backupFileInfo.Length
$backupSizeMB = [math]::Round($backupSizeBytes / 1MB, 2)

# 查詢資料表數量與資料筆數
try {
    $tableCountQuery = @"
SELECT COUNT(*)
FROM information_schema.tables
WHERE table_schema = 'public';
"@

    $tableCountOutput = psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -t -c $tableCountQuery 2>&1
    $tableCount = [int]($tableCountOutput -replace '\s+', '')

    $rowCountQuery = @"
SELECT SUM(n_live_tup)
FROM pg_stat_user_tables;
"@

    $rowCountOutput = psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -t -c $rowCountQuery 2>&1
    $totalRows = [int]($rowCountOutput -replace '\s+', '')

} catch {
    Write-Host "[警告]  警告: 無法查詢資料庫統計資訊 ($_)" -ForegroundColor Yellow
    $tableCount = 0
    $totalRows = 0
}

# 取得 Supabase 版本資訊
try {
    $supabaseVersion = (supabase --version 2>&1) -replace 'supabase ', ''
    $postgresVersion = (psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -t -c "SHOW server_version;" 2>&1) -replace '\s+', ''
} catch {
    $supabaseVersion = "unknown"
    $postgresVersion = "unknown"
}

# 建立元數據 JSON
$metadata = @{
    backup_time = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    reason = $Reason
    environment = "local"
    database = @{
        host = $dbHost
        port = [int]$dbPort
        name = $dbName
    }
    file = @{
        name = $backupFilename
        path = $backupPath
        size_bytes = [int]$backupSizeBytes
        format = "plain"
    }
    statistics = @{
        table_count = $tableCount
        total_rows = $totalRows
        backup_duration_ms = $backupDurationMs
    }
    supabase = @{
        version = $supabaseVersion
        postgres_version = $postgresVersion
    }
} | ConvertTo-Json -Depth 5

# 儲存元數據檔案
$metadataFilename = "${timestamp}_metadata.json"
$metadataPath = Join-Path $backupDir $metadataFilename

try {
    $metadata | Out-File -FilePath $metadataPath -Encoding UTF8
    Write-Host "[成功] 元數據檔案已建立" -ForegroundColor Green
    Write-Host "   路徑: $metadataPath" -ForegroundColor Gray
} catch {
    Write-Host "[警告]  警告: 無法建立元數據檔案 ($_)" -ForegroundColor Yellow
}

Write-Host ""

# 顯示備份資訊
Write-Host "備份資訊" -ForegroundColor Cyan
Write-Host "   - 檔案大小: $backupSizeMB MB" -ForegroundColor White
Write-Host "   - 表數量: $tableCount" -ForegroundColor White
Write-Host "   - 資料筆數: $totalRows" -ForegroundColor White
Write-Host "   - 備份時間: $backupDurationMs ms" -ForegroundColor White
Write-Host ""

# ============================================================
# [5/5] 清理舊備份（保留最近 N 次）
# ============================================================
Write-Host "[5/5] 清理舊備份（保留最近 $MaxBackups 次）..." -ForegroundColor Yellow

# 取得所有備份檔案（依修改時間排序）
$allBackups = Get-ChildItem -Path $backupDir -Filter "*.sql" | Sort-Object LastWriteTime -Descending

if ($allBackups.Count -gt $MaxBackups) {
    $backupsToDelete = $allBackups | Select-Object -Skip $MaxBackups

    foreach ($backup in $backupsToDelete) {
        try {
            # 刪除備份檔案
            Remove-Item $backup.FullName -Force

            # 刪除對應的元數據檔案
            $metadataFile = $backup.FullName -replace '\.sql$', '_metadata.json'
            if (Test-Path $metadataFile) {
                Remove-Item $metadataFile -Force
            }
        } catch {
            Write-Host "[警告]  警告: 無法刪除舊備份 $($backup.Name) ($_)" -ForegroundColor Yellow
        }
    }

    Write-Host "[成功] 清理完成（刪除 $($backupsToDelete.Count) 個舊備份）" -ForegroundColor Green
} else {
    Write-Host "[成功] 備份數量未超過限制，無需清理" -ForegroundColor Green
}

Write-Host ""

# ============================================================
# 完成
# ============================================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  備份成功完成" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "備份檔案: $backupPath" -ForegroundColor White
Write-Host ""
Write-Host "提示" -ForegroundColor Cyan
Write-Host "   若需還原此備份，請執行" -ForegroundColor Gray
Write-Host "   .\scripts\db-restore.ps1" -ForegroundColor White
Write-Host ""

exit 0
