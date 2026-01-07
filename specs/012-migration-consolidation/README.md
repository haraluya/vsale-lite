# 索引優化策略 - 快速參考

**Feature**: 012-migration-consolidation
**目標**: 提升商品列表與訂單查詢效能 30-70%
**狀態**: ✅ Migration 已完成，待效能測試驗證

---

## 一、核心索引摘要

### 1.1 新增索引列表

| 索引名稱 | 類型 | 目標場景 | 預期提升 |
|---------|-----|---------|---------|
| `idx_products_series_status_updated` | 複合索引 + 部分索引 | 商品列表查詢（系列篩選） | 50-70% |
| `idx_orders_pending_created` | 部分索引 | 待處理訂單查詢 | 60-80% |
| `idx_orders_user_status_created` | 複合索引 | 客戶訂單列表 | 30-50% |
| `idx_products_tags` | GIN 索引 | 標籤搜尋 | 80-90% ✅ 已存在 |

---

## 二、快速指令

### 2.1 執行 Migration

```bash
# 本地環境
supabase db reset

# 遠端環境（生產）
supabase db push
```

### 2.2 效能測試（EXPLAIN ANALYZE）

```sql
-- 測試 1: 商品列表
EXPLAIN ANALYZE
SELECT * FROM products
WHERE series_id = (SELECT id FROM series LIMIT 1)
  AND status = 'active'
ORDER BY updated_at DESC
LIMIT 20;

-- 測試 2: 待處理訂單
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE status = 'pending'
ORDER BY created_at ASC
LIMIT 20;

-- 測試 3: 客戶訂單列表
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE user_id = (SELECT id FROM profiles LIMIT 1)
  AND status = 'completed'
ORDER BY created_at DESC
LIMIT 20;

-- 測試 4: 標籤搜尋
EXPLAIN ANALYZE
SELECT * FROM products
WHERE tags @> ARRAY['熱銷'];
```

### 2.3 索引維護

```sql
-- 更新統計資訊
ANALYZE products;
ANALYZE orders;

-- 重建索引（每月一次）
REINDEX INDEX idx_products_series_status_updated;
REINDEX INDEX idx_orders_pending_created;
REINDEX INDEX idx_orders_user_status_created;
REINDEX INDEX idx_products_tags;
```

---

## 三、文件結構

```
specs/012-migration-consolidation/
├── README.md                          # 本文件（快速參考）
├── index-optimization-research.md     # 完整研究報告
└── performance-test-guide.md          # 效能測試指南

supabase/migrations/
└── 20260127_add_performance_indexes.sql  # Migration 檔案
```

---

## 四、預期效果

### 4.1 效能提升目標

| 查詢場景 | 當前執行時間 | 目標執行時間 | 預期提升 |
|---------|------------|------------|---------|
| 商品列表（系列篩選） | 150ms | 50ms | 66% |
| 待處理訂單查詢 | 200ms | 60ms | 70% |
| 客戶訂單列表 | 100ms | 50ms | 50% |
| 標籤搜尋 | 300ms | 50ms | 83% |
| **整體平均** | **187.5ms** | **52.5ms** | **72%** |

### 4.2 索引策略說明

**複合索引 (Composite Index)**:
- 涵蓋多個欄位（如 `series_id, status, updated_at`）
- 查詢必須按順序使用欄位才能生效
- 適合篩選 + 排序組合查詢

**部分索引 (Partial Index)**:
- 僅索引符合特定條件的資料（如 `WHERE status = 'active'`）
- 體積小、效能高
- 適合高頻查詢特定狀態資料

**GIN 索引 (Generalized Inverted Index)**:
- 支援陣列、JSONB、全文搜尋
- 建立較慢、體積較大
- 適合複雜資料結構查詢

---

## 五、注意事項

### ⚠️ 限制與已知問題

1. **模糊搜尋無法優化**:
   - `ILIKE '%search%'` 查詢無法使用 B-Tree 索引
   - 若需優化，可考慮 PostgreSQL Full-Text Search 或 Elasticsearch

2. **索引維護成本**:
   - 每個索引會增加 INSERT/UPDATE/DELETE 成本（約 5-10%）
   - 建議定期執行 `REINDEX` 維護索引（每月一次）

3. **索引體積監控**:
   - 索引體積應 < 資料表體積 50%
   - 使用 `pg_relation_size()` 監控索引大小

### ✅ 最佳實踐

1. **執行 EXPLAIN ANALYZE 驗證**:
   - 確認查詢計畫使用 Index Scan（而非 Seq Scan）
   - 比較索引前後的 Execution Time

2. **更新統計資訊**:
   - Migration 執行後立即執行 `ANALYZE` 指令
   - 確保查詢優化器使用最新統計資訊

3. **監控索引使用率**:
   - 使用 `pg_stat_user_indexes` 檢查索引是否被使用
   - 移除未使用的索引（`idx_scan = 0`）

---

## 六、下一步行動

### Phase 1: 立即執行（核心優化）
- [ ] 執行 Migration `20260127_add_performance_indexes.sql`
- [ ] 執行效能測試（參考 `performance-test-guide.md`）
- [ ] 驗證索引生效（EXPLAIN ANALYZE）
- [ ] 監控索引體積與使用率

### Phase 2: 漸進優化（可選）
- [ ] 觀察查詢計畫，評估是否移除舊索引 `idx_orders_user_status`
- [ ] 評估是否需要優化模糊搜尋（Full-Text Search）
- [ ] 定期維護索引（每月 REINDEX）

### Phase 3: 長期監控
- [ ] 監控查詢效能指標（Sentry/New Relic）
- [ ] 分析慢查詢日誌（`pg_stat_statements`）
- [ ] 根據實際使用情況調整索引策略

---

## 七、相關資源

**內部文件**:
- [完整研究報告](./index-optimization-research.md) - 詳細查詢模式分析與索引設計
- [效能測試指南](./performance-test-guide.md) - EXPLAIN ANALYZE 測試步驟
- [資料庫安全協議](../../docs/DATABASE_SAFETY_PROTOCOL.md) - Migration 安全規範

**PostgreSQL 官方文件**:
- [Indexes](https://www.postgresql.org/docs/current/indexes.html) - 索引基礎概念
- [Index Types](https://www.postgresql.org/docs/current/indexes-types.html) - B-Tree, GIN, GiST 等索引類型
- [Partial Indexes](https://www.postgresql.org/docs/current/indexes-partial.html) - 部分索引使用指南
- [EXPLAIN](https://www.postgresql.org/docs/current/sql-explain.html) - 查詢計畫分析

**效能優化參考**:
- [Use The Index, Luke!](https://use-the-index-luke.com/) - 索引優化最佳實踐
- [PostgreSQL Wiki: Performance Optimization](https://wiki.postgresql.org/wiki/Performance_Optimization) - 官方效能優化指南

---

**文件版本**: 1.0.0
**最後更新**: 2026-01-07
**維護人員**: Claude Code
**聯絡方式**: 參考專案 CLAUDE.md
