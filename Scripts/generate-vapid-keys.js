/**
 * Generate VAPID Keys for Web Push Notifications
 * 
 * Run: node Scripts/generate-vapid-keys.js
 * 
 * This script generates a public/private key pair for Web Push notifications.
 * Add the keys to your .env file as shown in the output.
 */

const webpush = require('web-push');

console.log('\n🔐 Generating VAPID keys for Web Push notifications...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('✅ VAPID keys generated successfully!\n');
console.log('📋 Add these to your .env file:\n');
console.log('----------------------------------------');
console.log(`EXPO_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('----------------------------------------\n');

console.log('⚠️  IMPORTANT:');
console.log('   - The PUBLIC key goes in your client app (.env)');
console.log('   - The PRIVATE key stays server-side only (Supabase Edge Functions)');
console.log('   - NEVER commit the private key to Git!\n');

console.log('📝 Next steps:');
console.log('   1. Copy the keys above to your .env file');
console.log('   2. Add the private key to Supabase Edge Function environment');
console.log('   3. Create push_subscriptions table (see docs/PWA_DEPLOYMENT_GUIDE.md)');
console.log('   4. Test push notifications on your deployed PWA\n');
