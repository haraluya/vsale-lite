# Views vs Materialized Views 決策指南
## Vsale-lite 報表系統快速參考

**最後更新**: 2026-01-03
**適用對象**: 開發者、架構師、產品經理
**文件位置**: 詳細研究見 `VIEWS_RESEARCH.md`

---

## 一句話建議

針對您的報表系統，**使用一般 Views 應對銷售和庫存分析，Materialized Views 用於複雜客戶分析**。

---

## 快速決策表

### 情況 1: 您正在建立「銷售報表」(訂單統計、營收分析)

```
推薦: 一般 Views ⭐⭐⭐⭐⭐

原因:
  ✅ 訂單資料每日新增 10-100 筆（更新頻繁）
  ✅ 查詢邏輯簡單（COUNT, SUM, AVG）
  ✅ 資料量小（日均 < 1000 筆查詢）
  ✅ 即時性要求高（需要最新訂單狀態）

預期性能:
  查詢時間: ~250ms
  延遲: 實時（無延遲）
  成本: 低（無額外儲存）

實作時間: 1-2 天

SQL 檔案位置: specs/005-reports-analytics/sql-examples.sql (Part 1)
Server Actions: lib/actions/analytics.ts getSalesOverview()
```

---

### 情況 2: 您正在建立「庫存分析」(庫存水位、缺貨預警)

```
推薦: 一般 Views ⭐⭐⭐⭐⭐

原因:
  ✅ 庫存變動隨時發生（高頻變化）
  ✅ 即時性要求最高（無法延遲）
  ✅ 支援負庫存需要實時計算
  ✅ 商品數有限（100-200 件）

預期性能:
  查詢時間: ~200ms
  延遲: 實時
  成本: 低

實作時間: 1 天

SQL 檔案位置: specs/005-reports-analytics/sql-examples.sql (Part 2)
Server Actions: lib/actions/analytics.ts getInventoryStatus()
```

---

### 情況 3: 您正在建立「客戶分析」(等級分佈、購買行為、客單價)

```
推薦: Materialized View ⭐⭐⭐⭐

原因:
  ✅ 計算複雜（6-way JOIN + GROUP BY）
  ✅ 資料量大（1000+ 客戶 × 12 個月）
  ✅ 更新頻率低（客戶資料每日新增 1-5 筆）
  ✅ 可接受日延遲（日刷新足夠）

預期性能:
  建立時間: ~5 秒
  查詢時間: ~15ms (快 133 倍)
  刷新時間: ~3-8 秒 (CONCURRENT)
  延遲: < 24 小時
  成本: 中等（儲存預計算結果）

實作時間: 2-3 天 (含刷新自動化)

SQL 檔案位置: specs/005-reports-analytics/sql-examples.sql (Part 3, 4)
Server Actions: lib/actions/analytics.ts getCustomerAnalytics()
自動化: app/api/cron/refresh-analytics/route.ts
```

---

## 關鍵差異對照

| 項目 | 一般 Views | Materialized Views |
|------|-----------|-------------------|
| **查詢速度** | 中等 (100-300ms) | 快速 (10-50ms) |
| **資料即時性** | 完美（實時） | 延遲（需 REFRESH） |
| **儲存空間** | 無 | 中等（儲存計算結果） |
| **維護成本** | 低 | 中等（需維護 REFRESH）  |
| **索引支援** | 無 | 有（支援UNIQUE INDEX） |
| **RLS 支援** | 有（直接應用） | 無（需 Server Action 驗證） |
| **適合資料量** | < 10,000 筆 | > 100,000 筆 |
| **計算複雜度** | 低-中 | 中-高 |
| **更新頻率** | 任意 | 低頻（每日/每周） |

---

## 實作路徑

### 快速上線 (1-2 天)
```
Day 1:
  [ ] 在 Supabase Studio 執行 sql-examples.sql (Part 1, 2)
  [ ] 測試查詢效能 (應 < 300ms)
  [ ] 在 lib/actions/analytics.ts 建立 getSalesOverview() 與 getInventoryStatus()
  [ ] 建立 React 元件顯示基本圖表

Day 2:
  [ ] 新增篩選與排序功能
  [ ] 最佳化 CSS 符合 Neo-Brutalism 風格
  [ ] 全面效能測試
  [ ] 部署到預發環境
```

### 完整實裝 (3-5 天)
```
Day 1-2: (快速上線)
  [如上]

Day 3:
  [ ] 在 Supabase Studio 執行 sql-examples.sql (Part 3, 4)
  [ ] 測試 Materialized View REFRESH (應 < 10 秒)
  [ ] 建立 refresh_customer_analytics() Function

Day 4:
  [ ] 設置 Firebase Cloud Scheduler (每日凌晨 2 點)
  [ ] 在 lib/actions/analytics.ts 建立 getCustomerAnalytics()
  [ ] 建立客戶分析元件與圖表

Day 5:
  [ ] 新增資料匯出功能 (CSV/PDF)
  [ ] 建立監控與告警 (REFRESH 失敗通知)
  [ ] 壓力測試與效能優化
  [ ] 生產部署
```

---

## 效能預期與優化

### 銷售報表（Views）

```
目前預期:  ~250ms ✅ 符合 < 500ms 目標

如果超過 500ms:
  1. 檢查網路延遲 (應 < 50ms)
  2. 檢查 ORDER BY 子句，確認有索引
  3. 檢查 GROUP BY 欄位，確認有索引
  4. 考慮改用 Materialized View
  5. 考慮新增 WHERE 過濾範圍（如只查最近 30 天）

優化指令:
  EXPLAIN ANALYZE
  SELECT * FROM vw_daily_sales_summary LIMIT 30;
  -- 檢查 Seq Scan 與 Index Scan
```

### 客戶分析（Materialized View）

```
查詢預期: ~15ms ✅ (已預先計算)
REFRESH 預期: ~5 秒 ✅

如果 REFRESH 超過 15 秒:
  1. 檢查硬體資源 (CPU, RAM)
  2. 檢查是否有長時間鎖定的查詢
  3. 簡化 View 邏輯 (移除不必要的計算)
  4. 增加索引

監控指令:
  SELECT * FROM refresh_customer_analytics();
```

---

## 生產環境檢查清單

### 部署前檢查

- [ ] 所有 Views 已在本地環境測試
- [ ] 所有查詢效能 < 500ms (p95)
- [ ] Materialized Views 建立了 UNIQUE INDEX
- [ ] REFRESH 函數測試成功 (< 15 秒)
- [ ] Firebase Cloud Scheduler 已設置
- [ ] Server Actions 權限檢查已實裝
- [ ] 效能監控代碼已加入 (performance.now())
- [ ] 錯誤處理覆蓋所有失敗路徑

### 部署後監控

- [ ] 監控每個查詢的執行時間
- [ ] 若 REFRESH 失敗，發送 Slack 告警
- [ ] 每周檢查 Views 大小與磁碟使用
- [ ] 追蹤慢查詢並優化

---

## 常見問題解答

### Q: 我應該從 Views 開始還是直接用 Materialized Views?

**A**: 優先用 Views，除非:
- 查詢已經超過 1 秒
- 計算涉及 20+ 表的 JOIN
- 需要支援 100,000+ 筆資料的聚合

Views 更簡單、更易維護、不需額外 REFRESH 邏輯。

---

### Q: Materialized View 的 REFRESH 需要多久?

**A**: 對於您的規模:
- `mv_customer_stats`: ~3-5 秒
- `mv_tier_distribution`: ~1-2 秒
- **總計**: ~5-8 秒 (使用 CONCURRENT REFRESH)

可接受的 REFRESH 時間，可每日執行。

---

### Q: 如果 REFRESH 期間查詢會怎樣?

**A**: 使用 `REFRESH MATERIALIZED VIEW CONCURRENTLY` 的話:
- 讀查詢可以繼續進行
- 可能讀到部分刷新的資料
- 若需要完全一致，改用標準 REFRESH (會鎖表)

對於報表系統，部分刷新的資料可接受。

---

### Q: Materialized Views 會增加多少儲存?

**A**: 估算:
```
mv_customer_stats (1,000 客戶):
  預估大小: ~1-2 MB

mv_tier_distribution (5-10 等級):
  預估大小: ~50 KB

總計: 2-3 MB (可忽略)
```

---

### Q: 能否為 Views 建立索引?

**A**: 不行。Views 不儲存資料，只儲存查詢邏輯。

但可以:
- 為底層表建立索引 ✅
- 為 Materialized Views 建立索引 ✅

建議在 sql-examples.sql (Part 5) 中的索引都加上。

---

### Q: Supabase RLS 在 Views 上如何運作?

**A**: 有兩種方案:

**方案 1: View 中使用 auth.uid() (推薦)**
```sql
CREATE VIEW vw_customer_orders AS
SELECT * FROM orders
WHERE user_id = auth.uid();  -- 自動過濾
```

**方案 2: Server Action 中驗證 (更推薦)**
```typescript
export async function getAdminReport() {
  const { role } = await checkAuth();
  if (role !== 'admin') return { success: false };

  // 僅管理員能查詢
  const { data } = await supabase.from('vw_admin_sales').select();
  return data;
}
```

對於報表系統，方案 2 更簡潔。

---

## 檔案位置速查

| 檔案 | 內容 | 用途 |
|------|------|------|
| `VIEWS_RESEARCH.md` | 詳細研究報告 | 深入了解理論 |
| `sql-examples.sql` | 完整 SQL 實作 | 複製到 Supabase 執行 |
| `server-actions-example.ts` | TypeScript 範例 | 參考實作 Server Actions |
| `DECISION_GUIDE.md` | 本文件 | 快速決策參考 |

---

## 後續步驟

### 立即執行 (今天)

1. 閱讀本文件 (Decision Guide)
2. 確認要使用 Views + Materialized Views 混合策略
3. 通知團隊預期時程表

### 開始開發 (本周)

1. 複製 `sql-examples.sql` 至 Supabase Studio
2. 執行 Part 1, 2 (銷售和庫存 Views)
3. 本地測試所有查詢
4. 建立 Server Actions

### 完整實裝 (2-3 周)

1. 執行 Part 3, 4 (客戶分析 Materialized Views)
2. 設置 REFRESH 自動化
3. 建立監控與告警
4. React 元件開發與集成
5. 效能測試與優化
6. 生產部署

---

## 技術支援

有問題時，參考以下順序:

1. **本決策指南** (DECISION_GUIDE.md) - 快速答案
2. **詳細研究** (VIEWS_RESEARCH.md) - 深入理解
3. **SQL 範例** (sql-examples.sql) - 具體實作
4. **Server Actions 範例** (server-actions-example.ts) - 程式碼參考
5. **PostgreSQL 官方文件** - 最終權威

---

**文件版本**: 1.0.0
**狀態**: 完成，可立即使用
**最後審查**: 2026-01-03
