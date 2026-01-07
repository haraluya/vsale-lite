# Claude Skills for Vsale-lite

本目錄包含專案專用的 Claude Skills，用於規範特定操作的處理流程。

---

## 📚 可用 Skills

### 1. Supabase Manager (`supabase-manager`)

**用途**：專職處理所有 Supabase 資料庫操作，內建資料保護協議

**何時使用**：
- 執行 Migration
- 資料庫重置
- 資料庫結構修改
- 診斷與修復資料庫問題

**核心保護**：
- ✅ 強制詢問使用者（不可自作主張）
- ✅ 提供保留資料的替代方案
- ✅ 執行前自動備份
- ✅ 多重確認機制

**文件位置**：
- 協議文件：`.claude/skills/supabase-manager.md`
- 配置檔案：`.claude/skills/supabase-manager.skill.json`

---

## 🚀 如何使用

### 方式 1：自動觸發

當您提到以下關鍵字時，Skill 會自動啟用：
- `supabase`
- `database` / `資料庫`
- `migration` / `遷移`
- `db reset` / `資料庫重置`

### 方式 2：手動觸發

在對話中明確請求：
```
請使用 Supabase Manager Skill 來處理這個資料庫問題
```

### 方式 3：在問題發生時提醒

如果我違反了協議（例如直接執行 db reset），您可以說：
```
請遵守 Supabase Manager Skill 的協議
```

---

## 📋 Skill 運作方式

以「資料庫需要修改」為例：

### ❌ 未使用 Skill（舊行為）
```
發現問題 → 直接執行 supabase db reset → 資料清空
```
**問題**：沒有詢問使用者、沒有備份、沒有提供替代方案

### ✅ 使用 Skill（新行為）
```
發現問題
  ↓
診斷問題（檢查 Migration 狀態、資料庫結構）
  ↓
提出多個解決方案
  - 方案 A：增量式 Migration（保留資料）✅ 推薦
  - 方案 B：完全重置（清空資料）⚠️
  ↓
詢問使用者選擇
  ↓
等待使用者回覆
  ↓
執行對應操作
  - 如選擇方案 B：先備份 → 再次確認 → 執行
```

---

## 🛡️ 保護機制

### 1. 協議文件（Skill 內建）
- 定義所有標準操作流程
- 明確列出禁止行為
- 提供決策樹與檢查清單

### 2. CLAUDE.md 強制引用
- 在專案根目錄 CLAUDE.md 中明確要求
- 每次對話開始時都會載入

### 3. 自動觸發機制
- 關鍵字偵測
- 高優先級執行

### 4. 操作前檢查清單
```
執行資料庫操作前，Skill 會檢查：
□ 這個操作會清空資料嗎？
□ 我有詢問使用者嗎？
□ 我有提供保留資料的替代方案嗎？
□ 使用者明確同意了嗎？
□ 我有執行備份嗎？
```

---

## 📖 實際範例

### 範例 1：使用者回報「前台出現錯誤」

**Skill 處理流程**：

1. **診斷問題**
   ```
   檢查錯誤訊息 → 發現 categories 表缺少 sort_order 欄位
   ```

2. **提出解決方案**
   ```markdown
   我發現了問題：categories 表缺少 sort_order 欄位

   **方案 A（推薦）**：建立修復 Migration
   - 建立新 Migration 新增欄位
   - 使用 pnpm db:migrate 套用
   - ✅ 保留所有現有資料

   **方案 B**：重置資料庫
   - 執行 pnpm db:reset
   - ⚠️ 會清空所有測試資料

   建議使用方案 A。您希望使用哪個方案？
   ```

3. **等待使用者決定**
   - 不會自動執行任何操作
   - 必須等到使用者明確選擇

### 範例 2：使用者說「migration 失敗了」

**Skill 處理流程**：

1. **分析錯誤**
   ```
   檢查 Migration 列表 → 發現執行順序問題
   ```

2. **提出多個修復方案**
   ```markdown
   Migration 失敗原因：執行順序混亂

   **方案 A**：移除錯誤 Migration + 建立修復 Migration
   - 保留資料
   - 增量式更新

   **方案 B**：調整 Migration 順序後重新套用
   - 保留資料
   - 需要手動調整

   **方案 C**：重置資料庫
   - 清空資料
   - 需要備份

   您希望使用哪個方案？
   ```

---

## 🔧 技術實作

### Skill 檔案結構

```
.claude/skills/
├── README.md                          # 本文件
├── supabase-manager.md                # Skill 協議與 SOP
└── supabase-manager.skill.json        # Skill 配置（觸發器、優先級）
```

### 觸發機制

**supabase-manager.skill.json**:
```json
{
  "autoActivate": true,
  "priority": "high",
  "triggers": ["supabase", "database", "migration"],
  "requiredApproval": ["db reset", "清空資料"]
}
```

### 協議載入順序

```
對話開始
  ↓
載入 CLAUDE.md（專案配置）
  ↓
看到 "必須遵守 supabase-manager.md 協議"
  ↓
載入 Skill 協議
  ↓
啟用保護機制
```

---

## ❓ 常見問題

### Q1: 如果我還是執行了 db reset 怎麼辦？

A: Skill 會記錄違規行為，並提醒遵守協議。如果資料已清空，會引導您還原備份。

### Q2: Skill 會影響正常開發嗎？

A: 不會。對於安全操作（如 `pnpm db:migrate`），Skill 會直接執行。只有危險操作才會觸發詢問機制。

### Q3: 我可以停用 Skill 嗎？

A: 可以，但強烈不建議。如需停用，請從 CLAUDE.md 中移除相關引用。

### Q4: Skill 能保證 100% 不出錯嗎？

A: Skill 是「約束機制」而非「技術限制」。它能大幅降低誤操作風險，但仍需要使用者的配合與監督。

---

## 🎯 未來擴充

可考慮新增的 Skills：

1. **Git Commit Manager**
   - 規範 commit message 格式
   - 自動產生繁體中文 commit

2. **Deployment Manager**
   - Firebase 部署前檢查清單
   - 自動執行 type-check 與 build

3. **Test Runner**
   - 自動執行相關測試
   - 覆蓋率報告

---

## 📞 回饋與改進

如果您發現 Skill 有任何問題或改進建議，請在對話中直接提出。

---

**最後更新**: 2026-01-07
**版本**: 1.0.0
