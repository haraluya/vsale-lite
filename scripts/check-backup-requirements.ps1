# 檢查備份系統需求
# 用於診斷備份失敗的原因

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "備份系統需求檢查工具" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

$allGood = $true

# 1. 檢查 Supabase CLI
Write-Host "[1/4] 檢查 Supabase CLI..." -ForegroundColor Yellow
try {
    $supabaseVersion = supabase --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Supabase CLI 已安裝: $supabaseVersion" -ForegroundColor Green

        # 檢查是否已連結
        Write-Host "`n  正在檢查 Supabase 專案連結狀態..." -ForegroundColor Yellow
        $linkStatus = supabase status 2>&1
        if ($linkStatus -match "linked") {
            Write-Host "  ✅ Supabase 專案已正確連結" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  Supabase 專案尚未連結或連結錯誤" -ForegroundColor Yellow
            Write-Host "  請執行: supabase link --project-ref qwovavytryvgchcowjof" -ForegroundColor White
            $allGood = $false
        }
    } else {
        throw "Supabase CLI not found"
    }
} catch {
    Write-Host "  ❌ Supabase CLI 未安裝" -ForegroundColor Red
    Write-Host "  安裝方式: npm install -g supabase" -ForegroundColor White
    Write-Host "  或參考: https://supabase.com/docs/guides/cli/getting-started" -ForegroundColor White
    $allGood = $false
}

# 2. 檢查 PostgreSQL 客戶端工具
Write-Host "`n[2/4] 檢查 PostgreSQL 客戶端工具..." -ForegroundColor Yellow
try {
    $pgDumpVersion = pg_dump --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ PostgreSQL 客戶端工具已安裝: $pgDumpVersion" -ForegroundColor Green
    } else {
        throw "pg_dump not found"
    }
} catch {
    Write-Host "  ⚠️  PostgreSQL 客戶端工具未安裝（備用方案）" -ForegroundColor Yellow
    Write-Host "  如果 Supabase CLI 正常運作，可以不安裝" -ForegroundColor White
    Write-Host "  安裝方式: https://www.postgresql.org/download/windows/" -ForegroundColor White
}

# 3. 檢查環境變數
Write-Host "`n[3/4] 檢查環境變數..." -ForegroundColor Yellow

$envFile = ".env.local"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw

    $requiredVars = @(
        @{ Name = "DB_HOST"; Pattern = "DB_HOST=" },
        @{ Name = "DB_PORT"; Pattern = "DB_PORT=" },
        @{ Name = "DB_NAME"; Pattern = "DB_NAME=" },
        @{ Name = "DB_USER"; Pattern = "DB_USER=" },
        @{ Name = "DB_PASSWORD"; Pattern = "DB_PASSWORD=" }
    )

    $missingVars = @()
    foreach ($var in $requiredVars) {
        if ($envContent -match $var.Pattern) {
            Write-Host "  ✅ $($var.Name) 已設定" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $($var.Name) 未設定" -ForegroundColor Red
            $missingVars += $var.Name
        }
    }

    if ($missingVars.Count -gt 0) {
        Write-Host "`n  缺少的環境變數: $($missingVars -join ', ')" -ForegroundColor Red
        Write-Host "  請在 .env.local 檔案中新增這些變數" -ForegroundColor White
        $allGood = $false
    }
} else {
    Write-Host "  ❌ .env.local 檔案不存在" -ForegroundColor Red
    $allGood = $false
}

# 4. 檢查 GCS 設定
Write-Host "`n[4/4] 檢查 Google Cloud Storage 設定..." -ForegroundColor Yellow

if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw

    if ($envContent -match "GCS_BUCKET=") {
        Write-Host "  ✅ GCS_BUCKET 已設定" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  GCS_BUCKET 未設定" -ForegroundColor Yellow
    }

    if ($envContent -match "GCS_CREDENTIALS_BASE64=") {
        Write-Host "  ✅ GCS_CREDENTIALS_BASE64 已設定" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  GCS_CREDENTIALS_BASE64 未設定" -ForegroundColor Yellow
    }

    if ($envContent -match "GCS_PROJECT_ID=") {
        Write-Host "  ✅ GCS_PROJECT_ID 已設定" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  GCS_PROJECT_ID 未設定" -ForegroundColor Yellow
    }
}

# 總結
Write-Host "`n============================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "✅ 備份系統需求檢查完成！" -ForegroundColor Green
    Write-Host "所有必要工具與設定都已就緒" -ForegroundColor Green
} else {
    Write-Host "⚠️  備份系統需求檢查完成，發現問題" -ForegroundColor Yellow
    Write-Host "請根據上述提示修復問題後再次執行備份" -ForegroundColor White
}
Write-Host "============================================`n" -ForegroundColor Cyan

# 提供快速修復建議
if (-not $allGood) {
    Write-Host "快速修復步驟:" -ForegroundColor Cyan
    Write-Host "1. 確保 Supabase CLI 已安裝: npm install -g supabase" -ForegroundColor White
    Write-Host "2. 連結 Supabase 專案: supabase link --project-ref qwovavytryvgchcowjof" -ForegroundColor White
    Write-Host "3. 在 .env.local 檔案中新增缺少的環境變數" -ForegroundColor White
    Write-Host "4. 重新執行此腳本驗證: .\scripts\check-backup-requirements.ps1" -ForegroundColor White
    Write-Host "5. 到後台系統設定頁面執行手動備份測試`n" -ForegroundColor White
}
