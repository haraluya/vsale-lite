/**
 * 備份檔案下載 API
 * GET /api/backup/download/[jobId]
 * 直接從 GCS 讀取檔案並返回，不使用 Signed URL
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { downloadBackupFile } from '@/lib/cloud-storage/gcs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const supabase = await createClient()

    // 權限檢查：必須是管理員
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: '未授權：請先登入' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: '權限不足：僅管理員可下載備份' },
        { status: 403 }
      )
    }

    // 查詢備份記錄
    const { data: job, error: fetchError } = await supabase
      .from('backup_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (fetchError || !job) {
      return NextResponse.json(
        { error: '備份記錄不存在' },
        { status: 404 }
      )
    }

    // 檢查備份狀態
    if (job.status !== 'success') {
      return NextResponse.json(
        { error: `無法下載：備份狀態為 ${job.status}` },
        { status: 400 }
      )
    }

    // 從 GCS 下載檔案
    const buffer = await downloadBackupFile(job.filename)

    // 返回檔案（轉換 Buffer 為 Uint8Array）
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="${job.filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Download backup failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '下載備份失敗' },
      { status: 500 }
    )
  }
}
