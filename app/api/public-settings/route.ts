/**
 * API Route: 公開設定
 * 提供公開的系統設定給 Client Components 使用
 */

import { NextResponse } from 'next/server'
import { getPublicSettings } from '@/lib/actions/system'

export async function GET() {
  const result = await getPublicSettings()

  if (!result.success) {
    return NextResponse.json({ success: false, settings: [] }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    settings: result.data,
  })
}
