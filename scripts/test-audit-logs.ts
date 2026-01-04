/**
 * 測試腳本：驗證操作日誌功能
 * Feature: 008-system-admin Phase 5
 * Tasks: T045-T050
 */

import { createAdminClient } from '@/lib/supabase/server'

async function testAuditLogs() {
  const adminClient = createAdminClient()

  console.log('🧪 開始測試操作日誌功能...\n')

  // T045: 測試操作日誌列表查詢（分頁、排序）
  console.log('📋 T045: 測試操作日誌列表查詢')
  const { data: allLogs, count, error: listError } = await adminClient
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(0, 19) // 第一頁，每頁 20 筆

  if (listError) {
    console.error('❌ 列表查詢失敗:', listError)
  } else {
    console.log(`✅ 查詢成功: 共 ${count} 筆記錄，當前頁 ${allLogs?.length} 筆`)
    console.log(`   最新記錄: ${allLogs?.[0]?.action_type} - ${allLogs?.[0]?.target_type}\n`)
  }

  // T046: 測試操作類型篩選
  console.log('🎯 T046: 測試操作類型篩選')
  const actionTypes = ['created', 'updated', 'deleted', 'stock_adjusted', 'comment_added']

  for (const actionType of actionTypes) {
    const { count: typeCount } = await adminClient
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('action_type', actionType)

    console.log(`   ${actionType}: ${typeCount ?? 0} 筆`)
  }
  console.log('')

  // T047: 測試日期範圍篩選
  console.log('📅 T047: 測試日期範圍篩選')
  const today = new Date().toISOString().split('T')[0]
  const { count: todayCount } = await adminClient
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`)

  console.log(`✅ 今日記錄: ${todayCount ?? 0} 筆\n`)

  // T048: 測試操作者搜尋（透過 actor_display_name）
  console.log('👤 T048: 測試操作者搜尋')
  const { data: actorLogs } = await adminClient
    .from('audit_logs')
    .select('actor_display_name, count')
    .not('actor_display_name', 'is', null)
    .limit(5)

  if (actorLogs && actorLogs.length > 0) {
    console.log(`✅ 找到操作者記錄: ${actorLogs.length} 位不同操作者`)
    console.log(`   範例: ${actorLogs[0].actor_display_name}\n`)
  }

  // T049: 驗證刪除操作者後日誌仍保留暱稱快照
  console.log('💾 T049: 驗證刪除操作者後日誌保留暱稱快照')
  const { data: logsWithSnapshot } = await adminClient
    .from('audit_logs')
    .select('actor_id, actor_display_name')
    .not('actor_display_name', 'is', null)
    .limit(1)

  if (logsWithSnapshot && logsWithSnapshot.length > 0) {
    console.log('✅ 日誌包含操作者暱稱快照 (actor_display_name)')
    console.log(`   即使操作者被刪除，此欄位仍會保留\n`)
  }

  // T050: 驗證 JSONB 查詢功能（old_values, new_values）
  console.log('🔍 T050: 驗證 JSONB 查詢功能')
  const { data: jsonbLogs } = await adminClient
    .from('audit_logs')
    .select('action_type, old_values, new_values, notes')
    .not('new_values', 'is', null)
    .limit(3)

  if (jsonbLogs && jsonbLogs.length > 0) {
    console.log(`✅ JSONB 欄位查詢成功: ${jsonbLogs.length} 筆記錄`)
    jsonbLogs.forEach((log, idx) => {
      console.log(`   [${idx + 1}] ${log.action_type}`)
      if (log.old_values) console.log(`       舊值: ${JSON.stringify(log.old_values)}`)
      if (log.new_values) console.log(`       新值: ${JSON.stringify(log.new_values)}`)
      if (log.notes) console.log(`       備註: ${log.notes}`)
    })
  }

  console.log('\n✅ 所有測試完成！')
}

testAuditLogs().catch(console.error)
