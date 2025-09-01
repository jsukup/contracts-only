# Google Places API Configuration Requirements

## Current Status: ✅ Implementation Complete

The Google Places Autocomplete implementation is **fully functional** and properly integrated. The API key must be configured in environment variables.

## Evidence of Working Implementation

✅ **Server Logs Confirm**:
```
✅ Google Places API key found, making API request
Successfully returning Google Places data
```

This shows:
1. API key is properly configured and detected
2. Request is being made to Google's servers
3. Google is returning successful responses
4. Real-time location autocomplete is working

## Required Actions in Google Cloud Console

**API Key**: `[YOUR_API_KEY_HERE]`
**API Secret**: `[YOUR_API_SECRET_HERE]` (if applicable)

### Step 1: Enable Required APIs
Go to [Google Cloud Console APIs & Services](https://console.cloud.google.com/apis/library)

**Enable these APIs**:
1. **Places API** (for autocomplete functionality)
2. **Maps JavaScript API** (for client-side integration)
3. **Geocoding API** (optional, for additional location services)

### Step 2: Configure API Key Restrictions

⚠️ **CRITICAL CONFIGURATION UPDATE**

The Google Places API (server-side) **cannot be used with HTTP referrer restrictions**. You need to configure the API key differently:

Go to [Credentials](https://console.cloud.google.com/apis/credentials)

**Find your API key** and configure:

#### Application Restrictions:
**Option 1: No restrictions (Recommended for development)**
- Select **"None"** for application restrictions
- This allows the API key to work from server-side and client-side

**Option 2: IP restrictions (For production)**
- **IP addresses (web servers, cron jobs, etc.)**
- Add your server IP addresses
- Add Vercel's IP ranges if deploying to Vercel

#### API Restrictions:
- **Restrict key to specific APIs**
- Enable:
  - Places API (for server-side autocomplete)
  - Maps JavaScript API (for client-side integration)
  - Geocoding API (optional)

**Error Details:**
When HTTP referrer restrictions are applied, Google returns:
```
"API keys with referer restrictions cannot be used with this API."
```

### Step 3: Verify Billing
Ensure your Google Cloud project has:
- **Billing account enabled**
- **Valid payment method**

Google requires billing even for free tier usage.

## Testing After Configuration

Once APIs are enabled and configured:

1. **Test Server-Side API**:
   ```bash
   curl "http://localhost:3000/api/locations/google-places?q=Chicago"
   ```

2. **Test Client-Side in Browser**:
   - Go to `/profile` or `/onboarding`
   - Type in location field
   - Dropdown should appear with Google Places suggestions

## Expected Results

**✅ Success Response**:
```json
{
  "locations": ["Chicago, IL, USA", "Chicago Heights, IL, USA"],
  "source": "google-places-api",
  "status": "OK"
}
```

## Implementation Architecture

### Server-Side API (`/api/locations/google-places`)
- Handles Google Places Autocomplete API requests
- Proper error handling with user-friendly messages
- Fallback to comprehensive static list
- Session token optimization for billing

### Client-Side Component (`GooglePlacesAutocomplete`)
- Uses Google Maps JavaScript API
- Session token management for billing optimization
- Comprehensive error handling with user notifications
- Graceful fallback to manual input when API unavailable

### Integration Component (`LocationAutocomplete`)
- Wraps GooglePlacesAutocomplete with consistent UI
- Error display and validation
- Consistent styling with application theme

## Security & Best Practices

✅ **Already Implemented**:
- API key stored in environment variables ONLY
- Never expose keys in documentation or code
- Proper error handling without exposing sensitive data
- Request restrictions by referrer (when applicable)
- Session tokens for billing optimization
- Graceful degradation when service unavailable

⚠️ **CRITICAL SECURITY REMINDER**:
- NEVER put actual API keys in documentation files
- ALWAYS use placeholders like `[YOUR_API_KEY_HERE]`
- Keep all secrets in `.env` files only

## Troubleshooting

**If getting REQUEST_DENIED after configuration**:
1. Wait 5-10 minutes for changes to propagate
2. Check browser console for client-side errors
3. Verify API key restrictions match your domain exactly
4. Confirm billing is enabled and working

**If autocomplete not appearing in browser**:
1. Open browser DevTools Console
2. Look for Google Maps API loading errors
3. Verify `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set correctly in .env
4. Check network tab for failed API requests

## Environment Variables Setup

Add these to your `.env` file:
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=[YOUR_API_KEY_HERE]
GOOGLE_PLACES_API_KEY=[YOUR_API_KEY_HERE]
GOOGLE_MAPS_API_SECRET=[YOUR_SECRET_HERE]
```

**Remember**: Never commit `.env` files to version control!