/**
 * Cron Job API - 每日自動備份
 * 由 Vercel Cron 每日凌晨 2:00 觸發
 *
 * Security: 使用 CRON_SECRET 驗證請求來源
 */

import { NextRequest, NextResponse } from 'next/server'
import { performBackup } from '@/lib/backup/db-backup'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs' // pg_dump 需要 Node.js runtime

/**
 * POST /api/cron/backup
 * 觸發自動備份任務
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 驗證 CRON_SECRET
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('CRON_SECRET is not configured')
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('Invalid CRON_SECRET')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. 檢查備份是否啟用
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const { data: setting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'backup_enabled')
      .single()

    if (setting?.value !== 'true') {
      console.log('Backup is disabled, skipping...')
      return NextResponse.json({
        success: true,
        message: 'Backup is disabled',
      })
    }

    // 3. 執行自動備份
    console.log('Starting automatic backup...')
    const jobId = await performBackup('auto')

    console.log(`Backup completed successfully: ${jobId}`)

    // 4. 執行滾動刪除（保留最新 N 個備份）
    const { data: maxKeepSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'backup_max_keep')
      .single()

    const maxKeep = parseInt(maxKeepSetting?.value || '10', 10)

    // 查詢成功的備份（依建立時間排序）
    const { data: backups } = await supabase
      .from('backup_jobs')
      .select('id, filename, storage_provider')
      .eq('status', 'success')
      .order('created_at', { ascending: false })

    if (backups && backups.length > maxKeep) {
      // 刪除舊備份
      const toDelete = backups.slice(maxKeep)
      console.log(`Deleting ${toDelete.length} old backups...`)

      for (const backup of toDelete) {
        try {
          // 刪除 GCS 檔案
          if (backup.storage_provider === 'gcs') {
            const { deleteBackup } = await import('@/lib/cloud-storage/gcs')
            await deleteBackup(backup.filename)
          }

          // 刪除資料庫記錄
          await supabase.from('backup_jobs').delete().eq('id', backup.id)

          console.log(`Deleted backup: ${backup.filename}`)
        } catch (error) {
          console.error(`Failed to delete backup ${backup.filename}:`, error)
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        deletedCount: Math.max(0, (backups?.length || 0) - maxKeep),
      },
      message: 'Automatic backup completed',
    })
  } catch (error) {
    console.error('Cron job failed:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cron/backup
 * 健康檢查端點（不需要驗證）
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/cron/backup',
    method: 'POST',
    description: 'Automatic database backup cron job',
  })
}
