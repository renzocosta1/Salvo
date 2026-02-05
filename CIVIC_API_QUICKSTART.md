# Google Civic API - Quick Start

## 🚀 Get Up and Running in 5 Minutes

### Step 1: Get Your API Key (2 min)

1. Go to: https://console.cloud.google.com/apis/credentials
2. Create new project (or select existing)
3. Click **"+ CREATE CREDENTIALS"** → **"API key"**
4. Copy your key (looks like: `AIzaSyB...`)
5. Click on the key to edit it
6. Under **API restrictions**: Select "Google Civic Information API"
7. Enable the API if prompted: https://console.cloud.google.com/apis/library/civicinfo.googleapis.com
8. Save

### Step 2: Add Key to Your Project (30 sec)

Create `.env` file in project root:

```bash
EXPO_PUBLIC_GOOGLE_CIVIC_API_KEY=AIzaSyB...your_key_here
```

Or export temporarily:

```bash
export GOOGLE_CIVIC_API_KEY=AIzaSyB...your_key_here
```

### Step 3: Test It (30 sec)

```bash
npm run test:civic-api
```

Expected output:
```
✅ SUCCESS: County matches user confirmation (Anne Arundel)
📍 County: Anne Arundel
🗳️  Congressional District: MD-4 or MD-5
🏛️  Legislative District: District 33
```

### Step 4: Use It in Your Code

```typescript
import { lookupDistrictByAddress } from '@/lib/districts';

// During user onboarding
const result = await lookupDistrictByAddress(userAddress);

if (result.success) {
  // Save to profile
  await saveUserDistrict(result.district);
}
```

## ✅ That's It!

You now have authoritative voter district lookup.

## 📚 More Info

- Full setup guide: `docs/GOOGLE_CIVIC_API_SETUP.md`
- Implementation details: `GOOGLE_CIVIC_API_IMPLEMENTATION.md`

## ❓ Troubleshooting

**"API key not valid"**
- Make sure you enabled Google Civic Information API
- Check the key is pasted correctly (no extra spaces)

**"Address not found"**
- Use full address with state and zip
- Example: "8620 Jacks Reef Rd, Laurel, MD 20724"

**Test fails with different county?**
- The API provides official data
- If it differs from expectation, the API is correct
- District boundaries can be surprising!

## 💰 Cost

**FREE** - 25,000 lookups per day, no credit card required.

For a political organizing app with caching, this is more than enough.

---

**Ready?** Run `npm run test:civic-api` to verify your setup!
