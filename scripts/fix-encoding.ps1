# Fix PowerShell script encoding to UTF-8 with BOM
# Date: 2026-01-07

$files = @(
    "D:\APP\vsale\scripts\db-backup.ps1",
    "D:\APP\vsale\scripts\db-restore.ps1",
    "D:\APP\vsale\scripts\db-health-check.ps1",
    "D:\APP\vsale\scripts\safe-db-reset.ps1"
)

foreach ($file in $files) {
    Write-Host "Processing: $file" -ForegroundColor Yellow

    # Read content with UTF8 encoding
    $content = Get-Content $file -Raw -Encoding UTF8

    # Write back with UTF8 encoding (includes BOM by default in PowerShell)
    $utf8BOM = New-Object System.Text.UTF8Encoding $true
    [System.IO.File]::WriteAllText($file, $content, $utf8BOM)

    Write-Host "  [OK] Converted to UTF-8 with BOM" -ForegroundColor Green
}

Write-Host ""
Write-Host "All files converted successfully!" -ForegroundColor Green
