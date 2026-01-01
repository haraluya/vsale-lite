# Research: 客戶與會員等級管理

**Feature**: 001-user-tier-management
**Date**: 2026-01-01
**Status**: Phase 0 Research Complete

## 研究目標

解決 Technical Context 中的 NEEDS CLARIFICATION 項目,並針對關鍵技術決策進行最佳實踐研究。

---

## 1. 測試框架選擇

### 問題
Technical Context 標記: `Testing: NEEDS CLARIFICATION (建議 Vitest + React Testing Library 或 Jest)`

### 研究發現

#### 選項 A: Vitest + React Testing Library
**優勢**:
- Vitest 是 Vite 生態的原生測試框架,與 Next.js 15 相容性佳
- 執行速度比 Jest 快 5-10 倍 (ESM 原生支援)
- 支援 TypeScript 零配置
- React Testing Library 是 React 官方推薦的測試工具
- 與 Next.js App Router 和 Server Components 相容性好

**劣勢**:
- 生態相對 Jest 較新,部分第三方套件可能不支援
- 社群資源相對較少

#### 選項 B: Jest + React Testing Library
**優勢**:
- 成熟的測試框架,社群資源豐富
- Next.js 官方文檔有完整的 Jest 配置範例
- 大量現有專案使用,問題解決方案多

**劣勢**:
- 需要額外配置 Babel/SWC 轉譯
- 執行速度較慢
- ESM 支援需要額外配置

### 決策: Vitest + React Testing Library

**理由**:
1. **效能優先**: 批發業務系統需要快速迭代,測試執行速度直接影響開發效率
2. **TypeScript 原生支援**: 與專案技術棧 (TypeScript 5.7+) 完美契合
3. **現代化工具鏈**: 符合 Next.js 15 的現代化方向,減少配置複雜度
4. **未來趨勢**: Vite 生態正在快速增長,提前採用有利於長期維護

**替代方案被拒絕原因**:
- Jest: 雖然成熟,但配置複雜度高,且效能不如 Vitest,不符合「簡化開發流程」的目標

---

## 2. Supabase Auth 與 Next.js 15 整合最佳實踐

### 研究重點
如何在 Next.js 15 App Router 中正確實作 Supabase 雙入口登入?

### 最佳實踐

#### 2.1 Cookie-based Session 管理
**決策**: 使用 `@supabase/ssr` 套件處理 Server Components 的 Auth

**實作模式**:
```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}
```

#### 2.2 Middleware 路由保護
**決策**: 在 `middleware.ts` 中統一處理前後台路由保護

**關鍵邏輯**:
- 未登入訪問 `/store/*` → 重導至 `/login`
- Client 訪問 `/admin/*` → 403 或重導至 `/login`
- Admin 可訪問所有路由 (上帝視角)

**參考資料**: [Supabase SSR Guide for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)

---

## 3. 雙入口登入的資料庫設計策略

### 研究重點
如何在 Supabase 中實作手機號碼 vs Email 的雙入口設計?

### 設計決策

#### 方案: 使用 Supabase Auth + Custom Profiles 表

**資料庫結構**:
```sql
-- Supabase 內建 auth.users 表處理認證
-- 自訂 profiles 表存放業務資料

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE,           -- 客戶使用 (可為 NULL)
  email TEXT UNIQUE,           -- 管理員使用 (可為 NULL)
  role TEXT NOT NULL CHECK (role IN ('client', 'admin')),
  tier_id UUID REFERENCES tiers(id),  -- 僅客戶需要
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 約束: 客戶必須有 phone, 管理員必須有 email
ALTER TABLE profiles ADD CONSTRAINT client_must_have_phone
  CHECK (role != 'client' OR phone IS NOT NULL);

ALTER TABLE profiles ADD CONSTRAINT admin_must_have_email
  CHECK (role != 'admin' OR email IS NOT NULL);
```

**登入流程**:
1. **前台登入**: 使用 Supabase Auth 的 `signInWithPassword({ phone, password })`
2. **後台登入**: 使用 Supabase Auth 的 `signInWithPassword({ email, password })`
3. 登入成功後查詢 `profiles` 表取得 `role` 和 `tier_id`

**優勢**:
- 利用 Supabase Auth 的成熟安全機制 (密碼加密、Session 管理)
- 彈性的權限控制 (透過 profiles.role)
- 符合正規化設計

---

## 4. 手機號碼驗證最佳實踐

### 研究重點
台灣手機號碼格式驗證規則

### 驗證規則

**格式要求**:
- 必須以 `09` 開頭
- 總長度 10 碼
- 純數字 (儲存時移除空格、連字號)

**Zod Schema**:
```typescript
import { z } from 'zod'

export const phoneSchema = z.string()
  .regex(/^09\d{8}$/, '請輸入有效的台灣手機號碼 (09 開頭,共 10 碼)')
  .transform(val => val.replace(/[\s-]/g, ''))  // 移除空格和連字號
```

**國際號碼考量**:
- 初期僅支援台灣格式 (09xx-xxx-xxx)
- 若未來需支援 +886,可擴充 regex 為 `/^(\+886|0)9\d{8}$/` 並正規化為統一格式

**決策**: 採用嚴格的台灣格式驗證,儲存為 10 碼純數字

---

## 5. Neo-Brutalism 設計系統實作

### 研究重點
如何在 Tailwind CSS v4.0 中實作 Neo-Brutalism 風格?

### Tailwind 配置

**tailwind.config.ts**:
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  theme: {
    extend: {
      boxShadow: {
        'neo': '4px 4px 0px 0px rgba(0,0,0,1)',
        'neo-sm': '2px 2px 0px 0px rgba(0,0,0,1)',
        'neo-lg': '6px 6px 0px 0px rgba(0,0,0,1)',
      },
      borderWidth: {
        '3': '3px',
      },
      colors: {
        primary: '#8B5CF6',      // 紫色
        surface: '#FFFFFF',
        background: '#F3F4F6',
      },
    },
  },
}
```

**Button 元件範例**:
```tsx
// components/ui/button.tsx
export const Button = ({ children, ...props }: ButtonProps) => (
  <button
    className="
      border-3 border-black bg-primary text-white
      shadow-neo
      active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
      transition-all
      px-6 py-3 font-bold
      disabled:opacity-50 disabled:cursor-not-allowed
    "
    {...props}
  >
    {children}
  </button>
)
```

---

## 6. Server Actions 錯誤處理模式

### 研究重點
Next.js 15 Server Actions 的錯誤處理與表單驗證最佳實踐

### 推薦模式: 使用 `useActionState` Hook

**Server Action 範例**:
```typescript
// lib/actions/tiers.ts
'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const createTierSchema = z.object({
  name: z.string().min(1, '等級名稱不可為空'),
  rank: z.coerce.number().int().min(1),
})

export async function createTier(prevState: any, formData: FormData) {
  // 1. 驗證輸入
  const validatedFields = createTierSchema.safeParse({
    name: formData.get('name'),
    rank: formData.get('rank'),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: '驗證失敗',
    }
  }

  // 2. 資料庫操作
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('tiers')
      .insert(validatedFields.data)

    if (error) throw error

    // 3. Revalidate
    revalidatePath('/admin/tiers')

    return { success: true, message: '等級建立成功' }
  } catch (error) {
    return { success: false, message: '建立失敗,請稍後再試' }
  }
}
```

**Client 端使用**:
```tsx
'use client'

import { useActionState } from 'react'
import { createTier } from '@/lib/actions/tiers'

export function TierForm() {
  const [state, formAction] = useActionState(createTier, null)

  return (
    <form action={formAction}>
      {/* 表單欄位 */}
      {state?.errors?.name && <p className="text-red-500">{state.errors.name}</p>}
      <button type="submit">儲存</button>
    </form>
  )
}
```

---

## 研究總結

### 已解決的 NEEDS CLARIFICATION 項目
1. ✅ **測試框架**: 採用 Vitest + React Testing Library
2. ✅ **Auth 整合**: 使用 @supabase/ssr 處理 Server Components
3. ✅ **手機號碼驗證**: 台灣格式 (09 開頭,10 碼)
4. ✅ **設計系統**: Tailwind 配置 Neo-Brutalism 陰影與邊框
5. ✅ **錯誤處理**: Server Actions 使用 useActionState Hook

### 關鍵技術決策紀錄

| 決策項目 | 選擇 | 替代方案 | 理由 |
|---------|------|---------|------|
| 測試框架 | Vitest | Jest | 效能優勢、TypeScript 原生支援 |
| Auth 模式 | Cookie-based (Supabase SSR) | JWT | Server Components 相容性 |
| 手機號碼格式 | 純數字 (10 碼) | 保留格式 (+886-9xx) | 簡化查詢與比對 |
| 表單驗證 | Zod + Server Actions | Client-side only | 安全性與一致性 |

### 下一步: Phase 1 設計

所有技術不確定性已消除,可進入 Phase 1 進行:
- 資料模型設計 (data-model.md)
- API 合約定義 (contracts/)
- 快速上手指南 (quickstart.md)
