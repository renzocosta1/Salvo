# Supabase Edge Functions Setup

## Prerequisites

1. **Install Supabase CLI**
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**
   ```bash
   supabase login
   ```

3. **Link your project**
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   
   To find your project ref:
   - Go to your Supabase dashboard
   - Look at the URL: `https://supabase.com/dashboard/project/[PROJECT_REF]`
   - Or go to Settings → API → Project URL and extract the project ref

## Set Up Secrets

You need to set two secrets for the Edge Function to work:

### 1. Get Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key

### 2. Get Your Supabase Service Role Key

1. Go to your Supabase dashboard
2. Navigate to **Settings** → **API**
3. Copy the **service_role** key (NOT the anon key!)
4. ⚠️ **IMPORTANT**: Keep this key secret! It bypasses Row Level Security

### 3. Set the Secrets

Run these commands in your terminal (replace with your actual keys):

```bash
# Set Gemini API Key
supabase secrets set GEMINI_API_KEY=your_gemini_api_key_here

# Set Supabase Service Role Key  
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Verify secrets were set (shows names only, not values)
supabase secrets list
```

## Deploy the Edge Function

```bash
# Deploy the verify-mission function
supabase functions deploy verify-mission

# Check the function logs
supabase functions logs verify-mission
```

## Test the Edge Function (Subtask #1)

Test that environment variables are configured correctly:

```bash
# Get your function URL from Supabase dashboard
# It will be: https://[PROJECT_REF].supabase.co/functions/v1/verify-mission

# Test with curl (replace with your project URL and anon key)
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/verify-mission' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"record": {"id": "test-id-123"}}'
```

**Expected Response (Subtask #1):**
```json
{
  "success": true,
  "message": "Environment configured correctly",
  "userMissionId": "test-id-123"
}
```

If you see this response, Subtask #1 is complete! ✅

## Troubleshooting

### "Missing required environment variables"

Run `supabase secrets list` to verify secrets are set. If not, run the `supabase secrets set` commands again.

### "Project not linked"

Run `supabase link --project-ref YOUR_PROJECT_REF` to link your local project to Supabase.

### "Function not found"

Make sure you deployed: `supabase functions deploy verify-mission`

---

## Next Steps

After Subtask #1 is complete, we'll add:
- **Subtask #2**: Gemini AI image analysis
- **Subtask #3**: Status update logic
- **Subtask #4**: XP award system
