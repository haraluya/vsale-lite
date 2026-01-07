# Research: 統一對話框系統 (013-unified-dialog)

**研究日期**: 2026-01-07
**研究者**: Claude Sonnet 4.5
**專案**: Vsale-lite B2B 批發訂貨系統

---

## 研究目標

針對統一對話框系統實作，解決以下核心問題：
1. **如何取代原生瀏覽器對話框**（alert、confirm、prompt）
2. **如何設計符合 Neo-Brutalism 風格的對話框元件**
3. **如何提供 Promise-based 異步 API**
4. **如何實作狀態管理與多對話框排隊機制**
5. **如何確保無障礙性與鍵盤操作支援**

---

## 決策記錄

### 決策 1: React Context + Promise-based API

**決策**: 使用 React Context API 管理對話框狀態，並提供 Promise-based Hook

**理由**:
- ✅ **簡潔的 API**: 使用 `await alert()` 替代 `window.alert()`，保持呼叫方式一致
- ✅ **輕量級**: 無需引入額外狀態管理庫（Zustand 僅用於購物車）
- ✅ **Next.js 15 友善**: 支援 App Router 的 Client Component 架構
- ✅ **單一對話框實例**: 透過 Context 確保同一時間只有一個對話框顯示

**替代方案考量**:
- ❌ **Zustand**: 過重，購物車已使用，避免濫用全域狀態
- ❌ **直接狀態提升**: 需要在每個頁面傳遞 props，維護困難
- ❌ **事件總線**: 難以實作 Promise-based 異步 API

**實作細節**:
```typescript
// lib/contexts/dialog-context.tsx
const alert = useCallback((options: AlertDialogOptions): Promise<void> => {
  return new Promise((resolve) => {
    setState({
      type: 'alert',
      options,
      resolve: () => {
        resolve()
        setState({ type: null, options: null, resolve: null })
      },
    })
  })
}, [])
```

**參考資料**:
- [React Context API 官方文件](https://react.dev/reference/react/useContext)
- [Promise-based Dialog Pattern](https://github.com/GoogleChrome/dialog-polyfill)

---

### 決策 2: Neo-Brutalism 設計實作

**決策**: 使用固定設計 Token 確保一致性（3px 邊框、硬邊陰影、零圓角）

**理由**:
- ✅ **品牌一致性**: 符合專案既有的 Neo-Brutalism 設計風格
- ✅ **視覺衝擊**: 強烈的黑色邊框與陰影提升對話框的視覺層級
- ✅ **無圓角設計**: 與系統其他元件（按鈕、卡片）保持一致
- ✅ **互動回饋**: 點擊時位移 + 陰影消失，提供明確的視覺回饋

**設計規範**:
```css
/* 對話框容器 */
border: 3px solid black;
box-shadow: 8px 8px 0px 0px rgba(0,0,0,1);
border-radius: 0;

/* 按鈕點擊效果 */
hover:translate-x-[2px] hover:translate-y-[2px]
hover:shadow-none

/* 響應式邊框（依據 005-responsive-ui 規範）*/
border-2 md:border-3  /* 手機 2px / 桌面 3px */
shadow-neo-sm md:shadow-neo  /* 手機 4px / 桌面 8px */
```

**色彩變體配置**:
| 變體 | 標題背景 | 圖示 | 確認按鈕 |
|------|---------|------|---------|
| success | bg-green-400 | CheckCircle | bg-green-500 |
| error | bg-red-400 | XCircle | bg-red-500 |
| warning | bg-yellow-400 | AlertTriangle | bg-yellow-500 |
| info | bg-blue-400 | Info | bg-blue-500 |
| danger | bg-red-400 | AlertTriangle | bg-red-500 |
| default | bg-gray-200 | Info | bg-gray-800 |

**替代方案考量**:
- ❌ **Radix UI Dialog**: 預設樣式與 Neo-Brutalism 衝突，需大量覆寫
- ❌ **ShadCN Dialog**: 圓角設計與專案風格不符
- ❌ **Headless UI**: 需要從零實作樣式，時間成本高

**參考資料**:
- [Neo-Brutalism Web Design](https://hype4.academy/articles/design/neo-brutalism-in-web-design)
- Vsale-lite 現有元件（lib/design-tokens.ts）

---

### 決策 3: 整合 sonner Toast

**決策**: 使用 sonner 作為 Toast 通知系統，並套用 Neo-Brutalism 樣式

**理由**:
- ✅ **輕量級**: 僅 3KB gzipped，效能優異
- ✅ **Next.js 15 支援**: 官方支援 App Router 與 Server Component
- ✅ **豐富功能**: 支援多種 Toast 類型、位置、自動關閉
- ✅ **可客製化**: 完全控制樣式，可套用 Neo-Brutalism 設計

**實作配置**:
```tsx
// app/layout.tsx
<Toaster
  position="top-right"
  toastOptions={{
    style: {
      border: '3px solid black',
      boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)',
      borderRadius: '0',
    },
    className: 'font-bold',
  }}
/>
```

**替代方案考量**:
- ❌ **react-hot-toast**: 較大（5KB），功能類似
- ❌ **自建 Toast**: 需實作排隊機制、動畫、自動關閉，時間成本高
- ❌ **使用 AlertDialog 作為 Toast**: 模態對話框不適合非阻塞通知

**參考資料**:
- [sonner 官方文件](https://sonner.emilkowal.ski/)
- [Next.js 15 Toast 整合範例](https://github.com/emilkowalski/sonner/tree/main/examples/nextjs)

---

### 決策 4: 分離式元件架構

**決策**: 將 AlertDialog、ConfirmDialog、PromptDialog 拆分為獨立元件

**理由**:
- ✅ **職責分離**: 每個對話框類型有獨立的邏輯與樣式
- ✅ **易於測試**: 可針對單一元件撰寫單元測試
- ✅ **按需載入**: 僅在對話框開啟時渲染對應元件
- ✅ **維護性**: 修改某個對話框不影響其他類型

**檔案結構**:
```
components/ui/dialogs/
├── alert-dialog.tsx      # 通知型對話框（單按鈕）
├── confirm-dialog.tsx    # 確認型對話框（雙按鈕）
└── prompt-dialog.tsx     # 輸入型對話框（表單）
```

**替代方案考量**:
- ❌ **單一元件多變體**: 元件內部邏輯過於複雜，難以維護
- ❌ **使用 Polymorphic 模式**: 過度工程化，不符合專案簡潔原則
- ❌ **HOC 模式**: 增加學習成本，不利於團隊協作

**參考資料**:
- [React Component Composition](https://react.dev/learn/passing-props-to-a-component#forwarding-props-with-the-jsx-spread-syntax)
- [Compound Component Pattern](https://kentcdodds.com/blog/compound-components-with-react-hooks)

---

### 決策 5: 無障礙性與鍵盤支援

**決策**: 完整實作 WCAG 2.1 AA 標準，支援鍵盤操作與螢幕閱讀器

**理由**:
- ✅ **法規遵循**: 符合無障礙網頁規範（WCAG 2.1 AA）
- ✅ **使用者體驗**: 支援鍵盤快速鍵（Enter 確認、ESC 取消）
- ✅ **螢幕閱讀器**: 完整的 ARIA 標籤（role、aria-labelledby、aria-describedby）
- ✅ **焦點管理**: 對話框開啟時自動聚焦確認按鈕

**實作細節**:
```tsx
// 1. ARIA 標籤
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="alert-dialog-title"
  aria-describedby="alert-dialog-message"
>
  <h2 id="alert-dialog-title">{title}</h2>
  <p id="alert-dialog-message">{message}</p>
</div>

// 2. 鍵盤支援
useEffect(() => {
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && closable) onClose()
  }
  document.addEventListener('keydown', handleEsc)
  return () => document.removeEventListener('keydown', handleEsc)
}, [closable, onClose])

// 3. 焦點管理
<button autoFocus>{confirmText}</button>

// 4. 背景滾動鎖定
useEffect(() => {
  document.body.style.overflow = 'hidden'
  return () => { document.body.style.overflow = '' }
}, [])
```

**無障礙檢查清單**:
- ✅ 對話框開啟時鎖定背景滾動
- ✅ ESC 鍵關閉對話框（可透過 `closable` 停用）
- ✅ Enter 鍵確認操作
- ✅ 焦點自動移至確認按鈕
- ✅ 螢幕閱讀器可正確朗讀標題與內容
- ✅ 對話框關閉後焦點返回觸發元素

**替代方案考量**:
- ❌ **忽略無障礙性**: 違反 WCAG 規範，限制使用者群體
- ❌ **僅實作部分功能**: 可能導致部分使用者無法操作
- ❌ **依賴第三方庫**: 增加專案依賴，且樣式難以客製化

**參考資料**:
- [WCAG 2.1 Dialog 規範](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [React ARIA Dialog](https://react-spectrum.adobe.com/react-aria/useDialog.html)

---

## Phase 0 實作驗證結果

### 1. 設計樣式確認

**實作元件**:
- ✅ AlertDialog（4 種變體：success、error、warning、info）
- ✅ ConfirmDialog（6 種變體：success、error、warning、info、danger、default）
- ✅ PromptDialog（支援多欄位、即時驗證、字數限制）

**樣式檢查**:
- ✅ 3px 黑色邊框正確應用
- ✅ 硬邊陰影 `shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]` 正確顯示
- ✅ 零圓角（border-radius: 0）
- ✅ 按鈕點擊位移效果正確（translate-x-[2px] translate-y-[2px]）
- ✅ 色彩變體與專案既有元件一致

**使用者確認**: ✅ 設計確認無誤（2026-01-07）

### 2. API 易用性驗證

**Hook 呼叫方式**:
```typescript
// AlertDialog - 單行呼叫
await alert({ title: '成功', message: '儲存完成', variant: 'success' })

// ConfirmDialog - 取得布林結果
const confirmed = await confirm({
  title: '確認刪除',
  description: '此操作無法復原',
  variant: 'danger'
})

// PromptDialog - 取得表單資料
const result = await prompt({
  title: '輸入名稱',
  fields: [{ name: 'name', label: '姓名', required: true }]
})
```

**驗證結果**:
- ✅ API 與原生 `window.alert()` 相似，學習成本低
- ✅ Promise-based 設計支援 async/await，程式碼簡潔
- ✅ TypeScript 型別提示完整，減少錯誤

### 3. 效能測試

**測試項目**:
- ✅ 對話框開啟動畫流暢（fade-in + zoom-in）
- ✅ 背景半透明遮罩無閃爍
- ✅ 多次連續呼叫無記憶體洩漏

**優化措施**:
- 使用 `useCallback` 避免 Hook 重複建立
- 對話框關閉後清除狀態（`setState({ type: null, options: null, resolve: null })`）
- 僅在對話框開啟時掛載元件（條件渲染）

### 4. 相容性測試

**測試環境**:
- ✅ Chrome 131+ (Windows 11)
- ✅ Next.js 15.1+ (App Router)
- ✅ React 19.x
- ✅ TypeScript 5.7+

**已知限制**:
- ⚠️ 不支援 IE11（專案已放棄舊版瀏覽器）
- ⚠️ 需要 JavaScript 啟用（原生對話框同樣需要）

---

## 技術選型總結

| 技術選擇 | 理由 | 風險 | 緩解措施 |
|---------|------|------|---------|
| React Context API | 輕量級、官方推薦 | 多層巢狀效能問題 | 僅在根層級使用 Provider |
| sonner Toast | 輕量、Next.js 支援 | 外部依賴 | 功能單一，替換成本低 |
| Promise-based API | 簡潔、易用 | 需理解異步程式設計 | 提供完整範例與文件 |
| 分離式元件 | 職責分離、易維護 | 程式碼重複 | 抽取共用邏輯至 Context |
| WCAG 2.1 AA | 法規遵循、使用者友善 | 開發時間增加 | 使用成熟模式，減少試錯 |

---

## 未來擴展方向

### 1. 進階功能 (P2 優先級)
- 支援對話框嵌套（一次顯示多個對話框）
- 自訂動畫效果（slide-in、bounce-in）
- 支援 HTML 內容（Rich Text Editor）

### 2. 效能優化 (P2 優先級)
- 使用 React.lazy 延遲載入對話框元件
- 實作虛擬列表（PromptDialog 多欄位場景）
- 減少重渲染（使用 React.memo）

### 3. 開發體驗改善 (P3 優先級)
- 提供 Storybook 文件
- 建立視覺回歸測試（Percy/Chromatic）
- 建立 ESLint Plugin 檢查原生對話框使用

---

## 參考資料

### 官方文件
- [React Context API](https://react.dev/reference/react/useContext)
- [Next.js 15 App Router](https://nextjs.org/docs/app)
- [TypeScript 5.7 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-7.html)
- [sonner Documentation](https://sonner.emilkowal.ski/)

### 設計規範
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [Neo-Brutalism Design Guide](https://hype4.academy/articles/design/neo-brutalism-in-web-design)

### 程式碼範例
- [React Dialog Polyfill](https://github.com/GoogleChrome/dialog-polyfill)
- [Radix UI Dialog](https://www.radix-ui.com/primitives/docs/components/dialog)
- [Headless UI Dialog](https://headlessui.com/react/dialog)

---

**研究完成日期**: 2026-01-07
**下一步**: 產生 API 合約文件（contracts/useAlert.md、contracts/useConfirm.md、contracts/usePrompt.md）
