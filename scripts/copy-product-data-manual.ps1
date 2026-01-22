# Vsale 商品資料手動複製指南
# 用途：當沒有 PostgreSQL 工具時，使用 Supabase Dashboard 手動複製
# 作者：Claude Code
# 日期：2026-01-22

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Vsale 商品資料手動複製指南" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$MAIN_PROJECT = "qwovavytryvgchcowjof"
$SITE2_PROJECT = "rdyvmgomjdglflrcfijs"

Write-Host "此腳本將引導您透過 Supabase Dashboard 手動複製資料" -ForegroundColor Yellow
Write-Host ""

# 步驟 1：匯出資料
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  步驟 1：從主站匯出資料" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "請開啟主站 Table Editor：" -ForegroundColor Yellow
Write-Host "https://supabase.com/dashboard/project/$MAIN_PROJECT/editor" -ForegroundColor Cyan
Write-Host ""

$tables = @(
    @{ Name = "categories"; Order = 1; Desc = "商品分類" },
    @{ Name = "tiers"; Order = 2; Desc = "會員等級" },
    @{ Name = "series"; Order = 3; Desc = "商品系列" },
    @{ Name = "products"; Order = 4; Desc = "商品資料" },
    @{ Name = "tier_prices"; Order = 5; Desc = "等級價格" },
    @{ Name = "coupons"; Order = 6; Desc = "優惠券（可選）" }
)

Write-Host "請依序匯出以下表格為 CSV：" -ForegroundColor White
Write-Host ""

foreach ($table in $tables) {
    Write-Host "  $($table.Order). $($table.Desc) ($($table.Name))" -ForegroundColor Green
    Write-Host "     → 點擊表格 → 右上角「...」→「Export to CSV」" -ForegroundColor Gray
    Write-Host "     → 儲存為：d:\APP\vsale\backup\$($table.Name).csv" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "完成後按 Enter 繼續..." -ForegroundColor Yellow
Read-Host

# 步驟 2：匯入資料
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  步驟 2：匯入資料到 Site 2" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "請開啟 Site 2 Table Editor：" -ForegroundColor Yellow
Write-Host "https://supabase.com/dashboard/project/$SITE2_PROJECT/editor" -ForegroundColor Cyan
Write-Host ""

Write-Host "⚠️  請依照以下順序匯入（順序很重要！）：" -ForegroundColor Yellow
Write-Host ""

foreach ($table in $tables) {
    Write-Host "  $($table.Order). 匯入 $($table.Desc) ($($table.Name))" -ForegroundColor Green
    Write-Host "     → 點擊「$($table.Name)」表" -ForegroundColor Gray
    Write-Host "     → 右上角「...」→「Import data from CSV」" -ForegroundColor Gray
    Write-Host "     → 選擇：d:\APP\vsale\backup\$($table.Name).csv" -ForegroundColor Gray
    Write-Host "     → 等待匯入完成" -ForegroundColor Gray
    Write-Host ""

    Write-Host "     完成後按 Enter 繼續..." -ForegroundColor Yellow
    Read-Host
}

# 步驟 3：驗證
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  步驟 3：驗證資料" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "請開啟 Site 2 SQL Editor：" -ForegroundColor Yellow
Write-Host "https://supabase.com/dashboard/project/$SITE2_PROJECT/sql" -ForegroundColor Cyan
Write-Host ""

$verifySQL = @"
-- 檢查各表資料筆數
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

Write-Host "請執行以下 SQL 查詢：" -ForegroundColor White
Write-Host ""
Write-Host $verifySQL -ForegroundColor Gray
Write-Host ""

Write-Host "按 Enter 複製查詢到剪貼簿..." -ForegroundColor Yellow
Read-Host

Set-Clipboard -Value $verifySQL
Write-Host "✓ 查詢已複製到剪貼簿！" -ForegroundColor Green
Write-Host "  請在 SQL Editor 中 Ctrl+V 貼上並執行" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  🎉 手動複製完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
