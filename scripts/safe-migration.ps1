# =====================================================
# Safe Migration Helper
# 安全的資料庫 Migration 工作流程
# =====================================================
#
# 使用方式:
#   .\scripts\safe-migration.ps1 -Name "add_new_column"
#   .\scripts\safe-migration.ps1 -Push  # 推送已存在的 Migration
#
# =====================================================

param(
    [string]$Name,
    [switch]$Push,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

function Show-Help {
    Write-Host ""
    Write-Host "=== Safe Migration Helper ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "建立新 Migration:" -ForegroundColor Green
    Write-Host "  .\scripts\safe-migration.ps1 -Name `"add_new_column`"" -ForegroundColor White
    Write-Host ""
    Write-Host "推送 Migration 到本地資料庫:" -ForegroundColor Green
    Write-Host "  .\scripts\safe-migration.ps1 -Push" -ForegroundColor White
    Write-Host ""
    Write-Host "注意事項:" -ForegroundColor Yellow
    Write-Host "  ✅ 使用 supabase db push 推送 Migration (保留現有資料)" -ForegroundColor Green
    Write-Host "  ❌ 避免使用 supabase db reset (清空所有資料)" -ForegroundColor Red
    Write-Host ""
    exit 0
}

if ($Help) {
    Show-Help
}

# 檢查 Supabase CLI
$supabasePath = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabasePath) {
    Write-Host "❌ 錯誤：找不到 Supabase CLI" -ForegroundColor Red
    Write-Host "請先安裝: https://supabase.com/docs/guides/cli" -ForegroundColor Yellow
    exit 1
}

# 選項 1: 建立新 Migration
if ($Name) {
    Write-Host ""
    Write-Host "📝 建立新 Migration: $Name" -ForegroundColor Cyan
    Write-Host ""

    # 產生時間戳 (格式: YYYYMMDD)
    $timestamp = Get-Date -Format "yyyyMMdd"

    # 檢查今天是否已有同名 Migration
    $existingMigrations = Get-ChildItem "supabase\migrations" -Filter "$timestamp*$Name*" -ErrorAction SilentlyContinue

    if ($existingMigrations) {
        Write-Host "⚠️  警告：今天已有類似名稱的 Migration" -ForegroundColor Yellow
        $existingMigrations | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor Gray }
        Write-Host ""
        $continue = Read-Host "繼續建立新 Migration? (y/n)"
        if ($continue -ne "y") {
            Write-Host "✅ 已取消" -ForegroundColor Green
            exit 0
        }
    }

    # 建立 Migration
    Write-Host "執行: supabase migration new $Name" -ForegroundColor Gray
    supabase migration new $Name

    Write-Host ""
    Write-Host "✅ Migration 檔案已建立" -ForegroundColor Green
    Write-Host ""
    Write-Host "下一步:" -ForegroundColor Cyan
    Write-Host "  1. 編輯 Migration 檔案（位於 supabase/migrations/）" -ForegroundColor White
    Write-Host "  2. 執行 .\scripts\safe-migration.ps1 -Push 推送變更" -ForegroundColor White
    Write-Host ""

    exit 0
}

# 選項 2: 推送 Migration
if ($Push) {
    Write-Host ""
    Write-Host "🚀 推送 Migration 到本地資料庫" -ForegroundColor Cyan
    Write-Host ""

    # 檢查是否有未推送的 Migration
    Write-Host "檢查 Migration 狀態..." -ForegroundColor Gray
    supabase migration list

    Write-Host ""
    Write-Host "⚠️  即將執行 supabase db push --local (保留現有資料)" -ForegroundColor Yellow
    Write-Host ""

    $confirm = Read-Host "確定要推送 Migration? (y/n)"
    if ($confirm -ne "y") {
        Write-Host "✅ 已取消" -ForegroundColor Green
        exit 0
    }

    Write-Host ""
    Write-Host "執行: supabase db push --local" -ForegroundColor Gray
    supabase db push --local

    Write-Host ""
    Write-Host "✅ Migration 推送完成" -ForegroundColor Green
    Write-Host ""
    Write-Host "提示：您的測試資料已保留，無需重新建立" -ForegroundColor Green
    Write-Host ""

    exit 0
}

# 沒有提供參數，顯示幫助
Show-Help
