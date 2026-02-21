# Task 29 Quick Test Script
# Run this to verify your setup

Write-Host "🧪 Task 29 Testing Script" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

# Check if dev server is running
$devServerRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8081" -Method Head -TimeoutSec 2 -ErrorAction Stop
    $devServerRunning = $true
} catch {
    $devServerRunning = $false
}

if ($devServerRunning) {
    Write-Host "✅ Dev server is running at http://localhost:8081" -ForegroundColor Green
} else {
    Write-Host "❌ Dev server is NOT running" -ForegroundColor Red
    Write-Host "   Run: npm run web" -ForegroundColor Yellow
    Write-Host ""
}

# Check if storage bucket SQL exists
$storageSql = "Scripts\setup_mission_photo_storage.sql"
if (Test-Path $storageSql) {
    Write-Host "✅ Storage setup SQL found: $storageSql" -ForegroundColor Green
} else {
    Write-Host "❌ Storage SQL not found" -ForegroundColor Red
}

# Check if Edge Function exists
$edgeFunctionPath = "supabase\functions\verify-voted-sticker\index.ts"
if (Test-Path $edgeFunctionPath) {
    Write-Host "✅ Edge Function code found: $edgeFunctionPath" -ForegroundColor Green
} else {
    Write-Host "❌ Edge Function not found" -ForegroundColor Red
}

# Check environment variables
Write-Host ""
Write-Host "📋 Environment Variables:" -ForegroundColor Cyan
$envFile = Get-Content ".env" -ErrorAction SilentlyContinue
if ($envFile) {
    $hasGoogleKey = $envFile | Select-String "GOOGLE_API_KEY"
    $hasSupabaseUrl = $envFile | Select-String "EXPO_PUBLIC_SUPABASE_URL"
    
    if ($hasGoogleKey -and $hasGoogleKey -notmatch "your_") {
        Write-Host "   ✅ GOOGLE_API_KEY configured" -ForegroundColor Green
    } else {
        Write-Host "   ❌ GOOGLE_API_KEY missing or placeholder" -ForegroundColor Red
    }
    
    if ($hasSupabaseUrl) {
        Write-Host "   ✅ SUPABASE_URL configured" -ForegroundColor Green
    } else {
        Write-Host "   ❌ SUPABASE_URL missing" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Run the storage setup SQL in Supabase SQL Editor" -ForegroundColor Yellow
Write-Host "   File: Scripts\setup_mission_photo_storage.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Deploy the Edge Function:" -ForegroundColor Yellow
Write-Host "   npx supabase functions deploy verify-voted-sticker" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Set Edge Function environment variables in Supabase Dashboard:" -ForegroundColor Yellow
Write-Host "   - GOOGLE_API_KEY" -ForegroundColor Gray
Write-Host "   - SUPABASE_URL" -ForegroundColor Gray
Write-Host "   - SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Open http://localhost:8081 and test!" -ForegroundColor Yellow
Write-Host ""
Write-Host "📖 Full testing guide: TASK_29_TESTING_GUIDE.md" -ForegroundColor Cyan
Write-Host ""

# Ask if they want to open the browser
$openBrowser = Read-Host "Open http://localhost:8081 in browser? (y/n)"
if ($openBrowser -eq "y") {
    Start-Process "http://localhost:8081"
    Write-Host "✅ Browser opened!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Happy testing! 🚀" -ForegroundColor Green
