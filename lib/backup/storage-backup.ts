/**
 * Supabase Storage 圖片備份模組
 * 負責下載所有 Buckets 的圖片並壓縮為 ZIP
 */

import archiver from 'archiver'
import { createWriteStream, existsSync, mkdirSync, writeFileSync, rmSync, unlinkSync } from 'fs'
import { createAdminClient } from '@/lib/supabase/server'
import path from 'path'
import os from 'os'

/**
 * 下載單個 Bucket 的所有檔案
 * @param bucket Bucket 名稱
 * @param tempDir 臨時目錄路徑
 */
async function downloadBucketFiles(bucket: string, tempDir: string): Promise<void> {
  const supabase = createAdminClient()

  try {
    // 1. 列出 Bucket 所有檔案（支援分頁處理大量檔案）
    let allFiles: any[] = []
    let offset = 0
    const limit = 1000

    while (true) {
      const { data: files, error } = await supabase.storage
        .from(bucket)
        .list('', {
          limit,
          offset,
          sortBy: { column: 'name', order: 'asc' },
        })

      if (error) {
        throw new Error(`列出 ${bucket} 檔案失敗: ${error.message}`)
      }

      if (!files || files.length === 0) {
        break
      }

      allFiles = allFiles.concat(files)
      offset += limit

      // 如果返回的檔案數量少於 limit，表示已經到最後一頁
      if (files.length < limit) {
        break
      }
    }

    console.log(`Bucket ${bucket}: 發現 ${allFiles.length} 個檔案`)

    // 2. 遞迴下載所有檔案
    for (const file of allFiles) {
      // 跳過空目錄佔位符
      if (file.name === '.emptyFolderPlaceholder') continue

      // 處理資料夾（遞迴）
      if (file.id === null) {
        // 這是一個資料夾，遞迴處理
        await downloadFolderFiles(supabase, bucket, file.name, tempDir)
        continue
      }

      // 下載檔案
      const { data, error: downloadError } = await supabase.storage.from(bucket).download(file.name)

      if (downloadError) {
        console.warn(`下載 ${bucket}/${file.name} 失敗:`, downloadError)
        continue
      }

      // 儲存到臨時目錄
      const filePath = path.join(tempDir, bucket, file.name)
      const dir = path.dirname(filePath)

      // 建立目錄（如果不存在）
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }

      // 寫入檔案
      const arrayBuffer = await data.arrayBuffer()
      writeFileSync(filePath, Buffer.from(arrayBuffer))
      console.log(`已下載: ${bucket}/${file.name}`)
    }
  } catch (error) {
    console.error(`Bucket ${bucket} 備份失敗:`, error)
    throw error
  }
}

/**
 * 遞迴下載資料夾內的所有檔案
 * @param supabase Supabase Admin Client
 * @param bucket Bucket 名稱
 * @param folderPath 資料夾路徑
 * @param tempDir 臨時目錄路徑
 */
async function downloadFolderFiles(
  supabase: ReturnType<typeof createAdminClient>,
  bucket: string,
  folderPath: string,
  tempDir: string
): Promise<void> {
  let offset = 0
  const limit = 1000

  while (true) {
    const { data: files, error } = await supabase.storage.from(bucket).list(folderPath, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })

    if (error) {
      console.warn(`列出 ${bucket}/${folderPath} 失敗:`, error)
      break
    }

    if (!files || files.length === 0) {
      break
    }

    for (const file of files) {
      if (file.name === '.emptyFolderPlaceholder') continue

      const fullPath = `${folderPath}/${file.name}`

      // 如果是資料夾，遞迴處理
      if (file.id === null) {
        await downloadFolderFiles(supabase, bucket, fullPath, tempDir)
        continue
      }

      // 下載檔案
      const { data, error: downloadError } = await supabase.storage.from(bucket).download(fullPath)

      if (downloadError) {
        console.warn(`下載 ${bucket}/${fullPath} 失敗:`, downloadError)
        continue
      }

      // 儲存到臨時目錄
      const filePath = path.join(tempDir, bucket, fullPath)
      const dir = path.dirname(filePath)

      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }

      const arrayBuffer = await data.arrayBuffer()
      writeFileSync(filePath, Buffer.from(arrayBuffer))
      console.log(`已下載: ${bucket}/${fullPath}`)
    }

    offset += limit

    if (files.length < limit) {
      break
    }
  }
}

/**
 * 將 Storage 檔案壓縮為 ZIP
 * @param sourcePath 來源目錄路徑
 * @param outputPath 輸出 ZIP 檔案路徑
 */
async function compressToZip(sourcePath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', () => {
      console.log(`Storage ZIP 建立完成: ${archive.pointer()} bytes`)
      resolve()
    })

    archive.on('error', (err) => {
      reject(err)
    })

    archive.pipe(output)
    archive.directory(sourcePath, false)
    archive.finalize()
  })
}

/**
 * 備份 Supabase Storage 圖片
 * @returns ZIP 檔案路徑
 */
export async function backupStorage(): Promise<string> {
  const tempDir = path.join(os.tmpdir(), `vsale-storage-${Date.now()}`)
  const zipPath = path.join(os.tmpdir(), `vsale-storage-${Date.now()}.zip`)

  try {
    console.log('開始備份 Supabase Storage...')

    // 1. 列出所有需要備份的 buckets
    const buckets = ['products', 'public', 'announcements']

    // 2. 下載所有 Bucket 檔案
    for (const bucket of buckets) {
      console.log(`正在備份 ${bucket} bucket...`)
      await downloadBucketFiles(bucket, tempDir)
    }

    // 3. 壓縮為 ZIP
    console.log('正在壓縮 Storage 檔案...')
    await compressToZip(tempDir, zipPath)

    // 4. 清理臨時目錄
    rmSync(tempDir, { recursive: true, force: true })

    console.log(`Storage 備份完成: ${zipPath}`)
    return zipPath
  } catch (error) {
    // 清理臨時檔案
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
    if (existsSync(zipPath)) {
      unlinkSync(zipPath)
    }

    throw new Error(
      `Storage 備份失敗: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
