import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// 載入環境變數
config({ path: resolve(process.cwd(), '.env.local') })

// Supabase Site 2 Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_SITE2!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_SITE2!
)

async function fixPaths() {
  console.log('🔧 開始修正站點 2 的 Cloudinary 圖片路徑...\n')
  console.log(`📍 Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL_SITE2}\n`)

  // 修正系列圖片
  console.log('📁 [1/4] 修正系列圖片路徑...')
  const { data: series } = await supabase
    .from('series')
    .select('id, image_url')
    .like('image_url', 'vsale-site2/%')

  if (series) {
    for (const item of series) {
      const newPath = `/${item.image_url}`
      await supabase
        .from('series')
        .update({ image_url: newPath })
        .eq('id', item.id)
      console.log(`  ✅ ${item.id}: ${item.image_url} → ${newPath}`)
    }
  }
  console.log(`✅ 系列圖片路徑修正完成（${series?.length || 0} 筆）\n`)

  // 修正商品圖片
  console.log('📁 [2/4] 修正商品圖片路徑...')
  const { data: products } = await supabase
    .from('products')
    .select('id, image_url')
    .like('image_url', 'vsale-site2/%')

  if (products) {
    for (const item of products) {
      const newPath = `/${item.image_url}`
      await supabase
        .from('products')
        .update({ image_url: newPath })
        .eq('id', item.id)
      console.log(`  ✅ ${item.id}: ${item.image_url} → ${newPath}`)
    }
  }
  console.log(`✅ 商品圖片路徑修正完成（${products?.length || 0} 筆）\n`)

  // 修正廣告圖片
  console.log('📁 [3/4] 修正廣告圖片路徑...')
  const { data: announcements } = await supabase
    .from('announcements')
    .select('id, image_url')
    .like('image_url', 'vsale-site2/%')

  if (announcements) {
    for (const item of announcements) {
      const newPath = `/${item.image_url}`
      await supabase
        .from('announcements')
        .update({ image_url: newPath })
        .eq('id', item.id)
      console.log(`  ✅ ${item.id}: ${item.image_url} → ${newPath}`)
    }
  }
  console.log(`✅ 廣告圖片路徑修正完成（${announcements?.length || 0} 筆）\n`)

  // 修正首頁區塊圖片
  console.log('📁 [4/4] 修正首頁區塊圖片路徑...')
  const { data: blocks } = await supabase
    .from('home_page_blocks')
    .select('id, config')
    .eq('block_type', 'image_carousel')

  let blockCount = 0
  if (blocks) {
    for (const block of blocks) {
      const config = block.config as any
      if (!config.images || !Array.isArray(config.images)) continue

      let hasChanges = false
      for (const img of config.images) {
        if (img.url && img.url.startsWith('vsale-site2/')) {
          img.url = `/${img.url}`
          hasChanges = true
        }
      }

      if (hasChanges) {
        await supabase
          .from('home_page_blocks')
          .update({ config })
          .eq('id', block.id)
        blockCount++
        console.log(`  ✅ 區塊 ${block.id} 已更新`)
      }
    }
  }
  console.log(`✅ 首頁區塊路徑修正完成（${blockCount} 筆）\n`)

  console.log('✅ 站點 2 所有路徑修正完成！')
}

fixPaths().catch(console.error)
