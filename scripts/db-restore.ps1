# ================================================================
# 資料庫還原腳本
# Feature: 012-migration-consolidation
# Date: 2026-01-07
# Description: 從備份檔案還原本機 Supabase 資料庫
# ================================================================

param(
    [string]$BackupFile = ""  # 指定備份檔案路徑（選填，預設互動式選擇）
)

# 顯示標題
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  資料庫還原工具" -ForegroundColor Cyan
Write-Host "  Database Restore" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# [1/4] 檢查 Supabase 服務狀態
# ============================================================
Write-Host "[1/4] 檢查 Supabase 服務狀態..." -ForegroundColor Yellow

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

# ============================================================
# [2/4] 掃描備份檔案
# ============================================================
Write-Host "[2/4] 掃描備份檔案..." -ForegroundColor Yellow

$backupDir = Join-Path $PSScriptRoot "..\backups"

if (-not (Test-Path $backupDir)) {
    Write-Host "[錯誤] 錯誤: 備份目錄不存在" -ForegroundColor Red
    Write-Host "   預期路徑: $backupDir" -ForegroundColor Gray
    Write-Host ""
    Write-Host "請先執行備份:" -ForegroundColor Yellow
    Write-Host "  .\scripts\db-backup.ps1" -ForegroundColor White
    Write-Host ""
    exit 1
}

# 取得所有備份檔案（依修改時間排序）
$allBackups = Get-ChildItem -Path $backupDir -Filter "*.sql" | Sort-Object LastWriteTime -Descending

if ($allBackups.Count -eq 0) {
    Write-Host "[錯誤] 錯誤: 找不到任何備份檔案" -ForegroundColor Red
    Write-Host ""
    Write-Host "請先執行備份:" -ForegroundColor Yellow
    Write-Host "  .\scripts\db-backup.ps1" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "[成功] 找到 $($allBackups.Count) 個備份檔案" -ForegroundColor Green
Write-Host ""

# ============================================================
# [3/4] 選擇備份檔案
# ============================================================

if ($BackupFile -eq "") {
    # 互動式選擇
    Write-Host "請選擇要還原的備份" -ForegroundColor Cyan
    Write-Host ""

    # 顯示備份清單
    $index = 1
    $backupMetadata = @()

    foreach ($backup in $allBackups) {
        # 嘗試讀取元數據
        $metadataFile = $backup.FullName -replace '\.sql$', '_metadata.json'
        $metadata = $null

        if (Test-Path $metadataFile) {
            try {
                $metadata = Get-Content $metadataFile | ConvertFrom-Json
            } catch {
                $metadata = $null
            }
        }

        # 顯示備份資訊
        Write-Host "[$index] $($backup.Name)" -ForegroundColor White

        if ($metadata) {
            Write-Host "    時間: $($metadata.backup_time)" -ForegroundColor Gray
            Write-Host "    原因: $($metadata.reason)" -ForegroundColor Gray
            Write-Host "    大小: $([math]::Round($metadata.file.size_bytes / 1MB, 2)) MB" -ForegroundColor Gray
            Write-Host "    表數量: $($metadata.statistics.table_count)" -ForegroundColor Gray
        } else {
            Write-Host "    時間: $($backup.LastWriteTime)" -ForegroundColor Gray
            Write-Host "    大小: $([math]::Round($backup.Length / 1MB, 2)) MB" -ForegroundColor Gray
        }

        Write-Host ""

        $backupMetadata += @{
            Index = $index
            File = $backup
            Metadata = $metadata
        }

        $index++
    }

    # 讀取使用者輸入
    Write-Host "請輸入編號 [1-$($allBackups.Count)] (或按 Ctrl+C 取消): " -NoNewline -ForegroundColor Yellow
    $selection = Read-Host

    if ($selection -match '^\d+$' -and [int]$selection -ge 1 -and [int]$selection -le $allBackups.Count) {
        $selectedBackup = $allBackups[[int]$selection - 1]
        $BackupFile = $selectedBackup.FullName
    } else {
        Write-Host "[錯誤] 錯誤: 無效的選擇" -ForegroundColor Red
        exit 1
    }
} else {
    # 驗證指定的備份檔案
    if (-not (Test-Path $BackupFile)) {
        Write-Host "[錯誤] 錯誤: 找不到備份檔案" -ForegroundColor Red
        Write-Host "   預期路徑: $BackupFile" -ForegroundColor Gray
        exit 1
    }
}

Write-Host ""
Write-Host "選擇的備份檔案 $BackupFile" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# [4/4] 執行還原
# ============================================================
Write-Host "[4/4] 執行資料庫還原..." -ForegroundColor Yellow

# 取得資料庫連線資訊
$dbHost = "127.0.0.1"
$dbPort = "54322"
$dbName = "postgres"
$dbUser = "postgres"
$dbPassword = "postgres"

# 設定環境變數（避免密碼提示）
$env:PGPASSWORD = $dbPassword

# 確認操作
Write-Host "[警告]  警告: 還原操作會覆蓋現有資料庫資料" -ForegroundColor Yellow
Write-Host "請輸入 'yes' 確認繼續 (或按 Enter 取消): " -NoNewline -ForegroundColor Yellow
$confirmation = Read-Host

if ($confirmation -ne "yes") {
    Write-Host "[錯誤] 操作已取消" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 執行 psql 還原
$startTime = Get-Date
try {
    Write-Host "正在還原資料庫..." -ForegroundColor Gray

    $psqlOutput = psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f $BackupFile 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Host "[錯誤] 錯誤: psql 執行失敗" -ForegroundColor Red
        Write-Host $psqlOutput -ForegroundColor Red
        exit 1
    }

    $restoreDuration = (Get-Date) - $startTime
    $restoreDurationMs = [int]$restoreDuration.TotalMilliseconds

    Write-Host "[成功] 資料庫還原完成" -ForegroundColor Green
    Write-Host "   還原時間: $restoreDurationMs ms" -ForegroundColor Gray
} catch {
    Write-Host "[錯誤] 錯誤: 無法執行 psql ($_)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================================
# 驗證還原結果
# ============================================================
Write-Host "正在驗證還原結果..." -ForegroundColor Yellow

try {
    $tableCountQuery = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
    $tableCountOutput = psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -t -c $tableCountQuery 2>&1
    $tableCount = [int]($tableCountOutput -replace '\s+', '')

    Write-Host "[成功] 資料庫驗證成功" -ForegroundColor Green
    Write-Host "   表數量: $tableCount" -ForegroundColor Gray
} catch {
    Write-Host "[警告]  警告: 無法驗證還原結果 ($_)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================
# 完成
# ============================================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  還原成功完成" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "提示" -ForegroundColor Cyan
Write-Host "   執行健康檢查驗證資料庫狀態" -ForegroundColor Gray
Write-Host "   .\scripts\db-health-check.ps1" -ForegroundColor White
Write-Host ""

exit 0
