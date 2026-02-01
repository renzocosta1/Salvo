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

    // STEP 1: Fetch the user_mission record to get proof_photo_url and mission_id
    const { data: userMission, error: userMissionError } = await supabase
      .from('user_missions')
      .select('id, mission_id, proof_photo_url, status')
      .eq('id', record.id)
      .single()

    if (userMissionError || !userMission) {
      console.error('Failed to fetch user_mission:', userMissionError)
      return new Response(
        JSON.stringify({ error: 'User mission not found', details: userMissionError }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!userMission.proof_photo_url) {
      console.error('No proof_photo_url for user_mission:', record.id)
      return new Response(
        JSON.stringify({ error: 'No proof image uploaded' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('Found user_mission:', { id: userMission.id, mission_id: userMission.mission_id, proof_photo_url: userMission.proof_photo_url })

    // STEP 2: Fetch the mission record to get the description and XP reward
    const { data: mission, error: missionError } = await supabase
      .from('missions')
      .select('id, title, description, xp_reward')
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
    const storagePathMatch = userMission.proof_photo_url.match(/mission-proofs\/(.+)$/)
    if (!storagePathMatch) {
      console.error('Invalid proof_photo_url format:', userMission.proof_photo_url)
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
    // Using Gemini 2.5 Flash for image understanding (Feb 2026 current model)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`

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

    // STEP 7: Update the database with the AI verdict (Subtask #3)
    console.log('Updating user_mission status based on verdict:', aiVerdict.verdict)

    try {
      if (aiVerdict.verdict === true) {
        // VERIFIED: Update status and set verified timestamp
        const { error: updateError } = await supabase
          .from('user_missions')
          .update({
            status: 'verified',
            verified_at: new Date().toISOString(),
            verified_by: 'gemini-ai',
            updated_at: new Date().toISOString(),
          })
          .eq('id', record.id)

        if (updateError) {
          console.error('Failed to update user_mission to verified:', updateError)
          throw new Error(`Database update failed: ${updateError.message}`)
        }

        console.log('Successfully updated user_mission to verified')

        // STEP 7.5: Award XP and recompute rank (Subtask #4)
        console.log('Awarding XP for mission:', mission.xp_reward)
        
        const { error: xpError } = await supabase.rpc('award_mission_xp_and_recompute_rank', {
          p_user_mission_id: record.id,
          p_xp_reward: mission.xp_reward,
        })

        if (xpError) {
          console.error('Failed to award XP:', xpError)
          // Don't fail the whole operation, just log it
          console.warn('XP award failed but mission is still verified')
        } else {
          console.log('Successfully awarded XP and recomputed rank')
        }
      } else {
        // REJECTED: Update status only
        const { error: updateError } = await supabase
          .from('user_missions')
          .update({
            status: 'rejected',
            updated_at: new Date().toISOString(),
          })
          .eq('id', record.id)

        if (updateError) {
          console.error('Failed to update user_mission to rejected:', updateError)
          throw new Error(`Database update failed: ${updateError.message}`)
        }

        console.log('Successfully updated user_mission to rejected')
      }
    } catch (dbError) {
      console.error('Database update error:', dbError)
      // Return the AI result but note the database update failed
      return new Response(
        JSON.stringify({
          success: false,
          error: 'AI verification succeeded but database update failed',
          aiVerdict: aiVerdict.verdict,
          dbError: dbError.message,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // STEP 8: Return the final result
    const responseData = {
      success: true,
      userMissionId: record.id,
      missionTitle: mission.title,
      verdict: aiVerdict.verdict,
      confidence: aiVerdict.confidence,
      reasoning: aiVerdict.reasoning,
      status: aiVerdict.verdict ? 'verified' : 'rejected',
      message: aiVerdict.verdict
        ? `Mission proof VERIFIED! Well done, soldier. +${mission.xp_reward} XP awarded!`
        : 'Mission proof REJECTED. Try again. Status updated to rejected.',
    }

    // Add XP info if verified
    if (aiVerdict.verdict) {
      responseData.xpAwarded = mission.xp_reward
    }

    return new Response(
      JSON.stringify(responseData),
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
