# Test script for Edge Function Subtask #1 (PowerShell)
# Tests that environment variables are configured correctly

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Testing Edge Function - Subtask #1" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Get environment variables
$projectRef = $env:SUPABASE_PROJECT_REF
$anonKey = $env:SUPABASE_ANON_KEY

# Check if required variables are set
if (-not $projectRef) {
    Write-Host "❌ Error: SUPABASE_PROJECT_REF environment variable not set" -ForegroundColor Red
    Write-Host "   Set it with: `$env:SUPABASE_PROJECT_REF='your_project_ref'" -ForegroundColor Yellow
    exit 1
}

if (-not $anonKey) {
    Write-Host "❌ Error: SUPABASE_ANON_KEY environment variable not set" -ForegroundColor Red
    Write-Host "   Set it with: `$env:SUPABASE_ANON_KEY='your_anon_key'" -ForegroundColor Yellow
    exit 1
}

# Construct the function URL
$functionUrl = "https://$projectRef.supabase.co/functions/v1/verify-mission"

Write-Host "📡 Testing Edge Function at:" -ForegroundColor White
Write-Host "   $functionUrl" -ForegroundColor Gray
Write-Host ""

# Make the test request
Write-Host "🔄 Sending test request..." -ForegroundColor White
Write-Host ""

$headers = @{
    "Authorization" = "Bearer $anonKey"
    "Content-Type" = "application/json"
}

$body = @{
    record = @{
        id = "test-subtask-1"
    }
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $functionUrl -Method Post -Headers $headers -Body $body
    
    Write-Host "📥 Response:" -ForegroundColor White
    $response | ConvertTo-Json -Depth 10
    Write-Host ""
    
    if ($response.success -eq $true) {
        Write-Host "✅ SUCCESS! Subtask #1 is complete!" -ForegroundColor Green
        Write-Host "   Environment variables are configured correctly." -ForegroundColor Green
    } else {
        Write-Host "❌ FAILED! Check the response above for errors." -ForegroundColor Red
        Write-Host ""
        Write-Host "Common issues:" -ForegroundColor Yellow
        Write-Host "  - Secrets not set: Run 'supabase secrets set' commands" -ForegroundColor Yellow
        Write-Host "  - Function not deployed: Run 'supabase functions deploy verify-mission'" -ForegroundColor Yellow
        Write-Host "  - Wrong project ref or anon key" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Request failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  - Function not deployed: Run 'supabase functions deploy verify-mission'" -ForegroundColor Yellow
    Write-Host "  - Wrong project ref or anon key" -ForegroundColor Yellow
    Write-Host "  - Network connectivity issue" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
