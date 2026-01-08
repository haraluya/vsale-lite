# 測試雲端 Supabase 連線
# 用途：驗證環境變數設定是否正確，以及是否能成功連接到雲端資料庫

Write-Host "`n🔍 測試雲端 Supabase 連線...`n" -ForegroundColor Cyan

# 讀取 .env.local
$envFile = Join-Path $PSScriptRoot ".." ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Host "❌ 錯誤：找不到 .env.local 檔案" -ForegroundColor Red
    exit 1
}

$envVars = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.*)$') {
        $envVars[$matches[1].Trim()] = $matches[2].Trim()
    }
}

$SUPABASE_URL = $envVars['NEXT_PUBLIC_SUPABASE_URL']
$SUPABASE_ANON_KEY = $envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY']

Write-Host "📌 環境變數檢查:" -ForegroundColor Yellow
Write-Host "   SUPABASE_URL: $SUPABASE_URL"
Write-Host "   ANON_KEY: $($SUPABASE_ANON_KEY.Substring(0, 20))..."

if (-not $SUPABASE_URL -or -not $SUPABASE_ANON_KEY) {
    Write-Host "`n❌ 錯誤：環境變數未設定" -ForegroundColor Red
    exit 1
}

# 檢查是否為雲端 URL
if ($SUPABASE_URL -like "*127.0.0.1*" -or $SUPABASE_URL -like "*localhost*") {
    Write-Host "`n⚠️  警告：當前設定為本地 Supabase" -ForegroundColor Yellow
    Write-Host "   請確認 .env.local 已切換到雲端設定`n"
    exit 1
}

Write-Host "`n✅ 環境變數檢查通過！" -ForegroundColor Green
Write-Host "   已設定為雲端 Supabase: https://qwovavytryvgchcowjof.supabase.co"

# 測試連線（使用 REST API）
Write-Host "`n✅ 測試 1: 基本連線" -ForegroundColor Yellow
try {
    $headers = @{
        "apikey" = $SUPABASE_ANON_KEY
        "Authorization" = "Bearer $SUPABASE_ANON_KEY"
    }

    $response = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/tiers?select=count&limit=1" -Headers $headers -Method Get
    Write-Host "   ✓ 連線成功！" -ForegroundColor Green
} catch {
    Write-Host "   ✗ 連線失敗: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 測試查詢
Write-Host "`n✅ 測試 2: 查詢會員等級" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/tiers?select=id,name&limit=5" -Headers $headers -Method Get
    Write-Host "   ✓ 查詢成功！找到 $($response.Count) 個等級" -ForegroundColor Green
    $response | ForEach-Object { Write-Host "      - $($_.name)" }
} catch {
    Write-Host "   ✗ 查詢失敗: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n🎉 所有測試通過！雲端 Supabase 連線正常`n" -ForegroundColor Green
