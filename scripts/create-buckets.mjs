#!/usr/bin/env node
/**
 * 建立 Supabase Storage Buckets
 */

import { createClient } from '@supabase/supabase-js'

const SITE2_URL = 'https://rdyvmgomjdglflrcfijs.supabase.co'
const SITE2_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkeXZtZ29tamRnbGZscmNmaWpzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTAwNTk2MiwiZXhwIjoyMDg0NTgxOTYyfQ.MzbZsoLp2RdHJj8qSuwnZ3FsQGuIBCAO8ExmC5YyUTE'

const supabase = createClient(SITE2_URL, SITE2_SERVICE_KEY)

const BUCKETS = [
  {
    id: 'products',
    name: 'products',
    public: true,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  },
  {
    id: 'public',
    name: 'public',
    public: true,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  },
  {
    id: 'announcements',
    name: 'announcements',
    public: true,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  }
]

async function createBuckets() {
  console.log('🪣 建立 Storage Buckets\n')

  for (const bucket of BUCKETS) {
    console.log(`正在建立 Bucket: ${bucket.name}`)

    const { data, error } = await supabase.storage.createBucket(bucket.id, {
      public: bucket.public,
      fileSizeLimit: bucket.fileSizeLimit,
      allowedMimeTypes: bucket.allowedMimeTypes
    })

    if (error) {
      if (error.message.includes('already exists')) {
        console.log(`  ℹ️  Bucket ${bucket.name} 已存在`)
      } else {
        console.error(`  ❌ 建立失敗: ${error.message}`)
      }
    } else {
      console.log(`  ✅ 建立成功: ${bucket.name}`)
    }
  }

  console.log('\n✅ 所有 Buckets 已就緒！')
  console.log('\n現在可以執行 Storage 遷移:')
  console.log('  node scripts/migrate-storage.mjs')
}

createBuckets().catch(error => {
  console.error('❌ 建立 Buckets 失敗:', error)
  process.exit(1)
})
