# Vercel 環境變數自動設定腳本（從 .env.local 讀取）
# 使用 PowerShell 執行

param(
    [switch]$DryRun = $false,
    [string]$Environment = "production,preview,development"
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Vercel 環境變數自動設定工具" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 檢查 .env.local 是否存在
$envFile = Join-Path $PSScriptRoot ".." ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Host "❌ 錯誤：找不到 .env.local 檔案" -ForegroundColor Red
    Write-Host "   路徑: $envFile" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ 找到 .env.local 檔案" -ForegroundColor Green
Write-Host ""

# 讀取 .env.local 內容
$envContent = Get-Content $envFile -Raw

# 解析環境變數（簡單的 key=value 解析）
function Parse-EnvFile {
    param([string]$content)

    $vars = @{}
    $lines = $content -split "`n"

    foreach ($line in $lines) {
        $line = $line.Trim()

        # 跳過註解和空行
        if ($line -eq "" -or $line.StartsWith("#")) {
            continue
        }

        # 解析 key=value
        if ($line -match "^([^=]+)=(.*)$") {
            $key = $Matches[1].Trim()
            $value = $Matches[2].Trim()

            # 移除引號
            $value = $value -replace '^["'']|["'']$', ''

            $vars[$key] = $value
        }
    }

    return $vars
}

$envVars = Parse-EnvFile -content $envContent

# 定義需要設定到 Vercel 的環境變數（必須項目）
$requiredVars = @(
    # Supabase 連線
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",

    # Google Cloud Storage（備份系統必須）
    "GCS_PROJECT_ID",
    "GCS_BUCKET_NAME",
    "GCS_SERVICE_ACCOUNT_KEY",

    # Vercel Cron Job 驗證金鑰
    "CRON_SECRET"
)

# 可選項目（本地開發用，線上不需要）
$optionalVars = @(
    "DB_HOST",
    "DB_PORT",
    "DB_NAME",
    "DB_USER",
    "DB_PASSWORD"
)

Write-Host "📋 將設定以下環境變數到 Vercel:" -ForegroundColor Cyan
Write-Host ""

$varsToSet = @{}
$missingRequired = @()

foreach ($key in $requiredVars) {
    if ($envVars.ContainsKey($key) -and $envVars[$key] -ne "") {
        $varsToSet[$key] = $envVars[$key]

        # 隱藏敏感資訊
        if ($key -match "KEY|PASSWORD|SECRET") {
            $displayValue = "$($envVars[$key].Substring(0, [Math]::Min(20, $envVars[$key].Length)))...(已讀取)"
        } else {
            $displayValue = $envVars[$key].Substring(0, [Math]::Min(50, $envVars[$key].Length))
        }

        Write-Host "  ✅ $key" -ForegroundColor Green
        Write-Host "     值: $displayValue" -ForegroundColor Gray
    } else {
        $missingRequired += $key
        Write-Host "  ❌ $key - 缺少！" -ForegroundColor Red
    }
}

Write-Host ""

if ($missingRequired.Count -gt 0) {
    Write-Host "⚠️  警告：以下必須的環境變數在 .env.local 中缺少：" -ForegroundColor Yellow
    foreach ($key in $missingRequired) {
        Write-Host "  - $key" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "請先在 .env.local 中設定這些變數，然後重新執行此腳本。" -ForegroundColor Yellow
    exit 1
}

Write-Host "目標環境: $Environment" -ForegroundColor Cyan
Write-Host "總計: $($varsToSet.Count) 個環境變數" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "🔍 Dry Run 模式：不會實際執行設定" -ForegroundColor Yellow
    Write-Host ""
    exit 0
}

# 確認
$confirmation = Read-Host "確定要將這些變數設定到 Vercel 嗎？ (y/n)"
if ($confirmation -ne "y") {
    Write-Host "❌ 已取消設定" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "正在設定環境變數到 Vercel..." -ForegroundColor Cyan
Write-Host ""

$envList = $Environment -split ","
$successCount = 0
$failCount = 0

foreach ($key in $varsToSet.Keys) {
    $value = $varsToSet[$key]

    Write-Host "設定 $key..." -ForegroundColor Gray

    foreach ($env in $envList) {
        $env = $env.Trim()

        try {
            # 使用 echo 傳遞值到 vercel env add（避免互動式輸入）
            # 注意：Windows PowerShell 需要特殊處理
            $tempFile = [System.IO.Path]::GetTempFileName()
            Set-Content -Path $tempFile -Value $value -NoNewline

            # 執行 vercel env add（使用檔案重導）
            $output = cmd /c "type `"$tempFile`" | vercel env add $key $env 2>&1"

            Remove-Item $tempFile -Force

            # 檢查是否成功
            if ($LASTEXITCODE -eq 0 -or $output -match "Created|Updated") {
                Write-Host "  ✅ $env 環境設定成功" -ForegroundColor Green
                $successCount++
            } else {
                Write-Host "  ⚠️  $env 環境設定失敗: $output" -ForegroundColor Yellow
                $failCount++
            }
        } catch {
            Write-Host "  ❌ $env 環境設定失敗: $_" -ForegroundColor Red
            $failCount++
        }
    }

    Write-Host ""
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "設定完成！" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ 成功: $successCount 個" -ForegroundColor Green
Write-Host "❌ 失敗: $failCount 個" -ForegroundColor Red
Write-Host ""

if ($failCount -eq 0) {
    Write-Host "🎉 所有環境變數已成功設定到 Vercel！" -ForegroundColor Green
    Write-Host ""
    Write-Host "下一步：" -ForegroundColor Cyan
    Write-Host "1. 前往 Vercel Dashboard 確認設定:" -ForegroundColor Gray
    Write-Host "   https://vercel.com/haraluyas-projects/vsale/settings/environment-variables" -ForegroundColor Gray
    Write-Host "2. 觸發重新部署:" -ForegroundColor Gray
    Write-Host "   vercel --prod" -ForegroundColor Gray
    Write-Host "3. 測試備份功能:" -ForegroundColor Gray
    Write-Host "   https://vsale-lite.vercel.app/admin/system/settings" -ForegroundColor Gray
} else {
    Write-Host "⚠️  部分環境變數設定失敗，請手動檢查 Vercel Dashboard。" -ForegroundColor Yellow
}

Write-Host ""
