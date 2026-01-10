-- 檢查 BINGA 系列是否存在
SELECT id, code, name, status, created_at
FROM series
WHERE code = 'BINGA' OR name LIKE '%Binga%' OR name LIKE '%binga%';

-- 檢查所有系列代碼
SELECT code, name, status
FROM series
ORDER BY created_at DESC
LIMIT 10;
