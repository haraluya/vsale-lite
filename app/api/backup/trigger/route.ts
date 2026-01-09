/**
 * 備份觸發 API（支援 Server-Sent Events 進度回報）
 * POST /api/backup/trigger
 * 執行備份並透過 SSE 即時回報進度
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { performBackupWithProgress } from '@/lib/backup/db-backup'

// EventSource 只支援 GET 請求
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 權限檢查：必須是管理員
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: '未授權：請先登入' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: '權限不足：僅管理員可執行備份' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 建立 SSE 回應
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 執行備份並回報進度
          await performBackupWithProgress('manual', user.id, (progress) => {
            // 發送進度更新
            const data = `data: ${JSON.stringify(progress)}\n\n`
            controller.enqueue(encoder.encode(data))
          })

          // 備份完成
          controller.close()
        } catch (error) {
          // 發送錯誤訊息
          const errorData = `data: ${JSON.stringify({
            stage: 'error',
            message: error instanceof Error ? error.message : '備份失敗',
          })}\n\n`
          controller.enqueue(encoder.encode(errorData))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Backup trigger failed:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : '執行備份失敗' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
