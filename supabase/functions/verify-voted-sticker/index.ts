// Supabase Edge Function: verify-voted-sticker
// Verifies "I Voted" sticker photos for Early Raid and Election Day Siege missions

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts'

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

    console.log('Environment check:', {
      hasGeminiKey: !!geminiApiKey,
    })

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({
          error: 'Missing required environment variables',
          details: {
            hasGeminiKey: !!geminiApiKey,
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

    // Download the image directly from the public URL (bucket is public)
    console.log('Fetching image from public URL:', photo_url)
    
    const imageResponse = await fetch(photo_url)
    
    console.log('Fetch response status:', imageResponse.status, imageResponse.statusText)
    console.log('Fetch response headers:', JSON.stringify(Object.fromEntries(imageResponse.headers.entries())))
    console.log('Fetch response ok:', imageResponse.ok, 'body:', imageResponse.body)
    
    if (!imageResponse.ok) {
      const errorText = await imageResponse.text()
      console.error('Failed to fetch image from URL:', imageResponse.status, imageResponse.statusText, 'Body:', errorText)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch photo from URL', 
          details: {
            status: imageResponse.status,
            statusText: imageResponse.statusText,
            url: photo_url,
            errorBody: errorText
          }
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

    const contentLength = imageResponse.headers.get('content-length')
    console.log('Content-Length header:', contentLength)
    
    const imageBlob = await imageResponse.blob()
    console.log('Image fetched, size:', imageBlob.size, 'bytes', 'blob.type:', imageBlob.type, 'expected size:', contentLength)

    // Detect MIME type from file extension (don't trust blob.type from fetch)
    const fileExtension = photo_url.toLowerCase().match(/\.(jpg|jpeg|png|webp|heic|heif)$/)?.[1]
    console.log('File extension from URL:', fileExtension)
    
    const extensionToMimeType: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'heic': 'image/heic',
      'heif': 'image/heif',
    }
    
    const mimeType = fileExtension ? extensionToMimeType[fileExtension] : 'image/jpeg'
    console.log('Determined MIME type:', mimeType)
    
    const supportedMimeTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif']
    
    if (!supportedMimeTypes.includes(mimeType)) {
      return new Response(
        JSON.stringify({ 
          error: 'Unsupported image format',
          receivedType: mimeType,
          supportedTypes: supportedMimeTypes,
          fileExtension: fileExtension,
        }),
        {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // Convert to Base64 using Deno's proper encoding function
    const arrayBuffer = await imageBlob.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    const base64Image = encodeBase64(uint8Array)

    console.log('Image converted to Base64, MIME type:', mimeType, 'Original size:', imageBlob.size, 'bytes, Base64 length:', base64Image.length)

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

    // Call Gemini AI - using Gemini 2.5 Flash (current model in 2026)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`

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
                mime_type: mimeType,
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1000,
      },
    }

    console.log('Sending request to Gemini AI...')
    console.log('Image size:', imageBlob.size, 'bytes', 'MIME:', mimeType, 'Base64 length:', base64Image.length)
    console.log('Image blob type:', imageBlob.type, 'Detected MIME:', mimeType)
    console.log('Base64 preview (first 100 chars):', base64Image.substring(0, 100))
    console.log('Payload structure:', JSON.stringify(geminiPayload).substring(0, 500))

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiApiKey,
      },
      body: JSON.stringify(geminiPayload),
    })
    
    console.log('Gemini response status:', geminiResponse.status, geminiResponse.statusText)

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('Gemini API error:', geminiResponse.status, errorText)
      return new Response(
        JSON.stringify({ 
          error: 'Gemini API request failed', 
          details: {
            status: geminiResponse.status,
            statusText: geminiResponse.statusText,
            errorBody: errorText,
            apiKeyPresent: !!geminiApiKey
          }
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

      console.log('AI response text (length:', responseText.length, '):', responseText)

      // Try multiple JSON extraction methods
      let jsonString = null
      
      // Method 1: Remove markdown code blocks if present (non-greedy, needs closing ```)
      const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1].trim()
        console.log('Extracted from markdown code block')
      } else {
        // Method 2: Try to extract from unclosed markdown block (truncated response)
        const uncloseBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*)$/)
        if (uncloseBlockMatch) {
          jsonString = uncloseBlockMatch[1].trim()
          console.log('Extracted from unclosed markdown block (truncated?)')
        } else {
          // Method 3: Find first { to last }
          const firstBrace = responseText.indexOf('{')
          const lastBrace = responseText.lastIndexOf('}')
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            jsonString = responseText.substring(firstBrace, lastBrace + 1)
            console.log('Extracted using brace positions')
          }
        }
      }

      if (!jsonString) {
        throw new Error('No JSON found in AI response')
      }

      console.log('JSON string to parse:', jsonString)
      
      // Try to parse JSON, with fallback for incomplete JSON
      try {
        aiVerdict = JSON.parse(jsonString)
      } catch (jsonError) {
        // If parse fails, try to fix incomplete JSON by adding missing closing brace
        console.log('Initial JSON parse failed, trying to fix incomplete JSON...')
        const openBraces = (jsonString.match(/{/g) || []).length
        const closeBraces = (jsonString.match(/}/g) || []).length
        if (openBraces > closeBraces) {
          const fixed = jsonString + '}'.repeat(openBraces - closeBraces)
          console.log('Attempted fix by adding', openBraces - closeBraces, 'closing braces')
          aiVerdict = JSON.parse(fixed)
        } else {
          throw jsonError
        }
      }
      console.log('Parsed AI verdict:', aiVerdict)

      if (typeof aiVerdict.verdict !== 'boolean') {
        throw new Error('Invalid verdict format')
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
      console.error('Raw Gemini response text:', responseText)
      return new Response(
        JSON.stringify({
          error: 'Failed to parse AI response',
          details: parseError.message,
          rawResponse: responseText, // Full response for debugging
          responseLength: responseText?.length,
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
    const errorDetails = {
      error: error.message || 'Unknown error',
      stack: error.stack,
      name: error.name,
      type: typeof error,
      fullError: String(error),
    };
    console.error('Full error details:', errorDetails);
    
    return new Response(
      JSON.stringify(errorDetails),
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
