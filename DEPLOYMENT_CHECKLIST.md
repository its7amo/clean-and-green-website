# Production Deployment Checklist - Render.com

## ✅ Replit Independence Verified

Your app is now **100% independent of Replit** and will run perfectly on Render even if Replit is down.

### Changes Made:
1. ✅ Removed `REPLIT_DEV_DOMAIN` fallbacks (replaced with `APP_URL`)
2. ✅ Removed `REPLIT_DOMAINS` references (replaced with `APP_URL`)
3. ✅ All email/SMS links now use `APP_URL` environment variable
4. ✅ Database migration runs automatically on server startup
5. ✅ All required columns added to migration script

### Required Environment Variables on Render:

**Critical (Must Have):**
- `DATABASE_URL` - Your Neon PostgreSQL connection string
- `SESSION_SECRET` - Random string for session security
- `APP_URL` - Your production URL (e.g., `https://clean-and-green-website.onrender.com`)

**Payment Processing:**
- `STRIPE_SECRET_KEY` - Your live Stripe secret key
- `VITE_STRIPE_PUBLIC_KEY` - Your live Stripe publishable key (must start with VITE_)

**Email Notifications:**
- `RESEND_API_KEY` - Your Resend API key

**SMS Notifications (Optional but recommended):**
- `TWILIO_ACCOUNT_SID` - Your Twilio account SID
- `TWILIO_AUTH_TOKEN` - Your Twilio auth token
- `TWILIO_PHONE_NUMBER` - Your Twilio phone number (e.g., +15551234567)

### Render.com Build Settings:

**Build Command:**
```
npm install && npm run build
```

**Start Command:**
```
npm start
```

**Auto-Deploy:**
- ✅ Enable auto-deploy from GitHub `main` branch

### What Happens on Deployment:

1. **Install Phase**: `npm install` downloads all dependencies
2. **Build Phase**: 
   - `vite build` - Builds React frontend → `dist/public`
   - `esbuild` - Bundles Express backend → `dist/index.js`
3. **Start Phase**: `npm start` runs `node dist/index.js`
4. **Server Startup**:
   - ✅ Database migration runs automatically
   - ✅ Adds all missing columns to production database
   - ✅ Starts schedulers (email, SMS, reminders)
   - ✅ Serves frontend from `dist/public`

### Database Migration Details:

The migration adds these columns automatically:

**business_settings table:**
- win_back_discount_percent, win_back_email_subject, win_back_email_body
- churn_risk_high_days, churn_risk_medium_days
- anomaly_promo_creation_threshold, anomaly_promo_creation_minutes
- anomaly_invoice_change_percent
- anomaly_cancellation_threshold, anomaly_cancellation_hours
- anomaly_deletion_threshold, anomaly_deletion_minutes
- quick_replies, enable_churn_risk_scoring, enable_win_back_campaigns, enable_anomaly_detection

**customers table:**
- churn_risk, churn_risk_last_calculated, tags

**employees table:**
- availability, vacation_days

### Verification Steps After Deployment:

1. **Check Logs**: Look for "✓ Database schema verified/created successfully"
2. **Test Features**:
   - ✅ Admin login works
   - ✅ Intelligence Dashboard loads without errors
   - ✅ Quick Actions shows data
   - ✅ Customer profiles show churn risk
   - ✅ Employee scheduling works
   - ✅ Bookings can be created
   - ✅ Invoices can be paid

3. **Test Email/SMS** (if configured):
   - Create a test booking
   - Verify confirmation email arrives
   - Verify SMS notification (if Twilio configured)

4. **Test Payments**:
   - Create a test invoice
   - Try to pay it
   - Verify Stripe integration works

### No Replit Dependencies:

Your app does NOT rely on:
- ❌ Replit environment variables (REPL_ID, REPLIT_DOMAINS, etc.)
- ❌ Replit-specific services
- ❌ Replit database
- ❌ Replit auth (unless you specifically want to use it)

### External Services Used:

- **Database**: Neon (Serverless PostgreSQL) - works anywhere
- **Email**: Resend API - works anywhere
- **SMS**: Twilio API - works anywhere
- **Payments**: Stripe - works anywhere
- **Hosting**: Render.com - your production platform

### Troubleshooting:

If you see errors about missing columns after deployment:
1. Check Render logs for migration success messages
2. If migration didn't run, redeploy to trigger it again
3. All migrations are idempotent (safe to run multiple times)

### Current Status:

✅ **Ready for production deployment**
✅ **100% Replit-independent**
✅ **All database migrations automated**
✅ **No manual SQL scripts needed**
