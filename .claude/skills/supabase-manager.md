# Supabase Database Manager Skill

**Skill ID**: `supabase-manager`
**Version**: 1.0.0
**Purpose**: 專職處理所有 Supabase 資料庫操作，內建資料保護協議

---

## 🛡️ 核心協議（CRITICAL - 必須遵守）

### 最高指導原則

**任何會清空資料的操作都必須：**
1. ✅ **先詢問使用者**（不可自作主張）
2. ✅ **提供多個選項**（含保留資料的方案）
3. ✅ **說明風險**（明確告知會清空資料）
4. ✅ **等待使用者決定**（不可預設執行）
5. ✅ **執行前備份**（除非使用者明確拒絕）

### 禁止行為

**❌ 絕對禁止以下操作（除非使用者明確指示）**：
- `supabase db reset` - 清空所有資料
- `pnpm db:reset` - 同上
- `DROP TABLE` - 刪除資料表
- `TRUNCATE TABLE` - 清空資料表
- 任何會導致資料遺失的 SQL 指令

---

## 📋 標準操作流程 (SOP)

### 情境 1：發現需要修改資料庫結構

**步驟 1：診斷問題** ✅
```
分析錯誤訊息、Migration 狀態、資料庫結構
```

**步驟 2：提出解決方案** ✅ **必須執行**
```markdown
我發現了問題：[問題描述]

有以下解決方案：

**方案 A：增量式 Migration（推薦）✅**
- 操作：建立新 Migration + 使用 pnpm db:migrate
- 優點：保留所有現有資料
- 缺點：[如有]
- 風險：無（安全）

**方案 B：完全重置（清空資料）⚠️**
- 操作：執行 supabase db reset --local
- 優點：[如有]
- **缺點：會清空所有測試資料**
- 風險：高（資料遺失）

**建議：方案 A**

您希望使用哪個方案？
```

**步驟 3：等待使用者回覆** ✅ **必須執行**
```
不可自行決定，必須等待使用者明確選擇
```

**步驟 4：執行操作** ✅
```
根據使用者選擇執行對應操作
如選擇方案 B（會清空資料），執行前再次確認
```

---

### 情境 2：使用者要求執行 Migration

**判斷：需要清空資料嗎？**

**A. 不需要清空** → 直接執行
```bash
pnpm db:migrate
# 或
supabase db push --local
```

**B. 需要清空** → 必須詢問
```markdown
⚠️ 此操作需要清空資料庫

**原因**：[說明為什麼需要清空]

**影響**：
- 會清空所有測試資料（訂單、商品、客戶等）
- 會重新執行所有 Migration
- 會執行 seed.sql（僅恢復基礎測試資料）

**備份狀態**：
- 最新備份：[檢查 backups/ 目錄]
- 自動備份：建議執行

是否繼續？
1. 是，自動備份後執行
2. 否，取消操作
3. 讓我想想其他方案
```

---

### 情境 3：Migration 執行失敗

**步驟 1：診斷錯誤** ✅
```
分析錯誤訊息、檢查 Migration 檔案語法
```

**步驟 2：提供修復方案** ✅
```markdown
Migration 執行失敗：[錯誤訊息]

**可能原因**：
1. [原因 1]
2. [原因 2]

**修復方案**：

**方案 A：修正 Migration 檔案** ✅ 推薦
- 編輯 Migration 檔案修正語法錯誤
- 使用 pnpm db:migrate 重新套用
- 優點：保留資料

**方案 B：回滾 Migration**
- 移除問題 Migration
- 使用 pnpm db:migrate 重新套用
- 優點：保留資料

**方案 C：重置資料庫** ⚠️
- 執行 pnpm db:reset
- **缺點：清空所有資料**

您希望使用哪個方案？
```

---

## 🔧 可用工具與指令

### ✅ 安全指令（可直接執行）

```bash
# 查詢狀態（只讀）
supabase status
supabase migration list
pnpm db:health

# 增量式 Migration（保留資料）
pnpm db:migrate
supabase db push --local
supabase migration new <name>

# 備份
pnpm db:backup

# 查看 Migration 預覽
pnpm db:migrate:preview
```

### ⚠️ 危險指令（需詢問使用者）

```bash
# 清空資料
pnpm db:reset                # 必須詢問
supabase db reset --local    # 必須詢問

# 還原備份
pnpm db:restore              # 建議詢問（確認要還原哪個備份）
```

### ❌ 禁止指令（除非使用者明確要求）

```bash
supabase db reset --db-url <remote>  # 遠端重置（災難性）
supabase db reset --linked           # 雲端重置（災難性）
```

---

## 📊 決策樹

```
發現需要修改資料庫
    │
    ├─ 能用增量式 Migration 解決？
    │   ├─ 是 → 使用 pnpm db:migrate ✅
    │   └─ 否 ↓
    │
    ├─ 詢問使用者
    │   "此操作需要清空資料，是否繼續？"
    │   │
    │   ├─ 使用者同意
    │   │   ├─ 執行備份 (pnpm db:backup)
    │   │   ├─ 再次確認
    │   │   └─ 執行 pnpm db:reset
    │   │
    │   └─ 使用者拒絕
    │       └─ 尋找其他方案
    │
    └─ 無法執行
        └─ 回報使用者
```

---

## 🎯 實際範例

### 範例 1：使用者說「migration 有問題」

**❌ 錯誤做法**：
```
我馬上用 supabase db reset 修復
```

**✅ 正確做法**：
```markdown
讓我先診斷問題...

[執行檢查]

我發現了問題：categories 表缺少 sort_order 欄位

**方案 A（推薦）**：建立修復 Migration
- 建立新 Migration 新增欄位
- 使用 pnpm db:migrate 套用
- ✅ 保留所有資料

**方案 B**：重置資料庫
- 執行 pnpm db:reset
- ⚠️ 會清空所有測試資料

建議使用方案 A。您希望使用哪個方案？
```

### 範例 2：使用者說「資料庫壞了，重置吧」

**❌ 錯誤做法**：
```bash
好的，馬上執行
supabase db reset --local
```

**✅ 正確做法**：
```markdown
在重置之前，讓我先檢查狀況...

[執行診斷]

**當前狀態**：
- Migration 狀態：[結果]
- 資料表數量：[數量]
- 最新備份：[時間]

⚠️ **重要提醒**：重置會清空所有資料

**替代方案**：
1. **修復問題**（保留資料）- 我可以嘗試找出問題並修復
2. **重置資料庫**（清空資料）- 自動備份後重置

您確定要重置嗎？還是讓我先嘗試修復？
```

---

## 📝 檢查清單（每次操作前）

**執行任何資料庫操作前，問自己**：

- [ ] 這個操作會清空資料嗎？
- [ ] 我有詢問使用者嗎？
- [ ] 我有提供保留資料的替代方案嗎？
- [ ] 使用者明確同意了嗎？
- [ ] 我有執行備份嗎？

**如果任一項是「否」，停止操作！**

---

## 🚨 違規處理

如果我違反了此協議：

1. **立即停止**當前操作
2. **誠實說明**違反了哪條協議
3. **分析原因**為什麼會違反
4. **提出改進**如何避免再次發生

---

## 📚 相關文件

- [資料庫安全協議](../../docs/DATABASE_SAFETY_PROTOCOL.md)
- [Migration 工作流程](../../docs/MIGRATION_WORKFLOW.md)
- [安全指南](../../docs/SAFE_MIGRATION_GUIDE.md)
- [專案憲章](../../CLAUDE.md)

---

## 版本歷史

- **v1.0.0** (2026-01-07): 初始版本，建立完整協議
