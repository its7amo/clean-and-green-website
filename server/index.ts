import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { runMigrations } from "./migrate";
import { startReviewEmailScheduler } from "./reviewEmailScheduler";
import { startReminderScheduler } from "./reminderScheduler";
import { startRecurringBookingScheduler } from "./recurringBookingScheduler";
import { startFollowUpScheduler } from "./followUpScheduler";
import { startOverdueInvoiceReminder } from "./schedulers/overdueInvoiceReminder";
import { startReferralScheduler } from "./referralScheduler";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  limit: '50mb', // Allow large payloads for photo uploads (up to 5 photos at 5MB each)
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Disable caching for ALL responses (API + static files)
// This fixes the F5 cache issue where normal refresh shows old data
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Validate required environment variables
  const requiredEnvVars = [
    'DATABASE_URL',
    'SESSION_SECRET',
  ];

  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingEnvVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease set these variables before starting the server.');
    process.exit(1);
  }

  // Warn about optional but recommended environment variables
  const optionalEnvVars = [
    'STRIPE_SECRET_KEY',
    'RESEND_API_KEY',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER',
  ];

  const missingOptional = optionalEnvVars.filter(varName => !process.env[varName]);
  if (missingOptional.length > 0) {
    console.warn('⚠️  Optional environment variables not set (some features may not work):');
    missingOptional.forEach(varName => console.warn(`   - ${varName}`));
  }

  // Run database migrations on startup
  try {
    await runMigrations();
  } catch (error) {
    console.error('Failed to run migrations:', error);
    process.exit(1);
  }

  // Initialize default referral settings if they don't exist
  try {
    const { storage } = await import("./storage");
    const existingSettings = await storage.getReferralSettings();
    if (!existingSettings) {
      await storage.upsertReferralSettings({
        enabled: true,
        tier1Amount: 1000, // $10
        tier2Amount: 1500, // $15
        tier3Amount: 2000, // $20
        minimumServicePrice: 5000, // $50
        welcomeEmailEnabled: true,
        creditEarnedEmailEnabled: true,
      });
      console.log('✓ Initialized default referral program settings');
    }
  } catch (error) {
    console.warn('Warning: Could not initialize referral settings:', error);
  }

  // In production, schedulers should be run via Render Cron Jobs (not in web process)
  // This prevents duplicate jobs when Render scales to multiple instances
  // In development, run schedulers directly for convenience
  if (process.env.NODE_ENV !== 'production') {
    console.log('⚙️  Starting schedulers in development mode...');
    
    // Start review email scheduler (checks every hour for invoices paid 24h ago)
    startReviewEmailScheduler();

    // Start appointment reminder scheduler (sends SMS/email 24h before booking)
    startReminderScheduler();

    // Start recurring booking scheduler (auto-creates bookings from recurring schedules)
    startRecurringBookingScheduler();

    // Start follow-up email scheduler (sends 30-day follow-up emails)
    startFollowUpScheduler();

    // Start overdue invoice reminder scheduler (sends payment reminders at 3, 7, and 14 days overdue)
    startOverdueInvoiceReminder();

    // Start referral program scheduler (auto-credits referrers, generates codes)
    startReferralScheduler();
  } else {
    console.log('⚙️  Production mode: Schedulers disabled in web process');
    console.log('   Configure Render Cron Jobs to call /api/cron/* endpoints');
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
