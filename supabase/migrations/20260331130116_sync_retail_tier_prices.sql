-- 修復零售等級 tier_prices 與 products.retail_price 不一致的問題
-- 將所有零售等級（is_protected=true）的 tier_prices.price 同步為 products.retail_price

UPDATE tier_prices tp
SET price = p.retail_price,
    updated_at = now()
FROM products p, tiers t
WHERE tp.product_id = p.id
  AND tp.tier_id = t.id
  AND t.is_protected = true
  AND tp.price != p.retail_price;
