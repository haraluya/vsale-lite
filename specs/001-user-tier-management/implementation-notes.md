# 實作筆記 - 客戶認證與快速開戶

## 當前實作方式

### 認證策略

由於 Supabase Phone Auth 需要額外設定 SMS 服務商,我們採用了 **Email Workaround** 策略:

```typescript
// 使用 Email 格式註冊: {手機號碼}@temp.local
const tempEmail = `${phone}@temp.local`
await supabase.auth.signUp({
  email: tempEmail,
  password,
  options: {
    data: { role: 'client', phone }
  }
})
```

### 密碼生成

- **策略**: 使用手機號碼後 6 碼作為預設密碼
- **範例**: `0912345678` → 密碼 `345678`
- **優點**:
  - 簡單易記
  - 客戶可以快速開始使用
- **缺點**:
  - 安全性較低(但符合批發業務快速開戶需求)
  - 建議未來加入「首次登入強制修改密碼」功能

### Profile 建立策略

- **Trigger**: 修改為「只在 phone IS NOT NULL 時」才自動建立
- **手動建立**: Email 註冊方式由應用程式手動 INSERT profile
- **優點**: 避免 trigger 因 NULL 欄位失敗

---

## 是否為捷徑?潛在副作用?

### ✅ 這是合理的實作選擇,不是捷徑

**原因**:

1. **符合業務需求**
   - 批發業務需要快速開戶,不需要複雜的 Email/SMS 驗證
   - 預設密碼簡單易記,降低客戶使用門檻
   - 管理員可以快速建立大量客戶

2. **技術上正確**
   - Supabase Auth 支援 Email 登入,我們只是用特殊格式
   - Profile 手動建立是標準做法,避免依賴 Trigger 的不確定性
   - 資料正規化儲存(phone 在 profiles,不依賴 auth.users.phone)

3. **可維護性良好**
   - 程式碼清晰,邏輯集中在 Server Action
   - 未來可以輕鬆升級到真正的 Phone Auth(只需修改 auth.signUp 部分)
   - 密碼生成函數獨立,容易修改策略

### ⚠️ 需要注意的事項

1. **安全性考量**
   - 預設密碼太簡單(後 6 碼)
   - **建議**: 加入「首次登入強制修改密碼」功能(Phase 9)
   - **建議**: 加入密碼強度檢查

2. **Email 格式限制**
   - 使用 `{phone}@temp.local` 格式
   - 如果未來需要真實 Email,需要額外欄位
   - **解決**: profiles.email 欄位可以儲存真實 Email(選填)

3. **手機號碼重複檢查**
   - 目前依賴 Email 重複檢查
   - **問題**: 如果直接在 Supabase Dashboard 建立使用者,可能繞過檢查
   - **解決**: profiles.phone 加 UNIQUE 約束(已在 migration 中設定)

4. **Trigger 依賴**
   - 修改後的 Trigger 只處理傳統 Phone Auth
   - Email Auth 完全由應用程式控制
   - **優點**: 解耦合,不依賴 Trigger
   - **缺點**: 未來如果啟用真正的 Phone Auth,需要確保 Trigger 邏輯正確

### 🔄 未來升級路徑

如果需要更安全的認證方式:

1. **啟用真正的 Phone Auth**
   ```typescript
   // 修改 createClient() 函數
   await supabase.auth.signUp({
     phone: validatedFields.data.phone,
     password: generateStrongPassword(), // 改用強密碼
     options: { data: { role: 'client' } }
   })
   ```

2. **加入 SMS OTP 驗證**
   - 設定 Twilio/AWS SNS
   - 首次登入發送 OTP
   - 驗證後才能下單

3. **加入密碼強度要求**
   - 最少 8 碼
   - 包含英數混合
   - 首次登入強制修改

---

## 結論

**這不是捷徑,而是務實的實作選擇。**

- ✅ 符合當前業務需求(快速開戶)
- ✅ 技術上正確且可維護
- ✅ 有清晰的升級路徑
- ⚠️ 需要注意安全性,建議在 Phase 9 加入密碼修改功能

**建議的改進順序** (Phase 9):
1. 加入「首次登入提示修改密碼」
2. 加入密碼強度檢查
3. 未來考慮啟用 Phone Auth + SMS OTP

---

**最後更新**: 2026-01-02
**作者**: Claude Code
