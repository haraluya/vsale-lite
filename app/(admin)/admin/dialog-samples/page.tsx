import { DialogSamplesContent } from '@/components/admin/dialog-samples/DialogSamplesContent'
import { generatePageMetadata } from '@/lib/metadata'

export async function generateMetadata() {
  return generatePageMetadata('對話框範例', 'Neo-Brutalism 對話框設計樣本')
}

/**
 * 對話框樣本頁面
 * Phase 0: 設計樣本確認
 *
 * 展示所有對話框變體讓使用者確認設計風格
 */
export default function DialogSamplesPage() {
  return <DialogSamplesContent />
}
