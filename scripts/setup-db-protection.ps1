# ================================================================
# 資料庫保護機制設定腳本
# ================================================================
# 此腳本會設定 PowerShell 別名，強制攔截 supabase db reset
# ================================================================

# 設定終端機編碼為 UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  資料庫保護機制設定" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# 建立 PowerShell Profile（如果不存在）
# ============================================================
$profilePath = $PROFILE.CurrentUserAllHosts

if (-not (Test-Path $profilePath)) {
    Write-Host "[1/3] 建立 PowerShell Profile..." -ForegroundColor Yellow
    New-Item -ItemType File -Path $profilePath -Force | Out-Null
    Write-Host "   ✅ Profile 已建立：$profilePath" -ForegroundColor Green
} else {
    Write-Host "[1/3] PowerShell Profile 已存在" -ForegroundColor Green
}
Write-Host ""

# ============================================================
# 加入資料庫保護函數到 Profile
# ============================================================
Write-Host "[2/3] 設定資料庫保護函數..." -ForegroundColor Yellow

$protectionFunction = @'

# ================================================================
# 🛡️ Vsale 專案資料庫保護機制
# ================================================================
# 自動由 setup-db-protection.ps1 產生
# 請勿手動修改此區塊
# ================================================================

function supabase {
    param(
        [Parameter(ValueFromRemainingArguments=$true)]
        $args
    )

    # 檢查是否在 Vsale 專案目錄內
    $currentPath = Get-Location
    $vsaleRoot = "D:\APP\vsale"  # 請根據實際路徑調整

    if ($currentPath.Path -like "$vsaleRoot*") {
        # 攔截 db reset 指令
        if ($args -join " " -match "^db\s+reset") {
            Write-Host ""
            Write-Host "🛡️ 資料庫保護機制已啟動" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "偵測到 'supabase db reset' 指令" -ForegroundColor Red
            Write-Host "此操作會清空所有資料，已被攔截！" -ForegroundColor Red
            Write-Host ""
            Write-Host "請使用以下安全方式：" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "  方案 A（推薦）：增量式 Migration" -ForegroundColor Green
            Write-Host "     pnpm db:migrate" -ForegroundColor White
            Write-Host "     → 保留所有現有資料" -ForegroundColor Gray
            Write-Host ""
            Write-Host "  方案 B：安全重置（含備份 + 確認）" -ForegroundColor Yellow
            Write-Host "     pnpm db:reset" -ForegroundColor White
            Write-Host "     → 自動備份 + 多重確認" -ForegroundColor Gray
            Write-Host ""
            Write-Host "如需停用此保護機制，請編輯：" -ForegroundColor Gray
            Write-Host "  $PROFILE" -ForegroundColor Gray
            Write-Host ""
            return
        }
    }

    # 正常執行 supabase 指令
    & (Get-Command supabase.exe -CommandType Application).Source @args
}

# ================================================================
# 結束 Vsale 資料庫保護區塊
# ================================================================

'@

# 檢查是否已存在保護函數
$profileContent = Get-Content -Path $profilePath -Raw -ErrorAction SilentlyContinue

if ($profileContent -notmatch "Vsale 專案資料庫保護機制") {
    Add-Content -Path $profilePath -Value $protectionFunction
    Write-Host "   ✅ 保護函數已加入 Profile" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  保護函數已存在，跳過" -ForegroundColor Gray
}

Write-Host ""

# ============================================================
# 套用設定（重新載入 Profile）
# ============================================================
Write-Host "[3/3] 套用設定..." -ForegroundColor Yellow

try {
    . $profilePath
    Write-Host "   ✅ Profile 已重新載入" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  無法立即套用，請重新開啟 PowerShell" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================
# 完成
# ============================================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  設定完成" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ 資料庫保護機制已啟用" -ForegroundColor Green
Write-Host ""
Write-Host "保護範圍：" -ForegroundColor Cyan
Write-Host "  • 攔截 'supabase db reset' 指令" -ForegroundColor Gray
Write-Host "  • 強制使用 'pnpm db:migrate' 或 'pnpm db:reset'" -ForegroundColor Gray
Write-Host ""

Write-Host "測試方式：" -ForegroundColor Cyan
Write-Host "  1. 重新開啟 PowerShell" -ForegroundColor Gray
Write-Host "  2. 進入專案目錄：cd D:\APP\vsale" -ForegroundColor Gray
Write-Host "  3. 執行：supabase db reset" -ForegroundColor Gray
Write-Host "  4. 應該看到保護機制的警告訊息" -ForegroundColor Gray
Write-Host ""

Write-Host "如需移除保護：" -ForegroundColor Yellow
Write-Host "  編輯 $profilePath" -ForegroundColor Gray
Write-Host "  移除「Vsale 專案資料庫保護機制」區塊" -ForegroundColor Gray
Write-Host ""

exit 0
