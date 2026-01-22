-- 檢查 logo_url 設定
SELECT
  key,
  value,
  is_public,
  value_type
FROM system_settings
WHERE key = 'logo_url';
