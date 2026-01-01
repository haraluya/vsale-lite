# Quickstart Guide: 客戶與會員等級管理開發環境設定

**Feature**: 001-user-tier-management
**Date**: 2026-01-01
**Estimated Setup Time**: 30 分鐘

## 概述

本指南幫助開發者快速建立 Vsale-lite 專案的開發環境,包含 Next.js 專案初始化、Supabase 設定、Tailwind 配置及初始資料準備。完成後即可開始開發客戶與會員等級管理功能。

**前置需求**:
- ✅ Node.js v22.x 已安裝
- ✅ pnpm v9.x 已安裝
- ✅ Git 已安裝
- ✅ Supabase 帳號 (免費方案即可)
- ✅ 程式碼編輯器 (推薦 VSCode)

---

## Step 1: 初始化 Next.js 專案

### 1.1 建立 Next.js 專案

```bash
# 使用 pnpm 建立 Next.js 15 專案
pnpm create next-app@latest vsale --typescript --tailwind --app --no-src-dir --import-alias "@/*"

# 進入專案目錄
cd vsale
```

**互動選項**:
- ✅ TypeScript: Yes
- ✅ ESLint: Yes
- ✅ Tailwind CSS: Yes
- ✅ `src/` directory: No
- ✅ App Router: Yes
- ✅ Import alias: `@/*`

### 1.2 安裝依賴套件

```bash
# Supabase 套件
pnpm add @supabase/supabase-js @supabase/ssr

# 狀態管理與驗證
pnpm add zustand zod

# UI 元件與圖示
pnpm add lucide-react class-variance-authority clsx tailwind-merge

# 開發工具
pnpm add -D @types/node
pnpm add -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom
```

### 1.3 配置 Vitest (測試框架)

**建立 `vitest.config.ts`**:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

**建立 `vitest.setup.ts`**:
```typescript
import '@testing-library/jest-dom'
```

**更新 `package.json` scripts**:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

---

## Step 2: 配置 Tailwind CSS (Neo-Brutalism)

### 2.1 更新 `tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
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
        primary: {
          DEFAULT: '#8B5CF6',  // 紫色
          dark: '#7C3AED',
        },
        surface: '#FFFFFF',
        background: '#F3F4F6',
      },
    },
  },
  plugins: [],
}

export default config
```

### 2.2 更新 `app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    @apply border-black;
  }

  body {
    @apply bg-background text-black;
  }
}

@layer components {
  .btn-neo {
    @apply border-3 border-black bg-primary text-white font-bold px-6 py-3;
    @apply shadow-neo transition-all;
    @apply active:translate-x-[2px] active:translate-y-[2px] active:shadow-none;
    @apply disabled:opacity-50 disabled:cursor-not-allowed;
  }

  .card-neo {
    @apply border-3 border-black bg-surface shadow-neo p-6;
  }

  .input-neo {
    @apply border-3 border-black px-4 py-2 w-full;
    @apply focus:outline-none focus:ring-2 focus:ring-primary;
  }
}
```

---

## Step 3: 設定 Supabase

### 3.1 建立 Supabase 專案

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 點擊 "New Project"
3. 填寫專案資訊:
   - **Project Name**: vsale-lite
   - **Database Password**: (請記住此密碼)
   - **Region**: Southeast Asia (Singapore) - 最接近台灣
4. 等待專案建立完成 (約 2 分鐘)

### 3.2 取得 API Keys

1. 進入專案後,點選側邊欄 "Settings" → "API"
2. 複製以下資訊:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon/Public Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 3.3 建立環境變數檔案

**建立 `.env.local`**:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**將 `.env.local` 加入 `.gitignore`** (確認已包含):
```gitignore
.env*.local
```

---

## Step 4: 建立資料庫 Schema

### 4.1 執行 SQL Migration

在 Supabase Dashboard 中:
1. 點選側邊欄 "SQL Editor"
2. 點擊 "New Query"
3. 貼上以下 SQL 並執行:

```sql
-- ================================================
-- Vsale-lite Initial Schema Migration
-- Feature: 001-user-tier-management
-- Date: 2026-01-01
-- ================================================

-- 1. 建立會員等級表
CREATE TABLE tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  rank INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 建立使用者業務資料表
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE,
  email TEXT UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('client', 'admin')),
  tier_id UUID REFERENCES tiers(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  display_name TEXT,
  notes TEXT
);

-- 3. 建立約束條件
ALTER TABLE profiles ADD CONSTRAINT client_must_have_phone
  CHECK (role != 'client' OR (phone IS NOT NULL AND tier_id IS NOT NULL));

ALTER TABLE profiles ADD CONSTRAINT admin_must_have_email
  CHECK (role != 'admin' OR email IS NOT NULL);

ALTER TABLE profiles ADD CONSTRAINT must_have_identifier
  CHECK (phone IS NOT NULL OR email IS NOT NULL);

-- 4. 建立索引
CREATE INDEX idx_tiers_rank ON tiers(rank);
CREATE INDEX idx_profiles_phone ON profiles(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_profiles_email ON profiles(email) WHERE email IS NOT NULL;
CREATE INDEX idx_profiles_tier_id ON profiles(tier_id);
CREATE INDEX idx_profiles_role ON profiles(role);

-- 5. 建立觸發器 (自動更新 updated_at)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tiers_updated_at
BEFORE UPDATE ON tiers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 6. 插入預設會員等級
INSERT INTO tiers (name, rank) VALUES
  ('零售', 1),
  ('批發', 2),
  ('經銷商', 3);

-- 7. 建立 RLS (Row Level Security) 政策
ALTER TABLE tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 允許所有已認證使用者讀取等級
CREATE POLICY "Allow authenticated users to read tiers"
  ON tiers FOR SELECT
  TO authenticated
  USING (true);

-- 僅管理員可修改等級
CREATE POLICY "Allow admin to manage tiers"
  ON tiers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 客戶只能查看自己的資料
CREATE POLICY "Allow users to read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- 管理員可查看所有 profiles
CREATE POLICY "Allow admin to read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 管理員可管理所有 profiles
CREATE POLICY "Allow admin to manage profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

### 4.2 建立測試管理員帳號

**方法 1: 使用 Supabase Dashboard**
1. 前往 "Authentication" → "Users"
2. 點擊 "Add user" → "Create new user"
3. 填寫:
   - Email: `admin@test.com`
   - Password: `Admin@123456`
   - Auto Confirm User: ✅
4. 複製產生的 User ID (uuid)

**方法 2: 使用 SQL**
```sql
-- 注意: 需要替換為實際的 User ID
-- 先在 Dashboard 建立使用者後執行此 SQL
INSERT INTO profiles (id, email, role)
VALUES ('your-user-uuid', 'admin@test.com', 'admin');
```

---

## Step 5: 建立 Supabase Client 工具

### 5.1 建立目錄結構

```bash
mkdir -p lib/supabase
mkdir -p lib/actions
mkdir -p lib/validations
mkdir -p types
mkdir -p components/ui
mkdir -p components/auth
mkdir -p components/admin
```

### 5.2 建立 Supabase Client

**`lib/supabase/client.ts`** (瀏覽器端):
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**`lib/supabase/server.ts`** (伺服器端):
```typescript
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
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}
```

**`lib/supabase/middleware.ts`** (Middleware 專用):
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  await supabase.auth.getUser()

  return response
}
```

### 5.3 建立工具函式

**`lib/utils.ts`**:
```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

## Step 6: 建立基礎 UI 元件

### 6.1 Button 元件

**`components/ui/button.tsx`**:
```typescript
import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'btn-neo',
          variant === 'secondary' && 'bg-gray-200 text-black',
          variant === 'danger' && 'bg-red-500',
          className
        )}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'

export { Button }
```

### 6.2 Input 元件

**`components/ui/input.tsx`**:
```typescript
import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn('input-neo', className)}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'

export { Input }
```

---

## Step 7: 驗證環境設定

### 7.1 測試開發伺服器

```bash
pnpm dev
```

訪問 `http://localhost:3000`,應該看到 Next.js 預設首頁。

### 7.2 測試 Supabase 連線

**建立 `app/test-db/page.tsx`**:
```typescript
import { createClient } from '@/lib/supabase/server'

export default async function TestDBPage() {
  const supabase = await createClient()

  const { data: tiers, error } = await supabase
    .from('tiers')
    .select('*')
    .order('rank', { ascending: true })

  if (error) {
    return <div>錯誤: {error.message}</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">資料庫連線測試</h1>
      <p className="mb-4">成功連線! 查詢到 {tiers.length} 個會員等級:</p>
      <ul>
        {tiers.map((tier) => (
          <li key={tier.id}>
            {tier.rank}. {tier.name}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

訪問 `http://localhost:3000/test-db`,應該顯示預設的 3 個會員等級。

### 7.3 執行測試

```bash
pnpm test
```

應該顯示 "No test files found" (因為尚未撰寫測試)。

---

## Step 8: 設定 TypeScript 型別

### 8.1 產生 Supabase 型別

```bash
# 安裝 Supabase CLI (全域)
npm install -g supabase

# 登入 Supabase
supabase login

# 產生型別 (需替換 project-id)
supabase gen types typescript --project-id your-project-id > types/database.types.ts
```

**或手動建立 `types/database.types.ts`**:
```typescript
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tiers: {
        Row: {
          id: string
          name: string
          rank: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          rank: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          rank?: number
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          phone: string | null
          email: string | null
          role: 'client' | 'admin'
          tier_id: string | null
          created_at: string
          display_name: string | null
          notes: string | null
        }
        Insert: {
          id: string
          phone?: string | null
          email?: string | null
          role: 'client' | 'admin'
          tier_id?: string | null
          created_at?: string
          display_name?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          phone?: string | null
          email?: string | null
          role?: 'client' | 'admin'
          tier_id?: string | null
          created_at?: string
          display_name?: string | null
          notes?: string | null
        }
      }
    }
  }
}
```

---

## 完成 Checklist

開發環境設定完成後,請確認以下項目:

- ✅ Next.js 專案已建立並可正常啟動 (`pnpm dev`)
- ✅ Tailwind CSS 已配置 Neo-Brutalism 風格
- ✅ Supabase 專案已建立並取得 API Keys
- ✅ 環境變數 `.env.local` 已設定
- ✅ 資料庫 Schema 已建立 (tiers, profiles 表)
- ✅ 預設會員等級已插入 (零售、批發、經銷商)
- ✅ 測試管理員帳號已建立
- ✅ Supabase Client 工具已建立 (client.ts, server.ts)
- ✅ 基礎 UI 元件已建立 (Button, Input)
- ✅ 資料庫連線測試通過 (`/test-db` 頁面)
- ✅ TypeScript 型別已產生

---

## 下一步

環境設定完成後,可以開始開發功能:

1. **登入頁面**: 建立 `app/(auth)/login/page.tsx` (前台)
2. **後台登入**: 建立 `app/(auth)/admin/login/page.tsx`
3. **會員等級管理**: 建立 `app/(admin)/admin/tiers/*` 頁面
4. **客戶管理**: 建立 `app/(admin)/admin/users/*` 頁面
5. **Middleware**: 建立 `middleware.ts` 實作路由保護

詳細實作請參考:
- [API Contracts](./contracts/server-actions.md)
- [Data Model](./data-model.md)
- [Research](./research.md)

---

## 常見問題

### Q: Supabase 連線失敗怎麼辦?
**A**: 檢查 `.env.local` 的 URL 和 Key 是否正確,確認專案已完全建立完成。

### Q: RLS 政策導致無法查詢資料?
**A**: 初期開發可以暫時關閉 RLS:
```sql
ALTER TABLE tiers DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
```
**⚠️ 上線前務必重新啟用!**

### Q: TypeScript 型別錯誤?
**A**: 確認已安裝 `@supabase/supabase-js` v2.47+ 版本,並重新產生型別檔案。

### Q: Tailwind 樣式未生效?
**A**: 檢查 `tailwind.config.ts` 的 `content` 路徑是否正確,重啟開發伺服器 (`pnpm dev`)。

---

**環境設定完成!** 🎉 現在可以開始開發客戶與會員等級管理功能了。
