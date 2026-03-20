import { Metadata } from 'next'
import { DragDropSort } from '@/components/admin/sort-demo/DragDropSort'
import { NumberInputSort } from '@/components/admin/sort-demo/NumberInputSort'
import { QuickActionSort } from '@/components/admin/sort-demo/QuickActionSort'

export const metadata: Metadata = {
  title: '排序方案測試 - Vsale',
  description: '測試三種不同的排序方案',
}

// 模擬資料
const mockBlocks = [
  {
    id: '1',
    name: '新春促銷輪播圖',
    type: '圖片輪播 (16:9)',
    sort_order: 1,
  },
  {
    id: '2',
    name: '熱銷商品展示',
    type: '商品展示',
    sort_order: 2,
  },
  {
    id: '3',
    name: '品牌故事文字區',
    type: '文字區塊',
    sort_order: 3,
  },
  {
    id: '4',
    name: '限時優惠海報',
    type: '圖片輪播 (4:5)',
    sort_order: 4,
  },
  {
    id: '5',
    name: '新品推薦',
    type: '商品展示',
    sort_order: 5,
  },
  {
    id: '6',
    name: '週年慶活動',
    type: '圖片輪播 (16:9)',
    sort_order: 6,
  },
]

export default function SortDemoPage() {
  return (
    <div className="min-h-screen bg-surface-secondary p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* 成功提示 */}
        <div className="mb-6 rounded-theme-sm border border-success-border bg-success-bg p-6">
          <h2 className="mb-2 flex items-center gap-2 text-xl font-bold text-success">
            ✅ 整合版已上線！
          </h2>
          <p className="mb-3 text-success">
            我們已經將<strong>方案一（拖曳排序）</strong>和<strong>方案三（快速操作）</strong>整合到實際的首頁廣告管理頁面了！
          </p>
          <a
            href="/admin/announcements"
            className="inline-block rounded-theme-sm border bg-green-400 px-6 py-3 font-bold transition-all hover:-translate-y-0.5 hover:shadow-theme-hover"
          >
            前往首頁廣告管理 →
          </a>
        </div>

        {/* 標題 */}
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">首頁廣告排序方案測試</h1>
          <p className="text-text-secondary">
            以下是三種排序方式的獨立測試版本，你可以繼續體驗
          </p>
        </div>

        {/* 三個方案展示 */}
        <div className="space-y-8">
          {/* 方案一：拖曳排序 */}
          <section className="rounded-lg border bg-surface p-6 shadow-neo">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="mb-1 text-2xl font-bold">
                  方案一：拖曳排序 🎯
                </h2>
                <p className="text-sm text-text-secondary">
                  最直覺的操作方式 - 按住項目拖曳到想要的位置
                </p>
              </div>
              <span className="rounded-theme-sm border border-success-border bg-success-bg px-3 py-1 text-sm font-bold text-success">
                推薦
              </span>
            </div>
            <DragDropSort initialBlocks={mockBlocks} />
          </section>

          {/* 方案二：數字輸入排序 */}
          <section className="rounded-lg border bg-surface p-6 shadow-neo">
            <div className="mb-4">
              <h2 className="mb-1 text-2xl font-bold">
                方案二：數字輸入排序 🔢
              </h2>
              <p className="text-sm text-text-secondary">
                精確控制 - 直接輸入想要的順序號碼，適合大量調整
              </p>
            </div>
            <NumberInputSort initialBlocks={mockBlocks} />
          </section>

          {/* 方案三：快速操作排序 */}
          <section className="rounded-lg border bg-surface p-6 shadow-neo">
            <div className="mb-4">
              <h2 className="mb-1 text-2xl font-bold">
                方案三：快速操作排序 ⚡
              </h2>
              <p className="text-sm text-text-secondary">
                強化版按鈕 - 除了上移/下移，還能一鍵移到頂部或底部
              </p>
            </div>
            <QuickActionSort initialBlocks={mockBlocks} />
          </section>
        </div>

        {/* 說明 */}
        <div className="mt-8 rounded-lg border border-info-border bg-info-bg p-6">
          <h3 className="mb-3 text-lg font-bold text-info">💡 操作說明</h3>
          <div className="space-y-2 text-sm text-info">
            <p>
              <strong>方案一（拖曳）：</strong>
              直接用滑鼠按住任一項目，拖曳到想要的位置後放開。修改完成後點擊「儲存順序」。
            </p>
            <p>
              <strong>方案二（數字輸入）：</strong>
              在每個項目旁的輸入框輸入順序號碼（1 = 第一位，2 = 第二位，依此類推）。修改完成後點擊「儲存順序」。
            </p>
            <p>
              <strong>方案三（快速操作）：</strong>
              使用四個按鈕快速調整：「移到頂部」、「上移」、「下移」、「移到底部」。每次操作立即生效。
            </p>
          </div>
        </div>

        {/* 回到管理頁 */}
        <div className="mt-8 text-center">
          <a
            href="/admin/announcements"
            className="inline-block rounded-theme-sm border bg-surface-secondary px-6 py-3 font-bold transition-all hover:-translate-y-0.5 hover:shadow-theme-hover active:scale-[0.98]"
          >
            ← 回到首頁廣告管理
          </a>
        </div>
      </div>
    </div>
  )
}
