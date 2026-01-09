#!/bin/bash

echo "==================================================="
echo "📦 備份檔案內容分析"
echo "檔案: vsale-backup-20260109-080442.sql"
echo "==================================================="
echo ""

# 檢查每個表的資料行數
for table in \
  "auth\".\"users" \
  "auth\".\"identities" \
  "auth\".\"sessions" \
  "auth\".\"refresh_tokens" \
  "auth\".\"mfa_amr_claims" \
  "public\".\"tiers" \
  "public\".\"profiles" \
  "public\".\"categories" \
  "public\".\"series" \
  "public\".\"products" \
  "public\".\"tier_prices" \
  "public\".\"coupons" \
  "public\".\"user_coupons" \
  "public\".\"orders" \
  "public\".\"order_items" \
  "public\".\"order_coupons" \
  "public\".\"order_timelines" \
  "public\".\"audit_logs" \
  "public\".\"backup_jobs" \
  "public\".\"system_settings" \
  "storage\".\"buckets"
do
  count=$(grep -c "INSERT INTO \"$table\"" vsale-backup-20260109-080442.sql || echo "0")
  if [ "$count" -gt 0 ]; then
    echo "✅ $table: $count 個 INSERT 語句"
  fi
done
