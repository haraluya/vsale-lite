# ================================================================
# 快速還原腳本 - 一鍵還原最新備份
# ================================================================
# 使用方式：.\scripts\quick-restore.ps1
# 或：pnpm db:load
# ================================================================

param(
    [string]$BackupFile = ""  # 指定要還原的備份檔案（可選）
)

# 設定終端機編碼為 UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "📥 快速還原資料庫" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path $PSScriptRoot -Parent
$backupDir = Join-Path $projectRoot "backups"

# 檢查備份目錄是否存在
if (-not (Test-Path $backupDir)) {
    Write-Host "❌ 備份目錄不存在：$backupDir" -ForegroundColor Red
    Write-Host ""
    Write-Host "請先執行備份：" -ForegroundColor Yellow
    Write-Host "   pnpm db:save" -ForegroundColor White
    Write-Host ""
    exit 1
}

# 如果沒有指定備份檔案，列出所有備份讓使用者選擇
if ([string]::IsNullOrEmpty($BackupFile)) {
    Write-Host "📋 可用的備份：" -ForegroundColor Cyan
    Write-Host ""

    # 取得所有備份檔案（依時間排序）
    $backupFiles = Get-ChildItem -Path $backupDir -Filter "*.sql" |
        Sort-Object LastWriteTime -Descending

    if ($backupFiles.Count -eq 0) {
        Write-Host "❌ 沒有找到任何備份檔案" -ForegroundColor Red
        Write-Host ""
        Write-Host "請先執行備份：" -ForegroundColor Yellow
        Write-Host "   pnpm db:save" -ForegroundColor White
        Write-Host ""
        exit 1
    }

    # 顯示備份列表
    for ($i = 0; $i -lt [Math]::Min($backupFiles.Count, 10); $i++) {
        $file = $backupFiles[$i]
        $size = [math]::Round($file.Length / 1KB, 2)
        $time = $file.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")

        $displayIndex = $i + 1
        if ($i -eq 0) {
            Write-Host "   [$displayIndex] $($file.Name) (最新)" -ForegroundColor Green
        } else {
            Write-Host "   [$displayIndex] $($file.Name)" -ForegroundColor Gray
        }
        Write-Host "       時間：$time | 大小：$size KB" -ForegroundColor DarkGray
        Write-Host ""
    }

    # 讓使用者選擇
    Write-Host "請選擇要還原的備份 [1-$([Math]::Min($backupFiles.Count, 10))]" -ForegroundColor Yellow
    Write-Host "（直接按 Enter 還原最新備份，或輸入 0 取消）：" -ForegroundColor Gray
    Write-Host ""
    $choice = Read-Host "選擇"

    if ([string]::IsNullOrEmpty($choice) -or $choice -eq "1") {
        # 使用最新備份
        $BackupFile = $backupFiles[0].FullName
        Write-Host ""
        Write-Host "✅ 選擇最新備份" -ForegroundColor Green
    } elseif ($choice -eq "0") {
        Write-Host ""
        Write-Host "❌ 操作已取消" -ForegroundColor Yellow
        exit 0
    } else {
        $index = [int]$choice - 1
        if ($index -ge 0 -and $index -lt $backupFiles.Count) {
            $BackupFile = $backupFiles[$index].FullName
            Write-Host ""
            Write-Host "✅ 選擇備份 $choice" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "❌ 無效的選擇" -ForegroundColor Red
            exit 1
        }
    }
}

# 檢查備份檔案是否存在
if (-not (Test-Path $BackupFile)) {
    Write-Host ""
    Write-Host "❌ 備份檔案不存在：$BackupFile" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📄 還原檔案：$(Split-Path $BackupFile -Leaf)" -ForegroundColor Cyan
Write-Host ""

# 確認操作
Write-Host "⚠️  警告：此操作會覆蓋當前資料庫的資料" -ForegroundColor Yellow
Write-Host ""
Write-Host "請輸入 'yes' 確認繼續（或按 Enter 取消）：" -NoNewline -ForegroundColor Yellow
$confirmation = Read-Host

if ($confirmation -ne "yes") {
    Write-Host ""
    Write-Host "❌ 操作已取消" -ForegroundColor Red
    exit 0
}

Write-Host ""

# 資料庫連線資訊
$containerName = "supabase_db_vsale"
$dbName = "postgres"

# 執行還原
Write-Host "📥 正在還原..." -ForegroundColor Yellow
Write-Host ""

try {
    # 清空現有資料（僅清空資料，保留結構）
    Write-Host "[1/3] 清空現有資料..." -ForegroundColor Gray

    # 取得所有資料表
    $tablesQuery = "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"
    $tables = docker exec $containerName psql -U postgres -d $dbName -t -c $tablesQuery 2>&1

    $tableList = $tables -split "`n" | Where-Object { $_.Trim() -ne "" } | ForEach-Object { $_.Trim() }

    foreach ($table in $tableList) {
        if ($table) {
            $truncateQuery = "TRUNCATE TABLE \`"$table\`" CASCADE;"
            docker exec $containerName psql -U postgres -d $dbName -c $truncateQuery 2>&1 | Out-Null
        }
    }

    Write-Host "   ✅ 已清空現有資料" -ForegroundColor Green
    Write-Host ""

    # 還原資料
    Write-Host "[2/3] 還原備份資料..." -ForegroundColor Gray

    # 將備份檔案複製到容器中
    $containerBackupPath = "/tmp/restore_backup.sql"
    docker cp $BackupFile ${containerName}:${containerBackupPath} 2>&1 | Out-Null

    # 在容器中執行還原
    $restoreOutput = docker exec $containerName psql -U postgres -d $dbName -f $containerBackupPath 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "❌ 還原失敗" -ForegroundColor Red
        Write-Host $restoreOutput -ForegroundColor Gray
        exit 1
    }

    Write-Host "   ✅ 資料已還原" -ForegroundColor Green
    Write-Host ""

    # 驗證還原結果
    Write-Host "[3/3] 驗證還原結果..." -ForegroundColor Gray

    $tableCountQuery = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
    $tableCount = docker exec $containerName psql -U postgres -d $dbName -t -c $tableCountQuery 2>&1
    $tableCount = [int]($tableCount -replace '\s+', '')

    # 清理容器中的臨時檔案
    docker exec $containerName rm $containerBackupPath 2>&1 | Out-Null

    Write-Host "   ✅ 驗證完成" -ForegroundColor Green
    Write-Host ""

    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  還原成功！" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 還原資訊：" -ForegroundColor Cyan
    Write-Host "   備份檔案：$(Split-Path $BackupFile -Leaf)" -ForegroundColor Gray
    Write-Host "   資料表數：$tableCount 個" -ForegroundColor Gray
    Write-Host "   還原時間：$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
    Write-Host ""
    Write-Host "💡 提示：" -ForegroundColor Cyan
    Write-Host "   執行健康檢查驗證資料庫狀態" -ForegroundColor Gray
    Write-Host "   pnpm db:health" -ForegroundColor White
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "❌ 還原失敗：$_" -ForegroundColor Red
    exit 1
}

exit 0
