# 切換到站點 2&3 Supabase 帳號
# Usage: .\scripts\switch-to-site23.ps1 [site2|site3]

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("site2", "site3")]
    [string]$Site = "site2"
)

Write-Host "🔄 切換到站點 2&3 Supabase 帳號..." -ForegroundColor Cyan

# 設定站點 2&3 Access Token
$env:SUPABASE_ACCESS_TOKEN = "sbp_501d50c8ca940f93b0a3a60179ea552b8704999f"

# 根據參數選擇專案
if ($Site -eq "site2") {
    $ProjectRef = "rdyvmgomjdglflrcfijs"
    $SiteName = "站點 2"
} else {
    $ProjectRef = "dewhcpfzrzewgknaqzwy"
    $SiteName = "站點 3"
}

# 連結專案
Write-Host "📡 正在連結 $SiteName ($ProjectRef)..." -ForegroundColor Yellow
supabase link --project-ref $ProjectRef

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 已成功切換到 $SiteName" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 目前連結資訊:" -ForegroundColor Cyan
    supabase status
} else {
    Write-Host "❌ 切換失敗，請檢查 Access Token" -ForegroundColor Red
}
