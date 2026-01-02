# ================================================
# 直接執行 Migration 到 Supabase
# ================================================

Write-Host "正在讀取 Migration 檔案..." -ForegroundColor Cyan

$migrationFile = "supabase/migrations/20260102_series_and_tier_prices.sql"
$sqlContent = Get-Content $migrationFile -Raw -Encoding UTF8

# Supabase 設定
$projectRef = "qwovavytryvgchcowjof"
$serviceKey = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $serviceKey) {
    # 從 .env.local 讀取
    $envFile = Get-Content ".env.local"
    foreach ($line in $envFile) {
        if ($line -match "^SUPABASE_SERVICE_ROLE_KEY=(.+)$") {
            $serviceKey = $Matches[1]
            break
        }
    }
}

if (-not $serviceKey) {
    Write-Host "錯誤: 找不到 SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Red
    exit 1
}

Write-Host "正在連接到 Supabase..." -ForegroundColor Yellow
Write-Host "專案: $projectRef" -ForegroundColor Gray

# 使用 Supabase REST API 執行 SQL
$url = "https://$projectRef.supabase.co/rest/v1/rpc/exec_sql"
$headers = @{
    "apikey" = $serviceKey
    "Authorization" = "Bearer $serviceKey"
    "Content-Type" = "application/json"
}

$body = @{
    query = $sqlContent
} | ConvertTo-Json

try {
    Write-Host "執行 Migration..." -ForegroundColor Cyan
    $response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body -ErrorAction Stop
    Write-Host "✓ Migration 執行成功！" -ForegroundColor Green
    Write-Host $response
} catch {
    Write-Host "執行失敗，嘗試使用 psql..." -ForegroundColor Yellow

    # 嘗試使用 psql
    $dbUrl = "postgresql://postgres.qwovavytryvgchcowjof:[YOUR_PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

    Write-Host ""
    Write-Host "請手動執行以下步驟：" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. 開啟 Supabase Dashboard SQL Editor:" -ForegroundColor White
    Write-Host "   https://app.supabase.com/project/$projectRef/sql/new" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. 複製檔案內容並執行:" -ForegroundColor White
    Write-Host "   $migrationFile" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "錯誤詳情:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
