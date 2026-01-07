-- ================================================================
-- 資料庫健康檢查 SQL
-- Feature: 012-migration-consolidation
-- Date: 2026-01-07
-- Description: 全面檢查資料庫 Schema 一致性、索引完整性、RLS 覆蓋率、函數授權
-- ================================================================

-- ================================================================
-- 檢查結果暫存表（儲存所有檢查結果）
-- ================================================================

CREATE TEMP TABLE IF NOT EXISTS health_check_results (
  check_id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,  -- Schema, Index, RLS, Function, Constraint
  check_type TEXT NOT NULL,  -- Table, Column, Index, Policy, etc.
  target_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('OK', 'WARNING', 'ERROR')),
  expected_value TEXT,
  actual_value TEXT,
  message TEXT,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PART 1: Schema 一致性檢查（表、欄位、型別、約束）
-- ================================================================

-- 1.1 檢查表數量（預期: 18 個業務表）
DO $$
DECLARE
  v_table_count INTEGER;
  v_expected INTEGER := 18;
BEGIN
  SELECT COUNT(*)
  INTO v_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    -- 排除內部表與測試表
    AND table_name NOT IN ('_prisma_migrations', 'schema_migrations');

  INSERT INTO health_check_results (category, check_type, target_name, status, expected_value, actual_value, message)
  VALUES (
    'Schema',
    'TableCount',
    'public schema tables',
    CASE WHEN v_table_count = v_expected THEN 'OK' ELSE 'WARNING' END,
    v_expected::TEXT,
    v_table_count::TEXT,
    CASE
      WHEN v_table_count = v_expected THEN '表數量符合預期'
      WHEN v_table_count > v_expected THEN '表數量超出預期，可能有測試表未清理'
      ELSE '表數量不足，可能有 Migration 未執行'
    END
  );
END $$;

-- 1.2 檢查必要表是否存在（18 個核心業務表）
DO $$
DECLARE
  v_required_tables TEXT[] := ARRAY[
    'tiers',
    'profiles',
    'categories',
    'series',
    'products',
    'tier_prices',
    'orders',
    'order_items',
    'order_timelines',
    'order_custom_fees',
    'system_settings',
    'audit_logs',
    'coupons',
    'coupon_tier_restrictions',
    'coupon_series_restrictions',
    'user_coupons',
    'order_coupons',
    'announcements'
  ];
  v_table TEXT;
  v_exists BOOLEAN;
BEGIN
  FOREACH v_table IN ARRAY v_required_tables
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = v_table
    ) INTO v_exists;

    INSERT INTO health_check_results (category, check_type, target_name, status, expected_value, actual_value, message)
    VALUES (
      'Schema',
      'TableExists',
      v_table,
      CASE WHEN v_exists THEN 'OK' ELSE 'ERROR' END,
      'true',
      v_exists::TEXT,
      CASE WHEN v_exists THEN '表存在' ELSE '表不存在，Migration 可能未執行' END
    );
  END LOOP;
END $$;

-- 1.3 檢查關鍵欄位是否存在（按表分組）
DO $$
DECLARE
  v_checks RECORD;
BEGIN
  -- 逐一檢查關鍵欄位
  FOR v_checks IN
    SELECT * FROM (VALUES
      -- tiers 表（會員等級）
      ('tiers', 'name', 'text'),
      ('tiers', 'rank', 'integer'),
      ('tiers', 'shipping_fee', 'numeric'),
      ('tiers', 'free_shipping_threshold', 'numeric'),

      -- profiles 表（使用者業務資料）
      ('profiles', 'id', 'uuid'),
      ('profiles', 'phone', 'text'),
      ('profiles', 'email', 'text'),
      ('profiles', 'role', 'text'),
      ('profiles', 'tier_id', 'uuid'),
      ('profiles', 'username', 'text'),
      ('profiles', 'display_name', 'text'),

      -- categories 表（商品分類）
      ('categories', 'code', 'character varying'),
      ('categories', 'status', 'text'),

      -- series 表（商品系列）
      ('series', 'code', 'character varying'),
      ('series', 'category_id', 'uuid'),
      ('series', 'status', 'text'),

      -- products 表（商品）
      ('products', 'code', 'character varying'),
      ('products', 'series_id', 'uuid'),
      ('products', 'retail_price', 'numeric'),
      ('products', 'stock_status', 'text'),
      ('products', 'tags', 'ARRAY'),

      -- tier_prices 表（等級價格）
      ('tier_prices', 'tier_id', 'uuid'),
      ('tier_prices', 'product_id', 'uuid'),
      ('tier_prices', 'price', 'numeric'),

      -- orders 表（訂單）
      ('orders', 'order_number', 'text'),
      ('orders', 'user_id', 'uuid'),
      ('orders', 'status', 'text'),
      ('orders', 'total_amount', 'numeric'),
      ('orders', 'shipping_fee', 'numeric'),

      -- order_items 表（訂單明細）
      ('order_items', 'order_id', 'uuid'),
      ('order_items', 'product_id', 'uuid'),
      ('order_items', 'deal_price', 'numeric'),
      ('order_items', 'product_name_snapshot', 'text'),

      -- order_timelines 表（訂單歷史）
      ('order_timelines', 'order_id', 'uuid'),
      ('order_timelines', 'action_type', 'text'),
      ('order_timelines', 'modifications', 'jsonb'),

      -- order_custom_fees 表（自訂費用）
      ('order_custom_fees', 'order_id', 'uuid'),
      ('order_custom_fees', 'fee_name', 'text'),
      ('order_custom_fees', 'amount', 'numeric'),

      -- coupons 表（優惠券）
      ('coupons', 'code', 'character varying'),
      ('coupons', 'code_normalized', 'character varying'),
      ('coupons', 'discount_type', 'character varying'),
      ('coupons', 'discount_value', 'numeric'),

      -- user_coupons 表（客戶優惠券）
      ('user_coupons', 'user_id', 'uuid'),
      ('user_coupons', 'coupon_id', 'uuid'),
      ('user_coupons', 'used_at', 'timestamp with time zone'),

      -- order_coupons 表（訂單優惠券快照）
      ('order_coupons', 'order_id', 'uuid'),
      ('order_coupons', 'coupon_code', 'character varying'),
      ('order_coupons', 'discount_amount', 'numeric'),

      -- system_settings 表（系統設定）
      ('system_settings', 'key', 'text'),
      ('system_settings', 'value', 'text'),
      ('system_settings', 'value_type', 'text'),
      ('system_settings', 'is_public', 'boolean'),

      -- audit_logs 表（操作日誌）
      ('audit_logs', 'target_type', 'text'),
      ('audit_logs', 'action_type', 'text'),
      ('audit_logs', 'old_values', 'jsonb'),
      ('audit_logs', 'new_values', 'jsonb')
    ) AS t(table_name, column_name, data_type)
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = v_checks.table_name
        AND column_name = v_checks.column_name
        AND data_type LIKE v_checks.data_type || '%'
    ) THEN
      INSERT INTO health_check_results (category, check_type, target_name, status, expected_value, actual_value, message)
      VALUES (
        'Schema',
        'ColumnExists',
        v_checks.table_name || '.' || v_checks.column_name,
        'OK',
        v_checks.data_type,
        v_checks.data_type,
        '欄位存在且型別正確'
      );
    ELSE
      INSERT INTO health_check_results (category, check_type, target_name, status, expected_value, actual_value, message)
      VALUES (
        'Schema',
        'ColumnExists',
        v_checks.table_name || '.' || v_checks.column_name,
        'ERROR',
        v_checks.data_type,
        'NOT FOUND',
        '欄位不存在或型別不符，Migration 可能未正確執行'
      );
    END IF;
  END LOOP;
END $$;

-- 1.4 檢查唯一性約束（UNIQUE 約束與索引）
DO $$
DECLARE
  v_checks RECORD;
BEGIN
  FOR v_checks IN
    SELECT * FROM (VALUES
      ('tiers', 'name'),
      ('profiles', 'phone'),
      ('profiles', 'email'),
      ('profiles', 'username'),
      ('categories', 'code'),
      ('series', 'code'),
      ('products', 'code'),
      ('orders', 'order_number'),
      ('system_settings', 'key'),
      ('tier_prices', 'tier_id, product_id'),
      ('user_coupons', 'user_id, coupon_id'),
      ('order_coupons', 'order_id')
    ) AS t(table_name, columns)
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = v_checks.table_name
        AND indexdef LIKE '%UNIQUE%'
        AND indexdef LIKE '%' || SPLIT_PART(v_checks.columns, ',', 1) || '%'
    ) THEN
      INSERT INTO health_check_results (category, check_type, target_name, status, expected_value, actual_value, message)
      VALUES (
        'Schema',
        'UniqueConstraint',
        v_checks.table_name || ' (' || v_checks.columns || ')',
        'OK',
        'UNIQUE',
        'UNIQUE',
        '唯一性約束存在'
      );
    ELSE
      INSERT INTO health_check_results (category, check_type, target_name, status, expected_value, actual_value, message)
      VALUES (
        'Schema',
        'UniqueConstraint',
        v_checks.table_name || ' (' || v_checks.columns || ')',
        'ERROR',
        'UNIQUE',
        'NOT FOUND',
        '唯一性約束缺失，可能導致資料重複'
      );
    END IF;
  END LOOP;
END $$;

-- 1.5 檢查外鍵約束（Foreign Key）
DO $$
DECLARE
  v_fk_count INTEGER;
  v_expected_min INTEGER := 20;  -- 預期至少 20 個外鍵
BEGIN
  SELECT COUNT(*)
  INTO v_fk_count
  FROM information_schema.table_constraints
  WHERE constraint_type = 'FOREIGN KEY'
    AND table_schema = 'public';

  INSERT INTO health_check_results (category, check_type, target_name, status, expected_value, actual_value, message)
  VALUES (
    'Schema',
    'ForeignKeyCount',
    'public schema foreign keys',
    CASE WHEN v_fk_count >= v_expected_min THEN 'OK' ELSE 'WARNING' END,
    '>= ' || v_expected_min::TEXT,
    v_fk_count::TEXT,
    CASE
      WHEN v_fk_count >= v_expected_min THEN '外鍵數量符合預期'
      ELSE '外鍵數量不足，資料完整性可能受影響'
    END
  );
END $$;

-- ================================================================
-- PART 2: 索引完整性檢查（預期: 65+ 個索引）
-- ================================================================

-- 2.1 檢查索引總數
DO $$
DECLARE
  v_index_count INTEGER;
  v_expected_min INTEGER := 65;
BEGIN
  SELECT COUNT(*)
  INTO v_index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    -- 排除主鍵自動建立的索引
    AND indexname NOT LIKE '%_pkey';

  INSERT INTO health_check_results (category, check_type, target_name, status, expected_value, actual_value, message)
  VALUES (
    'Index',
    'IndexCount',
    'public schema indexes',
    CASE WHEN v_index_count >= v_expected_min THEN 'OK' ELSE 'WARNING' END,
    '>= ' || v_expected_min::TEXT,
    v_index_count::TEXT,
    CASE
      WHEN v_index_count >= v_expected_min THEN '索引數量符合預期'
      ELSE '索引數量不足，查詢效能可能受影響'
    END
  );
END $$;

-- 2.2 檢查必要索引是否存在（按功能分組）
DO $$
DECLARE
  v_required_indexes TEXT[] := ARRAY[
    -- tiers 表
    'idx_tiers_rank',

    -- profiles 表
    'idx_profiles_phone',
    'idx_profiles_email',
    'idx_profiles_tier_id',
    'idx_profiles_role',
    'idx_profiles_username',

    -- categories 表
    'idx_categories_code',
    'idx_categories_status',
    'idx_categories_sort_order',

    -- series 表
    'idx_series_code',
    'idx_series_category_id',
    'idx_series_status',
    'idx_series_sort_order',
    'idx_series_name',

    -- products 表
    'idx_products_code',
    'idx_products_name',
    'idx_products_series_id',
    'idx_products_status',
    'idx_products_stock_status',
    'idx_products_tags',
    'idx_products_status_updated_at',

    -- tier_prices 表
    'idx_tier_prices_tier_id',
    'idx_tier_prices_product_id',
    'idx_tier_prices_lookup',

    -- orders 表
    'idx_orders_order_number',
    'idx_orders_user_id',
    'idx_orders_status',
    'idx_orders_created_at',
    'idx_orders_user_status',

    -- order_items 表
    'idx_order_items_order_id',
    'idx_order_items_product_id',

    -- order_timelines 表
    'idx_order_timelines_order_id',
    'idx_order_timelines_created_at',
    'idx_order_timelines_modifications',

    -- order_custom_fees 表
    'idx_order_custom_fees_order_id',
    'idx_order_custom_fees_created_at',

    -- coupons 表
    'idx_coupons_code_normalized',
    'idx_coupons_status',
    'idx_coupons_valid_time',
    'idx_coupons_discount_type',

    -- coupon_tier_restrictions 表
    'idx_coupon_tier_restrictions_coupon_id',
    'idx_coupon_tier_restrictions_tier_id',

    -- coupon_series_restrictions 表
    'idx_coupon_series_restrictions_coupon_id',
    'idx_coupon_series_restrictions_series_id',

    -- user_coupons 表
    'idx_user_coupons_user_id',
    'idx_user_coupons_coupon_id',
    'idx_user_coupons_used_at',
    'idx_user_coupons_user_coupon',

    -- order_coupons 表
    'idx_order_coupons_order_id',
    'idx_order_coupons_coupon_code',

    -- system_settings 表
    'idx_system_settings_key',
    'idx_system_settings_category',
    'idx_system_settings_is_public',

    -- audit_logs 表
    'idx_audit_logs_target_type',
    'idx_audit_logs_action_type',
    'idx_audit_logs_created_at',
    'idx_audit_logs_target',
    'idx_audit_logs_actor',
    'idx_audit_logs_old_values_gin',
    'idx_audit_logs_new_values_gin',

    -- announcements 表
    'idx_announcements_active_sort'
  ];
  v_index TEXT;
  v_exists BOOLEAN;
BEGIN
  FOREACH v_index IN ARRAY v_required_indexes
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = v_index
    ) INTO v_exists;

    INSERT INTO health_check_results (category, check_type, target_name, status, expected_value, actual_value, message)
    VALUES (
      'Index',
      'IndexExists',
      v_index,
      CASE WHEN v_exists THEN 'OK' ELSE 'WARNING' END,
      'true',
      v_exists::TEXT,
      CASE WHEN v_exists THEN '索引存在' ELSE '索引缺失，查詢效能可能受影響' END
    );
  END LOOP;
END $$;

-- 2.3 檢查重複索引（相同欄位有多個索引）
DO $$
DECLARE
  v_duplicate_indexes RECORD;
BEGIN
  FOR v_duplicate_indexes IN
    SELECT
      tablename,
      STRING_AGG(indexname, ', ') AS duplicate_indexes,
      COUNT(*) AS count
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname NOT LIKE '%_pkey'
    GROUP BY tablename, indexdef
    HAVING COUNT(*) > 1
  LOOP
    INSERT INTO health_check_results (category, check_type, target_name, status, expected_value, actual_value, message)
    VALUES (
      'Index',
      'DuplicateIndex',
      v_duplicate_indexes.tablename,
      'WARNING',
      '1',
      v_duplicate_indexes.count::TEXT,
      '發現重複索引: ' || v_duplicate_indexes.duplicate_indexes || '，建議移除以節省空間'
    );
  END LOOP;

  -- 若無重複索引，插入 OK 記錄
  IF NOT FOUND THEN
    INSERT INTO health_check_results (category, check_type, target_name, status, expected_value, actual_value, message)
    VALUES (
      'Index',
      'DuplicateIndex',
      'all tables',
      'OK',
      '0',
      '0',
      '無重複索引'
    );
  END IF;
END $$;

-- 2.4 檢查 GIN 索引（JSONB 與 ARRAY 欄位）
DO $$
DECLARE
  v_gin_indexes TEXT[] := ARRAY[
    'idx_products_tags',
    'idx_audit_logs_old_values_gin',
    'idx_audit_logs_new_values_gin'
  ];
  v_index TEXT;
  v_exists BOOLEAN;
BEGIN
  FOREACH v_index IN ARRAY v_gin_indexes
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = v_index
        AND indexdef LIKE '%USING gin%'
    ) INTO v_exists;

    INSERT INTO health_check_results (category, check_type, target_name, status, expected_value, actual_value, message)
    VALUES (
      'Index',
      'GinIndex',
      v_index,
      CASE WHEN v_exists THEN 'OK' ELSE 'WARNING' END,
      'GIN',
      CASE WHEN v_exists THEN 'GIN' ELSE 'NOT FOUND' END,
      CASE WHEN v_exists THEN 'GIN 索引存在' ELSE 'GIN 索引缺失，JSONB/ARRAY 查詢效能受影響' END
    );
  END LOOP;
END $$;

-- ================================================================
-- PART 3: RLS 覆蓋率檢查（預期: 18 個表啟用 RLS, 70+ 個 Policies）
-- ================================================================

-- 3.1 檢查 RLS 啟用狀態（所有業務表必須啟用）
DO $$
DECLARE
  v_tables_with_rls INTEGER;
  v_expected INTEGER := 18;
BEGIN
  SELECT COUNT(*)
  INTO v_tables_with_rls
  FROM pg_tables
  WHERE schemaname = 'public'
    AND rowsecurity = true;

  INSERT INTO health_check_results (category, check_type, target_name, status, expected_value, actual_value, message)
  VALUES (
    'RLS',
    'RlsEnabledCount',
    'public schema tables',
    CASE WHEN v_tables_with_rls = v_expected THEN 'OK' ELSE 'ERROR' END,
    v_expected::TEXT,
    v_tables_with_rls::TEXT,
    CASE
      WHEN v_tables_with_rls = v_expected THEN 'RLS 覆蓋率 100%'
      ELSE '部分表未啟用 RLS，資料安全可能受威脅'
    END
  );
END $$;

-- 3.2 逐表檢查 RLS 是否啟用
DO $$
DECLARE
  v_required_tables TEXT[] := ARRAY[
    'tiers',
    'profiles',
    'categories',
    'series',
    'products',
    'tier_prices',
    'orders',
    'order_items',
    'order_timelines',
    'order_custom_fees',
    'system_settings',
    'audit_logs',
    'coupons',
    'coupon_tier_restrictions',
    'coupon_series_restrictions',
    'user_coupons',
    'order_coupons',
    'announcements'
  ];
  v_table TEXT;
  v_rls_enabled BOOLEAN;
BEGIN
  FOREACH v_table IN ARRAY v_required_tables
  LOOP
    SELECT rowsecurity
    INTO v_rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = v_table;

    INSERT INTO health_check_results (category, check_type, target_name, status, expected_value, actual_value, message)
    VALUES (
      'RLS',
      'RlsEnabled',
      v_table,
      CASE WHEN v_rls_enabled THEN 'OK' ELSE 'ERROR' END,
      'true',
      v_rls_enabled::TEXT,
      CASE WHEN v_rls_enabled THEN 'RLS 已啟用' ELSE 'RLS 未啟用，資料安全受威脅' END
    );
  END LOOP;
END $$;

-- 3.3 檢查 RLS Policy 數量（預期: 70+ 個）
DO $$
DECLARE
  v_policy_count INTEGER;
  v_expected_min INTEGER := 70;
BEGIN
  SELECT COUNT(*)
  INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public';

  INSERT INTO health_check_results (category, check_type, target_name, status, expected_value, actual_value, message)
  VALUES (
    'RLS',
    'PolicyCount',
    'public schema policies',
    CASE WHEN v_policy_count >= v_expected_min THEN 'OK' ELSE 'WARNING' END,
    '>= ' || v_expected_min::TEXT,
    v_policy_count::TEXT,
    CASE
      WHEN v_policy_count >= v_expected_min THEN 'Policy 數量符合預期'
      ELSE 'Policy 數量不足，部分操作可能未受保護'
    END
  );
END $$;

-- 3.4 檢查關鍵表的 Policy 數量（每個表應有多個 Policies）
DO $$
DECLARE
  v_table_policy_count RECORD;
BEGIN
  FOR v_table_policy_count IN
    SELECT
      tablename,
      COUNT(*) AS policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename
    HAVING COUNT(*) < 2
  LOOP
    INSERT INTO health_check_results (category, check_type, target_name, status, expected_value, actual_value, message)
    VALUES (
      'RLS',
      'TablePolicyCount',
      v_table_policy_count.tablename,
      'WARNING',
      '>= 2',
      v_table_policy_count.policy_count::TEXT,
      'Policy 數量過少，可能缺少客戶/管理員分離的權限控制'
    );
  END LOOP;

  -- 若所有表的 Policy 數量都 >= 2，插入 OK 記錄
  IF NOT FOUND THEN
    INSERT INTO health_check_results (category, check_type, target_name, status, expected_value, actual_value, message)
    VALUES (
      'RLS',
      'TablePolicyCount',
      'all tables',
      'OK',
      '>= 2',
      'all >= 2',
      '所有表的 Policy 數量符合預期'
    );
  END IF;
END $$;

-- 3.5 檢查關鍵 Policy 是否存在（按表分組）
DO $$
DECLARE
  v_critical_policies TEXT[] := ARRAY[
    'tiers:Allow authenticated users to read tiers',
    'tiers:Allow admin to manage tiers',
    'profiles:Allow users to read own profile',
    'profiles:Allow admin to read all profiles',
    'profiles:Allow admin to manage profiles',
    'orders:Clients can view their own orders',
    'orders:Clients can create their own orders',
    'orders:Admins can view all orders',
    'orders:Admins can update orders',
    'order_items:Clients can view their order items',
    'order_items:Admins can view all order items',
    'order_items:Clients can insert items for their own orders',
    'coupons:Clients can view active coupons',
    'coupons:Admins can view all coupons',
    'user_coupons:Clients can view their own coupons',
    'user_coupons:Clients can claim coupons',
    'system_settings:Public can view public settings',
    'system_settings:Admins can view all settings',
    'audit_logs:Admins can view all audit logs'
  ];
  v_policy_full TEXT;
  v_table TEXT;
  v_policy TEXT;
  v_exists BOOLEAN;
BEGIN
  FOREACH v_policy_full IN ARRAY v_critical_policies
  LOOP
    v_table := SPLIT_PART(v_policy_full, ':', 1);
    v_policy := SPLIT_PART(v_policy_full, ':', 2);

    SELECT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = v_table
        AND policyname = v_policy
    ) INTO v_exists;

    INSERT INTO health_check_results (category, check_type, target_name, status, expected_value, actual_value, message)
    VALUES (
      'RLS',
      'PolicyExists',
      v_table || ' → ' || v_policy,
      CASE WHEN v_exists THEN 'OK' ELSE 'ERROR' END,
      'true',
      v_exists::TEXT,
      CASE WHEN v_exists THEN 'Policy 存在' ELSE 'Policy 缺失，權限控制可能失效' END
    );
  END LOOP;
END $$;

-- ================================================================
-- PART 4: PostgreSQL 函數授權檢查（預期: 9 個函數）
-- ================================================================

-- 4.1 檢查 PostgreSQL 函數數量
DO $$
DECLARE
  v_function_count INTEGER;
  v_expected INTEGER := 9;
BEGIN
  SELECT COUNT(*)
  INTO v_function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_type = 'FUNCTION'
    AND routine_name NOT IN ('update_updated_at_column', 'auto_generate_product_code');  -- 排除 Trigger Functions

  INSERT INTO health_check_results (category, check_type, target_name, status, expected_value, actual_value, message)
  VALUES (
    'Function',
    'FunctionCount',
    'public schema functions',
    CASE WHEN v_function_count = v_expected THEN 'OK' ELSE 'WARNING' END,
    v_expected::TEXT,
    v_function_count::TEXT,
    CASE
      WHEN v_function_count = v_expected THEN '函數數量符合預期'
      ELSE '函數數量不符，可能有 Migration 未執行'
    END
  );
END $$;

-- 4.2 檢查必要函數是否存在
DO $$
DECLARE
  v_required_functions TEXT[] := ARRAY[
    'generate_order_number',
    'generate_product_code',
    'confirm_order_and_deduct_stock',
    'cancel_order_and_restore_stock',
    'update_order_status',
    'delete_order_pending',
    'calculate_shipping_fee',
    'mark_order_as_shipping',
    'update_order_with_modifications'
  ];
  v_function TEXT;
  v_exists BOOLEAN;
BEGIN
  FOREACH v_function IN ARRAY v_required_functions
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name = v_function
    ) INTO v_exists;

    INSERT INTO health_check_results (category, check_type, target_name, status, expected_value, actual_value, message)
    VALUES (
      'Function',
      'FunctionExists',
      v_function,
      CASE WHEN v_exists THEN 'OK' ELSE 'ERROR' END,
      'true',
      v_exists::TEXT,
      CASE WHEN v_exists THEN '函數存在' ELSE '函數不存在，Migration 可能未執行' END
    );
  END LOOP;
END $$;

-- 4.3 檢查函數授權（GRANT EXECUTE）
DO $$
DECLARE
  v_granted_functions INTEGER;
  v_expected_min INTEGER := 9;
BEGIN
  SELECT COUNT(DISTINCT routine_name)
  INTO v_granted_functions
  FROM information_schema.routine_privileges
  WHERE routine_schema = 'public'
    AND grantee = 'authenticated'
    AND privilege_type = 'EXECUTE';

  INSERT INTO health_check_results (category, check_type, target_name, status, expected_value, actual_value, message)
  VALUES (
    'Function',
    'FunctionGrant',
    'authenticated role',
    CASE WHEN v_granted_functions >= v_expected_min THEN 'OK' ELSE 'WARNING' END,
    '>= ' || v_expected_min::TEXT,
    v_granted_functions::TEXT,
    CASE
      WHEN v_granted_functions >= v_expected_min THEN '函數授權完整'
      ELSE '部分函數未授權，客戶端可能無法呼叫'
    END
  );
END $$;

-- ================================================================
-- PART 5: 約束完整性檢查（CHECK 約束）
-- ================================================================

-- 5.1 檢查 CHECK 約束數量（預期: 30+ 個）
DO $$
DECLARE
  v_check_count INTEGER;
  v_expected_min INTEGER := 30;
BEGIN
  SELECT COUNT(*)
  INTO v_check_count
  FROM information_schema.table_constraints
  WHERE constraint_type = 'CHECK'
    AND table_schema = 'public';

  INSERT INTO health_check_results (category, check_type, target_name, status, expected_value, actual_value, message)
  VALUES (
    'Constraint',
    'CheckConstraintCount',
    'public schema',
    CASE WHEN v_check_count >= v_expected_min THEN 'OK' ELSE 'WARNING' END,
    '>= ' || v_expected_min::TEXT,
    v_check_count::TEXT,
    CASE
      WHEN v_check_count >= v_expected_min THEN 'CHECK 約束數量符合預期'
      ELSE 'CHECK 約束數量不足，資料驗證可能不完整'
    END
  );
END $$;

-- 5.2 檢查關鍵 CHECK 約束是否存在
DO $$
DECLARE
  v_critical_checks TEXT[] := ARRAY[
    'profiles:client_must_have_phone',
    'profiles:admin_must_have_email',
    'profiles:admin_must_have_username',
    'categories:check_code_format',
    'orders:orders_status_check',
    'order_timelines:order_timelines_action_type_check',
    'coupons:coupons_discount_type_check',
    'coupons:valid_time_range'
  ];
  v_check_full TEXT;
  v_table TEXT;
  v_constraint TEXT;
  v_exists BOOLEAN;
BEGIN
  FOREACH v_check_full IN ARRAY v_critical_checks
  LOOP
    v_table := SPLIT_PART(v_check_full, ':', 1);
    v_constraint := SPLIT_PART(v_check_full, ':', 2);

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_type = 'CHECK'
        AND table_schema = 'public'
        AND table_name = v_table
        AND constraint_name = v_constraint
    ) INTO v_exists;

    INSERT INTO health_check_results (category, check_type, target_name, status, expected_value, actual_value, message)
    VALUES (
      'Constraint',
      'CheckConstraintExists',
      v_table || ' → ' || v_constraint,
      CASE WHEN v_exists THEN 'OK' ELSE 'WARNING' END,
      'true',
      v_exists::TEXT,
      CASE WHEN v_exists THEN '約束存在' ELSE '約束缺失，資料驗證可能失效' END
    );
  END LOOP;
END $$;

-- ================================================================
-- PART 6: 產生檢查報告
-- ================================================================

-- 計算統計數據
DO $$
DECLARE
  v_total INTEGER;
  v_ok INTEGER;
  v_warning INTEGER;
  v_error INTEGER;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'OK'),
    COUNT(*) FILTER (WHERE status = 'WARNING'),
    COUNT(*) FILTER (WHERE status = 'ERROR')
  INTO v_total, v_ok, v_warning, v_error
  FROM health_check_results;

  RAISE NOTICE '========== 資料庫健康檢查報告 ==========';
  RAISE NOTICE '檢查時間: %', NOW();
  RAISE NOTICE '';
  RAISE NOTICE '檢查項目總數: %', v_total;
  RAISE NOTICE '通過 (OK):    % (%.1f%%)', v_ok, (v_ok::FLOAT / v_total * 100);
  RAISE NOTICE '警告 (WARNING): % (%.1f%%)', v_warning, (v_warning::FLOAT / v_total * 100);
  RAISE NOTICE '錯誤 (ERROR):  % (%.1f%%)', v_error, (v_error::FLOAT / v_total * 100);
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

-- 顯示詳細結果（按類別與狀態排序）
SELECT
  category AS "檢查類別",
  check_type AS "檢查類型",
  target_name AS "目標",
  status AS "狀態",
  message AS "訊息"
FROM health_check_results
ORDER BY
  CASE status
    WHEN 'ERROR' THEN 1
    WHEN 'WARNING' THEN 2
    WHEN 'OK' THEN 3
  END,
  category,
  check_type,
  target_name;

-- 僅顯示錯誤與警告（用於快速檢視問題）
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========== 問題清單（ERROR + WARNING） ==========';
END $$;

SELECT
  status AS "狀態",
  category AS "類別",
  target_name AS "目標",
  message AS "訊息"
FROM health_check_results
WHERE status IN ('ERROR', 'WARNING')
ORDER BY
  CASE status
    WHEN 'ERROR' THEN 1
    WHEN 'WARNING' THEN 2
  END,
  category,
  target_name;

-- 清理暫存表（可選，若需要保留檢查結果可註解掉）
-- DROP TABLE IF EXISTS health_check_results;
