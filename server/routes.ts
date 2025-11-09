import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertBookingSchema, 
  insertQuoteSchema,
  insertServiceSchema,
  insertBusinessSettingsSchema,
  insertFaqItemSchema,
  insertGalleryImageSchema,
  insertInvoiceSchema,
  insertUserSchema,
  insertEmployeeSchema,
  insertReviewSchema,
  insertNewsletterSubscriberSchema,
  insertTeamMemberSchema,
  insertContactMessageSchema,
  insertCustomerSchema,
  insertPromoCodeSchema,
  insertRecurringBookingSchema,
  insertJobPhotoSchema,
  insertEmailTemplateSchema,
  insertServiceAreaSchema,
  createAnomalyAlertSchema,
  assignMessageSchema,
  replyMessageSchema,
  updateCustomerTagsSchema,
  suggestEmployeesSchema,
  updateContactMessageSchema,
  insertRescheduleRequestSchema,
  type JobPhoto,
  type EmailTemplate,
  type User,
} from "@shared/schema";
import { z } from "zod";
import { setupAuth, isAuthenticated, hashPassword } from "./auth";
import { sendQuoteNotification, sendBookingNotification, sendCustomerBookingConfirmation, sendBookingUnderReviewEmail, sendCustomerQuoteConfirmation, sendBookingChangeNotification, sendContactMessageNotification, resend, escapeHtml } from "./email";
import { sendBookingConfirmationSMS, sendInvoicePaymentLinkSMS, sendEmployeeAssignmentSMS } from "./sms";
import { logActivity, getUserContext } from "./activityLogger";
import { validateNotPastDate, validateMinimumLeadTime, checkSlotCapacity, getAvailableSlots } from "./bookingValidation";
import { findMatchingCustomer, createMergeAlert } from "./customerDedup";
import { pool } from "./db";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn('Warning: No Stripe secret key found. Payment features will not work.');
} else if (stripeSecretKey.startsWith('pk_')) {
  console.error('❌ ERROR: STRIPE_SECRET_KEY is set to a PUBLISHABLE key (pk_*) but should be a SECRET key (sk_*)');
} else {
  console.log('✓ Stripe initialized with secret key');
}

const stripe = stripeSecretKey && !stripeSecretKey.startsWith('pk_')
  ? new Stripe(stripeSecretKey)
  : null;

const bookingStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
});

const quoteStatusSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "completed"]),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // Check if setup is required (no users exist)
  app.get("/api/setup/required", async (_req, res) => {
    try {
      const userCount = await storage.countUsers();
      res.json({ required: userCount === 0 });
    } catch (error) {
      console.error("Error checking setup status:", error);
      res.status(500).json({ error: "Failed to check setup status" });
    }
  });

  // Create initial admin user (only works if no users exist)
  app.post("/api/setup/admin", async (req, res) => {
    try {
      const userCount = await storage.countUsers();
      if (userCount > 0) {
        return res.status(403).json({ error: "Setup already completed" });
      }

      const setupSchema = z.object({
        username: z.string().min(3),
        password: z.string().min(6),
        email: z.string().email().optional(),
      });

      const validatedData = setupSchema.parse(req.body);
      const hashedPassword = await hashPassword(validatedData.password);

      const user = await storage.createUser({
        username: validatedData.username,
        password: hashedPassword,
        email: validatedData.email,
      });

      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json({ success: true, user: userWithoutPassword });
    } catch (error) {
      console.error("Error creating admin user:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create admin user" });
    }
  });

  // Cron job endpoints for Render - these run the schedulers without duplicates
  // Configure in Render Dashboard: Settings > Cron Jobs
  // Security: These endpoints should only be called by Render Cron Jobs
  // Set CRON_SECRET in Render environment variables and pass as header: X-Cron-Secret
  const verifyCronSecret = (req: any, res: any): boolean => {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      // In development, allow without secret
      if (process.env.NODE_ENV !== 'production') {
        return true;
      }
      res.status(500).json({ error: "CRON_SECRET not configured" });
      return false;
    }
    const providedSecret = req.headers['x-cron-secret'];
    if (providedSecret !== cronSecret) {
      res.status(401).json({ error: "Unauthorized: Invalid cron secret" });
      return false;
    }
    return true;
  };

  app.post("/api/cron/review-emails", async (req, res) => {
    if (!verifyCronSecret(req, res)) return;
    try {
      const { checkAndSendReviewEmails } = await import("./reviewEmailScheduler");
      await checkAndSendReviewEmails();
      res.json({ success: true, message: "Review emails processed" });
    } catch (error) {
      console.error("Error processing review emails:", error);
      res.status(500).json({ error: "Failed to process review emails" });
    }
  });

  app.post("/api/cron/appointment-reminders", async (req, res) => {
    if (!verifyCronSecret(req, res)) return;
    try {
      const { checkAndSendRemindersNow } = await import("./reminderScheduler");
      await checkAndSendRemindersNow();
      res.json({ success: true, message: "Appointment reminders processed" });
    } catch (error) {
      console.error("Error processing appointment reminders:", error);
      res.status(500).json({ error: "Failed to process appointment reminders" });
    }
  });

  app.post("/api/cron/recurring-bookings", async (req, res) => {
    if (!verifyCronSecret(req, res)) return;
    try {
      const { processRecurringBookingsNow } = await import("./recurringBookingScheduler");
      await processRecurringBookingsNow();
      res.json({ success: true, message: "Recurring bookings processed" });
    } catch (error) {
      console.error("Error processing recurring bookings:", error);
      res.status(500).json({ error: "Failed to process recurring bookings" });
    }
  });

  app.post("/api/cron/follow-up-emails", async (req, res) => {
    if (!verifyCronSecret(req, res)) return;
    try {
      const { checkAndSendFollowUps } = await import("./followUpScheduler");
      await checkAndSendFollowUps();
      res.json({ success: true, message: "Follow-up emails processed" });
    } catch (error) {
      console.error("Error processing follow-up emails:", error);
      res.status(500).json({ error: "Failed to process follow-up emails" });
    }
  });

  app.post("/api/cron/payment-reminders", async (req, res) => {
    if (!verifyCronSecret(req, res)) return;
    try {
      const { checkAndSendOverdueReminders } = await import("./schedulers/overdueInvoiceReminder");
      await checkAndSendOverdueReminders();
      res.json({ success: true, message: "Payment reminders processed" });
    } catch (error) {
      console.error("Error processing payment reminders:", error);
      res.status(500).json({ error: "Failed to process payment reminders" });
    }
  });

  app.post("/api/cron/referral-credits", async (req, res) => {
    if (!verifyCronSecret(req, res)) return;
    try {
      const { processReferralCredits } = await import("./referralScheduler");
      await processReferralCredits();
      res.json({ success: true, message: "Referral credits processed" });
    } catch (error) {
      console.error("Error processing referral credits:", error);
      res.status(500).json({ error: "Failed to process referral credits" });
    }
  });

  // Booking routes (public submissions, protected admin actions)
  app.post("/api/bookings", async (req, res) => {
    try {
      const validatedData = insertBookingSchema.parse(req.body);
      
      // Capture IP address from request
      const ipAddress = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || 
                        req.headers['x-real-ip']?.toString() || 
                        req.socket.remoteAddress || 
                        undefined;
      
      // Referral fraud detection - run BEFORE creating booking
      if (req.body.referralCode) {
        const fraudCheck = await storage.detectReferralFraud({
          referralCode: req.body.referralCode,
          email: validatedData.email,
          phone: validatedData.phone,
          address: validatedData.address,
          ipAddress,
        });
        
        if (!fraudCheck.isValid) {
          // Create anomaly alert for fraud attempt
          try {
            await storage.createAnomalyAlert({
              type: 'referral_fraud',
              severity: fraudCheck.severity || 'high',
              title: 'Referral Fraud Attempt Blocked',
              description: `Blocked referral booking: ${fraudCheck.reason}`,
              payload: JSON.stringify({
                email: validatedData.email,
                phone: validatedData.phone,
                address: validatedData.address,
                referralCode: req.body.referralCode,
                ipAddress: ipAddress || null,
                reason: fraudCheck.reason,
              }) as any,
            });
          } catch (alertError) {
            console.error("Failed to create fraud anomaly alert:", alertError);
          }
          
          // Return 400 with specific fraud message
          return res.status(400).json({ 
            error: "Booking blocked", 
            message: fraudCheck.reason 
          });
        }
      }
      
      // Fetch business settings for validation
      const settings = await storage.getBusinessSettings();
      const minLeadHours = settings?.minLeadHours || 12;
      const maxBookingsPerSlot = settings?.maxBookingsPerSlot || 3;
      
      // Validate booking is not in the past
      const pastDateCheck = validateNotPastDate(validatedData.date, validatedData.timeSlot);
      if (!pastDateCheck.isValid) {
        return res.status(400).json({ error: pastDateCheck.error });
      }
      
      // Validate minimum lead time
      const leadTimeCheck = validateMinimumLeadTime(validatedData.date, validatedData.timeSlot, minLeadHours);
      if (!leadTimeCheck.isValid) {
        return res.status(400).json({ error: leadTimeCheck.error });
      }
      
      // Check slot capacity
      const capacityCheck = await checkSlotCapacity(pool, validatedData.date, validatedData.timeSlot, maxBookingsPerSlot);
      if (!capacityCheck.isAvailable) {
        return res.status(400).json({ error: capacityCheck.error });
      }
      
      // Handle referral code if provided
      let referralData: { 
        referralCode?: string; 
        discountAmount?: number;
        referrerId?: string;
        referralTier?: number;
      } = {};
      
      if (req.body.referralCode) {
        // Validate referral code and get referrer
        const referrer = await storage.validateReferralCode(req.body.referralCode.toUpperCase());
        if (referrer) {
          const settings = await storage.getReferralSettings();
          if (settings?.enabled) {
            // Calculate tier and discount amount
            const tierInfo = await storage.calculateReferralTier(referrer.id);
            
            referralData = {
              referralCode: req.body.referralCode.toUpperCase(),
              discountAmount: tierInfo.amount,
              referrerId: referrer.id,
              referralTier: tierInfo.tier,
            };
          }
        }
      }
      
      // Handle promo code if provided (promo codes and referrals are separate)
      let promoCodeData: { promoCode?: string; promoCodeDiscount?: number } = {};
      if (req.body.promoCodeId) {
        const promoCode = await storage.getPromoCode(req.body.promoCodeId);
        if (promoCode) {
          // Get service price to calculate discount
          const services = await storage.getServices();
          const service = services.find(s => s.name.toLowerCase().includes(validatedData.service.toLowerCase()));
          const servicePrice = service?.basePrice || 0;
          
          // Calculate discount based on type
          let discountAmount = 0;
          if (promoCode.discountType === 'percentage') {
            discountAmount = Math.round((servicePrice * promoCode.discountValue) / 100);
          } else {
            discountAmount = promoCode.discountValue;
          }
          
          promoCodeData = {
            promoCode: promoCode.code,
            promoCodeDiscount: discountAmount,
          };
          // Increment promo code usage
          await storage.incrementPromoCodeUsage(promoCode.id);
        }
      }
      
      // Customer deduplication logic
      let customer;
      
      if (settings?.customerDedupEnabled) {
        const match = await findMatchingCustomer(
          pool,
          validatedData.email,
          validatedData.phone,
          validatedData.address
        );
        
        if (match.matchFound && match.customerId) {
          customer = await storage.getCustomer(match.customerId);
          
          // Create merge alert if enabled and high/medium confidence
          if (settings.customerMergeAlertEnabled && match.confidence !== 'low') {
            // Note: bookingId will be updated after booking creation
            await createMergeAlert(
              pool,
              match.matchType || 'email',
              match.matchedFields || [],
              match.customerId,
              { 
                name: validatedData.name, 
                email: validatedData.email, 
                phone: validatedData.phone, 
                address: validatedData.address 
              },
              'booking',
              '', // Will be filled with booking ID after creation
              match.confidence
            );
          }
        }
      }
      
      // If no match found or deduplication disabled, find or create customer
      if (!customer) {
        customer = await storage.findOrCreateCustomer(
          validatedData.name,
          validatedData.email,
          validatedData.phone,
          validatedData.address
        );
      }
      
      // Combine both discounts (referral + promo code)
      const totalDiscountAmount = (referralData.discountAmount || 0) + (promoCodeData.promoCodeDiscount || 0);
      
      // Create booking with customer link, leadType, IP address, and referral data
      const booking = await storage.createBooking({
        ...validatedData,
        promoCode: promoCodeData.promoCode,
        discountAmount: totalDiscountAmount, // Total of both discounts
        referralCode: referralData.referralCode, // Save referral code on booking
        customerId: customer.id,
        leadType: 'web', // Public endpoint = web lead
        ipAddress, // Store IP for fraud tracking
      });
      
      // Increment customer booking count
      await storage.incrementCustomerBookings(customer.id);

      // Create referral record if referral code was used
      if (referralData.referralCode && referralData.referrerId && referralData.referralTier) {
        try {
          await storage.createReferral({
            referrerId: referralData.referrerId,
            referredCustomerId: customer.id,
            referralCode: referralData.referralCode,
            referredBookingId: booking.id,
            tier: referralData.referralTier,
            creditAmount: referralData.discountAmount || 0,
            status: 'pending', // Will be updated to 'completed' then 'credited' by scheduler
          });
        } catch (referralError) {
          console.error("Failed to create referral record:", referralError);
          // Don't fail the booking if referral creation fails
        }
      }

      // Create recurring booking if requested
      if (req.body.isRecurring && validatedData.date && validatedData.timeSlot) {
        const frequency = req.body.recurringFrequency || 'weekly';
        const currentDate = new Date(validatedData.date);
        
        // Calculate next occurrence based on frequency
        let nextOccurrence: Date;
        switch (frequency) {
          case 'weekly':
            nextOccurrence = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
          case 'biweekly':
            nextOccurrence = new Date(currentDate.getTime() + 14 * 24 * 60 * 60 * 1000);
            break;
          case 'monthly':
            // Use calendar month math instead of fixed 30 days
            nextOccurrence = new Date(currentDate);
            nextOccurrence.setMonth(nextOccurrence.getMonth() + 1);
            break;
          default:
            nextOccurrence = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        }

        await storage.createRecurringBooking({
          customerId: customer.id,
          service: validatedData.service,
          propertySize: validatedData.propertySize,
          frequency,
          preferredTimeSlot: validatedData.timeSlot,
          name: validatedData.name,
          email: validatedData.email,
          phone: validatedData.phone,
          address: validatedData.address,
          startDate: validatedData.date,
          nextOccurrence: nextOccurrence.toISOString().split('T')[0],
          status: 'active',
          endDate: req.body.recurringEndDate || null,
          promoCode: promoCodeData.promoCode,
          assignedEmployeeIds: [],
        });
      }
      
      // Send email notifications (async, don't block response)
      (async () => {
        try {
          const settings = await storage.getBusinessSettings();
          if (settings) {
            // Send notification to business owner
            await sendBookingNotification({
              name: booking.name,
              email: booking.email,
              phone: booking.phone,
              address: booking.address,
              serviceType: booking.service,
              propertySize: booking.propertySize,
              date: booking.date,
              timeSlot: booking.timeSlot,
            }, settings.email);
            
            // Send "under review" email to customer (not confirmed yet)
            await sendBookingUnderReviewEmail({
              bookingId: booking.id,
              managementToken: booking.managementToken,
              name: booking.name,
              email: booking.email,
              phone: booking.phone,
              address: booking.address,
              serviceType: booking.service,
              propertySize: booking.propertySize,
              date: booking.date,
              timeSlot: booking.timeSlot,
            });
          }
        } catch (emailError) {
          console.error("Failed to send booking emails:", emailError);
        }
      })();
      
      res.status(201).json(booking);
    } catch (error) {
      console.error("Error creating booking:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid booking data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create booking" });
    }
  });

  // Admin endpoint for manual booking creation (phone orders, walk-ins)
  app.post("/api/bookings/manual", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertBookingSchema.parse(req.body);
      
      // Fetch business settings for validation
      const settings = await storage.getBusinessSettings();
      const minLeadHours = settings?.minLeadHours || 12;
      const maxBookingsPerSlot = settings?.maxBookingsPerSlot || 3;
      
      // Validate booking is not in the past
      const pastDateCheck = validateNotPastDate(validatedData.date, validatedData.timeSlot);
      if (!pastDateCheck.isValid) {
        return res.status(400).json({ error: pastDateCheck.error });
      }
      
      // Validate minimum lead time
      const leadTimeCheck = validateMinimumLeadTime(validatedData.date, validatedData.timeSlot, minLeadHours);
      if (!leadTimeCheck.isValid) {
        return res.status(400).json({ error: leadTimeCheck.error });
      }
      
      // Check slot capacity
      const capacityCheck = await checkSlotCapacity(pool, validatedData.date, validatedData.timeSlot, maxBookingsPerSlot);
      if (!capacityCheck.isAvailable) {
        return res.status(400).json({ error: capacityCheck.error });
      }
      
      // Handle referral code if provided
      let referralData: { 
        referralCode?: string; 
        discountAmount?: number;
        referrerId?: string;
        referralTier?: number;
      } = {};
      
      if (req.body.referralCode) {
        const referrer = await storage.validateReferralCode(req.body.referralCode.toUpperCase());
        if (referrer) {
          const settings = await storage.getReferralSettings();
          if (settings?.enabled) {
            const tierInfo = await storage.calculateReferralTier(referrer.id);
            
            referralData = {
              referralCode: req.body.referralCode.toUpperCase(),
              discountAmount: tierInfo.amount,
              referrerId: referrer.id,
              referralTier: tierInfo.tier,
            };
          }
        }
      }
      
      // Handle promo code if provided
      let promoCodeData: { promoCode?: string; promoCodeDiscount?: number } = {};
      if (req.body.promoCodeId) {
        const promoCode = await storage.getPromoCode(req.body.promoCodeId);
        if (promoCode) {
          // Get service price to calculate discount
          const services = await storage.getServices();
          const service = services.find(s => s.name.toLowerCase().includes(validatedData.service.toLowerCase()));
          const servicePrice = service?.basePrice || 0;
          
          // Calculate discount based on type
          let discountAmount = 0;
          if (promoCode.discountType === 'percentage') {
            discountAmount = Math.round((servicePrice * promoCode.discountValue) / 100);
          } else {
            discountAmount = promoCode.discountValue;
          }
          
          promoCodeData = {
            promoCode: promoCode.code,
            promoCodeDiscount: discountAmount,
          };
          // Increment promo code usage
          await storage.incrementPromoCodeUsage(promoCode.id);
        }
      }
      
      // Find or create customer
      const customer = await storage.findOrCreateCustomer(
        validatedData.name,
        validatedData.email,
        validatedData.phone,
        validatedData.address
      );
      
      // Combine both discounts
      const totalDiscountAmount = (referralData.discountAmount || 0) + (promoCodeData.promoCodeDiscount || 0);
      
      // Create booking with customer link and leadType='phone'
      const booking = await storage.createBooking({
        ...validatedData,
        promoCode: promoCodeData.promoCode,
        discountAmount: totalDiscountAmount,
        referralCode: referralData.referralCode,
        customerId: customer.id,
        leadType: 'phone', // Manual creation = phone lead
      });
      
      // Increment customer booking count
      await storage.incrementCustomerBookings(customer.id);

      // Create referral record if referral code was used
      if (referralData.referralCode && referralData.referrerId && referralData.referralTier) {
        try {
          await storage.createReferral({
            referrerId: referralData.referrerId,
            referredCustomerId: customer.id,
            referralCode: referralData.referralCode,
            referredBookingId: booking.id,
            tier: referralData.referralTier,
            creditAmount: referralData.discountAmount || 0,
            status: 'pending',
          });
        } catch (referralError) {
          console.error("Failed to create referral record:", referralError);
        }
      }
      
      // Log activity
      await logActivity({
        context: getUserContext(req),
        action: 'created',
        entityType: 'booking',
        entityId: booking.id,
        entityName: `${booking.service} for ${booking.name}`,
      });
      
      res.status(201).json(booking);
    } catch (error) {
      console.error("Error creating manual booking:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid booking data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create booking" });
    }
  });

  app.get("/api/bookings", isAuthenticated, async (_req, res) => {
    try {
      const bookings = await storage.getBookings();
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  // Public endpoint for customers to view their bookings by email
  app.get("/api/bookings/customer/:email", async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      const email = req.params.email;
      if (!email || !email.includes("@")) {
        return res.status(400).json({ error: "Valid email required" });
      }
      const bookings = await storage.getBookingsByEmail(email);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching customer bookings:", error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  // Customer Portal: Dashboard data
  app.get("/api/customer/portal-dashboard/:email", async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      const email = req.params.email;
      if (!email || !email.includes("@")) {
        return res.status(400).json({ error: "Valid email required" });
      }
      
      const customer = await storage.getCustomerByEmail(email);
      const bookings = await storage.getBookingsByEmail(email);
      const upcomingBookings = bookings.filter(b => 
        new Date(b.date) >= new Date() && b.status !== 'cancelled'
      ).slice(0, 3);
      
      const completedBookings = bookings.filter(b => b.status === 'completed');
      const totalSpent = completedBookings.reduce((sum, b) => sum + (b.actualPrice || 0), 0);
      
      res.json({
        customer,
        stats: {
          totalBookings: bookings.length,
          completedBookings: completedBookings.length,
          upcomingBookings: upcomingBookings.length,
          totalSpent,
          loyaltyPoints: customer?.loyaltyPoints || 0,
          loyaltyTier: customer?.loyaltyTier || 'bronze',
          customerSince: customer?.createdAt,
        },
        upcomingBookings,
      });
    } catch (error) {
      console.error("Error fetching customer portal dashboard:", error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });

  // Customer Portal: Get customer invoices
  app.get("/api/customer/invoices/:email", async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      const email = req.params.email;
      if (!email || !email.includes("@")) {
        return res.status(400).json({ error: "Valid email required" });
      }
      
      const customer = await storage.getCustomerByEmail(email);
      if (!customer) {
        return res.json([]);
      }
      
      const invoices = await storage.getInvoicesByCustomerId(customer.id);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching customer invoices:", error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  // Customer Portal: Get customer recurring bookings
  app.get("/api/customer/recurring-bookings/:email", async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      const email = req.params.email;
      if (!email || !email.includes("@")) {
        return res.status(400).json({ error: "Valid email required" });
      }
      
      const recurringBookings = await storage.getRecurringBookingsByEmail(email);
      res.json(recurringBookings);
    } catch (error) {
      console.error("Error fetching customer recurring bookings:", error);
      res.status(500).json({ error: "Failed to fetch recurring bookings" });
    }
  });

  // Customer Portal: Update notification preferences
  app.patch("/api/customer/notification-preferences/:email", async (req, res) => {
    try {
      const email = req.params.email;
      if (!email || !email.includes("@")) {
        return res.status(400).json({ error: "Valid email required" });
      }
      
      const schema = z.object({
        emailNotifications: z.boolean().optional(),
        smsNotifications: z.boolean().optional(),
        reminderPreference: z.enum(['24h', '48h', '72h']).optional(),
      });
      
      const validatedData = schema.parse(req.body);
      const customer = await storage.updateCustomerByEmail(email, validatedData);
      
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      
      res.json(customer);
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });

  // Customer Portal: Update saved preferences
  app.patch("/api/customer/saved-preferences/:email", async (req, res) => {
    try {
      const email = req.params.email;
      if (!email || !email.includes("@")) {
        return res.status(400).json({ error: "Valid email required" });
      }
      
      const schema = z.object({
        savedAddresses: z.array(z.object({
          id: z.string(),
          label: z.string(),
          address: z.string(),
          isDefault: z.boolean(),
        })).optional(),
        specialRequests: z.array(z.string()).optional(),
        preferredEmployees: z.array(z.string()).optional(),
      });
      
      const validatedData = schema.parse(req.body);
      const customer = await storage.updateCustomerByEmail(email, validatedData);
      
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      
      res.json(customer);
    } catch (error) {
      console.error("Error updating saved preferences:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });

  // Customer Portal: Get customer reviews
  app.get("/api/customer/reviews/:email", async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      const email = req.params.email;
      if (!email || !email.includes("@")) {
        return res.status(400).json({ error: "Valid email required" });
      }
      
      const reviews = await storage.getReviewsByCustomerEmail(email);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching customer reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  // Customer Portal: Get customer messages/support history
  app.get("/api/customer/messages/:email", async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      const email = req.params.email;
      if (!email || !email.includes("@")) {
        return res.status(400).json({ error: "Valid email required" });
      }
      
      const messages = await storage.getMessagesByCustomerEmail(email);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching customer messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.get("/api/bookings/:id", isAuthenticated, async (req, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      console.error("Error fetching booking:", error);
      res.status(500).json({ error: "Failed to fetch booking" });
    }
  });

  app.patch("/api/bookings/:id/status", isAuthenticated, async (req, res) => {
    try {
      const validatedData = bookingStatusSchema.parse(req.body);
      
      // Get existing booking to check cancellation timing
      const existing = await storage.getBooking(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      // If cancelling, check if within 24 hours and set fee status
      let additionalData = {};
      if (validatedData.status === 'cancelled' && existing.status !== 'cancelled') {
        const appointmentDateTime = new Date(`${existing.date}T${convertTimeSlotTo24Hour(existing.timeSlot)}`);
        const now = new Date();
        const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        additionalData = {
          cancelledAt: new Date(),
          cancellationFeeStatus: hoursUntilAppointment < 24 ? 'pending' : 'not_applicable',
        };
      }
      
      const booking = await storage.updateBooking(req.params.id, { status: validatedData.status, ...additionalData });
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      // Send appropriate email based on status change (async, don't block response)
      (async () => {
        try {
          if (booking.status === 'confirmed') {
            // Send full confirmation email with management links
            await sendCustomerBookingConfirmation({
              bookingId: booking.id,
              managementToken: booking.managementToken,
              name: booking.name,
              email: booking.email,
              phone: booking.phone,
              address: booking.address,
              serviceType: booking.service,
              propertySize: booking.propertySize,
              date: booking.date,
              timeSlot: booking.timeSlot,
            });
            
            // Also send SMS confirmation
            await sendBookingConfirmationSMS(
              booking.phone,
              booking.name,
              booking.service,
              new Date(booking.date),
              booking.timeSlot
            );
          } else {
            // For other status changes, send simple status update email
            const { sendBookingStatusUpdateEmail } = await import("./email");
            await sendBookingStatusUpdateEmail(
              booking.email,
              booking.name,
              booking.status,
              {
                serviceType: booking.service,
                date: booking.date,
                timeSlot: booking.timeSlot,
                address: booking.address
              }
            );
          }
        } catch (emailError) {
          console.error("Failed to send booking status update email:", emailError);
        }
      })();
      
      res.json(booking);
    } catch (error) {
      console.error("Error updating booking status:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid status value", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update booking status" });
    }
  });

  app.patch("/api/bookings/:id/assign", isAuthenticated, async (req, res) => {
    try {
      const assignSchema = z.object({
        employeeIds: z.array(z.string()),
      });
      const { employeeIds } = assignSchema.parse(req.body);
      
      const booking = await storage.assignEmployeesToBooking(req.params.id, employeeIds);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      // Send notifications to assigned employees (async, don't block response)
      (async () => {
        try {
          for (const employeeId of employeeIds) {
            const employee = await storage.getEmployee(employeeId);
            if (employee && employee.email) {
              const { sendEmployeeAssignmentNotification } = await import("./email");
              await sendEmployeeAssignmentNotification({
                name: booking.name,
                email: booking.email,
                phone: booking.phone,
                address: booking.address,
                serviceType: booking.service,
                propertySize: booking.propertySize,
                date: booking.date,
                timeSlot: booking.timeSlot,
              }, employee.email, employee.name);
              
              // Send SMS notification if employee has phone number
              if (employee.phone) {
                await sendEmployeeAssignmentSMS(
                  employee.phone,
                  employee.name,
                  booking.name,
                  booking.service,
                  new Date(booking.date),
                  booking.timeSlot,
                  booking.address
                );
              }
            }
          }
        } catch (emailError) {
          console.error("Failed to send employee assignment notifications:", emailError);
        }
      })();

      res.json(booking);
    } catch (error) {
      console.error("Error assigning employees:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid assignment data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to assign employees" });
    }
  });

  // Update actual price and recalculate promo discount
  app.patch("/api/bookings/:id/actual-price", isAuthenticated, async (req, res) => {
    try {
      const actualPriceSchema = z.object({
        actualPrice: z.number().positive(),
      });
      const { actualPrice } = actualPriceSchema.parse(req.body);
      
      // Get existing booking to check for promo code
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      // Convert actual price to cents
      const actualPriceInCents = Math.round(actualPrice * 100);
      
      // Recalculate discount if promo code exists
      let discountAmount = booking.discountAmount || 0;
      if (booking.promoCode) {
        // Get the promo code to find discount type and value
        const promoCodes = await storage.getPromoCodes();
        const promoCode = promoCodes.find(p => p.code === booking.promoCode);
        
        if (promoCode) {
          // Recalculate discount based on actual price
          if (promoCode.discountType === 'percentage') {
            discountAmount = Math.round((actualPriceInCents * promoCode.discountValue) / 100);
          } else {
            // Fixed discount - keep same amount
            discountAmount = promoCode.discountValue;
          }
        }
      }
      
      // Update booking with actual price and recalculated discount
      const updatedBooking = await storage.updateBooking(req.params.id, {
        actualPrice: actualPriceInCents,
        discountAmount: discountAmount,
      });
      
      if (!updatedBooking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      res.json(updatedBooking);
    } catch (error) {
      console.error("Error updating actual price:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid actual price", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update actual price" });
    }
  });

  // Remove promo code from booking
  app.delete("/api/bookings/:id/promo-code", isAuthenticated, async (req, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      // Remove promo code, discount amount, and actual price
      const updatedBooking = await storage.updateBooking(req.params.id, {
        promoCode: null,
        discountAmount: 0,
        actualPrice: null,
      });
      
      if (!updatedBooking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      res.json(updatedBooking);
    } catch (error) {
      console.error("Error removing promo code:", error);
      res.status(500).json({ error: "Failed to remove promo code" });
    }
  });

  // Replace/update promo code on booking
  app.patch("/api/bookings/:id/promo-code", isAuthenticated, async (req, res) => {
    try {
      const { promoCode } = req.body;
      
      if (!promoCode || typeof promoCode !== "string") {
        return res.status(400).json({ error: "Valid promo code is required" });
      }

      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      // Find and validate the new promo code
      const promo = await storage.getPromoCodeByCode(promoCode);
      if (!promo) {
        return res.status(404).json({ error: "Promo code not found" });
      }

      if (promo.status !== "active") {
        return res.status(400).json({ error: "Promo code is not active" });
      }

      // Check if promo code has reached max uses
      if (promo.maxUses !== null && promo.currentUses >= promo.maxUses) {
        return res.status(400).json({ error: "Promo code has reached maximum uses" });
      }

      // Check if promo code is valid for current date
      const now = new Date();
      if (now < new Date(promo.validFrom) || now > new Date(promo.validTo)) {
        return res.status(400).json({ error: "Promo code is not valid for current date" });
      }

      // Calculate discount amount only if actual price is set
      // If no actual price, discount will be calculated when actual price is set
      let discountAmount = 0;
      if (booking.actualPrice) {
        // Note: booking.actualPrice is stored in cents in the database
        // This calculation pattern matches the actual-price endpoint (line 512)
        if (promo.discountType === "percentage") {
          // Calculate percentage discount on price in cents
          discountAmount = Math.round((booking.actualPrice * promo.discountValue) / 100);
        } else {
          // Fixed discount value is already in cents
          discountAmount = promo.discountValue;
        }
        // Ensure discount doesn't exceed actual price
        discountAmount = Math.min(discountAmount, booking.actualPrice);
      }

      // Update the booking with new promo code and discount
      const updatedBooking = await storage.updateBooking(req.params.id, {
        promoCode: promo.code,
        discountAmount,
      });

      if (!updatedBooking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      res.json(updatedBooking);
    } catch (error) {
      console.error("Error replacing promo code:", error);
      res.status(500).json({ error: "Failed to replace promo code" });
    }
  });

  // Public booking management (using token, no auth required)
  app.get("/api/bookings/manage/:token", async (req, res) => {
    try {
      const { token } = req.params;
      if (!token) {
        return res.status(401).json({ error: "Token required" });
      }
      
      const booking = await storage.getBookingByManagementToken(token);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found or invalid token" });
      }
      
      res.json(booking);
    } catch (error) {
      console.error("Error fetching booking:", error);
      res.status(500).json({ error: "Failed to fetch booking" });
    }
  });

  app.patch("/api/bookings/manage/:token", async (req, res) => {
    try {
      const { token } = req.params;
      if (!token) {
        return res.status(401).json({ error: "Token required" });
      }
      
      // Verify token first
      const existing = await storage.getBookingByManagementToken(token);
      if (!existing) {
        return res.status(404).json({ error: "Booking not found or invalid token" });
      }
      
      const updateSchema = z.object({
        date: z.string().optional(),
        timeSlot: z.string().optional(),
        customerNotes: z.string().optional(),
        status: z.enum(["pending", "cancelled"]).optional(),
      });
      
      const validatedData = updateSchema.parse(req.body);
      
      // Handle CANCELLATION
      if (validatedData.status === 'cancelled') {
        const appointmentDateTime = new Date(`${existing.date}T${convertTimeSlotTo24Hour(existing.timeSlot)}`);
        const now = new Date();
        const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        const additionalData = {
          cancelledAt: new Date(),
          cancellationFeeStatus: hoursUntilAppointment < 24 ? 'pending' : 'not_applicable',
        };
        
        const booking = await storage.updateBooking(existing.id, { status: 'cancelled', ...additionalData });
        
        // Notify business owner of cancellation
        (async () => {
          try {
            const settings = await storage.getBusinessSettings();
            if (settings && booking) {
              await sendBookingChangeNotification({
                name: booking.name,
                email: booking.email,
                phone: booking.phone,
                address: booking.address,
                serviceType: booking.service,
                propertySize: booking.propertySize,
                date: booking.date,
                timeSlot: booking.timeSlot,
                action: 'cancelled',
                originalDate: existing.date,
                originalTimeSlot: existing.timeSlot,
              }, settings.email);
            }
          } catch (emailError) {
            console.error("Failed to send booking change notification:", emailError);
          }
        })();
        
        return res.json(booking);
      }
      
      // Handle RESCHEDULE REQUEST
      if (validatedData.date && validatedData.timeSlot) {
        const settings = await storage.getBusinessSettings();
        const minLeadHours = settings?.minLeadHours || 12;
        const maxBookingsPerSlot = settings?.maxBookingsPerSlot || 3;
        
        // Validate not in past
        const pastCheck = validateNotPastDate(validatedData.date, validatedData.timeSlot);
        if (!pastCheck.isValid) {
          return res.status(400).json({ error: pastCheck.error });
        }
        
        // Validate minimum lead time
        const leadTimeCheck = validateMinimumLeadTime(validatedData.date, validatedData.timeSlot, minLeadHours);
        if (!leadTimeCheck.isValid) {
          return res.status(400).json({ error: leadTimeCheck.error });
        }
        
        // Check slot capacity (exclude current booking)
        const capacityCheck = await checkSlotCapacity(pool, validatedData.date, validatedData.timeSlot, maxBookingsPerSlot, existing.id);
        if (!capacityCheck.isAvailable) {
          return res.status(400).json({ error: capacityCheck.error });
        }
        
        // Create reschedule request
        const rescheduleRequest = await storage.createRescheduleRequest({
          bookingId: existing.id,
          requestedDate: validatedData.date,
          requestedTimeSlot: validatedData.timeSlot,
          customerNotes: validatedData.customerNotes || null,
          status: 'pending',
        });
        
        // Update booking status to pending_reschedule
        await storage.updateBookingStatus(existing.id, 'pending_reschedule');
        
        // Send email notifications (async, don't wait)
        (async () => {
          try {
            const { sendRescheduleRequestSubmittedEmail } = await import("./email");
            await sendRescheduleRequestSubmittedEmail({
              customerEmail: existing.email,
              customerName: existing.name,
              serviceType: existing.service,
              originalDate: existing.date,
              originalTimeSlot: existing.timeSlot,
              requestedDate: validatedData.date!,
              requestedTimeSlot: validatedData.timeSlot!,
              address: existing.address,
            });
          } catch (emailError) {
            console.error("Failed to send reschedule notification:", emailError);
          }
        })();
        
        return res.json({ 
          message: "Reschedule request submitted successfully. You'll receive an email once it's reviewed.",
          rescheduleRequest 
        });
      }
      
      // If neither cancellation nor reschedule, return error
      return res.status(400).json({ error: "Invalid request. Provide either status=cancelled or date+timeSlot" });
      
    } catch (error) {
      console.error("Error updating booking:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid booking data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update booking" });
    }
  });
  
  // Helper function to convert time slot to 24-hour format
  function convertTimeSlotTo24Hour(timeSlot: string): string {
    const match = timeSlot.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return "12:00";
    
    let hours = parseInt(match[1]);
    const minutes = match[2];
    const period = match[3].toUpperCase();
    
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }

  // Public endpoint to get available slots for a specific date
  app.get("/api/available-slots", async (req, res) => {
    try {
      const { date } = req.query;
      
      // Validate required date parameter
      if (!date || typeof date !== 'string') {
        return res.status(400).json({ error: "Date parameter is required" });
      }
      
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return res.status(400).json({ error: "Invalid date format. Expected YYYY-MM-DD" });
      }
      
      // Fetch business settings to get maxBookingsPerSlot
      const settings = await storage.getBusinessSettings();
      const maxBookingsPerSlot = settings?.maxBookingsPerSlot || 3; // Default to 3 if not set
      
      // Define all possible time slots
      const allTimeSlots = [
        "9:00 AM - 11:00 AM",
        "11:00 AM - 1:00 PM",
        "1:00 PM - 3:00 PM",
        "3:00 PM - 5:00 PM"
      ];
      
      // Get available slots using the bookingValidation function
      const slots = await getAvailableSlots(
        pool,
        date,
        maxBookingsPerSlot,
        allTimeSlots
      );
      
      // Transform response to match frontend expectations
      const transformedSlots = slots.map(s => ({
        timeSlot: s.slot,
        available: s.available,
        capacity: s.total
      }));
      
      res.json({ slots: transformedSlots });
    } catch (error) {
      console.error("Error fetching available slots:", error);
      res.status(500).json({ error: "Failed to fetch available slots" });
    }
  });

  // Quote routes (public submissions, protected admin actions)
  app.post("/api/quotes", async (req, res) => {
    try {
      // Extract photos from request (optional)
      const { photos, ...quoteData } = req.body;
      
      const validatedData = insertQuoteSchema.parse(quoteData);
      
      // Validate photos if provided
      const maxPhotoSize = 5 * 1024 * 1024; // 5MB per photo
      const maxPhotos = 5;
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
      
      if (photos && Array.isArray(photos)) {
        if (photos.length > maxPhotos) {
          return res.status(400).json({ 
            error: "Too many photos", 
            details: `Maximum ${maxPhotos} photos allowed` 
          });
        }
        
        for (const photo of photos) {
          if (!photo.photoData || !photo.mimeType) {
            return res.status(400).json({ 
              error: "Invalid photo data", 
              details: "Each photo must have photoData and mimeType" 
            });
          }
          
          if (!allowedMimeTypes.includes(photo.mimeType)) {
            return res.status(400).json({ 
              error: "Invalid photo type", 
              details: `Allowed types: ${allowedMimeTypes.join(', ')}` 
            });
          }
          
          if (photo.photoData.length > maxPhotoSize) {
            return res.status(400).json({ 
              error: "Photo too large", 
              details: "Each photo must be less than 5MB" 
            });
          }
        }
      }
      
      // Get business settings for deduplication
      const settings = await storage.getBusinessSettings();
      
      // Customer deduplication logic
      let customer;
      
      if (settings?.customerDedupEnabled) {
        const match = await findMatchingCustomer(
          pool,
          validatedData.email,
          validatedData.phone,
          validatedData.address
        );
        
        if (match.matchFound && match.customerId) {
          customer = await storage.getCustomer(match.customerId);
          
          // Create merge alert if enabled and high/medium confidence
          if (settings.customerMergeAlertEnabled && match.confidence !== 'low') {
            // Note: quoteId will be updated after quote creation
            await createMergeAlert(
              pool,
              match.matchType || 'email',
              match.matchedFields || [],
              match.customerId,
              { 
                name: validatedData.name, 
                email: validatedData.email, 
                phone: validatedData.phone, 
                address: validatedData.address 
              },
              'quote',
              '', // Will be filled with quote ID after creation
              match.confidence
            );
          }
        }
      }
      
      // If no match found or deduplication disabled, find or create customer
      if (!customer) {
        customer = await storage.findOrCreateCustomer(
          validatedData.name,
          validatedData.email,
          validatedData.phone,
          validatedData.address
        );
      }
      
      // Create quote with customer link
      const quote = await storage.createQuote({
        ...validatedData,
        customerId: customer.id,
      });
      
      // Create quote photos if provided
      if (photos && Array.isArray(photos) && photos.length > 0) {
        for (const photo of photos) {
          await storage.createQuotePhoto({
            quoteId: quote.id,
            photoData: photo.photoData,
            mimeType: photo.mimeType,
            originalName: photo.originalName || null,
          });
        }
      }
      
      // Increment customer quote count
      await storage.incrementCustomerQuotes(customer.id);
      
      // Send email notifications (async, don't block response)
      (async () => {
        try {
          const settings = await storage.getBusinessSettings();
          if (settings) {
            // Send notification to business owner
            await sendQuoteNotification({
              name: quote.name,
              email: quote.email,
              phone: quote.phone,
              address: quote.address,
              serviceType: quote.serviceType,
              propertySize: quote.propertySize,
              customSize: quote.customSize || undefined,
              details: quote.details,
            }, settings.email);
            
            // Send confirmation to customer
            await sendCustomerQuoteConfirmation({
              name: quote.name,
              email: quote.email,
              phone: quote.phone,
              address: quote.address,
              serviceType: quote.serviceType,
              propertySize: quote.propertySize,
              customSize: quote.customSize || undefined,
              details: quote.details,
            });
          }
        } catch (emailError) {
          console.error("Failed to send quote emails:", emailError);
        }
      })();
      
      res.status(201).json(quote);
    } catch (error) {
      console.error("Error creating quote:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      console.error("Error message:", error instanceof Error ? error.message : String(error));
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid quote data", details: error.errors });
      }
      
      // Return more details in development/testing
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        error: "Failed to create quote",
        details: errorMessage,
        hasPhotos: !!req.body.photos
      });
    }
  });

  app.get("/api/quotes", isAuthenticated, async (_req, res) => {
    try {
      const quotes = await storage.getQuotes();
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ error: "Failed to fetch quotes" });
    }
  });

  app.get("/api/quotes/:id", isAuthenticated, async (req, res) => {
    try {
      const quote = await storage.getQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      res.json(quote);
    } catch (error) {
      console.error("Error fetching quote:", error);
      res.status(500).json({ error: "Failed to fetch quote" });
    }
  });

  app.get("/api/quotes/:id/photos", isAuthenticated, async (req, res) => {
    try {
      const quote = await storage.getQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      const photos = await storage.getQuotePhotosByQuote(req.params.id);
      res.json(photos);
    } catch (error) {
      console.error("Error fetching quote photos:", error);
      res.status(500).json({ error: "Failed to fetch quote photos" });
    }
  });

  app.patch("/api/quotes/:id/status", isAuthenticated, async (req, res) => {
    try {
      // Extended schema for quote approval with booking details
      const quoteApprovalSchema = z.object({
        status: z.enum(["pending", "approved", "rejected", "completed"]),
        date: z.string().optional(),
        timeSlot: z.string().optional(),
      });
      
      const validatedData = quoteApprovalSchema.parse(req.body);
      
      // Get the quote first
      const quote = await storage.getQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      
      // If approving the quote, convert it to a booking
      if (validatedData.status === "approved") {
        // Require date and timeSlot for approval
        if (!validatedData.date || !validatedData.timeSlot) {
          return res.status(400).json({ 
            error: "Date and time slot are required when approving a quote" 
          });
        }
        
        // Fetch business settings for validation and status determination
        const settings = await storage.getBusinessSettings();
        const minLeadHours = settings?.minLeadHours || 12;
        const maxBookingsPerSlot = settings?.maxBookingsPerSlot || 3;
        
        // Validate booking is not in the past
        const pastDateCheck = validateNotPastDate(validatedData.date, validatedData.timeSlot);
        if (!pastDateCheck.isValid) {
          return res.status(400).json({ error: pastDateCheck.error });
        }
        
        // Validate minimum lead time
        const leadTimeCheck = validateMinimumLeadTime(validatedData.date, validatedData.timeSlot, minLeadHours);
        if (!leadTimeCheck.isValid) {
          return res.status(400).json({ error: leadTimeCheck.error });
        }
        
        // Check slot capacity
        const capacityCheck = await checkSlotCapacity(pool, validatedData.date, validatedData.timeSlot, maxBookingsPerSlot);
        if (!capacityCheck.isAvailable) {
          return res.status(400).json({ error: capacityCheck.error });
        }
        
        // Handle customer linking
        let customer;
        
        // 1. If quote has customerId, use it
        if (quote.customerId) {
          customer = await storage.getCustomer(quote.customerId);
        }
        
        // 2. If no customerId or customer not found, apply deduplication if enabled
        if (!customer && settings?.customerDedupEnabled) {
          const match = await findMatchingCustomer(
            pool,
            quote.email,
            quote.phone,
            quote.address
          );
          
          if (match.matchFound && match.customerId) {
            customer = await storage.getCustomer(match.customerId);
            
            // Create merge alert if enabled and high/medium confidence
            if (settings.customerMergeAlertEnabled && match.confidence !== 'low') {
              await createMergeAlert(
                pool,
                match.matchType || 'email',
                match.matchedFields || [],
                match.customerId,
                { 
                  name: quote.name, 
                  email: quote.email, 
                  phone: quote.phone, 
                  address: quote.address 
                },
                'quote',
                quote.id,
                match.confidence
              );
            }
          }
        }
        
        // 3. If still no customer, find or create one
        if (!customer) {
          customer = await storage.findOrCreateCustomer(
            quote.name,
            quote.email,
            quote.phone,
            quote.address
          );
        }
        
        // Determine booking status based on requireBookingApproval setting
        const bookingStatus = settings?.requireBookingApproval ? "pending" : "confirmed";
        
        // Create booking from quote
        const booking = await storage.createBooking({
          customerId: customer.id,
          leadType: 'quote', // This came from a quote
          service: quote.serviceType,
          propertySize: quote.propertySize,
          date: validatedData.date,
          timeSlot: validatedData.timeSlot,
          name: quote.name,
          email: quote.email,
          phone: quote.phone,
          address: quote.address,
          status: bookingStatus,
        });
        
        // Increment customer booking count
        await storage.incrementCustomerBookings(customer.id);
        
        // Update quote status to approved
        const updatedQuote = await storage.updateQuoteStatus(req.params.id, "approved");
        
        // Send confirmation email to customer (async, don't block response)
        (async () => {
          try {
            if (bookingStatus === "confirmed") {
              await sendCustomerBookingConfirmation({
                bookingId: booking.id,
                managementToken: booking.managementToken,
                name: booking.name,
                email: booking.email,
                phone: booking.phone,
                address: booking.address,
                serviceType: booking.service,
                propertySize: booking.propertySize,
                date: booking.date,
                timeSlot: booking.timeSlot,
              });
            } else {
              // Send "under review" email
              await sendBookingUnderReviewEmail({
                bookingId: booking.id,
                managementToken: booking.managementToken,
                name: booking.name,
                email: booking.email,
                phone: booking.phone,
                address: booking.address,
                serviceType: booking.service,
                propertySize: booking.propertySize,
                date: booking.date,
                timeSlot: booking.timeSlot,
              });
            }
          } catch (emailError) {
            console.error("Failed to send booking confirmation email:", emailError);
          }
        })();
        
        return res.json({ 
          quote: updatedQuote, 
          booking,
          message: `Quote approved and converted to ${bookingStatus} booking` 
        });
      }
      
      // For non-approval status updates, just update the quote status
      const updatedQuote = await storage.updateQuoteStatus(req.params.id, validatedData.status);
      res.json(updatedQuote);
    } catch (error) {
      console.error("Error updating quote status:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update quote status" });
    }
  });

  // Service routes (public - returns active services only)
  app.get("/api/services", async (_req, res) => {
    try {
      const services = await storage.getActiveServices();
      res.json(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  // Admin endpoint to get all services (including inactive)
  app.get("/api/admin/services", isAuthenticated, async (_req, res) => {
    try {
      const services = await storage.getServices();
      res.json(services);
    } catch (error) {
      console.error("Error fetching all services:", error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  app.post("/api/services", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertServiceSchema.parse(req.body);
      const service = await storage.createService(validatedData);
      res.status(201).json(service);
    } catch (error) {
      console.error("Error creating service:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid service data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create service" });
    }
  });

  app.get("/api/services/:id", async (req, res) => {
    try {
      const service = await storage.getService(req.params.id);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      console.error("Error fetching service:", error);
      res.status(500).json({ error: "Failed to fetch service" });
    }
  });

  app.patch("/api/services/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertServiceSchema.partial().parse(req.body);
      const service = await storage.updateService(req.params.id, validatedData);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      console.error("Error updating service:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid service data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update service" });
    }
  });

  app.delete("/api/services/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteService(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ error: "Failed to delete service" });
    }
  });

  // Business Settings routes
  app.get("/api/settings", async (_req, res) => {
    try {
      const settings = await storage.getBusinessSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertBusinessSettingsSchema.parse(req.body);
      const settings = await storage.upsertBusinessSettings(validatedData);
      res.json(settings);
    } catch (error) {
      console.error("Error upserting settings:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid settings data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  // FAQ routes (public - returns active FAQ items only)
  app.get("/api/faq", async (_req, res) => {
    try {
      const faqItems = await storage.getActiveFaqItems();
      res.json(faqItems);
    } catch (error) {
      console.error("Error fetching FAQ items:", error);
      res.status(500).json({ error: "Failed to fetch FAQ items" });
    }
  });

  // Admin endpoint to get all FAQ items (including inactive)
  app.get("/api/admin/faq", isAuthenticated, async (_req, res) => {
    try {
      const faqItems = await storage.getFaqItems();
      res.json(faqItems);
    } catch (error) {
      console.error("Error fetching all FAQ items:", error);
      res.status(500).json({ error: "Failed to fetch FAQ items" });
    }
  });

  app.post("/api/faq", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertFaqItemSchema.parse(req.body);
      const faqItem = await storage.createFaqItem(validatedData);
      res.status(201).json(faqItem);
    } catch (error) {
      console.error("Error creating FAQ item:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid FAQ data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create FAQ item" });
    }
  });

  app.get("/api/faq/:id", async (req, res) => {
    try {
      const faqItem = await storage.getFaqItem(req.params.id);
      if (!faqItem) {
        return res.status(404).json({ error: "FAQ item not found" });
      }
      res.json(faqItem);
    } catch (error) {
      console.error("Error fetching FAQ item:", error);
      res.status(500).json({ error: "Failed to fetch FAQ item" });
    }
  });

  app.patch("/api/faq/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertFaqItemSchema.partial().parse(req.body);
      const faqItem = await storage.updateFaqItem(req.params.id, validatedData);
      if (!faqItem) {
        return res.status(404).json({ error: "FAQ item not found" });
      }
      res.json(faqItem);
    } catch (error) {
      console.error("Error updating FAQ item:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid FAQ data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update FAQ item" });
    }
  });

  app.delete("/api/faq/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteFaqItem(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting FAQ item:", error);
      res.status(500).json({ error: "Failed to delete FAQ item" });
    }
  });

  // Gallery routes (public - returns active gallery images only)
  app.get("/api/gallery", async (_req, res) => {
    try {
      const galleryImages = await storage.getActiveGalleryImages();
      res.json(galleryImages);
    } catch (error) {
      console.error("Error fetching gallery images:", error);
      res.status(500).json({ error: "Failed to fetch gallery images" });
    }
  });

  // Admin endpoint to get all gallery images (including inactive)
  app.get("/api/admin/gallery", isAuthenticated, async (_req, res) => {
    try {
      const galleryImages = await storage.getGalleryImages();
      res.json(galleryImages);
    } catch (error) {
      console.error("Error fetching all gallery images:", error);
      res.status(500).json({ error: "Failed to fetch gallery images" });
    }
  });

  app.post("/api/gallery", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertGalleryImageSchema.parse(req.body);
      const galleryImage = await storage.createGalleryImage(validatedData);
      res.status(201).json(galleryImage);
    } catch (error) {
      console.error("Error creating gallery image:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid gallery image data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create gallery image" });
    }
  });

  app.get("/api/gallery/:id", async (req, res) => {
    try {
      const galleryImage = await storage.getGalleryImage(req.params.id);
      if (!galleryImage) {
        return res.status(404).json({ error: "Gallery image not found" });
      }
      res.json(galleryImage);
    } catch (error) {
      console.error("Error fetching gallery image:", error);
      res.status(500).json({ error: "Failed to fetch gallery image" });
    }
  });

  app.patch("/api/gallery/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertGalleryImageSchema.partial().parse(req.body);
      const galleryImage = await storage.updateGalleryImage(req.params.id, validatedData);
      if (!galleryImage) {
        return res.status(404).json({ error: "Gallery image not found" });
      }
      res.json(galleryImage);
    } catch (error) {
      console.error("Error updating gallery image:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid gallery image data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update gallery image" });
    }
  });

  app.delete("/api/gallery/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteGalleryImage(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting gallery image:", error);
      res.status(500).json({ error: "Failed to delete gallery image" });
    }
  });

  // Invoice routes (all protected)
  app.get("/api/invoices", isAuthenticated, async (_req, res) => {
    try {
      const invoices = await storage.getInvoices();
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.post("/api/invoices", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertInvoiceSchema.parse(req.body);
      
      // Validate discount doesn't exceed amount
      if (validatedData.discountAmount && validatedData.discountAmount > validatedData.amount) {
        return res.status(400).json({ error: "Discount cannot exceed the invoice amount" });
      }
      
      const invoice = await storage.createInvoice(validatedData);
      
      // Send payment link notifications if status is "sent" (async, don't block response)
      if (invoice.status === "sent") {
        (async () => {
          try {
            // Fetch booking and service data for promo code breakdown
            let breakdown;
            if (invoice.bookingId) {
              const booking = await storage.getBooking(invoice.bookingId);
              if (booking?.promoCode) {
                // Use actualPrice if set, otherwise fall back to service basePrice
                let basePrice = booking.actualPrice;
                if (!basePrice) {
                  const services = await storage.getServices();
                  const service = services.find(s => s.name.toLowerCase().includes(booking.service.toLowerCase()));
                  basePrice = service?.basePrice || 0;
                }
                
                breakdown = {
                  basePrice: basePrice,
                  promoCode: booking.promoCode,
                  discountAmount: booking.discountAmount || 0,
                  subtotal: invoice.amount,
                  tax: invoice.tax,
                };
              }
            }
            
            // Send email payment link (total is in cents in DB, email formatter expects dollars)
            const { sendInvoicePaymentLinkEmail } = await import("./email");
            await sendInvoicePaymentLinkEmail(
              invoice.customerEmail,
              invoice.customerName,
              invoice.invoiceNumber,
              invoice.id,
              invoice.total / 100, // Convert cents to dollars for display
              breakdown
            );
            
            // Also send SMS if available (currently blocked on trial)
            await sendInvoicePaymentLinkSMS(
              invoice.customerPhone,
              invoice.customerName,
              invoice.invoiceNumber,
              invoice.id,
              invoice.total
            );
          } catch (notificationError) {
            console.error("Failed to send invoice payment notifications:", notificationError);
          }
        })();
      }
      
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid invoice data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });

  // Public endpoint for customers to view invoices (no auth required for payment)
  app.get("/api/invoices/:id/public", async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ error: "Failed to fetch invoice" });
    }
  });

  // Admin endpoint for viewing invoices (requires authentication)
  app.get("/api/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ error: "Failed to fetch invoice" });
    }
  });

  app.patch("/api/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertInvoiceSchema.partial().parse(req.body);
      
      // Fetch existing invoice to validate merged data
      const existingInvoice = await storage.getInvoice(req.params.id);
      if (!existingInvoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      
      // Merge existing data with updates
      const mergedAmount = validatedData.amount !== undefined ? validatedData.amount : existingInvoice.amount;
      const mergedDiscount = validatedData.discountAmount !== undefined ? validatedData.discountAmount : existingInvoice.discountAmount;
      
      // Validate discount doesn't exceed amount in merged result
      if (mergedDiscount !== null && mergedDiscount > mergedAmount) {
        return res.status(400).json({ error: "Discount cannot exceed the invoice amount" });
      }
      
      const invoice = await storage.updateInvoice(req.params.id, validatedData);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      console.error("Error updating invoice:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid invoice data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update invoice" });
    }
  });

  app.delete("/api/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteInvoice(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ error: "Failed to delete invoice" });
    }
  });

  // Employee routes (all protected)
  app.get("/api/employees", isAuthenticated, async (_req, res) => {
    try {
      const employees = await storage.getEmployees();
      res.json(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  app.post("/api/employees", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertEmployeeSchema.parse(req.body);
      
      // Hash password if provided
      if (validatedData.password) {
        validatedData.password = await hashPassword(validatedData.password);
      }
      
      const employee = await storage.createEmployee(validatedData);
      res.status(201).json(employee);
    } catch (error) {
      console.error("Error creating employee:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid employee data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create employee" });
    }
  });

  app.get("/api/employees/:id", isAuthenticated, async (req, res) => {
    try {
      const employee = await storage.getEmployee(req.params.id);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      console.error("Error fetching employee:", error);
      res.status(500).json({ error: "Failed to fetch employee" });
    }
  });

  app.patch("/api/employees/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertEmployeeSchema.partial().parse(req.body);
      
      // Hash password if provided
      if (validatedData.password) {
        validatedData.password = await hashPassword(validatedData.password);
      }
      
      const employee = await storage.updateEmployee(req.params.id, validatedData);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      console.error("Error updating employee:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid employee data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update employee" });
    }
  });

  app.delete("/api/employees/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteEmployee(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting employee:", error);
      res.status(500).json({ error: "Failed to delete employee" });
    }
  });

  // Employee permission routes
  app.get("/api/employees/:id/permissions", isAuthenticated, async (req, res) => {
    try {
      const permissions = await storage.getEmployeePermissions(req.params.id);
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching employee permissions:", error);
      res.status(500).json({ error: "Failed to fetch permissions" });
    }
  });

  app.put("/api/employees/:id/permissions", isAuthenticated, async (req, res) => {
    try {
      const { permissions } = req.body;
      
      if (!Array.isArray(permissions)) {
        return res.status(400).json({ error: "Permissions must be an array" });
      }

      // Validate permission structure
      for (const perm of permissions) {
        if (!perm.feature || !Array.isArray(perm.actions)) {
          return res.status(400).json({ error: "Invalid permission structure" });
        }
      }

      await storage.setEmployeePermissions(req.params.id, permissions);
      
      // Fetch and return updated permissions
      const updated = await storage.getEmployeePermissions(req.params.id);
      res.json(updated);
    } catch (error) {
      console.error("Error updating employee permissions:", error);
      res.status(500).json({ error: "Failed to update permissions" });
    }
  });

  app.get("/api/permission-templates", isAuthenticated, async (_req, res) => {
    try {
      const { DEFAULT_TEMPLATES } = await import("@shared/permissions");
      res.json(DEFAULT_TEMPLATES);
    } catch (error) {
      console.error("Error fetching permission templates:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  // Send bulk email to employees
  app.post("/api/employees/send-email", isAuthenticated, async (req, res) => {
    try {
      const { employeeIds, subject, message } = req.body;
      
      if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
        return res.status(400).json({ error: "Employee IDs must be a non-empty array" });
      }
      
      if (!subject || !message) {
        return res.status(400).json({ error: "Subject and message are required" });
      }

      const employees = await storage.getEmployees();
      const selectedEmployees = employees.filter(e => employeeIds.includes(e.id));

      if (selectedEmployees.length === 0) {
        return res.status(404).json({ error: "No employees found" });
      }

      // Filter employees with valid email addresses
      const employeesWithEmail = selectedEmployees.filter(e => e.email && e.email.trim() !== '');
      const employeesWithoutEmail = selectedEmployees.filter(e => !e.email || e.email.trim() === '');

      if (employeesWithoutEmail.length > 0) {
        console.warn(`Skipping ${employeesWithoutEmail.length} employee(s) without email addresses:`, 
          employeesWithoutEmail.map(e => e.name).join(', '));
      }

      if (employeesWithEmail.length === 0) {
        return res.status(400).json({ error: "None of the selected employees have email addresses" });
      }

      // Send emails to each employee
      const emailPromises = employeesWithEmail.map(async (employee) => {
        try {
          await resend.emails.send({
            from: 'Clean & Green <noreply@voryn.store>',
            to: employee.email,
            subject: subject,
            html: `
              <h2>Message from Clean & Green Management</h2>
              <p>Hi ${escapeHtml(employee.name)},</p>
              <div style="white-space: pre-wrap;">${escapeHtml(message)}</div>
              <br>
              <p>Best regards,<br>Clean & Green Team</p>
            `,
          });
        } catch (error) {
          console.error(`Failed to send email to ${employee.email}:`, error);
        }
      });

      await Promise.all(emailPromises);

      // Log activity
      await logActivity({
        context: getUserContext(req),
        action: 'sent_bulk_email',
        entityType: 'employee',
        details: `Sent email to ${employeesWithEmail.length} employee(s). Subject: "${subject}"`,
      });

      res.json({ 
        success: true, 
        sent: employeesWithEmail.length,
        skipped: employeesWithoutEmail.length
      });
    } catch (error) {
      console.error("Error sending emails to employees:", error);
      res.status(500).json({ error: "Failed to send emails" });
    }
  });

  // Employee authentication routes
  app.post("/api/employee/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const employee = await storage.getEmployeeByEmail(email);
      
      if (!employee || !employee.password) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      if (!employee.active) {
        return res.status(401).json({ error: "Account is inactive" });
      }

      const bcrypt = await import("bcryptjs");
      const isValid = await bcrypt.default.compare(password, employee.password);
      
      if (!isValid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const { password: _, ...employeeWithoutPassword } = employee;
      (req.session as any).employee = employeeWithoutPassword;
      
      res.json({ success: true, employee: employeeWithoutPassword });
    } catch (error) {
      console.error("Employee login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/employee/logout", (req, res) => {
    if ((req.session as any).employee) {
      delete (req.session as any).employee;
    }
    res.json({ success: true });
  });

  app.get("/api/employee/auth/user", (req, res) => {
    if (!(req.session as any).employee) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json((req.session as any).employee);
  });

  // Employee permissions - get current employee's permissions
  app.get("/api/employee/permissions", async (req, res) => {
    try {
      const employee = (req.session as any).employee;
      if (!employee) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const permissions = await storage.getEmployeePermissions(employee.id);
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching employee permissions:", error);
      res.status(500).json({ error: "Failed to fetch permissions" });
    }
  });

  // Employee bookings - get assignments for logged in employee
  app.get("/api/employee/bookings", async (req, res) => {
    try {
      const employee = (req.session as any).employee;
      if (!employee) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const allBookings = await storage.getBookings();
      const employeeBookings = allBookings.filter(
        booking => booking.assignedEmployeeIds && booking.assignedEmployeeIds.includes(employee.id)
      );
      
      res.json(employeeBookings);
    } catch (error) {
      console.error("Error fetching employee bookings:", error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  // Employee - get all bookings (permission-gated)
  app.get("/api/employee/all-bookings", async (req, res) => {
    try {
      const employee = (req.session as any).employee;
      if (!employee) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Check if employee has permission to view bookings
      const permissions = await storage.getEmployeePermissions(employee.id);
      const hasPermission = permissions.some(p => p.feature === "bookings" && p.actions.includes("view"));
      
      if (!hasPermission) {
        return res.status(403).json({ error: "No permission to view bookings" });
      }

      const bookings = await storage.getBookings();
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching all bookings:", error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  // Employee - update booking status with activity logging
  app.patch("/api/employee/bookings/:id/status", async (req, res) => {
    try {
      const employee = (req.session as any).employee;
      if (!employee) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Check if employee has permission to edit bookings
      const permissions = await storage.getEmployeePermissions(employee.id);
      const hasPermission = permissions.some(p => p.feature === "bookings" && p.actions.includes("edit"));
      
      if (!hasPermission) {
        return res.status(403).json({ error: "No permission to edit bookings" });
      }

      // Validate status
      const bookingStatusSchema = z.object({
        status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
      });
      const validatedData = bookingStatusSchema.parse(req.body);

      const { status } = validatedData;
      const bookingBefore = await storage.getBooking(req.params.id);
      
      if (!bookingBefore) {
        return res.status(404).json({ error: "Booking not found" });
      }

      const updatedBooking = await storage.updateBooking(req.params.id, { status });

      // Log activity
      await logActivity({
        context: getUserContext(req),
        action: "updated",
        entityType: "booking",
        entityId: req.params.id,
        entityName: `${bookingBefore.service} - ${bookingBefore.name}`,
        changes: {
          before: { status: bookingBefore.status },
          after: { status },
        },
      });

      res.json(updatedBooking);
    } catch (error) {
      console.error("Error updating booking status:", error);
      res.status(500).json({ error: "Failed to update booking status" });
    }
  });

  // Employee - delete booking with activity logging
  app.delete("/api/employee/bookings/:id", async (req, res) => {
    try {
      const employee = (req.session as any).employee;
      if (!employee) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Check if employee has permission to delete bookings
      const permissions = await storage.getEmployeePermissions(employee.id);
      const hasPermission = permissions.some(p => p.feature === "bookings" && p.actions.includes("delete"));
      
      if (!hasPermission) {
        return res.status(403).json({ error: "No permission to delete bookings" });
      }

      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      // Decrement customer booking count
      if (booking.email) {
        const customer = await storage.getCustomerByEmail(booking.email);
        if (customer) {
          await storage.decrementCustomerBookings(customer.id);
        }
      }

      await storage.deleteBooking(req.params.id);

      // Log activity
      await logActivity({
        context: getUserContext(req),
        action: "deleted",
        entityType: "booking",
        entityId: req.params.id,
        entityName: `${booking.service} - ${booking.name}`,
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting booking:", error);
      res.status(500).json({ error: "Failed to delete booking" });
    }
  });

  // Employee - get all customers (permission-gated)
  app.get("/api/employee/customers", async (req, res) => {
    try {
      const employee = (req.session as any).employee;
      if (!employee) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Check if employee has permission to view customers
      const permissions = await storage.getEmployeePermissions(employee.id);
      const hasPermission = permissions.some(p => p.feature === "customers" && p.actions.includes("view"));
      
      if (!hasPermission) {
        return res.status(403).json({ error: "No permission to view customers" });
      }

      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  // Employee - get all quotes (permission-gated)
  app.get("/api/employee/quotes", async (req, res) => {
    try {
      const employee = (req.session as any).employee;
      if (!employee) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const permissions = await storage.getEmployeePermissions(employee.id);
      const hasPermission = permissions.some(p => p.feature === "quotes" && p.actions.includes("view"));
      
      if (!hasPermission) {
        return res.status(403).json({ error: "No permission to view quotes" });
      }

      const quotes = await storage.getQuotes();
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ error: "Failed to fetch quotes" });
    }
  });

  // Employee - update quote status with activity logging
  app.patch("/api/employee/quotes/:id/status", async (req, res) => {
    try {
      const employee = (req.session as any).employee;
      if (!employee) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const permissions = await storage.getEmployeePermissions(employee.id);
      const hasPermission = permissions.some(p => p.feature === "quotes" && p.actions.includes("edit"));
      
      if (!hasPermission) {
        return res.status(403).json({ error: "No permission to edit quotes" });
      }

      const quoteStatusSchema = z.object({
        status: z.enum(["pending", "approved", "completed"]),
      });
      const validatedData = quoteStatusSchema.parse(req.body);

      const quoteBefore = await storage.getQuote(req.params.id);
      if (!quoteBefore) {
        return res.status(404).json({ error: "Quote not found" });
      }

      const updatedQuote = await storage.updateQuoteStatus(req.params.id, validatedData.status);

      await logActivity({
        context: getUserContext(req),
        action: "updated",
        entityType: "quote",
        entityId: req.params.id,
        entityName: `${quoteBefore.serviceType} - ${quoteBefore.name}`,
        changes: {
          before: { status: quoteBefore.status },
          after: { status: validatedData.status },
        },
      });

      res.json(updatedQuote);
    } catch (error) {
      console.error("Error updating quote status:", error);
      res.status(500).json({ error: "Failed to update quote status" });
    }
  });

  // Employee - delete quote with activity logging
  app.delete("/api/employee/quotes/:id", async (req, res) => {
    try {
      const employee = (req.session as any).employee;
      if (!employee) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const permissions = await storage.getEmployeePermissions(employee.id);
      const hasPermission = permissions.some(p => p.feature === "quotes" && p.actions.includes("delete"));
      
      if (!hasPermission) {
        return res.status(403).json({ error: "No permission to delete quotes" });
      }

      const quote = await storage.getQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      await storage.deleteQuote(req.params.id);

      await logActivity({
        context: getUserContext(req),
        action: "deleted",
        entityType: "quote",
        entityId: req.params.id,
        entityName: `${quote.serviceType} - ${quote.name}`,
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting quote:", error);
      res.status(500).json({ error: "Failed to delete quote" });
    }
  });

  // Employee - get all contact messages (permission-gated)
  app.get("/api/employee/messages", async (req, res) => {
    try {
      const employee = (req.session as any).employee;
      if (!employee) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const permissions = await storage.getEmployeePermissions(employee.id);
      const hasPermission = permissions.some(p => p.feature === "messages" && p.actions.includes("view"));
      
      if (!hasPermission) {
        return res.status(403).json({ error: "No permission to view messages" });
      }

      const messages = await storage.getContactMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Employee - update message status with activity logging
  app.patch("/api/employee/messages/:id/status", async (req, res) => {
    try {
      const employee = (req.session as any).employee;
      if (!employee) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const permissions = await storage.getEmployeePermissions(employee.id);
      const hasPermission = permissions.some(p => p.feature === "messages" && p.actions.includes("edit"));
      
      if (!hasPermission) {
        return res.status(403).json({ error: "No permission to edit messages" });
      }

      const messageStatusSchema = z.object({
        status: z.enum(["unread", "read", "archived"]),
      });
      const validatedData = messageStatusSchema.parse(req.body);

      const messageBefore = await storage.getContactMessage(req.params.id);
      if (!messageBefore) {
        return res.status(404).json({ error: "Message not found" });
      }

      const updatedMessage = await storage.updateContactMessageStatus(req.params.id, validatedData.status);

      await logActivity({
        context: getUserContext(req),
        action: "updated",
        entityType: "contact_message",
        entityId: req.params.id,
        entityName: `Message from ${messageBefore.name}`,
        changes: {
          before: { status: messageBefore.status },
          after: { status: validatedData.status },
        },
      });

      res.json(updatedMessage);
    } catch (error) {
      console.error("Error updating message status:", error);
      res.status(500).json({ error: "Failed to update message status" });
    }
  });

  // Employee - delete contact message with activity logging
  app.delete("/api/employee/messages/:id", async (req, res) => {
    try {
      const employee = (req.session as any).employee;
      if (!employee) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const permissions = await storage.getEmployeePermissions(employee.id);
      const hasPermission = permissions.some(p => p.feature === "messages" && p.actions.includes("delete"));
      
      if (!hasPermission) {
        return res.status(403).json({ error: "No permission to delete messages" });
      }

      const message = await storage.getContactMessage(req.params.id);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      await storage.deleteContactMessage(req.params.id);

      await logActivity({
        context: getUserContext(req),
        action: "deleted",
        entityType: "contact_message",
        entityId: req.params.id,
        entityName: `Message from ${message.name}`,
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({ error: "Failed to delete message" });
    }
  });

  // Employee - get all team members (permission-gated)
  app.get("/api/employee/team", async (req, res) => {
    try {
      const employee = (req.session as any).employee;
      if (!employee) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const permissions = await storage.getEmployeePermissions(employee.id);
      const hasPermission = permissions.some(p => p.feature === "team" && p.actions.includes("view"));
      
      if (!hasPermission) {
        return res.status(403).json({ error: "No permission to view team members" });
      }

      const teamMembers = await storage.getTeamMembers();
      res.json(teamMembers);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  // Employee - create team member with activity logging
  app.post("/api/employee/team", async (req, res) => {
    try {
      const employee = (req.session as any).employee;
      if (!employee) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const permissions = await storage.getEmployeePermissions(employee.id);
      const hasPermission = permissions.some(p => p.feature === "team" && p.actions.includes("create"));
      
      if (!hasPermission) {
        return res.status(403).json({ error: "No permission to create team members" });
      }

      const validatedData = insertTeamMemberSchema.parse(req.body);
      const teamMember = await storage.createTeamMember(validatedData);

      await logActivity({
        context: getUserContext(req),
        action: "created",
        entityType: "team_member",
        entityId: teamMember.id,
        entityName: teamMember.name,
      });

      res.status(201).json(teamMember);
    } catch (error) {
      console.error("Error creating team member:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid team member data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create team member" });
    }
  });

  // Employee - update team member with activity logging
  app.patch("/api/employee/team/:id", async (req, res) => {
    try {
      const employee = (req.session as any).employee;
      if (!employee) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const permissions = await storage.getEmployeePermissions(employee.id);
      const hasPermission = permissions.some(p => p.feature === "team" && p.actions.includes("edit"));
      
      if (!hasPermission) {
        return res.status(403).json({ error: "No permission to edit team members" });
      }

      const validatedData = insertTeamMemberSchema.partial().parse(req.body);
      const memberBefore = await storage.getTeamMember(req.params.id);
      
      if (!memberBefore) {
        return res.status(404).json({ error: "Team member not found" });
      }

      const updatedMember = await storage.updateTeamMember(req.params.id, validatedData);

      await logActivity({
        context: getUserContext(req),
        action: "updated",
        entityType: "team_member",
        entityId: req.params.id,
        entityName: memberBefore.name,
      });

      res.json(updatedMember);
    } catch (error) {
      console.error("Error updating team member:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid team member data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update team member" });
    }
  });

  // Employee - delete team member with activity logging
  app.delete("/api/employee/team/:id", async (req, res) => {
    try {
      const employee = (req.session as any).employee;
      if (!employee) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const permissions = await storage.getEmployeePermissions(employee.id);
      const hasPermission = permissions.some(p => p.feature === "team" && p.actions.includes("delete"));
      
      if (!hasPermission) {
        return res.status(403).json({ error: "No permission to delete team members" });
      }

      const member = await storage.getTeamMember(req.params.id);
      if (!member) {
        return res.status(404).json({ error: "Team member not found" });
      }

      await storage.deleteTeamMember(req.params.id);

      await logActivity({
        context: getUserContext(req),
        action: "deleted",
        entityType: "team_member",
        entityId: req.params.id,
        entityName: member.name,
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting team member:", error);
      res.status(500).json({ error: "Failed to delete team member" });
    }
  });

  // Employee - get all reviews (permission-gated)
  app.get("/api/employee/reviews", async (req, res) => {
    try {
      const employee = (req.session as any).employee;
      if (!employee) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const permissions = await storage.getEmployeePermissions(employee.id);
      const hasPermission = permissions.some(p => p.feature === "reviews" && p.actions.includes("view"));
      
      if (!hasPermission) {
        return res.status(403).json({ error: "No permission to view reviews" });
      }

      const reviews = await storage.getReviews();
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  // Employee - approve review with activity logging
  app.patch("/api/employee/reviews/:id/approve", async (req, res) => {
    try {
      const employee = (req.session as any).employee;
      if (!employee) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const permissions = await storage.getEmployeePermissions(employee.id);
      const hasPermission = permissions.some(p => p.feature === "reviews" && p.actions.includes("approve"));
      
      if (!hasPermission) {
        return res.status(403).json({ error: "No permission to approve reviews" });
      }

      const reviewBefore = await storage.getReview(req.params.id);
      if (!reviewBefore) {
        return res.status(404).json({ error: "Review not found" });
      }

      const updatedReview = await storage.updateReviewStatus(req.params.id, "approved");

      await logActivity({
        context: getUserContext(req),
        action: "updated",
        entityType: "review",
        entityId: req.params.id,
        entityName: `Review by ${reviewBefore.customerName}`,
      });

      res.json(updatedReview);
    } catch (error) {
      console.error("Error approving review:", error);
      res.status(500).json({ error: "Failed to approve review" });
    }
  });

  // Employee - deny review with activity logging
  app.patch("/api/employee/reviews/:id/deny", async (req, res) => {
    try {
      const employee = (req.session as any).employee;
      if (!employee) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const permissions = await storage.getEmployeePermissions(employee.id);
      const hasPermission = permissions.some(p => p.feature === "reviews" && p.actions.includes("deny"));
      
      if (!hasPermission) {
        return res.status(403).json({ error: "No permission to deny reviews" });
      }

      const reviewBefore = await storage.getReview(req.params.id);
      if (!reviewBefore) {
        return res.status(404).json({ error: "Review not found" });
      }

      const updatedReview = await storage.updateReviewStatus(req.params.id, "denied");

      await logActivity({
        context: getUserContext(req),
        action: "updated",
        entityType: "review",
        entityId: req.params.id,
        entityName: `Review by ${reviewBefore.customerName}`,
      });

      res.json(updatedReview);
    } catch (error) {
      console.error("Error denying review:", error);
      res.status(500).json({ error: "Failed to deny review" });
    }
  });

  // Employee - delete review with activity logging
  app.delete("/api/employee/reviews/:id", async (req, res) => {
    try {
      const employee = (req.session as any).employee;
      if (!employee) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const permissions = await storage.getEmployeePermissions(employee.id);
      const hasPermission = permissions.some(p => p.feature === "reviews" && p.actions.includes("delete"));
      
      if (!hasPermission) {
        return res.status(403).json({ error: "No permission to delete reviews" });
      }

      const review = await storage.getReview(req.params.id);
      if (!review) {
        return res.status(404).json({ error: "Review not found" });
      }

      await storage.deleteReview(req.params.id);

      await logActivity({
        context: getUserContext(req),
        action: "deleted",
        entityType: "review",
        entityId: req.params.id,
        entityName: `Review by ${review.customerName}`,
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting review:", error);
      res.status(500).json({ error: "Failed to delete review" });
    }
  });

  // Employee - get all invoices (permission-gated)
  app.get("/api/employee/invoices", async (req, res) => {
    try {
      const employee = (req.session as any).employee;
      if (!employee) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const permissions = await storage.getEmployeePermissions(employee.id);
      const hasPermission = permissions.some(p => p.feature === "invoices" && p.actions.includes("view"));
      
      if (!hasPermission) {
        return res.status(403).json({ error: "No permission to view invoices" });
      }

      const invoices = await storage.getInvoices();
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  // Employee - send invoice payment link with activity logging
  app.post("/api/employee/invoices/:id/send-payment-link", async (req, res) => {
    try {
      const employee = (req.session as any).employee;
      if (!employee) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const permissions = await storage.getEmployeePermissions(employee.id);
      const hasPermission = permissions.some(p => p.feature === "invoices" && p.actions.includes("send_payment_link"));
      
      if (!hasPermission) {
        return res.status(403).json({ error: "No permission to send payment links" });
      }

      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // Send payment link notifications (async, don't block response)
      (async () => {
        try {
          // Fetch booking and service data for promo code breakdown
          let breakdown;
          if (invoice.bookingId) {
            const booking = await storage.getBooking(invoice.bookingId);
            if (booking?.promoCode) {
              // Use actualPrice if set, otherwise fall back to service basePrice
              let basePrice = booking.actualPrice;
              if (!basePrice) {
                const services = await storage.getServices();
                const service = services.find(s => s.name.toLowerCase().includes(booking.service.toLowerCase()));
                basePrice = service?.basePrice || 0;
              }
              
              breakdown = {
                basePrice: basePrice,
                promoCode: booking.promoCode,
                discountAmount: booking.discountAmount || 0,
                subtotal: invoice.amount,
                tax: invoice.tax,
              };
            }
          }
          
          const { sendInvoicePaymentLinkEmail } = await import("./email");
          await sendInvoicePaymentLinkEmail(
            invoice.customerEmail,
            invoice.customerName,
            invoice.invoiceNumber,
            invoice.id,
            invoice.total / 100, // Convert cents to dollars for display
            breakdown
          );
          
          await sendInvoicePaymentLinkSMS(
            invoice.customerPhone,
            invoice.customerName,
            invoice.invoiceNumber,
            invoice.id,
            invoice.total
          );
        } catch (notificationError) {
          console.error("Failed to send invoice payment notifications:", notificationError);
        }
      })();

      await logActivity({
        context: getUserContext(req),
        action: "updated",
        entityType: "invoice",
        entityId: req.params.id,
        entityName: `Invoice #${invoice.invoiceNumber}`,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error sending payment link:", error);
      res.status(500).json({ error: "Failed to send payment link" });
    }
  });

  // Employee - get newsletter subscribers (permission-gated)
  app.get("/api/employee/newsletter", async (req, res) => {
    try {
      const employee = (req.session as any).employee;
      if (!employee) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const permissions = await storage.getEmployeePermissions(employee.id);
      const hasPermission = permissions.some(p => p.feature === "newsletter" && p.actions.includes("view"));
      
      if (!hasPermission) {
        return res.status(403).json({ error: "No permission to view newsletter subscribers" });
      }

      const subscribers = await storage.getNewsletterSubscribers();
      res.json(subscribers);
    } catch (error) {
      console.error("Error fetching newsletter subscribers:", error);
      res.status(500).json({ error: "Failed to fetch subscribers" });
    }
  });

  // Employee - get all employees (permission-gated)
  app.get("/api/employee/employees", async (req, res) => {
    try {
      const employee = (req.session as any).employee;
      if (!employee) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const permissions = await storage.getEmployeePermissions(employee.id);
      const hasPermission = permissions.some(p => p.feature === "employees" && p.actions.includes("view"));
      
      if (!hasPermission) {
        return res.status(403).json({ error: "No permission to view employees" });
      }

      const employees = await storage.getEmployees();
      res.json(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  // AI Chat Assistant endpoint (public)
  app.post("/api/chat", async (req, res) => {
    try {
      const { getChatResponse } = await import("./openai");
      
      const messagesSchema = z.array(
        z.object({
          role: z.enum(["user", "assistant", "system"]),
          content: z.string(),
        })
      );
      
      const validatedData = messagesSchema.parse(req.body.messages);
      
      // Get business context for better responses
      const settings = await storage.getBusinessSettings();
      const services = await storage.getActiveServices();
      
      const businessContext = settings ? {
        businessName: settings.businessName,
        services: services.map(s => ({
          name: s.name,
          description: s.description,
          basePrice: s.basePrice,
        })),
        phone: settings.phone,
        email: settings.email,
        hours: `Mon-Fri: ${settings.hoursMonFri}${settings.hoursSat ? `, Sat: ${settings.hoursSat}` : ''}${settings.hoursSun ? `, Sun: ${settings.hoursSun}` : ''}`,
      } : undefined;
      
      const response = await getChatResponse(validatedData, businessContext);
      res.json({ message: response });
    } catch (error) {
      console.error("Error in chat endpoint:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid message format", details: error.errors });
      }
      res.status(500).json({ error: "Failed to get chat response" });
    }
  });

  // Stripe payment endpoints
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: "Payment processing not configured" });
      }

      const { invoiceId } = req.body;
      
      if (!invoiceId) {
        return res.status(400).json({ error: "Invoice ID required" });
      }

      // Get invoice from database to verify it exists and get the actual amount
      const invoice = await storage.getInvoice(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      if (invoice.status === "paid") {
        return res.status(400).json({ error: "Invoice already paid" });
      }

      // Use the invoice's actual total (server-side truth)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: invoice.total, // Already in cents from database
        currency: "usd",
        metadata: { invoiceId: invoice.id },
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ error: "Failed to create payment intent: " + error.message });
    }
  });

  // Create SetupIntent for payment method collection
  app.post("/api/create-setup-intent", async (_req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: "Payment processing not configured" });
      }

      const setupIntent = await stripe.setupIntents.create({
        payment_method_types: ['card'],
      });

      res.json({ clientSecret: setupIntent.client_secret });
    } catch (error: any) {
      console.error("Error creating setup intent:", error);
      res.status(500).json({ error: "Failed to create setup intent: " + error.message });
    }
  });

  // Mark invoice as paid (verifies payment with Stripe first)
  app.post("/api/invoices/:id/mark-paid", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: "Payment processing not configured" });
      }

      const { paymentIntentId } = req.body;
      
      if (!paymentIntentId) {
        return res.status(400).json({ error: "Payment intent ID required" });
      }

      // Verify the payment with Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ error: "Payment not successful" });
      }

      // Verify the payment intent belongs to this invoice
      if (paymentIntent.metadata.invoiceId !== req.params.id) {
        return res.status(400).json({ error: "Payment intent does not match invoice" });
      }

      // Get invoice to verify amount matches
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      if (paymentIntent.amount !== invoice.total) {
        return res.status(400).json({ error: "Payment amount does not match invoice total" });
      }

      // All verified - mark as paid
      const updatedInvoice = await storage.updateInvoice(req.params.id, {
        status: "paid",
        paidDate: new Date(),
      });

      if (!updatedInvoice) {
        return res.status(404).json({ error: "Failed to update invoice" });
      }

      // Send payment confirmation emails (async, don't block response)
      (async () => {
        try {
          const { sendPaymentReceiptEmail, sendAdminPaymentNotification } = await import("./email");
          
          // Send receipt to customer
          await sendPaymentReceiptEmail(
            updatedInvoice.customerEmail,
            updatedInvoice.customerName,
            updatedInvoice.invoiceNumber,
            updatedInvoice.serviceDescription,
            updatedInvoice.amount,
            updatedInvoice.tax,
            updatedInvoice.total,
            updatedInvoice.paidDate!
          );
          
          // Send notification to admin
          const settings = await storage.getBusinessSettings();
          if (settings && settings.email) {
            await sendAdminPaymentNotification(
              settings.email,
              updatedInvoice.invoiceNumber,
              updatedInvoice.customerName,
              updatedInvoice.customerEmail,
              updatedInvoice.total,
              updatedInvoice.paidDate!
            );
          }
        } catch (emailError) {
          console.error("Failed to send payment confirmation emails:", emailError);
        }
      })();

      res.json(updatedInvoice);
    } catch (error) {
      console.error("Error marking invoice as paid:", error);
      res.status(500).json({ error: "Failed to update invoice" });
    }
  });

  // Review routes
  app.post("/api/reviews", async (req, res) => {
    try {
      const validatedData = insertReviewSchema.parse(req.body);
      const review = await storage.createReview(validatedData);
      res.status(201).json(review);
    } catch (error) {
      console.error("Error creating review:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid review data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create review" });
    }
  });

  app.get("/api/reviews", isAuthenticated, async (_req, res) => {
    try {
      const reviews = await storage.getReviews();
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.get("/api/reviews/approved", async (_req, res) => {
    try {
      const reviews = await storage.getApprovedReviews();
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching approved reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.get("/api/reviews/pending", isAuthenticated, async (_req, res) => {
    try {
      const reviews = await storage.getPendingReviews();
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching pending reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.patch("/api/reviews/:id/status", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.body;
      if (!status || !["approved", "rejected", "pending"].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be 'approved', 'rejected', or 'pending'" });
      }
      
      const review = await storage.updateReviewStatus(req.params.id, status);
      if (!review) {
        return res.status(404).json({ error: "Review not found" });
      }
      res.json(review);
    } catch (error) {
      console.error("Error updating review status:", error);
      res.status(500).json({ error: "Failed to update review status" });
    }
  });

  app.patch("/api/reviews/:id/approve", isAuthenticated, async (req, res) => {
    try {
      const review = await storage.updateReviewStatus(req.params.id, "approved");
      if (!review) {
        return res.status(404).json({ error: "Review not found" });
      }
      res.json(review);
    } catch (error) {
      console.error("Error approving review:", error);
      res.status(500).json({ error: "Failed to approve review" });
    }
  });

  app.patch("/api/reviews/:id/reject", isAuthenticated, async (req, res) => {
    try {
      const review = await storage.updateReviewStatus(req.params.id, "rejected");
      if (!review) {
        return res.status(404).json({ error: "Review not found" });
      }
      res.json(review);
    } catch (error) {
      console.error("Error rejecting review:", error);
      res.status(500).json({ error: "Failed to reject review" });
    }
  });

  app.delete("/api/reviews/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteReview(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting review:", error);
      res.status(500).json({ error: "Failed to delete review" });
    }
  });

  // Newsletter routes
  app.post("/api/newsletter/subscribe", async (req, res) => {
    try {
      const validatedData = insertNewsletterSubscriberSchema.parse(req.body);
      
      // Check if already subscribed
      const existing = await storage.getNewsletterSubscriberByEmail(validatedData.email);
      if (existing) {
        if (existing.active) {
          return res.status(400).json({ error: "Email already subscribed" });
        } else {
          // Reactivate subscription
          const updated = await storage.updateNewsletterSubscriber(existing.id, { active: true });
          
          // Send welcome email
          (async () => {
            try {
              const { sendNewsletterWelcomeEmail } = await import("./email");
              await sendNewsletterWelcomeEmail(validatedData.email, validatedData.name || "");
            } catch (emailError) {
              console.error("Failed to send welcome email:", emailError);
            }
          })();
          
          return res.status(201).json(updated);
        }
      }

      const subscriber = await storage.createNewsletterSubscriber(validatedData);
      
      // Send welcome email (async, don't block response)
      (async () => {
        try {
          const { sendNewsletterWelcomeEmail } = await import("./email");
          await sendNewsletterWelcomeEmail(validatedData.email, validatedData.name || "");
        } catch (emailError) {
          console.error("Failed to send welcome email:", emailError);
        }
      })();

      res.status(201).json(subscriber);
    } catch (error) {
      console.error("Error subscribing to newsletter:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid subscription data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to subscribe" });
    }
  });

  app.get("/api/newsletter/subscribers", isAuthenticated, async (_req, res) => {
    try {
      const subscribers = await storage.getNewsletterSubscribers();
      res.json(subscribers);
    } catch (error) {
      console.error("Error fetching subscribers:", error);
      res.status(500).json({ error: "Failed to fetch subscribers" });
    }
  });

  const newsletterSendSchema = z.object({
    subject: z.string().min(1).max(200),
    htmlContent: z.string().min(1).max(50000),
  });

  app.post("/api/newsletter/send", isAuthenticated, async (req, res) => {
    try {
      const validatedData = newsletterSendSchema.parse(req.body);

      const subscribers = await storage.getActiveNewsletterSubscribers();
      
      if (subscribers.length === 0) {
        return res.status(400).json({ error: "No active subscribers" });
      }

      // Send emails in background
      (async () => {
        try {
          const { sendNewsletterEmail } = await import("./email");
          for (const subscriber of subscribers) {
            try {
              await sendNewsletterEmail(subscriber.email, subscriber.name || "", validatedData.subject, validatedData.htmlContent);
            } catch (error) {
              console.error(`Failed to send newsletter to ${subscriber.email}:`, error);
            }
          }
        } catch (error) {
          console.error("Error sending newsletter:", error);
        }
      })();

      res.json({ message: `Newsletter queued for ${subscribers.length} subscribers` });
    } catch (error) {
      console.error("Error sending newsletter:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid newsletter data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to send newsletter" });
    }
  });

  // Email Templates
  app.get("/api/email-templates", isAuthenticated, async (_req, res) => {
    try {
      const templates = await storage.getEmailTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching email templates:", error);
      res.status(500).json({ error: "Failed to fetch email templates" });
    }
  });

  app.post("/api/email-templates", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertEmailTemplateSchema.parse(req.body);
      const template = await storage.createEmailTemplate(validatedData);
      res.json(template);
    } catch (error) {
      console.error("Error creating email template:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid template data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create email template" });
    }
  });

  app.post("/api/email-templates/seed", isAuthenticated, async (_req, res) => {
    try {
      const existingTemplates = await storage.getEmailTemplates();
      if (existingTemplates.length > 0) {
        return res.json({ message: "Templates already exist", count: existingTemplates.length });
      }

      const defaultTemplates = [
        {
          name: "Spring Cleaning Special",
          category: "promotion",
          subject: "Spring Into Savings - 15% Off All Cleaning Services! 🌸",
          body: "Hi there!\n\nSpring is here, and it's the perfect time to refresh your space! For a limited time, enjoy 15% off all our eco-friendly cleaning services.\n\nWhether you need a deep clean, regular maintenance, or a one-time refresh, Clean & Green has you covered with our environmentally safe cleaning products.\n\nBook now and enjoy a sparkling clean home this season!\n\nBest regards,\nClean & Green Team",
          isDefault: true,
        },
        {
          name: "Service Update Announcement",
          category: "announcement",
          subject: "Important Update: New Service Hours & Offerings",
          body: "Dear Valued Customer,\n\nWe're excited to share some updates with you!\n\nStarting next month, we're extending our service hours to better accommodate your schedule. We're also introducing new specialized services including carpet deep cleaning and eco-friendly disinfection.\n\nThank you for choosing Clean & Green. We're committed to providing you with the best cleaning experience in Oklahoma.\n\nWarm regards,\nClean & Green Team",
          isDefault: true,
        },
        {
          name: "Thank You Message",
          category: "thank_you",
          subject: "Thank You for Choosing Clean & Green!",
          body: "Dear Customer,\n\nWe wanted to take a moment to thank you for choosing Clean & Green for your cleaning needs.\n\nYour trust in our eco-friendly services means the world to us. We hope you're enjoying your sparkling clean space!\n\nIf you have any feedback or need anything at all, please don't hesitate to reach out. We're always here to help.\n\nWith gratitude,\nClean & Green Team",
          isDefault: true,
        },
        {
          name: "Holiday Greetings",
          category: "seasonal",
          subject: "Happy Holidays from Clean & Green! 🎄",
          body: "Season's Greetings!\n\nAs the holiday season approaches, we want to express our heartfelt thanks for your continued support throughout the year.\n\nMay your home be filled with joy, laughter, and sparkling cleanliness this holiday season!\n\nTo help you enjoy the festivities stress-free, we're offering priority booking for holiday cleaning services. Contact us today to secure your spot.\n\nWarmest wishes,\nClean & Green Team",
          isDefault: true,
        },
        {
          name: "Service Follow-Up",
          category: "follow_up",
          subject: "How Was Your Recent Cleaning Service?",
          body: "Hi there,\n\nWe hope you're enjoying your freshly cleaned space!\n\nWe'd love to hear about your experience with our recent service. Your feedback helps us continue to improve and serve you better.\n\nIf everything was perfect, we'd be grateful if you could share a quick review. And if anything wasn't quite right, please let us know so we can make it right.\n\nThank you for choosing Clean & Green!\n\nBest,\nClean & Green Team",
          isDefault: true,
        },
        {
          name: "Referral Program",
          category: "promotion",
          subject: "Give $20, Get $20 - Refer a Friend!",
          body: "Hello!\n\nLove Clean & Green? Share the joy of a spotless, eco-friendly home with your friends and family!\n\nFor every friend you refer who books a service, you'll both receive $20 off your next cleaning. It's our way of saying thank you for spreading the word.\n\nSimply share your unique referral code with friends, and the savings will automatically apply when they book.\n\nHappy referring!\n\nClean & Green Team",
          isDefault: true,
        },
        {
          name: "Summer Maintenance Tips",
          category: "announcement",
          subject: "Summer Cleaning Tips from Clean & Green",
          body: "Hello!\n\nSummer is here, and with it comes unique cleaning challenges. Here are our top eco-friendly tips for keeping your home fresh during the hot months:\n\n• Open windows early morning for fresh air circulation\n• Use natural deodorizers like baking soda\n• Deep clean air vents and filters monthly\n• Protect floors from increased foot traffic\n\nNeed help with your summer deep clean? We're here to make your home sparkle while protecting the environment.\n\nStay cool and clean!\n\nClean & Green Team",
          isDefault: true,
        },
        {
          name: "Reactivation Offer",
          category: "promotion",
          subject: "We Miss You! Come Back to a Clean Home",
          body: "Hi there,\n\nIt's been a while since we last had the pleasure of cleaning your home, and we'd love to welcome you back!\n\nAs a special welcome-back offer, enjoy 20% off your next service when you book within the next two weeks.\n\nLet us help you get your space back to sparkling clean with our eco-friendly products and professional service.\n\nWe hope to see you soon!\n\nWarmly,\nClean & Green Team",
          isDefault: true,
        },
      ];

      for (const template of defaultTemplates) {
        await storage.createEmailTemplate(template);
      }

      res.json({ message: "Default templates created successfully", count: defaultTemplates.length });
    } catch (error) {
      console.error("Error seeding templates:", error);
      res.status(500).json({ error: "Failed to seed templates" });
    }
  });

  app.delete("/api/email-templates/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteEmailTemplate(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting email template:", error);
      res.status(500).json({ error: "Failed to delete email template" });
    }
  });

  app.delete("/api/newsletter/subscribers/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteNewsletterSubscriber(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting subscriber:", error);
      res.status(500).json({ error: "Failed to delete subscriber" });
    }
  });

  // Team member routes
  app.post("/api/team", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertTeamMemberSchema.parse(req.body);
      const member = await storage.createTeamMember(validatedData);
      res.status(201).json(member);
    } catch (error) {
      console.error("Error creating team member:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid team member data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create team member" });
    }
  });

  app.get("/api/team", async (_req, res) => {
    try {
      const members = await storage.getActiveTeamMembers();
      res.json(members);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  app.get("/api/team/all", isAuthenticated, async (_req, res) => {
    try {
      const members = await storage.getTeamMembers();
      res.json(members);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  app.patch("/api/team/:id", isAuthenticated, async (req, res) => {
    try {
      const member = await storage.updateTeamMember(req.params.id, req.body);
      if (!member) {
        return res.status(404).json({ error: "Team member not found" });
      }
      res.json(member);
    } catch (error) {
      console.error("Error updating team member:", error);
      res.status(500).json({ error: "Failed to update team member" });
    }
  });

  app.delete("/api/team/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteTeamMember(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting team member:", error);
      res.status(500).json({ error: "Failed to delete team member" });
    }
  });

  // Delete routes for bookings and quotes
  app.delete("/api/bookings/:id", isAuthenticated, async (req, res) => {
    try {
      // Get booking first to find the customer
      const booking = await storage.getBooking(req.params.id);
      if (booking && booking.email) {
        const customer = await storage.getCustomerByEmail(booking.email);
        if (customer) {
          await storage.decrementCustomerBookings(customer.id);
        }
      }
      
      await storage.deleteBooking(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting booking:", error);
      res.status(500).json({ error: "Failed to delete booking" });
    }
  });

  // Admin cancellation management endpoints
  app.get("/api/admin/cancellations", isAuthenticated, async (_req, res) => {
    try {
      const bookings = await storage.getBookings();
      const cancelledBookings = bookings
        .filter(booking => booking.status === 'cancelled')
        .sort((a, b) => {
          if (!a.cancelledAt) return 1;
          if (!b.cancelledAt) return -1;
          return new Date(b.cancelledAt).getTime() - new Date(a.cancelledAt).getTime();
        });
      res.json(cancelledBookings);
    } catch (error) {
      console.error("Error fetching cancelled bookings:", error);
      res.status(500).json({ error: "Failed to fetch cancelled bookings" });
    }
  });

  app.patch("/api/admin/cancellations/:id/dismiss", isAuthenticated, async (req, res) => {
    try {
      const booking = await storage.updateBooking(req.params.id, { 
        cancellationFeeStatus: 'dismissed' 
      });
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      await logActivity({
        context: getUserContext(req),
        action: 'updated',
        entityType: 'booking',
        entityId: booking.id,
        entityName: `Dismissed cancellation fee for ${booking.name}`,
      });

      // Send notifications (async, don't block response)
      (async () => {
        try {
          const { sendCancellationFeeDismissedEmail } = await import("./email");
          const { sendCancellationFeeDismissedSMS } = await import("./sms");
          
          await sendCancellationFeeDismissedEmail(
            booking.email,
            booking.name,
            {
              serviceType: booking.service,
              date: booking.date,
              timeSlot: booking.timeSlot,
              address: booking.address,
            }
          );
          
          if (booking.phone) {
            await sendCancellationFeeDismissedSMS(booking.phone, booking.name);
          }
        } catch (notificationError) {
          console.error("Failed to send cancellation fee dismissed notifications:", notificationError);
        }
      })();

      res.json(booking);
    } catch (error) {
      console.error("Error dismissing cancellation fee:", error);
      res.status(500).json({ error: "Failed to dismiss cancellation fee" });
    }
  });

  app.post("/api/admin/cancellations/:id/charge", isAuthenticated, async (req, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      if (booking.cancellationFeeStatus !== 'pending') {
        return res.status(400).json({ error: "Cancellation fee is not pending" });
      }

      if (!booking.paymentMethodId) {
        return res.status(400).json({ error: "No payment method on file for this booking" });
      }

      if (!stripe) {
        return res.status(500).json({ error: "Stripe is not configured" });
      }

      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: 3500,
          currency: 'usd',
          payment_method: booking.paymentMethodId,
          confirm: true,
          automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
          description: `Cancellation fee for booking ${booking.id}`,
          metadata: { bookingId: booking.id, type: 'cancellation_fee' },
        });

        if (paymentIntent.status === 'succeeded') {
          const updatedBooking = await storage.updateBooking(req.params.id, {
            cancellationFeeStatus: 'charged',
          });

          await logActivity({
            context: getUserContext(req),
            action: 'updated',
            entityType: 'booking',
            entityId: booking.id,
            entityName: `Charged $35 cancellation fee for ${booking.name}`,
          });

          // Send notifications (async, don't block response)
          (async () => {
            try {
              const { sendCancellationFeeChargedEmail } = await import("./email");
              const { sendCancellationFeeChargedSMS } = await import("./sms");
              const settings = await storage.getBusinessSettings();
              
              await sendCancellationFeeChargedEmail(
                booking.email,
                booking.name,
                35.00,
                {
                  serviceType: booking.service,
                  date: booking.date,
                  timeSlot: booking.timeSlot,
                  address: booking.address,
                }
              );
              
              if (booking.phone && settings) {
                await sendCancellationFeeChargedSMS(
                  booking.phone, 
                  booking.name, 
                  35.00,
                  settings.phone
                );
              }
            } catch (notificationError) {
              console.error("Failed to send cancellation fee charged notifications:", notificationError);
            }
          })();

          res.json({ success: true, booking: updatedBooking });
        } else {
          res.status(400).json({ error: `Payment failed with status: ${paymentIntent.status}` });
        }
      } catch (stripeError: any) {
        console.error("Stripe payment error:", stripeError);
        res.status(400).json({ 
          error: "Payment failed", 
          details: stripeError.message 
        });
      }
    } catch (error) {
      console.error("Error charging cancellation fee:", error);
      res.status(500).json({ error: "Failed to charge cancellation fee" });
    }
  });

  // Reschedule request management routes
  app.get("/api/admin/reschedule-requests", isAuthenticated, async (_req, res) => {
    try {
      const requests = await storage.getRescheduleRequests();
      res.json(requests);
    } catch (error) {
      console.error("Error fetching reschedule requests:", error);
      res.status(500).json({ error: "Failed to fetch reschedule requests" });
    }
  });

  app.patch("/api/admin/reschedule-requests/:id/approve", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const decisionReasonSchema = z.object({
        reason: z.string().optional(),
      });
      const { reason } = decisionReasonSchema.parse(req.body);
      
      // Get the reschedule request
      const request = await storage.getRescheduleRequest(id);
      if (!request) {
        return res.status(404).json({ error: "Reschedule request not found" });
      }
      
      if (request.status !== 'pending') {
        return res.status(400).json({ error: "Reschedule request is not pending" });
      }
      
      // Get the booking
      const booking = await storage.getBooking(request.bookingId);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      // Update the booking with new date/time
      await storage.updateBooking(booking.id, {
        date: request.requestedDate,
        timeSlot: request.requestedTimeSlot,
        status: 'confirmed', // Confirm the booking after reschedule
      });
      
      // Update reschedule request status
      const userId = (req.user as User).id;
      await storage.updateRescheduleRequestStatus(
        id,
        'approved',
        userId,
        reason
      );
      
      // Log activity
      await logActivity({
        context: getUserContext(req),
        action: 'updated',
        entityType: 'rescheduleRequest',
        entityId: id,
        entityName: `Approved reschedule for ${booking.name}`,
      });
      
      // Send email notifications (async, don't block response)
      (async () => {
        try {
          const { sendRescheduleApprovedEmail } = await import("./email");
          await sendRescheduleApprovedEmail({
            customerEmail: booking.email,
            customerName: booking.name,
            serviceType: booking.service,
            originalDate: request.originalDate,
            originalTimeSlot: request.originalTimeSlot,
            requestedDate: request.requestedDate,
            requestedTimeSlot: request.requestedTimeSlot,
            address: booking.address,
          });
        } catch (emailError) {
          console.error("Failed to send reschedule approved notification:", emailError);
        }
      })();
      
      res.json({ message: "Reschedule request approved successfully" });
    } catch (error) {
      console.error("Error approving reschedule request:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to approve reschedule request" });
    }
  });

  app.patch("/api/admin/reschedule-requests/:id/deny", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const decisionReasonSchema = z.object({
        reason: z.string().min(1, "Reason is required when denying"),
      });
      const { reason } = decisionReasonSchema.parse(req.body);
      
      // Get the reschedule request
      const request = await storage.getRescheduleRequest(id);
      if (!request) {
        return res.status(404).json({ error: "Reschedule request not found" });
      }
      
      if (request.status !== 'pending') {
        return res.status(400).json({ error: "Reschedule request is not pending" });
      }
      
      // Get the booking
      const booking = await storage.getBooking(request.bookingId);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      // Revert booking status back to its previous state
      await storage.updateBookingStatus(booking.id, 'confirmed');
      
      // Update reschedule request status
      const userId = (req.user as User).id;
      await storage.updateRescheduleRequestStatus(
        id,
        'denied',
        userId,
        reason
      );
      
      // Log activity
      await logActivity({
        context: getUserContext(req),
        action: 'updated',
        entityType: 'rescheduleRequest',
        entityId: id,
        entityName: `Denied reschedule for ${booking.name}`,
      });
      
      // Send email notifications (async, don't block response)
      (async () => {
        try {
          const { sendRescheduleDeniedEmail } = await import("./email");
          await sendRescheduleDeniedEmail({
            customerEmail: booking.email,
            customerName: booking.name,
            serviceType: booking.service,
            originalDate: request.originalDate,
            originalTimeSlot: request.originalTimeSlot,
            requestedDate: request.requestedDate,
            requestedTimeSlot: request.requestedTimeSlot,
            address: booking.address,
            denialReason: reason,
          });
        } catch (emailError) {
          console.error("Failed to send reschedule denied notification:", emailError);
        }
      })();
      
      res.json({ message: "Reschedule request denied successfully" });
    } catch (error) {
      console.error("Error denying reschedule request:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to deny reschedule request" });
    }
  });

  app.delete("/api/quotes/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteQuote(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting quote:", error);
      res.status(500).json({ error: "Failed to delete quote" });
    }
  });

  // Contact messages routes
  app.post("/api/contact-messages", async (req, res) => {
    try {
      const validatedData = insertContactMessageSchema.parse(req.body);
      const message = await storage.createContactMessage(validatedData);
      
      // Send email notification (async, don't block response)
      (async () => {
        try {
          const settings = await storage.getBusinessSettings();
          if (settings) {
            await sendContactMessageNotification({
              name: message.name,
              email: message.email,
              phone: message.phone || undefined,
              message: message.message,
            }, settings.email);
          }
        } catch (emailError) {
          console.error("Failed to send contact message notification:", emailError);
        }
      })();
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating contact message:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid message data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.get("/api/contact-messages", isAuthenticated, async (_req, res) => {
    try {
      const messages = await storage.getContactMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching contact messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.patch("/api/contact-messages/:id", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.body;
      if (status !== "unread" && status !== "read" && status !== "archived") {
        return res.status(400).json({ error: "Invalid status" });
      }
      const message = await storage.updateContactMessageStatus(req.params.id, status);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      res.json(message);
    } catch (error) {
      console.error("Error updating contact message:", error);
      res.status(500).json({ error: "Failed to update message" });
    }
  });

  app.delete("/api/contact-messages/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteContactMessage(req.params.id);
      await logActivity({
        context: getUserContext(req),
        action: 'deleted',
        entityType: 'contact_message',
        entityId: req.params.id,
      });
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting contact message:", error);
      res.status(500).json({ error: "Failed to delete message" });
    }
  });

  // Customer routes
  app.get("/api/customers", isAuthenticated, async (_req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertCustomerSchema.parse(req.body);
      
      // Check if customer already exists by email
      const existingCustomer = await storage.getCustomerByEmail(validatedData.email);
      if (existingCustomer) {
        return res.status(409).json({ 
          error: "A customer with this email already exists",
          existingCustomer 
        });
      }
      
      const customer = await storage.createCustomer(validatedData);
      await logActivity({
        context: getUserContext(req),
        action: 'created',
        entityType: 'customer',
        entityId: customer.id,
        entityName: customer.name,
      });
      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid customer data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create customer" });
    }
  });

  app.patch("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const before = await storage.getCustomer(req.params.id);
      const customer = await storage.updateCustomer(req.params.id, req.body);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      await logActivity({
        context: getUserContext(req),
        action: 'updated',
        entityType: 'customer',
        entityId: customer.id,
        entityName: customer.name,
        changes: { before, after: customer },
      });
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      await storage.deleteCustomer(req.params.id);
      await logActivity({
        context: getUserContext(req),
        action: 'deleted',
        entityType: 'customer',
        entityId: req.params.id,
        entityName: customer?.name,
      });
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting customer:", error);
      
      // Check for foreign key constraint violation
      if (error.code === '23503') {
        return res.status(400).json({ 
          error: "Cannot delete this customer because they have existing bookings, quotes, or invoices. Please delete those first." 
        });
      }
      
      res.status(500).json({ error: "Failed to delete customer" });
    }
  });

  // Send bulk email to customers
  app.post("/api/customers/send-email", isAuthenticated, async (req, res) => {
    try {
      const { customerIds, subject, message } = req.body;
      
      if (!Array.isArray(customerIds) || customerIds.length === 0) {
        return res.status(400).json({ error: "Customer IDs must be a non-empty array" });
      }
      
      if (!subject || !message) {
        return res.status(400).json({ error: "Subject and message are required" });
      }

      const customers = await storage.getCustomers();
      const selectedCustomers = customers.filter(c => customerIds.includes(c.id));

      if (selectedCustomers.length === 0) {
        return res.status(404).json({ error: "No customers found" });
      }

      // Filter customers with valid email addresses
      const customersWithEmail = selectedCustomers.filter(c => c.email && c.email.trim() !== '');
      const customersWithoutEmail = selectedCustomers.filter(c => !c.email || c.email.trim() === '');

      if (customersWithoutEmail.length > 0) {
        console.warn(`Skipping ${customersWithoutEmail.length} customer(s) without email addresses:`, 
          customersWithoutEmail.map(c => c.name).join(', '));
      }

      if (customersWithEmail.length === 0) {
        return res.status(400).json({ error: "None of the selected customers have email addresses" });
      }

      // Send emails to each customer
      const emailPromises = customersWithEmail.map(async (customer) => {
        try {
          await resend.emails.send({
            from: 'Clean & Green <noreply@voryn.store>',
            to: customer.email!,
            subject: subject,
            html: `
              <h2>Message from Clean & Green</h2>
              <p>Hi ${escapeHtml(customer.name)},</p>
              <div style="white-space: pre-wrap;">${escapeHtml(message)}</div>
              <br>
              <p>Best regards,<br>Clean & Green Team</p>
            `,
          });
        } catch (error) {
          console.error(`Failed to send email to ${customer.email}:`, error);
        }
      });

      await Promise.all(emailPromises);

      // Log activity
      await logActivity({
        context: getUserContext(req),
        action: 'sent_bulk_email',
        entityType: 'customer',
        details: `Sent email to ${customersWithEmail.length} customer(s). Subject: "${subject}"`,
      });

      res.json({ 
        success: true, 
        sent: customersWithEmail.length,
        skipped: customersWithoutEmail.length
      });
    } catch (error) {
      console.error("Error sending emails to customers:", error);
      res.status(500).json({ error: "Failed to send emails" });
    }
  });

  // Send bulk email to booking customers
  app.post("/api/bookings/send-email", isAuthenticated, async (req, res) => {
    try {
      const { bookingIds, subject, message } = req.body;
      
      if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
        return res.status(400).json({ error: "Booking IDs must be a non-empty array" });
      }
      
      if (!subject || !message) {
        return res.status(400).json({ error: "Subject and message are required" });
      }

      const allBookings = await storage.getBookings();
      const selectedBookings = allBookings.filter(b => bookingIds.includes(b.id));

      if (selectedBookings.length === 0) {
        return res.status(404).json({ error: "No bookings found" });
      }

      // Filter bookings with valid email addresses
      const bookingsWithEmail = selectedBookings.filter(b => b.email && b.email.trim() !== '');
      const bookingsWithoutEmail = selectedBookings.filter(b => !b.email || b.email.trim() === '');

      if (bookingsWithoutEmail.length > 0) {
        console.warn(`Skipping ${bookingsWithoutEmail.length} booking(s) without email addresses:`, 
          bookingsWithoutEmail.map(b => b.name).join(', '));
      }

      if (bookingsWithEmail.length === 0) {
        return res.status(400).json({ error: "None of the selected bookings have email addresses" });
      }

      // Send emails to each customer
      const emailPromises = bookingsWithEmail.map(async (booking) => {
        try {
          await resend.emails.send({
            from: 'Clean & Green <noreply@voryn.store>',
            to: booking.email!,
            subject: subject,
            html: `
              <h2>Message from Clean & Green</h2>
              <p>Hi ${escapeHtml(booking.name)},</p>
              <div style="white-space: pre-wrap;">${escapeHtml(message)}</div>
              <br>
              <p>Best regards,<br>Clean & Green Team</p>
            `,
          });
        } catch (error) {
          console.error(`Failed to send email to ${booking.email}:`, error);
        }
      });

      await Promise.all(emailPromises);

      // Log activity
      await logActivity({
        context: getUserContext(req),
        action: 'sent_bulk_email',
        entityType: 'booking',
        details: `Sent email to ${bookingsWithEmail.length} booking customer(s). Subject: "${subject}"`,
      });

      res.json({ 
        success: true, 
        sent: bookingsWithEmail.length,
        skipped: bookingsWithoutEmail.length
      });
    } catch (error) {
      console.error("Error sending emails to booking customers:", error);
      res.status(500).json({ error: "Failed to send emails" });
    }
  });

  // Activity log routes
  app.get("/api/activity-logs", isAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await storage.getActivityLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ error: "Failed to fetch activity logs" });
    }
  });

  // Lead statistics (web vs phone bookings)
  app.get("/api/stats/leads", isAuthenticated, async (_req, res) => {
    try {
      const allBookings = await storage.getBookings();
      const webLeads = allBookings.filter(b => b.leadType === 'web').length;
      const phoneLeads = allBookings.filter(b => b.leadType === 'phone').length;
      res.json({ webLeads, phoneLeads, total: allBookings.length });
    } catch (error) {
      console.error("Error fetching lead stats:", error);
      res.status(500).json({ error: "Failed to fetch lead statistics" });
    }
  });

  // Promo code routes
  app.get("/api/promo-codes", isAuthenticated, async (_req, res) => {
    try {
      const promoCodes = await storage.getPromoCodes();
      res.json(promoCodes);
    } catch (error) {
      console.error("Error fetching promo codes:", error);
      res.status(500).json({ error: "Failed to fetch promo codes" });
    }
  });

  app.post("/api/promo-codes", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertPromoCodeSchema.parse(req.body);
      const promoCode = await storage.createPromoCode(validatedData);

      await logActivity({
        context: getUserContext(req),
        action: 'created',
        entityType: 'promo_code',
        entityId: promoCode.id,
        entityName: promoCode.code,
      });

      res.status(201).json(promoCode);
    } catch (error) {
      console.error("Error creating promo code:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create promo code" });
    }
  });

  app.patch("/api/promo-codes/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertPromoCodeSchema.partial().parse(req.body);
      const promoCode = await storage.updatePromoCode(id, updates);

      if (!promoCode) {
        return res.status(404).json({ error: "Promo code not found" });
      }

      await logActivity({
        context: getUserContext(req),
        action: 'updated',
        entityType: 'promo_code',
        entityId: promoCode.id,
        entityName: promoCode.code,
      });

      res.json(promoCode);
    } catch (error) {
      console.error("Error updating promo code:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update promo code" });
    }
  });

  app.delete("/api/promo-codes/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const promoCode = await storage.getPromoCode(id);
      
      if (!promoCode) {
        return res.status(404).json({ error: "Promo code not found" });
      }

      await storage.deletePromoCode(id);

      await logActivity({
        context: getUserContext(req),
        action: 'deleted',
        entityType: 'promo_code',
        entityId: id,
        entityName: promoCode.code,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting promo code:", error);
      res.status(500).json({ error: "Failed to delete promo code" });
    }
  });

  // Public promo code validation endpoint
  app.post("/api/promo-codes/validate", async (req, res) => {
    try {
      const { code } = req.body;

      if (!code) {
        return res.json({ 
          valid: false, 
          message: "Promo code is required" 
        });
      }

      const promoCode = await storage.getPromoCodeByCode(code.toUpperCase());

      if (!promoCode) {
        return res.json({ 
          valid: false, 
          message: "Invalid promo code" 
        });
      }

      if (promoCode.status !== 'active') {
        return res.json({ 
          valid: false, 
          message: "Promo code is not active" 
        });
      }

      const now = new Date();
      if (now < new Date(promoCode.validFrom) || now > new Date(promoCode.validTo)) {
        return res.json({ 
          valid: false, 
          message: "Promo code has expired or is not yet valid" 
        });
      }

      if (promoCode.maxUses !== null && promoCode.currentUses >= promoCode.maxUses) {
        return res.json({ 
          valid: false, 
          message: "Promo code has reached maximum usage" 
        });
      }

      // Return promo code info - discount will be calculated when booking is created with service info
      res.json({
        valid: true,
        promoCode: {
          id: promoCode.id,
          code: promoCode.code,
          discountType: promoCode.discountType,
          discountValue: promoCode.discountValue,
          description: promoCode.description,
        },
        discountAmount: 0,
      });
    } catch (error) {
      console.error("Error validating promo code:", error);
      res.status(500).json({ error: "Failed to validate promo code" });
    }
  });

  // Public endpoint to get active promo code for banner
  app.get("/api/public/active-promo", async (_req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      const promoCodes = await storage.getPromoCodes();
      const now = new Date();
      
      const activePromo = promoCodes.find(promo => 
        promo.status === 'active' &&
        now >= new Date(promo.validFrom) &&
        now <= new Date(promo.validTo) &&
        (promo.maxUses === null || promo.currentUses < promo.maxUses)
      );
      
      res.json(activePromo || null);
    } catch (error) {
      console.error("Error fetching active promo:", error);
      res.status(500).json({ error: "Failed to fetch active promo" });
    }
  });

  // Service area routes (admin)
  app.get("/api/service-areas", isAuthenticated, async (_req, res) => {
    try {
      const serviceAreas = await storage.getServiceAreas();
      res.json(serviceAreas);
    } catch (error) {
      console.error("Error fetching service areas:", error);
      res.status(500).json({ error: "Failed to fetch service areas" });
    }
  });

  app.post("/api/service-areas", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertServiceAreaSchema.parse(req.body);
      const serviceArea = await storage.createServiceArea(validatedData);

      await logActivity({
        context: getUserContext(req),
        action: 'created',
        entityType: 'service_area',
        entityId: serviceArea.id,
        entityName: serviceArea.name,
      });

      res.status(201).json(serviceArea);
    } catch (error) {
      console.error("Error creating service area:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create service area" });
    }
  });

  app.patch("/api/service-areas/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertServiceAreaSchema.partial().parse(req.body);
      const serviceArea = await storage.updateServiceArea(id, updates);

      if (!serviceArea) {
        return res.status(404).json({ error: "Service area not found" });
      }

      await logActivity({
        context: getUserContext(req),
        action: 'updated',
        entityType: 'service_area',
        entityId: serviceArea.id,
        entityName: serviceArea.name,
      });

      res.json(serviceArea);
    } catch (error) {
      console.error("Error updating service area:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update service area" });
    }
  });

  app.delete("/api/service-areas/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const serviceArea = await storage.getServiceArea(id);
      
      if (!serviceArea) {
        return res.status(404).json({ error: "Service area not found" });
      }

      await storage.deleteServiceArea(id);

      await logActivity({
        context: getUserContext(req),
        action: 'deleted',
        entityType: 'service_area',
        entityId: id,
        entityName: serviceArea.name,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting service area:", error);
      res.status(500).json({ error: "Failed to delete service area" });
    }
  });

  // Public service area endpoints
  app.get("/api/public/service-areas", async (_req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      const serviceAreas = await storage.getActiveServiceAreas();
      res.json(serviceAreas);
    } catch (error) {
      console.error("Error fetching active service areas:", error);
      res.status(500).json({ error: "Failed to fetch service areas" });
    }
  });

  app.get("/api/service-areas/check/:zipCode", async (req, res) => {
    try {
      const { zipCode } = req.params;
      const isServed = await storage.checkZipCodeInServiceArea(zipCode);
      res.json({ served: isServed });
    } catch (error) {
      console.error("Error checking zip code:", error);
      res.status(500).json({ error: "Failed to check zip code" });
    }
  });

  // Referral routes
  
  // Public: Get referral program enabled status
  app.get("/api/public/referral-settings", async (_req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      const settings = await storage.getReferralSettings();
      res.json({ enabled: settings?.enabled ?? true });
    } catch (error) {
      console.error("Error fetching referral settings:", error);
      res.json({ enabled: false });
    }
  });
  
  // Public: Validate referral code
  app.post("/api/referrals/validate", async (req, res) => {
    try {
      const { code, address, email, phone } = req.body;
      if (!code) {
        return res.status(400).json({ error: "Referral code is required" });
      }

      const referrer = await storage.validateReferralCode(code.toUpperCase());
      if (!referrer) {
        return res.status(404).json({ error: "Invalid referral code" });
      }

      const settings = await storage.getReferralSettings();
      if (!settings?.enabled) {
        return res.status(400).json({ error: "Referral program is currently disabled" });
      }

      // Enhanced fraud detection if we have enough information
      if (address && email && phone) {
        // Capture IP for comprehensive fraud check
        const ipAddress = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || 
                          req.headers['x-real-ip']?.toString() || 
                          req.socket.remoteAddress || 
                          undefined;
        
        const fraudCheck = await storage.detectReferralFraud({
          referralCode: code.toUpperCase(),
          email,
          phone,
          address,
          ipAddress,
        });
        
        if (!fraudCheck.isValid) {
          return res.status(400).json({ 
            error: fraudCheck.reason,
            valid: false 
          });
        }
      } else if (address && email) {
        // Fallback to basic address check if phone not provided
        const addressAlreadyReferred = await storage.checkAddressAlreadyReferred(address, email);
        if (addressAlreadyReferred) {
          return res.status(400).json({ 
            error: "This address has already been referred. Each address can only be referred once.",
            valid: false 
          });
        }
      }

      const tierInfo = await storage.calculateReferralTier(referrer.id);

      res.json({
        valid: true,
        referrerName: referrer.name,
        discountAmount: tierInfo.amount,
        tier: tierInfo.tier,
      });
    } catch (error) {
      console.error("Error validating referral code:", error);
      res.status(500).json({ error: "Failed to validate referral code" });
    }
  });

  // Admin: Get all referrals
  app.get("/api/referrals", isAuthenticated, async (_req, res) => {
    try {
      const referrals = await storage.getReferrals();
      res.json(referrals);
    } catch (error) {
      console.error("Error fetching referrals:", error);
      res.status(500).json({ error: "Failed to fetch referrals" });
    }
  });

  // Admin: Get referral by ID
  app.get("/api/referrals/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const referral = await storage.getReferral(id);
      
      if (!referral) {
        return res.status(404).json({ error: "Referral not found" });
      }
      
      res.json(referral);
    } catch (error) {
      console.error("Error fetching referral:", error);
      res.status(500).json({ error: "Failed to fetch referral" });
    }
  });

  // Admin: Delete referral
  app.delete("/api/referrals/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteReferral(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting referral:", error);
      res.status(500).json({ error: "Failed to delete referral" });
    }
  });

  // Admin: Get referral stats for a customer
  app.get("/api/customers/:id/referral-stats", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const customer = await storage.getCustomer(id);
      
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      const referralsByCustomer = await storage.getReferralsByReferrer(id);
      const creditInfo = await storage.getReferralCredit(id);
      const tierInfo = await storage.calculateReferralTier(id);

      res.json({
        referralCode: customer.referralCode,
        friendsReferred: referralsByCustomer.filter(r => r.status === 'credited').length,
        pendingReferrals: referralsByCustomer.filter(r => r.status === 'pending' || r.status === 'completed').length,
        creditsEarned: creditInfo?.totalEarned || 0,
        creditsUsed: creditInfo?.totalUsed || 0,
        availableBalance: creditInfo?.availableBalance || 0,
        currentTier: tierInfo.tier,
        nextRewardAmount: tierInfo.amount,
        referrals: referralsByCustomer,
      });
    } catch (error) {
      console.error("Error fetching referral stats:", error);
      res.status(500).json({ error: "Failed to fetch referral stats" });
    }
  });

  // Admin: Get booking referral info (for invoice creation)
  app.get("/api/bookings/:id/referral-info", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const booking = await storage.getBooking(id);
      
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      let referralInfo = null;
      let creditInfo = null;

      if (booking.referralCode) {
        const referrer = await storage.validateReferralCode(booking.referralCode);
        if (referrer) {
          const tierInfo = await storage.calculateReferralTier(referrer.id);
          referralInfo = {
            code: booking.referralCode,
            referrerName: referrer.name,
            discountAmount: tierInfo.amount,
            tier: tierInfo.tier,
          };
        }
      }

      if (booking.customerId) {
        const credits = await storage.getReferralCredit(booking.customerId);
        if (credits && credits.availableBalance > 0) {
          creditInfo = {
            available: credits.availableBalance,
            totalEarned: credits.totalEarned,
            totalUsed: credits.totalUsed,
          };
        }
      }

      res.json({
        hasReferralCode: !!referralInfo,
        referralInfo,
        hasCredits: !!creditInfo,
        creditInfo,
      });
    } catch (error) {
      console.error("Error fetching booking referral info:", error);
      res.status(500).json({ error: "Failed to fetch referral info" });
    }
  });

  // Admin: Apply referral discount to invoice
  app.post("/api/invoices/:id/apply-referral-discount", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { amount } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid discount amount" });
      }

      const invoice = await storage.getInvoice(id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const booking = invoice.bookingId ? await storage.getBooking(invoice.bookingId) : null;
      
      if (!booking?.referralCode) {
        return res.status(400).json({ error: "No referral code on this booking" });
      }

      const newTotal = invoice.total - amount;
      await storage.updateInvoice(id, {
        referralDiscountApplied: amount,
        total: newTotal,
      });

      if (booking.referralCode) {
        const referrer = await storage.validateReferralCode(booking.referralCode);
        if (referrer && booking.id) {
          const tierInfo = await storage.calculateReferralTier(referrer.id);
          await storage.createReferral({
            referralCode: booking.referralCode,
            referrerId: referrer.id,
            referredCustomerId: invoice.customerId || undefined,
            referredBookingId: booking.id,
            status: 'pending',
            creditAmount: tierInfo.amount,
            tier: tierInfo.tier,
          });
        }
      }

      await logActivity({
        context: getUserContext(req),
        action: 'other',
        entityType: 'invoice',
        entityId: id,
        entityName: invoice.invoiceNumber,
        details: `Applied referral discount: $${(amount / 100).toFixed(2)}`,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error applying referral discount:", error);
      res.status(500).json({ error: "Failed to apply referral discount" });
    }
  });

  // Admin: Apply referral credit to invoice
  app.post("/api/invoices/:id/apply-referral-credit", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { amount } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid credit amount" });
      }

      const invoice = await storage.getInvoice(id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      if (!invoice.customerId) {
        return res.status(400).json({ error: "Invoice has no associated customer" });
      }

      const credit = await storage.getReferralCredit(invoice.customerId);
      if (!credit || credit.availableBalance < amount) {
        return res.status(400).json({ error: "Insufficient referral credit balance" });
      }

      await storage.useReferralCredit(invoice.customerId, amount);

      const newTotal = invoice.total - amount;
      await storage.updateInvoice(id, {
        referralCreditApplied: amount,
        total: newTotal,
      });

      await logActivity({
        context: getUserContext(req),
        action: 'other',
        entityType: 'invoice',
        entityId: id,
        entityName: invoice.invoiceNumber,
        details: `Applied referral credit: $${(amount / 100).toFixed(2)}`,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error applying referral credit:", error);
      res.status(500).json({ error: "Failed to apply referral credit" });
    }
  });

  // Admin: Get referral settings
  app.get("/api/referral-settings", isAuthenticated, async (_req, res) => {
    try {
      let settings = await storage.getReferralSettings();
      if (!settings) {
        settings = await storage.upsertReferralSettings({
          enabled: true,
          tier1Amount: 1000,
          tier2Amount: 1500,
          tier3Amount: 2000,
          minimumServicePrice: 5000,
          welcomeEmailEnabled: true,
          creditEarnedEmailEnabled: true,
        });
      }
      res.json(settings);
    } catch (error) {
      console.error("Error fetching referral settings:", error);
      res.status(500).json({ error: "Failed to fetch referral settings" });
    }
  });

  // Admin: Update referral settings
  app.put("/api/referral-settings", isAuthenticated, async (req, res) => {
    try {
      const settings = await storage.upsertReferralSettings(req.body);
      
      await logActivity({
        context: getUserContext(req),
        action: 'updated',
        entityType: 'referral_settings',
        entityId: settings.id,
        entityName: 'Referral Program Settings',
      });

      res.json(settings);
    } catch (error) {
      console.error("Error updating referral settings:", error);
      res.status(500).json({ error: "Failed to update referral settings" });
    }
  });

  // Admin: Manually adjust customer referral credits
  app.post("/api/customers/:id/adjust-credits", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { amount, reason } = req.body;

      if (!amount) {
        return res.status(400).json({ error: "Amount is required" });
      }

      const customer = await storage.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      if (amount > 0) {
        await storage.addReferralCredit(id, amount);
      } else {
        await storage.useReferralCredit(id, Math.abs(amount));
      }

      await logActivity({
        context: getUserContext(req),
        action: 'other',
        entityType: 'customer',
        entityId: id,
        entityName: customer.name,
        details: `Adjusted credits: ${amount > 0 ? 'Added' : 'Deducted'} $${(Math.abs(amount) / 100).toFixed(2)} - ${reason || 'Manual adjustment'}`,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error adjusting credits:", error);
      res.status(500).json({ error: "Failed to adjust credits" });
    }
  });

  // Public endpoint to get banner settings
  app.get("/api/public/banner-settings", async (_req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      const settings = await storage.getBusinessSettings();
      res.json({
        enabled: settings?.promoBannerEnabled ?? true,
        customMessage: settings?.promoBannerMessage,
      });
    } catch (error) {
      console.error("Error fetching banner settings:", error);
      res.status(500).json({ error: "Failed to fetch banner settings" });
    }
  });

  // Public endpoint to get stats counter settings
  app.get("/api/public/stats-settings", async (_req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      const settings = await storage.getBusinessSettings();
      res.json({
        enabled: settings?.statsCounterEnabled ?? true,
      });
    } catch (error) {
      console.error("Error fetching stats settings:", error);
      res.status(500).json({ error: "Failed to fetch stats settings" });
    }
  });

  // Public endpoint for recent bookings ticker
  app.get("/api/public/recent-bookings", async (_req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      const bookings = await storage.getBookings();
      const recentBookings = bookings
        .filter(b => b.status !== 'cancelled' && b.leadType === 'web')
        .slice(0, 10)
        .map(b => ({
          id: b.id,
          service: b.service,
          city: b.address.split(',').pop()?.trim() || 'Oklahoma',
          firstName: b.name.split(' ')[0],
          createdAt: b.createdAt,
        }));
      
      res.json(recentBookings);
    } catch (error) {
      console.error("Error fetching recent bookings:", error);
      res.status(500).json({ error: "Failed to fetch recent bookings" });
    }
  });

  // Public endpoint for business stats
  app.get("/api/public/stats", async (_req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      const bookings = await storage.getBookings();
      const completedBookings = bookings.filter(b => b.status === 'completed').length;
      
      // Get average rating from reviews
      const reviews = await storage.getReviews();
      const approvedReviews = reviews.filter(r => r.status === 'approved' && r.rating);
      const avgRating = approvedReviews.length > 0
        ? approvedReviews.reduce((sum, r) => sum + r.rating!, 0) / approvedReviews.length
        : 5.0;
      
      res.json({
        homesClean: completedBookings,
        averageRating: Math.round(avgRating * 10) / 10,
        ecoFriendly: 100,
        reviewCount: approvedReviews.length,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Public endpoint for featured photos
  app.get("/api/public/featured-photos", async (_req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      const photos = await storage.getJobPhotos();
      const featured = photos
        .filter((p: JobPhoto) => p.isFeatured)
        .sort((a: JobPhoto, b: JobPhoto) => (b.displayOrder || 0) - (a.displayOrder || 0))
        .slice(0, 6);
      
      res.json(featured);
    } catch (error) {
      console.error("Error fetching featured photos:", error);
      res.status(500).json({ error: "Failed to fetch featured photos" });
    }
  });

  // Customer profile routes (admin only)
  app.get("/api/customers/:email/profile", isAuthenticated, async (req, res) => {
    try {
      const { email } = req.params;
      
      // Get customer details
      const customer = await storage.getCustomerByEmail(email);
      
      // Get all bookings for this customer
      const bookings = await storage.getBookingsByEmail(email);
      
      // Get all quotes for this customer
      const quotes = await storage.getQuotes();
      const customerQuotes = quotes.filter(q => q.email === email);
      
      // Get all invoices for this customer
      const invoices = await storage.getInvoices();
      const customerInvoices = invoices.filter(i => i.customerEmail === email);
      
      // Get all notes for this customer
      const notes = await storage.getCustomerNotesByEmail(email);
      
      // Calculate customer stats
      const totalSpent = customerInvoices
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + (i.total || 0), 0);
      
      const completedBookings = bookings.filter(b => b.status === 'completed').length;
      
      res.json({
        customer,
        bookings,
        quotes: customerQuotes,
        invoices: customerInvoices,
        notes,
        stats: {
          totalSpent,
          completedBookings,
          totalBookings: bookings.length,
          totalQuotes: customerQuotes.length,
        },
      });
    } catch (error) {
      console.error("Error fetching customer profile:", error);
      res.status(500).json({ error: "Failed to fetch customer profile" });
    }
  });

  app.post("/api/customers/:email/notes", isAuthenticated, async (req, res) => {
    try {
      const { email } = req.params;
      const { note } = req.body;
      
      if (!note) {
        return res.status(400).json({ error: "Note is required" });
      }
      
      const createdBy = (req.user as User)?.id || 'admin';
      const createdByName = (req.user as User)?.username || 'Admin';
      
      const newNote = await storage.createCustomerNote({
        customerEmail: email,
        note,
        createdBy,
        createdByName,
      });
      
      res.status(201).json(newNote);
    } catch (error) {
      console.error("Error creating customer note:", error);
      res.status(500).json({ error: "Failed to create note" });
    }
  });

  app.delete("/api/customers/notes/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCustomerNote(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting customer note:", error);
      res.status(500).json({ error: "Failed to delete note" });
    }
  });

  // Customer CLV metrics endpoint
  app.get("/api/customers/:id/metrics", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get customer
      const customer = await storage.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      
      // Get all data for this customer
      const [bookings, quotes, invoices] = await Promise.all([
        storage.getBookingsByEmail(customer.email),
        storage.getQuotes().then(all => all.filter(q => q.email === customer.email)),
        storage.getInvoices().then(all => all.filter(i => i.customerEmail === customer.email)),
      ]);
      
      // Calculate total lifetime revenue (sum of all paid invoices)
      const totalLifetimeRevenue = invoices
        .filter(inv => inv.status === "paid")
        .reduce((sum, inv) => sum + inv.total, 0);
      
      // Total counts
      const totalBookings = bookings.length;
      const totalQuotes = quotes.length;
      
      // Calculate average booking value (from paid invoices)
      const paidInvoices = invoices.filter(inv => inv.status === "paid");
      const avgBookingValue = paidInvoices.length > 0 
        ? Math.round(totalLifetimeRevenue / paidInvoices.length) 
        : 0;
      
      // Repeat rate (percentage of customers with more than 1 booking)
      const repeatRate = totalBookings > 1 ? 100 : 0;
      
      // First and last booking dates
      const sortedBookings = [...bookings].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      const firstBookingDate = sortedBookings.length > 0 
        ? sortedBookings[0].createdAt 
        : customer.createdAt;
      const lastBookingDate = sortedBookings.length > 0 
        ? sortedBookings[sortedBookings.length - 1].createdAt 
        : customer.createdAt;
      
      // Calculate days as customer
      const firstDate = new Date(firstBookingDate);
      const now = new Date();
      const daysAsCustomer = Math.floor((now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Customer status classification
      let customerStatus: "New" | "Active" | "Loyal";
      if (daysAsCustomer < 30) {
        customerStatus = "New";
      } else if (daysAsCustomer < 180) {
        customerStatus = "Active";
      } else {
        customerStatus = "Loyal";
      }
      
      res.json({
        totalLifetimeRevenue,
        totalBookings,
        totalQuotes,
        avgBookingValue,
        repeatRate,
        firstBookingDate,
        lastBookingDate,
        daysAsCustomer,
        customerStatus,
      });
    } catch (error) {
      console.error("Error fetching customer metrics:", error);
      res.status(500).json({ error: "Failed to fetch customer metrics" });
    }
  });

  // Recurring booking routes
  app.get("/api/recurring-bookings", isAuthenticated, async (_req, res) => {
    try {
      const recurringBookings = await storage.getRecurringBookings();
      res.json(recurringBookings);
    } catch (error) {
      console.error("Error fetching recurring bookings:", error);
      res.status(500).json({ error: "Failed to fetch recurring bookings" });
    }
  });

  app.post("/api/recurring-bookings", async (req, res) => {
    try {
      const validatedData = insertRecurringBookingSchema.parse(req.body);
      const recurringBooking = await storage.createRecurringBooking(validatedData);

      await logActivity({
        context: getUserContext(req),
        action: 'created',
        entityType: 'recurring_booking',
        entityId: recurringBooking.id,
        entityName: `${recurringBooking.frequency} - ${recurringBooking.service}`,
      });

      res.status(201).json(recurringBooking);
    } catch (error) {
      console.error("Error creating recurring booking:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create recurring booking" });
    }
  });

  app.get("/api/recurring-bookings/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const recurringBooking = await storage.getRecurringBooking(id);
      
      if (!recurringBooking) {
        return res.status(404).json({ error: "Recurring booking not found" });
      }
      
      res.json(recurringBooking);
    } catch (error) {
      console.error("Error fetching recurring booking:", error);
      res.status(500).json({ error: "Failed to fetch recurring booking" });
    }
  });

  app.patch("/api/recurring-bookings/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertRecurringBookingSchema.partial().parse(req.body);
      const recurringBooking = await storage.updateRecurringBooking(id, updates);

      if (!recurringBooking) {
        return res.status(404).json({ error: "Recurring booking not found" });
      }

      await logActivity({
        context: getUserContext(req),
        action: 'updated',
        entityType: 'recurring_booking',
        entityId: recurringBooking.id,
        entityName: `${recurringBooking.frequency} - ${recurringBooking.service}`,
      });

      res.json(recurringBooking);
    } catch (error) {
      console.error("Error updating recurring booking:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update recurring booking" });
    }
  });

  app.delete("/api/recurring-bookings/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const recurringBooking = await storage.getRecurringBooking(id);
      
      if (!recurringBooking) {
        return res.status(404).json({ error: "Recurring booking not found" });
      }

      await storage.deleteRecurringBooking(id);

      await logActivity({
        context: getUserContext(req),
        action: 'deleted',
        entityType: 'recurring_booking',
        entityId: id,
        entityName: `${recurringBooking.frequency} - ${recurringBooking.service}`,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting recurring booking:", error);
      res.status(500).json({ error: "Failed to delete recurring booking" });
    }
  });

  // Job photo routes
  app.get("/api/job-photos/:bookingId", async (req, res) => {
    try {
      const { bookingId } = req.params;
      
      // Allow access if user is authenticated (admin/employee) or has valid management token
      if (!req.isAuthenticated() && !req.user) {
        // For now, allow unauthenticated access - could be enhanced with management token validation
        // In production, should verify customer email or management token
      }
      
      const photos = await storage.getJobPhotosByBooking(bookingId);
      res.json(photos);
    } catch (error) {
      console.error("Error fetching job photos:", error);
      res.status(500).json({ error: "Failed to fetch job photos" });
    }
  });

  app.post("/api/job-photos", async (req, res) => {
    try {
      // Check if user is authenticated (admin or employee)
      const isAdmin = req.isAuthenticated();
      const isEmployee = !!(req.session as any).employee;
      
      if (!isAdmin && !isEmployee) {
        return res.status(401).json({ error: "Unauthorized - must be logged in as admin or employee" });
      }

      const validatedData = insertJobPhotoSchema.parse(req.body);
      
      // Validate photo data size (limit to ~5MB base64)
      const maxPhotoSize = 5 * 1024 * 1024; // 5MB in bytes
      if (validatedData.photoData.length > maxPhotoSize) {
        return res.status(400).json({ 
          error: "Photo too large", 
          details: "Photo must be less than 5MB" 
        });
      }

      // Validate photo data format (must be base64 image)
      if (!validatedData.photoData.startsWith('data:image/')) {
        return res.status(400).json({ 
          error: "Invalid photo format", 
          details: "Photo must be a valid base64-encoded image" 
        });
      }

      const photo = await storage.createJobPhoto(validatedData);

      await logActivity({
        context: getUserContext(req),
        action: 'other',
        entityType: 'booking',
        entityId: photo.bookingId,
        entityName: `Photo uploaded: ${photo.photoType}`,
      });

      res.status(201).json(photo);
    } catch (error) {
      console.error("Error creating job photo:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create job photo" });
    }
  });

  app.delete("/api/job-photos/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const photo = await storage.getJobPhoto(id);
      
      if (!photo) {
        return res.status(404).json({ error: "Photo not found" });
      }

      await storage.deleteJobPhoto(id);

      await logActivity({
        context: getUserContext(req),
        action: 'deleted',
        entityType: 'job_photo',
        entityId: id,
        entityName: `Photo: ${photo.photoType}`,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting job photo:", error);
      res.status(500).json({ error: "Failed to delete job photo" });
    }
  });

  // Analytics endpoints
  app.get("/api/analytics/metrics", isAuthenticated, async (req, res) => {
    try {
      const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : null;
      const toDate = req.query.toDate ? new Date(req.query.toDate as string) : null;
      
      const isInDateRange = (date: Date | null) => {
        if (!date) return true;
        if (!fromDate && !toDate) return true;
        if (fromDate && toDate) {
          return date >= fromDate && date <= toDate;
        }
        if (fromDate) return date >= fromDate;
        if (toDate) return date <= toDate;
        return true;
      };
      
      const [bookings, invoices, customers] = await Promise.all([
        storage.getBookings(),
        storage.getInvoices(),
        storage.getCustomers(),
      ]);
      
      // Filter by date range
      const filteredBookings = bookings.filter(b => 
        isInDateRange(b.date ? new Date(b.date) : null)
      );
      const filteredInvoices = invoices.filter(inv => 
        isInDateRange(inv.createdAt ? new Date(inv.createdAt) : null)
      );
      const filteredCustomers = customers.filter(c => 
        isInDateRange(c.createdAt ? new Date(c.createdAt) : null)
      );

      // Calculate total revenue from paid invoices
      const totalRevenue = filteredInvoices
        .filter(inv => inv.status === "paid")
        .reduce((sum, inv) => sum + inv.total, 0);

      // Calculate average booking value (from completed bookings with invoices)
      const paidInvoiceCount = filteredInvoices.filter(inv => inv.status === "paid").length;
      const avgBookingValue = paidInvoiceCount > 0 ? totalRevenue / paidInvoiceCount : 0;

      res.json({
        totalRevenue,
        avgBookingValue: Math.round(avgBookingValue),
        totalCustomers: filteredCustomers.length,
        totalBookings: filteredBookings.length,
      });
    } catch (error) {
      console.error("Error fetching analytics metrics:", error);
      res.status(500).json({ error: "Failed to fetch analytics metrics" });
    }
  });

  app.get("/api/analytics/revenue-trends", isAuthenticated, async (req, res) => {
    try {
      const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : null;
      const toDate = req.query.toDate ? new Date(req.query.toDate as string) : null;
      
      const isInDateRange = (date: Date | null) => {
        if (!date) return true;
        if (!fromDate && !toDate) return true;
        if (fromDate && toDate) {
          return date >= fromDate && date <= toDate;
        }
        if (fromDate) return date >= fromDate;
        if (toDate) return date <= toDate;
        return true;
      };
      
      const period = (req.query.period as string) || "30";
      const days = parseInt(period);
      const invoices = await storage.getInvoices();

      const now = new Date();
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      // Group by date
      const revenueByDate: Record<string, number> = {};
      
      invoices
        .filter(inv => {
          const createdAt = new Date(inv.createdAt);
          return inv.status === "paid" && 
                 createdAt >= startDate && 
                 isInDateRange(createdAt);
        })
        .forEach(inv => {
          const date = new Date(inv.createdAt).toISOString().split('T')[0];
          revenueByDate[date] = (revenueByDate[date] || 0) + inv.total;
        });

      // Convert to array and sort by date
      const trends = Object.entries(revenueByDate)
        .map(([date, revenue]) => ({ date, revenue }))
        .sort((a, b) => a.date.localeCompare(b.date));

      res.json(trends);
    } catch (error) {
      console.error("Error fetching revenue trends:", error);
      res.status(500).json({ error: "Failed to fetch revenue trends" });
    }
  });

  app.get("/api/analytics/booking-stats", isAuthenticated, async (req, res) => {
    try {
      const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : null;
      const toDate = req.query.toDate ? new Date(req.query.toDate as string) : null;
      
      const isInDateRange = (date: Date | null) => {
        if (!date) return true;
        if (!fromDate && !toDate) return true;
        if (fromDate && toDate) {
          return date >= fromDate && date <= toDate;
        }
        if (fromDate) return date >= fromDate;
        if (toDate) return date <= toDate;
        return true;
      };
      
      const bookings = await storage.getBookings();
      
      // Filter by date range
      const filteredBookings = bookings.filter(b => 
        isInDateRange(b.date ? new Date(b.date) : null)
      );

      const stats = {
        pending: filteredBookings.filter(b => b.status === "pending").length,
        confirmed: filteredBookings.filter(b => b.status === "confirmed").length,
        completed: filteredBookings.filter(b => b.status === "completed").length,
        cancelled: filteredBookings.filter(b => b.status === "cancelled").length,
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching booking stats:", error);
      res.status(500).json({ error: "Failed to fetch booking stats" });
    }
  });

  app.get("/api/analytics/top-services", isAuthenticated, async (req, res) => {
    try {
      const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : null;
      const toDate = req.query.toDate ? new Date(req.query.toDate as string) : null;
      
      const isInDateRange = (date: Date | null) => {
        if (!date) return true;
        if (!fromDate && !toDate) return true;
        if (fromDate && toDate) {
          return date >= fromDate && date <= toDate;
        }
        if (fromDate) return date >= fromDate;
        if (toDate) return date <= toDate;
        return true;
      };
      
      const [bookings, invoices] = await Promise.all([
        storage.getBookings(),
        storage.getInvoices(),
      ]);
      
      // Filter bookings by date range
      const filteredBookings = bookings.filter(b => 
        isInDateRange(b.date ? new Date(b.date) : null)
      );
      
      // Filter invoices by date range
      const filteredInvoices = invoices.filter(inv => 
        isInDateRange(inv.createdAt ? new Date(inv.createdAt) : null)
      );

      // Map invoices by booking ID for quick lookup
      const invoicesByBooking: Record<string, number> = {};
      filteredInvoices
        .filter(inv => inv.status === "paid" && inv.bookingId)
        .forEach(inv => {
          if (inv.bookingId) {
            invoicesByBooking[inv.bookingId] = inv.total;
          }
        });

      // Calculate revenue per service
      const serviceRevenue: Record<string, { revenue: number; count: number }> = {};
      
      filteredBookings.forEach(booking => {
        const revenue = invoicesByBooking[booking.id] || 0;
        if (!serviceRevenue[booking.service]) {
          serviceRevenue[booking.service] = { revenue: 0, count: 0 };
        }
        serviceRevenue[booking.service].revenue += revenue;
        serviceRevenue[booking.service].count += 1;
      });

      // Convert to array and sort by revenue
      const topServices = Object.entries(serviceRevenue)
        .map(([service, data]) => ({
          service,
          revenue: data.revenue,
          count: data.count,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      res.json(topServices);
    } catch (error) {
      console.error("Error fetching top services:", error);
      res.status(500).json({ error: "Failed to fetch top services" });
    }
  });

  app.get("/api/analytics/customer-acquisition", isAuthenticated, async (req, res) => {
    try {
      const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : null;
      const toDate = req.query.toDate ? new Date(req.query.toDate as string) : null;
      
      const isInDateRange = (date: Date | null) => {
        if (!date) return true;
        if (!fromDate && !toDate) return true;
        if (fromDate && toDate) {
          return date >= fromDate && date <= toDate;
        }
        if (fromDate) return date >= fromDate;
        if (toDate) return date <= toDate;
        return true;
      };
      
      const customers = await storage.getCustomers();
      
      // Filter customers by date range
      const filteredCustomers = customers.filter(c => 
        isInDateRange(c.createdAt ? new Date(c.createdAt) : null)
      );

      // Group customers by month
      const customersByMonth: Record<string, number> = {};
      
      filteredCustomers.forEach(customer => {
        const date = new Date(customer.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        customersByMonth[monthKey] = (customersByMonth[monthKey] || 0) + 1;
      });

      // Get last 12 months
      const now = new Date();
      const monthsData = [];
      
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        
        monthsData.push({
          month: monthName,
          count: customersByMonth[monthKey] || 0,
        });
      }

      res.json(monthsData);
    } catch (error) {
      console.error("Error fetching customer acquisition:", error);
      res.status(500).json({ error: "Failed to fetch customer acquisition" });
    }
  });

  app.get("/api/analytics/top-customers", isAuthenticated, async (req, res) => {
    try {
      const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : null;
      const toDate = req.query.toDate ? new Date(req.query.toDate as string) : null;
      
      const isInDateRange = (date: Date | null) => {
        if (!date) return true;
        if (!fromDate && !toDate) return true;
        if (fromDate && toDate) {
          return date >= fromDate && date <= toDate;
        }
        if (fromDate) return date >= fromDate;
        if (toDate) return date <= toDate;
        return true;
      };
      
      const limit = parseInt(req.query.limit as string) || 10;
      
      const [customers, invoices, bookings] = await Promise.all([
        storage.getCustomers(),
        storage.getInvoices(),
        storage.getBookings(),
      ]);
      
      // Filter invoices by date range
      const filteredInvoices = invoices.filter(inv => 
        isInDateRange(inv.createdAt ? new Date(inv.createdAt) : null)
      );
      
      // Filter bookings by date range
      const filteredBookings = bookings.filter(b => 
        isInDateRange(b.date ? new Date(b.date) : null)
      );

      // Calculate lifetime revenue per customer
      const customerMetrics: Record<string, { 
        id: string;
        name: string;
        email: string;
        lifetimeRevenue: number;
        totalBookings: number;
      }> = {};

      // Initialize with all customers
      customers.forEach(customer => {
        customerMetrics[customer.email] = {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          lifetimeRevenue: 0,
          totalBookings: 0,
        };
      });

      // Add revenue from paid invoices (filtered)
      filteredInvoices
        .filter(inv => inv.status === "paid")
        .forEach(inv => {
          if (customerMetrics[inv.customerEmail]) {
            customerMetrics[inv.customerEmail].lifetimeRevenue += inv.total;
          }
        });

      // Add booking counts (filtered)
      filteredBookings.forEach(booking => {
        if (customerMetrics[booking.email]) {
          customerMetrics[booking.email].totalBookings += 1;
        }
      });

      // Convert to array, sort by revenue, and limit results
      const topCustomers = Object.values(customerMetrics)
        .filter(customer => customer.lifetimeRevenue > 0) // Only customers with revenue
        .sort((a, b) => b.lifetimeRevenue - a.lifetimeRevenue)
        .slice(0, limit)
        .map(customer => ({
          id: customer.id,
          name: customer.name,
          email: customer.email,
          lifetimeRevenue: customer.lifetimeRevenue,
          totalBookings: customer.totalBookings,
        }));

      res.json(topCustomers);
    } catch (error) {
      console.error("Error fetching top customers:", error);
      res.status(500).json({ error: "Failed to fetch top customers" });
    }
  });

  // Admin Referral Dashboard: Get overall program stats
  app.get("/api/referrals/stats", isAuthenticated, async (_req, res) => {
    try {
      const allReferrals = await storage.getReferrals();
      const totalReferrals = allReferrals.length;
      const pendingReferrals = allReferrals.filter(r => r.status === 'pending').length;
      const completedReferrals = allReferrals.filter(r => r.status === 'completed' || r.status === 'credited').length;
      
      const totalCreditsAwarded = allReferrals
        .filter(r => r.status === 'credited')
        .reduce((sum, r) => sum + r.creditAmount, 0);
      
      const conversionRate = totalReferrals > 0 ? (completedReferrals / totalReferrals) * 100 : 0;

      res.json({
        totalReferrals,
        pendingReferrals,
        completedReferrals,
        totalCreditsAwarded,
        conversionRate,
      });
    } catch (error) {
      console.error("Error fetching referral stats:", error);
      res.status(500).json({ error: "Failed to fetch referral stats" });
    }
  });

  // Admin Referral Dashboard: Get top referrers leaderboard
  app.get("/api/referrals/top-referrers", isAuthenticated, async (_req, res) => {
    try {
      const allReferrals = await storage.getReferrals();
      const customers = await storage.getCustomers();
      
      const referrerMap = new Map<string, { customer: any; referrals: typeof allReferrals }>();
      
      for (const referral of allReferrals) {
        if (!referrerMap.has(referral.referrerId)) {
          const customer = customers.find(c => c.id === referral.referrerId);
          if (customer) {
            referrerMap.set(referral.referrerId, { customer, referrals: [] });
          }
        }
        referrerMap.get(referral.referrerId)?.referrals.push(referral);
      }

      const topReferrers = Array.from(referrerMap.values())
        .map(({ customer, referrals }) => ({
          customerId: customer.id,
          customerName: customer.name,
          customerEmail: customer.email,
          referralCode: customer.referralCode || '',
          successfulReferrals: referrals.filter(r => r.status === 'credited').length,
          totalCreditsEarned: referrals
            .filter(r => r.status === 'credited')
            .reduce((sum, r) => sum + r.creditAmount, 0),
        }))
        .filter(r => r.successfulReferrals > 0)
        .sort((a, b) => b.successfulReferrals - a.successfulReferrals)
        .slice(0, 50);

      res.json(topReferrers);
    } catch (error) {
      console.error("Error fetching top referrers:", error);
      res.status(500).json({ error: "Failed to fetch top referrers" });
    }
  });

  // Admin Referral Dashboard: Get all referrals with full details
  app.get("/api/referrals/all", isAuthenticated, async (_req, res) => {
    try {
      const allReferrals = await storage.getReferrals();
      const customers = await storage.getCustomers();

      const referralsWithDetails = allReferrals.map(referral => {
        const referrer = customers.find(c => c.id === referral.referrerId);
        const referredCustomer = referral.referredCustomerId 
          ? customers.find(c => c.id === referral.referredCustomerId)
          : null;

        return {
          id: referral.id,
          referrerId: referral.referrerId,
          referrerName: referrer?.name || 'Unknown',
          referredCustomerId: referral.referredCustomerId,
          referredCustomerName: referredCustomer?.name || null,
          referredCustomerEmail: referredCustomer?.email || null,
          referralCode: referral.referralCode,
          bookingId: referral.referredBookingId,
          status: referral.status,
          tierLevel: referral.tier,
          creditAmount: referral.creditAmount,
          createdAt: referral.createdAt.toISOString(),
          completedAt: referral.creditedAt?.toISOString() || null,
        };
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json(referralsWithDetails);
    } catch (error) {
      console.error("Error fetching all referrals:", error);
      res.status(500).json({ error: "Failed to fetch referrals" });
    }
  });

  // Admin Referral Dashboard: Get all customer credit balances
  app.get("/api/referrals/customer-credits", isAuthenticated, async (_req, res) => {
    try {
      const customers = await storage.getCustomers();
      const creditsPromises = customers.map(async (customer) => {
        const credit = await storage.getReferralCredit(customer.id);
        return {
          customerId: customer.id,
          customerName: customer.name,
          customerEmail: customer.email,
          balance: credit?.availableBalance || 0,
        };
      });

      const allCredits = await Promise.all(creditsPromises);
      const creditsWithBalance = allCredits
        .filter(c => c.balance > 0)
        .sort((a, b) => b.balance - a.balance);

      res.json(creditsWithBalance);
    } catch (error) {
      console.error("Error fetching customer credits:", error);
      res.status(500).json({ error: "Failed to fetch customer credits" });
    }
  });

  // Admin Referral Dashboard: Update program settings
  app.patch("/api/referrals/settings", isAuthenticated, async (req, res) => {
    try {
      const { minimumServicePrice, tier1Reward, tier2Reward, tier3Reward } = req.body;
      
      const settings = await storage.getReferralSettings();
      if (!settings) {
        return res.status(404).json({ error: "Referral settings not found" });
      }

      const updates: any = {};
      if (minimumServicePrice !== undefined) updates.minimumServicePrice = minimumServicePrice;
      if (tier1Reward !== undefined) updates.tier1Amount = tier1Reward;
      if (tier2Reward !== undefined) updates.tier2Amount = tier2Reward;
      if (tier3Reward !== undefined) updates.tier3Amount = tier3Reward;

      await storage.upsertReferralSettings({ ...settings, ...updates });

      await logActivity({
        context: getUserContext(req),
        action: 'updated',
        entityType: 'settings',
        entityId: settings.id,
        entityName: 'Referral Program Settings',
        details: `Updated referral program settings`,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating referral settings:", error);
      res.status(500).json({ error: "Failed to update referral settings" });
    }
  });

  // Admin Referral Dashboard: Manually adjust customer credit
  app.post("/api/referrals/adjust-credit", isAuthenticated, async (req, res) => {
    try {
      const { customerId, amount } = req.body;

      if (!customerId || amount === undefined || amount === 0) {
        return res.status(400).json({ error: "Invalid request parameters" });
      }

      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      let credit = await storage.getReferralCredit(customerId);
      if (!credit) {
        credit = await storage.getOrCreateReferralCredit(customerId);
      }

      if (amount > 0) {
        await storage.addReferralCredit(customerId, amount);
      } else {
        const positiveAmount = Math.abs(amount);
        if (credit.availableBalance < positiveAmount) {
          return res.status(400).json({ error: "Insufficient credit balance" });
        }
        await storage.useReferralCredit(customerId, positiveAmount);
      }

      await logActivity({
        context: getUserContext(req),
        action: 'other',
        entityType: 'customer',
        entityId: customerId,
        entityName: customer.name,
        details: `Manually adjusted referral credit: ${amount > 0 ? '+' : ''}$${(amount / 100).toFixed(2)}`,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error adjusting referral credit:", error);
      res.status(500).json({ error: "Failed to adjust referral credit" });
    }
  });

  // Admin Referral Dashboard: Get aggregated statistics
  app.get("/api/admin/referrals/stats", isAuthenticated, async (_req, res) => {
    try {
      const stats = await storage.getAdminReferralStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching referral stats:", error);
      res.status(500).json({ error: "Failed to fetch referral stats" });
    }
  });

  // Admin Referral Dashboard: Get top referrers leaderboard
  app.get("/api/admin/referrals/top-referrers", isAuthenticated, async (_req, res) => {
    try {
      const topReferrers = await storage.getTopReferrers(10);
      res.json(topReferrers);
    } catch (error) {
      console.error("Error fetching top referrers:", error);
      res.status(500).json({ error: "Failed to fetch top referrers" });
    }
  });

  // Admin Referral Dashboard: Get all referrals with optional status filter
  app.get("/api/admin/referrals", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.query;
      let allReferrals = await storage.getReferrals();
      
      if (status && status !== 'all') {
        allReferrals = allReferrals.filter(r => r.status === status);
      }

      const referralsWithDetails = await Promise.all(
        allReferrals.map(async (referral) => {
          const referrer = await storage.getCustomer(referral.referrerId);
          let referredCustomer = null;
          if (referral.referredCustomerId) {
            referredCustomer = await storage.getCustomer(referral.referredCustomerId);
          }

          return {
            id: referral.id,
            referrerId: referral.referrerId,
            referrerName: referrer?.name || 'Unknown',
            referredCustomerId: referral.referredCustomerId,
            referredCustomerName: referredCustomer?.name || null,
            referredCustomerEmail: referredCustomer?.email || null,
            referralCode: referral.referralCode,
            bookingId: referral.referredBookingId,
            status: referral.status,
            tierLevel: referral.tier,
            creditAmount: referral.creditAmount,
            createdAt: referral.createdAt,
            completedAt: referral.creditedAt,
          };
        })
      );

      res.json(referralsWithDetails);
    } catch (error) {
      console.error("Error fetching referrals:", error);
      res.status(500).json({ error: "Failed to fetch referrals" });
    }
  });

  // Admin Referral Dashboard: Get referral settings
  app.get("/api/admin/referral-settings", isAuthenticated, async (_req, res) => {
    try {
      const settings = await storage.getReferralSettings();
      if (!settings) {
        return res.status(404).json({ error: "Referral settings not found" });
      }
      res.json(settings);
    } catch (error) {
      console.error("Error fetching referral settings:", error);
      res.status(500).json({ error: "Failed to fetch referral settings" });
    }
  });

  // Admin Referral Dashboard: Update referral settings
  app.patch("/api/admin/referral-settings", isAuthenticated, async (req, res) => {
    try {
      const updateSchema = z.object({
        enabled: z.boolean().optional(),
        minimumServicePrice: z.number().int().positive().optional(),
        tier1Reward: z.number().int().positive().optional(),
        tier2Reward: z.number().int().positive().optional(),
        tier3Reward: z.number().int().positive().optional(),
      });

      const validatedData = updateSchema.parse(req.body);
      
      const currentSettings = await storage.getReferralSettings();
      if (!currentSettings) {
        return res.status(404).json({ error: "Referral settings not found" });
      }

      const updatedSettings = await storage.upsertReferralSettings({
        ...currentSettings,
        enabled: validatedData.enabled ?? currentSettings.enabled,
        minimumServicePrice: validatedData.minimumServicePrice ?? currentSettings.minimumServicePrice,
        tier1Amount: validatedData.tier1Reward ?? currentSettings.tier1Amount,
        tier2Amount: validatedData.tier2Reward ?? currentSettings.tier2Amount,
        tier3Amount: validatedData.tier3Reward ?? currentSettings.tier3Amount,
      });

      await logActivity({
        context: getUserContext(req),
        action: 'updated',
        entityType: 'settings',
        entityId: updatedSettings.id,
        entityName: 'Referral Program Settings',
        details: `Updated referral program settings`,
      });

      res.json(updatedSettings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Error updating referral settings:", error);
      res.status(500).json({ error: "Failed to update referral settings" });
    }
  });

  // Admin Referral Dashboard: Get all customer credit balances
  app.get("/api/admin/referral-credits", isAuthenticated, async (_req, res) => {
    try {
      const credits = await storage.getAllReferralCredits();
      res.json(credits);
    } catch (error) {
      console.error("Error fetching customer credits:", error);
      res.status(500).json({ error: "Failed to fetch customer credits" });
    }
  });

  // Admin Referral Dashboard: Manually adjust customer credit (new admin namespace endpoint)
  app.post("/api/admin/referral-credits/adjust", isAuthenticated, async (req, res) => {
    try {
      const adjustCreditSchema = z.object({
        customerId: z.string().uuid(),
        amount: z.number().int().refine((val) => val !== 0, {
          message: "Amount cannot be zero",
        }),
      });

      const validatedData = adjustCreditSchema.parse(req.body);

      const customer = await storage.getCustomer(validatedData.customerId);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      let credit = await storage.getReferralCredit(validatedData.customerId);
      if (!credit) {
        credit = await storage.getOrCreateReferralCredit(validatedData.customerId);
      }

      if (validatedData.amount > 0) {
        await storage.addReferralCredit(validatedData.customerId, validatedData.amount);
      } else {
        const positiveAmount = Math.abs(validatedData.amount);
        if (credit.availableBalance < positiveAmount) {
          return res.status(400).json({ error: "Insufficient credit balance" });
        }
        await storage.useReferralCredit(validatedData.customerId, positiveAmount);
      }

      await logActivity({
        context: getUserContext(req),
        action: 'other',
        entityType: 'customer',
        entityId: validatedData.customerId,
        entityName: customer.name,
        details: `Manually adjusted referral credit: ${validatedData.amount > 0 ? '+' : ''}$${(validatedData.amount / 100).toFixed(2)}`,
      });

      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Error adjusting referral credit:", error);
      res.status(500).json({ error: "Failed to adjust referral credit" });
    }
  });

  // Get referral info for invoice creation (check if customer was referred and has credits)
  app.get("/api/invoices/referral-info/:customerId", isAuthenticated, async (req, res) => {
    try {
      const { customerId } = req.params;
      
      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      // Check if customer was referred (has a booking with referralCode)
      const allBookings = await storage.getBookings();
      const customerBookings = allBookings.filter(b => b.customerId === customerId);
      const referredBooking = customerBookings.find(b => b.referralCode);
      
      // Get customer's referral credits
      const credits = await storage.getReferralCredit(customerId);
      const availableCredits = credits?.availableBalance || 0;

      // Get referral settings for tier calculation
      const settings = await storage.getReferralSettings();
      
      let hasReferralDiscount = false;
      let referralAmount = 0;
      let tierLevel = 0;

      if (referredBooking) {
        hasReferralDiscount = true;
        // Determine tier based on first booking
        tierLevel = 1;
        // Use settings if available (handle both potential field names), otherwise use default $10 (1000 cents)
        referralAmount = settings ? ((settings as any).tier1Reward || settings.tier1Amount || 1000) : 1000;
        
        console.log(`Referral info for customer ${customerId}:`, {
          hasReferralDiscount,
          referralAmount,
          tierLevel,
          settingsFound: !!settings,
          tier1Reward: (settings as any)?.tier1Reward,
          tier1Amount: settings?.tier1Amount,
        });
      }

      res.json({
        hasReferralDiscount,
        referralAmount,
        tierLevel,
        availableCredits,
      });
    } catch (error) {
      console.error("Error fetching referral info:", error);
      res.status(500).json({ error: "Failed to fetch referral info" });
    }
  });

  // Churn risk endpoints
  app.get("/api/customers/:id/churn-risk", isAuthenticated, async (req, res) => {
    try {
      const risk = await storage.calculateCustomerChurnRisk(req.params.id);
      await storage.updateCustomerChurnRisk(req.params.id, risk.risk);
      res.json(risk);
    } catch (error) {
      console.error("Error calculating churn risk:", error);
      res.status(500).json({ error: "Failed to calculate churn risk" });
    }
  });

  app.post("/api/customers/churn-risk/recompute", isAuthenticated, async (req, res) => {
    try {
      const allCustomers = await storage.getCustomers();
      let updated = 0;
      
      for (const customer of allCustomers) {
        const risk = await storage.calculateCustomerChurnRisk(customer.id);
        await storage.updateCustomerChurnRisk(customer.id, risk.risk);
        updated++;
      }
      
      res.json({ message: `Updated churn risk for ${updated} customers` });
    } catch (error) {
      console.error("Error recomputing churn risk:", error);
      res.status(500).json({ error: "Failed to recompute churn risk" });
    }
  });

  app.get("/api/customers/at-risk", isAuthenticated, async (req, res) => {
    try {
      const customers = await storage.getAtRiskCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching at-risk customers:", error);
      res.status(500).json({ error: "Failed to fetch at-risk customers" });
    }
  });

  // Anomaly alert endpoints
  app.post("/api/alerts", isAuthenticated, async (req, res) => {
    try {
      const validatedData = createAnomalyAlertSchema.parse(req.body);
      const alert = await storage.createAnomalyAlert(validatedData);
      res.json(alert);
    } catch (error) {
      console.error("Error creating anomaly alert:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create anomaly alert" });
    }
  });

  app.get("/api/alerts", isAuthenticated, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const alerts = await storage.getAnomalyAlerts(status);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching anomaly alerts:", error);
      res.status(500).json({ error: "Failed to fetch anomaly alerts" });
    }
  });

  app.get("/api/alerts/:id", isAuthenticated, async (req, res) => {
    try {
      const alert = await storage.getAnomalyAlert(req.params.id);
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }
      res.json(alert);
    } catch (error) {
      console.error("Error fetching anomaly alert:", error);
      res.status(500).json({ error: "Failed to fetch anomaly alert" });
    }
  });

  app.patch("/api/alerts/:id/acknowledge", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const alert = await storage.acknowledgeAnomalyAlert(req.params.id, userId);
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }
      res.json(alert);
    } catch (error) {
      console.error("Error acknowledging anomaly alert:", error);
      res.status(500).json({ error: "Failed to acknowledge anomaly alert" });
    }
  });

  app.patch("/api/alerts/:id/resolve", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const alert = await storage.resolveAnomalyAlert(req.params.id, userId);
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }
      res.json(alert);
    } catch (error) {
      console.error("Error resolving anomaly alert:", error);
      res.status(500).json({ error: "Failed to resolve anomaly alert" });
    }
  });

  app.delete("/api/alerts/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteAnomalyAlert(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting anomaly alert:", error);
      res.status(500).json({ error: "Failed to delete anomaly alert" });
    }
  });

  // Quick actions dashboard endpoint
  app.get("/api/quick-actions", isAuthenticated, async (req, res) => {
    try {
      const counts = await storage.getQuickActionsCounts();
      res.json(counts);
    } catch (error) {
      console.error("Error fetching quick actions:", error);
      res.status(500).json({ error: "Failed to fetch quick actions" });
    }
  });

  // Intelligence Dashboard overview endpoint
  app.get("/api/intelligence-overview", isAuthenticated, async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    try {
      const overview = await storage.getIntelligenceOverview();
      res.json(overview);
    } catch (error) {
      console.error("Error fetching intelligence overview:", error);
      res.status(500).json({ error: "Failed to fetch intelligence overview" });
    }
  });

  // Global search endpoint
  app.get("/api/global-search", isAuthenticated, async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    try {
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!query || query.trim().length < 2) {
        return res.json({ bookings: [], customers: [], quotes: [] });
      }

      const results = await storage.globalSearch(query, limit);
      res.json(results);
    } catch (error) {
      console.error("Error performing global search:", error);
      res.status(500).json({ error: "Failed to perform search" });
    }
  });

  // Message enhancement endpoints
  app.patch("/api/messages/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = updateContactMessageSchema.parse(req.body);
      const message = await storage.updateContactMessage(req.params.id, validatedData);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      res.json(message);
    } catch (error) {
      console.error("Error updating message:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update message" });
    }
  });

  app.patch("/api/messages/:id/assign", isAuthenticated, async (req, res) => {
    try {
      const validatedData = assignMessageSchema.parse(req.body);
      const message = await storage.assignContactMessage(req.params.id, validatedData.employeeId);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      res.json(message);
    } catch (error) {
      console.error("Error assigning message:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to assign message" });
    }
  });

  app.post("/api/messages/:id/reply", isAuthenticated, async (req, res) => {
    try {
      const validatedData = replyMessageSchema.parse(req.body);
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const message = await storage.replyToContactMessage(req.params.id, validatedData.replyMessage, userId);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      res.json(message);
    } catch (error) {
      console.error("Error replying to message:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to reply to message" });
    }
  });

  app.get("/api/messages/unread", isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getUnreadMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching unread messages:", error);
      res.status(500).json({ error: "Failed to fetch unread messages" });
    }
  });

  // Customer enhancement endpoints
  app.patch("/api/customers/:id/tags", isAuthenticated, async (req, res) => {
    try {
      const validatedData = updateCustomerTagsSchema.parse(req.body);
      const customer = await storage.updateCustomerTags(req.params.id, validatedData.tags);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer tags:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update customer tags" });
    }
  });

  app.post("/api/customers/:id/auto-tag", isAuthenticated, async (req, res) => {
    try {
      const customer = await storage.autoTagCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error auto-tagging customer:", error);
      res.status(500).json({ error: "Failed to auto-tag customer" });
    }
  });

  app.get("/api/customers/by-tag/:tag", isAuthenticated, async (req, res) => {
    try {
      const customers = await storage.getCustomersByTag(req.params.tag);
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers by tag:", error);
      res.status(500).json({ error: "Failed to fetch customers by tag" });
    }
  });

  // Employee availability endpoints
  app.post("/api/employees/suggest", isAuthenticated, async (req, res) => {
    try {
      const validatedData = suggestEmployeesSchema.parse(req.body);
      const employees = await storage.getSuggestedEmployees(validatedData.date, validatedData.timeSlot);
      res.json(employees);
    } catch (error) {
      console.error("Error suggesting employees:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to suggest employees" });
    }
  });

  app.get("/api/employees/:id/workload", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Start date and end date are required" });
      }
      const workload = await storage.getEmployeeWorkload(
        req.params.id,
        startDate as string,
        endDate as string
      );
      res.json(workload);
    } catch (error) {
      console.error("Error fetching employee workload:", error);
      res.status(500).json({ error: "Failed to fetch employee workload" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
