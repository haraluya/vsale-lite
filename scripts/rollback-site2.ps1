# Vsale 站點二回滾腳本
# 用途：將站點二恢復到遷移前的狀態
# 執行前請先閱讀：docs/BACKUP_ANALYSIS_REPORT.md

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupDir,   # 備份目錄路徑
    [switch]$Force        # 強制執行，跳過確認提示
)

# 設定錯誤處理
$ErrorActionPreference = "Stop"

# 顏色輸出函數
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }
function Write-Error-Custom { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "ℹ️  $Message" -ForegroundColor Cyan }
function Write-Step { param($Step, $Message) Write-Host "`n[$Step] $Message" -ForegroundColor Magenta }

# 站點二資料庫連線資訊
$SITE2_CONFIG = @{
    Host     = "db.rdyvmgomjdglflrcfijs.supabase.co"
    Port     = 5432
    User     = "postgres.rdyvmgomjdglflrcfijs"
    Password = "Devape-BM69"
    Database = "postgres"
}

# 資料表清單（反向順序，避免外鍵錯誤）
$TABLES = @(
    "coupon_series_restrictions",
    "coupon_tier_restrictions",
    "coupons",
    "tier_prices",
    "products",
    "series",
    "categories",
    "tiers"
)

Write-Host @"

╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   Vsale 站點二回滾工具                                       ║
║                                                               ║
║   此腳本會將站點二恢復到遷移前的狀態                         ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

# ========================================
# 步驟 1: 檢查備份目錄
# ========================================
Write-Step "1/3" "檢查備份目錄"

if (-not (Test-Path $BackupDir)) {
    Write-Error-Custom "找不到備份目錄: $BackupDir"
    exit 1
}

Write-Info "備份目錄: $BackupDir"

# 檢查備份檔案
$foundFiles = 0
foreach ($table in $TABLES) {
    $file = "$BackupDir\$table.sql"
    if (Test-Path $file) {
        $foundFiles++
        Write-Host "  ✅ $table.sql"
    } else {
        Write-Host "  ⚠️  $table.sql (不存在，表可能為空)"
    }
}

if ($foundFiles -eq 0) {
    Write-Error-Custom "找不到任何備份檔案"
    exit 1
}

# 確認執行
if (-not $Force) {
    Write-Warning "此操作會清空站點二的資料並還原備份"
    $confirmation = Read-Host "`n是否繼續? (yes/no)"
    if ($confirmation -ne "yes") {
        Write-Info "已取消回滾"
        exit 0
    }
}

# ========================================
# 步驟 2: 清空站點二資料表
# ========================================
Write-Step "2/3" "清空站點二資料表"

$env:PGPASSWORD = $SITE2_CONFIG.Password

foreach ($table in $TABLES) {
    Write-Info "清空 $table..."
    try {
        psql `
            -h $SITE2_CONFIG.Host `
            -p $SITE2_CONFIG.Port `
            -U $SITE2_CONFIG.User `
            -d $SITE2_CONFIG.Database `
            -c "TRUNCATE TABLE $table CASCADE;" 2>&1 | Out-Null

        Write-Success "已清空 $table"
    } catch {
        Write-Warning "清空 $table 失敗（可能為空表）: $_"
    }
}

# ========================================
# 步驟 3: 還原備份資料
# ========================================
Write-Step "3/3" "還原備份資料"

# 反轉順序（正向匯入）
[array]::Reverse($TABLES)

foreach ($table in $TABLES) {
    $inputFile = "$BackupDir\$table.sql"

    if (-not (Test-Path $inputFile)) {
        Write-Warning "跳過 $table（備份檔案不存在）"
        continue
    }

    Write-Info "還原 $table..."
    try {
        psql `
            -h $SITE2_CONFIG.Host `
            -p $SITE2_CONFIG.Port `
            -U $SITE2_CONFIG.User `
            -d $SITE2_CONFIG.Database `
            -f $inputFile 2>&1 | Out-Null

        # 驗證還原
        $count = psql `
            -h $SITE2_CONFIG.Host `
            -p $SITE2_CONFIG.Port `
            -U $SITE2_CONFIG.User `
            -d $SITE2_CONFIG.Database `
            -t -c "SELECT COUNT(*) FROM $table;"

        Write-Success "已還原 $table ($($count.Trim()) 筆記錄)"
    } catch {
        Write-Error-Custom "還原 $table 失敗: $_"
        exit 1
    }
}

# ========================================
# 完成
# ========================================
Write-Host @"

╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ✅ 回滾完成！                                              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Green

Write-Info "站點二已恢復到遷移前的狀態"
Write-Host "`n請在站點二 Vercel 網站驗證資料是否正確"
