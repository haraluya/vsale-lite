# Logo 顯示問題修復驗證指南

## 問題診斷總結

### 根本原因
1. **Middleware 攔截 API 路由**
   - Middleware matcher 沒有排除 `/api/*` 路由
   - 前台 Logo 元件呼叫 `/api/public-settings` 時被攔截要求登入
   - 未登入或 session 過期的使用者無法訪問 API

2. **Logo 元件邏輯問題**（已在第一次修復）
   - 沒有根據 `variant` 屬性選擇正確的預設 Logo
   - `variant="icon"` 時應使用 `/logo-icon.svg`

## 修復內容

### 1. Middleware 配置更新
```typescript
// middleware.ts
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    // 新增 'api' 排除規則 ↑
  ],
}
```

### 2. Logo 元件更新
```typescript
// components/ui/logo.tsx
const defaultLogoUrl = variant === 'icon' ? '/logo-icon.svg' : '/logo.svg'
```

## 驗證步驟

### 方法 1: 直接測試前台
1. 重新啟動開發伺服器（如果正在執行）
   ```bash
   # 停止現有伺服器 (Ctrl + C)
   pnpm dev
   ```

2. 清除瀏覽器快取
   - Chrome: `Ctrl + Shift + R` (硬重新整理)
   - 或打開開發者工具 (F12) → Network 標籤 → 勾選 "Disable cache"

3. 訪問前台頁面（需登入）
   - 前台商店: http://localhost:3000/store
   - 優惠券頁面: http://localhost:3000/store/coupons
   - 購物車: http://localhost:3000/store/cart

4. 檢查 Logo 是否顯示
   - 桌面版應顯示完整 Logo（/logo.svg）
   - 手機版應顯示圖示 Logo（/logo-icon.svg）

### 方法 2: 使用測試頁面
1. 訪問測試頁面: http://localhost:3000/test-logo

2. 檢查「原始 Logo 元件」區塊
   - 應看到兩個橘色圖示（variant="full" 和 variant="icon"）

3. 檢查「除錯版 Logo 元件」區塊
   - 查看詳細的載入狀態與 API 回應
   - 確認 API 回應成功（success: true）
   - 確認 logo_url 設定正確

### 方法 3: 檢查瀏覽器 Console
1. 打開瀏覽器開發者工具 (F12)

2. 切換到 Console 標籤

3. 應看到以下訊息（使用測試頁面時）：
   ```
   [DebugLogo] 開始載入 Logo，variant: full
   [DebugLogo] 預設 Logo URL: /logo.svg
   [DebugLogo] API 回應狀態: 200
   [DebugLogo] API 回應資料: { success: true, settings: [...] }
   [DebugLogo] 使用預設 Logo: /logo.svg
   [DebugLogo] 圖片載入成功: /logo.svg
   ```

4. 切換到 Network 標籤

5. 應看到以下請求：
   - `/api/public-settings` - Status: 200 OK
   - `/logo.svg` - Status: 200 OK
   - `/logo-icon.svg` - Status: 200 OK

## 預期結果

### ✅ 修復成功
- 前台所有頁面都能正確顯示 Logo
- 桌面版顯示完整 Logo
- 手機版顯示圖示 Logo
- 測試頁面顯示兩個橘色圖示
- Console 沒有錯誤訊息
- Network 標籤顯示所有資源載入成功

### ❌ 仍有問題
如果仍然看不到 Logo，請檢查：

1. **開發伺服器是否正在執行**
   ```bash
   pnpm dev
   ```

2. **瀏覽器快取是否清除**
   - 硬重新整理: `Ctrl + Shift + R`
   - 或清除所有快取並重新載入

3. **檔案是否存在**
   ```bash
   ls -la public/logo*.svg
   # 應顯示:
   # public/logo.svg
   # public/logo-icon.svg
   ```

4. **API 是否正常運作**
   - 直接訪問: http://localhost:3000/api/public-settings
   - 應返回 JSON 格式的設定資料

5. **Console 是否有錯誤訊息**
   - 打開 F12 開發者工具
   - 查看 Console 標籤是否有紅色錯誤訊息

## 診斷工具

### 1. Logo 診斷腳本
```bash
node scripts/diagnose-logo.mjs
```

### 2. 測試頁面
http://localhost:3000/test-logo

### 3. API 測試
```bash
# 使用 curl 測試 API
curl http://localhost:3000/api/public-settings

# 或使用瀏覽器直接訪問
# http://localhost:3000/api/public-settings
```

## 上傳自訂 Logo（選用）

如果想使用自訂 Logo 替代預設的橘色圖示：

1. 登入後台: http://localhost:3000/admin/login

2. 進入系統設定: http://localhost:3000/admin/system/settings

3. 在「Logo 管理」區塊上傳圖片
   - 建議尺寸: 200 × 60 像素
   - 支援格式: JPG, PNG, WebP, SVG
   - 最大檔案大小: 2MB

4. 上傳成功後，前後台將自動使用新的 Logo

## 相關檔案

- `components/ui/logo.tsx` - Logo 元件
- `middleware.ts` - Middleware 配置
- `app/api/public-settings/route.ts` - 公開設定 API
- `public/logo.svg` - 預設完整 Logo
- `public/logo-icon.svg` - 預設圖示 Logo
- `app/test-logo/page.tsx` - 測試頁面
- `scripts/diagnose-logo.mjs` - 診斷腳本
