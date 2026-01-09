import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Admin client for querying profiles (bypasses RLS)
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  // 更新 session (重要:確保 cookie 正確設置)
  let user = null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      // Token 過期或無效,清除 session
      console.warn('[Middleware] Auth token error:', error.message)
      user = null
    } else {
      user = data.user
    }
  } catch (error) {
    // 網路錯誤時,允許請求繼續但不進行認證檢查
    if (error instanceof Error && error.message.includes('fetch failed')) {
      console.warn('[Middleware] Network error, skipping auth check')
    } else {
      console.error('[Middleware] Unexpected auth error:', error)
    }

    // 如果是網路錯誤且不是受保護路由,放行
    const pathname = request.nextUrl.pathname
    const publicPaths = ['/login', '/admin/login']
    if (publicPaths.includes(pathname)) {
      return supabaseResponse
    }
    // 受保護路由則導向登入頁
    const url = request.nextUrl.clone()
    url.pathname = pathname.startsWith('/admin') ? '/admin/login' : '/login'
    return NextResponse.redirect(url)
  }

  const { pathname } = request.nextUrl

  // 公開路由:登入頁（根目錄會自動導向 /login，無需特殊處理）
  const publicPaths = ['/login', '/admin/login']
  const isPublicPath = publicPaths.includes(pathname)

  // 管理員路由
  const isAdminRoute = pathname.startsWith('/admin')

  // 客戶路由 (前台商店)
  const isClientRoute = pathname.startsWith('/store')

  // 1. 未登入處理
  if (!user) {
    // 訪問管理員路由 → 重導向至後台登入
    if (isAdminRoute && pathname !== '/admin/login') {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }

    // 訪問客戶路由 → 重導向至前台登入
    if (isClientRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // 公開路由 → 放行
    return supabaseResponse
  }

  // 2. 已登入:檢查角色權限
  // 查詢使用者角色（使用 Admin Client 繞過 RLS）
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    // 找不到 profile → 登出並導向對應的登入頁
    await supabase.auth.signOut()
    const url = request.nextUrl.clone()
    // 判斷是後台還是前台路由
    url.pathname = pathname.startsWith('/admin') ? '/admin/login' : '/login'
    return NextResponse.redirect(url)
  }

  // 3. 已登入訪問登入頁處理 (允許切換角色)
  if (isPublicPath) {
    // 客戶訪問後台登入頁 → 允許 (需要先登出才能以管理員身份登入)
    if (profile.role === 'client' && pathname === '/admin/login') {
      return supabaseResponse
    }

    // 管理員訪問前台登入頁 → 允許 (需要先登出才能以客戶身份登入)
    if (profile.role === 'admin' && pathname === '/login') {
      return supabaseResponse
    }

    // 訪問當前角色的登入頁 → 導向對應首頁
    const url = request.nextUrl.clone()
    if (profile.role === 'admin') {
      url.pathname = '/admin/dashboard'
    } else {
      url.pathname = '/store'
    }
    return NextResponse.redirect(url)
  }

  // 4. 客戶嘗試訪問管理員路由 → 阻擋並導向前台商店
  if (profile.role === 'client' && isAdminRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/store'
    return NextResponse.redirect(url)
  }

  // 5. 管理員可以訪問所有路由 (上帝視角)
  if (profile.role === 'admin') {
    return supabaseResponse
  }

  // 6. 客戶訪問客戶路由 → 放行
  if (profile.role === 'client' && isClientRoute) {
    return supabaseResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     * - api routes (API 路由)
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
