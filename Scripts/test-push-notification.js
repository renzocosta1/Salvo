/**
 * Test Push Notification Script
 * 
 * This sends a test push notification to all subscribed users via Supabase Edge Function.
 * 
 * Usage: node Scripts/test-push-notification.js
 */

require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

async function sendTestNotification() {
  console.log('\n🔔 Sending test push notification...\n');

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        title: '🎯 Test Notification from Salvo',
        body: 'If you see this, push notifications are working! Check back for mission alerts.',
        icon: '/icon-192.png',
        data: {
          type: 'test',
          timestamp: Date.now(),
        },
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Error response:', result);
      return;
    }

    console.log('✅ Success!');
    console.log('📊 Results:', result);
    console.log(`   - Sent: ${result.sent || 0}`);
    console.log(`   - Failed: ${result.failed || 0}`);
    console.log(`   - Total subscriptions: ${result.total || 0}\n`);

    if (result.sent === 0) {
      console.log('⚠️  No notifications were sent. Possible reasons:');
      console.log('   - No users have subscribed to push notifications yet');
      console.log('   - The Edge Function needs environment variables configured\n');
    }
  } catch (error) {
    console.error('❌ Error sending notification:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. The send-push Edge Function is deployed to Supabase');
    console.log('   2. VAPID keys are configured in Edge Function environment');
    console.log('   3. At least one user has subscribed to notifications\n');
  }
}

sendTestNotification();
