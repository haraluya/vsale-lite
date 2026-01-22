/**
 * API 路由：檢查 Supabase 連線狀態
 * 用途：驗證 Vercel 環境變數是否正確
 *
 * 訪問: https://vsale-site2.vercel.app/api/check-connection
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // 1. 取得環境變數
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY

    // 2. 測試連線：查詢 profiles 表（不返回資料，只測試連線）
    const { error: profilesError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })

    // 3. 測試 Auth 連線
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // 4. 判斷是主站還是站點二
    const isMainSite = supabaseUrl?.includes('qwovavytryvgchcowjof')
    const isSite2 = supabaseUrl?.includes('rdyvmgomjdglflrcfijs')

    return NextResponse.json({
      success: true,
      connection: {
        supabaseUrl,
        site: isMainSite ? '主站點' : isSite2 ? '站點二' : '未知',
        projectId: supabaseUrl?.split('.')[0]?.split('//')[1],
        hasAnonKey,
        hasServiceKey,
      },
      database: {
        profilesTableAccessible: !profilesError,
        profilesError: profilesError?.message || null,
      },
      auth: {
        currentUser: user?.email || null,
        authError: authError?.message || null,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
