-- ================================================
-- Migration: 啟用 pgcrypto 擴展
-- 目的: 支援 seed.sql 中的 gen_salt() 和 crypt() 函數
-- ================================================

-- 啟用 pgcrypto 擴展（用於密碼加密）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 驗證擴展已啟用
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
    ) THEN
        RAISE NOTICE '✅ pgcrypto 擴展已成功啟用';
    ELSE
        RAISE EXCEPTION '❌ pgcrypto 擴展啟用失敗';
    END IF;
END $$;
