/**
 * 範本變數替換工具
 * Feature: 系統設定頁面重構
 */

type TemplateVariables = {
  客戶名稱: string
  前台網址: string
  登入電話: string
  登入密碼: string
  公司名稱?: string  // 新增可選變數
}

/**
 * 自動去除網址中的 www
 */
export function removeWwwFromUrl(url: string): string {
  return url.replace(/\/\/www\./g, '//')
}

/**
 * 替換範本中的變數
 */
export function replaceTemplateVariables(
  template: string,
  variables: TemplateVariables
): string {
  let result = template

  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  })

  return result
}

/**
 * 驗證範本是否包含必要變數
 * 注意：「公司名稱」為可選變數，不在必填清單中
 */
export function validateTemplate(template: string): {
  valid: boolean
  missingVariables: string[]
} {
  const requiredVariables = ['客戶名稱', '前台網址', '登入電話', '登入密碼']
  const missingVariables: string[] = []

  requiredVariables.forEach((variable) => {
    if (!template.includes(`{${variable}}`)) {
      missingVariables.push(variable)
    }
  })

  return {
    valid: missingVariables.length === 0,
    missingVariables,
  }
}
