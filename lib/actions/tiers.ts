'use server'

import { createClient } from '@/lib/supabase/server'
import { createTierSchema, updateTierSchema } from '@/lib/validations/tier.schema'
import type { ActionResult, Tier } from '@/types'
import { checkAuth } from './helpers'
import { revalidatePath } from 'next/cache'

/**
 * 查詢所有會員等級 (依 rank 排序)
 */
export async function getTiers(): Promise<Tier[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tiers')
    .select('*')
    .order('rank', { ascending: true })

  if (error) {
    console.error('查詢會員等級失敗:', error)
    return []
  }

  return data || []
}

/**
 * 建立新會員等級
 */
export async function createTier(
  prevState: any,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. 驗證權限
    await checkAuth('admin')

    // 2. 驗證輸入
    const validatedFields = createTierSchema.safeParse({
      name: formData.get('name'),
      rank: formData.get('rank'),
    })

    if (!validatedFields.success) {
      return {
        success: false,
        errors: validatedFields.error.flatten().fieldErrors,
        message: '驗證失敗',
      }
    }

    // 3. 檢查名稱是否重複
    const supabase = await createClient()
    const { data: existingTier } = await supabase
      .from('tiers')
      .select('id')
      .eq('name', validatedFields.data.name)
      .single()

    if (existingTier) {
      return {
        success: false,
        message: '此等級名稱已存在',
      }
    }

    // 4. 建立等級
    const { data, error } = await supabase
      .from('tiers')
      .insert(validatedFields.data)
      .select('id')
      .single()

    if (error) {
      console.error('建立等級失敗:', error)
      return {
        success: false,
        message: '建立失敗,請稍後再試',
      }
    }

    // 5. Revalidate
    revalidatePath('/admin/tiers')

    return {
      success: true,
      data: { id: data.id },
      message: '等級建立成功',
    }
  } catch (error) {
    console.error('createTier error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '建立失敗',
    }
  }
}

/**
 * 更新會員等級
 */
export async function updateTier(
  id: string,
  prevState: any,
  formData: FormData
): Promise<ActionResult> {
  try {
    // 1. 驗證權限
    await checkAuth('admin')

    // 2. 驗證輸入
    const validatedFields = updateTierSchema.safeParse({
      name: formData.get('name') || undefined,
      rank: formData.get('rank') || undefined,
    })

    if (!validatedFields.success) {
      return {
        success: false,
        errors: validatedFields.error.flatten().fieldErrors,
        message: '驗證失敗',
      }
    }

    const supabase = await createClient()

    // 3. 檢查等級是否存在
    const { data: existingTier } = await supabase
      .from('tiers')
      .select('id')
      .eq('id', id)
      .single()

    if (!existingTier) {
      return {
        success: false,
        message: '等級不存在',
      }
    }

    // 4. 若修改 name,檢查是否與其他等級重複
    if (validatedFields.data.name) {
      const { data: duplicateTier } = await supabase
        .from('tiers')
        .select('id')
        .eq('name', validatedFields.data.name)
        .neq('id', id)
        .single()

      if (duplicateTier) {
        return {
          success: false,
          message: '此等級名稱已存在',
        }
      }
    }

    // 5. 更新等級
    const { error } = await supabase
      .from('tiers')
      .update(validatedFields.data)
      .eq('id', id)

    if (error) {
      console.error('更新等級失敗:', error)
      return {
        success: false,
        message: '更新失敗,請稍後再試',
      }
    }

    // 6. Revalidate
    revalidatePath('/admin/tiers')

    return {
      success: true,
      message: '等級更新成功',
    }
  } catch (error) {
    console.error('updateTier error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '更新失敗',
    }
  }
}

/**
 * 刪除會員等級
 */
export async function deleteTier(id: string): Promise<ActionResult> {
  try {
    // 1. 驗證權限
    await checkAuth('admin')

    const supabase = await createClient()

    // 2. 檢查是否有客戶使用此等級
    const { count, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('tier_id', id)

    if (countError) {
      console.error('查詢客戶數量失敗:', countError)
      return {
        success: false,
        message: '查詢失敗,請稍後再試',
      }
    }

    if (count && count > 0) {
      return {
        success: false,
        message: `此等級已有 ${count} 位客戶使用,無法刪除`,
      }
    }

    // 3. 刪除等級
    const { error } = await supabase.from('tiers').delete().eq('id', id)

    if (error) {
      console.error('刪除等級失敗:', error)
      return {
        success: false,
        message: '刪除失敗,請稍後再試',
      }
    }

    // 4. Revalidate
    revalidatePath('/admin/tiers')

    return {
      success: true,
      message: '等級刪除成功',
    }
  } catch (error) {
    console.error('deleteTier error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '刪除失敗',
    }
  }
}
