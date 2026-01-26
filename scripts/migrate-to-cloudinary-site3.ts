import { createClient } from '@supabase/supabase-js'
import { v2 as cloudinary } from 'cloudinary'
import { config } from 'dotenv'
import { resolve } from 'path'

// 明確載入 .env.local 檔案
config({ path: resolve(process.cwd(), '.env.local') })

// Cloudinary 配置（共用同一個帳號）
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Supabase Site 3 Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_SITE3!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_SITE3!
)

// 圖片遷移主邏輯
async function migrateImages() {
  console.log('🚀 開始遷移站點 3 圖片到 Cloudinary...\n')
  console.log(`📍 Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL_SITE3}\n`)

  // 步驟 1: 遷移系列圖片
  await migrateSeries()

  // 步驟 2: 遷移商品圖片
  await migrateProducts()

  // 步驟 3: 遷移廣告圖片
  await migrateAnnouncements()

  // 步驟 4: 遷移首頁區塊圖片
  await migrateHomeBlocks()

  console.log('\n✅ 站點 3 所有圖片遷移完成！')
}

// 遷移系列圖片
async function migrateSeries() {
  console.log('📁 [1/4] 遷移系列圖片...')

  const { data: series, error } = await supabase
    .from('series')
    .select('id, name, image_url')
    .not('image_url', 'is', null)

  if (error) throw error

  for (let i = 0; i < series.length; i++) {
    const item = series[i]
    console.log(`  [${i + 1}/${series.length}] ${item.name}`)

    try {
      // 上傳到 Cloudinary（使用 vsale-site3 資料夾）
      const result = await cloudinary.uploader.upload(item.image_url, {
        folder: 'vsale-site3/series',
        public_id: item.id,
        overwrite: true,
      })

      // 更新資料庫（儲存 Cloudinary public_id，不帶 / 開頭）
      const cloudinaryPath = `vsale-site3/series/${item.id}`

      await supabase
        .from('series')
        .update({ image_url: cloudinaryPath })
        .eq('id', item.id)

      console.log(`    ✅ 上傳成功: ${result.secure_url}`)
    } catch (err: any) {
      console.error(`    ❌ 上傳失敗: ${err.message}`)
    }
  }

  console.log(`✅ 系列圖片遷移完成（${series.length} 張）\n`)
}

// 遷移商品圖片
async function migrateProducts() {
  console.log('📁 [2/4] 遷移商品圖片...')

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, image_url')
    .not('image_url', 'is', null)

  if (error) throw error

  for (let i = 0; i < products.length; i++) {
    const item = products[i]
    console.log(`  [${i + 1}/${products.length}] ${item.name}`)

    try {
      const result = await cloudinary.uploader.upload(item.image_url, {
        folder: 'vsale-site3/products',
        public_id: item.id,
        overwrite: true,
      })

      const cloudinaryPath = `vsale-site3/products/${item.id}`

      await supabase
        .from('products')
        .update({ image_url: cloudinaryPath })
        .eq('id', item.id)

      console.log(`    ✅ 上傳成功: ${result.secure_url}`)
    } catch (err: any) {
      console.error(`    ❌ 上傳失敗: ${err.message}`)
    }
  }

  console.log(`✅ 商品圖片遷移完成（${products.length} 張）\n`)
}

// 遷移廣告圖片
async function migrateAnnouncements() {
  console.log('📁 [3/4] 遷移廣告圖片...')

  const { data: announcements, error } = await supabase
    .from('announcements')
    .select('id, title, image_url')

  if (error) throw error

  for (let i = 0; i < announcements.length; i++) {
    const item = announcements[i]
    console.log(`  [${i + 1}/${announcements.length}] ${item.title}`)

    try {
      const result = await cloudinary.uploader.upload(item.image_url, {
        folder: 'vsale-site3/announcements',
        public_id: item.id,
        overwrite: true,
      })

      const cloudinaryPath = `vsale-site3/announcements/${item.id}`

      await supabase
        .from('announcements')
        .update({ image_url: cloudinaryPath })
        .eq('id', item.id)

      console.log(`    ✅ 上傳成功: ${result.secure_url}`)
    } catch (err: any) {
      console.error(`    ❌ 上傳失敗: ${err.message}`)
    }
  }

  console.log(`✅ 廣告圖片遷移完成（${announcements.length} 張）\n`)
}

// 遷移首頁區塊圖片
async function migrateHomeBlocks() {
  console.log('📁 [4/4] 遷移首頁區塊圖片...')

  const { data: blocks, error } = await supabase
    .from('home_page_blocks')
    .select('id, config')
    .eq('block_type', 'image_carousel')

  if (error) throw error

  for (const block of blocks) {
    const config = block.config as any

    if (!config.images || !Array.isArray(config.images)) continue

    console.log(`  區塊 ${block.id}（${config.images.length} 張圖片）`)

    for (let i = 0; i < config.images.length; i++) {
      const imageUrl = config.images[i].url

      try {
        const result = await cloudinary.uploader.upload(imageUrl, {
          folder: 'vsale-site3/home-blocks',
          public_id: `${block.id}_${i}`,
          overwrite: true,
        })

        // 更新 JSONB 中的 URL（不帶 / 開頭）
        config.images[i].url = `vsale-site3/home-blocks/${block.id}_${i}`

        console.log(`    ✅ 圖片 ${i + 1}: ${result.secure_url}`)
      } catch (err: any) {
        console.error(`    ❌ 圖片 ${i + 1} 上傳失敗: ${err.message}`)
      }
    }

    // 更新區塊配置
    await supabase
      .from('home_page_blocks')
      .update({ config })
      .eq('id', block.id)
  }

  console.log(`✅ 首頁區塊圖片遷移完成\n`)
}

// 執行遷移
migrateImages().catch(console.error)
