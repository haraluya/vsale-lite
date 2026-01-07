# ================================================================
# 快速備份腳本 - 一鍵備份資料庫
# ================================================================
# 使用方式：.\scripts\quick-backup.ps1
# 或：pnpm db:save
# ================================================================

# 設定終端機編碼為 UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "💾 快速備份資料庫..." -ForegroundColor Cyan
Write-Host ""

# 取得時間戳記
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$projectRoot = Split-Path $PSScriptRoot -Parent
$backupDir = Join-Path $projectRoot "backups"

# 確保備份目錄存在
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

# 備份檔案名稱
$backupFile = Join-Path $backupDir "${timestamp}_quick_backup.sql"
$metadataFile = Join-Path $backupDir "${timestamp}_quick_backup.json"

# 資料庫連線資訊
$containerName = "supabase_db_vsale"
$dbName = "postgres"

# 執行備份
Write-Host "📦 正在備份..." -ForegroundColor Yellow

try {
    # 使用 docker exec 執行 pg_dump
    $pgDumpCmd = "pg_dump -U postgres -d $dbName --schema=public --data-only --inserts --no-owner --no-privileges"
    $pgDumpOutput = docker exec $containerName $pgDumpCmd 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "❌ 備份失敗" -ForegroundColor Red
        Write-Host $pgDumpOutput -ForegroundColor Gray
        exit 1
    }

    # 將輸出寫入檔案
    $pgDumpOutput | Out-File -FilePath $backupFile -Encoding UTF8

    # 取得資料表數量
    $tableCountQuery = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
    $tableCount = docker exec $containerName psql -U postgres -d $dbName -t -c $tableCountQuery 2>&1
    $tableCount = [int]($tableCount -replace '\s+', '')

    # 建立 metadata
    $metadata = @{
        timestamp = $timestamp
        datetime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        filename = Split-Path $backupFile -Leaf
        size_bytes = (Get-Item $backupFile).Length
        size_kb = [math]::Round((Get-Item $backupFile).Length / 1KB, 2)
        table_count = $tableCount
        backup_type = "quick_manual"
    }

    $metadata | ConvertTo-Json | Out-File -FilePath $metadataFile -Encoding UTF8

    Write-Host ""
    Write-Host "✅ 備份完成！" -ForegroundColor Green
    Write-Host ""
    Write-Host "📄 備份檔案：" -ForegroundColor Cyan
    Write-Host "   $backupFile" -ForegroundColor White
    Write-Host ""
    Write-Host "📊 備份資訊：" -ForegroundColor Cyan
    Write-Host "   時間：$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
    Write-Host "   大小：$($metadata.size_kb) KB" -ForegroundColor Gray
    Write-Host "   資料表：$tableCount 個" -ForegroundColor Gray
    Write-Host ""
    Write-Host "💡 還原指令：" -ForegroundColor Yellow
    Write-Host "   pnpm db:load" -ForegroundColor White -BackgroundColor DarkGreen
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "❌ 備份失敗：$_" -ForegroundColor Red
    exit 1
}

exit 0
