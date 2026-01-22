# Vsale 主站到站點二資料遷移腳本
# 用途：將主站的商品、分類、會員等級等資料遷移到站點二
# 執行前請先閱讀：docs/BACKUP_ANALYSIS_REPORT.md

# ⚠️ 警告：此腳本會將資料寫入站點二，請確認已備份站點二資料

param(
    [switch]$DryRun,      # 僅模擬執行，不實際匯入
    [switch]$SkipExport,  # 跳過匯出（使用已存在的備份檔案）
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

# 資料庫連線資訊
$SITE1_CONFIG = @{
    Host     = "db.qwovavytryvgchcowjof.supabase.co"
    Port     = 5432
    User     = "postgres.qwovavytryvgchcowjof"
    Password = "qoR78vd1Mj5aquN9"
    Database = "postgres"
}

$SITE2_CONFIG = @{
    Host     = "db.rdyvmgomjdglflrcfijs.supabase.co"
    Port     = 5432
    User     = "postgres.rdyvmgomjdglflrcfijs"
    Password = "Devape-BM69"
    Database = "postgres"
}

# 需要遷移的資料表（按照外鍵依賴順序）
$TABLES_TO_MIGRATE = @(
    "tiers",                        # 1. 會員等級（無依賴）
    "categories",                   # 2. 商品分類（無依賴）
    "series",                       # 3. 商品系列（依賴 categories）
    "products",                     # 4. 商品（依賴 series, categories）
    "tier_prices",                  # 5. 等級價格（依賴 tiers, products）
    "coupons",                      # 6. 優惠券（無依賴）
    "coupon_tier_restrictions",     # 7. 優惠券等級限制（依賴 coupons, tiers）
    "coupon_series_restrictions"    # 8. 優惠券系列限制（依賴 coupons, series）
)

# 備份目錄
$BACKUP_DIR = "backup\site1-migration-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

Write-Host @"

╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   Vsale 主站 → 站點二 資料遷移工具                           ║
║                                                               ║
║   此腳本會將主站的商品、分類、會員等級資料遷移到站點二       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

# ========================================
# 步驟 1: 前置檢查
# ========================================
Write-Step "1/6" "執行前置檢查"

# 檢查 psql 是否安裝
Write-Info "檢查 PostgreSQL 客戶端工具..."
try {
    $psqlVersion = psql --version 2>&1
    Write-Success "已安裝 PostgreSQL 客戶端: $psqlVersion"
} catch {
    Write-Error-Custom "未安裝 PostgreSQL 客戶端工具"
    Write-Host "請從以下網址下載安裝："
    Write-Host "https://www.postgresql.org/download/windows/"
    exit 1
}

# 檢查主站連線
Write-Info "測試主站資料庫連線..."
$env:PGPASSWORD = $SITE1_CONFIG.Password
$testQuery = "SELECT NOW();"
try {
    $result = psql -h $SITE1_CONFIG.Host -p $SITE1_CONFIG.Port -U $SITE1_CONFIG.User -d $SITE1_CONFIG.Database -t -c $testQuery
    Write-Success "主站連線成功: $result"
} catch {
    Write-Error-Custom "主站連線失敗: $_"
    exit 1
}

# 檢查站點二連線
Write-Info "測試站點二資料庫連線..."
$env:PGPASSWORD = $SITE2_CONFIG.Password
try {
    $result = psql -h $SITE2_CONFIG.Host -p $SITE2_CONFIG.Port -U $SITE2_CONFIG.User -d $SITE2_CONFIG.Database -t -c $testQuery
    Write-Success "站點二連線成功: $result"
} catch {
    Write-Error-Custom "站點二連線失敗: $_"
    exit 1
}

# 顯示主站資料統計
Write-Info "主站資料統計："
$env:PGPASSWORD = $SITE1_CONFIG.Password
foreach ($table in $TABLES_TO_MIGRATE) {
    $count = psql -h $SITE1_CONFIG.Host -p $SITE1_CONFIG.Port -U $SITE1_CONFIG.User -d $SITE1_CONFIG.Database -t -c "SELECT COUNT(*) FROM $table;" 2>$null
    if ($count) {
        Write-Host "  - $table`: $($count.Trim()) 筆記錄"
    }
}

# 確認執行
if (-not $Force -and -not $DryRun) {
    Write-Warning "此操作會將上述資料遷移到站點二"
    $confirmation = Read-Host "`n是否繼續? (yes/no)"
    if ($confirmation -ne "yes") {
        Write-Info "已取消遷移"
        exit 0
    }
}

# ========================================
# 步驟 2: 建立備份目錄
# ========================================
Write-Step "2/6" "建立備份目錄"

if (-not $SkipExport) {
    New-Item -Path $BACKUP_DIR -ItemType Directory -Force | Out-Null
    Write-Success "備份目錄已建立: $BACKUP_DIR"
}

# ========================================
# 步驟 3: 匯出主站資料
# ========================================
Write-Step "3/6" "匯出主站資料"

if ($SkipExport) {
    Write-Warning "跳過匯出步驟（使用已存在的備份檔案）"
} else {
    $env:PGPASSWORD = $SITE1_CONFIG.Password

    foreach ($table in $TABLES_TO_MIGRATE) {
        Write-Info "匯出 $table..."
        $outputFile = "$BACKUP_DIR\$table.sql"

        try {
            pg_dump `
                -h $SITE1_CONFIG.Host `
                -p $SITE1_CONFIG.Port `
                -U $SITE1_CONFIG.User `
                -d $SITE1_CONFIG.Database `
                -t $table `
                --data-only `
                --column-inserts `
                --disable-triggers `
                -f $outputFile 2>&1 | Out-Null

            $fileSize = (Get-Item $outputFile).Length
            Write-Success "已匯出 $table ($fileSize bytes)"
        } catch {
            Write-Error-Custom "匯出 $table 失敗: $_"
            exit 1
        }
    }
}

# ========================================
# 步驟 4: 備份站點二現有資料（可選）
# ========================================
Write-Step "4/6" "備份站點二現有資料"

$site2BackupDir = "$BACKUP_DIR\site2-before-import"
New-Item -Path $site2BackupDir -ItemType Directory -Force | Out-Null

$env:PGPASSWORD = $SITE2_CONFIG.Password

foreach ($table in $TABLES_TO_MIGRATE) {
    Write-Info "備份站點二 $table..."
    $outputFile = "$site2BackupDir\$table.sql"

    try {
        pg_dump `
            -h $SITE2_CONFIG.Host `
            -p $SITE2_CONFIG.Port `
            -U $SITE2_CONFIG.User `
            -d $SITE2_CONFIG.Database `
            -t $table `
            --data-only `
            --column-inserts `
            -f $outputFile 2>&1 | Out-Null

        Write-Success "已備份 $table"
    } catch {
        Write-Warning "備份 $table 失敗（可能為空表）: $_"
    }
}

# ========================================
# 步驟 5: 清空站點二資料表
# ========================================
Write-Step "5/6" "清空站點二資料表"

if ($DryRun) {
    Write-Warning "[DRY RUN] 模擬清空站點二資料表（不實際執行）"
} else {
    $env:PGPASSWORD = $SITE2_CONFIG.Password

    # 反向順序清空（避免外鍵錯誤）
    $reverseTables = $TABLES_TO_MIGRATE.Clone()
    [array]::Reverse($reverseTables)

    foreach ($table in $reverseTables) {
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
}

# ========================================
# 步驟 6: 匯入資料到站點二
# ========================================
Write-Step "6/6" "匯入資料到站點二"

if ($DryRun) {
    Write-Warning "[DRY RUN] 模擬匯入資料（不實際執行）"
    Write-Info "將要匯入以下檔案："
    foreach ($table in $TABLES_TO_MIGRATE) {
        $file = "$BACKUP_DIR\$table.sql"
        if (Test-Path $file) {
            Write-Host "  - $file"
        }
    }
} else {
    $env:PGPASSWORD = $SITE2_CONFIG.Password

    foreach ($table in $TABLES_TO_MIGRATE) {
        Write-Info "匯入 $table..."
        $inputFile = "$BACKUP_DIR\$table.sql"

        if (-not (Test-Path $inputFile)) {
            Write-Error-Custom "找不到備份檔案: $inputFile"
            continue
        }

        try {
            psql `
                -h $SITE2_CONFIG.Host `
                -p $SITE2_CONFIG.Port `
                -U $SITE2_CONFIG.User `
                -d $SITE2_CONFIG.Database `
                -f $inputFile 2>&1 | Out-Null

            # 驗證匯入
            $count = psql `
                -h $SITE2_CONFIG.Host `
                -p $SITE2_CONFIG.Port `
                -U $SITE2_CONFIG.User `
                -d $SITE2_CONFIG.Database `
                -t -c "SELECT COUNT(*) FROM $table;"

            Write-Success "已匯入 $table ($($count.Trim()) 筆記錄)"
        } catch {
            Write-Error-Custom "匯入 $table 失敗: $_"
            Write-Host "如需回滾，請執行："
            Write-Host "psql -h $($SITE2_CONFIG.Host) -p $($SITE2_CONFIG.Port) -U $($SITE2_CONFIG.User) -d $($SITE2_CONFIG.Database) -f $site2BackupDir\$table.sql"
            exit 1
        }
    }
}

# ========================================
# 完成
# ========================================
Write-Host @"

╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ✅ 遷移完成！                                              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Green

Write-Info "備份檔案位置: $BACKUP_DIR"
Write-Info "站點二備份位置: $site2BackupDir"

Write-Host "`n下一步："
Write-Host "1. 在站點二 Vercel 網站驗證資料是否正確顯示"
Write-Host "2. 遷移 Supabase Storage 圖片（參考 docs/BACKUP_ANALYSIS_REPORT.md）"
Write-Host "3. 建立站點二的管理員帳號"
Write-Host "4. 測試完整功能流程"

Write-Host "`n如需回滾到遷移前狀態："
Write-Host ".\scripts\rollback-site2.ps1 -BackupDir $site2BackupDir"
