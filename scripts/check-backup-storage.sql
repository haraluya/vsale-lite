-- 查詢備份記錄，顯示儲存位置
-- 請在 Supabase Dashboard → SQL Editor 執行此查詢

SELECT
  filename,
  storage_provider,
  storage_url,
  file_size,
  status,
  backup_type,
  TO_CHAR(created_at AT TIME ZONE 'Asia/Taipei', 'YYYY-MM-DD HH24:MI:SS') as created_time
FROM backup_jobs
ORDER BY created_at DESC
LIMIT 10;
