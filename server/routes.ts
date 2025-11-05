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
  insertEmployeeSchema
} from "@shared/schema";
import { z } from "zod";
import { setupAuth, isAuthenticated, hashPassword } from "./auth";
import { sendQuoteNotification, sendBookingNotification, sendCustomerBookingConfirmation, sendCustomerQuoteConfirmation, sendBookingChangeNotification } from "./email";
import { sendBookingConfirmationSMS, sendInvoicePaymentLinkSMS, sendEmployeeAssignmentSMS } from "./sms";
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
      const booking = await storage.createBooking(validatedData);
      
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
      const booking = await storage.updateBookingStatus(req.params.id, validatedData.status);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
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
  app.get("/api/bookings/:id/manage", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== 'string') {
        return res.status(401).json({ error: "Token required" });
      }
      
      const booking = await storage.getBookingByToken(req.params.id, token);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found or invalid token" });
      }
      
      res.json(booking);
    } catch (error) {
      console.error("Error fetching booking:", error);
      res.status(500).json({ error: "Failed to fetch booking" });
    }
  });

  app.patch("/api/bookings/:id/manage", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== 'string') {
        return res.status(401).json({ error: "Token required" });
      }
      
      // Verify token first
      const existing = await storage.getBookingByToken(req.params.id, token as string);
      if (!existing) {
        return res.status(404).json({ error: "Booking not found or invalid token" });
      }
      
      const updateSchema = z.object({
        date: z.string().optional(),
        timeSlot: z.string().optional(),
        status: z.enum(["pending", "cancelled"]).optional(),
      });
      
      const validatedData = updateSchema.parse(req.body);
      const booking = await storage.updateBooking(req.params.id, validatedData);
      
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
      
      // Send SMS payment link if status is "sent" (async, don't block response)
      if (invoice.status === "sent") {
        (async () => {
          try {
            await sendInvoicePaymentLinkSMS(
              invoice.customerPhone,
              invoice.customerName,
              invoice.invoiceNumber,
              invoice.id,
              invoice.total
            );
          } catch (smsError) {
            console.error("Failed to send invoice payment link SMS:", smsError);
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

      res.json(updatedInvoice);
    } catch (error) {
      console.error("Error marking invoice as paid:", error);
      res.status(500).json({ error: "Failed to update invoice" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
