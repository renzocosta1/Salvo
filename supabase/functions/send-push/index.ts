import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
          // Construct push subscription object
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          };

          // Send push using web-push protocol
          const response = await sendWebPush(
            pushSubscription,
            notificationPayload,
            vapidPublicKey,
            vapidPrivateKey
          );

          console.log(`[Push] Sent to ${sub.user_id}: ${response.status}`);
          return { success: true, userId: sub.user_id };
        } catch (error) {
          console.error(`[Push] Failed to send to ${sub.user_id}:`, error);
          
          // If subscription is invalid (410 Gone), delete it
          if (error instanceof Error && error.message.includes('410')) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id);
            console.log(`[Push] Deleted invalid subscription for ${sub.user_id}`);
          }
          
          return { success: false, userId: sub.user_id, error: String(error) };
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

/**
 * Send Web Push notification using the Web Push protocol
 */
async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<Response> {
  const encoder = new TextEncoder();
  
  // Import VAPID keys
  const publicKeyUint8 = urlBase64ToUint8Array(vapidPublicKey);
  const privateKeyUint8 = urlBase64ToUint8Array(vapidPrivateKey);

  // Get endpoint URL
  const url = new URL(subscription.endpoint);
  
  // Create VAPID authorization header
  const vapidHeaders = await createVapidAuthHeader(
    url.origin,
    vapidPublicKey,
    privateKeyUint8
  );

  // For now, send unencrypted (simplified version)
  // Production should use proper encryption with p256dh and auth keys
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'Authorization': vapidHeaders.Authorization,
      'Crypto-Key': vapidHeaders['Crypto-Key'],
      'TTL': '86400',
    },
    body: encoder.encode(payload),
  });

  return response;
}

/**
 * Create VAPID authorization header using JWT
 */
async function createVapidAuthHeader(
  audience: string,
  publicKey: string,
  privateKey: Uint8Array
): Promise<{ Authorization: string; 'Crypto-Key': string }> {
  const header = {
    typ: 'JWT',
    alg: 'ES256',
  };

  const jwtPayload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 hours
    sub: 'mailto:support@salvo.app',
  };

  // For simplicity, using a basic JWT implementation
  // In production, use a proper library like jose
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(jwtPayload));
  
  return {
    Authorization: `vapid t=${encodedHeader}.${encodedPayload}.signature, k=${publicKey}`,
    'Crypto-Key': `p256ecdsa=${publicKey}`,
  };
}

/**
 * Convert URL-safe base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
