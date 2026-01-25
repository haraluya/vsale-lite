# 切換到主站 Supabase 帳號
# Usage: .\scripts\switch-to-main.ps1

Write-Host "🔄 切換到主站 Supabase 帳號..." -ForegroundColor Cyan

# 設定主站 Access Token（請替換為您的實際 Token）
$env:SUPABASE_ACCESS_TOKEN = "<YOUR_MAIN_ACCOUNT_ACCESS_TOKEN>"

# 連結主站專案
Write-Host "📡 正在連結主站專案 (qwovavytryvgchcowjof)..." -ForegroundColor Yellow
supabase link --project-ref qwovavytryvgchcowjof

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 已成功切換到主站" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 目前連結資訊:" -ForegroundColor Cyan
    supabase status
} else {
    Write-Host "❌ 切換失敗，請檢查 Access Token" -ForegroundColor Red
}
