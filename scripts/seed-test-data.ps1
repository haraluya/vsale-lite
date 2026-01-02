# ================================================
# Supabase 測試資料生成腳本
# Feature: 003-series-and-pricing
# ================================================

Write-Host "正在連接到 Supabase 並執行測試資料生成..." -ForegroundColor Cyan

# 讀取 SQL 檔案
$sqlFile = "specs/003-series-and-pricing/seed-test-data.sql"
$sqlContent = Get-Content $sqlFile -Raw

# 使用 Supabase API 執行 SQL
$env:SUPABASE_URL = "https://qwovavytryvgchcowjof.supabase.co"
$env:SUPABASE_SERVICE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

# 使用 psql 執行（需要 PostgreSQL 客戶端）
# 或者使用 Supabase Dashboard 的 SQL Editor

Write-Host "
請手動執行以下步驟：

1. 開啟 Supabase Dashboard: https://app.supabase.com
2. 進入專案 qwovavytryvgchcowjof
3. 左側選單點擊「SQL Editor」
4. 複製以下檔案內容並貼上執行：
   $sqlFile

或者使用 psql 指令：
psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -U postgres.qwovavytryvgchcowjof -d postgres -f $sqlFile
" -ForegroundColor Yellow
