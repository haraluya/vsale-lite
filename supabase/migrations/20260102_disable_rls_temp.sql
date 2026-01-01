-- 臨時方案:暫時關閉 profiles 表的 RLS,讓登入功能先正常運作
-- 之後在 Phase 8 (Middleware) 會重新啟用並正確配置

-- 方法 1: 完全關閉 RLS (最簡單)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 註:這是臨時開發用的設定,正式上線前必須重新啟用 RLS
