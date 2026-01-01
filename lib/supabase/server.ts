import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * 建立一般的 Supabase 客戶端 (使用 ANON_KEY)
 * 用於需要使用者 session 的操作
 */
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
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `remove` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * 建立管理員 Supabase 客戶端 (使用 SERVICE_ROLE_KEY)
 * 用於 Admin API 操作 (createUser, deleteUser, updateUserById 等)
 *
 * ⚠️ 注意: Service Role Key 擁有完整權限,僅在 Server Actions 中使用
 */
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('缺少 SUPABASE_SERVICE_ROLE_KEY 環境變數')
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
