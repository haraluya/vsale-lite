# Grant delete_order_pending Function permission
# Run: .\fix-delete-permission.ps1

$sql = @"
GRANT EXECUTE ON FUNCTION delete_order_pending(UUID, UUID, TEXT) TO authenticated;
SELECT 'Permission granted successfully' AS result;
"@

Write-Host "Granting delete_order_pending Function permission..." -ForegroundColor Yellow

# Use Supabase CLI to execute SQL
$sql | supabase db execute

Write-Host "Done!" -ForegroundColor Green
