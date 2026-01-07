# Verify encoding of PowerShell scripts
# Date: 2026-01-07

$files = @(
    "D:\APP\vsale\scripts\db-backup.ps1",
    "D:\APP\vsale\scripts\db-restore.ps1",
    "D:\APP\vsale\scripts\db-health-check.ps1",
    "D:\APP\vsale\scripts\safe-db-reset.ps1"
)

foreach ($file in $files) {
    Write-Host "Checking: $file" -ForegroundColor Cyan

    # Read first 3 bytes to check BOM
    $bytes = [System.IO.File]::ReadAllBytes($file)[0..2]
    $bomHex = ($bytes | ForEach-Object { '{0:X2}' -f $_ }) -join ' '

    Write-Host "  BOM: $bomHex" -ForegroundColor Gray

    if ($bomHex -eq 'EF BB BF') {
        Write-Host "  [OK] UTF-8 with BOM" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Not UTF-8 with BOM" -ForegroundColor Yellow
    }

    # Test if PowerShell can parse the file
    try {
        $null = [System.Management.Automation.Language.Parser]::ParseFile($file, [ref]$null, [ref]$null)
        Write-Host "  [OK] PowerShell syntax valid" -ForegroundColor Green
    } catch {
        Write-Host "  [ERROR] PowerShell syntax error: $_" -ForegroundColor Red
    }

    Write-Host ""
}
