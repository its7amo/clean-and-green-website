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
  password: varchar("password"),
  phone: text("phone").notNull(),
  role: text("role").notNull().default("employee"),
  active: boolean("active").notNull().default(true),
  userId: varchar("user_id").references(() => users.id),
  availability: jsonb("availability").$type<{
    monday?: { start: string; end: string; available: boolean };
    tuesday?: { start: string; end: string; available: boolean };
    wednesday?: { start: string; end: string; available: boolean };
    thursday?: { start: string; end: string; available: boolean };
    friday?: { start: string; end: string; available: boolean };
    saturday?: { start: string; end: string; available: boolean };
    sunday?: { start: string; end: string; available: boolean };
  }>(),
  vacationDays: text("vacation_days").array(),
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

// Employee permissions table for granular access control
export const employeePermissions = pgTable("employee_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  feature: text("feature").notNull(), // dashboard, bookings, quotes, etc
  actions: jsonb("actions").notNull().$type<string[]>(), // ['view', 'create', 'edit', 'delete']
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertEmployeePermissionSchema = createInsertSchema(employeePermissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployeePermission = z.infer<typeof insertEmployeePermissionSchema>;
export type EmployeePermission = typeof employeePermissions.$inferSelect;

export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").references(() => customers.id),
  leadType: text("lead_type").notNull().default("web"), // 'web' or 'phone'
  service: text("service").notNull(),
  propertySize: text("property_size").notNull(),
  date: text("date").notNull(),
  timeSlot: text("time_slot").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  status: text("status").notNull().default("pending"),
  completedDate: timestamp("completed_date"),
  reviewEmailSent: boolean("review_email_sent").notNull().default(false),
  managementToken: varchar("management_token").notNull().default(sql`gen_random_uuid()`),
  assignedEmployeeIds: text("assigned_employee_ids").array(),
  paymentMethodId: text("payment_method_id"),
  cancellationFeeStatus: text("cancellation_fee_status").notNull().default("not_applicable"),
  cancelledAt: timestamp("cancelled_at"),
  promoCode: text("promo_code"),
  referralCode: text("referral_code"),
  discountAmount: integer("discount_amount").default(0),
  actualPrice: integer("actual_price"), // Admin-entered actual quoted price in cents (for variable pricing with promos)
  reminderSent: boolean("reminder_sent").notNull().default(false),
  reminderSentAt: timestamp("reminder_sent_at"),
  followUpSent: boolean("follow_up_sent").notNull().default(false),
  recurringBookingId: varchar("recurring_booking_id"),
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
  customerId: varchar("customer_id").references(() => customers.id),
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

// Contact messages from the contact form
export const contactMessages = pgTable("contact_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  status: text("status").notNull().default("new"), // new, in_progress, replied, closed, spam
  assignedTo: varchar("assigned_to").references(() => employees.id),
  replyMessage: text("reply_message"),
  repliedAt: timestamp("replied_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type ContactMessage = typeof contactMessages.$inferSelect;

// Customers table for unified customer management
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
  notes: text("notes"),
  tags: text("tags").array(), // vip, at-risk, new, referral-champion
  referralCode: varchar("referral_code").unique(),
  totalBookings: integer("total_bookings").notNull().default(0),
  totalQuotes: integer("total_quotes").notNull().default(0),
  totalInvoices: integer("total_invoices").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  totalBookings: true,
  totalQuotes: true,
  totalInvoices: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

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
  serviceAreas: text("service_areas").array(),
  socialLinks: jsonb("social_links").$type<{
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  }>(),
  privacyPolicy: text("privacy_policy"),
  termsOfService: text("terms_of_service"),
  cancellationPolicy: text("cancellation_policy"),
  promoBannerEnabled: boolean("promo_banner_enabled").notNull().default(true),
  promoBannerMessage: text("promo_banner_message"),
  statsCounterEnabled: boolean("stats_counter_enabled").notNull().default(true),
  reviewEmailEnabled: boolean("review_email_enabled").notNull().default(true),
  followUpEmailEnabled: boolean("follow_up_email_enabled").notNull().default(true),
  reminderEmailEnabled: boolean("reminder_email_enabled").notNull().default(true),
  reviewEmailSubject: text("review_email_subject"),
  reviewEmailBody: text("review_email_body"),
  followUpEmailSubject: text("follow_up_email_subject"),
  followUpEmailBody: text("follow_up_email_body"),
  reminderEmailSubject: text("reminder_email_subject"),
  reminderEmailBody: text("reminder_email_body"),
  paymentReminderEnabled: boolean("payment_reminder_enabled").notNull().default(true),
  paymentReminder3DaySubject: text("payment_reminder_3day_subject"),
  paymentReminder3DayBody: text("payment_reminder_3day_body"),
  paymentReminder7DaySubject: text("payment_reminder_7day_subject"),
  paymentReminder7DayBody: text("payment_reminder_7day_body"),
  paymentReminder14DaySubject: text("payment_reminder_14day_subject"),
  paymentReminder14DayBody: text("payment_reminder_14day_body"),
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
  customerId: varchar("customer_id").references(() => customers.id),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerAddress: text("customer_address").notNull(),
  serviceDescription: text("service_description").notNull(),
  amount: integer("amount").notNull(),
  discountAmount: integer("discount_amount").default(0),
  discountDescription: text("discount_description"),
  referralDiscountApplied: integer("referral_discount_applied").default(0),
  referralCreditApplied: integer("referral_credit_applied").default(0),
  tax: integer("tax").notNull().default(0),
  total: integer("total").notNull(),
  status: text("status").notNull().default("draft"),
  dueDate: timestamp("due_date"),
  paidDate: timestamp("paid_date"),
  reviewEmailSent: boolean("review_email_sent").notNull().default(false),
  lastReminderSentAt: timestamp("last_reminder_sent_at"),
  reminderCount: integer("reminder_count").notNull().default(0),
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

// Reviews table for customer testimonials
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").references(() => bookings.id),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  approvedAt: timestamp("approved_at"),
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
  approvedAt: true,
});

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

// Newsletter subscribers
export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name"),
  active: boolean("active").notNull().default(true),
  subscribedAt: timestamp("subscribed_at").notNull().default(sql`now()`),
});

export const insertNewsletterSubscriberSchema = createInsertSchema(newsletterSubscribers).omit({
  id: true,
  subscribedAt: true,
});

export type InsertNewsletterSubscriber = z.infer<typeof insertNewsletterSubscriberSchema>;
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;

// Team members for team page
export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  role: text("role").notNull(),
  description: text("description"),
  photoUrl: text("photo_url"),
  order: integer("order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;

// Activity logs for audit trail
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  userRole: text("user_role").notNull(), // 'owner', 'manager', 'employee'
  userName: text("user_name").notNull(),
  action: text("action").notNull(), // 'created', 'updated', 'deleted'
  entityType: text("entity_type").notNull(), // 'booking', 'quote', 'invoice', 'customer', etc
  entityId: varchar("entity_id").notNull(),
  entityName: text("entity_name"), // Human-readable identifier
  changes: jsonb("changes").$type<{
    before?: Record<string, any>;
    after?: Record<string, any>;
  }>(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

// Recurring bookings for scheduled cleanings
export const recurringBookings = pgTable("recurring_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").references(() => customers.id),
  service: text("service").notNull(),
  propertySize: text("property_size").notNull(),
  frequency: text("frequency").notNull(), // 'weekly', 'bi-weekly', 'monthly'
  preferredTimeSlot: text("preferred_time_slot").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"), // Optional end date
  nextOccurrence: text("next_occurrence").notNull(),
  status: text("status").notNull().default("active"), // 'active', 'paused', 'cancelled'
  assignedEmployeeIds: text("assigned_employee_ids").array(),
  promoCode: text("promo_code"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertRecurringBookingSchema = createInsertSchema(recurringBookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRecurringBooking = z.infer<typeof insertRecurringBookingSchema>;
export type RecurringBooking = typeof recurringBookings.$inferSelect;

// Promo codes for discounts
export const promoCodes = pgTable("promo_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  description: text("description").notNull(),
  discountType: text("discount_type").notNull(), // 'percentage', 'fixed'
  discountValue: integer("discount_value").notNull(), // Percentage (0-100) or cents for fixed
  validFrom: timestamp("valid_from").notNull(),
  validTo: timestamp("valid_to").notNull(),
  maxUses: integer("max_uses"), // null for unlimited
  currentUses: integer("current_uses").notNull().default(0),
  status: text("status").notNull().default("active"), // 'active', 'inactive'
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({
  id: true,
  currentUses: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  validFrom: z.coerce.date(),
  validTo: z.coerce.date(),
});

export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type PromoCode = typeof promoCodes.$inferSelect;

// Job photos for before/after documentation
export const jobPhotos = pgTable("job_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  photoData: text("photo_data").notNull(), // Base64 encoded image
  photoType: text("photo_type").notNull(), // 'before', 'after'
  uploadedByEmployeeId: varchar("uploaded_by_employee_id").references(() => employees.id),
  uploadedByName: text("uploaded_by_name").notNull(),
  caption: text("caption"),
  isFeatured: boolean("is_featured").notNull().default(false),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertJobPhotoSchema = createInsertSchema(jobPhotos).omit({
  id: true,
  createdAt: true,
});

export type InsertJobPhoto = z.infer<typeof insertJobPhotoSchema>;
export type JobPhoto = typeof jobPhotos.$inferSelect;

// Customer notes for tracking special requirements and preferences
export const customerNotes = pgTable("customer_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerEmail: text("customer_email").notNull(),
  note: text("note").notNull(),
  createdBy: varchar("created_by").notNull(), // Admin/employee ID who created the note
  createdByName: text("created_by_name").notNull(), // Name for display
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertCustomerNoteSchema = createInsertSchema(customerNotes).omit({
  id: true,
  createdAt: true,
});

export type InsertCustomerNote = z.infer<typeof insertCustomerNoteSchema>;
export type CustomerNote = typeof customerNotes.$inferSelect;

// Email templates for newsletters and customer emails
export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(), // 'promotion', 'announcement', 'thank_you', 'seasonal', 'follow_up'
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  isDefault: boolean("is_default").notNull().default(false), // Pre-loaded templates
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;

// Service areas for zip code validation
export const serviceAreas = pgTable("service_areas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  zipCodes: text("zip_codes").array().notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertServiceAreaSchema = createInsertSchema(serviceAreas).omit({
  id: true,
  createdAt: true,
});

export type InsertServiceArea = z.infer<typeof insertServiceAreaSchema>;
export type ServiceArea = typeof serviceAreas.$inferSelect;

// Referrals - Track who referred who
export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referralCode: text("referral_code").notNull(),
  referrerId: varchar("referrer_id").notNull().references(() => customers.id),
  referredCustomerId: varchar("referred_customer_id").references(() => customers.id),
  referredBookingId: varchar("referred_booking_id").references(() => bookings.id),
  status: text("status").notNull().default("pending"), // pending, completed, credited
  creditAmount: integer("credit_amount").notNull(), // Amount in cents (e.g., 1000 = $10)
  tier: integer("tier").notNull(), // 1, 2, or 3+ for tiered rewards
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  creditedAt: timestamp("credited_at"),
});

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
});

export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;

// Referral Credits - Track customer credit balances
export const referralCredits = pgTable("referral_credits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().unique().references(() => customers.id),
  totalEarned: integer("total_earned").notNull().default(0), // Total earned in cents
  totalUsed: integer("total_used").notNull().default(0), // Total used in cents
  availableBalance: integer("available_balance").notNull().default(0), // Current balance in cents
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertReferralCreditSchema = createInsertSchema(referralCredits).omit({
  id: true,
  updatedAt: true,
});

export type InsertReferralCredit = z.infer<typeof insertReferralCreditSchema>;
export type ReferralCredit = typeof referralCredits.$inferSelect;

// Business settings for referral program control
export const referralSettings = pgTable("referral_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  enabled: boolean("enabled").notNull().default(true),
  tier1Amount: integer("tier1_amount").notNull().default(1000), // $10 in cents
  tier2Amount: integer("tier2_amount").notNull().default(1500), // $15 in cents
  tier3Amount: integer("tier3_amount").notNull().default(2000), // $20 in cents
  minimumServicePrice: integer("minimum_service_price").notNull().default(5000), // $50 minimum
  welcomeEmailEnabled: boolean("welcome_email_enabled").notNull().default(true),
  creditEarnedEmailEnabled: boolean("credit_earned_email_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertReferralSettingsSchema = createInsertSchema(referralSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertReferralSettings = z.infer<typeof insertReferralSettingsSchema>;
export type ReferralSettings = typeof referralSettings.$inferSelect;
