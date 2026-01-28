// ===================================
// 通用型別定義
// ===================================

// Server Action 回應格式
export type ActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; errors?: Record<string, string[]>; message: string }

// 認證上下文
export type AuthContext = {
  userId: string
  role: 'client' | 'admin'
  tierId?: string  // 僅客戶有
}

// ===================================
// 資料庫實體型別
// ===================================

// 會員等級
export type Tier = {
  id: string
  name: string
  rank: number
  is_protected?: boolean  // 🆕 Feature 003 Enhancement: 系統預設等級保護
  shipping_fee?: number  // 🆕 Feature 011: 基本運費金額（0 表示不收運費）
  free_shipping_threshold?: number | null  // 🆕 Feature 011: 滿額免運門檻（NULL 表示不提供免運）
  created_at: string
  updated_at: string
}

// 使用者 Profile
export type Profile = {
  id: string
  phone: string | null
  email: string | null
  role: 'client' | 'admin'
  tier_id: string | null
  created_at: string
  display_name: string | null
  notes: string | null
  address: string | null  // 🆕 Feature 007: 常用地址
  admin_notes: string | null  // 🆕 Feature 007: 管理員備註（僅管理端可見）
  username: string | null  // 🆕 Feature 008: 管理員登入帳號（僅管理員使用）
}

// 客戶 (含等級資訊)
export type Client = {
  id: string
  phone: string
  display_name?: string | null
  role: 'client' | 'admin'
  tier_id: string | null
  tier_name?: string | null
  notes?: string | null
  address?: string | null  // 🆕 Feature 007: 常用地址
  admin_notes?: string | null  // 🆕 Feature 007: 管理員備註
  created_at: string
  updated_at: string
}

// ===================================
// API 查詢參數型別
// ===================================

// 客戶列表查詢參數
export type GetClientsParams = {
  search?: string       // 手機號碼關鍵字
  tier_id?: string      // 等級篩選
  limit?: number        // 每頁筆數 (預設 20)
  offset?: number       // 偏移量 (預設 0)
}

// 客戶列表回應
export type GetClientsResponse = {
  data: Client[]
  total: number
}

// 當前使用者資訊 (Feature 003)
export type CurrentUser = {
  id: string
  phone: string | null
  email: string | null
  tier_id: string | null
  tier_name: string | null
  role: 'client' | 'admin'
  created_at: string
}

// ===================================
// 商品管理型別 (Feature 002 & 003)
// ===================================

// 商品分類
export type Category = {
  id: string
  name: string
  code: string  // 🆕 Feature 003: 分類代碼 (如 DRK, SNK)
  description: string | null
  sort_order: number  // 🆕 排序順序（數字越小越前面）
  created_at: string
  updated_at: string
}

// 商品系列 (Feature 003)
export type Series = {
  id: string
  category_id: string | null
  code: string  // 🆕 系列代碼 (如 TEA, JUC)
  name: string
  description: string | null
  image_url: string | null
  color: string  // 🆕 Feature 016: 系列顏色代碼（Hex 格式，如 #FBBF24）
  status: 'active' | 'inactive'
  sort_order: number
  created_at: string
  updated_at: string
  // 🆕 JOIN 查詢時包含分類資訊（可選）
  categories?: {
    name: string
  } | null
  // 🆕 最低售價（用於系列卡片顯示，前台查詢時包含）
  min_retail_price?: number | null
}

// 商品
export type Product = {
  id: string
  code: string
  name: string
  series_id: string  // 🔄 Feature 003: 改為關聯系列 (取代 category_id)
  series_name?: string  // JOIN 查詢時包含
  series_color?: string  // 🆕 Feature 016: 系列顏色（JOIN 查詢時包含）
  category_name?: string  // 🆕 Feature 006: 分類名稱 (用於搜尋結果顯示)
  description: string | null
  retail_price: number | null  // 🆕 Feature 003: 原價/建議售價
  user_price?: number | null  // 🆕 Feature 006: 用戶等級價格 (用於前台搜尋)
  stock: number
  stock_status: 'sufficient' | 'low' | 'out_of_stock'  // 🆕 Feature 003: 庫存狀態
  unit: string
  image_url: string | null
  tags?: string[]  // 🆕 Feature 006: 商品標籤
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

// 等級價格 (Feature 003)
export type TierPrice = {
  id: string
  tier_id: string
  product_id: string
  price: number
  created_at: string
  updated_at: string
}

// 商品含價格 (前台使用, Feature 003)
export type ProductWithPrice = Product & {
  user_price: number | null  // 當前用戶等級價格
}

// 等級含價格 (價格設定表格使用, Feature 003)
export type TierWithPrice = {
  tier_id: string
  tier_name: string
  tier_rank: number
  price: number | null
  price_id: string | null
}

// 商品含所有等級價格 (系列批量價格設定使用, Feature 003 Enhancement)
export type ProductWithAllTierPrices = Product & {
  tier_prices: {
    tier_id: string
    tier_name: string
    tier_rank: number
    price: number | null
    is_protected?: boolean  // 標記零售等級
  }[]
}

// 商品列表查詢參數
export type GetProductsParams = {
  search?: string         // 商品編號或名稱關鍵字
  series_id?: string      // 🔄 Feature 003: 改為系列篩選 (取代 category_id)
  series_ids?: string[]   // 🆕 Feature 016: 多系列篩選（陣列）
  status?: 'active' | 'inactive' | 'all'  // 狀態篩選 (Admin only)
  sort?: 'code' | 'series_name' | 'stock' | 'retail_price'  // 🆕 Feature 016: 排序欄位
  order?: 'asc' | 'desc'  // 🆕 Feature 016: 排序方向
  page?: number           // 頁碼 (預設 1)
  limit?: number          // 每頁筆數 (預設 20)
}

// 商品列表回應
export type GetProductsResponse = {
  products: Product[]
  total: number
  page: number
  limit: number
}

// ===================================
// 購物車與訂單型別 (Feature 004)
// ===================================

// 購物車項目 (Zustand 狀態管理)
export type CartItem = {
  productId: string
  quantity: number
}

// 購物車項目含商品資訊 (UI 顯示用)
export type CartItemWithProduct = {
  productId: string
  productName: string
  imageUrl: string | null
  quantity: number
  price: number | null  // 當前用戶等級價格
  subtotal: number
  series_id?: string    // 系列 ID（優惠券系列限制驗證需要）
}

// 訂單狀態
// Feature 011: 移除 'confirmed' 狀態，簡化訂單流程
// 新流程: pending → shipping → completed (可取消: pending→cancelled, shipping→cancelled)
export type OrderStatus = 'pending' | 'shipping' | 'completed' | 'cancelled'

// 訂單主表
export type Order = {
  id: string
  order_number: string  // 格式: ORD-YYYYMMDD-XXXX
  user_id: string | null  // 允許 NULL（刪除客戶後訂單保留但無法連結回客戶）
  total_amount: number
  shipping_fee: number  // 🆕 Feature 011: 訂單運費金額（建立時快照儲存）
  status: OrderStatus
  notes: string | null
  created_at: string
  updated_at: string
}

// 訂單含客戶資訊 (管理端列表用)
export type OrderWithUser = Order & {
  user_name: string | null
  user_phone: string | null
  tier_name: string | null
}

// 訂單明細
export type OrderItem = {
  id: string
  order_id: string
  product_id: string | null  // 可為 NULL（商品刪除時自動設為 NULL）
  series_id_snapshot: string | null  // 系列 ID 快照（用於優惠券驗證）
  product_name_snapshot: string  // 商品名稱快照
  deal_price: number  // 成交價格
  quantity: number
  subtotal: number
  created_at: string
  // 🆕 JOIN 查詢時包含系列資訊（可選）
  series?: {
    name: string
  } | null
}

// 訂單操作歷史
export type OrderTimeline = {
  id: string
  order_id: string
  action_type: 'created' | 'confirmed' | 'status_updated' | 'cancelled' | 'comment' | 'order_modified'  // 🆕 Feature 007: comment | Feature 011: order_modified
  actor_id: string | null
  actor_role: 'client' | 'admin' | null
  content: string | null  // 🆕 Feature 007: 留言內容（當 action_type = 'comment'）
  old_status: string | null
  new_status: string | null
  modifications: any | null  // 🆕 Feature 011: 訂單修改內容（當 action_type = 'order_modified'）
  created_at: string
}

// 訂單操作歷史含操作者資訊 (UI 顯示用)
export type OrderTimelineWithActor = OrderTimeline & {
  actor_name: string | null
}

// 訂單優惠券快照 (Feature 009)
export type OrderCoupon = {
  id: string
  order_id: string
  coupon_code: string  // 優惠券代碼快照
  discount_type: 'fixed' | 'percentage'  // 折扣方式
  discount_value: number  // 折扣值
  discount_amount: number  // 實際折扣金額
  created_at: string
}

// 訂單自訂費用項目 (Feature 011)
export type OrderCustomFee = {
  id: string
  order_id: string
  fee_name: string  // 費用名稱（如「手續費」、「包裝費」、「額外運費」）
  amount: number  // 費用金額（正數=收費、負數=減免）
  created_at: string
  created_by: string | null  // 建立者 ID（管理員）
}

// 訂單詳情 (含明細與操作歷史)
export type OrderDetail = Order & {
  user: {
    id: string
    name: string
    phone: string
    tier_name: string
    address?: string | null  // 🆕 Feature 007: 客戶地址
    admin_notes?: string | null  // 🆕 Feature 007: 管理員備註（僅管理端可見）
  }
  items: OrderItem[]
  timelines?: OrderTimelineWithActor[]
  coupon?: OrderCoupon | null  // 🆕 Feature 009: 優惠券快照（選填）
  custom_fees?: OrderCustomFee[]  // 🆕 Feature 011: 自訂費用項目（選填）
}

// 訂單查詢參數
export type GetOrdersParams = {
  user_id?: string      // 指定用戶 (客戶端自動帶入)
  status?: OrderStatus  // 狀態篩選
  search?: string       // 訂單編號或客戶名稱關鍵字
  page?: number         // 頁碼 (預設 1)
  limit?: number        // 每頁筆數 (預設 20)
}

// 訂單列表回應
export type GetOrdersResponse = {
  orders: OrderWithUser[]
  total: number
  page: number
  limit: number
}

// ===================================
// 廣告輪播型別 (Feature 007)
// ===================================

// 廣告
export type Announcement = {
  id: string
  title: string
  image_url: string
  series_id: string | null  // 關聯的系列 ID（取代 link_url）
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// ===================================
// 優惠券型別 (Feature 009)
// ===================================

// 優惠券
export type Coupon = {
  id: string
  code: string  // 原始代碼（管理員輸入）
  code_normalized: string  // 自動轉大寫的代碼
  discount_type: 'fixed' | 'percentage'
  discount_value: number
  min_order_amount: number | null
  valid_from: string  // ISO 8601 格式
  valid_until: string
  status: 'active' | 'inactive' | 'deleted'
  deleted_at: string | null
  claim_limit: number  // 🆕 每位客戶可領取張數上限（預設 1）
  total_limit: number | null  // 🆕 總張數上限（所有客戶合計，NULL = 無限發放）
  created_at: string
  updated_at: string

  // 關聯資料（JOIN 查詢時包含）
  tier_restrictions?: string[]  // tier_id 陣列
  series_restrictions?: string[]  // series_id 陣列
  user_coupon_id?: string  // 🆕 購物車套用時追蹤特定領取記錄 ID
}

// 客戶優惠券領取記錄
export type UserCoupon = {
  id: string
  user_id: string
  coupon_id: string
  claimed_at: string
  used_at: string | null
  order_id: string | null

  // 關聯資料（JOIN 查詢時包含）
  coupon?: Coupon
}

// 優惠券折扣計算結果
export type CouponDiscountResult = {
  valid: boolean
  error?: string
  discountAmount?: number  // 實際折扣金額
  originalAmount?: number  // 折扣前金額
  finalAmount?: number  // 折扣後金額
  availableUserCouponId?: string  // 可用的 user_coupon_id（驗證時回傳）
}

// 優惠券統計
export type CouponStats = {
  claimCount: number  // 領取次數
  usedCount: number  // 使用次數
  totalDiscountAmount: number  // 總折扣金額
}

// 優惠券領取用戶彙整資訊（後台詳情頁用）
export type CouponUserSummary = {
  user_id: string
  user_name: string
  user_phone: string
  total_claimed: number  // 該用戶領取總張數
  total_used: number  // 已使用張數
  total_unused: number  // 未使用張數
  first_claimed_at: string  // 首次領取時間
  last_claimed_at: string  // 最後領取時間
}

// 優惠券查詢參數
export type GetCouponsParams = {
  status?: 'active' | 'inactive' | 'deleted'
  discount_type?: 'fixed' | 'percentage'
  search?: string  // 搜尋優惠券代碼
  page?: number  // 頁碼 (預設 1)
  limit?: number  // 每頁筆數 (預設 20)
}

// 優惠券列表回應
export type GetCouponsResponse = {
  coupons: Coupon[]
  total: number
  page: number
  limit: number
}

// 客戶優惠券查詢參數
export type GetUserCouponsParams = {
  used?: boolean  // true: 已使用, false: 未使用
}

// ===================================
// 系統管理型別 (Feature 008)
// ===================================

// 管理員資料 (擴充 Profile)
export type AdminProfile = Profile & {
  username: string  // 管理員登入帳號（必填）
  email: string  // Email（必填）
}

// 系統設定值類型
export type SettingValueType = 'text' | 'number' | 'boolean' | 'json' | 'image_url'

// 系統設定分類
export type SettingCategory = 'general' | 'branding' | 'carousel' | 'system' | 'client_notifications'

// 系統設定
export type SystemSetting = {
  id: string
  key: string
  value: string  // TEXT 統一儲存，依 value_type 解析
  value_type: SettingValueType
  category: SettingCategory
  is_public: boolean
  description: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

// 已解析的系統設定（用於 Server Action 回傳）
export type ParsedSetting = {
  key: string
  value: string | number | boolean | object
  value_type: SettingValueType
  category: SettingCategory
  description: string | null
}

// 操作類型
export type AuditActionType = 'created' | 'updated' | 'deleted' | 'stock_adjusted' | 'comment_added'

// 操作日誌
export type AuditLog = {
  id: string
  target_type: string  // product, client, order, tier, series, etc.
  target_id: string
  action_type: AuditActionType
  actor_id: string | null
  actor_role: 'client' | 'admin' | null
  actor_display_name: string | null
  old_values: Record<string, any> | null  // JSONB
  new_values: Record<string, any> | null  // JSONB
  notes: string | null
  created_at: string
}

// 操作日誌查詢參數
export type GetAuditLogsParams = {
  target_type?: string  // 篩選實體類型
  target_id?: string  // 篩選特定實體
  action_type?: string | string[] | AuditActionType  // 篩選操作類型（支援 URL 查詢參數的陣列形式）
  actor_id?: string  // 篩選操作者
  date_from?: string  // 起始日期 (YYYY-MM-DD)
  date_to?: string  // 結束日期 (YYYY-MM-DD)
  page?: number | string  // 頁碼 (預設 1，支援 URL 查詢參數的字串形式)
  limit?: number | string  // 每頁筆數 (預設 20，支援 URL 查詢參數的字串形式)
}

// 操作日誌列表回應
export type GetAuditLogsResponse = {
  logs: AuditLog[]
  total: number
  page: number
  limit: number
}

// 操作日誌統計
export type AuditLogStats = {
  total_logs: number
  logs_by_type: {
    action_type: AuditActionType
    count: number
  }[]
  logs_by_actor: {
    actor_id: string
    actor_name: string
    count: number
  }[]
}

// 管理員查詢參數
export type GetAdminsParams = {
  search?: string  // 帳號或 Email 關鍵字
  page?: number  // 頁碼 (預設 1)
  limit?: number  // 每頁筆數 (預設 20)
}

// 管理員列表回應
export type GetAdminsResponse = {
  admins: AdminProfile[]
  total: number
  page: number
  limit: number
}

// ===================================
// 雲端備份型別 (Feature 015)
// ===================================

// 備份檔案資訊
export type BackupJob = {
  id: string
  filename: string  // vsale-backup-YYYYMMDD-HHMMSS.sql.gz
  file_size: number  // 壓縮後檔案大小（bytes）
  storage_provider: 'gcs' | 'vercel_blob'  // 儲存位置
  storage_url: string  // 雲端檔案 URL
  backup_type: 'auto' | 'manual'  // 備份類型
  status: 'in_progress' | 'success' | 'failed'  // 執行狀態
  metadata: BackupMetadata | null  // 備份統計資料
  error_message: string | null  // 失敗時錯誤訊息
  created_by: string | null  // 手動備份操作者（自動備份時為 NULL）
  includes_storage: boolean  // 是否包含 Supabase Storage 圖片（預設 false）
  started_at: string  // ISO 8601 格式
  completed_at: string | null
  created_at: string
}

// 備份元數據（JSONB 結構）
export type BackupMetadata = {
  tables: number  // 備份資料表數量
  rows: number  // 總記錄數量
  compression_ratio: number  // 壓縮率（0-1）
  original_size: number  // 原始 SQL 檔案大小（bytes）
  compressed_size: number  // 壓縮後大小（bytes）
  duration_ms: number  // 執行時間（毫秒）
  table_stats: Record<string, {
    rows: number
    size_bytes: number
  }>  // 各資料表統計
}

// 備份系統設定
export type BackupSettings = {
  backup_enabled: boolean  // 自動備份開關
  backup_max_keep: number  // 保留備份數量
  backup_storage_provider: 'gcs' | 'vercel_blob'  // 主要儲存位置
  backup_last_success: string  // 上次成功時間（ISO 8601）
  backup_last_error: string  // 上次錯誤訊息
}

// 備份統計
export type BackupStats = {
  total_backups: number  // 總備份數量
  auto_backups: number  // 自動備份數量
  manual_backups: number  // 手動備份數量
  total_size: number  // 總大小（bytes）
  success_rate: number  // 成功率（0-1）
  last_success_at: string | null  // 上次成功時間
  last_failure_at: string | null  // 上次失敗時間
}

// 備份查詢參數
export type GetBackupsParams = {
  backup_type?: 'auto' | 'manual'  // 備份類型篩選
  status?: 'in_progress' | 'success' | 'failed'  // 狀態篩選
  limit?: number  // 每頁筆數（預設 20）
  offset?: number  // 偏移量（預設 0）
}

// 備份列表回應
export type GetBackupsResponse = {
  backups: BackupJob[]
  total: number
}

// 建立備份輸入
export type CreateBackupInput = {
  backup_type: 'auto' | 'manual'
  reason?: string  // 備份原因（可選）
}

// 建立備份回應
export type CreateBackupResult = ActionResult<BackupJob>

// 取得備份下載 URL 輸入
export type GetBackupDownloadUrlInput = {
  id: string
  expires_in?: number  // 有效期（秒，預設 3600）
}

// 取得備份下載 URL 回應
export type GetBackupDownloadUrlResult = ActionResult<{
  url: string
  expires_at: string  // ISO 8601 格式
}>

// 刪除備份輸入
export type DeleteBackupInput = {
  id: string
}

// 刪除備份回應
export type DeleteBackupResult = ActionResult<void>

// ===================================
// 首頁廣告區塊型別 (Feature 016)
// ===================================

// 區塊類型
export type BlockType = 'image_carousel' | 'image_carousel_portrait' | 'product_display' | 'text_block'

// 圖片輪播 Config
export interface ImageCarouselConfig {
  images: Array<{
    url: string                  // 圖片 URL（Supabase Storage 公開 URL）
    series_id?: string | null    // 可選：連結到系列頁面的 UUID
    width?: number               // 可選：圖片原始寬度（px）
    height?: number              // 可選：圖片原始高度（px）
  }>
  auto_play: boolean             // 是否自動播放
  interval_ms: number            // 輪播間隔（毫秒，最小 1000ms）
}

// 商品展示 Config
export interface ProductDisplayConfig {
  series_ids?: string[] | null   // 可選：系列 UUID 陣列（AND 邏輯）
  tag_ids?: string[] | null      // 可選：標籤 UUID 陣列（AND 邏輯）
  max_items?: number | null      // 可選：最大顯示數量（預設 50）
}

// 文字區塊 Config
export interface TextBlockConfig {
  content: string                // 文字內容（最多 1000 字元）
  font_size: '12' | '16' | '20' | '24' | '32' | '40' | '48'  // 字體大小（px）
  color: string                  // 字體顏色（Hex 格式 #RRGGBB）
}

// 首頁廣告區塊
export interface HomePageBlock {
  id: string
  name: string
  block_type: BlockType
  config: ImageCarouselConfig | ProductDisplayConfig | TextBlockConfig
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// 建立區塊輸入
export type CreateHomeBlockInput = {
  name: string
  block_type: BlockType
  config: ImageCarouselConfig | ProductDisplayConfig | TextBlockConfig
  is_active?: boolean
}

// 更新區塊輸入
export type UpdateHomeBlockInput = {
  id: string
  name?: string
  block_type?: BlockType
  config?: ImageCarouselConfig | ProductDisplayConfig | TextBlockConfig
  is_active?: boolean
}
