// =====================================================
// Ballot Ready Notification Edge Function
// =====================================================
// Sends push notifications to users when their ballot is ready
// Triggered automatically via database trigger when ballot data is inserted

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

interface NotificationPayload {
  county: string;
  legislative_district: string;
  notification_type: 'ballot_ready' | 'ballot_updated';
}

interface ExpoMessage {
  to: string;
  sound: 'default';
  title: string;
  body: string;
  data: {
    type: string;
    county: string;
    district: string;
  };
}

serve(async (req) => {
  try {
    // Only allow POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const payload: NotificationPayload = await req.json();
    const { county, legislative_district, notification_type } = payload;

    console.log(`[Ballot Notify] Triggering notifications for ${county} County, District ${legislative_district}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Query users in this geography with notifications enabled
    const { data: users, error: queryError } = await supabase
      .from('profiles')
      .select('id, expo_push_token, display_name')
      .eq('county', county)
      .eq('legislative_district', legislative_district)
      .eq('notifications_enabled', true)
      .not('expo_push_token', 'is', null);

    if (queryError) {
      console.error('[Ballot Notify] Error querying users:', queryError);
      return new Response(JSON.stringify({ error: 'Failed to query users' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!users || users.length === 0) {
      console.log('[Ballot Notify] No users with push notifications enabled in this geography');
      return new Response(JSON.stringify({ message: 'No users to notify', count: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Ballot Notify] Found ${users.length} users to notify`);

    // Prepare push notification messages
    const messages: ExpoMessage[] = users.map((user) => ({
      to: user.expo_push_token!,
      sound: 'default',
      title: '📋 Your Ballot is Ready!',
      body: `Review your ${county} County ballot for the 2024 Republican Primary`,
      data: {
        type: notification_type,
        county,
        district: legislative_district,
      },
    }));

    // Send notifications in batches (Expo accepts up to 100 per request)
    const BATCH_SIZE = 100;
    const batches = [];
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      batches.push(messages.slice(i, i + BATCH_SIZE));
    }

    let successCount = 0;
    let failureCount = 0;

    for (const batch of batches) {
      try {
        const response = await fetch(EXPO_PUSH_API, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(batch),
        });

        const result = await response.json();
        
        if (response.ok) {
          successCount += batch.length;
          console.log(`[Ballot Notify] Batch sent successfully: ${batch.length} notifications`);
        } else {
          failureCount += batch.length;
          console.error('[Ballot Notify] Batch failed:', result);
        }
      } catch (error) {
        failureCount += batch.length;
        console.error('[Ballot Notify] Error sending batch:', error);
      }
    }

    // Log notification history for each user
    const notificationLogs = users.map((user) => ({
      user_id: user.id,
      county,
      legislative_district,
      notification_type,
      sent_at: new Date().toISOString(),
    }));

    const { error: logError } = await supabase
      .from('ballot_notifications')
      .insert(notificationLogs);

    if (logError) {
      console.error('[Ballot Notify] Failed to log notifications:', logError);
    }

    // Update profiles with notification timestamp
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ ballot_notification_sent_at: new Date().toISOString() })
      .eq('county', county)
      .eq('legislative_district', legislative_district);

    if (updateError) {
      console.error('[Ballot Notify] Failed to update profiles:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: users.length,
        sent: successCount,
        failed: failureCount,
        county,
        legislative_district,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Ballot Notify] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
