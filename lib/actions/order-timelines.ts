'use server'

import { createClient } from '@/lib/supabase/server'
import { checkAuth } from './helpers'
import type { ActionResult, OrderTimeline } from '@/types'

/**
 * 訂單時間軸 Server Actions
 * Feature: 004-cart-and-orders / US5
 */

/**
 * 查詢訂單操作歷史 (US5)
 * - 客戶只能查看自己訂單的歷史 (RLS 過濾)
 * - 管理員可查看所有訂單歷史
 * - 按時間正序排列
 */
export async function getOrderTimelines(
  orderId: string
): Promise<ActionResult<OrderTimeline[]>> {
  try {
    const supabase = await createClient()
    const { userId, role } = await checkAuth()

    // 查詢訂單操作歷史
    const { data: timelines, error } = await supabase
      .from('order_timelines')
      .select(`
        id,
        order_id,
        action_type,
        actor_id,
        actor_role,
        old_status,
        new_status,
        content,
        created_at,
        profiles(display_name, phone)
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('查詢訂單歷史錯誤:', error)

      // 若無權限或訂單不存在，RLS 會回傳空陣列而非錯誤
      // 但若有其他錯誤，則回傳錯誤訊息
      if (error.code === 'PGRST116') {
        return {
          success: false,
          message: '訂單不存在或您無權查看',
        }
      }

      return {
        success: false,
        message: '查詢訂單歷史時發生錯誤',
      }
    }

    // 格式化時間軸資料
    const formattedTimelines: OrderTimeline[] = (timelines || []).map((timeline: any) => ({
      id: timeline.id,
      order_id: timeline.order_id,
      action_type: timeline.action_type,
      actor_id: timeline.actor_id,
      actor_role: timeline.actor_role,
      old_status: timeline.old_status,
      new_status: timeline.new_status,
      content: timeline.content,
      created_at: timeline.created_at,
      actor_name: timeline.profiles?.display_name || timeline.profiles?.phone || '系統',
    }))

    return {
      success: true,
      data: formattedTimelines,
    }
  } catch (error) {
    console.error('getOrderTimelines error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '查詢訂單歷史時發生未知錯誤',
    }
  }
}
