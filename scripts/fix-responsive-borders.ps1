# Fix Responsive Borders Script
# 批次修復 Neo-Brutalism 響應式邊框與陰影

$rootDir = "D:\APP\vsale"
$patterns = @(
    # 修復固定 border-3 (不包含 md:border-3)
    @{
        Find = 'border-3(?!\s)'
        Replace = 'border-2 md:border-3'
        Description = "固定 border-3 替換為響應式"
    },
    @{
        Find = 'border-3\s'
        Replace = 'border-2 md:border-3 '
        Description = "固定 border-3 + 空白替換為響應式"
    },
    # 修復 border-b-3, border-t-3, border-l-3, border-r-3
    @{
        Find = 'border-b-3(?!\s)'
        Replace = 'border-b-2 md:border-b-3'
        Description = "固定 border-b-3 替換為響應式"
    },
    @{
        Find = 'border-t-3(?!\s)'
        Replace = 'border-t-2 md:border-t-3'
        Description = "固定 border-t-3 替換為響應式"
    },
    @{
        Find = 'border-l-3(?!\s)'
        Replace = 'border-l-2 md:border-l-3'
        Description = "固定 border-l-3 替換為響應式"
    },
    @{
        Find = 'border-r-3(?!\s)'
        Replace = 'border-r-2 md:border-r-3'
        Description = "固定 border-r-3 替換為響應式"
    },
    # 修復固定 shadow-neo (不包含 md:shadow-neo)
    @{
        Find = 'shadow-neo(?!\-)'
        Replace = 'shadow-neo-sm md:shadow-neo'
        Description = "固定 shadow-neo 替換為響應式"
    },
    # 修復固定硬編碼陰影值
    @{
        Find = 'shadow-\[4px_4px_0px_0px_rgba\(0,0,0,1\)\]'
        Replace = 'shadow-neo-sm md:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
        Description = "固定 4px 陰影替換為響應式"
    },
    @{
        Find = 'shadow-\[8px_8px_0px_0px_rgba\(0,0,0,1\)\]'
        Replace = 'shadow-neo-sm md:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'
        Description = "固定 8px 陰影替換為響應式"
    },
    # 修復 hover 為 active (Neo-Brutalism 按鈕點擊效果)
    @{
        Find = 'hover:translate-x-\[2px\] hover:translate-y-\[2px\] hover:shadow-none'
        Replace = 'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
        Description = "hover 點擊效果改為 active"
    }
)

# 排除的目錄
$excludeDirs = @("node_modules", ".next", ".git", "dist", "build")

# 獲取所有 .tsx 檔案
$files = Get-ChildItem -Path $rootDir -Recurse -Filter "*.tsx" | Where-Object {
    $fullPath = $_.FullName
    $shouldExclude = $false
    foreach ($excludeDir in $excludeDirs) {
        if ($fullPath -like "*\$excludeDir\*") {
            $shouldExclude = $true
            break
        }
    }
    -not $shouldExclude
}

$totalFiles = $files.Count
$modifiedFiles = 0
$totalReplacements = 0

Write-Host "開始批次修復響應式邊框..." -ForegroundColor Green
Write-Host "共找到 $totalFiles 個 .tsx 檔案`n" -ForegroundColor Cyan

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    $originalContent = $content
    $fileReplacements = 0

    foreach ($pattern in $patterns) {
        $matches = [regex]::Matches($content, $pattern.Find)
        if ($matches.Count -gt 0) {
            $content = [regex]::Replace($content, $pattern.Find, $pattern.Replace)
            $fileReplacements += $matches.Count
        }
    }

    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        $modifiedFiles++
        $totalReplacements += $fileReplacements
        Write-Host "✓ 修復: $($file.FullName) ($fileReplacements 處替換)" -ForegroundColor Yellow
    }
}

Write-Host "`n修復完成！" -ForegroundColor Green
Write-Host "修改檔案數: $modifiedFiles / $totalFiles" -ForegroundColor Cyan
Write-Host "總替換次數: $totalReplacements" -ForegroundColor Cyan
