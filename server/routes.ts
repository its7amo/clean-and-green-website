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
} from "@shared/schema";
import { z } from "zod";
import { setupAuth, isAuthenticated, hashPassword } from "./auth";
import { sendQuoteNotification, sendBookingNotification, sendCustomerBookingConfirmation, sendCustomerQuoteConfirmation, sendBookingChangeNotification, sendContactMessageNotification, resend, escapeHtml } from "./email";
import { sendBookingConfirmationSMS, sendInvoicePaymentLinkSMS, sendEmployeeAssignmentSMS } from "./sms";
import { logActivity, getUserContext } from "./activityLogger";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('Warning: STRIPE_SECRET_KEY not set. Payment features will not work.');
}

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-10-29.clover" })
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

  // Booking routes (public submissions, protected admin actions)
  app.post("/api/bookings", async (req, res) => {
    try {
      const validatedData = insertBookingSchema.parse(req.body);
      
      // Find or create customer (deduplication)
      const customer = await storage.findOrCreateCustomer(
        validatedData.name,
        validatedData.email,
        validatedData.phone,
        validatedData.address
      );
      
      // Create booking with customer link and leadType
      const booking = await storage.createBooking({
        ...validatedData,
        customerId: customer.id,
        leadType: 'web', // Public endpoint = web lead
      });
      
      // Increment customer booking count
      await storage.incrementCustomerBookings(customer.id);
      
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
            
            // Send confirmation to customer
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
            
            // Send SMS confirmation to customer
            await sendBookingConfirmationSMS(
              booking.phone,
              booking.name,
              booking.service,
              new Date(booking.date),
              booking.timeSlot
            );
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
      
      // Find or create customer
      const customer = await storage.findOrCreateCustomer(
        validatedData.name,
        validatedData.email,
        validatedData.phone,
        validatedData.address
      );
      
      // Create booking with customer link and leadType='phone'
      const booking = await storage.createBooking({
        ...validatedData,
        customerId: customer.id,
        leadType: 'phone', // Manual creation = phone lead
      });
      
      // Increment customer booking count
      await storage.incrementCustomerBookings(customer.id);
      
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
      
      // Send status update email to customer (async, don't block response)
      (async () => {
        try {
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
        status: z.enum(["pending", "cancelled"]).optional(),
      });
      
      const validatedData = updateSchema.parse(req.body);
      
      // If cancelling, check if within 24 hours and set fee status
      let additionalData = {};
      if (validatedData.status === 'cancelled') {
        const appointmentDateTime = new Date(`${existing.date}T${convertTimeSlotTo24Hour(existing.timeSlot)}`);
        const now = new Date();
        const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        additionalData = {
          cancelledAt: new Date(),
          cancellationFeeStatus: hoursUntilAppointment < 24 ? 'pending' : 'not_applicable',
        };
      }
      
      const booking = await storage.updateBooking(existing.id, { ...validatedData, ...additionalData });
      
      // Notify business owner of changes
      (async () => {
        try {
          const settings = await storage.getBusinessSettings();
          if (settings && booking) {
            const action = validatedData.status === 'cancelled' ? 'cancelled' : 'rescheduled';
            await sendBookingChangeNotification({
              name: booking.name,
              email: booking.email,
              phone: booking.phone,
              address: booking.address,
              serviceType: booking.service,
              propertySize: booking.propertySize,
              date: booking.date,
              timeSlot: booking.timeSlot,
              action: action as 'rescheduled' | 'cancelled',
              originalDate: existing.date,
              originalTimeSlot: existing.timeSlot,
            }, settings.email);
          }
        } catch (emailError) {
          console.error("Failed to send booking change notification:", emailError);
        }
      })();
      
      res.json(booking);
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

  // Quote routes (public submissions, protected admin actions)
  app.post("/api/quotes", async (req, res) => {
    try {
      const validatedData = insertQuoteSchema.parse(req.body);
      const quote = await storage.createQuote(validatedData);
      
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
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid quote data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create quote" });
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

  app.patch("/api/quotes/:id/status", isAuthenticated, async (req, res) => {
    try {
      const validatedData = quoteStatusSchema.parse(req.body);
      const quote = await storage.updateQuoteStatus(req.params.id, validatedData.status);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      res.json(quote);
    } catch (error) {
      console.error("Error updating quote status:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid status value", details: error.errors });
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
      const invoice = await storage.createInvoice(validatedData);
      
      // Send payment link notifications if status is "sent" (async, don't block response)
      if (invoice.status === "sent") {
        (async () => {
          try {
            // Send email payment link
            const { sendInvoicePaymentLinkEmail } = await import("./email");
            await sendInvoicePaymentLinkEmail(
              invoice.customerEmail,
              invoice.customerName,
              invoice.invoiceNumber,
              invoice.id,
              invoice.total
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
          const { sendInvoicePaymentLinkEmail } = await import("./email");
          await sendInvoicePaymentLinkEmail(
            invoice.customerEmail,
            invoice.customerName,
            invoice.invoiceNumber,
            invoice.id,
            invoice.total
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
    } catch (error) {
      console.error("Error deleting customer:", error);
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
      const { code, amount } = req.body;

      if (!code) {
        return res.status(400).json({ error: "Promo code is required" });
      }

      const promoCode = await storage.getPromoCodeByCode(code.toUpperCase());

      if (!promoCode) {
        return res.status(404).json({ error: "Invalid promo code" });
      }

      if (promoCode.status !== 'active') {
        return res.status(400).json({ error: "Promo code is not active" });
      }

      const now = new Date();
      if (now < new Date(promoCode.validFrom) || now > new Date(promoCode.validTo)) {
        return res.status(400).json({ error: "Promo code has expired or is not yet valid" });
      }

      if (promoCode.maxUses !== null && promoCode.currentUses >= promoCode.maxUses) {
        return res.status(400).json({ error: "Promo code has reached maximum usage" });
      }

      // Calculate discount
      let discountAmount = 0;
      if (promoCode.discountType === 'percentage') {
        discountAmount = Math.round((amount * promoCode.discountValue) / 100);
      } else {
        discountAmount = promoCode.discountValue;
      }

      res.json({
        valid: true,
        code: promoCode.code,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue,
        discountAmount,
        description: promoCode.description,
      });
    } catch (error) {
      console.error("Error validating promo code:", error);
      res.status(500).json({ error: "Failed to validate promo code" });
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

  const httpServer = createServer(app);

  return httpServer;
}
