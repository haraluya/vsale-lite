/**
 * Store Root Page (前台商店根路由)
 * Feature: 016-home-page-blocks
 *
 * 重定向到首頁
 */

import { redirect } from 'next/navigation'

export default function StoreRootPage() {
  redirect('/store/home')
}
