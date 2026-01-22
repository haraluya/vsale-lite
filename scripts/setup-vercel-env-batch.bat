@echo off
chcp 65001 >nul
echo ============================================
echo Vercel 環境變數批次設定工具
echo ============================================
echo.

REM 讀取 .env.local 並設定環境變數
set "ENV_FILE=.env.local"

if not exist "%ENV_FILE%" (
    echo ❌ 錯誤：找不到 .env.local 檔案
    exit /b 1
)

echo ✅ 找到 .env.local 檔案
echo.

REM 解析並設定環境變數
echo 正在設定 Supabase 環境變數...
echo.

REM NEXT_PUBLIC_SUPABASE_URL
echo https://qwovavytryvgchcowjof.supabase.co | vercel env add NEXT_PUBLIC_SUPABASE_URL production
echo https://qwovavytryvgchcowjof.supabase.co | vercel env add NEXT_PUBLIC_SUPABASE_URL preview
echo https://qwovavytryvgchcowjof.supabase.co | vercel env add NEXT_PUBLIC_SUPABASE_URL development
echo ✅ NEXT_PUBLIC_SUPABASE_URL 設定完成
echo.

REM NEXT_PUBLIC_SUPABASE_ANON_KEY
echo eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3b3Zhdnl0cnl2Z2NoY293am9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyODE1NzQsImV4cCI6MjA4Mjg1NzU3NH0.YEwJNjDv5HJgj-GMN_IdisI6dU13aHA6ruaZCXUpZLA | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
echo eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3b3Zhdnl0cnl2Z2NoY293am9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyODE1NzQsImV4cCI6MjA4Mjg1NzU3NH0.YEwJNjDv5HJgj-GMN_IdisI6dU13aHA6ruaZCXUpZLA | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
echo eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3b3Zhdnl0cnl2Z2NoY293am9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyODE1NzQsImV4cCI6MjA4Mjg1NzU3NH0.YEwJNjDv5HJgj-GMN_IdisI6dU13aHA6ruaZCXUpZLA | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY development
echo ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY 設定完成
echo.

REM SUPABASE_SERVICE_ROLE_KEY
echo eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3b3Zhdnl0cnl2Z2NoY293am9mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzI4MTU3NCwiZXhwIjoyMDgyODU3NTc0fQ.zcyKpbeqPJ-RxM4mkkU5zPdzv0YrD0s0iOOcXqGIEdA | vercel env add SUPABASE_SERVICE_ROLE_KEY production
echo eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3b3Zhdnl0cnl2Z2NoY293am9mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzI4MTU3NCwiZXhwIjoyMDgyODU3NTc0fQ.zcyKpbeqPJ-RxM4mkkU5zPdzv0YrD0s0iOOcXqGIEdA | vercel env add SUPABASE_SERVICE_ROLE_KEY preview
echo eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3b3Zhdnl0cnl2Z2NoY293am9mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzI4MTU3NCwiZXhwIjoyMDgyODU3NTc0fQ.zcyKpbeqPJ-RxM4mkkU5zPdzv0YrD0s0iOOcXqGIEdA | vercel env add SUPABASE_SERVICE_ROLE_KEY development
echo ✅ SUPABASE_SERVICE_ROLE_KEY 設定完成
echo.

echo 正在設定 GCS 環境變數...
echo.

REM GCS_PROJECT_ID
echo vsale-backup | vercel env add GCS_PROJECT_ID production
echo vsale-backup | vercel env add GCS_PROJECT_ID preview
echo vsale-backup | vercel env add GCS_PROJECT_ID development
echo ✅ GCS_PROJECT_ID 設定完成
echo.

REM GCS_BUCKET_NAME
echo vsale-backups-haraluya | vercel env add GCS_BUCKET_NAME production
echo vsale-backups-haraluya | vercel env add GCS_BUCKET_NAME preview
echo vsale-backups-haraluya | vercel env add GCS_BUCKET_NAME development
echo ✅ GCS_BUCKET_NAME 設定完成
echo.

REM GCS_SERVICE_ACCOUNT_KEY（JSON 字串，需要特殊處理）
echo 正在設定 GCS_SERVICE_ACCOUNT_KEY...
echo 注意：這是一個 JSON 字串，將直接設定
echo.

REM 儲存 JSON 到暫存檔案
set "TEMP_JSON=%TEMP%\gcs_key.json"
echo {"type":"service_account","project_id":"vsale-backup","private_key_id":"a9b4da6ed5abd3f9bfbe3aa1da0eb6adb7f2e877","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCmWdb5LeMX6Kyr\nS55HV5adlpeTMV+NAb20djztLNOHBeuZOTncJIEgna3pGbVqK0TCQVOalmKVFvLM\nsMcRugevppw6LwDhTeaTi3UXefWNWIaLHdghtE4nMe6mlUCrTh0V5QKOLqe83uIl\nmV0MX2NYvk2f311GFun/rbT2tb70RzSfNeBYtIhMuFkZRwSx5J5+Fhhw8c0s+23c\nT1WBy+JK53nXNILGNzqM5wXmYU/8FyzbQIs3SfNDtuFYacG54/4dP9fx+2DhTS4s\n2Fkctm3Bcxxg8kfeEgZSS75zffEvhPKK1BZqv2JIwq6PlOgFsVlyMW1nlD4eBlDH\nfrlmipyzAgMBAAECggEACBboWFe96mS7ON1FhiyhO2qeVl8ZSW8jPYpebh427yL/\nkQTyZl00FlT0pxhD9TTDdDrfCO51PtDN39xc4eTNCOKuSDoO7eXu54/pksmwgj4i\n1NMPtpvhDRDljR5G9c2npm/rjuR/7bRdBP0PRFHDMAaZGcQv8f+dQ3y8Bx9ReOmF\nb1zVV82oGEArGwl4qEdlTKlKO4Y3ztQUuMKcD4B2dyyz0UDC/EODEh3mHsiXayo9\nkfHfXY43zaHHLSo+bKAWBENpGGpHgDaxNR+vzbvlf6J4sDLNpZEicj61Ys/Ztr/e\noebQcMYrN7C4sHfMzZG31nOxOg9NzydqM0csvQg3+QKBgQDbAsOuKudh4uIHczSp\nMcpI9TTxuI2kPr7xd1MyUjkzl7hgDFH0hVJM+TbIbyDQf3YZSW7B40i902YPhXGj\nwVWmR7VtY33Rq4id4MoY1IUaSd7wPzDWJ9GuEOZwzEOPA9w3Jj602HBABFA5WsLk\nCnh20c9E+WA3aWA3/OY+TmNlXwKBgQDCckDRp+W889ERsUVjoigvIlX0Sk7Ywt51\nvXpYMTfBcfINqrU7g+1BToeoAQjlXDRqjFJdLK2j+tT4yXT6J+hWXDav+PkbqUL2\npcnmM9Bafj+QFZY9tgcmvnOM/SiCQLzxjRzIqcu4fSmSRO05cvJoCOz81UyyaBRv\nzzl0Ft8VLQKBgQDIrKXEJsfQp2VYUjWEenzRkOysN+CBCIVJF38B8tk67uAgEene\nVXLt2MRbr4evw7rgvKphufJjDRrNSgawd2wVaktRKgKVZclOcDR9v+0eA2XlWOFU\nuTOlfRLJdEDLAEx9s+ttJYzk+47Ont1Iulda+DAlESMaYtGpO29007q7nQKBgAJF\nDSalXBQpkG4xcIrqMKfkMbapS2RSWgBr1srCwFDcwKOSM41fS9ywSvsWEAGFYwM/\nYhK+W8SHQAcratckshyX9Pd244mEH0j7xHCQeEUmJh3LcraDsm+sV3L03Y0vrkTv\njb914+/iXiLb9Rzvj47RU9rbroqCloJ7m8MUJUR9AoGAGUC1rH2gRRnNVtPlDmpm\nuQnqJ+SFK1IYO3rrfISNqY6Xwkoj2utoBXtBIQzO1ulArWkmeCmFX3yozV40GDKb\n9KqIIYw7eLXexy4vmCWXzJKXu55PEYkcXDHolBBtJ2+3gSmbe42W/Y39q/xl8ulH\nLXhRMMK8RPDH7jY1dhht7Ro=\n-----END PRIVATE KEY-----\n","client_email":"vsale-backup@vsale-backup.iam.gserviceaccount.com","client_id":"107287060192729193294","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/vsale-backup%%40vsale-backup.iam.gserviceaccount.com","universe_domain":"googleapis.com"} > "%TEMP_JSON%"

type "%TEMP_JSON%" | vercel env add GCS_SERVICE_ACCOUNT_KEY production
type "%TEMP_JSON%" | vercel env add GCS_SERVICE_ACCOUNT_KEY preview
type "%TEMP_JSON%" | vercel env add GCS_SERVICE_ACCOUNT_KEY development

del "%TEMP_JSON%"
echo ✅ GCS_SERVICE_ACCOUNT_KEY 設定完成
echo.

REM CRON_SECRET
echo l0lliBYgESFNf2fZmPEG/lEOgnlyN/x9AJ19TrKOYTM= | vercel env add CRON_SECRET production
echo l0lliBYgESFNf2fZmPEG/lEOgnlyN/x9AJ19TrKOYTM= | vercel env add CRON_SECRET preview
echo l0lliBYgESFNf2fZmPEG/lEOgnlyN/x9AJ19TrKOYTM= | vercel env add CRON_SECRET development
echo ✅ CRON_SECRET 設定完成
echo.

echo ============================================
echo 設定完成！
echo ============================================
echo.
echo 下一步：
echo 1. 前往 Vercel Dashboard 確認設定
echo    https://vercel.com/haraluyas-projects/vsale/settings/environment-variables
echo 2. 觸發重新部署
echo    vercel --prod
echo 3. 測試備份功能
echo    https://vsale-lite.vercel.app/admin/system/settings
echo.

pause
