# Google Civic Information API Setup

The Google Civic Information API provides authoritative voter district information from official government data. This is the **required** method for accurate voter/district lookup in production.

## Why This API?

- ✅ **100% Accurate** - Official government election data
- ✅ **Free** - Generous quota, no credit card required
- ✅ **Comprehensive** - Counties, Congressional Districts, State Legislative Districts, polling locations
- ✅ **Address Normalization** - Handles typos and incomplete addresses
- ✅ **Updated for Elections** - Current data for every election cycle

## Setup Steps

### 1. Get a Google API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Go to **APIs & Services → Library**
4. Search for "Google Civic Information API"
5. Click **Enable**
6. Go to **APIs & Services → Credentials**
7. Click **Create Credentials → API Key**
8. Copy your API key

### 2. Secure Your API Key (Important!)

1. Click on your new API key to edit it
2. Under **Application restrictions**, select:
   - **Android apps** (if building Android)
   - **iOS apps** (if building iOS)
   - **HTTP referrers** (if building web)
3. Under **API restrictions**, select:
   - **Restrict key**
   - Check only: **Google Civic Information API**
4. Click **Save**

### 3. Add API Key to Your Project

#### For Local Development:

Create a `.env` file in your project root:

```bash
# Google Civic Information API
EXPO_PUBLIC_GOOGLE_CIVIC_API_KEY=your_api_key_here
```

#### For Production (EAS Build):

Add to your EAS secrets:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_CIVIC_API_KEY --value your_api_key_here
```

#### For Testing:

You can also set temporarily:

```bash
export GOOGLE_CIVIC_API_KEY=your_api_key_here
npm run test:civic-api
```

### 4. Update app.json (Optional)

If you want the key available at build time, add to `app.json`:

```json
{
  "expo": {
    "extra": {
      "googleCivicApiKey": process.env.EXPO_PUBLIC_GOOGLE_CIVIC_API_KEY
    }
  }
}
```

## Usage

### Basic Address Lookup

```typescript
import { lookupDistrictByAddress } from '@/lib/districts';

const result = await lookupDistrictByAddress(
  '8620 Jacks Reef Rd, Laurel, MD 20724'
);

if (result.success && result.district) {
  console.log('County:', result.district.county);
  console.log('Congressional District:', result.district.congressionalDistrict);
  console.log('Legislative District:', result.district.legislativeDistrict);
}
```

### Get Polling Location (During Elections)

```typescript
import { getVoterInfo } from '@/lib/districts';

const voterInfo = await getVoterInfo(
  '8620 Jacks Reef Rd, Laurel, MD 20724',
  apiKey
);

if (voterInfo.success && voterInfo.data?.pollingLocation) {
  console.log('Polling Place:', voterInfo.data.pollingLocation.address);
  console.log('Hours:', voterInfo.data.pollingLocation.pollingHours);
}
```

## Testing

Run the test script to verify your setup:

```bash
# Set your API key
export GOOGLE_CIVIC_API_KEY=your_api_key_here

# Compile TypeScript
npx tsc

# Run test
node Scripts/test-civic-api.js
```

Expected output for test address (8620 Jacks Reef Rd, Laurel, MD 20724):
- County: Anne Arundel
- Congressional District: MD-5 or MD-4
- Legislative District: District 33 (expected)

## API Limits

**Free Tier:**
- **25,000 requests per day**
- No credit card required
- More than enough for most political organizing apps

If you exceed this, you can:
1. Request a quota increase (usually approved)
2. Implement caching (recommended anyway)
3. Enable billing for higher limits

## Caching Strategy (Recommended)

To reduce API calls and improve performance:

```typescript
// Store district info in user profile after first lookup
await supabase
  .from('profiles')
  .update({
    county: result.district.county,
    congressional_district: result.district.congressionalDistrict,
    legislative_district: result.district.legislativeDistrict,
    address_verified_at: new Date().toISOString(),
  })
  .eq('id', userId);
```

Only re-lookup if:
- User changes address
- More than 1 year has passed (districts can change after redistricting)
- User requests manual refresh

## Troubleshooting

### "API key not valid" Error

- Verify the API key is correct
- Make sure Google Civic Information API is enabled in Cloud Console
- Check that API restrictions allow Civic Information API

### "Address not found" Error

- The address may be incomplete or invalid
- Try adding state and zip code
- Use full street name (not abbreviations)

### "No election data" Error

This is normal when calling `getVoterInfo()` outside election periods. The `lookupDistrictByAddress()` function works year-round.

## Security Best Practices

1. ✅ **Always restrict your API key** to specific APIs and platforms
2. ✅ **Never commit API keys** to version control
3. ✅ **Use environment variables** for all secrets
4. ✅ **Rotate keys periodically** (every 90 days recommended)
5. ✅ **Monitor usage** in Google Cloud Console

## Alternative: Census Bureau API

If you can't use Google's API, the U.S. Census Bureau provides free district lookup:
- **TIGERweb API** - https://tigerweb.geo.census.gov/
- More complex to implement
- Free with no API key required
- Official government source

However, Google Civic API is recommended for voter applications due to its simplicity and polling location features.

## Resources

- [Google Civic Information API Docs](https://developers.google.com/civic-information/docs/v2)
- [API Explorer (Test in Browser)](https://developers.google.com/civic-information/docs/v2/representatives/representativeInfoByAddress)
- [Google Cloud Console](https://console.cloud.google.com/)
