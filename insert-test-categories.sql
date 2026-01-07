-- 手動插入測試分類資料
INSERT INTO categories (name, code, sort_order, status) VALUES
    ('飲料', 'DRK', 1, 'active'),
    ('零食', 'SNK', 2, 'active'),
    ('日用品', 'DAI', 3, 'active')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order,
    status = EXCLUDED.status;

-- 查詢結果
SELECT id, name, code, sort_order, status, created_at FROM categories ORDER BY sort_order;
