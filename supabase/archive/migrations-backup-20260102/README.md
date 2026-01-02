# Migration 備份說明

**備份日期**: 2026-01-02
**原因**: 清理重複與除錯用的 migration 檔案

## 備份檔案列表

### 1. `20260102_add_profile_trigger.sql`
**用途**: 建立自動建立 profile 的 trigger
**問題**: 功能已被 `20260102_fix_profile_trigger.sql` 修正,原版本不需要
**狀態**: 已被後續版本取代

### 2. `20260102_disable_rls_temp.sql`
**用途**: 臨時關閉 profiles 表的 RLS (開發除錯用)
**問題**: 這是不安全的臨時方案,不應該保留
**狀態**: 僅開發階段使用,已不需要

### 3. `20260102_fix_profile_trigger.sql`
**用途**: 修正 trigger,只在有 phone 時才自動建立 profile
**問題**: 功能已整合到初始 schema 或在應用程式層處理
**狀態**: 已被應用程式邏輯取代

### 4. `20260102_fix_rls_policies.sql`
**用途**: 修正 RLS 政策,允許登入時查詢 profile
**問題**: 與 `20260101_initial_schema.sql` 中的 RLS 政策重複
**狀態**: 已整合到初始 schema

### 5. `verify_admin_profile.sql`
**用途**: 驗證管理員帳號與 profile 的 SQL 查詢
**問題**: 這不是 migration,只是驗證用的 SQL
**狀態**: 應該放在 docs 或 scripts 目錄

## 保留的核心 Migrations

僅保留兩個核心 migration 檔案:

1. **20260101_initial_schema.sql** (4247 bytes)
   - 建立 tiers, profiles 資料表
   - 設定 RLS 政策
   - 建立索引與觸發器
   - 插入預設會員等級

2. **20260102_products_and_categories.sql** (4384 bytes)
   - 建立 products, categories 資料表
   - 建立 Supabase Storage bucket
   - 設定 Storage RLS 政策
   - 插入預設分類

## 同步狀態

```
Local    | Remote
---------|--------
20260101 | 20260101 ✅
20260102 | 20260102 ✅
```

**結論**: 本地與遠端 migration 完全同步!

## 如需復原

如果需要查看這些除錯檔案的內容,可以從此備份目錄中找到。
但建議不要再次套用這些 migration,因為:
1. 功能已被後續版本取代
2. 遠端資料庫已正常運作
3. 可能造成衝突或重複

---

**維護者**: Claude Code
**最後更新**: 2026-01-02
