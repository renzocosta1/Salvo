# Test Gemini API directly
# This script tests if your Gemini API key works and finds the correct model name

$geminiApiKey = Read-Host "Enter your Gemini API Key"

Write-Host "`n1️⃣  Testing API Key with a simple text prompt..." -ForegroundColor Cyan

# Try different model endpoints
$models = @(
    "gemini-pro",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-pro-vision"
)

$endpoints = @("v1", "v1beta")

foreach ($endpoint in $endpoints) {
    foreach ($model in $models) {
        $url = "https://generativelanguage.googleapis.com/$endpoint/models/${model}:generateContent?key=$geminiApiKey"
        
        Write-Host "`nTrying: $endpoint/models/$model" -ForegroundColor Yellow
        
        $body = @{
            contents = @(
                @{
                    parts = @(
                        @{
                            text = "Hello! Respond with just the word 'SUCCESS' if you can read this."
                        }
                    )
                }
            )
        } | ConvertTo-Json -Depth 10
        
        try {
            $response = Invoke-RestMethod -Uri $url -Method Post -Headers @{"Content-Type"="application/json"} -Body $body -TimeoutSec 30
            
            Write-Host "✅ SUCCESS! This model works:" -ForegroundColor Green
            Write-Host "   Endpoint: $endpoint" -ForegroundColor Green
            Write-Host "   Model: $model" -ForegroundColor Green
            Write-Host "   Response: $($response | ConvertTo-Json -Depth 5 -Compress)" -ForegroundColor Gray
            break
        }
        catch {
            Write-Host "   ❌ Failed" -ForegroundColor Red
        }
    }
}

Write-Host "`n✅ Test complete!" -ForegroundColor Cyan
