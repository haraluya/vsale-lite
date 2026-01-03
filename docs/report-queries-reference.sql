-- ================================================================
-- Vsale-lite 訂單報表查詢範例庫
-- ================================================================
-- 用途：提供可直接在 Supabase Studio SQL Editor 中執行的查詢
-- 檔案位置：docs/report-queries-reference.sql
-- 最後更新：2026-01-03
-- ================================================================

-- ================================================================
-- 第 1 部分：基礎查詢 (< 50ms)
-- ================================================================

-- 查詢 1.1：最近 7 天訂單列表（客戶端）
-- 預期時間：20-30ms
-- 使用索引：idx_orders_created_at
SELECT
  o.id,
  o.order_number,
  o.total_amount,
  o.status,
  o.created_at AT TIME ZONE 'Asia/Taipei' AS tw_created_at,
  o.updated_at AT TIME ZONE 'Asia/Taipei' AS tw_updated_at
FROM orders o
WHERE o.created_at >= NOW() - INTERVAL '7 days'
  AND o.user_id = '00000000-0000-0000-0000-000000000000'  -- 替換為實際 user_id
ORDER BY o.created_at DESC
LIMIT 20;

-- 查詢 1.2：最近 30 天訂單統計（簡單版）
-- 預期時間：30-50ms
-- 使用索引：idx_orders_created_at
SELECT
  COUNT(*) AS total_orders,
  SUM(o.total_amount) AS total_revenue,
  AVG(o.total_amount) AS avg_order_value,
  MIN(o.total_amount) AS min_order_value,
  MAX(o.total_amount) AS max_order_value
FROM orders o
WHERE o.created_at >= NOW() - INTERVAL '30 days';

-- 查詢 1.3：訂單狀態分布（最近 30 天）
-- 預期時間：40-60ms
-- 使用索引：idx_orders_status_created_at (待新增)
SELECT
  o.status,
  COUNT(*) AS order_count,
  SUM(o.total_amount) AS status_revenue,
  ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM orders WHERE created_at >= NOW() - INTERVAL '30 days') * 100, 2) AS percentage
FROM orders o
WHERE o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY o.status
ORDER BY order_count DESC;

-- ================================================================
-- 第 2 部分：日報表查詢 (< 100ms)
-- ================================================================

-- 查詢 2.1：特定日期訂單統計
-- 預期時間：50-80ms
-- 用途：日報表首頁
-- 參數：替換 '2026-01-03' 為目標日期
SELECT
  COUNT(*) AS order_count,
  SUM(o.total_amount) AS daily_revenue,
  AVG(o.total_amount) AS avg_order_value,
  COUNT(DISTINCT o.user_id) AS unique_customers,
  MIN(o.created_at) AS first_order_at,
  MAX(o.created_at) AS last_order_at
FROM orders o
WHERE o.created_at >= '2026-01-03'::timestamp AT TIME ZONE 'Asia/Taipei'
  AND o.created_at < ('2026-01-03'::timestamp + INTERVAL '1 day') AT TIME ZONE 'Asia/Taipei';

-- 查詢 2.2：每日訂單明細（含客戶資訊）
-- 預期時間：80-120ms
-- 用途：日報表詳細訂單列表
SELECT
  o.id,
  o.order_number,
  p.display_name,
  p.phone,
  t.name AS tier_name,
  o.total_amount,
  o.status,
  COUNT(oi.id) AS item_count,
  o.created_at AT TIME ZONE 'Asia/Taipei' AS tw_created_at
FROM orders o
LEFT JOIN profiles p ON o.user_id = p.id
LEFT JOIN tiers t ON p.tier_id = t.id
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.created_at >= '2026-01-03'::timestamp AT TIME ZONE 'Asia/Taipei'
  AND o.created_at < ('2026-01-03'::timestamp + INTERVAL '1 day') AT TIME ZONE 'Asia/Taipei'
GROUP BY o.id, p.id, p.display_name, p.phone, t.name
ORDER BY o.created_at DESC;

-- ================================================================
-- 第 3 部分：週報表查詢 (< 150ms)
-- ================================================================

-- 查詢 3.1：過去 12 週每週營收趨勢
-- 預期時間：100-150ms
-- 用途：週報表營收圖表
SELECT
  (date_trunc('week', o.created_at AT TIME ZONE 'Asia/Taipei'))::date AS week_start,
  ((date_trunc('week', o.created_at AT TIME ZONE 'Asia/Taipei'))::date + INTERVAL '6 days')::date AS week_end,
  COUNT(*) AS order_count,
  SUM(o.total_amount) AS weekly_revenue,
  AVG(o.total_amount) AS avg_order_value,
  COUNT(DISTINCT o.user_id) AS unique_customers,
  ROUND(
    COUNT(CASE WHEN o.status = 'completed' THEN 1 END)::NUMERIC
    / NULLIF(COUNT(*), 0) * 100, 2
  ) AS completion_rate,
  COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END) AS cancelled_count
FROM orders o
WHERE o.created_at >= NOW() - INTERVAL '12 weeks'
GROUP BY
  date_trunc('week', o.created_at AT TIME ZONE 'Asia/Taipei'),
  (date_trunc('week', o.created_at AT TIME ZONE 'Asia/Taipei'))::date + INTERVAL '6 days'
ORDER BY week_start DESC;

-- 查詢 3.2：每週按狀態分布
-- 預期時間：120-150ms
-- 用途：了解每週的訂單狀態變化
SELECT
  (date_trunc('week', o.created_at AT TIME ZONE 'Asia/Taipei'))::date AS week_start,
  o.status,
  COUNT(*) AS count,
  SUM(o.total_amount) AS revenue
FROM orders o
WHERE o.created_at >= NOW() - INTERVAL '12 weeks'
GROUP BY
  date_trunc('week', o.created_at AT TIME ZONE 'Asia/Taipei'),
  o.status
ORDER BY week_start DESC, o.status;

-- ================================================================
-- 第 4 部分：月報表查詢 (< 200ms)
-- ================================================================

-- 查詢 4.1：過去 12 個月每月營收趨勢
-- 預期時間：150-200ms
-- 用途：月報表營收圖表與 YoY 對比
SELECT
  date_trunc('month', o.created_at AT TIME ZONE 'Asia/Taipei')::date AS month_start,
  COUNT(*) AS order_count,
  SUM(o.total_amount) AS monthly_revenue,
  AVG(o.total_amount) AS avg_order_value,
  COUNT(DISTINCT o.user_id) AS unique_customers,
  ROUND(
    COUNT(CASE WHEN o.status = 'completed' THEN 1 END)::NUMERIC
    / NULLIF(COUNT(*), 0) * 100, 2
  ) AS completion_rate,
  -- 與去年同月對比
  ROUND(
    (SUM(o.total_amount)::NUMERIC -
    (SELECT SUM(total_amount) FROM orders
     WHERE date_trunc('month', created_at AT TIME ZONE 'Asia/Taipei') = date_trunc('month', (o.created_at - INTERVAL '12 months') AT TIME ZONE 'Asia/Taipei')))
    / NULLIF(
      (SELECT SUM(total_amount) FROM orders
       WHERE date_trunc('month', created_at AT TIME ZONE 'Asia/Taipei') = date_trunc('month', (o.created_at - INTERVAL '12 months') AT TIME ZONE 'Asia/Taipei')), 0)
    * 100, 2
  ) AS yoy_growth_percent
FROM orders o
WHERE o.created_at >= NOW() - INTERVAL '12 months'
GROUP BY date_trunc('month', o.created_at AT TIME ZONE 'Asia/Taipei')
ORDER BY month_start DESC;

-- 查詢 4.2：當月對比去年同月
-- 預期時間：180-200ms
-- 用途：詳細的月對月對比
WITH current_month AS (
  SELECT
    EXTRACT(MONTH FROM NOW()) AS current_month,
    EXTRACT(YEAR FROM NOW()) AS current_year
),
current_month_data AS (
  SELECT
    COUNT(*) AS order_count,
    SUM(o.total_amount) AS total_revenue,
    AVG(o.total_amount) AS avg_order_value,
    COUNT(DISTINCT o.user_id) AS unique_customers
  FROM orders o, current_month
  WHERE EXTRACT(MONTH FROM o.created_at AT TIME ZONE 'Asia/Taipei') = current_month.current_month
    AND EXTRACT(YEAR FROM o.created_at AT TIME ZONE 'Asia/Taipei') = current_month.current_year
),
last_year_same_month AS (
  SELECT
    COUNT(*) AS order_count,
    SUM(o.total_amount) AS total_revenue,
    AVG(o.total_amount) AS avg_order_value,
    COUNT(DISTINCT o.user_id) AS unique_customers
  FROM orders o, current_month
  WHERE EXTRACT(MONTH FROM o.created_at AT TIME ZONE 'Asia/Taipei') = current_month.current_month
    AND EXTRACT(YEAR FROM o.created_at AT TIME ZONE 'Asia/Taipei') = current_month.current_year - 1
)
SELECT
  'Current Month' AS period,
  cm.order_count,
  cm.total_revenue,
  cm.avg_order_value,
  cm.unique_customers
FROM current_month_data cm
UNION ALL
SELECT
  'Last Year Same Month' AS period,
  lm.order_count,
  lm.total_revenue,
  lm.avg_order_value,
  lm.unique_customers
FROM last_year_same_month lm;

-- ================================================================
-- 第 5 部分：客戶分層分析 (< 200ms)
-- ================================================================

-- 查詢 5.1：按等級分層的收入分析（最近 30 天）
-- 預期時間：150-200ms
-- 用途：了解不同等級客戶的貢獻度
SELECT
  COALESCE(t.name, '未設定') AS tier_name,
  COUNT(DISTINCT o.user_id) AS customer_count,
  COUNT(o.id) AS order_count,
  SUM(o.total_amount) AS total_revenue,
  ROUND(AVG(o.total_amount), 2) AS avg_order_value,
  ROUND(
    SUM(o.total_amount)::NUMERIC
    / (SELECT SUM(total_amount) FROM orders WHERE created_at >= NOW() - INTERVAL '30 days')
    * 100, 2
  ) AS revenue_percentage,
  MAX(o.created_at) AS last_order_date
FROM orders o
LEFT JOIN profiles p ON o.user_id = p.id
LEFT JOIN tiers t ON p.tier_id = t.id
WHERE o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY t.id, t.name
ORDER BY total_revenue DESC;

-- 查詢 5.2：高價值客戶識別（最近 30 天）
-- 預期時間：100-150ms
-- 用途：識別需要重點維護的客戶
SELECT
  p.id,
  p.display_name,
  p.phone,
  t.name AS tier_name,
  COUNT(o.id) AS order_count,
  SUM(o.total_amount) AS total_spent,
  ROUND(AVG(o.total_amount), 2) AS avg_order_value,
  ROUND(SUM(o.total_amount) / COUNT(o.id) / 30 * 30, 2) AS avg_monthly_spending,
  MAX(o.created_at) AT TIME ZONE 'Asia/Taipei' AS last_order_date
FROM orders o
JOIN profiles p ON o.user_id = p.id
LEFT JOIN tiers t ON p.tier_id = t.id
WHERE o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY p.id, p.display_name, p.phone, t.id, t.name
HAVING SUM(o.total_amount) > 5000  -- 30 天消費超過 5000 的客戶
ORDER BY total_spent DESC;

-- ================================================================
-- 第 6 部分：庫存與訂單相關分析 (< 250ms)
-- ================================================================

-- 查詢 6.1：熱銷商品排行（最近 30 天）
-- 預期時間：150-200ms
-- 用途：識別高銷售商品
SELECT
  p.code,
  p.name,
  s.name AS series_name,
  COUNT(oi.id) AS order_count,
  SUM(oi.quantity) AS total_quantity,
  SUM(oi.subtotal) AS total_revenue,
  ROUND(AVG(oi.deal_price), 2) AS avg_deal_price,
  pr.stock AS current_stock
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN products p ON oi.product_id = p.id
LEFT JOIN series s ON p.series_id = s.id
LEFT JOIN products pr ON oi.product_id = pr.id
WHERE o.created_at >= NOW() - INTERVAL '30 days'
  AND o.status IN ('confirmed', 'shipping', 'completed')
GROUP BY p.id, p.code, p.name, s.name, pr.stock
ORDER BY total_quantity DESC
LIMIT 20;

-- 查詢 6.2：低庫存預警（結合訂單趨勢）
-- 預期時間：180-220ms
-- 用途：識別可能缺貨的商品
WITH sales_velocity AS (
  SELECT
    p.id,
    p.name,
    SUM(oi.quantity) / 30.0 AS daily_sales_avg
  FROM order_items oi
  JOIN orders o ON oi.order_id = o.id
  JOIN products p ON oi.product_id = p.id
  WHERE o.created_at >= NOW() - INTERVAL '30 days'
    AND o.status IN ('confirmed', 'shipping', 'completed')
  GROUP BY p.id, p.name
)
SELECT
  p.code,
  p.name,
  p.stock AS current_stock,
  COALESCE(sv.daily_sales_avg, 0) AS daily_sales_avg,
  CASE
    WHEN p.stock <= 0 THEN '缺貨'
    WHEN p.stock > 0 AND p.stock < COALESCE(sv.daily_sales_avg * 7, 0) THEN '低庫存'
    ELSE '充足'
  END AS stock_status,
  ROUND(p.stock / NULLIF(sv.daily_sales_avg, 0), 1) AS days_of_inventory
FROM products p
LEFT JOIN sales_velocity sv ON p.id = sv.id
WHERE p.status = 'active'
ORDER BY stock_status, p.stock ASC;

-- ================================================================
-- 第 7 部分：時間序列與趨勢分析 (< 300ms)
-- ================================================================

-- 查詢 7.1：每日訂單數與收入趨勢（過去 90 天）
-- 預期時間：200-250ms
-- 用途：長期趨勢分析
SELECT
  (o.created_at AT TIME ZONE 'Asia/Taipei')::date AS order_date,
  COUNT(*) AS order_count,
  SUM(o.total_amount) AS daily_revenue,
  ROUND(AVG(o.total_amount), 2) AS avg_order_value,
  COUNT(DISTINCT o.user_id) AS unique_customers,
  -- 7 日移動平均
  ROUND(
    AVG(COUNT(*)) OVER (
      ORDER BY (o.created_at AT TIME ZONE 'Asia/Taipei')::date
      ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ), 2
  ) AS moving_avg_orders,
  -- 對比昨日
  ROUND(
    (SUM(o.total_amount) - LAG(SUM(o.total_amount)) OVER (ORDER BY (o.created_at AT TIME ZONE 'Asia/Taipei')::date))
    / NULLIF(LAG(SUM(o.total_amount)) OVER (ORDER BY (o.created_at AT TIME ZONE 'Asia/Taipei')::date), 0)
    * 100, 2
  ) AS wow_growth_percent
FROM orders o
WHERE o.created_at >= NOW() - INTERVAL '90 days'
GROUP BY (o.created_at AT TIME ZONE 'Asia/Taipei')::date
ORDER BY order_date DESC;

-- 查詢 7.2：轉換漏斗分析（訂單狀態轉化）
-- 預期時間：250-300ms
-- 用途：分析訂單處理流程效率
WITH status_stages AS (
  SELECT
    'pending' AS stage,
    COUNT(DISTINCT o.id) AS stage_count,
    COUNT(DISTINCT o.id)::NUMERIC / (SELECT COUNT(*) FROM orders WHERE created_at >= NOW() - INTERVAL '30 days') * 100 AS conversion_rate
  FROM orders o
  WHERE o.created_at >= NOW() - INTERVAL '30 days'
  UNION ALL
  SELECT
    'confirmed' AS stage,
    COUNT(DISTINCT o.id),
    COUNT(DISTINCT o.id)::NUMERIC / (SELECT COUNT(*) FROM orders WHERE created_at >= NOW() - INTERVAL '30 days' AND status IN ('confirmed', 'shipping', 'completed')) * 100
  FROM orders o
  WHERE o.created_at >= NOW() - INTERVAL '30 days'
    AND o.status IN ('confirmed', 'shipping', 'completed')
  UNION ALL
  SELECT
    'completed' AS stage,
    COUNT(DISTINCT o.id),
    COUNT(DISTINCT o.id)::NUMERIC / (SELECT COUNT(*) FROM orders WHERE created_at >= NOW() - INTERVAL '30 days' AND status = 'completed') * 100
  FROM orders o
  WHERE o.created_at >= NOW() - INTERVAL '30 days'
    AND o.status = 'completed'
)
SELECT * FROM status_stages
ORDER BY stage;

-- ================================================================
-- 第 8 部分：效能測試查詢
-- ================================================================

-- 效能測試 8.1：執行計畫檢查
-- 用途：驗證查詢是否使用索引
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT *
FROM orders
WHERE user_id = '00000000-0000-0000-0000-000000000000'
  AND created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC
LIMIT 20;

-- 效能測試 8.2：索引使用率監控
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE tablename = 'orders'
ORDER BY idx_scan DESC;

-- 效能測試 8.3：查詢時間統計
-- 注意：在 psql 中使用 \timing 開啟時間記錄
-- \timing on
-- 然後執行上述查詢，psql 會自動顯示執行時間

-- ================================================================
-- 使用指南
-- ================================================================

/*
1. 複製需要的查詢到 Supabase Studio SQL Editor
2. 修改以下參數：
   - 日期：替換 '2026-01-03' 為目標日期
   - 用戶 ID：替換 '00000000-0000-0000-0000-000000000000'
   - INTERVAL：調整查詢範圍（'7 days', '30 days', '12 months'）
3. 執行查詢
4. 觀察執行計畫是否使用索引（預期：Index Scan）

預期效能：
- 基礎查詢 (< 50ms): 單表 WHERE 篩選
- 日報表 (50-100ms): 單日日期範圍 + 簡單 JOIN
- 週報表 (100-150ms): date_trunc 分組 + 統計計算
- 月報表 (150-200ms): 12 個月趨勢 + YoY 對比
- 分析查詢 (200-300ms): 複雜 JOIN + 窗口函數
*/

-- ================================================================
-- 快速參考：常用時間單位
-- ================================================================

/*
NOW() - INTERVAL '1 day'      # 1 天前
NOW() - INTERVAL '7 days'     # 7 天前 (週)
NOW() - INTERVAL '30 days'    # 30 天前 (月)
NOW() - INTERVAL '90 days'    # 90 天前 (季度)
NOW() - INTERVAL '365 days'   # 365 天前 (年)
NOW() - INTERVAL '1 month'    # 1 個月前
NOW() - INTERVAL '3 months'   # 3 個月前 (季度)
NOW() - INTERVAL '12 months'  # 12 個月前 (年)

date_trunc('day', ...)        # 按日期截斷
date_trunc('week', ...)       # 按週截斷 (週一為起點)
date_trunc('month', ...)      # 按月截斷 (月初)
date_trunc('year', ...)       # 按年截斷 (年初)

AT TIME ZONE 'Asia/Taipei'    # 轉換為台灣時區 (UTC+8)
*/
