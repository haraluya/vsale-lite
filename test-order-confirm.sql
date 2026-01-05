-- 測試訂單確認功能
-- 檢查是否有權限問題

-- 1. 檢查 Function 是否存在
SELECT proname, proacl
FROM pg_proc
WHERE proname = 'confirm_order_and_deduct_stock';

-- 2. 檢查 authenticated 角色是否有權限
SELECT
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'confirm_order_and_deduct_stock';

-- 3. 列出所有訂單
SELECT id, order_number, status, user_id, total_amount, created_at
FROM orders
ORDER BY created_at DESC
LIMIT 5;

-- 4. 檢查 order_timelines
SELECT
    ot.id,
    ot.order_id,
    o.order_number,
    ot.action_type,
    ot.old_status,
    ot.new_status,
    ot.created_at
FROM order_timelines ot
JOIN orders o ON o.id = ot.order_id
ORDER BY ot.created_at DESC
LIMIT 10;
