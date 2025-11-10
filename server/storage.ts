import {
  type User,
  type InsertUser,
  type Booking,
  type InsertBooking,
  type Quote,
  type InsertQuote,
  type Service,
  type InsertService,
  type BusinessSettings,
  type InsertBusinessSettings,
  type FaqItem,
  type InsertFaqItem,
  type GalleryImage,
  type InsertGalleryImage,
  type Invoice,
  type InsertInvoice,
  type Employee,
  type InsertEmployee,
  type Review,
  type InsertReview,
  type NewsletterSubscriber,
  type InsertNewsletterSubscriber,
  type TeamMember,
  type InsertTeamMember,
  type ContactMessage,
  type InsertContactMessage,
  type Customer,
  type InsertCustomer,
  type ActivityLog,
  type InsertActivityLog,
  type EmployeePermission,
  type InsertEmployeePermission,
  type PromoCode,
  type InsertPromoCode,
  type RecurringBooking,
  type InsertRecurringBooking,
  type JobPhoto,
  type InsertJobPhoto,
  type CustomerNote,
  type InsertCustomerNote,
  type EmailTemplate,
  type InsertEmailTemplate,
  type ServiceArea,
  type InsertServiceArea,
  type Referral,
  type InsertReferral,
  type ReferralCredit,
  type InsertReferralCredit,
  type ReferralSettings,
  type InsertReferralSettings,
  type AnomalyAlert,
  type InsertAnomalyAlert,
  type IntelligenceOverview,
  type GlobalSearchResult,
  type QuotePhoto,
  type InsertQuotePhoto,
  type RescheduleRequest,
  type InsertRescheduleRequest,
  type CmsContent,
  type InsertCmsContent,
  type CmsSection,
  type InsertCmsSection,
  type CmsAsset,
  type InsertCmsAsset,
} from "@shared/schema";
import { db } from "./db";
import {
  users,
  bookings,
  quotes,
  services,
  businessSettings,
  faqItems,
  galleryImages,
  invoices,
  employees,
  employeePermissions,
  reviews,
  newsletterSubscribers,
  teamMembers,
  contactMessages,
  customers,
  activityLogs,
  promoCodes,
  recurringBookings,
  jobPhotos,
  customerNotes,
  emailTemplates,
  serviceAreas,
  referrals,
  referralCredits,
  referralSettings,
  anomalyAlerts,
  quotePhotos,
  rescheduleRequests,
  cmsContent,
  cmsSections,
  cmsAssets,
} from "@shared/schema";
import { eq, desc, sql, or } from "drizzle-orm";

export interface IStorage {
  // Auth user operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  countUsers(): Promise<number>;

  // Booking operations
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBookings(): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | undefined>;
  getBookingByToken(id: string, token: string): Promise<Booking | undefined>;
  getBookingByManagementToken(token: string): Promise<Booking | undefined>;
  getBookingsByEmail(email: string): Promise<Booking[]>;
  updateBooking(id: string, booking: Partial<InsertBooking>): Promise<Booking | undefined>;
  updateBookingStatus(id: string, status: string): Promise<Booking | undefined>;
  deleteBooking(id: string): Promise<void>;

  // Reschedule request operations
  createRescheduleRequest(request: InsertRescheduleRequest): Promise<RescheduleRequest>;
  getRescheduleRequests(): Promise<RescheduleRequest[]>;
  getRescheduleRequest(id: string): Promise<RescheduleRequest | undefined>;
  getRescheduleRequestsByBooking(bookingId: string): Promise<RescheduleRequest[]>;
  getPendingRescheduleRequests(): Promise<RescheduleRequest[]>;
  updateRescheduleRequestStatus(id: string, status: string, decisionBy: string, decisionReason?: string): Promise<RescheduleRequest | undefined>;
  deleteRescheduleRequest(id: string): Promise<void>;

  // Quote operations
  createQuote(quote: InsertQuote): Promise<Quote>;
  getQuotes(): Promise<Quote[]>;
  getQuote(id: string): Promise<Quote | undefined>;
  updateQuoteStatus(id: string, status: string): Promise<Quote | undefined>;
  deleteQuote(id: string): Promise<void>;

  // Quote photo operations
  createQuotePhoto(photo: InsertQuotePhoto): Promise<QuotePhoto>;
  getQuotePhotosByQuote(quoteId: string): Promise<QuotePhoto[]>;
  deleteQuotePhoto(id: string): Promise<void>;

  // Contact message operations
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  getContactMessages(): Promise<ContactMessage[]>;
  getContactMessage(id: string): Promise<ContactMessage | undefined>;
  updateContactMessageStatus(id: string, status: string): Promise<ContactMessage | undefined>;
  deleteContactMessage(id: string): Promise<void>;

  // Service operations
  createService(service: InsertService): Promise<Service>;
  getServices(): Promise<Service[]>;
  getActiveServices(): Promise<Service[]>;
  getService(id: string): Promise<Service | undefined>;
  updateService(id: string, service: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: string): Promise<void>;

  // Business settings operations
  getBusinessSettings(): Promise<BusinessSettings | undefined>;
  upsertBusinessSettings(settings: InsertBusinessSettings): Promise<BusinessSettings>;

  // FAQ operations
  createFaqItem(item: InsertFaqItem): Promise<FaqItem>;
  getFaqItems(): Promise<FaqItem[]>;
  getActiveFaqItems(): Promise<FaqItem[]>;
  getFaqItem(id: string): Promise<FaqItem | undefined>;
  updateFaqItem(id: string, item: Partial<InsertFaqItem>): Promise<FaqItem | undefined>;
  deleteFaqItem(id: string): Promise<void>;

  // Gallery operations
  createGalleryImage(image: InsertGalleryImage): Promise<GalleryImage>;
  getGalleryImages(): Promise<GalleryImage[]>;
  getActiveGalleryImages(): Promise<GalleryImage[]>;
  getGalleryImage(id: string): Promise<GalleryImage | undefined>;
  updateGalleryImage(id: string, image: Partial<InsertGalleryImage>): Promise<GalleryImage | undefined>;
  deleteGalleryImage(id: string): Promise<void>;

  // Invoice operations
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  getInvoices(): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string): Promise<void>;

  // Employee operations
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  getEmployees(): Promise<Employee[]>;
  getActiveEmployees(): Promise<Employee[]>;
  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployeeByEmail(email: string): Promise<Employee | undefined>;
  updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: string): Promise<void>;

  // Employee permission operations
  getEmployeePermissions(employeeId: string): Promise<EmployeePermission[]>;
  setEmployeePermissions(employeeId: string, permissions: Array<{ feature: string, actions: string[] }>): Promise<void>;
  deleteEmployeePermissions(employeeId: string): Promise<void>;

  // Booking assignment operations
  assignEmployeesToBooking(id: string, employeeIds: string[]): Promise<Booking | undefined>;

  // Review operations
  createReview(review: InsertReview): Promise<Review>;
  getReviews(): Promise<Review[]>;
  getApprovedReviews(): Promise<Review[]>;
  getPendingReviews(): Promise<Review[]>;
  getReview(id: string): Promise<Review | undefined>;
  updateReviewStatus(id: string, status: string): Promise<Review | undefined>;
  deleteReview(id: string): Promise<void>;

  // Newsletter operations
  createNewsletterSubscriber(subscriber: InsertNewsletterSubscriber): Promise<NewsletterSubscriber>;
  getNewsletterSubscribers(): Promise<NewsletterSubscriber[]>;
  getActiveNewsletterSubscribers(): Promise<NewsletterSubscriber[]>;
  getNewsletterSubscriber(id: string): Promise<NewsletterSubscriber | undefined>;
  getNewsletterSubscriberByEmail(email: string): Promise<NewsletterSubscriber | undefined>;
  updateNewsletterSubscriber(id: string, subscriber: Partial<InsertNewsletterSubscriber>): Promise<NewsletterSubscriber | undefined>;
  deleteNewsletterSubscriber(id: string): Promise<void>;

  // Team member operations
  createTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  getTeamMembers(): Promise<TeamMember[]>;
  getActiveTeamMembers(): Promise<TeamMember[]>;
  getTeamMember(id: string): Promise<TeamMember | undefined>;
  updateTeamMember(id: string, member: Partial<InsertTeamMember>): Promise<TeamMember | undefined>;
  deleteTeamMember(id: string): Promise<void>;

  // Customer operations
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  getCustomerByPhone(phone: string): Promise<Customer | undefined>;
  findOrCreateCustomer(name: string, email: string, phone: string, address?: string): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  updateCustomerByEmail(email: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<void>;
  incrementCustomerBookings(id: string): Promise<void>;
  decrementCustomerBookings(id: string): Promise<void>;
  incrementCustomerQuotes(id: string): Promise<void>;
  decrementCustomerQuotes(id: string): Promise<void>;
  incrementCustomerInvoices(id: string): Promise<void>;
  decrementCustomerInvoices(id: string): Promise<void>;
  // Customer portal specific
  getInvoicesByCustomerId(customerId: string): Promise<Invoice[]>;
  getRecurringBookingsByEmail(email: string): Promise<RecurringBooking[]>;
  getReviewsByCustomerEmail(email: string): Promise<Review[]>;
  getMessagesByCustomerEmail(email: string): Promise<ContactMessage[]>;

  // Activity log operations
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  getActivityLogsByEntity(entityType: string, entityId: string): Promise<ActivityLog[]>;
  getActivityLogsByUser(userId: string): Promise<ActivityLog[]>;

  // Promo code operations
  createPromoCode(promoCode: InsertPromoCode): Promise<PromoCode>;
  getPromoCodes(): Promise<PromoCode[]>;
  getPromoCode(id: string): Promise<PromoCode | undefined>;
  getPromoCodeByCode(code: string): Promise<PromoCode | undefined>;
  updatePromoCode(id: string, promoCode: Partial<InsertPromoCode>): Promise<PromoCode | undefined>;
  updatePromoCodeStatus(id: string, status: string): Promise<PromoCode | undefined>;
  incrementPromoCodeUsage(id: string): Promise<PromoCode | undefined>;
  deletePromoCode(id: string): Promise<void>;

  // Recurring booking operations
  createRecurringBooking(booking: InsertRecurringBooking): Promise<RecurringBooking>;
  getRecurringBookings(): Promise<RecurringBooking[]>;
  getActiveRecurringBookings(): Promise<RecurringBooking[]>;
  getRecurringBooking(id: string): Promise<RecurringBooking | undefined>;
  getRecurringBookingsByCustomer(customerId: string): Promise<RecurringBooking[]>;
  updateRecurringBooking(id: string, booking: Partial<InsertRecurringBooking>): Promise<RecurringBooking | undefined>;
  updateRecurringBookingStatus(id: string, status: string): Promise<RecurringBooking | undefined>;
  updateRecurringBookingNextOccurrence(id: string, nextOccurrence: string): Promise<RecurringBooking | undefined>;
  deleteRecurringBooking(id: string): Promise<void>;

  // Job photo operations
  createJobPhoto(photo: InsertJobPhoto): Promise<JobPhoto>;
  getJobPhotos(): Promise<JobPhoto[]>;
  getJobPhotosByBooking(bookingId: string): Promise<JobPhoto[]>;
  getJobPhoto(id: string): Promise<JobPhoto | undefined>;
  updateJobPhoto(id: string, photo: Partial<InsertJobPhoto>): Promise<JobPhoto | undefined>;
  deleteJobPhoto(id: string): Promise<void>;

  // Customer notes operations
  createCustomerNote(note: InsertCustomerNote): Promise<CustomerNote>;
  getCustomerNotesByEmail(email: string): Promise<CustomerNote[]>;
  deleteCustomerNote(id: string): Promise<void>;

  // Email template operations
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  getEmailTemplates(): Promise<EmailTemplate[]>;
  getEmailTemplate(id: string): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: string): Promise<void>;

  // Service area operations
  createServiceArea(area: InsertServiceArea): Promise<ServiceArea>;
  getServiceAreas(): Promise<ServiceArea[]>;
  getActiveServiceAreas(): Promise<ServiceArea[]>;
  getServiceArea(id: string): Promise<ServiceArea | undefined>;
  updateServiceArea(id: string, area: Partial<InsertServiceArea>): Promise<ServiceArea | undefined>;
  deleteServiceArea(id: string): Promise<void>;
  checkZipCodeInServiceArea(zipCode: string): Promise<boolean>;

  // Referral operations
  createReferral(referral: InsertReferral): Promise<Referral>;
  getReferrals(): Promise<Referral[]>;
  getReferral(id: string): Promise<Referral | undefined>;
  getReferralsByReferrer(referrerId: string): Promise<Referral[]>;
  getReferralByBooking(bookingId: string): Promise<Referral | undefined>;
  updateReferralStatus(id: string, status: string, creditedAt?: Date): Promise<Referral | undefined>;
  deleteReferral(id: string): Promise<void>;

  // Referral credit operations
  getOrCreateReferralCredit(customerId: string): Promise<ReferralCredit>;
  getReferralCredit(customerId: string): Promise<ReferralCredit | undefined>;
  addReferralCredit(customerId: string, amount: number): Promise<ReferralCredit>;
  useReferralCredit(customerId: string, amount: number): Promise<ReferralCredit>;

  // Referral settings operations
  getReferralSettings(): Promise<ReferralSettings | undefined>;
  upsertReferralSettings(settings: InsertReferralSettings): Promise<ReferralSettings>;

  // Referral helper operations
  validateReferralCode(code: string): Promise<Customer | null>;
  generateReferralCode(customerName: string): Promise<string>;
  calculateReferralTier(referrerId: string): Promise<{ tier: number; amount: number }>;
  detectReferralFraud(params: {
    referralCode: string;
    email: string;
    phone: string;
    address: string;
    ipAddress?: string;
  }): Promise<{ isValid: boolean; reason?: string; severity?: string }>;

  // Churn risk operations
  calculateCustomerChurnRisk(customerId: string): Promise<{ risk: string; daysSinceLastBooking: number }>;
  updateCustomerChurnRisk(customerId: string, risk: string): Promise<Customer | undefined>;
  getAtRiskCustomers(): Promise<Customer[]>;

  // Anomaly alert operations
  createAnomalyAlert(alert: InsertAnomalyAlert): Promise<AnomalyAlert>;
  getAnomalyAlerts(status?: string): Promise<AnomalyAlert[]>;
  getAnomalyAlert(id: string): Promise<AnomalyAlert | undefined>;
  acknowledgeAnomalyAlert(id: string, userId: string): Promise<AnomalyAlert | undefined>;
  resolveAnomalyAlert(id: string, userId: string): Promise<AnomalyAlert | undefined>;
  deleteAnomalyAlert(id: string): Promise<void>;

  // Quick actions dashboard aggregation
  getQuickActionsCounts(): Promise<{
    pendingQuotes: number;
    overdueInvoices: number;
    pendingReviews: number;
    todaysBookings: number;
    atRiskCustomers: number;
    unreadMessages: number;
    openAlerts: number;
  }>;

  // Intelligence Dashboard overview aggregation
  getIntelligenceOverview(): Promise<IntelligenceOverview>;

  // Global search across bookings, customers, and quotes
  globalSearch(query: string, limit?: number): Promise<GlobalSearchResult>;

  // Message operations enhancement
  updateContactMessage(id: string, message: Partial<InsertContactMessage>): Promise<ContactMessage | undefined>;
  assignContactMessage(id: string, employeeId: string): Promise<ContactMessage | undefined>;
  replyToContactMessage(id: string, replyMessage: string, userId: string): Promise<ContactMessage | undefined>;
  getUnreadMessages(): Promise<ContactMessage[]>;

  // Customer operations enhancement
  updateCustomerTags(customerId: string, tags: string[]): Promise<Customer | undefined>;
  autoTagCustomer(customerId: string): Promise<Customer | undefined>;
  getCustomersByTag(tag: string): Promise<Customer[]>;

  // Employee availability operations
  getSuggestedEmployees(date: string, timeSlot: string): Promise<Employee[]>;
  getEmployeeWorkload(employeeId: string, startDate: string, endDate: string): Promise<{ totalBookings: number; bookings: Booking[] }>;

  // CMS Content operations
  getCmsContent(section: string): Promise<CmsContent[]>;
  getCmsContentByKey(section: string, key: string): Promise<CmsContent | undefined>;
  getAllCmsContent(): Promise<CmsContent[]>;
  upsertCmsContent(content: InsertCmsContent): Promise<CmsContent>;
  deleteCmsContent(section: string, key: string): Promise<void>;
  
  // CMS Section operations (visibility toggling)
  getAllCmsSections(): Promise<CmsSection[]>;
  getCmsSection(section: string): Promise<CmsSection | undefined>;
  upsertCmsSection(sectionData: InsertCmsSection): Promise<CmsSection>;
  updateSectionVisibility(section: string, visible: boolean): Promise<CmsSection | undefined>;
  
  // CMS Asset operations (image uploads)
  getCmsAsset(section: string, key: string): Promise<CmsAsset | undefined>;
  getCmsAssetsBySection(section: string): Promise<CmsAsset[]>;
  upsertCmsAsset(asset: InsertCmsAsset): Promise<CmsAsset>;
  deleteCmsAsset(section: string, key: string): Promise<void>;
}

export class DbStorage implements IStorage {
  // Auth user operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async countUsers(): Promise<number> {
    const result = await db.select().from(users);
    return result.length;
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const result = await db.insert(bookings).values(booking).returning();
    return result[0];
  }

  async getBookings(): Promise<Booking[]> {
    return await db.select().from(bookings).orderBy(desc(bookings.createdAt));
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    const result = await db.select().from(bookings).where(eq(bookings.id, id));
    return result[0];
  }

  async getBookingByToken(id: string, token: string): Promise<Booking | undefined> {
    const result = await db.select().from(bookings).where(eq(bookings.id, id));
    const booking = result[0];
    if (booking && booking.managementToken === token) {
      return booking;
    }
    return undefined;
  }

  async getBookingByManagementToken(token: string): Promise<Booking | undefined> {
    const result = await db.select().from(bookings).where(eq(bookings.managementToken, token));
    return result[0];
  }

  async getBookingsByEmail(email: string): Promise<Booking[]> {
    return await db.select().from(bookings).where(eq(bookings.email, email)).orderBy(desc(bookings.createdAt));
  }

  async updateBooking(id: string, booking: Partial<InsertBooking>): Promise<Booking | undefined> {
    const result = await db.update(bookings).set(booking).where(eq(bookings.id, id)).returning();
    return result[0];
  }

  async updateBookingStatus(id: string, status: string): Promise<Booking | undefined> {
    const updateData: any = { status };
    
    // Set completedDate when marking as completed (use SQL now() for UTC consistency)
    if (status === 'completed') {
      updateData.completedDate = sql`now()`;
    }
    
    const result = await db.update(bookings).set(updateData).where(eq(bookings.id, id)).returning();
    return result[0];
  }

  async assignEmployeesToBooking(id: string, employeeIds: string[]): Promise<Booking | undefined> {
    const result = await db.update(bookings).set({ assignedEmployeeIds: employeeIds }).where(eq(bookings.id, id)).returning();
    return result[0];
  }

  async deleteBooking(id: string): Promise<void> {
    await db.delete(bookings).where(eq(bookings.id, id));
  }

  // Reschedule request operations
  async createRescheduleRequest(request: InsertRescheduleRequest): Promise<RescheduleRequest> {
    const result = await db.insert(rescheduleRequests).values(request).returning();
    return result[0];
  }

  async getRescheduleRequests(): Promise<RescheduleRequest[]> {
    return await db.select().from(rescheduleRequests).orderBy(desc(rescheduleRequests.createdAt));
  }

  async getRescheduleRequest(id: string): Promise<RescheduleRequest | undefined> {
    const result = await db.select().from(rescheduleRequests).where(eq(rescheduleRequests.id, id));
    return result[0];
  }

  async getRescheduleRequestsByBooking(bookingId: string): Promise<RescheduleRequest[]> {
    return await db.select().from(rescheduleRequests)
      .where(eq(rescheduleRequests.bookingId, bookingId))
      .orderBy(desc(rescheduleRequests.createdAt));
  }

  async getPendingRescheduleRequests(): Promise<RescheduleRequest[]> {
    return await db.select().from(rescheduleRequests)
      .where(eq(rescheduleRequests.status, 'pending'))
      .orderBy(desc(rescheduleRequests.createdAt));
  }

  async updateRescheduleRequestStatus(
    id: string, 
    status: string, 
    decisionBy: string, 
    decisionReason?: string
  ): Promise<RescheduleRequest | undefined> {
    const result = await db.update(rescheduleRequests)
      .set({ 
        status, 
        decisionBy, 
        decisionReason,
        decisionAt: sql`now()`,
        updatedAt: sql`now()`
      })
      .where(eq(rescheduleRequests.id, id))
      .returning();
    return result[0];
  }

  async deleteRescheduleRequest(id: string): Promise<void> {
    await db.delete(rescheduleRequests).where(eq(rescheduleRequests.id, id));
  }

  async createQuote(quote: InsertQuote): Promise<Quote> {
    const result = await db.insert(quotes).values(quote).returning();
    return result[0];
  }

  async getQuotes(): Promise<Quote[]> {
    return await db.select().from(quotes).orderBy(desc(quotes.createdAt));
  }

  async getQuote(id: string): Promise<Quote | undefined> {
    const result = await db.select().from(quotes).where(eq(quotes.id, id));
    return result[0];
  }

  async updateQuoteStatus(id: string, status: string): Promise<Quote | undefined> {
    const result = await db.update(quotes).set({ status }).where(eq(quotes.id, id)).returning();
    return result[0];
  }

  async deleteQuote(id: string): Promise<void> {
    await db.delete(quotes).where(eq(quotes.id, id));
  }

  // Quote photo operations
  async createQuotePhoto(photo: InsertQuotePhoto): Promise<QuotePhoto> {
    const result = await db.insert(quotePhotos).values(photo).returning();
    return result[0];
  }

  async getQuotePhotosByQuote(quoteId: string): Promise<QuotePhoto[]> {
    return await db.select().from(quotePhotos)
      .where(eq(quotePhotos.quoteId, quoteId))
      .orderBy(desc(quotePhotos.createdAt));
  }

  async deleteQuotePhoto(id: string): Promise<void> {
    await db.delete(quotePhotos).where(eq(quotePhotos.id, id));
  }

  // Contact message operations
  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    const result = await db.insert(contactMessages).values(message).returning();
    return result[0];
  }

  async getContactMessages(): Promise<ContactMessage[]> {
    return await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
  }

  async getContactMessage(id: string): Promise<ContactMessage | undefined> {
    const result = await db.select().from(contactMessages).where(eq(contactMessages.id, id));
    return result[0];
  }

  async updateContactMessageStatus(id: string, status: string): Promise<ContactMessage | undefined> {
    const result = await db.update(contactMessages).set({ status }).where(eq(contactMessages.id, id)).returning();
    return result[0];
  }

  async deleteContactMessage(id: string): Promise<void> {
    await db.delete(contactMessages).where(eq(contactMessages.id, id));
  }

  // Service operations
  async createService(service: InsertService): Promise<Service> {
    const result = await db.insert(services).values(service).returning();
    return result[0];
  }

  async getServices(): Promise<Service[]> {
    return await db.select().from(services).orderBy(desc(services.createdAt));
  }

  async getActiveServices(): Promise<Service[]> {
    return await db.select().from(services).where(eq(services.active, true)).orderBy(desc(services.featured), desc(services.createdAt));
  }

  async getService(id: string): Promise<Service | undefined> {
    const result = await db.select().from(services).where(eq(services.id, id));
    return result[0];
  }

  async updateService(id: string, service: Partial<InsertService>): Promise<Service | undefined> {
    const result = await db.update(services).set({ ...service, updatedAt: new Date() }).where(eq(services.id, id)).returning();
    return result[0];
  }

  async deleteService(id: string): Promise<void> {
    await db.delete(services).where(eq(services.id, id));
  }

  // Business settings operations
  async getBusinessSettings(): Promise<BusinessSettings | undefined> {
    const result = await db.select().from(businessSettings).limit(1);
    return result[0];
  }

  async upsertBusinessSettings(settings: InsertBusinessSettings): Promise<BusinessSettings> {
    const existing = await this.getBusinessSettings();
    if (existing) {
      const updateData = {
        ...settings,
        socialLinks: settings.socialLinks as any,
        updatedAt: new Date()
      };
      const result = await db.update(businessSettings).set(updateData).where(eq(businessSettings.id, existing.id)).returning();
      return result[0];
    } else {
      const insertData = {
        ...settings,
        socialLinks: settings.socialLinks as any,
      };
      const result = await db.insert(businessSettings).values(insertData).returning();
      return result[0];
    }
  }

  // FAQ operations
  async createFaqItem(item: InsertFaqItem): Promise<FaqItem> {
    const result = await db.insert(faqItems).values(item).returning();
    return result[0];
  }

  async getFaqItems(): Promise<FaqItem[]> {
    return await db.select().from(faqItems).orderBy(faqItems.order, desc(faqItems.createdAt));
  }

  async getActiveFaqItems(): Promise<FaqItem[]> {
    return await db.select().from(faqItems).where(eq(faqItems.active, true)).orderBy(faqItems.order, desc(faqItems.createdAt));
  }

  async getFaqItem(id: string): Promise<FaqItem | undefined> {
    const result = await db.select().from(faqItems).where(eq(faqItems.id, id));
    return result[0];
  }

  async updateFaqItem(id: string, item: Partial<InsertFaqItem>): Promise<FaqItem | undefined> {
    const result = await db.update(faqItems).set(item).where(eq(faqItems.id, id)).returning();
    return result[0];
  }

  async deleteFaqItem(id: string): Promise<void> {
    await db.delete(faqItems).where(eq(faqItems.id, id));
  }

  // Gallery operations
  async createGalleryImage(image: InsertGalleryImage): Promise<GalleryImage> {
    const result = await db.insert(galleryImages).values(image).returning();
    return result[0];
  }

  async getGalleryImages(): Promise<GalleryImage[]> {
    return await db.select().from(galleryImages).orderBy(galleryImages.order, desc(galleryImages.createdAt));
  }

  async getActiveGalleryImages(): Promise<GalleryImage[]> {
    return await db.select().from(galleryImages).where(eq(galleryImages.active, true)).orderBy(galleryImages.order, desc(galleryImages.createdAt));
  }

  async getGalleryImage(id: string): Promise<GalleryImage | undefined> {
    const result = await db.select().from(galleryImages).where(eq(galleryImages.id, id));
    return result[0];
  }

  async updateGalleryImage(id: string, image: Partial<InsertGalleryImage>): Promise<GalleryImage | undefined> {
    const result = await db.update(galleryImages).set(image).where(eq(galleryImages.id, id)).returning();
    return result[0];
  }

  async deleteGalleryImage(id: string): Promise<void> {
    await db.delete(galleryImages).where(eq(galleryImages.id, id));
  }

  // Invoice operations
  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const result = await db.insert(invoices).values(invoice).returning();
    return result[0];
  }

  async getInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const result = await db.select().from(invoices).where(eq(invoices.id, id));
    return result[0];
  }

  async updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const result = await db.update(invoices).set({ ...invoice, updatedAt: new Date() }).where(eq(invoices.id, id)).returning();
    return result[0];
  }

  async deleteInvoice(id: string): Promise<void> {
    await db.delete(invoices).where(eq(invoices.id, id));
  }

  // Employee operations
  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const result = await db.insert(employees).values(employee).returning();
    return result[0];
  }

  async getEmployees(): Promise<Employee[]> {
    return await db.select().from(employees).orderBy(desc(employees.createdAt));
  }

  async getActiveEmployees(): Promise<Employee[]> {
    return await db.select().from(employees).where(eq(employees.active, true)).orderBy(desc(employees.createdAt));
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    const result = await db.select().from(employees).where(eq(employees.id, id));
    return result[0];
  }

  async getEmployeeByEmail(email: string): Promise<Employee | undefined> {
    const result = await db.select().from(employees).where(eq(employees.email, email));
    return result[0];
  }

  async updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const result = await db.update(employees).set(employee).where(eq(employees.id, id)).returning();
    return result[0];
  }

  async deleteEmployee(id: string): Promise<void> {
    await db.delete(employees).where(eq(employees.id, id));
  }

  // Employee permission operations
  async getEmployeePermissions(employeeId: string): Promise<EmployeePermission[]> {
    return await db.select().from(employeePermissions).where(eq(employeePermissions.employeeId, employeeId));
  }

  async setEmployeePermissions(employeeId: string, permissions: Array<{ feature: string, actions: string[] }>): Promise<void> {
    // Delete existing permissions for this employee
    await db.delete(employeePermissions).where(eq(employeePermissions.employeeId, employeeId));
    
    // Insert new permissions
    if (permissions.length > 0) {
      await db.insert(employeePermissions).values(
        permissions.map(p => ({
          employeeId,
          feature: p.feature,
          actions: p.actions,
        }))
      );
    }
  }

  async deleteEmployeePermissions(employeeId: string): Promise<void> {
    await db.delete(employeePermissions).where(eq(employeePermissions.employeeId, employeeId));
  }

  // Review operations
  async createReview(review: InsertReview): Promise<Review> {
    const result = await db.insert(reviews).values(review).returning();
    return result[0];
  }

  async getReviews(): Promise<Review[]> {
    return await db.select().from(reviews).orderBy(desc(reviews.createdAt));
  }

  async getApprovedReviews(): Promise<Review[]> {
    return await db.select().from(reviews).where(eq(reviews.status, "approved")).orderBy(desc(reviews.approvedAt));
  }

  async getPendingReviews(): Promise<Review[]> {
    return await db.select().from(reviews).where(eq(reviews.status, "pending")).orderBy(desc(reviews.createdAt));
  }

  async getReview(id: string): Promise<Review | undefined> {
    const result = await db.select().from(reviews).where(eq(reviews.id, id));
    return result[0];
  }

  async updateReviewStatus(id: string, status: string): Promise<Review | undefined> {
    const updateData: any = { status };
    if (status === "approved") {
      updateData.approvedAt = new Date();
    }
    const result = await db.update(reviews).set(updateData).where(eq(reviews.id, id)).returning();
    return result[0];
  }

  async deleteReview(id: string): Promise<void> {
    await db.delete(reviews).where(eq(reviews.id, id));
  }

  // Newsletter operations
  async createNewsletterSubscriber(subscriber: InsertNewsletterSubscriber): Promise<NewsletterSubscriber> {
    const result = await db.insert(newsletterSubscribers).values(subscriber).returning();
    return result[0];
  }

  async getNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
    return await db.select().from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.subscribedAt));
  }

  async getActiveNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
    return await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.active, true)).orderBy(desc(newsletterSubscribers.subscribedAt));
  }

  async getNewsletterSubscriber(id: string): Promise<NewsletterSubscriber | undefined> {
    const result = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.id, id));
    return result[0];
  }

  async getNewsletterSubscriberByEmail(email: string): Promise<NewsletterSubscriber | undefined> {
    const result = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, email));
    return result[0];
  }

  async updateNewsletterSubscriber(id: string, subscriber: Partial<InsertNewsletterSubscriber>): Promise<NewsletterSubscriber | undefined> {
    const result = await db.update(newsletterSubscribers).set(subscriber).where(eq(newsletterSubscribers.id, id)).returning();
    return result[0];
  }

  async deleteNewsletterSubscriber(id: string): Promise<void> {
    await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.id, id));
  }

  // Team member operations
  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const result = await db.insert(teamMembers).values(member).returning();
    return result[0];
  }

  async getTeamMembers(): Promise<TeamMember[]> {
    return await db.select().from(teamMembers).orderBy(teamMembers.order, desc(teamMembers.createdAt));
  }

  async getActiveTeamMembers(): Promise<TeamMember[]> {
    return await db.select().from(teamMembers).where(eq(teamMembers.active, true)).orderBy(teamMembers.order, desc(teamMembers.createdAt));
  }

  async getTeamMember(id: string): Promise<TeamMember | undefined> {
    const result = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
    return result[0];
  }

  async updateTeamMember(id: string, member: Partial<InsertTeamMember>): Promise<TeamMember | undefined> {
    const result = await db.update(teamMembers).set({ ...member, updatedAt: new Date() }).where(eq(teamMembers.id, id)).returning();
    return result[0];
  }

  async deleteTeamMember(id: string): Promise<void> {
    await db.delete(teamMembers).where(eq(teamMembers.id, id));
  }

  // Customer operations
  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const result = await db.insert(customers).values(customer).returning();
    return result[0];
  }

  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const result = await db.select().from(customers).where(eq(customers.id, id));
    return result[0];
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    const result = await db.select().from(customers).where(eq(customers.email, email));
    return result[0];
  }

  async getCustomerByPhone(phone: string): Promise<Customer | undefined> {
    const result = await db.select().from(customers).where(eq(customers.phone, phone));
    return result[0];
  }

  async findOrCreateCustomer(name: string, email: string, phone: string, address?: string): Promise<Customer> {
    // Try to find existing customer by email first
    let customer = await this.getCustomerByEmail(email);
    
    if (!customer) {
      // Try by phone as fallback
      customer = await this.getCustomerByPhone(phone);
    }
    
    if (!customer) {
      // Create new customer if not found
      customer = await this.createCustomer({ name, email, phone, address: address || null, notes: null });
    }
    
    return customer;
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const result = await db.update(customers).set({ ...customer, updatedAt: new Date() }).where(eq(customers.id, id)).returning();
    return result[0];
  }

  async updateCustomerByEmail(email: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const result = await db.update(customers).set({ ...customer, updatedAt: new Date() }).where(eq(customers.email, email)).returning();
    return result[0];
  }

  async deleteCustomer(id: string): Promise<void> {
    await db.delete(customers).where(eq(customers.id, id));
  }

  async incrementCustomerBookings(id: string): Promise<void> {
    await db.update(customers)
      .set({ totalBookings: sql`${customers.totalBookings} + 1` })
      .where(eq(customers.id, id));
  }

  async decrementCustomerBookings(id: string): Promise<void> {
    await db.update(customers)
      .set({ totalBookings: sql`GREATEST(${customers.totalBookings} - 1, 0)` })
      .where(eq(customers.id, id));
  }

  async incrementCustomerQuotes(id: string): Promise<void> {
    await db.update(customers)
      .set({ totalQuotes: sql`${customers.totalQuotes} + 1` })
      .where(eq(customers.id, id));
  }

  async decrementCustomerQuotes(id: string): Promise<void> {
    await db.update(customers)
      .set({ totalQuotes: sql`GREATEST(${customers.totalQuotes} - 1, 0)` })
      .where(eq(customers.id, id));
  }

  async incrementCustomerInvoices(id: string): Promise<void> {
    await db.update(customers)
      .set({ totalInvoices: sql`${customers.totalInvoices} + 1` })
      .where(eq(customers.id, id));
  }

  async decrementCustomerInvoices(id: string): Promise<void> {
    await db.update(customers)
      .set({ totalInvoices: sql`GREATEST(${customers.totalInvoices} - 1, 0)` })
      .where(eq(customers.id, id));
  }

  // Customer portal specific methods
  async getInvoicesByCustomerId(customerId: string): Promise<Invoice[]> {
    return await db.select().from(invoices).where(eq(invoices.customerId, customerId)).orderBy(desc(invoices.createdAt));
  }

  async getRecurringBookingsByEmail(email: string): Promise<RecurringBooking[]> {
    return await db.select().from(recurringBookings).where(eq(recurringBookings.email, email)).orderBy(desc(recurringBookings.createdAt));
  }

  async getReviewsByCustomerEmail(email: string): Promise<Review[]> {
    return await db.select().from(reviews).where(eq(reviews.customerEmail, email)).orderBy(desc(reviews.createdAt));
  }

  async getMessagesByCustomerEmail(email: string): Promise<ContactMessage[]> {
    return await db.select().from(contactMessages).where(eq(contactMessages.email, email)).orderBy(desc(contactMessages.createdAt));
  }

  // Activity log operations
  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const result = await db.insert(activityLogs).values([log]).returning();
    return result[0];
  }

  async getActivityLogs(limit: number = 100): Promise<ActivityLog[]> {
    return await db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(limit);
  }

  async getActivityLogsByEntity(entityType: string, entityId: string): Promise<ActivityLog[]> {
    return await db.select().from(activityLogs)
      .where(sql`${activityLogs.entityType} = ${entityType} AND ${activityLogs.entityId} = ${entityId}`)
      .orderBy(desc(activityLogs.createdAt));
  }

  async getActivityLogsByUser(userId: string): Promise<ActivityLog[]> {
    return await db.select().from(activityLogs)
      .where(eq(activityLogs.userId, userId))
      .orderBy(desc(activityLogs.createdAt));
  }

  // Promo code operations
  async createPromoCode(promoCode: InsertPromoCode): Promise<PromoCode> {
    const result = await db.insert(promoCodes).values(promoCode).returning();
    return result[0];
  }

  async getPromoCodes(): Promise<PromoCode[]> {
    return await db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
  }

  async getPromoCode(id: string): Promise<PromoCode | undefined> {
    const result = await db.select().from(promoCodes).where(eq(promoCodes.id, id));
    return result[0];
  }

  async getPromoCodeByCode(code: string): Promise<PromoCode | undefined> {
    const result = await db.select().from(promoCodes).where(eq(promoCodes.code, code));
    return result[0];
  }

  async updatePromoCode(id: string, promoCode: Partial<InsertPromoCode>): Promise<PromoCode | undefined> {
    const result = await db.update(promoCodes).set({ ...promoCode, updatedAt: new Date() }).where(eq(promoCodes.id, id)).returning();
    return result[0];
  }

  async updatePromoCodeStatus(id: string, status: string): Promise<PromoCode | undefined> {
    const result = await db.update(promoCodes).set({ status, updatedAt: new Date() }).where(eq(promoCodes.id, id)).returning();
    return result[0];
  }

  async incrementPromoCodeUsage(id: string): Promise<PromoCode | undefined> {
    const result = await db.update(promoCodes)
      .set({ 
        currentUses: sql`${promoCodes.currentUses} + 1`,
        updatedAt: new Date()
      })
      .where(eq(promoCodes.id, id))
      .returning();
    return result[0];
  }

  async deletePromoCode(id: string): Promise<void> {
    await db.delete(promoCodes).where(eq(promoCodes.id, id));
  }

  // Recurring booking operations
  async createRecurringBooking(booking: InsertRecurringBooking): Promise<RecurringBooking> {
    const result = await db.insert(recurringBookings).values(booking).returning();
    return result[0];
  }

  async getRecurringBookings(): Promise<RecurringBooking[]> {
    return await db.select().from(recurringBookings).orderBy(desc(recurringBookings.createdAt));
  }

  async getActiveRecurringBookings(): Promise<RecurringBooking[]> {
    return await db.select().from(recurringBookings).where(eq(recurringBookings.status, 'active')).orderBy(desc(recurringBookings.nextOccurrence));
  }

  async getRecurringBooking(id: string): Promise<RecurringBooking | undefined> {
    const result = await db.select().from(recurringBookings).where(eq(recurringBookings.id, id));
    return result[0];
  }

  async getRecurringBookingsByCustomer(customerId: string): Promise<RecurringBooking[]> {
    return await db.select().from(recurringBookings).where(eq(recurringBookings.customerId, customerId)).orderBy(desc(recurringBookings.createdAt));
  }

  async updateRecurringBooking(id: string, booking: Partial<InsertRecurringBooking>): Promise<RecurringBooking | undefined> {
    const result = await db.update(recurringBookings).set({ ...booking, updatedAt: new Date() }).where(eq(recurringBookings.id, id)).returning();
    return result[0];
  }

  async updateRecurringBookingStatus(id: string, status: string): Promise<RecurringBooking | undefined> {
    const result = await db.update(recurringBookings).set({ status, updatedAt: new Date() }).where(eq(recurringBookings.id, id)).returning();
    return result[0];
  }

  async updateRecurringBookingNextOccurrence(id: string, nextOccurrence: string): Promise<RecurringBooking | undefined> {
    const result = await db.update(recurringBookings).set({ nextOccurrence, updatedAt: new Date() }).where(eq(recurringBookings.id, id)).returning();
    return result[0];
  }

  async deleteRecurringBooking(id: string): Promise<void> {
    await db.delete(recurringBookings).where(eq(recurringBookings.id, id));
  }

  // Job photo operations
  async createJobPhoto(photo: InsertJobPhoto): Promise<JobPhoto> {
    const result = await db.insert(jobPhotos).values(photo).returning();
    return result[0];
  }

  async getJobPhotos(): Promise<JobPhoto[]> {
    return await db.select().from(jobPhotos).orderBy(desc(jobPhotos.createdAt));
  }

  async getJobPhotosByBooking(bookingId: string): Promise<JobPhoto[]> {
    return await db.select().from(jobPhotos).where(eq(jobPhotos.bookingId, bookingId)).orderBy(desc(jobPhotos.createdAt));
  }

  async getJobPhoto(id: string): Promise<JobPhoto | undefined> {
    const result = await db.select().from(jobPhotos).where(eq(jobPhotos.id, id));
    return result[0];
  }

  async updateJobPhoto(id: string, photo: Partial<InsertJobPhoto>): Promise<JobPhoto | undefined> {
    const result = await db.update(jobPhotos).set(photo).where(eq(jobPhotos.id, id)).returning();
    return result[0];
  }

  async deleteJobPhoto(id: string): Promise<void> {
    await db.delete(jobPhotos).where(eq(jobPhotos.id, id));
  }

  // Customer notes operations
  async createCustomerNote(note: InsertCustomerNote): Promise<CustomerNote> {
    const result = await db.insert(customerNotes).values(note).returning();
    return result[0];
  }

  async getCustomerNotesByEmail(email: string): Promise<CustomerNote[]> {
    return await db.select().from(customerNotes)
      .where(eq(customerNotes.customerEmail, email))
      .orderBy(desc(customerNotes.createdAt));
  }

  async deleteCustomerNote(id: string): Promise<void> {
    await db.delete(customerNotes).where(eq(customerNotes.id, id));
  }

  // Email template operations
  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const [result] = await db.insert(emailTemplates).values(template).returning();
    return result;
  }

  async getEmailTemplates(): Promise<EmailTemplate[]> {
    return await db.select().from(emailTemplates).orderBy(emailTemplates.category, emailTemplates.name);
  }

  async getEmailTemplate(id: string): Promise<EmailTemplate | undefined> {
    const result = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
    return result[0];
  }

  async deleteEmailTemplate(id: string): Promise<void> {
    await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
  }

  // Service area operations
  async createServiceArea(area: InsertServiceArea): Promise<ServiceArea> {
    const [result] = await db.insert(serviceAreas).values(area).returning();
    return result;
  }

  async getServiceAreas(): Promise<ServiceArea[]> {
    return await db.select().from(serviceAreas).orderBy(serviceAreas.name);
  }

  async getActiveServiceAreas(): Promise<ServiceArea[]> {
    return await db.select().from(serviceAreas)
      .where(eq(serviceAreas.isActive, true))
      .orderBy(serviceAreas.name);
  }

  async getServiceArea(id: string): Promise<ServiceArea | undefined> {
    const result = await db.select().from(serviceAreas).where(eq(serviceAreas.id, id));
    return result[0];
  }

  async updateServiceArea(id: string, area: Partial<InsertServiceArea>): Promise<ServiceArea | undefined> {
    const result = await db.update(serviceAreas).set(area).where(eq(serviceAreas.id, id)).returning();
    return result[0];
  }

  async deleteServiceArea(id: string): Promise<void> {
    await db.delete(serviceAreas).where(eq(serviceAreas.id, id));
  }

  async checkZipCodeInServiceArea(zipCode: string): Promise<boolean> {
    const result = await db.select().from(serviceAreas)
      .where(sql`${serviceAreas.isActive} = true AND ${zipCode} = ANY(${serviceAreas.zipCodes})`);
    return result.length > 0;
  }

  // Referral operations
  async createReferral(referral: InsertReferral): Promise<Referral> {
    const [result] = await db.insert(referrals).values(referral).returning();
    return result;
  }

  async getReferrals(): Promise<Referral[]> {
    return await db.select().from(referrals).orderBy(desc(referrals.createdAt));
  }

  async getReferral(id: string): Promise<Referral | undefined> {
    const result = await db.select().from(referrals).where(eq(referrals.id, id));
    return result[0];
  }

  async getReferralsByReferrer(referrerId: string): Promise<Referral[]> {
    return await db.select().from(referrals)
      .where(eq(referrals.referrerId, referrerId))
      .orderBy(desc(referrals.createdAt));
  }

  async getReferralByBooking(bookingId: string): Promise<Referral | undefined> {
    const result = await db.select().from(referrals)
      .where(eq(referrals.referredBookingId, bookingId));
    return result[0];
  }

  async updateReferralStatus(id: string, status: string, creditedAt?: Date): Promise<Referral | undefined> {
    const updateData: any = { status };
    if (creditedAt) {
      updateData.creditedAt = creditedAt;
    }
    const result = await db.update(referrals).set(updateData).where(eq(referrals.id, id)).returning();
    return result[0];
  }

  async deleteReferral(id: string): Promise<void> {
    await db.delete(referrals).where(eq(referrals.id, id));
  }

  // Referral credit operations
  async getOrCreateReferralCredit(customerId: string): Promise<ReferralCredit> {
    const existing = await this.getReferralCredit(customerId);
    if (existing) {
      return existing;
    }
    
    const [result] = await db.insert(referralCredits).values({
      customerId,
      totalEarned: 0,
      totalUsed: 0,
      availableBalance: 0,
    }).returning();
    return result;
  }

  async getReferralCredit(customerId: string): Promise<ReferralCredit | undefined> {
    const result = await db.select().from(referralCredits)
      .where(eq(referralCredits.customerId, customerId));
    return result[0];
  }

  async addReferralCredit(customerId: string, amount: number): Promise<ReferralCredit> {
    const credit = await this.getOrCreateReferralCredit(customerId);
    
    const [result] = await db.update(referralCredits).set({
      totalEarned: credit.totalEarned + amount,
      availableBalance: credit.availableBalance + amount,
      updatedAt: new Date(),
    }).where(eq(referralCredits.customerId, customerId)).returning();
    
    return result;
  }

  async useReferralCredit(customerId: string, amount: number): Promise<ReferralCredit> {
    const credit = await this.getOrCreateReferralCredit(customerId);
    
    if (credit.availableBalance < amount) {
      throw new Error('Insufficient referral credit balance');
    }
    
    const [result] = await db.update(referralCredits).set({
      totalUsed: credit.totalUsed + amount,
      availableBalance: credit.availableBalance - amount,
      updatedAt: new Date(),
    }).where(eq(referralCredits.customerId, customerId)).returning();
    
    return result;
  }

  // Referral settings operations
  async getReferralSettings(): Promise<ReferralSettings | undefined> {
    const result = await db.select().from(referralSettings).limit(1);
    return result[0];
  }

  async upsertReferralSettings(settings: InsertReferralSettings): Promise<ReferralSettings> {
    const existing = await this.getReferralSettings();
    if (existing) {
      const [result] = await db.update(referralSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(referralSettings.id, existing.id))
        .returning();
      return result;
    } else {
      const [result] = await db.insert(referralSettings).values(settings).returning();
      return result;
    }
  }

  // Referral helper operations
  async validateReferralCode(code: string): Promise<Customer | null> {
    const result = await db.select().from(customers)
      .where(eq(customers.referralCode, code));
    return result[0] || null;
  }

  async generateReferralCode(customerName: string): Promise<string> {
    const firstName = customerName.split(' ')[0].toUpperCase();
    const random = Math.floor(1000 + Math.random() * 9000);
    let code = `${firstName}${random}`;
    
    let exists = await this.validateReferralCode(code);
    while (exists) {
      const newRandom = Math.floor(1000 + Math.random() * 9000);
      code = `${firstName}${newRandom}`;
      exists = await this.validateReferralCode(code);
    }
    
    return code;
  }

  async calculateReferralTier(referrerId: string): Promise<{ tier: number; amount: number }> {
    const completedReferrals = await db.select().from(referrals)
      .where(sql`${referrals.referrerId} = ${referrerId} AND ${referrals.status} = 'credited'`);
    
    const count = completedReferrals.length;
    const settings = await this.getReferralSettings();
    
    const tier1Amount = settings?.tier1Amount || 1000;
    const tier2Amount = settings?.tier2Amount || 1500;
    const tier3Amount = settings?.tier3Amount || 2000;
    
    if (count === 0) {
      return { tier: 1, amount: tier1Amount };
    } else if (count === 1) {
      return { tier: 2, amount: tier2Amount };
    } else {
      return { tier: 3, amount: tier3Amount };
    }
  }

  async checkAddressAlreadyReferred(address: string, email: string): Promise<boolean> {
    const normalizedAddress = address.toLowerCase().trim();
    const normalizedEmail = email.toLowerCase().trim();
    
    const existingBookings = await db.select().from(bookings)
      .where(sql`LOWER(TRIM(${bookings.address})) = ${normalizedAddress} AND ${bookings.referralCode} IS NOT NULL`);
    
    if (existingBookings.length === 0) {
      return false;
    }
    
    for (const booking of existingBookings) {
      if (booking.email.toLowerCase().trim() !== normalizedEmail) {
        return true;
      }
    }
    
    return false;
  }

  // Enhanced fraud detection for referrals
  async detectReferralFraud(params: {
    referralCode: string;
    email: string;
    phone: string;
    address: string;
    ipAddress?: string;
  }): Promise<{ isValid: boolean; reason?: string; severity?: string }> {
    const settings = await this.getReferralSettings();
    if (!settings?.fraudDetectionEnabled) {
      return { isValid: true };
    }

    const { referralCode, email, phone, address, ipAddress } = params;
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = phone.replace(/\D/g, ''); // Remove all non-digits
    const normalizedAddress = address.toLowerCase().trim();

    // Get all bookings that used ANY referral code
    const referredBookings = await db.select().from(bookings)
      .where(sql`${bookings.referralCode} IS NOT NULL`);

    // Check 1: Same address, different email
    if (settings.blockSameAddress) {
      const sameAddress = referredBookings.find(b => 
        b.address.toLowerCase().trim() === normalizedAddress && 
        b.email.toLowerCase().trim() !== normalizedEmail
      );
      if (sameAddress) {
        return { 
          isValid: false, 
          reason: "This address has already been referred. Each address can only be referred once.",
          severity: "high"
        };
      }
    }

    // Check 2: Same phone number, different email
    if (settings.blockSamePhoneNumber) {
      const samePhone = referredBookings.find(b => {
        const existingPhone = b.phone.replace(/\D/g, '');
        return existingPhone === normalizedPhone && 
               b.email.toLowerCase().trim() !== normalizedEmail;
      });
      if (samePhone) {
        return { 
          isValid: false, 
          reason: "This phone number has already been referred. Each phone number can only be referred once.",
          severity: "high"
        };
      }
    }

    // Check 3: Same IP address (if provided and enabled)
    if (ipAddress && settings.blockSameIpAddress) {
      const sameIP = referredBookings.find(b => 
        b.ipAddress === ipAddress && 
        b.email.toLowerCase().trim() !== normalizedEmail
      );
      if (sameIP) {
        return { 
          isValid: false, 
          reason: "Multiple referrals detected from the same location. Please contact support if you believe this is an error.",
          severity: "medium"
        };
      }
    }

    // Check 4: Velocity limits - how many times this specific code was used recently
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const codeBookings = referredBookings.filter(b => b.referralCode === referralCode);
    
    // Daily limit
    const dailyReferrals = codeBookings.filter(b => {
      const createdAt = new Date(b.createdAt);
      return createdAt >= oneDayAgo;
    });
    
    if (dailyReferrals.length >= settings.maxReferralsPerDay) {
      return { 
        isValid: false, 
        reason: `This referral code has reached its daily limit of ${settings.maxReferralsPerDay} uses. Please try again tomorrow.`,
        severity: "medium"
      };
    }

    // Weekly limit
    const weeklyReferrals = codeBookings.filter(b => {
      const createdAt = new Date(b.createdAt);
      return createdAt >= oneWeekAgo;
    });
    
    if (weeklyReferrals.length >= settings.maxReferralsPerWeek) {
      return { 
        isValid: false, 
        reason: `This referral code has reached its weekly limit of ${settings.maxReferralsPerWeek} uses. Please try again next week.`,
        severity: "medium"
      };
    }

    // All checks passed
    return { isValid: true };
  }

  // Admin Dashboard: Get aggregated referral statistics
  async getAdminReferralStats() {
    const allReferrals = await this.getReferrals();
    const totalReferrals = allReferrals.length;
    const pendingReferrals = allReferrals.filter(r => r.status === 'pending').length;
    const completedReferrals = allReferrals.filter(r => r.status === 'completed').length;
    const creditedReferrals = allReferrals.filter(r => r.status === 'credited').length;
    
    const conversionRate = totalReferrals > 0
      ? ((completedReferrals + creditedReferrals) / totalReferrals) * 100
      : 0;
    
    const allCredits = await db.select().from(referralCredits);
    const totalCreditsAwarded = allCredits.reduce((sum, credit) => sum + credit.totalEarned, 0);
    
    return {
      totalReferrals,
      pendingReferrals,
      completedReferrals: completedReferrals + creditedReferrals,
      totalCreditsAwarded,
      conversionRate,
    };
  }

  // Admin Dashboard: Get top referrers leaderboard
  async getTopReferrers(limit: number = 10) {
    const allCustomers = await this.getCustomers();
    const customersWithCodes = allCustomers.filter(c => c.referralCode);
    
    const referrerStats = await Promise.all(
      customersWithCodes.map(async (customer) => {
        const customerReferrals = await this.getReferralsByReferrer(customer.id);
        const successfulReferrals = customerReferrals.filter(r => r.status === 'credited');
        const credit = await this.getReferralCredit(customer.id);
        
        return {
          customerId: customer.id,
          customerName: customer.name,
          customerEmail: customer.email,
          referralCode: customer.referralCode!,
          successfulReferrals: successfulReferrals.length,
          totalCreditsEarned: credit?.totalEarned || 0,
        };
      })
    );
    
    return referrerStats
      .filter(stat => stat.successfulReferrals > 0)
      .sort((a, b) => b.successfulReferrals - a.successfulReferrals)
      .slice(0, limit);
  }

  // Admin Dashboard: Get all customer credit balances
  async getAllReferralCredits() {
    const allCredits = await db.select().from(referralCredits);
    const allCustomers = await this.getCustomers();
    
    // Get all customers who have referral codes (active in referral program)
    const customersInProgram = allCustomers.filter(c => c.referralCode);
    
    const creditsWithCustomerInfo = customersInProgram.map((customer) => {
      const credit = allCredits.find(c => c.customerId === customer.id);
      return {
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        balance: credit?.availableBalance || 0,
      };
    });
    
    // Return all customers in program, even with zero balance (for manual adjustments)
    return creditsWithCustomerInfo;
  }

  // Churn risk operations
  async calculateCustomerChurnRisk(customerId: string): Promise<{ risk: string; daysSinceLastBooking: number }> {
    const settings = await this.getBusinessSettings();
    const highDays = settings?.churnRiskHighDays || 90;
    const mediumDays = settings?.churnRiskMediumDays || 60;

    const lastBookingResult = await db
      .select({ lastDate: sql<Date>`max(${bookings.createdAt})` })
      .from(bookings)
      .where(sql`${bookings.customerId} = ${customerId} AND ${bookings.status} != 'cancelled'`);

    let lastActivityDate = lastBookingResult[0]?.lastDate;

    if (!lastActivityDate) {
      const lastQuoteResult = await db
        .select({ lastDate: sql<Date>`max(${quotes.createdAt})` })
        .from(quotes)
        .where(eq(quotes.customerId, customerId));
      lastActivityDate = lastQuoteResult[0]?.lastDate;
    }

    const daysSinceLastBooking = lastActivityDate
      ? Math.floor((Date.now() - new Date(lastActivityDate).getTime()) / (1000 * 60 * 60 * 24))
      : 9999;

    let risk = "low";
    if (daysSinceLastBooking >= highDays) {
      risk = "high";
    } else if (daysSinceLastBooking >= mediumDays) {
      risk = "medium";
    }

    return { risk, daysSinceLastBooking };
  }

  async updateCustomerChurnRisk(customerId: string, risk: string): Promise<Customer | undefined> {
    const [updated] = await db
      .update(customers)
      .set({ churnRisk: risk, churnRiskLastCalculated: new Date() })
      .where(eq(customers.id, customerId))
      .returning();
    return updated;
  }

  async getAtRiskCustomers(): Promise<Customer[]> {
    return await db
      .select()
      .from(customers)
      .where(or(eq(customers.churnRisk, "medium"), eq(customers.churnRisk, "high")));
  }

  // Anomaly alert operations
  async createAnomalyAlert(alert: InsertAnomalyAlert): Promise<AnomalyAlert> {
    const [created] = await db.insert(anomalyAlerts).values(alert).returning();
    return created;
  }

  async getAnomalyAlerts(status?: string): Promise<AnomalyAlert[]> {
    if (status) {
      return await db
        .select()
        .from(anomalyAlerts)
        .where(eq(anomalyAlerts.status, status))
        .orderBy(desc(anomalyAlerts.createdAt));
    }
    return await db.select().from(anomalyAlerts).orderBy(desc(anomalyAlerts.createdAt));
  }

  async getAnomalyAlert(id: string): Promise<AnomalyAlert | undefined> {
    const [alert] = await db.select().from(anomalyAlerts).where(eq(anomalyAlerts.id, id));
    return alert;
  }

  async acknowledgeAnomalyAlert(id: string, userId: string): Promise<AnomalyAlert | undefined> {
    const [updated] = await db
      .update(anomalyAlerts)
      .set({
        status: "acknowledged",
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
      })
      .where(eq(anomalyAlerts.id, id))
      .returning();
    return updated;
  }

  async resolveAnomalyAlert(id: string, userId: string): Promise<AnomalyAlert | undefined> {
    const [updated] = await db
      .update(anomalyAlerts)
      .set({
        status: "resolved",
        resolvedBy: userId,
        resolvedAt: new Date(),
      })
      .where(eq(anomalyAlerts.id, id))
      .returning();
    return updated;
  }

  async deleteAnomalyAlert(id: string): Promise<void> {
    await db.delete(anomalyAlerts).where(eq(anomalyAlerts.id, id));
  }

  // Quick actions dashboard aggregation
  async getQuickActionsCounts(): Promise<{
    pendingQuotes: number;
    overdueInvoices: number;
    pendingReviews: number;
    todaysBookings: number;
    atRiskCustomers: number;
    unreadMessages: number;
    openAlerts: number;
  }> {
    const today = new Date().toISOString().split('T')[0];
    
    const result = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM ${quotes} WHERE status = 'pending') as pending_quotes,
        (SELECT COUNT(*) FROM ${invoices} WHERE due_date < now() AND status != 'paid') as overdue_invoices,
        (SELECT COUNT(*) FROM ${reviews} WHERE status = 'pending') as pending_reviews,
        (SELECT COUNT(*) FROM ${bookings} WHERE date = ${today}) as todays_bookings,
        (SELECT COUNT(*) FROM ${customers} WHERE churn_risk IN ('medium', 'high')) as at_risk_customers,
        (SELECT COUNT(*) FROM ${contactMessages} WHERE status = 'new') as unread_messages,
        (SELECT COUNT(*) FROM ${anomalyAlerts} WHERE status = 'open') as open_alerts
    `);

    const row = result.rows[0] as any;
    return {
      pendingQuotes: Number(row.pending_quotes) || 0,
      overdueInvoices: Number(row.overdue_invoices) || 0,
      pendingReviews: Number(row.pending_reviews) || 0,
      todaysBookings: Number(row.todays_bookings) || 0,
      atRiskCustomers: Number(row.at_risk_customers) || 0,
      unreadMessages: Number(row.unread_messages) || 0,
      openAlerts: Number(row.open_alerts) || 0,
    };
  }

  // Intelligence Dashboard overview aggregation
  async getIntelligenceOverview(): Promise<IntelligenceOverview> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoStr = oneWeekAgo.toISOString();

    const result = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM ${customers} WHERE churn_risk = 'high') as high_risk,
        (SELECT COUNT(*) FROM ${customers} WHERE churn_risk = 'medium') as medium_risk,
        (SELECT COUNT(*) FROM ${customers} WHERE churn_risk IN ('high', 'medium')) as total_at_risk,
        (SELECT COUNT(*) FROM ${customers} WHERE churn_risk IN ('high', 'medium') AND updated_at >= ${oneWeekAgoStr}) as last_week_at_risk,
        (SELECT COUNT(*) FROM ${anomalyAlerts} WHERE status = 'open') as open_alerts,
        (SELECT COUNT(*) FROM ${anomalyAlerts} WHERE status = 'open' AND severity = 'high') as high_severity_alerts,
        (SELECT COUNT(*) FROM ${customers} WHERE tags @> ARRAY['vip']::text[]) as vip_customers,
        (SELECT COUNT(*) FROM ${customers} WHERE tags @> ARRAY['at-risk']::text[]) as at_risk_tagged,
        (SELECT COUNT(*) FROM ${customers} WHERE tags @> ARRAY['new']::text[]) as new_customers,
        (SELECT COUNT(*) FROM ${customers} WHERE tags @> ARRAY['referral-champion']::text[]) as referral_champions,
        (SELECT COUNT(*) FROM ${contactMessages} WHERE status = 'new') as new_messages,
        (SELECT COUNT(*) FROM ${contactMessages} WHERE status = 'in_progress') as in_progress_messages,
        (SELECT COUNT(*) FROM ${contactMessages} WHERE status IN ('new', 'in_progress')) as total_unresolved,
        (SELECT COUNT(*) FROM ${quotes} WHERE status = 'pending') as pending_quotes,
        (SELECT COUNT(*) FROM ${invoices} WHERE due_date < now() AND status != 'paid') as overdue_invoices,
        (SELECT COUNT(*) FROM ${reviews} WHERE status = 'pending') as pending_reviews,
        (SELECT COUNT(*) FROM ${bookings} WHERE status = 'pending') as pending_bookings
    `);

    const row = result.rows[0] as any;
    
    const highRisk = Number(row.high_risk) || 0;
    const mediumRisk = Number(row.medium_risk) || 0;
    const totalAtRisk = Number(row.total_at_risk) || 0;
    const lastWeekAtRisk = Number(row.last_week_at_risk) || 0;
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (totalAtRisk > lastWeekAtRisk) {
      trend = 'up';
    } else if (totalAtRisk < lastWeekAtRisk) {
      trend = 'down';
    }

    const recentAlerts = await db
      .select()
      .from(anomalyAlerts)
      .where(eq(anomalyAlerts.status, 'open'))
      .orderBy(desc(anomalyAlerts.createdAt))
      .limit(5);

    const settings = await this.getBusinessSettings();

    return {
      churnRisk: {
        highRiskCount: highRisk,
        mediumRiskCount: mediumRisk,
        totalAtRisk,
        trend,
        lastWeekCount: lastWeekAtRisk,
      },
      anomalies: {
        openCount: Number(row.open_alerts) || 0,
        highSeverityCount: Number(row.high_severity_alerts) || 0,
        recentAlerts: recentAlerts.map(alert => ({
          id: alert.id,
          type: alert.type as "bulk_promo_creation" | "large_invoice_change" | "mass_cancellations" | "bulk_deletions",
          severity: alert.severity as "low" | "medium" | "high",
          title: alert.title,
          createdAt: alert.createdAt.toISOString(),
        })),
      },
      segments: {
        vipCount: Number(row.vip_customers) || 0,
        atRiskCount: Number(row.at_risk_tagged) || 0,
        newCount: Number(row.new_customers) || 0,
        referralChampionsCount: Number(row.referral_champions) || 0,
      },
      messageStatus: {
        newCount: Number(row.new_messages) || 0,
        inProgressCount: Number(row.in_progress_messages) || 0,
        totalUnresolved: Number(row.total_unresolved) || 0,
        avgResponseTime: null,
      },
      quickActions: {
        unreadMessages: Number(row.new_messages) || 0,
        pendingQuotes: Number(row.pending_quotes) || 0,
        pendingBookings: Number(row.pending_bookings) || 0,
        atRiskCustomers: totalAtRisk,
        openAlerts: Number(row.open_alerts) || 0,
        pendingReviews: Number(row.pending_reviews) || 0,
        overdueInvoices: Number(row.overdue_invoices) || 0,
      },
      businessSettings: {
        winBackCampaignsEnabled: (settings?.winBackDiscountPercent || 0) > 0,
        churnRiskThreshold: settings?.churnRiskHighDays || 90,
        anomalyDetectionEnabled: (settings?.anomalyPromoCreationThreshold || 0) > 0,
        autoTaggingEnabled: true, // Always enabled in this version
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  // Global search across bookings, customers, and quotes
  async globalSearch(query: string, limit: number = 10): Promise<GlobalSearchResult> {
    if (!query || query.trim().length < 2) {
      return { bookings: [], customers: [], quotes: [] };
    }

    const trimmedQuery = query.trim();
    const searchPattern = `%${trimmedQuery}%`;
    const perEntityLimit = Math.ceil(limit / 3);

    const [bookingResults, customerResults, quoteResults] = await Promise.all([
      db
        .select({
          id: bookings.id,
          name: bookings.name,
          email: bookings.email,
          service: bookings.service,
          date: bookings.date,
          status: bookings.status,
          phone: bookings.phone,
          relevance: sql<number>`
            CASE
              WHEN LOWER(${bookings.email}) = LOWER(${trimmedQuery}) THEN 3
              WHEN LOWER(${bookings.name}) = LOWER(${trimmedQuery}) THEN 2
              ELSE 1
            END
          `.as('relevance'),
        })
        .from(bookings)
        .where(
          sql`${bookings.name} ILIKE ${searchPattern} 
              OR ${bookings.email} ILIKE ${searchPattern} 
              OR ${bookings.phone} ILIKE ${searchPattern}
              OR ${bookings.service} ILIKE ${searchPattern}`
        )
        .orderBy(sql`relevance DESC, ${bookings.date} DESC`)
        .limit(perEntityLimit),

      db
        .select({
          id: customers.id,
          name: customers.name,
          email: customers.email,
          phone: customers.phone,
          totalBookings: customers.totalBookings,
          lastBooking: customers.updatedAt,
          relevance: sql<number>`
            CASE
              WHEN LOWER(${customers.email}) = LOWER(${trimmedQuery}) THEN 3
              WHEN LOWER(${customers.name}) = LOWER(${trimmedQuery}) THEN 2
              ELSE 1
            END
          `.as('relevance'),
        })
        .from(customers)
        .where(
          sql`${customers.name} ILIKE ${searchPattern} 
              OR ${customers.email} ILIKE ${searchPattern} 
              OR ${customers.phone} ILIKE ${searchPattern}`
        )
        .orderBy(sql`relevance DESC, ${customers.updatedAt} DESC NULLS LAST`)
        .limit(perEntityLimit),

      db
        .select({
          id: quotes.id,
          name: quotes.name,
          email: quotes.email,
          service: quotes.serviceType,
          status: quotes.status,
          createdAt: quotes.createdAt,
          phone: quotes.phone,
          relevance: sql<number>`
            CASE
              WHEN LOWER(${quotes.email}) = LOWER(${trimmedQuery}) THEN 3
              WHEN LOWER(${quotes.name}) = LOWER(${trimmedQuery}) THEN 2
              ELSE 1
            END
          `.as('relevance'),
        })
        .from(quotes)
        .where(
          sql`${quotes.name} ILIKE ${searchPattern} 
              OR ${quotes.email} ILIKE ${searchPattern} 
              OR ${quotes.phone} ILIKE ${searchPattern}
              OR ${quotes.serviceType} ILIKE ${searchPattern}`
        )
        .orderBy(sql`relevance DESC, ${quotes.createdAt} DESC`)
        .limit(perEntityLimit),
    ]);

    return {
      bookings: bookingResults.map(b => ({
        id: b.id,
        name: b.name,
        email: b.email,
        service: b.service,
        date: typeof b.date === 'string' ? b.date : b.date.toISOString(),
        status: b.status,
        phone: b.phone,
      })),
      customers: customerResults.map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        totalBookings: c.totalBookings,
        lastBooking: c.lastBooking?.toISOString() || null,
      })),
      quotes: quoteResults.map(q => ({
        id: q.id,
        name: q.name,
        email: q.email,
        service: q.service,
        status: q.status,
        createdAt: q.createdAt.toISOString(),
        phone: q.phone,
      })),
    };
  }

  // Message operations enhancement
  async updateContactMessage(id: string, message: Partial<InsertContactMessage>): Promise<ContactMessage | undefined> {
    const [updated] = await db
      .update(contactMessages)
      .set(message)
      .where(eq(contactMessages.id, id))
      .returning();
    return updated;
  }

  async assignContactMessage(id: string, employeeId: string): Promise<ContactMessage | undefined> {
    const [updated] = await db
      .update(contactMessages)
      .set({
        assignedTo: employeeId,
        status: "in_progress",
      })
      .where(eq(contactMessages.id, id))
      .returning();
    return updated;
  }

  async replyToContactMessage(id: string, replyMessage: string, userId: string): Promise<ContactMessage | undefined> {
    const [updated] = await db
      .update(contactMessages)
      .set({
        replyMessage,
        status: "replied",
        repliedAt: new Date(),
      })
      .where(eq(contactMessages.id, id))
      .returning();
    return updated;
  }

  async getUnreadMessages(): Promise<ContactMessage[]> {
    return await db
      .select()
      .from(contactMessages)
      .where(eq(contactMessages.status, "new"))
      .orderBy(desc(contactMessages.createdAt));
  }

  // Customer operations enhancement
  async updateCustomerTags(customerId: string, tags: string[]): Promise<Customer | undefined> {
    const [updated] = await db
      .update(customers)
      .set({ tags })
      .where(eq(customers.id, customerId))
      .returning();
    return updated;
  }

  async autoTagCustomer(customerId: string): Promise<Customer | undefined> {
    const customer = await this.getCustomer(customerId);
    if (!customer) return undefined;

    const tags: string[] = [];

    if (customer.totalBookings >= 5) {
      tags.push("vip");
    }

    if (customer.churnRisk === "medium" || customer.churnRisk === "high") {
      tags.push("at-risk");
    }

    const daysSinceCreated = Math.floor(
      (Date.now() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceCreated <= 30) {
      tags.push("new");
    }

    if (customer.referralCode) {
      const referrals = await this.getReferralsByReferrer(customerId);
      const creditedReferrals = referrals.filter(r => r.status === "credited");
      if (creditedReferrals.length >= 3) {
        tags.push("referral-champion");
      }
    }

    const uniqueTags = Array.from(new Set(tags));
    return await this.updateCustomerTags(customerId, uniqueTags);
  }

  async getCustomersByTag(tag: string): Promise<Customer[]> {
    return await db
      .select()
      .from(customers)
      .where(sql`${tag} = ANY(${customers.tags})`);
  }

  // Employee availability operations
  async getSuggestedEmployees(date: string, timeSlot: string): Promise<Employee[]> {
    const allEmployees = await this.getActiveEmployees();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = dayNames[new Date(date).getDay()] as 
      'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

    return allEmployees.filter((emp) => {
      if (!emp.availability) return false;
      
      const dayAvailability = emp.availability[dayOfWeek];
      if (!dayAvailability?.available) return false;

      if (emp.vacationDays?.includes(date)) return false;

      return true;
    });
  }

  async getEmployeeWorkload(employeeId: string, startDate: string, endDate: string): Promise<{ totalBookings: number; bookings: Booking[] }> {
    const workloadBookings = await db
      .select()
      .from(bookings)
      .where(
        sql`${employeeId} = ANY(${bookings.assignedEmployeeIds}) AND ${bookings.date} >= ${startDate} AND ${bookings.date} <= ${endDate}`
      )
      .orderBy(bookings.date);

    return {
      totalBookings: workloadBookings.length,
      bookings: workloadBookings,
    };
  }

  // CMS Content operations
  async getCmsContent(section: string): Promise<CmsContent[]> {
    return await db.select().from(cmsContent).where(eq(cmsContent.section, section));
  }

  async getCmsContentByKey(section: string, key: string): Promise<CmsContent | undefined> {
    const result = await db
      .select()
      .from(cmsContent)
      .where(sql`${cmsContent.section} = ${section} AND ${cmsContent.key} = ${key}`);
    return result[0];
  }

  async getAllCmsContent(): Promise<CmsContent[]> {
    return await db.select().from(cmsContent).orderBy(cmsContent.section, cmsContent.key);
  }

  async upsertCmsContent(content: InsertCmsContent): Promise<CmsContent> {
    const result = await db
      .insert(cmsContent)
      .values(content)
      .onConflictDoUpdate({
        target: [cmsContent.section, cmsContent.key],
        set: {
          value: content.value,
          contentType: content.contentType,
          updatedAt: sql`now()`,
        },
      })
      .returning();
    return result[0];
  }

  async deleteCmsContent(section: string, key: string): Promise<void> {
    await db
      .delete(cmsContent)
      .where(sql`${cmsContent.section} = ${section} AND ${cmsContent.key} = ${key}`);
  }

  // CMS Section operations
  async getAllCmsSections(): Promise<CmsSection[]> {
    return await db.select().from(cmsSections).orderBy(cmsSections.displayOrder);
  }

  async getCmsSection(section: string): Promise<CmsSection | undefined> {
    const result = await db.select().from(cmsSections).where(eq(cmsSections.section, section));
    return result[0];
  }

  async upsertCmsSection(sectionData: InsertCmsSection): Promise<CmsSection> {
    const result = await db
      .insert(cmsSections)
      .values(sectionData)
      .onConflictDoUpdate({
        target: [cmsSections.section],
        set: {
          visible: sectionData.visible,
          displayOrder: sectionData.displayOrder,
          updatedAt: sql`now()`,
        },
      })
      .returning();
    return result[0];
  }

  async updateSectionVisibility(section: string, visible: boolean): Promise<CmsSection | undefined> {
    const result = await db
      .update(cmsSections)
      .set({ visible, updatedAt: sql`now()` })
      .where(eq(cmsSections.section, section))
      .returning();
    return result[0];
  }

  // CMS Asset operations
  async getCmsAsset(section: string, key: string): Promise<CmsAsset | undefined> {
    const result = await db
      .select()
      .from(cmsAssets)
      .where(sql`${cmsAssets.section} = ${section} AND ${cmsAssets.key} = ${key}`);
    return result[0];
  }

  async getCmsAssetsBySection(section: string): Promise<CmsAsset[]> {
    return await db.select().from(cmsAssets).where(eq(cmsAssets.section, section));
  }

  async upsertCmsAsset(asset: InsertCmsAsset): Promise<CmsAsset> {
    const result = await db
      .insert(cmsAssets)
      .values(asset)
      .onConflictDoUpdate({
        target: [cmsAssets.section, cmsAssets.key],
        set: {
          imageData: asset.imageData,
          mimeType: asset.mimeType,
          originalName: asset.originalName,
          updatedAt: sql`now()`,
        },
      })
      .returning();
    return result[0];
  }

  async deleteCmsAsset(section: string, key: string): Promise<void> {
    await db
      .delete(cmsAssets)
      .where(sql`${cmsAssets.section} = ${section} AND ${cmsAssets.key} = ${key}`);
  }
}

export const storage = new DbStorage();
