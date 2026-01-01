import { createServerClient } from '@supabase/ssr'
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

  // 更新 session (重要:確保 cookie 正確設置)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // 公開路由:登入頁、首頁
  const publicPaths = ['/', '/login', '/admin/login']
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
  // 查詢使用者角色
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    // 找不到 profile → 登出並導向登入頁
    await supabase.auth.signOut()
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 3. 客戶嘗試訪問管理員路由 → 阻擋並導向前台登入
  if (profile.role === 'client' && isAdminRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 4. 管理員可以訪問所有路由 (上帝視角)
  if (profile.role === 'admin') {
    return supabaseResponse
  }

  // 5. 客戶訪問客戶路由 → 放行
  if (profile.role === 'client' && isClientRoute) {
    return supabaseResponse
  }

  // 6. 已登入訪問登入頁 → 導向對應首頁
  if (isPublicPath && pathname !== '/') {
    const url = request.nextUrl.clone()
    if (profile.role === 'admin') {
      url.pathname = '/admin/dashboard'
    } else {
      url.pathname = '/store'
    }
    return NextResponse.redirect(url)
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
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
