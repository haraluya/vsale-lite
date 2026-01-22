# 站點二資料匯入腳本
# 使用 PostgreSQL Docker 容器執行 psql

$DB_HOST = "db.rdyvmgomjdglflrcfijs.supabase.co"
$DB_PORT = "5432"
$DB_NAME = "postgres"
$DB_USER = "postgres"
$DB_PASSWORD = $env:DB_PASSWORD_SITE2
$SQL_FILE = "backup\full-migration-20260122-145653\main-site-data.sql"

# 檢查環境變數
if (-not $DB_PASSWORD) {
    Write-Host "❌ 錯誤：請設定環境變數 DB_PASSWORD_SITE2"
    Write-Host ""
    Write-Host "設定方式："
    Write-Host "  方法 1: 在 PowerShell 中執行"
    Write-Host "    `$env:DB_PASSWORD_SITE2 = 'your_password_here'"
    Write-Host ""
    Write-Host "  方法 2: 在 .env.local 中新增（需使用 dotenv 工具）"
    Write-Host "    DB_PASSWORD_SITE2=your_password_here"
    Write-Host ""
    exit 1
}

Write-Host "==================================="
Write-Host "站點二資料匯入工具"
Write-Host "==================================="
Write-Host ""
Write-Host "目標資料庫: $DB_HOST"
Write-Host "SQL 檔案: $SQL_FILE"
Write-Host ""
Write-Host "正在執行匯入..."
Write-Host ""

# 使用 Docker 執行 psql
$env:PGPASSWORD = $DB_PASSWORD

# 嘗試使用 IPv4
$dockerCommand = @"
docker run --rm `
  -v "${PWD}/backup/full-migration-20260122-145653:/backup:ro" `
  -e PGPASSWORD="$DB_PASSWORD" `
  postgres:17 `
  psql -h host.docker.internal -p $DB_PORT -d $DB_NAME -U $DB_USER `
  -f /backup/main-site-data.sql
"@

Write-Host "執行指令:"
Write-Host $dockerCommand
Write-Host ""

Invoke-Expression $dockerCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==================================="
    Write-Host "✅ 匯入成功！"
    Write-Host "==================================="
} else {
    Write-Host ""
    Write-Host "==================================="
    Write-Host "❌ 匯入失敗，錯誤碼: $LASTEXITCODE"
    Write-Host "==================================="
    Write-Host ""
    Write-Host "常見問題排除:"
    Write-Host "1. 確認 Docker 正在執行"
    Write-Host "2. 確認資料庫連線資訊正確"
    Write-Host "3. 確認已先匯入 Schema (main-site-full-backup.sql)"
    Write-Host "4. 嘗試使用 Supabase Dashboard 手動匯入"
}

# 清除環境變數
Remove-Item Env:\PGPASSWORD
