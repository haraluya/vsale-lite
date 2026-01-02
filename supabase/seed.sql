-- ================================================
-- Seed 資料：Feature 003 基礎測試資料
-- ================================================

-- 建立測試分類
INSERT INTO categories (name, code, sort_order) VALUES
    ('飲料', 'DRK', 1),
    ('零食', 'SNK', 2),
    ('日用品', 'DAI', 3)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- 建立測試會員等級
INSERT INTO tiers (name, rank) VALUES
    ('批發', 1),
    ('零售', 2),
    ('經銷商', 3)
ON CONFLICT (name) DO UPDATE SET rank = EXCLUDED.rank;
