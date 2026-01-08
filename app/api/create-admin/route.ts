import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * 臨時 API：建立管理員帳號
 *
 * ⚠️ 安全警告：此 API 應在建立帳號後立即刪除
 *
 * 使用方式：
 * POST /api/create-admin
 * Body: { "email": "admin@vsale.com", "password": "Admin123456" }
 */
export async function POST(request: Request) {
  try {
    // 1. 解析請求
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email 和密碼為必填' },
        { status: 400 }
      )
    }

    // 2. 使用 Service Role Key 建立 Admin Client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // 3. 建立 Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 自動確認 Email
      user_metadata: {
        role: 'admin',
      },
    })

    if (authError) {
      console.error('建立 Auth User 失敗:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: 500 }
      )
    }

    // 4. 建立 Profile 記錄
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email,
        phone: null,
        role: 'admin',
        full_name: '系統管理員',
      })

    if (profileError) {
      console.error('建立 Profile 失敗:', profileError)
      return NextResponse.json(
        { error: `Profile 建立失敗: ${profileError.message}` },
        { status: 500 }
      )
    }

    // 5. 成功回應
    return NextResponse.json({
      success: true,
      message: '管理員帳號建立成功',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: 'admin',
      },
    })
  } catch (error) {
    console.error('建立管理員失敗:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '未知錯誤' },
      { status: 500 }
    )
  }
}
