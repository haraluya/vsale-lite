/**
 * API 路由：測試環境變數是否正確載入
 * 用途：診斷 Vercel 環境變數問題
 */

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'UNDEFINED',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...`
        : 'UNDEFINED',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
        ? `${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...`
        : 'UNDEFINED',
      NODE_ENV: process.env.NODE_ENV,
    },
    detection: {
      projectRef: process.env.NEXT_PUBLIC_SUPABASE_URL?.split('.')[0]?.split('//')[1] || 'unknown',
      hasMainSiteConfig: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      hasSite2Config: !!(process.env.NEXT_PUBLIC_SUPABASE_URL_SITE2 && process.env.SUPABASE_SERVICE_ROLE_KEY_SITE2),
    }
  })
}
