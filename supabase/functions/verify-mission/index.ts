// Supabase Edge Function: verify-mission
// Verifies mission proof photos using Google Gemini 1.5 Flash AI

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('Verify Mission Edge Function initialized')

serve(async (req) => {
  try {
    // Check environment variables
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    // Log presence of environment variables (without exposing values)
    console.log('Environment check:', {
      hasGeminiKey: !!geminiApiKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
    })

    if (!geminiApiKey || !supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          error: 'Missing required environment variables',
          details: {
            hasGeminiKey: !!geminiApiKey,
            hasSupabaseUrl: !!supabaseUrl,
            hasServiceKey: !!supabaseServiceKey,
          },
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse the request body
    const { record } = await req.json()

    if (!record) {
      return new Response(
        JSON.stringify({ error: 'No record provided in request body' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('Processing verification for user_mission:', record.id)

    // Return success for now (Subtask #1: just verify environment setup)
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Environment configured correctly',
        userMissionId: record.id,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in verify-mission function:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
