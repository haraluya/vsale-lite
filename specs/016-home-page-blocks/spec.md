# Feature Specification: 首頁廣告區塊系統 (Home Page Blocks System)

**Feature Branch**: `016-home-page-blocks`
**Created**: 2026-01-13
**Status**: Draft
**Input**: 首頁廣告區塊系統：前台改造為雙入口模式（首頁/商品頁），支援三種區塊類型（圖片輪播、商品展示、文字區塊），後台統一管理

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 前台路由與導覽切換 (Priority: P0)

客戶進入前台後，可以在「首頁」和「商品頁」之間切換，首頁顯示廣告區塊，商品頁顯示系列與商品列表。

**Why this priority**: 這是前台架構重構的核心，所有其他功能都建立在此基礎上。

**Independent Test**: 客戶可以從 `/store` 自動導向首頁，使用 Segment Control 切換到商品頁，兩個頁面都顯示歡迎字樣與會員等級。

**Acceptance Scenarios**:

1. **Given** 客戶已登入，**When** 訪問 `/store`，**Then** 自動導向 `/store/home`（首頁）
2. **Given** 客戶在首頁，**When** 點擊 Segment Control 的「商品」按鈕，**Then** 頁面切換到 `/store/products`，「商品」按鈕高亮顯示（綠色背景）
3. **Given** 客戶在商品頁，**When** 點擊 Segment Control 的「首頁」按鈕，**Then** 頁面切換到 `/store/home`，「首頁」按鈕高亮顯示（綠色背景）
4. **Given** 客戶在首頁或商品頁，**When** 頁面載入完成，**Then** Segment Control 下方顯示「{用戶名} 您好！會員等級: {等級名稱}」
5. **Given** 客戶使用手機裝置，**When** 查看 Segment Control，**Then** 按鈕高度至少 44px，符合觸控目標標準

---

### User Story 2 - 圖片輪播區塊 (Priority: P0)

客戶在首頁看到圖片輪播區塊，可以自動播放或手動切換圖片，點擊圖片可跳轉到指定系列頁面。

**Why this priority**: 圖片輪播是首頁的核心宣傳工具，直接影響客戶的視覺體驗與導流效果。

**Independent Test**: 客戶可以看到自動輪播的廣告圖片，點擊圖片下方的指示器切換圖片，點擊圖片本身跳轉到指定系列。

**Acceptance Scenarios**:

1. **Given** 首頁有圖片輪播區塊（包含 3 張圖片），**When** 頁面載入完成，**Then** 顯示第一張圖片，並在圖片下方顯示 3 個指示器圓點，第一個圓點為黑色（當前圖片）
2. **Given** 圖片輪播區塊設定為自動播放（間隔 5 秒），**When** 等待 5 秒，**Then** 圖片自動切換到第二張，第二個圓點變為黑色
3. **Given** 客戶在查看圖片輪播區塊，**When** 點擊第三個指示器圓點，**Then** 圖片立即切換到第三張，自動播放重新計時
4. **Given** 圖片輪播區塊的第一張圖片連結到「水果系列」，**When** 客戶點擊該圖片，**Then** 頁面跳轉到 `/store/products/series/{水果系列ID}`
5. **Given** 圖片輪播區塊的第二張圖片未設定連結，**When** 客戶點擊該圖片，**Then** 無任何跳轉行為（純展示）

---

### User Story 3 - 商品展示區塊 (Priority: P0)

客戶在首頁看到商品展示區塊，顯示指定系列或標籤的商品卡片，可左右滑動查看更多商品，點擊商品卡片跳轉到商品詳情頁。

**Why this priority**: 商品展示區塊是首頁的核心轉換工具，直接影響客戶的購買決策。

**Independent Test**: 客戶可以看到商品卡片網格，左右滑動查看更多商品，點擊商品卡片跳轉到商品詳情頁。

**Acceptance Scenarios**:

1. **Given** 首頁有商品展示區塊（選擇「水果系列」，最大顯示 6 個商品），**When** 頁面載入完成，**Then** 顯示水果系列的前 6 個商品卡片，手機版一排 2 個，桌面版一排 3 個
2. **Given** 商品展示區塊顯示 10 個商品（超過一排），**When** 客戶查看區塊，**Then** 顯示「← 左右滑動查看更多 →」提示，客戶可以左右滑動查看所有商品
3. **Given** 商品展示區塊僅顯示 2 個商品（手機版一排），**When** 客戶查看區塊，**Then** 不顯示滑動提示，所有商品一次性展示完畢
4. **Given** 商品展示區塊選擇「水果系列」並篩選「冷凍標籤」（AND 邏輯），**When** 頁面載入完成，**Then** 僅顯示同時屬於水果系列且具有冷凍標籤的商品
5. **Given** 客戶點擊商品卡片「蘋果」，**When** 點擊完成，**Then** 頁面跳轉到 `/store/products/{蘋果商品ID}`

---

### User Story 4 - 文字區塊 (Priority: P1)

客戶在首頁看到文字區塊，顯示管理員自訂的宣傳文字，支援自訂字體大小與顏色。

**Why this priority**: 文字區塊提供彈性的宣傳內容管理，補充圖片與商品之外的文字說明。

**Independent Test**: 客戶可以看到自訂字體大小與顏色的文字區塊。

**Acceptance Scenarios**:

1. **Given** 首頁有文字區塊（內容「新春優惠，全館 8 折起！」，字體大小 32px，顏色紅色 #FF0000），**When** 頁面載入完成，**Then** 顯示紅色的大字標語
2. **Given** 客戶使用手機裝置，**When** 查看文字區塊，**Then** 文字區塊寬度自適應螢幕寬度，文字不會超出邊界
3. **Given** 文字區塊內容為「歡迎光臨！我們提供最新鮮的水果與蔬菜」（字體大小 16px，顏色黑色 #000000），**When** 頁面載入完成，**Then** 顯示正常大小的黑色文字

---

### User Story 5 - 管理員建立與管理首頁廣告區塊 (Priority: P0)

管理員在後台建立首頁廣告區塊，選擇區塊類型（圖片輪播、商品展示、文字區塊），設定對應參數，並可查看、編輯、刪除區塊。

**Why this priority**: 區塊管理是首頁內容管理的核心，必須優先實作。

**Independent Test**: 管理員可以建立各種類型的區塊，設定所有參數，保存後在區塊列表中看到新建立的區塊，並可編輯或刪除。

**Acceptance Scenarios**:

1. **Given** 管理員在後台「廣告管理」頁面，**When** 點擊「首頁廣告」Tab，**Then** 顯示首頁廣告區塊列表與「新增區塊」按鈕
2. **Given** 管理員點擊「新增區塊」按鈕，**When** 表單載入完成，**Then** 顯示區塊名稱欄位、區塊類型下拉選單（圖片輪播/商品展示/文字區塊）、啟用狀態開關
3. **Given** 管理員選擇「圖片輪播」類型，**When** 表單更新完成，**Then** 顯示「上傳圖片」欄位（支援最多 5 張）、「自動播放」開關、「輪播間隔（毫秒）」輸入框
4. **Given** 管理員選擇「商品展示」類型，**When** 表單更新完成，**Then** 顯示「選擇系列」下拉選單、「選擇標籤」下拉選單、「最大顯示數量」輸入框
5. **Given** 管理員選擇「文字區塊」類型，**When** 表單更新完成，**Then** 顯示「文字內容」文字框、「字體大小」下拉選單（12px, 16px, 20px, 24px, 32px, 40px, 48px）、「字體顏色」顏色選擇器
6. **Given** 管理員建立一個圖片輪播區塊（上傳 3 張圖片，自動播放，間隔 5 秒），**When** 點擊「建立區塊」按鈕，**Then** 顯示「區塊已建立」成功訊息，跳轉到區塊列表頁面，新區塊出現在列表頂部
7. **Given** 管理員在區塊列表查看剛建立的圖片輪播區塊，**When** 查看區塊卡片，**Then** 顯示縮圖（第一張圖片）、區塊名稱、區塊類型「圖片輪播」、「編輯」與「刪除」按鈕

---

### User Story 6 - 管理員調整區塊排序 (Priority: P0)

管理員在後台調整首頁廣告區塊的顯示順序，前台按照管理員設定的順序顯示區塊。

**Why this priority**: 排序功能影響首頁的內容布局與優先級，必須優先實作。

**Independent Test**: 管理員可以使用上移/下移按鈕調整區塊順序，前台立即反映順序變更。

**Acceptance Scenarios**:

1. **Given** 區塊列表有 3 個區塊（A、B、C），**When** 管理員點擊區塊 B 的「向上移動」按鈕，**Then** 區塊順序變為 B、A、C
2. **Given** 區塊列表有 3 個區塊（A、B、C），**When** 管理員點擊區塊 B 的「向下移動」按鈕，**Then** 區塊順序變為 A、C、B
3. **Given** 區塊 A 是列表中的第一個區塊，**When** 管理員查看區塊卡片，**Then** 「向上移動」按鈕顯示為灰色且不可點擊
4. **Given** 區塊 C 是列表中的最後一個區塊，**When** 管理員查看區塊卡片，**Then** 「向下移動」按鈕顯示為灰色且不可點擊
5. **Given** 管理員調整區塊順序為 B、A、C，**When** 客戶刷新前台首頁，**Then** 區塊顯示順序為 B、A、C

---

### User Story 7 - 圖片清理與資料一致性 (Priority: P0)

系統在刪除或更換區塊圖片時，自動清理 Supabase Storage 中的舊圖片檔案，避免孤兒檔案殘留。

**Why this priority**: 圖片清理確保儲存空間的有效利用與資料一致性，防止資源浪費。

**Independent Test**: 管理員刪除區塊或更換圖片後，Supabase Storage 中的舊圖片檔案被自動刪除。

**Acceptance Scenarios**:

1. **Given** 管理員刪除包含 3 張圖片的圖片輪播區塊，**When** 刪除操作完成，**Then** Supabase Storage 中該區塊的 3 張圖片全部被刪除
2. **Given** 管理員編輯圖片輪播區塊，將第 2 張圖片更換為新圖片，**When** 更換操作完成，**Then** 舊的第 2 張圖片被刪除，新圖片上傳成功
3. **Given** 管理員將圖片輪播區塊從 5 張圖片減少到 3 張圖片，**When** 保存操作完成，**Then** 第 4 張和第 5 張圖片從 Storage 中刪除
4. **Given** 管理員將圖片輪播區塊的類型變更為文字區塊，**When** 保存操作完成，**Then** 該區塊的所有圖片從 Storage 中刪除
5. **Given** 圖片刪除操作失敗（網路錯誤），**When** 查看控制台日誌，**Then** 系統記錄警告訊息但不阻斷主流程（容錯設計）

---

### User Story 8 - 後台廣告管理整合與 Tab 切換 (Priority: P1)

管理員在後台「廣告管理」頁面使用 Tab 切換器，切換「商品頁廣告」和「首頁廣告」兩個功能區域。

**Why this priority**: Tab 整合統一了廣告管理的入口，提升管理效率。

**Independent Test**: 管理員可以在「商品頁廣告」和「首頁廣告」之間自由切換，兩個功能互不干擾。

**Acceptance Scenarios**:

1. **Given** 管理員訪問 `/admin/announcements`，**When** 頁面載入完成，**Then** 顯示兩個 Tab：「商品頁廣告」（高亮）和「首頁廣告」
2. **Given** 管理員點擊「首頁廣告」Tab，**When** 頁面切換完成，**Then** 「首頁廣告」Tab 高亮，顯示首頁廣告區塊列表
3. **Given** 管理員在「首頁廣告」Tab 中，**When** 點擊「商品頁廣告」Tab，**Then** 「商品頁廣告」Tab 高亮，顯示商品頁廣告列表（現有功能）
4. **Given** 管理員在「首頁廣告」Tab 中新增一個區塊，**When** 切換到「商品頁廣告」Tab 後再切換回來，**Then** 新增的區塊仍然存在於列表中

---

## Functional Requirements *(mandatory)*

### FR1 - 前台路由架構
1. **路由重構與重定向**: `/store` 自動導向 `/store/home`（永久重定向 HTTP 301），`/store/home` 顯示廣告區塊容器
2. **商品頁路由**: `/store/products` 顯示現有的系列與商品列表（移動現有 `/store/page.tsx` 內容）
3. **Segment Control**: 前台 Layout 新增切換器，支援「首頁」與「商品」兩個按鈕，當前頁面高亮（綠色背景 + Neo-Brutalism 陰影）
4. **歡迎字樣**: Segment Control 下方顯示「{用戶名} 您好！會員等級: {等級名稱}」

### FR2 - 圖片輪播區塊前台顯示
1. **自動播放**: 支援自動輪播（間隔可設定，預設 5 秒）
2. **手動切換**: 提供指示器圓點，點擊可切換圖片
3. **連結跳轉**: 支援圖片連結到指定系列頁面（可選）
4. **響應式設計**: 圖片高度手機 256px (h-64)，桌面 384px (h-96)
5. **Neo-Brutalism 風格**: 黑色邊框、硬邊陰影

### FR3 - 商品展示區塊前台顯示
1. **商品篩選**: 支援系列與標籤的 AND 邏輯篩選
2. **最大數量限制**: 支援限制最大顯示商品數量（可選）
3. **響應式網格**: 手機一排 2 個，桌面一排 3 個
4. **左右滑動**: 使用 CSS scroll-snap 實現原生滑動體驗
5. **滑動提示**: 當商品數量超過一排時，顯示「← 左右滑動查看更多 →」提示
6. **價格整合**: 自動查詢用戶等級價格並顯示在商品卡片

### FR4 - 文字區塊前台顯示
1. **字體大小**: 支援 7 個固定尺寸（12px, 16px, 20px, 24px, 32px, 40px, 48px）
2. **字體顏色**: 支援自訂顏色（Hex 格式 #RRGGBB）
3. **內容長度限制**: 最多 1000 字元
4. **響應式設計**: 文字寬度自適應螢幕寬度

### FR5 - 後台區塊管理（CRUD）
1. **建立區塊**: 支援三種類型選擇，依類型顯示對應表單欄位
2. **編輯區塊**: 支援修改所有參數，圖片輪播區塊支援更換圖片
3. **刪除區塊**: 刪除時自動清理關聯圖片（調用圖片清理函式）
4. **查詢區塊**: 管理員可查看所有區塊（含停用），客戶僅能查看啟用區塊
5. **啟用/停用**: 支援切換區塊的 is_active 狀態

### FR6 - 後台區塊排序
1. **上移按鈕**: 交換當前區塊與上一個區塊的 sort_order
2. **下移按鈕**: 交換當前區塊與下一個區塊的 sort_order
3. **按鈕禁用**: 第一個區塊的上移按鈕、最後一個區塊的下移按鈕顯示為灰色且不可點擊
4. **即時更新**: 排序變更後立即重新載入列表

### FR7 - 圖片清理邏輯
1. **刪除區塊場景**: 批次刪除該區塊目錄下所有圖片檔案
2. **更換圖片場景**: 先刪除指定索引的舊圖片（所有副檔名），再上傳新圖片
3. **減少圖片數量場景**: 刪除多餘的圖片檔案（如從 5 張減少到 3 張，刪除第 4、5 張）
4. **區塊類型變更場景**: 若新類型不需圖片，刪除該區塊的所有圖片
5. **容錯機制**: 圖片刪除失敗時記錄警告但不阻斷主流程

### FR8 - 資料庫設計
1. **home_page_blocks 表**: 包含 id, name, block_type, config (JSONB), sort_order, is_active, created_at, updated_at
2. **JSONB Config 欄位**: 依區塊類型儲存不同結構的配置（圖片輪播、商品展示、文字區塊）
3. **RLS 策略**: 客戶僅能查看 is_active = true 的區塊，管理員可查看所有區塊
4. **索引優化**: is_active + sort_order 複合索引，block_type 索引

### FR9 - Server Actions
1. **前台查詢**: getActiveHomeBlocks(), getProductsByBlockConfig()
2. **後台管理**: getAllHomeBlocks(), getHomeBlockById(), createHomeBlock(), updateHomeBlock(), deleteHomeBlock()
3. **排序功能**: moveBlockUp(), moveBlockDown()
4. **圖片操作**: uploadBlockImage(), deleteBlockImage()
5. **權限檢查**: 所有後台 Actions 必須呼叫 checkAuth('admin')

### FR10 - 圖片儲存路徑
1. **路徑規則**: `home-page-blocks/{block_id}/image-{index}.{ext}`
2. **支援格式**: JPG, PNG, WebP
3. **檔案大小限制**: 最大 5MB
4. **Storage Bucket**: 使用現有的 `products` bucket

---

## Success Criteria *(mandatory)*

1. **功能完整性**: 所有 User Story 的 Acceptance Scenarios 全部通過測試
2. **響應式設計**: 手機版與桌面版的邊框、陰影、間距符合 Neo-Brutalism 規範
3. **效能指標**:
   - **首頁載入時間 < 2 秒**: 從 `/store/home` 導航開始到 FCP (First Contentful Paint)，使用 Chrome DevTools Lighthouse，模擬 4G Fast (4Mbps)
   - **商品查詢時間 < 300ms**: 商品展示區塊的 `getProductsByBlockConfig()` Server Action 響應時間
4. **圖片清理成功率**: 四種清理場景的成功率 > 95%（允許 5% 的網路錯誤容錯）
5. **權限安全**: 非管理員無法訪問後台管理 API，客戶僅能查看啟用區塊
6. **無障礙支援**: 所有按鈕提供 aria-label，觸控目標符合 WCAG 2.1 AA 標準（≥ 44px）
7. **使用者反饋**: 管理員反饋區塊管理流程順暢，客戶反饋首頁視覺吸引力提升

---

## Key Entities *(optional)*

### HomePageBlock
- **Attributes**: id, name, block_type, config (JSONB), sort_order, is_active, created_at, updated_at
- **block_type**: 'image_carousel' | 'product_display' | 'text_block'
- **config 結構**:
  - **圖片輪播**: { images: [{url, series_id?}], auto_play, interval_ms }
  - **商品展示**: { series_ids?, tag_ids?, max_items? }
  - **文字區塊**: { content, font_size, color }

---

## Assumptions *(optional)*

1. **圖片格式**: 假設圖片格式支援 JPG、PNG、WebP，不支援 GIF 或其他動畫格式
2. **輪播間隔**: 假設輪播間隔預設 5 秒，最小 1 秒（1000ms）
3. **商品查詢邏輯**: 假設商品展示區塊支援系列與標籤的 AND 邏輯（同時符合兩者）
4. **字體大小**: 假設文字區塊的字體大小固定為 7 個選項，不支援自由輸入
5. **顏色格式**: 假設文字區塊的顏色格式為 Hex（#RRGGBB），不支援 RGB 或 HSL
6. **圖片清理容錯**: 假設圖片清理失敗時僅記錄警告，不阻斷主流程（避免影響使用者體驗）
7. **區塊排序**: 假設區塊排序使用上移/下移按鈕，不使用拖曳排序（避免引入重量級套件）
8. **圖片尺寸**: 假設圖片輪播區塊的圖片高度固定（手機 256px，桌面 384px），不支援自訂高度

---

## Constraints *(optional)*

1. **現有架構**: 必須遵循 Vsale-lite 專案的現有架構規範（Neo-Brutalism 設計、Server Actions 模式、統一對話框 API）
2. **效能要求**: 首頁載入時間必須 < 2 秒（Mobile 4G），避免引入重量級套件
3. **儲存空間**: 圖片總大小不得超過 Supabase 免費版限制（1GB），需實作圖片清理邏輯
4. **相容性**: 前台路由重構後，舊的 `/store` 連結必須自動導向新的 `/store/home`（SEO 考量）
5. **權限控制**: 所有後台 API 必須強制執行 checkAuth('admin')，防止越權操作
6. **響應式設計**: 所有 UI 元件必須符合 WCAG 2.1 AA 無障礙標準（觸控目標 ≥ 44px，色彩對比 ≥ 4.5:1）

---

## Dependencies *(optional)*

1. **現有功能**: 依賴現有的系列管理（003-series-and-pricing）與商品管理（002-product-management）功能
2. **認證系統**: 依賴現有的認證系統（001-user-tier-management）與權限檢查機制
3. **圖片上傳**: 依賴現有的 Supabase Storage 圖片上傳機制（參考 announcements.ts 的 uploadAnnouncementImage）
4. **商品卡片元件**: 依賴現有的 ProductWithPriceCard 元件（004-cart-and-orders）
5. **統一對話框**: 依賴現有的統一對話框 Hook（013-unified-dialog）

---

## Out of Scope *(optional)*

1. **拖曳排序**: 不實作區塊拖曳排序功能（使用上移/下移按鈕替代）
2. **圖片編輯**: 不提供圖片裁剪、濾鏡等編輯功能（上傳原圖）
3. **動畫效果**: 圖片輪播不實作淡入淡出動畫（使用即時切換）
4. **A/B 測試**: 不實作區塊的 A/B 測試功能
5. **定時發布**: 不實作區塊的定時生效功能（僅支援立即生效/停用）
6. **多語言支援**: 不實作區塊內容的多語言版本
7. **統計分析**: 不實作區塊點擊率、商品曝光數等統計功能
8. **商品無限滾動**: 商品展示區塊不實作無限滾動或分頁載入（一次性載入所有商品）
9. **文字 Markdown**: 文字區塊不支援 Markdown 語法（純文字顯示）

---

## Notes *(optional)*

### 設計決策理由

1. **為何使用 JSONB Config 欄位？**
   - 三種區塊類型的配置差異大，使用 JSONB 避免過度正規化
   - 彈性支援未來新增區塊類型，無需變更表結構
   - Zod Schema 驗證確保資料正確性

2. **為何使用上移/下移按鈕而非拖曳排序？**
   - 拖曳排序需引入 @dnd-kit 庫（約 50KB），增加打包大小
   - 上移/下移按鈕實作簡單，無需額外依賴
   - 符合專案「輕量化」原則

3. **為何使用 CSS scroll-snap 而非第三方輪播庫？**
   - 原生 CSS 效能最佳，支援觸控滑動
   - 避免引入重量級套件（如 Swiper、Slick）
   - 符合專案「減少依賴」原則

4. **為何圖片清理失敗不阻斷主流程？**
   - 圖片清理失敗通常是網路錯誤（暫時性）
   - 阻斷主流程會影響使用者體驗（無法刪除區塊）
   - 可實作 Cron Job 定期清理孤兒檔案（未來優化）

### 業界參考

- **圖片輪播設計**: 參考 Coupang、Amazon 首頁的廣告輪播
- **商品展示設計**: 參考 Netflix、Spotify 的橫向滾動卡片
- **區塊管理介面**: 參考 WordPress Gutenberg、Notion 的區塊編輯器

### 風險評估

1. **高風險**: 圖片上傳失敗導致資料不一致
   - 緩解策略: 使用原子性操作（先建立記錄 → 上傳圖片 → 更新 URL）
2. **中風險**: JSONB Config 結構變更影響向後相容性
   - 緩解策略: Zod Schema 驗證 + Migration Script + 前端容錯處理
3. **中風險**: 商品展示查詢效能問題
   - 緩解策略: 限制單一區塊最多 50 個商品 + 資料庫索引優化 + SSR 快取
4. **低風險**: 前台路由重構影響 SEO
   - 緩解策略: 使用 301 redirect + 更新 sitemap.xml

---

## Related Features *(optional)*

- **002-product-management**: 提供商品資料與查詢 API
- **003-series-and-pricing**: 提供系列資料與等級價格查詢
- **004-cart-and-orders**: 提供 ProductWithPriceCard 元件
- **013-unified-dialog**: 提供統一對話框 Hook（useConfirm、useAlert）
