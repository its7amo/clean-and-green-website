# Fix for Replit Dependency Issue

## Problem
Your Render deployment was using hardcoded Replit URLs for SMS and email links. When Replit goes down, these links break causing admin features to fail.

## Solution
We've updated the code to use an `APP_URL` environment variable instead.

## Setup on Render

1. Go to your Render dashboard: https://dashboard.render.com
2. Click on your **clean-and-green-website** service
3. Go to **Environment** tab
4. Click **Add Environment Variable**
5. Add:
   ```
   Key: APP_URL
   Value: https://clean-and-green-website.onrender.com
   ```
6. Click **Save Changes**
7. Render will automatically redeploy

## What Was Fixed

### Before (Broken):
```javascript
// ❌ Hardcoded Replit URL
const paymentUrl = `https://${process.env.REPL_ID}.replit.app/pay-invoice/${invoiceId}`;
```

### After (Fixed):
```javascript
// ✅ Uses environment variable with fallback
const baseUrl = process.env.APP_URL || 'https://clean-and-green-website.onrender.com';
const paymentUrl = `${baseUrl}/pay-invoice/${invoiceId}`;
```

## Files Updated
- `server/sms.ts` - SMS payment links now use APP_URL
- `server/followUpScheduler.ts` - Follow-up emails now use APP_URL

## Testing
After deploying:
1. Create a test invoice
2. Send payment link via SMS
3. Verify the link uses your Render domain, not Replit
4. Confirm it works even if Replit is down

## Benefits
✅ **No more Replit dependency** - App works independently  
✅ **Proper production URLs** - All links point to your Render domain  
✅ **Works 24/7** - Not affected by Replit subscription status  
✅ **Environment-aware** - Automatically uses correct URL per environment  
