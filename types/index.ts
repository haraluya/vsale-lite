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
  status: 'active' | 'inactive'
  sort_order: number
  created_at: string
  updated_at: string
}

// 商品
export type Product = {
  id: string
  code: string
  name: string
  series_id: string  // 🔄 Feature 003: 改為關聯系列 (取代 category_id)
  series_name?: string  // JOIN 查詢時包含
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
  status?: 'active' | 'inactive' | 'all'  // 狀態篩選 (Admin only)
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
  user_id: string
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
  link_url: string | null
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
export type SettingCategory = 'general' | 'branding' | 'carousel' | 'system'

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
