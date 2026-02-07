import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @deno-types="npm:@types/web-push@3.6.3"
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  userIds?: string[]; // Optional: target specific users
  directiveId?: string; // Optional: send to all users subscribed to a directive
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get VAPID keys from environment
    const vapidPublicKey = Deno.env.get('EXPO_PUBLIC_VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys not configured in Edge Function environment');
    }

    // Configure web-push with VAPID details
    webpush.setVapidDetails(
      'mailto:support@salvo.app',
      vapidPublicKey,
      vapidPrivateKey
    );

    // Parse request body
    const payload: PushPayload = await req.json();
    const { title, body, icon, badge, data, userIds, directiveId } = payload;

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: 'title and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build query for push subscriptions
    let query = supabase.from('push_subscriptions').select('*');

    if (userIds && userIds.length > 0) {
      // Send to specific users
      query = query.in('user_id', userIds);
    } else if (directiveId) {
      // Send to all users who have this directive
      const { data: directiveUsers } = await supabase
        .from('user_directives')
        .select('user_id')
        .eq('directive_id', directiveId);
      
      if (directiveUsers && directiveUsers.length > 0) {
        const targetUserIds = directiveUsers.map(du => du.user_id);
        query = query.in('user_id', targetUserIds);
      }
    }
    // If neither specified, send to ALL subscribed users

    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) {
      throw fetchError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No subscriptions found', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Push] Sending to ${subscriptions.length} subscriptions`);

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title,
      body,
      icon: icon || '/icon-192.png',
      badge: badge || '/icon-192.png',
      data: {
        url: '/',
        timestamp: Date.now(),
        ...data,
      },
    });

    // Send push notifications using Web Push API
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          // Construct push subscription object for web-push library
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          };

          console.log(`[Push] Sending to user ${sub.user_id}...`);

          // Send using web-push library (handles encryption automatically)
          const response = await webpush.sendNotification(
            pushSubscription,
            notificationPayload
          );

          console.log(`[Push] ✅ Sent to ${sub.user_id}: ${response.statusCode}`);
          return { success: true, userId: sub.user_id };
        } catch (error: any) {
          console.error(`[Push] ❌ Failed to send to ${sub.user_id}:`, error);
          
          // If subscription is invalid (410 Gone or 404), delete it
          if (error.statusCode === 410 || error.statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id);
            console.log(`[Push] Deleted invalid subscription for ${sub.user_id}`);
          }
          
          return { success: false, userId: sub.user_id, error: error.message || String(error) };
        }
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
    const failureCount = results.length - successCount;

    return new Response(
      JSON.stringify({
        message: 'Push notifications sent',
        sent: successCount,
        failed: failureCount,
        total: subscriptions.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Push] Error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Note: The web-push library handles all encryption, VAPID auth, and protocol details automatically
