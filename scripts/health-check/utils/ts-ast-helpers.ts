/**
 * TypeScript AST 輔助函式
 *
 * 使用 ts-morph 分析 TypeScript 程式碼
 */

import { Project, SourceFile, Node, SyntaxKind } from 'ts-morph'

/**
 * 建立 ts-morph 專案
 */
export function createTsProject(rootDir: string): Project {
  return new Project({
    tsConfigFilePath: `${rootDir}/tsconfig.json`,
    skipAddingFilesFromTsConfig: false,
  })
}

/**
 * 檢查檔案是否包含 'use server' 指令
 */
export function hasUseServer(sourceFile: SourceFile): boolean {
  const text = sourceFile.getFullText()
  return /['"]use server['"]/.test(text)
}

/**
 * 檢查函式是否呼叫 checkAuth()
 */
export function hasCheckAuth(functionNode: Node): boolean {
  const text = functionNode.getText()
  return /checkAuth\s*\(/.test(text)
}

/**
 * 檢查函式是否使用 Zod 驗證
 */
export function hasZodValidation(functionNode: Node): boolean {
  const text = functionNode.getText()
  return /\.(parse|safeParse)\s*\(/.test(text)
}

/**
 * 檢查函式是否呼叫 revalidatePath()
 */
export function hasRevalidatePath(functionNode: Node): boolean {
  const text = functionNode.getText()
  return /revalidatePath\s*\(/.test(text)
}

/**
 * 檢查函式回傳型別是否為 ActionResult<T>
 */
export function hasActionResultReturnType(functionNode: Node): boolean {
  const text = functionNode.getText()
  return /:\s*Promise<ActionResult<.*?>>/.test(text)
}

/**
 * 取得檔案中所有匯出的函式
 */
export function getExportedFunctions(sourceFile: SourceFile) {
  const functions: Node[] = []

  // 取得所有函式宣告
  sourceFile.getFunctions().forEach((func) => {
    if (func.isExported()) {
      functions.push(func)
    }
  })

  // 取得所有箭頭函式（使用 const/let/var 宣告）
  sourceFile.getVariableDeclarations().forEach((varDecl) => {
    const initializer = varDecl.getInitializer()
    if (initializer && Node.isArrowFunction(initializer)) {
      const statement = varDecl.getVariableStatement()
      if (statement && statement.isExported()) {
        functions.push(initializer)
      }
    }
  })

  return functions
}

/**
 * 取得檔案中所有 import 語句
 */
export function getImports(sourceFile: SourceFile) {
  const imports: { from: string; names: string[] }[] = []

  sourceFile.getImportDeclarations().forEach((importDecl) => {
    const moduleSpecifier = importDecl.getModuleSpecifierValue()
    const names: string[] = []

    // 取得具名 import
    importDecl.getNamedImports().forEach((namedImport) => {
      names.push(namedImport.getName())
    })

    // 取得 default import
    const defaultImport = importDecl.getDefaultImport()
    if (defaultImport) {
      names.push(defaultImport.getText())
    }

    imports.push({ from: moduleSpecifier, names })
  })

  return imports
}

/**
 * 檢查檔案是否匯入特定模組
 */
export function hasImportFrom(sourceFile: SourceFile, modulePath: string): boolean {
  const imports = getImports(sourceFile)
  return imports.some((imp) => imp.from.includes(modulePath))
}

/**
 * 取得函式名稱
 */
export function getFunctionName(functionNode: Node): string {
  if (Node.isFunctionDeclaration(functionNode)) {
    return functionNode.getName() || 'anonymous'
  }

  // 箭頭函式：從父節點取得變數名稱
  const parent = functionNode.getParent()
  if (parent && Node.isVariableDeclaration(parent)) {
    return parent.getName()
  }

  return 'anonymous'
}

/**
 * 取得函式在檔案中的位置
 */
export function getFunctionLocation(functionNode: Node) {
  const sourceFile = functionNode.getSourceFile()
  const start = functionNode.getStartLineNumber()
  const end = functionNode.getEndLineNumber()

  return {
    filePath: sourceFile.getFilePath(),
    lineStart: start,
    lineEnd: end,
  }
}

/**
 * 檢查函式是否包含 try-catch
 */
export function hasTryCatch(functionNode: Node): boolean {
  let hasTry = false

  functionNode.forEachDescendant((node) => {
    if (Node.isTryStatement(node)) {
      hasTry = true
      return true // 停止遍歷
    }
  })

  return hasTry
}

/**
 * 檢查函式是否為 async
 */
export function isAsyncFunction(functionNode: Node): boolean {
  if (Node.isFunctionDeclaration(functionNode)) {
    return functionNode.isAsync()
  }

  if (Node.isArrowFunction(functionNode)) {
    return functionNode.isAsync()
  }

  return false
}
