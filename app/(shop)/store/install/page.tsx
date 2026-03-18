/**
 * PWA 安裝教學頁面
 * 偵測使用者裝置環境，提供對應的安裝指引
 */

import { InstallGuideClient } from '@/components/shop/install-guide-client'

export const metadata = {
  title: '安裝 APP',
}

export default function InstallPage() {
  return <InstallGuideClient />
}
