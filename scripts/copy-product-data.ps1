# Vsale 商品資料複製腳本
# 用途：從主站複製商品資料到 Site 2
# 作者：Claude Code
# 日期：2026-01-22

param(
    [string]$MainPassword = "Devape-BM69",
    [string]$Site2Password = "Devape-BM69"
)

# 顏色定義
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "========================================" "Cyan"
Write-ColorOutput "  Vsale 商品資料複製工具" "Cyan"
Write-ColorOutput "========================================" "Cyan"
Write-Host ""

# 連線資訊
$MAIN_HOST = "aws-0-ap-southeast-1.pooler.supabase.com"
$MAIN_PORT = "6543"
$MAIN_DB = "postgres"
$MAIN_USER = "postgres.qwovavytryvgchcowjof"

$SITE2_HOST = "aws-0-ap-southeast-1.pooler.supabase.com"
$SITE2_PORT = "6543"
$SITE2_DB = "postgres"
$SITE2_USER = "postgres.rdyvmgomjdglflrcfijs"

$BACKUP_FILE = "d:\APP\vsale\backup\product-data-$(Get-Date -Format 'yyyyMMdd-HHmmss').sql"

# 建立備份目錄
$backupDir = "d:\APP\vsale\backup"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
    Write-ColorOutput "✓ 建立備份目錄：$backupDir" "Green"
}

Write-Host ""

# 檢查 PostgreSQL 工具
Write-ColorOutput "📋 檢查必要工具..." "Yellow"

$pgDumpPath = Get-Command pg_dump -ErrorAction SilentlyContinue
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if (-not $pgDumpPath -or -not $psqlPath) {
    Write-ColorOutput "❌ 找不到 PostgreSQL 工具（pg_dump 或 psql）" "Red"
    Write-Host ""
    Write-ColorOutput "請選擇以下方式之一：" "Yellow"
    Write-Host ""
    Write-Host "方式 A：安裝 PostgreSQL"
    Write-Host "  1. 下載：https://www.postgresql.org/download/windows/"
    Write-Host "  2. 或使用 Chocolatey：choco install postgresql"
    Write-Host ""
    Write-Host "方式 B：使用手動 SQL 複製（不需安裝工具）"
    Write-Host "  執行：powershell scripts/copy-product-data-manual.ps1"
    Write-Host ""
    exit 1
}

Write-ColorOutput "✓ PostgreSQL 工具已就緒" "Green"
Write-Host ""

# 步驟 1：備份主站資料
Write-ColorOutput "📤 步驟 1/3：從主站備份商品資料..." "Yellow"

# 設定密碼環境變數
$env:PGPASSWORD = $MainPassword

# 執行備份
try {
    $tables = @(
        "public.categories",
        "public.tiers",
        "public.series",
        "public.products",
        "public.tier_prices",
        "public.coupons",
        "public.coupon_tier_restrictions",
        "public.coupon_series_restrictions"
    )

    $tableArgs = $tables | ForEach-Object { "--table=$_" }

    & pg_dump `
        --host=$MAIN_HOST `
        --port=$MAIN_PORT `
        --username=$MAIN_USER `
        --dbname=$MAIN_DB `
        --data-only `
        $tableArgs `
        --file=$BACKUP_FILE

    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "✓ 備份成功！" "Green"
        Write-ColorOutput "  檔案位置：$BACKUP_FILE" "Gray"

        # 顯示檔案大小
        $fileSize = (Get-Item $BACKUP_FILE).Length / 1KB
        Write-ColorOutput "  檔案大小：$([math]::Round($fileSize, 2)) KB" "Gray"
    } else {
        throw "備份失敗"
    }
} catch {
    Write-ColorOutput "❌ 備份失敗：$_" "Red"
    exit 1
}

Write-Host ""

# 步驟 2：還原到 Site 2
Write-ColorOutput "📥 步驟 2/3：還原資料到 Site 2..." "Yellow"

# 設定 Site 2 密碼
$env:PGPASSWORD = $Site2Password

try {
    & psql `
        --host=$SITE2_HOST `
        --port=$SITE2_PORT `
        --username=$SITE2_USER `
        --dbname=$SITE2_DB `
        --file=$BACKUP_FILE `
        --quiet

    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "✓ 還原成功！" "Green"
    } else {
        throw "還原失敗"
    }
} catch {
    Write-ColorOutput "❌ 還原失敗：$_" "Red"
    exit 1
}

Write-Host ""

# 步驟 3：驗證資料
Write-ColorOutput "✅ 步驟 3/3：驗證資料..." "Yellow"

# 建立驗證 SQL
$verifySQL = @"
SELECT
  'categories' as table_name,
  COUNT(*) as row_count
FROM categories
UNION ALL
SELECT 'tiers', COUNT(*) FROM tiers
UNION ALL
SELECT 'series', COUNT(*) FROM series
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'tier_prices', COUNT(*) FROM tier_prices
UNION ALL
SELECT 'coupons', COUNT(*) FROM coupons
ORDER BY table_name;
"@

$verifyFile = "d:\APP\vsale\backup\verify.sql"
$verifySQL | Out-File -FilePath $verifyFile -Encoding UTF8

try {
    Write-ColorOutput "  Site 2 資料統計：" "Gray"

    & psql `
        --host=$SITE2_HOST `
        --port=$SITE2_PORT `
        --username=$SITE2_USER `
        --dbname=$SITE2_DB `
        --file=$verifyFile `
        --tuples-only `
        --no-align `
        --field-separator="|"

    Write-Host ""
    Write-ColorOutput "✓ 驗證完成！" "Green"
} catch {
    Write-ColorOutput "⚠️  驗證查詢失敗，但資料可能已正確複製" "Yellow"
}

# 清理
Remove-Item $verifyFile -ErrorAction SilentlyContinue

Write-Host ""
Write-ColorOutput "========================================" "Cyan"
Write-ColorOutput "  🎉 資料複製完成！" "Green"
Write-ColorOutput "========================================" "Cyan"
Write-Host ""
Write-ColorOutput "後續步驟：" "Yellow"
Write-Host "1. 前往 Site 2 後台驗證商品資料"
Write-Host "   https://vsale-site2.vercel.app/admin/products"
Write-Host ""
Write-Host "2. 測試前台商品顯示"
Write-Host "   https://vsale-site2.vercel.app/store"
Write-Host ""
Write-Host "3. 如需還原，備份檔案位於："
Write-Host "   $BACKUP_FILE"
Write-Host ""
