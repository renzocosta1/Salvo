import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PolymarketEvent {
  id: string
  slug: string
  title: string
  markets: PolymarketMarket[]
}

interface PolymarketMarket {
  id: string
  slug: string
  question: string
  outcomes: string
  outcomePrices: string
  volume24hr?: number
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Fetching tracked markets from database...')

    // Get all active tracked markets
    const { data: trackedMarkets, error: trackedError } = await supabase
      .from('polymarket_tracked_markets')
      .select('*')
      .eq('active', true)
      .order('priority')

    if (trackedError) {
      console.error('Error fetching tracked markets:', trackedError)
      throw trackedError
    }

    if (!trackedMarkets || trackedMarkets.length === 0) {
      console.log('No tracked markets configured')
      return new Response(
        JSON.stringify({ message: 'No tracked markets configured', updated: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${trackedMarkets.length} tracked markets`)

    // Fetch and update each market
    const updates = []
    for (const tracked of trackedMarkets) {
      try {
        console.log(`Fetching data for: ${tracked.slug}`)

        // Fetch from Polymarket Gamma API
        const polymarketUrl = `https://gamma-api.polymarket.com/events?slug=${tracked.slug}`
        const response = await fetch(polymarketUrl)

        if (!response.ok) {
          console.error(`Failed to fetch ${tracked.slug}: ${response.status}`)
          continue
        }

        const events: PolymarketEvent[] = await response.json()

        if (!events || events.length === 0 || !events[0].markets || events[0].markets.length === 0) {
          console.error(`No market data found for ${tracked.slug}`)
          continue
        }

        const event = events[0]
        console.log(`Found event: ${event.title}`)

        // For multi-market events, aggregate the data
        const outcomes: string[] = []
        const prices: number[] = []
        let totalVolume24hr = 0

        for (const market of event.markets) {
          try {
            const marketOutcomes = JSON.parse(market.outcomes)
            
            // For binary markets, use lastTradePrice or average of best bid/ask for more accurate current odds
            if (marketOutcomes.length === 2 && marketOutcomes[0] === 'Yes') {
              // This is a binary market for a specific candidate/outcome
              // Extract the candidate/outcome name from the question
              const questionMatch = market.question.match(/Will (.+?) win/)
              const outcomeName = questionMatch ? questionMatch[1] : market.question

              // Use lastTradePrice if available, otherwise fall back to midpoint of best bid/ask
              let currentPrice = 0
              if (market.lastTradePrice) {
                currentPrice = parseFloat(market.lastTradePrice)
              } else if (market.bestBid && market.bestAsk) {
                currentPrice = (parseFloat(market.bestBid) + parseFloat(market.bestAsk)) / 2
              } else {
                // Final fallback to outcomePrices
                const marketPrices = JSON.parse(market.outcomePrices)
                currentPrice = parseFloat(marketPrices[0])
              }

              outcomes.push(outcomeName)
              prices.push(currentPrice)
            } else {
              // Multi-outcome market - use outcomePrices
              const marketPrices = JSON.parse(market.outcomePrices)
              outcomes.push(...marketOutcomes)
              prices.push(...marketPrices.map((p: string) => parseFloat(p)))
            }

            if (market.volume24hr) {
              totalVolume24hr += market.volume24hr
            }
          } catch (parseError) {
            console.error(`Error parsing market data for ${market.slug}:`, parseError)
          }
        }

        if (outcomes.length === 0) {
          console.error(`No valid outcomes found for ${tracked.slug}`)
          continue
        }

        // Get existing odds to track changes
        const { data: existingOdds } = await supabase
          .from('polymarket_odds')
          .select('prices, price_24h_ago, updated_at')
          .eq('market_slug', tracked.slug)
          .single()

        // Calculate price changes and determine if we need to update 24h ago snapshot
        let price24hAgo = existingOdds?.price_24h_ago || null
        let priceChange24h = null

        if (existingOdds) {
          const lastUpdate = new Date(existingOdds.updated_at)
          const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60)
          
          // Update 24h snapshot if it's been more than 23 hours
          if (!price24hAgo || hoursSinceUpdate >= 23) {
            price24hAgo = existingOdds.prices
          }
          
          // Calculate price changes
          if (price24hAgo) {
            priceChange24h = prices.map((newPrice, idx) => {
              const oldPrice = price24hAgo[idx] || 0
              return newPrice - oldPrice
            })
          }
        }

        // Upsert to database
        const { error: upsertError } = await supabase
          .from('polymarket_odds')
          .upsert({
            market_slug: tracked.slug,
            market_title: event.title,
            market_id: event.markets[0].id,
            event_id: event.id,
            outcomes: outcomes,
            prices: prices,
            price_24h_ago: price24hAgo,
            price_change_24h: priceChange24h,
            volume_24hr: totalVolume24hr,
            last_fetched_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'market_slug'
          })

        if (upsertError) {
          console.error(`Error upserting ${tracked.slug}:`, upsertError)
          continue
        }

        console.log(`✅ Updated ${tracked.slug}: ${outcomes.length} outcomes`)
        updates.push(tracked.slug)
      } catch (marketError) {
        console.error(`Error processing market ${tracked.slug}:`, marketError)
      }
    }

    console.log(`Successfully updated ${updates.length} markets`)

    // Check for alerts after updating all markets
    try {
      console.log('Checking for odds shifts and generating alerts...')
      const { error: alertError } = await supabase.rpc('check_odds_for_alerts')
      
      if (alertError) {
        console.error('Error checking for alerts:', alertError)
      } else {
        console.log('✅ Alert check complete')
      }
    } catch (alertError) {
      console.error('Failed to run alert check:', alertError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated: updates.length,
        markets: updates,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Fatal error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
