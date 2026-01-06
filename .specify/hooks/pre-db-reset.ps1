# =====================================================
# Pre-DB-Reset Hook
# 防止意外重置資料庫,保護測試資料
# =====================================================

param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "⚠️  警告：您正在嘗試重置資料庫 (supabase db reset)" -ForegroundColor Red
Write-Host ""
Write-Host "這將會:" -ForegroundColor Yellow
Write-Host "  ❌ 刪除所有現有資料（包含測試資料）" -ForegroundColor Red
Write-Host "  ❌ 刪除所有訂單記錄" -ForegroundColor Red
Write-Host "  ❌ 刪除所有客戶資料" -ForegroundColor Red
Write-Host "  ❌ 刪除所有商品資料" -ForegroundColor Red
Write-Host ""
Write-Host "建議做法:" -ForegroundColor Green
Write-Host "  ✅ 使用增量式 Migration (supabase migration new <name>)" -ForegroundColor Green
Write-Host "  ✅ 使用 supabase db push 推送變更" -ForegroundColor Green
Write-Host ""

# 檢查是否使用 --force 參數
if ($Force) {
    Write-Host "⚠️  檢測到 --force 參數，將繼續執行重置" -ForegroundColor Yellow
    exit 0
}

# 詢問使用者確認
$response = Read-Host "您確定要繼續重置資料庫嗎? (yes/no)"

if ($response -ne "yes") {
    Write-Host ""
    Write-Host "✅ 已取消資料庫重置" -ForegroundColor Green
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "⚠️  最後確認：這將清除所有資料！請再次確認" -ForegroundColor Red
$finalConfirm = Read-Host "請輸入 'DELETE ALL DATA' 以確認"

if ($finalConfirm -ne "DELETE ALL DATA") {
    Write-Host ""
    Write-Host "✅ 已取消資料庫重置" -ForegroundColor Green
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "✅ 確認重置資料庫..." -ForegroundColor Yellow
Write-Host ""

exit 0
