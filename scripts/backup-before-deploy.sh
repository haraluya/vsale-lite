#!/bin/bash
# 自動備份生產資料庫（部署前執行）
# 用途: 在執行 supabase db push 前，先備份雲端資料庫

set -e  # 任何錯誤立即停止

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 環境變數檢查
if [ -z "$SUPABASE_DB_URL" ]; then
  echo -e "${RED}❌ 錯誤: 未設定 SUPABASE_DB_URL 環境變數${NC}"
  echo "請在 .env.production 中設定資料庫連線 URL"
  exit 1
fi

# 建立備份目錄
BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"

# 生成備份檔名（時間戳）
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/production_${TIMESTAMP}.sql"

echo -e "${YELLOW}🔄 開始備份生產資料庫...${NC}"
echo "備份檔案: $BACKUP_FILE"

# 執行備份（使用 pg_dump）
pg_dump "$SUPABASE_DB_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  > "$BACKUP_FILE"

# 檢查備份是否成功
if [ $? -eq 0 ]; then
  FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo -e "${GREEN}✅ 備份成功！${NC}"
  echo "📊 檔案大小: $FILE_SIZE"
  echo "📁 路徑: $BACKUP_FILE"

  # 詢問是否繼續部署
  echo ""
  echo -e "${YELLOW}是否繼續部署 Migration 到生產環境？${NC}"
  read -p "請輸入 (y/n): " -n 1 -r
  echo

  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}🚀 執行部署...${NC}"
    supabase db push

    if [ $? -eq 0 ]; then
      echo -e "${GREEN}✅ Migration 部署成功！${NC}"
      echo "備份檔案已保留: $BACKUP_FILE"
    else
      echo -e "${RED}❌ Migration 部署失敗！${NC}"
      echo "備份檔案位置: $BACKUP_FILE"
      echo "如需回滾，請執行: psql \$SUPABASE_DB_URL < $BACKUP_FILE"
      exit 1
    fi
  else
    echo -e "${YELLOW}⏸️ 已取消部署${NC}"
    echo "備份檔案已保留: $BACKUP_FILE"
    exit 0
  fi
else
  echo -e "${RED}❌ 備份失敗！停止部署。${NC}"
  echo "請檢查資料庫連線 URL 是否正確"
  exit 1
fi
