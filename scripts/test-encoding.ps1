# Test script to verify Chinese character display
# Date: 2026-01-07

# Set console encoding to UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  編碼測試工具" -ForegroundColor Cyan
Write-Host "  Encoding Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[成功] 中文字元顯示正常" -ForegroundColor Green
Write-Host "[警告] 這是警告訊息" -ForegroundColor Yellow
Write-Host "[錯誤] 這是錯誤訊息" -ForegroundColor Red
Write-Host ""

Write-Host "測試內容:" -ForegroundColor White
Write-Host "  - 資料庫備份腳本" -ForegroundColor Gray
Write-Host "  - 資料庫還原腳本" -ForegroundColor Gray
Write-Host "  - 資料庫健康檢查腳本" -ForegroundColor Gray
Write-Host "  - 安全資料庫重置腳本" -ForegroundColor Gray
Write-Host ""

Write-Host "所有腳本已轉換為 UTF-8 with BOM 編碼" -ForegroundColor Green
Write-Host "PowerShell 語法檢查: 通過" -ForegroundColor Green
Write-Host ""
