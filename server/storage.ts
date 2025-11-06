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
} from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

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
  getBookingsByEmail(email: string): Promise<Booking[]>;
  updateBooking(id: string, booking: Partial<InsertBooking>): Promise<Booking | undefined>;
  updateBookingStatus(id: string, status: string): Promise<Booking | undefined>;
  deleteBooking(id: string): Promise<void>;

  // Quote operations
  createQuote(quote: InsertQuote): Promise<Quote>;
  getQuotes(): Promise<Quote[]>;
  getQuote(id: string): Promise<Quote | undefined>;
  updateQuoteStatus(id: string, status: string): Promise<Quote | undefined>;
  deleteQuote(id: string): Promise<void>;

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
  deleteCustomer(id: string): Promise<void>;
  incrementCustomerBookings(id: string): Promise<void>;
  incrementCustomerQuotes(id: string): Promise<void>;
  incrementCustomerInvoices(id: string): Promise<void>;

  // Activity log operations
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  getActivityLogsByEntity(entityType: string, entityId: string): Promise<ActivityLog[]>;
  getActivityLogsByUser(userId: string): Promise<ActivityLog[]>;
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

  async deleteCustomer(id: string): Promise<void> {
    await db.delete(customers).where(eq(customers.id, id));
  }

  async incrementCustomerBookings(id: string): Promise<void> {
    await db.update(customers)
      .set({ totalBookings: sql`${customers.totalBookings} + 1` })
      .where(eq(customers.id, id));
  }

  async incrementCustomerQuotes(id: string): Promise<void> {
    await db.update(customers)
      .set({ totalQuotes: sql`${customers.totalQuotes} + 1` })
      .where(eq(customers.id, id));
  }

  async incrementCustomerInvoices(id: string): Promise<void> {
    await db.update(customers)
      .set({ totalInvoices: sql`${customers.totalInvoices} + 1` })
      .where(eq(customers.id, id));
  }

  // Activity log operations
  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const result = await db.insert(activityLogs).values(log).returning();
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
}

export const storage = new DbStorage();
