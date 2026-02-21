// Supabase Edge Function: verify-voted-sticker
// Verifies "I Voted" sticker photos for Early Raid and Election Day Siege missions

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('Verify Voted Sticker Edge Function initialized')

serve(async (req) => {
  try {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      })
    }

    // Check environment variables
    const geminiApiKey = Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GEMINI_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

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
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const { photo_url, mission_type } = await req.json()

    if (!photo_url) {
      return new Response(
        JSON.stringify({ error: 'No photo URL provided' }),
        {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    console.log('Processing verification for mission type:', mission_type)

    // Download the image from Supabase Storage
    const storagePathMatch = photo_url.match(/mission-proofs\/(.+)$/)
    if (!storagePathMatch) {
      return new Response(
        JSON.stringify({ error: 'Invalid photo URL format' }),
        {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    const storagePath = storagePathMatch[1]
    console.log('Downloading image from storage:', storagePath)

    const { data: imageBlob, error: downloadError } = await supabase.storage
      .from('mission-proofs')
      .download(storagePath)

    if (downloadError || !imageBlob) {
      console.error('Failed to download image:', downloadError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to download photo', 
          details: downloadError 
        }),
        {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    console.log('Image downloaded, size:', imageBlob.size, 'bytes')

    // Convert to Base64
    const arrayBuffer = await imageBlob.arrayBuffer()
    const base64Image = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    )

    console.log('Image converted to Base64')

    // Create mission-specific prompt
    const getMissionPrompt = (type: string) => {
      switch (type) {
        case 'EARLY_RAID':
        case 'early_raid':
          return `Analyze this photo to verify it shows an "I Voted" sticker or early voting proof. 
          Look for:
          - An "I Voted" sticker (any state design)
          - Early voting signage or location identifiers
          - Polling place environment
          
          Return your assessment in JSON format ONLY.`
        
        case 'ELECTION_DAY_SIEGE':
        case 'election_day_siege':
          return `Analyze this photo to verify it shows Election Day voting proof.
          Look for:
          - An "I Voted" sticker
          - Polling place environment
          - Election Day signage
          - Ballot or voting booth (if visible)
          
          Return your assessment in JSON format ONLY.`
        
        default:
          return `Analyze this photo to verify it shows voting proof.
          Look for an "I Voted" sticker or clear evidence of voting activity.
          
          Return your assessment in JSON format ONLY.`
      }
    }

    const missionPrompt = getMissionPrompt(mission_type || 'default')

    // Call Gemini AI
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`

    const prompt = `${missionPrompt}

CRITICAL: Respond with ONLY this JSON structure (no markdown, no extra text):
{
  "verdict": true or false,
  "confidence": number between 0.0 and 1.0,
  "reasoning": "brief explanation"
}

If the photo clearly shows an "I Voted" sticker or voting proof, verdict should be true.
If it's unclear, irrelevant, or doesn't show voting evidence, verdict should be false.`

    const geminiPayload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.8,
        maxOutputTokens: 200,
      },
    }

    console.log('Sending request to Gemini AI...')

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload),
    })

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('Gemini API error:', geminiResponse.status, errorText)
      return new Response(
        JSON.stringify({ 
          error: 'AI verification failed', 
          details: errorText 
        }),
        {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    const geminiData = await geminiResponse.json()
    console.log('Gemini response received')

    // Parse AI response
    let aiVerdict = null
    try {
      const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
      if (!responseText) {
        throw new Error('No text content in AI response')
      }

      console.log('AI response text:', responseText)

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response')
      }

      aiVerdict = JSON.parse(jsonMatch[0])
      console.log('Parsed AI verdict:', aiVerdict)

      if (typeof aiVerdict.verdict !== 'boolean') {
        throw new Error('Invalid verdict format')
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      return new Response(
        JSON.stringify({
          error: 'Failed to parse AI response',
          details: parseError.message,
        }),
        {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // Return result
    return new Response(
      JSON.stringify({
        success: true,
        verdict: aiVerdict.verdict,
        confidence: aiVerdict.confidence,
        reasoning: aiVerdict.reasoning,
      }),
      {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('Error in verify-voted-sticker function:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack,
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})
