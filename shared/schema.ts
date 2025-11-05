import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, index, jsonb, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Admin users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").notNull().unique(),
  password: varchar("password").notNull(),
  email: varchar("email"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Employees table for staff management
export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  role: text("role").notNull().default("employee"),
  active: boolean("active").notNull().default(true),
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;

export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  service: text("service").notNull(),
  propertySize: text("property_size").notNull(),
  date: text("date").notNull(),
  timeSlot: text("time_slot").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  status: text("status").notNull().default("pending"),
  managementToken: varchar("management_token").notNull().default(sql`gen_random_uuid()`),
  assignedEmployeeId: varchar("assigned_employee_id"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  managementToken: true,
});

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

export const quotes = pgTable("quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceType: text("service_type").notNull(),
  propertySize: text("property_size").notNull(),
  customSize: text("custom_size"),
  details: text("details").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  createdAt: true,
});

export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotes.$inferSelect;

// Services table for dynamic service management
export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  basePrice: integer("base_price").notNull(),
  featured: boolean("featured").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

// Business settings for dynamic site configuration
export const businessSettings = pgTable("business_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessName: text("business_name").notNull(),
  tagline: text("tagline"),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  address: text("address").notNull(),
  logoUrl: text("logo_url"),
  hoursMonFri: text("hours_mon_fri").notNull(),
  hoursSat: text("hours_sat"),
  hoursSun: text("hours_sun"),
  aboutText: text("about_text"),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertBusinessSettingsSchema = createInsertSchema(businessSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertBusinessSettings = z.infer<typeof insertBusinessSettingsSchema>;
export type BusinessSettings = typeof businessSettings.$inferSelect;

// FAQ items
export const faqItems = pgTable("faq_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  order: integer("order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertFaqItemSchema = createInsertSchema(faqItems).omit({
  id: true,
  createdAt: true,
});

export type InsertFaqItem = z.infer<typeof insertFaqItemSchema>;
export type FaqItem = typeof faqItems.$inferSelect;

// Gallery images
export const galleryImages = pgTable("gallery_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  order: integer("order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertGalleryImageSchema = createInsertSchema(galleryImages).omit({
  id: true,
  createdAt: true,
});

export type InsertGalleryImage = z.infer<typeof insertGalleryImageSchema>;
export type GalleryImage = typeof galleryImages.$inferSelect;

// Invoices for billing
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: text("invoice_number").notNull().unique(),
  bookingId: varchar("booking_id").references(() => bookings.id),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerAddress: text("customer_address").notNull(),
  serviceDescription: text("service_description").notNull(),
  amount: integer("amount").notNull(),
  tax: integer("tax").notNull().default(0),
  total: integer("total").notNull(),
  status: text("status").notNull().default("draft"),
  dueDate: timestamp("due_date"),
  paidDate: timestamp("paid_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  dueDate: z.coerce.date().nullable().optional(),
});

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;
