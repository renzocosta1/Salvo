/**
 * Test Google Civic Information API with real address
 * Address: 8620 Jacks Reef Rd, Laurel, MD 20724
 * Expected: Anne Arundel County (user confirmed)
 */

import { lookupDistrictByAddress } from '../lib/districts';

const TEST_ADDRESS = '8620 Jacks Reef Rd, Laurel, MD 20724';

async function testCivicApi() {
  console.log('================================================================================');
  console.log('Google Civic Information API Test');
  console.log('================================================================================');
  console.log('');
  console.log('Test Address:', TEST_ADDRESS);
  console.log('Expected County: Anne Arundel (user confirmed)');
  console.log('');
  console.log('Checking API key...');
  
  const apiKey = process.env.GOOGLE_CIVIC_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_CIVIC_API_KEY;
  
  if (!apiKey) {
    console.log('❌ ERROR: No API key found!');
    console.log('');
    console.log('Please set one of these environment variables:');
    console.log('  - GOOGLE_CIVIC_API_KEY');
    console.log('  - EXPO_PUBLIC_GOOGLE_CIVIC_API_KEY');
    console.log('');
    console.log('Get your API key at: https://console.cloud.google.com/apis/credentials');
    console.log('Make sure to enable the "Google Civic Information API"');
    console.log('');
    process.exit(1);
  }
  
  console.log('✅ API key found:', apiKey.substring(0, 10) + '...');
  console.log('');
  console.log('Calling Google Civic Information API...');
  console.log('');

  try {
    const result = await lookupDistrictByAddress(TEST_ADDRESS);

    console.log('================================================================================');
    console.log('RESULT:');
    console.log('================================================================================');
    console.log('');
    console.log('Success:', result.success ? '✅' : '❌');
    console.log('Confidence:', result.confidence);
    console.log('Source:', result.source);
    console.log('');

    if (result.success && result.district) {
      console.log('District Information:');
      console.log('  📍 County:', result.district.county);
      console.log('  🏛️  Legislative District:', result.district.legislativeDistrict);
      console.log('  🏛️  Legislative Code:', result.district.legislativeDistrictCode);
      console.log('  🗳️  Congressional District:', result.district.congressionalDistrict);
      console.log('');
      
      // Verify county matches user expectation
      if (result.district.county.toLowerCase().includes('anne arundel')) {
        console.log('✅ SUCCESS: County matches user confirmation (Anne Arundel)');
      } else {
        console.log('⚠️  WARNING: County does not match expected "Anne Arundel"');
        console.log('   User said: Anne Arundel');
        console.log('   API said:', result.district.county);
      }
    } else {
      console.log('❌ Lookup failed:', result.error);
    }

    console.log('');
    console.log('================================================================================');

  } catch (error) {
    console.error('');
    console.error('❌ ERROR:', error);
    console.error('');
    process.exit(1);
  }
}

testCivicApi();
