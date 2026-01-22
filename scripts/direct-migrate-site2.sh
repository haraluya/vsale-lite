#!/bin/bash
# 直接從主站匯出並匯入到站點二的腳本
# 使用 Supabase CLI 和資料庫連線資訊

set -e  # 錯誤時停止

echo "========================================="
echo "Vsale 主站 → 站點二完整遷移"
echo "========================================="

# 站點二資料庫連線資訊
SITE2_PROJECT_ID="rdyvmgomjdglflrcfijs"
SITE2_DB_PASSWORD="Devape-BM69"
BACKUP_FILE="backup/full-migration-20260122-145653/main-site-full-backup.sql"

echo ""
echo "[1/3] 檢查備份檔案..."
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ 找不到備份檔案: $BACKUP_FILE"
    exit 1
fi

FILE_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
LINE_COUNT=$(wc -l < "$BACKUP_FILE")
echo "✅ 備份檔案: $BACKUP_FILE"
echo "   大小: $FILE_SIZE"
echo "   行數: $LINE_COUNT"

echo ""
echo "[2/3] 連結站點二 Supabase 專案..."
# 使用 project-ref 和 --password 參數
supabase link --project-ref "$SITE2_PROJECT_ID" --password "$SITE2_DB_PASSWORD" || {
    echo "⚠️  無法自動連結，請手動確認 Supabase CLI 已登入"
    echo "   執行: supabase login"
}

echo ""
echo "[3/3] 執行資料庫匯入..."
echo "⚠️  此操作會覆蓋站點二的資料庫（包含所有資料）"
read -p "是否繼續? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "已取消遷移"
    exit 0
fi

# 使用 supabase db push 執行 SQL 檔案
# 注意：這會執行檔案中的所有 SQL 語句
echo "正在執行 SQL 匯入..."
supabase db push --linked --file "$BACKUP_FILE" || {
    echo ""
    echo "❌ 自動匯入失敗"
    echo ""
    echo "請使用以下手動方式匯入："
    echo ""
    echo "方法 1: 使用 Supabase Dashboard"
    echo "  1. 前往 https://supabase.com/dashboard/project/$SITE2_PROJECT_ID"
    echo "  2. Database → SQL Editor"
    echo "  3. 貼上 $BACKUP_FILE 的內容並執行"
    echo ""
    echo "方法 2: 使用 psql（需要安裝 PostgreSQL 客戶端）"
    echo "  PGPASSWORD='$SITE2_DB_PASSWORD' psql \\"
    echo "    -h db.$SITE2_PROJECT_ID.supabase.co \\"
    echo "    -p 5432 \\"
    echo "    -U postgres.$SITE2_PROJECT_ID \\"
    echo "    -d postgres \\"
    echo "    -f $BACKUP_FILE"
    exit 1
}

echo ""
echo "========================================="
echo "✅ 遷移完成！"
echo "========================================="
echo ""
echo "下一步："
echo "1. 驗證站點二資料: https://supabase.com/dashboard/project/$SITE2_PROJECT_ID"
echo "2. 遷移 Storage 圖片（參考文件）"
echo "3. 測試站點二網站: https://vsale-site2.vercel.app"
