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

    // STEP 1: Fetch the user_mission record to get proof_url and mission_id
    const { data: userMission, error: userMissionError } = await supabase
      .from('user_missions')
      .select('id, mission_id, proof_url, status')
      .eq('id', record.id)
      .single()

    if (userMissionError || !userMission) {
      console.error('Failed to fetch user_mission:', userMissionError)
      return new Response(
        JSON.stringify({ error: 'User mission not found', details: userMissionError }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!userMission.proof_url) {
      console.error('No proof_url for user_mission:', record.id)
      return new Response(
        JSON.stringify({ error: 'No proof image uploaded' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('Found user_mission:', { id: userMission.id, mission_id: userMission.mission_id, proof_url: userMission.proof_url })

    // STEP 2: Fetch the mission record to get the description
    const { data: mission, error: missionError } = await supabase
      .from('missions')
      .select('id, title, description')
      .eq('id', userMission.mission_id)
      .single()

    if (missionError || !mission) {
      console.error('Failed to fetch mission:', missionError)
      return new Response(
        JSON.stringify({ error: 'Mission not found', details: missionError }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('Found mission:', { id: mission.id, title: mission.title })

    // STEP 3: Download the image from Supabase Storage
    // Extract the file path from the public URL
    const storagePathMatch = userMission.proof_url.match(/mission-proofs\/(.+)$/)
    if (!storagePathMatch) {
      console.error('Invalid proof_url format:', userMission.proof_url)
      return new Response(
        JSON.stringify({ error: 'Invalid proof URL format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const storagePath = storagePathMatch[1]
    console.log('Downloading image from storage path:', storagePath)

    const { data: imageBlob, error: downloadError } = await supabase.storage
      .from('mission-proofs')
      .download(storagePath)

    if (downloadError || !imageBlob) {
      console.error('Failed to download image:', downloadError)
      return new Response(
        JSON.stringify({ error: 'Failed to download proof image', details: downloadError }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('Image downloaded, size:', imageBlob.size, 'bytes')

    // STEP 4: Convert image to Base64
    const arrayBuffer = await imageBlob.arrayBuffer()
    const base64Image = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    )

    console.log('Image converted to Base64, length:', base64Image.length)

    // STEP 5: Send to Gemini AI for verification
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`

    const prompt = `You are a mission verification AI for a tactical mobile game called SALVO.

MISSION: ${mission.title}
DESCRIPTION: ${mission.description}

A player has submitted a photo as proof of completing this mission. Analyze the image and determine if it authentically shows the player has completed the mission objective.

IMPORTANT: Respond with ONLY a JSON object in this exact format:
{
  "verdict": true or false,
  "confidence": number between 0 and 1,
  "reasoning": "brief explanation of your decision"
}

Be strict but fair. If the image clearly shows evidence of the mission being completed, return true. If it's irrelevant, staged, or doesn't match the mission, return false.`

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
        JSON.stringify({ error: 'Gemini API request failed', details: errorText }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const geminiData = await geminiResponse.json()
    console.log('Gemini response received:', JSON.stringify(geminiData))

    // STEP 6: Parse the AI response
    let aiVerdict = null
    try {
      // Extract the text content from Gemini's response structure
      const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
      if (!responseText) {
        throw new Error('No text content in Gemini response')
      }

      console.log('AI response text:', responseText)

      // Try to extract JSON from the response (it might have markdown formatting)
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
          rawResponse: geminiData,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Return the verification result (Subtask #2 complete - we'll update DB in Subtask #3)
    return new Response(
      JSON.stringify({
        success: true,
        userMissionId: record.id,
        missionTitle: mission.title,
        verdict: aiVerdict.verdict,
        confidence: aiVerdict.confidence,
        reasoning: aiVerdict.reasoning,
        message: aiVerdict.verdict
          ? 'Mission proof VERIFIED! Well done, soldier.'
          : 'Mission proof REJECTED. Try again.',
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
