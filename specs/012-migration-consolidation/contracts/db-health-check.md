# Database Health Check Script API

**Script**: `scripts/db-health-check.ps1`
**Version**: 1.0
**Purpose**: 全面檢查資料庫健康狀態（225+ 檢查項目）

---

## Synopsis

```powershell
.\scripts\db-health-check.ps1 [[-Category] <string>] [-SaveReport] [-Verbose] [-WhatIf]
```

---

## Description

此腳本執行全面的資料庫健康檢查，驗證 Schema 一致性、索引完整性、RLS 覆蓋率、函數授權等 225+ 個檢查項目。適用於 Migration 整合前後驗證、定期健康檢查、部署前檢查。

**檢查類別**:
1. **Schema 一致性** (85 項) - 表、欄位、型別、約束
2. **索引完整性** (70 項) - 索引存在性、重複索引、GIN 索引
3. **RLS 覆蓋率** (40 項) - RLS 啟用狀態、Policy 數量
4. **函數授權** (15 項) - 函數存在性、GRANT EXECUTE
5. **約束完整性** (15 項) - CHECK 約束、預設值

---

## Parameters

### -Category <string>

指定要執行的檢查類別（預設: 全部）

- **Type**: String
- **Required**: No
- **Default**: `"All"` (執行所有檢查)
- **Valid Values**:
  - `"All"` - 所有檢查
  - `"Schema"` - Schema 一致性檢查
  - `"Index"` - 索引完整性檢查
  - `"RLS"` - RLS 覆蓋率檢查
  - `"Function"` - 函數授權檢查
  - `"Constraint"` - 約束完整性檢查

**Example**:
```powershell
# 僅執行索引檢查
.\scripts\db-health-check.ps1 -Category "Index"
```

---

### -SaveReport

將檢查報告儲存到檔案

- **Type**: Switch
- **Required**: No
- **Default**: `$false`
- **Output Path**: `specs/012-migration-consolidation/health-check-report_YYYYMMDD_HHMMSS.txt`

**Example**:
```powershell
.\scripts\db-health-check.ps1 -SaveReport
```

---

### -Verbose

顯示詳細檢查過程

- **Type**: Switch
- **Required**: No
- **Default**: `$false`

**Example**:
```powershell
.\scripts\db-health-check.ps1 -Verbose
```

---

### -WhatIf

模擬執行模式（顯示將執行的檢查，但不實際執行）

- **Type**: Switch
- **Required**: No
- **Default**: `$false`

**Example**:
```powershell
.\scripts\db-health-check.ps1 -WhatIf
```

---

## Outputs

### Console Output

```
========== 資料庫健康檢查報告 ==========
檢查時間: 2026-01-07 12:05:30
環境: 本機 (127.0.0.1:54322)
資料庫: postgres

執行檢查類別: 全部 (225 項)

[1/5] Schema 一致性檢查 (85 項)
  [✅] 表數量: 18 / 18 (預期)
  [✅] 欄位數量: 150 / 150 (預期)
  [✅] tiers.shipping_fee 存在 (DECIMAL)
  [✅] profiles.username 存在 (VARCHAR)
  [✅] products.tags 存在 (TEXT[])
  [✅] orders.shipping_fee 存在 (DECIMAL)
  [✅] order_timelines.modifications 存在 (JSONB)
  ...
  進度: 85/85 ✅

[2/5] 索引完整性檢查 (70 項)
  [✅] 索引總數: 68 / 65-75 (預期範圍)
  [✅] idx_products_series_status_updated 存在
  [✅] idx_orders_pending_created 存在
  [✅] idx_orders_user_status_created 存在
  [✅] idx_products_tags 存在 (GIN)
  [⚠️] 發現 1 個重複索引: idx_products_name (UNIQUE 版本優先)
  ...
  進度: 69/70 ⚠️

[3/5] RLS 覆蓋率檢查 (40 項)
  [✅] RLS 啟用表: 18 / 18 (100%)
  [✅] Policy 總數: 72 / 70+ (預期)
  [✅] profiles.select_own 存在
  [✅] orders.select_own 存在
  [✅] coupons.select_active 存在
  ...
  進度: 40/40 ✅

[4/5] 函數授權檢查 (15 項)
  [✅] generate_order_number() 存在
  [✅] calculate_shipping_fee() 存在
  [✅] mark_order_as_shipping() 存在
  [✅] cancel_order_and_restore_stock() 存在
  [✅] update_order_with_modifications() 存在
  [✅] 所有函數已授權 (GRANT EXECUTE)
  ...
  進度: 15/15 ✅

[5/5] 約束完整性檢查 (15 項)
  [✅] CHECK 約束總數: 32 / 30+ (預期)
  [✅] orders.status 約束存在
  [✅] tiers.rank 約束存在
  [✅] profiles.role 約束存在
  ...
  進度: 15/15 ✅

==========================================
檢查完成！
總計: 224 項通過, 1 項警告, 0 項錯誤
執行時間: 28 秒

總結:
  ✅ 錯誤: 0
  ⚠️ 警告: 1
  ✅ 通過率: 99.6%

建議:
  [⚠️] 檢查重複索引: idx_products_name (可選擇性移除舊版本)

========================================
資料庫健康狀態: 良好 ✅
========================================
```

### Report File (SaveReport Mode)

**檔案位置**: `specs/012-migration-consolidation/health-check-report_20260107_120530.txt`

**內容**:
- 完整檢查報告（同 Console 輸出）
- 詳細檢查項目清單
- 所有警告與錯誤項目
- 修復建議

---

### Exit Codes

| Exit Code | 描述 |
|-----------|------|
| `0` | 所有檢查通過（0 錯誤） |
| `1` | Supabase 未啟動 |
| `2` | 發現錯誤（ERROR 項目 > 0） |
| `3` | 發現警告（WARNING 項目 > 0，但無 ERROR） |
| `4` | 資料庫連線失敗 |
| `5` | 參數錯誤 |

---

## Check Categories Detail

### 1. Schema 一致性檢查 (85 項)

| 子類別 | 檢查項目數 | 描述 |
|--------|-----------|------|
| 表數量 | 1 | 驗證 18 個必要表存在 |
| 表存在性 | 18 | 逐一檢查每個表 |
| 欄位完整性 | 50 | 關鍵欄位存在性與型別 |
| 唯一性約束 | 12 | UNIQUE 約束檢查 |
| 外鍵約束 | 5 | FK 關聯檢查 |
| CHECK 約束 | 8 | 業務規則檢查 |

**範例檢查項目**:
- `tiers.shipping_fee` 欄位存在 (DECIMAL)
- `profiles.username` 欄位存在 (VARCHAR, UNIQUE)
- `products.tags` 欄位存在 (TEXT[])
- `orders.shipping_fee` 欄位存在 (DECIMAL)

---

### 2. 索引完整性檢查 (70 項)

| 子類別 | 檢查項目數 | 描述 |
|--------|-----------|------|
| 索引總數 | 1 | 65-75 個索引範圍檢查 |
| 基本索引 | 50 | 必要索引存在性 |
| 效能優化索引 | 12 | 新增效能索引 |
| GIN 索引 | 3 | 陣列與 JSONB 索引 |
| 重複索引檢測 | 1 | 偵測重複索引 |
| 未使用索引檢測 | 1 | 偵測未使用索引 |

**範例檢查項目**:
- `idx_products_series_status_updated` 存在
- `idx_orders_pending_created` 存在 (部分索引)
- `idx_products_tags` 存在 (GIN)
- 無重複索引

---

### 3. RLS 覆蓋率檢查 (40 項)

| 子類別 | 檢查項目數 | 描述 |
|--------|-----------|------|
| RLS 啟用狀態 | 19 | 100% 覆蓋率檢查 |
| Policy 數量 | 2 | 總數 >= 70 檢查 |
| 關鍵 Policy | 19 | 必要 Policy 存在性 |

**範例檢查項目**:
- `profiles.select_own` Policy 存在
- `orders.select_own` Policy 存在
- `coupons.select_active` Policy 存在
- `system_settings.select_public` Policy 存在

---

### 4. 函數授權檢查 (15 項)

| 子類別 | 檢查項目數 | 描述 |
|--------|-----------|------|
| 函數存在性 | 9 | 必要函數檢查 |
| 函數授權 | 5 | GRANT EXECUTE 檢查 |
| Trigger Function | 1 | `update_updated_at_column()` |

**範例檢查項目**:
- `generate_order_number()` 存在並授權
- `calculate_shipping_fee()` 存在並授權
- `mark_order_as_shipping()` 存在並授權

---

### 5. 約束完整性檢查 (15 項)

| 子類別 | 檢查項目數 | 描述 |
|--------|-----------|------|
| CHECK 約束總數 | 1 | >= 30 個檢查 |
| 關鍵 CHECK 約束 | 8 | 必要約束檢查 |
| 預設值檢查 | 6 | DEFAULT 值檢查 |

**範例檢查項目**:
- `orders.status` CHECK 約束 (pending/shipping/completed/cancelled)
- `profiles.role` CHECK 約束 (client/admin)
- `tiers.rank` CHECK 約束 (>= 0)

---

## Error Handling

### Error 1: Supabase 未啟動

**錯誤訊息**:
```
[ERROR] Supabase 未啟動，請先執行: supabase start
```

**解決方法**:
```powershell
supabase start
```

---

### Error 2: 發現錯誤項目

**錯誤訊息**:
```
[ERROR] 發現 3 個錯誤項目:
  [ERROR] 表缺失: announcements
  [ERROR] 欄位缺失: profiles.username
  [ERROR] 函數缺失: mark_order_as_shipping()
```

**解決方法**:
1. 檢查 Migration 是否正確執行
2. 執行 `supabase db reset`
3. 查看錯誤日誌

---

### Error 3: 資料庫連線失敗

**錯誤訊息**:
```
[ERROR] 資料庫連線失敗
原因: Connection refused
```

**解決方法**:
1. 檢查 Supabase 狀態 (`supabase status`)
2. 檢查資料庫連線參數
3. 重啟 Supabase (`supabase stop && supabase start`)

---

## Examples

### Example 1: 完整檢查（推薦）

```powershell
.\scripts\db-health-check.ps1
```

執行所有 225 個檢查項目，顯示完整報告。

---

### Example 2: 僅檢查索引

```powershell
.\scripts\db-health-check.ps1 -Category "Index"
```

適用於新增索引後驗證。

---

### Example 3: 儲存報告到檔案

```powershell
.\scripts\db-health-check.ps1 -SaveReport
```

報告儲存於: `specs/012-migration-consolidation/health-check-report_YYYYMMDD_HHMMSS.txt`

---

### Example 4: 詳細檢查過程

```powershell
.\scripts\db-health-check.ps1 -Verbose
```

輸出每個 SQL 查詢與檢查結果。

---

### Example 5: 模擬執行（測試用）

```powershell
.\scripts\db-health-check.ps1 -WhatIf
```

輸出：
```
[WHATIF] 將執行以下檢查：
  - Schema 一致性 (85 項)
  - 索引完整性 (70 項)
  - RLS 覆蓋率 (40 項)
  - 函數授權 (15 項)
  - 約束完整性 (15 項)
總計: 225 項
```

---

## Dependencies

### Required

- **Supabase CLI** (`supabase`)
- **PowerShell** 5.1+ or PowerShell Core 7+

### Optional

- **PostgreSQL Client Tools** (`psql`) - 用於執行 SQL 查詢

---

## Related Scripts

| Script | Description |
|--------|-------------|
| `safe-db-reset.ps1` | 安全重置資料庫 |
| `db-restore.ps1` | 還原資料庫備份 |

---

## Related Files

| File | Description |
|------|-------------|
| `specs/012-migration-consolidation/db-health-check.sql` | SQL 檢查指令（225+ 項） |
| `specs/012-migration-consolidation/health-check-checklist.md` | 完整檢查清單文件 |
| `specs/012-migration-consolidation/pg-system-tables-reference.md` | PostgreSQL 系統表查詢參考 |

---

## Security Notes

1. **本機環境限定**: 此腳本僅適用於本機 Docker Supabase
2. **唯讀操作**: 所有檢查均為 SELECT 查詢，不修改資料
3. **權限要求**: 需要 `postgres` 使用者權限（本機預設）

---

## Advanced Usage

### 整合到 CI/CD

```yaml
# GitHub Actions 範例
- name: Health Check
  run: |
    supabase start
    .\scripts\db-health-check.ps1 -SaveReport
    if ($LASTEXITCODE -ne 0) { exit 1 }
```

### 定期排程檢查

```powershell
# Windows Task Scheduler 範例
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument ".\scripts\db-health-check.ps1 -SaveReport"
$trigger = New-ScheduledTaskTrigger -Daily -At 9AM
Register-ScheduledTask -TaskName "DatabaseHealthCheck" -Action $action -Trigger $trigger
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-07 | 初始版本，225 個檢查項目 |

---

**Last Updated**: 2026-01-07
**Maintainer**: Claude Sonnet 4.5
