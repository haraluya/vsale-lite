/**
 * API Route: 公開設定
 * 提供公開的系統設定給 Client Components 使用
 */

import { NextResponse } from 'next/server'
import { getPublicSettings } from '@/lib/actions/system'

// 禁用快取，確保每次都讀取最新資料
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const result = await getPublicSettings()

  if (!result.success) {
    return NextResponse.json({ success: false, settings: [] }, { status: 500 })
  }

  return NextResponse.json(
    {
      success: true,
      settings: result.data,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  )
}
