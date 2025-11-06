# Clean & Green Production Setup Guide

**Complete Checklist for Going Live**

---

## Table of Contents

1. [Stripe: Switch from Test to Live Mode](#1-stripe-switch-from-test-to-live-mode)
2. [Twilio: Upgrade from Free Trial to Paid Account](#2-twilio-upgrade-from-free-trial-to-paid-account)
3. [Custom Domain: Purchase and Setup](#3-custom-domain-purchase-and-setup)

---

## 1. Stripe: Switch from Test to Live Mode

### Prerequisites

- [ ] Complete business verification in Stripe Dashboard
- [ ] Add bank account for payouts
- [ ] Enable two-factor authentication (2FA)
- [ ] Have all test products/prices documented

### Step 1: Activate Your Stripe Account

1. **Log into Stripe Dashboard**: https://dashboard.stripe.com
2. **Click "Activate Account"** (top-left corner)
3. **Complete the activation form**:
   - Business legal name
   - Business type (LLC, Sole Proprietor, etc.)
   - Business address
   - Tax ID (EIN or SSN)
   - Personal identification (DOB, passport/driver's license)
   - Bank account information
   - Business website URL (your Render URL or custom domain)

4. **Submit for approval** (usually approved within 24-48 hours)

### Step 2: Get Your Live API Keys

1. **Go to Dashboard → Developers → API Keys**
2. **Turn OFF "Test mode"** toggle (ensure it shows "Live")
3. **Copy your live keys**:
   - ✅ **Publishable key** (starts with `pk_live_...`)
   - ✅ **Secret key** (starts with `sk_live_...`)

### Step 3: Update Environment Variables

**In Render Dashboard**:

1. Go to your Web Service
2. Navigate to **Environment** tab
3. **Update these variables**:

```
STRIPE_SECRET_KEY = sk_live_[your_secret_key_here]
VITE_STRIPE_PUBLIC_KEY = pk_live_[your_publishable_key_here]
```

4. Click **Save Changes**
5. Render will automatically redeploy

### Step 4: Create Live Webhook

1. **Dashboard → Developers → Webhooks**
2. **Ensure "Test mode" toggle is OFF**
3. **Click "+ Add endpoint"**
4. **Enter your webhook URL**:
   ```
   https://yourdomain.onrender.com/api/webhooks/stripe
   ```
5. **Select events to listen for**:
   - ✅ payment_intent.succeeded
   - ✅ payment_intent.payment_failed
   - ✅ charge.refunded
6. **Copy the webhook signing secret** (starts with `whsec_...`)

### Step 5: Update Webhook Secret

**In Render Dashboard**:

Add/Update this environment variable:
```
STRIPE_WEBHOOK_SECRET = whsec_[your_webhook_secret_here]
```

### Step 6: Recreate Products in Live Mode

**Option A - Dashboard (few products)**:
1. Go to **Products** in Stripe Dashboard
2. For each product, click it and select **"Copy to live mode"**

**Option B - Manually**:
1. Turn OFF test mode
2. Click **"+ Add product"**
3. Recreate each product with SAME price IDs as test mode

### Step 7: Test Live Payments

1. **Use your own credit card** for a small test transaction
2. **Verify** payment appears in Dashboard (Live mode)
3. **Check webhook** events are received in your logs
4. **Issue a refund** to test the refund flow
5. ⚠️ **Note**: Stripe fees apply even after refunds

### Checklist Before Going Live

- [ ] Account fully activated and verified
- [ ] Live API keys updated in Render
- [ ] Live webhook endpoint configured
- [ ] Products recreated in live mode
- [ ] Test transaction completed successfully
- [ ] No "Test mode" banner showing in Dashboard
- [ ] 2FA enabled on Stripe account

---

## 2. Twilio: Upgrade from Free Trial to Paid Account

### Current Limitations (Free Trial)

- ❌ Can only send to verified phone numbers
- ❌ Maximum 50 messages per day
- ❌ Limited to one phone number
- ❌ Cannot use A2P 10DLC for US messaging

### Step 1: Upgrade Your Account

1. **Log into Twilio Console**: https://console.twilio.com
2. **Click "Upgrade"** button (top-right corner)
   - OR go to **Admin → Account Billing → Upgrade Account**

### Step 2: Complete Verification

**You'll need to provide**:
- Full legal name
- Business phone number
- Some users may need to upload government ID

### Step 3: Create Customer Profile

**Add your business information**:
- Business name
- Business address
- Contact information
- Business type

### Step 4: Add Payment Method

**Options**:
- Credit card
- PayPal
- Bank account (for larger accounts)

**Important**: Twilio uses prepaid balance - you add funds, then usage is deducted

### Step 5: Fund Your Account

1. **Choose initial balance amount**:
   - Recommended: $20-$50 to start
   - Can set up auto-recharge when balance is low

2. **Complete payment**

3. **Verify upgrade** - All trial restrictions removed immediately

### Step 6: Register for A2P 10DLC (US Only)

**Required for US business messaging**:

1. **Go to Console → Messaging → Regulatory Compliance**
2. **Click "Create a Bundle"**
3. **Submit business information**:
   - Business name, address, tax ID
   - Business type and description
   - Website URL

4. **Register your messaging use case**:
   - Select "Mixed" or "Marketing"
   - Describe your messaging purpose
   - Expected monthly volume

5. **Wait for approval** (1-7 business days)

### Step 7: Update Phone Number Settings

**Your trial phone number automatically carries over**:
- Monthly rental fee now applies (~$1-2/month)
- Can now purchase additional phone numbers
- Can send to ANY phone number (not just verified)

### What Changes After Upgrade

✅ **Removed**:
- Verified phone number requirement
- 50 messages per day limit
- Single phone number restriction

✅ **Added**:
- Send to any phone number
- Purchase multiple phone numbers
- Access to premium features
- A2P 10DLC registration capability

### Billing Information

**Pay-as-you-go pricing**:
- SMS (US/Canada): ~$0.0075 per message
- Phone numbers: ~$1-2/month rental
- No monthly subscription fee

**Set up auto-recharge**:
1. Console → Billing → Auto Recharge
2. Set threshold (e.g., when balance < $10)
3. Set recharge amount (e.g., add $20)

### Checklist

- [ ] Account upgraded
- [ ] Payment method added
- [ ] Initial balance funded
- [ ] Customer profile completed
- [ ] A2P 10DLC registration submitted (US only)
- [ ] Auto-recharge configured
- [ ] Test message sent to unverified number

---

## 3. Custom Domain: Purchase and Setup

### Step 1: Purchase a Domain

**Recommended Registrars**:
- **Namecheap** - https://www.namecheap.com (affordable, easy to use)
- **Google Domains** - https://domains.google (simple interface)
- **Cloudflare** - https://www.cloudflare.com/products/registrar (lowest prices)
- **GoDaddy** - https://www.godaddy.com (popular but more expensive)

**What to look for**:
- ✅ Free WHOIS privacy protection
- ✅ Free SSL certificate
- ✅ Easy DNS management
- ✅ Reasonable renewal prices

**Domain suggestions**:
- cleanandgreenok.com
- cleanandgreenoklahoma.com
- cleangreenokc.com

**Cost**: Usually $10-15/year for .com domains

### Step 2: Add Domain to Render

1. **Log into Render Dashboard**: https://dashboard.render.com
2. **Go to your Web Service** (clean-and-green)
3. **Navigate to Settings**
4. **Scroll to "Custom Domains"**
5. **Click "+ Add Custom Domain"**
6. **Enter your domain**:
   - For root: `cleanandgreenok.com`
   - For www: `www.cleanandgreenok.com`
   - Render automatically handles both

7. **Click "Save"**

### Step 3: Configure DNS Records

**Render will show you exactly what to add. Typical setup**:

#### For Root Domain (cleanandgreenok.com):

**If your DNS provider supports ANAME/ALIAS** (Cloudflare, Name.com):
```
Type: ANAME or ALIAS
Name: @ (or leave blank)
Target: clean-and-green.onrender.com
TTL: Automatic
```

**If no ANAME/ALIAS support** (Namecheap, GoDaddy):
```
Type: A
Name: @ (or leave blank)
Value: [IP address shown in Render dashboard]
TTL: Automatic
```

#### For www Subdomain:

```
Type: CNAME
Name: www
Target: clean-and-green.onrender.com
TTL: Automatic
```

**Important**:
- ⚠️ Remove all AAAA records (IPv6) - Render uses IPv4 only
- ⚠️ If using Cloudflare, set Proxy to "DNS only" (gray cloud) during initial setup

### Step 4: Verify Domain in Render

1. **Return to Render Dashboard**
2. **Click "Verify" next to your domain**
3. **Wait for DNS propagation** (5-30 minutes)
4. **Render will automatically issue SSL certificate** when verified
5. **Test your domain** - visit https://yourdomain.com

### Step 5: Update Email DNS for Resend

**Add these DNS records at your domain registrar**:

**Important**: You already verified `voryn.store` - if you want to use your NEW domain for emails, you need to add it to Resend and update DNS.

#### Option A: Keep using voryn.store (no changes needed)

Your emails will continue sending from `noreply@voryn.store`

#### Option B: Use your new domain for emails

1. **Add domain to Resend**: https://resend.com/domains
2. **Click "+ Add Domain"**
3. **Enter your domain**: `cleanandgreenok.com`
4. **Resend will provide DNS records** - add them to your registrar:

**Typical records**:
```
Type: TXT
Name: @ (or leave blank)
Value: [Resend verification code]

Type: CNAME
Name: resend._domainkey
Value: [Resend DKIM value]

Type: MX (optional, for receiving emails)
Name: @
Priority: 10
Value: feedback-smtp.us-east-1.amazonses.com
```

5. **Wait for verification** (few minutes to few hours)
6. **Update your code** (server/email.ts):

```javascript
from: 'Clean & Green <noreply@cleanandgreenok.com>'
```

7. **Redeploy** your app on Render

### DNS Configuration Example

**Complete DNS setup for cleanandgreenok.com**:

```
# Web hosting (Render)
A Record:
@ → 216.24.57.1 (Render IP)

CNAME Record:
www → clean-and-green.onrender.com

# Email (Resend)
TXT Record (Verification):
@ → resend-verification=xxxxx

CNAME Record (DKIM):
resend._domainkey → xxxxx.resend.com

TXT Record (SPF):
@ → v=spf1 include:amazonses.com ~all
```

### Step 6: Update Environment Variables (Optional)

**If using new domain for emails**, update in Render:

No new environment variables needed - just update the `from` addresses in your code

### Troubleshooting

**Domain not verifying**:
- Wait 30 minutes for DNS propagation
- Use https://dnschecker.org to verify DNS records
- For Cloudflare: turn OFF proxy (gray cloud) during setup

**SSL certificate not issuing**:
- Ensure DNS is fully propagated
- Remove any conflicting AAAA records
- Wait up to 24 hours for auto-issue

**Emails not sending from new domain**:
- Verify domain is "Verified" in Resend dashboard
- Check all DNS records are correct
- SPF and DKIM records must be exact

### Checklist

- [ ] Domain purchased
- [ ] Domain added to Render
- [ ] DNS records configured
- [ ] Domain verified in Render
- [ ] SSL certificate issued
- [ ] Website accessible at new domain
- [ ] (Optional) Domain added to Resend
- [ ] (Optional) Email DNS records configured
- [ ] (Optional) Code updated with new email domain
- [ ] (Optional) App redeployed

---

## Final Production Checklist

### Before Going Live

- [ ] **Stripe**: Live mode enabled, test payment successful
- [ ] **Twilio**: Account upgraded, A2P 10DLC registered
- [ ] **Domain**: Custom domain configured, SSL active
- [ ] **Emails**: Resend domain verified
- [ ] **Database**: Production data backed up
- [ ] **Environment Variables**: All production values set
- [ ] **Testing**: All features tested on production URL
- [ ] **Monitoring**: Error tracking configured
- [ ] **Legal**: Privacy policy and terms updated with real domain

### After Going Live

- [ ] Monitor Stripe dashboard for transactions
- [ ] Check Twilio usage and balance
- [ ] Monitor email delivery rates in Resend
- [ ] Set up domain auto-renewal
- [ ] Configure DNS monitoring/alerts
- [ ] Update business cards and marketing materials
- [ ] Submit sitemap to Google Search Console

---

## Support Resources

**Stripe**:
- Dashboard: https://dashboard.stripe.com
- Documentation: https://docs.stripe.com
- Support: https://support.stripe.com

**Twilio**:
- Console: https://console.twilio.com
- Documentation: https://www.twilio.com/docs
- Support: https://support.twilio.com

**Render**:
- Dashboard: https://dashboard.render.com
- Documentation: https://render.com/docs
- Community: https://community.render.com

**Resend**:
- Dashboard: https://resend.com
- Documentation: https://resend.com/docs
- Support: support@resend.com

---

**Document Version**: 1.0  
**Last Updated**: November 2025  
**Application**: Clean & Green Cleaning Services
