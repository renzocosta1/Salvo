#!/bin/bash
# Test script for Edge Function Subtask #1
# Tests that environment variables are configured correctly

echo "========================================="
echo "Testing Edge Function - Subtask #1"
echo "========================================="
echo ""

# Check if required variables are set
if [ -z "$SUPABASE_PROJECT_REF" ]; then
    echo "❌ Error: SUPABASE_PROJECT_REF environment variable not set"
    echo "   Set it with: export SUPABASE_PROJECT_REF=your_project_ref"
    exit 1
fi

if [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "❌ Error: SUPABASE_ANON_KEY environment variable not set"
    echo "   Set it with: export SUPABASE_ANON_KEY=your_anon_key"
    exit 1
fi

# Construct the function URL
FUNCTION_URL="https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/verify-mission"

echo "📡 Testing Edge Function at:"
echo "   $FUNCTION_URL"
echo ""

# Make the test request
echo "🔄 Sending test request..."
echo ""

response=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"record": {"id": "test-subtask-1"}}')

echo "📥 Response:"
echo "$response" | jq '.' 2>/dev/null || echo "$response"
echo ""

# Check if the response indicates success
if echo "$response" | grep -q '"success":true'; then
    echo "✅ SUCCESS! Subtask #1 is complete!"
    echo "   Environment variables are configured correctly."
else
    echo "❌ FAILED! Check the response above for errors."
    echo ""
    echo "Common issues:"
    echo "  - Secrets not set: Run 'supabase secrets set' commands"
    echo "  - Function not deployed: Run 'supabase functions deploy verify-mission'"
    echo "  - Wrong project ref or anon key"
fi

echo ""
echo "========================================="
