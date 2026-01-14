/**
 * 檔案系統工具函式
 *
 * 提供檔案系統操作的輔助函式
 */

import * as fs from 'fs'
import * as path from 'path'

/**
 * 確保目錄存在，若不存在則建立
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.promises.access(dirPath)
  } catch {
    await fs.promises.mkdir(dirPath, { recursive: true })
  }
}

/**
 * 建立符號連結（Windows 支援）
 */
export async function createSymlink(
  target: string,
  linkPath: string
): Promise<void> {
  try {
    // 檢查符號連結是否已存在
    try {
      await fs.promises.lstat(linkPath)
      // 存在則先刪除
      await fs.promises.unlink(linkPath)
    } catch {
      // 不存在，繼續
    }

    // 建立符號連結（Windows 使用 junction）
    const linkDir = path.dirname(linkPath)
    const targetPath = path.relative(linkDir, target)

    if (process.platform === 'win32') {
      // Windows: 使用 junction（不需要管理員權限）
      await fs.promises.symlink(target, linkPath, 'junction')
    } else {
      // Unix-like: 使用符號連結
      await fs.promises.symlink(targetPath, linkPath)
    }
  } catch (error) {
    console.error(`建立符號連結失敗: ${linkPath} -> ${target}`, error)
    throw error
  }
}

/**
 * 讀取 JSON 檔案
 */
export async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await fs.promises.readFile(filePath, 'utf-8')
  return JSON.parse(content)
}

/**
 * 寫入 JSON 檔案
 */
export async function writeJsonFile(
  filePath: string,
  data: any,
  pretty = true
): Promise<void> {
  const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)
  await fs.promises.writeFile(filePath, content, 'utf-8')
}

/**
 * 寫入文字檔案
 */
export async function writeTextFile(
  filePath: string,
  content: string
): Promise<void> {
  await fs.promises.writeFile(filePath, content, 'utf-8')
}

/**
 * 讀取文字檔案
 */
export async function readTextFile(filePath: string): Promise<string> {
  return await fs.promises.readFile(filePath, 'utf-8')
}

/**
 * 檢查檔案是否存在
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * 取得目錄中的所有檔案（遞迴）
 */
export async function getAllFiles(
  dirPath: string,
  pattern?: RegExp
): Promise<string[]> {
  const files: string[] = []

  async function scan(dir: string) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        // 遞迴掃描子目錄
        await scan(fullPath)
      } else if (entry.isFile()) {
        // 檢查檔案是否符合 pattern
        if (!pattern || pattern.test(fullPath)) {
          files.push(fullPath)
        }
      }
    }
  }

  await scan(dirPath)
  return files
}
