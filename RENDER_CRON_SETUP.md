# Render Cron Jobs Setup Guide

## Overview

Clean & Green uses automated schedulers for critical business operations (email reminders, recurring bookings, referral credits, etc.). In production, these schedulers are **disabled** in the main web process to prevent duplicate executions when scaling. Instead, they run via **Render Cron Jobs** that call secured HTTP endpoints.

## Environment Variables

### Required Secret

Add this environment variable to your Render web service:

```
CRON_SECRET=<generate-a-strong-random-string>
```

**How to generate a secure secret:**
```bash
# Option 1: Using OpenSSL
openssl rand -base64 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Important:** Use the same `CRON_SECRET` value for both your web service and all cron jobs.

## Cron Job Configuration

Configure 6 cron jobs in your Render Dashboard under **Settings > Cron Jobs**.

### 1. Review Emails (Hourly)

**Name:** Send Review Request Emails  
**Schedule:** `0 * * * *` (every hour at minute 0)  
**Command:**
```bash
curl -X POST https://your-app-name.onrender.com/api/cron/review-emails \
  -H "Content-Type: application/json" \
  -H "X-Cron-Secret: $CRON_SECRET"
```

**Purpose:** Sends review request emails to customers 24 hours after service completion.

---

### 2. Appointment Reminders (Hourly)

**Name:** Send Appointment Reminders  
**Schedule:** `0 * * * *` (every hour at minute 0)  
**Command:**
```bash
curl -X POST https://your-app-name.onrender.com/api/cron/appointment-reminders \
  -H "Content-Type: application/json" \
  -H "X-Cron-Secret: $CRON_SECRET"
```

**Purpose:** Sends SMS/email reminders 24 hours before scheduled appointments.

---

### 3. Recurring Bookings (Hourly)

**Name:** Process Recurring Bookings  
**Schedule:** `0 * * * *` (every hour at minute 0)  
**Command:**
```bash
curl -X POST https://your-app-name.onrender.com/api/cron/recurring-bookings \
  -H "Content-Type: application/json" \
  -H "X-Cron-Secret: $CRON_SECRET"
```

**Purpose:** Automatically creates new bookings from recurring service schedules.

---

### 4. Follow-Up Emails (Daily)

**Name:** Send Follow-Up Emails  
**Schedule:** `0 10 * * *` (daily at 10:00 AM UTC)  
**Command:**
```bash
curl -X POST https://your-app-name.onrender.com/api/cron/follow-up-emails \
  -H "Content-Type: application/json" \
  -H "X-Cron-Secret: $CRON_SECRET"
```

**Purpose:** Sends win-back emails 30 days after service completion.

---

### 5. Payment Reminders (Hourly)

**Name:** Send Payment Reminders  
**Schedule:** `0 * * * *` (every hour at minute 0)  
**Command:**
```bash
curl -X POST https://your-app-name.onrender.com/api/cron/payment-reminders \
  -H "Content-Type: application/json" \
  -H "X-Cron-Secret: $CRON_SECRET"
```

**Purpose:** Sends payment reminders for overdue invoices (3-day, 7-day, 14-day).

---

### 6. Referral Credits (Every 5 Minutes)

**Name:** Process Referral Credits  
**Schedule:** `*/5 * * * *` (every 5 minutes)  
**Command:**
```bash
curl -X POST https://your-app-name.onrender.com/api/cron/referral-credits \
  -H "Content-Type: application/json" \
  -H "X-Cron-Secret: $CRON_SECRET"
```

**Purpose:** Automatically credits referral rewards when referred customers complete bookings.

---

## Security

### Authentication

All cron endpoints require the `X-Cron-Secret` header to match the `CRON_SECRET` environment variable.

- ✅ **Production:** Returns 401 Unauthorized if secret is missing or incorrect
- ✅ **Development:** Allows requests without secret for local testing

### Testing Endpoints

Test cron endpoints locally (development mode doesn't require secret):

```bash
# Test all endpoints
curl -X POST http://localhost:5000/api/cron/review-emails
curl -X POST http://localhost:5000/api/cron/appointment-reminders
curl -X POST http://localhost:5000/api/cron/recurring-bookings
curl -X POST http://localhost:5000/api/cron/follow-up-emails
curl -X POST http://localhost:5000/api/cron/payment-reminders
curl -X POST http://localhost:5000/api/cron/referral-credits
```

Expected response:
```json
{"success": true, "message": "Review emails processed"}
```

### Production Testing

Test with authentication in production:

```bash
curl -X POST https://your-app-name.onrender.com/api/cron/review-emails \
  -H "X-Cron-Secret: your-secret-here"
```

## Troubleshooting

### Cron Job Fails with 401

**Cause:** `CRON_SECRET` mismatch or missing  
**Fix:** Verify the secret is identical in both web service and cron job environment variables

### Cron Job Fails with 500

**Cause:** Missing environment variables (DATABASE_URL, RESEND_API_KEY, TWILIO_*, etc.)  
**Fix:** Ensure all required secrets are set in the web service environment

### No Emails/SMS Being Sent

**Cause:** Feature disabled in Business Settings  
**Fix:** Admin Dashboard > Settings > Enable the relevant email/SMS features

### Duplicate Emails/SMS

**Cause:** Schedulers running in web process AND cron jobs  
**Fix:** Verify `server/index.ts` only starts schedulers in development mode:
```typescript
if (process.env.NODE_ENV === 'development') {
  startReviewEmailScheduler();
  // ... other schedulers
}
```

## Monitoring

### Checking Cron Job Logs

1. Go to Render Dashboard
2. Navigate to your web service
3. Click on **Cron Jobs** tab
4. View execution history and logs for each job

### Success Indicators

- HTTP 200 response
- JSON response: `{"success": true, "message": "..."}`
- Check your email/SMS logs for actual sends

## Cron Schedule Reference

| Expression | Meaning |
|-----------|---------|
| `0 * * * *` | Every hour at minute 0 |
| `*/5 * * * *` | Every 5 minutes |
| `0 10 * * *` | Daily at 10:00 AM UTC |
| `0 0 * * 0` | Weekly on Sunday at midnight |

## Architecture Notes

### Why Separate Cron Jobs?

1. **Scalability:** Prevents duplicate scheduler executions when scaling web dynos
2. **Reliability:** Cron jobs run independently of web process restarts
3. **Resource isolation:** Heavy background tasks don't block web requests
4. **Monitoring:** Clear separation between web traffic and scheduled tasks

### Scheduler Modes

- **Development:** Schedulers run via `setInterval()` in `server/index.ts`
- **Production:** Schedulers disabled in web process, run via Render Cron Jobs calling HTTP endpoints

### Endpoint Security

- All endpoints under `/api/cron/*`
- Require `X-Cron-Secret` header in production
- Dynamic imports to avoid loading all schedulers at startup
- Individual error handling per scheduler

## Additional Resources

- [Render Cron Jobs Documentation](https://render.com/docs/cronjobs)
- [Cron Expression Generator](https://crontab.guru/)
- Clean & Green Admin Dashboard: Business Settings > Email & SMS Configuration
