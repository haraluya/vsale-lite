/**
 * 備份還原 API Route（支援 EventSource 即時進度回報）
 * GET /api/backup/restore?jobId=xxx
 */

import { NextRequest } from 'next/server'
import { performRestore } from '@/lib/backup/db-restore'
import type { RestoreProgressCallback } from '@/lib/backup/db-restore'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 600 // 10 分鐘（還原可能需要較長時間）

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId')

  if (!jobId) {
    return new Response('Missing jobId parameter', { status: 400 })
  }

  // 建立 Server-Sent Events (SSE) 串流
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const onProgress: RestoreProgressCallback = (progress) => {
        send(progress)
      }

      try {
        // 執行還原流程
        await performRestore(jobId, onProgress)

        // 關閉串流
        controller.close()
      } catch (error) {
        // 發送錯誤訊息
        send({
          stage: 'error',
          message: '還原失敗',
          percentage: 0,
          error: error instanceof Error ? error.message : String(error),
        })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
