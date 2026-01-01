import { z } from 'zod'

// 前台登入 Schema (手機號碼)
export const loginWithPhoneSchema = z.object({
  phone: z.string()
    .regex(/^09\d{8}$/, '請輸入有效的手機號碼 (09 開頭,共 10 碼)')
    .transform(val => val.replace(/[\s-]/g, '')),
  password: z.string().min(1, '密碼不可為空'),
})

// 後台登入 Schema (Email)
export const loginWithEmailSchema = z.object({
  email: z.string().email('請輸入有效的 Email'),
  password: z.string().min(1, '密碼不可為空'),
})

export type LoginWithPhoneInput = z.infer<typeof loginWithPhoneSchema>
export type LoginWithEmailInput = z.infer<typeof loginWithEmailSchema>
