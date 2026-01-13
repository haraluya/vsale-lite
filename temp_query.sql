-- 查詢所有文字區塊
SELECT 
  id, 
  name, 
  block_type, 
  config::text as config_json,
  is_active,
  created_at
FROM home_page_blocks 
WHERE block_type = 'text_block'
ORDER BY created_at DESC 
LIMIT 5;
