# ================================================
# 建立本地 Supabase 測試管理員
# ================================================

Write-Host "正在建立測試管理員帳號..." -ForegroundColor Cyan
Write-Host ""

# 管理員資訊
$adminEmail = "admin@test.com"
$adminPassword = "Admin@123456"

Write-Host "方法 1: 使用 Supabase Studio（推薦）" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. 開啟 Supabase Studio:" -ForegroundColor White
Write-Host "   http://127.0.0.1:54323" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. 左側選單 → Authentication → Users" -ForegroundColor White
Write-Host ""
Write-Host "3. 點擊右上角 'Add User' 按鈕" -ForegroundColor White
Write-Host ""
Write-Host "4. 填寫資訊:" -ForegroundColor White
Write-Host "   Email: $adminEmail" -ForegroundColor Cyan
Write-Host "   Password: $adminPassword" -ForegroundColor Cyan
Write-Host "   Auto Confirm User: ✓（勾選）" -ForegroundColor Green
Write-Host ""
Write-Host "5. 點擊 'Create User'" -ForegroundColor White
Write-Host ""
Write-Host "6. 建立成功後，執行以下 SQL 設定為管理員:" -ForegroundColor White
Write-Host ""
Write-Host "   進入 SQL Editor，執行:" -ForegroundColor White
Write-Host "   " -NoNewline
Write-Host "UPDATE profiles SET role = 'admin' WHERE id = (SELECT id FROM auth.users WHERE email = '$adminEmail');" -ForegroundColor Cyan
Write-Host ""
Write-Host "---" -ForegroundColor Gray
Write-Host ""
Write-Host "方法 2: 使用 psql 直接執行（進階）" -ForegroundColor Yellow
Write-Host ""
Write-Host "psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f scripts/create-admin-user.sql" -ForegroundColor Cyan
Write-Host "密碼: postgres" -ForegroundColor Gray
Write-Host ""
Write-Host "---" -ForegroundColor Gray
Write-Host ""
Write-Host "完成後，您可以使用以下帳號登入後台:" -ForegroundColor Green
Write-Host "  Email: $adminEmail" -ForegroundColor White
Write-Host "  Password: $adminPassword" -ForegroundColor White
Write-Host "  URL: http://localhost:3000/admin/login" -ForegroundColor Cyan
Write-Host ""
