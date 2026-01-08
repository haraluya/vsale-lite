import { redirect } from 'next/navigation'

/**
 * 根目錄頁面
 * 直接導向前台登入頁面
 */
export default function Home() {
  redirect('/login')
}
