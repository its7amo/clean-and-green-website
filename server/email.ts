import { Resend } from 'resend';
import { storage } from './storage';

export const resend = new Resend(process.env.RESEND_API_KEY);

// Get base URL for links (environment-aware)
function getBaseUrl(): string {
  return process.env.APP_URL || process.env.REPLIT_DEV_DOMAIN || 'https://clean-and-green-website.onrender.com';
}

// Template replacement helper
export function replaceTemplatePlaceholders(template: string, data: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{{${key}}}`;
    result = result.split(placeholder).join(value);
  }
  return result;
}

export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export interface QuoteEmailData {
  name: string;
  email: string;
  phone: string;
  address: string;
  serviceType: string;
  propertySize: string;
  customSize?: string;
  details: string;
}

export interface BookingEmailData {
  name: string;
  email: string;
  phone: string;
  address: string;
  serviceType: string;
  propertySize: string;
  date: string;
  timeSlot: string;
}

export async function sendQuoteNotification(
  quoteData: QuoteEmailData,
  businessEmail: string
): Promise<void> {
  const propertyInfo = quoteData.customSize 
    ? `${escapeHtml(quoteData.propertySize)} (Custom: ${escapeHtml(quoteData.customSize)})` 
    : escapeHtml(quoteData.propertySize);

  try {
    await resend.emails.send({
      from: 'Clean & Green <noreply@voryn.store>',
      to: businessEmail,
      replyTo: quoteData.email,
      subject: `New Quote Request - ${escapeHtml(quoteData.name)}`,
      html: `
        <h2>New Quote Request Received</h2>
        <p>You have received a new quote request from your website.</p>
        
        <h3>Customer Information:</h3>
        <ul>
          <li><strong>Name:</strong> ${escapeHtml(quoteData.name)}</li>
          <li><strong>Email:</strong> <a href="mailto:${escapeHtml(quoteData.email)}">${escapeHtml(quoteData.email)}</a></li>
          <li><strong>Phone:</strong> ${escapeHtml(quoteData.phone)}</li>
          <li><strong>Address:</strong> ${escapeHtml(quoteData.address)}</li>
        </ul>
        
        <h3>Service Details:</h3>
        <ul>
          <li><strong>Service Type:</strong> ${escapeHtml(quoteData.serviceType)}</li>
          <li><strong>Property Size:</strong> ${propertyInfo}</li>
          <li><strong>Additional Details:</strong> ${escapeHtml(quoteData.details)}</li>
        </ul>
        
        <p><a href="${getBaseUrl()}/admin/quotes">View in Admin Dashboard</a></p>
      `,
    });
    console.log('Quote notification email sent successfully');
  } catch (error) {
    console.error('Failed to send quote notification email:', error);
    // Don't throw error - we don't want email failures to break the quote submission
  }
}

export async function sendBookingNotification(
  bookingData: BookingEmailData,
  businessEmail: string
): Promise<void> {
  try {
    await resend.emails.send({
      from: 'Clean & Green <noreply@voryn.store>',
      to: businessEmail,
      replyTo: bookingData.email,
      subject: `New Booking - ${escapeHtml(bookingData.name)}`,
      html: `
        <h2>New Booking Received</h2>
        <p>You have received a new booking from your website.</p>
        
        <h3>Customer Information:</h3>
        <ul>
          <li><strong>Name:</strong> ${escapeHtml(bookingData.name)}</li>
          <li><strong>Email:</strong> <a href="mailto:${escapeHtml(bookingData.email)}">${escapeHtml(bookingData.email)}</a></li>
          <li><strong>Phone:</strong> ${escapeHtml(bookingData.phone)}</li>
          <li><strong>Address:</strong> ${escapeHtml(bookingData.address)}</li>
        </ul>
        
        <h3>Service Details:</h3>
        <ul>
          <li><strong>Service Type:</strong> ${escapeHtml(bookingData.serviceType)}</li>
          <li><strong>Property Size:</strong> ${escapeHtml(bookingData.propertySize)}</li>
          <li><strong>Date:</strong> ${escapeHtml(bookingData.date)}</li>
          <li><strong>Time Slot:</strong> ${escapeHtml(bookingData.timeSlot)}</li>
        </ul>
        
        <p><a href="${getBaseUrl()}/admin/bookings">View in Admin Dashboard</a></p>
      `,
    });
    console.log('Booking notification email sent successfully');
  } catch (error) {
    console.error('Failed to send booking notification email:', error);
    // Don't throw error - we don't want email failures to break the booking submission
  }
}

export interface ContactMessageEmailData {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

export async function sendContactMessageNotification(
  messageData: ContactMessageEmailData,
  businessEmail: string
): Promise<void> {
  try {
    await resend.emails.send({
      from: 'Clean & Green <noreply@voryn.store>',
      to: businessEmail,
      replyTo: messageData.email,
      subject: `New Contact Message - ${escapeHtml(messageData.name)}`,
      html: `
        <h2>New Contact Message Received</h2>
        <p>You have received a new message from your website contact form.</p>
        
        <h3>Sender Information:</h3>
        <ul>
          <li><strong>Name:</strong> ${escapeHtml(messageData.name)}</li>
          <li><strong>Email:</strong> <a href="mailto:${escapeHtml(messageData.email)}">${escapeHtml(messageData.email)}</a></li>
          ${messageData.phone ? `<li><strong>Phone:</strong> ${escapeHtml(messageData.phone)}</li>` : ''}
        </ul>
        
        <h3>Message:</h3>
        <p style="background-color: #f3f4f6; padding: 15px; border-left: 4px solid #22c55e;">
          ${escapeHtml(messageData.message)}
        </p>
        
        <p><a href="${getBaseUrl()}/admin/messages">View in Admin Dashboard</a></p>
      `,
    });
    console.log('Contact message notification email sent successfully');
  } catch (error) {
    console.error('Failed to send contact message notification email:', error);
  }
}

export interface CustomerBookingData extends BookingEmailData {
  bookingId: string;
  managementToken: string;
}

export async function sendBookingUnderReviewEmail(
  bookingData: CustomerBookingData
): Promise<void> {
  const baseUrl = getBaseUrl();
  const portalUrl = `${baseUrl}/portal`;
  
  try {
    await resend.emails.send({
      from: 'Clean & Green <noreply@voryn.store>',
      to: bookingData.email,
      subject: `Booking Request Received - ${escapeHtml(bookingData.serviceType)}`,
      html: `
        <h2>📋 Your Booking Request is Under Review</h2>
        <p>Hi ${escapeHtml(bookingData.name)},</p>
        <p>Thank you for choosing Clean & Green! We've received your booking request and are checking our availability.</p>
        
        <h3>Your Booking Details:</h3>
        <ul>
          <li><strong>Service:</strong> ${escapeHtml(bookingData.serviceType)}</li>
          <li><strong>Property Size:</strong> ${escapeHtml(bookingData.propertySize)}</li>
          <li><strong>Requested Date:</strong> ${escapeHtml(bookingData.date)}</li>
          <li><strong>Requested Time:</strong> ${escapeHtml(bookingData.timeSlot)}</li>
          <li><strong>Address:</strong> ${escapeHtml(bookingData.address)}</li>
        </ul>
        
        <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e40af;">ℹ️ What's Next?</h3>
          <p style="margin-bottom: 0; color: #1e40af;">Our team is reviewing your request to confirm availability for your preferred date and time. You'll receive a confirmation email once your booking is approved. This usually takes less than 24 hours.</p>
        </div>
        
        <p>View your booking status anytime: <a href="${portalUrl}" style="color: #22c55e; font-weight: bold;">Customer Portal</a></p>
        
        <p>If you have any questions or need to make changes, feel free to reply to this email or call us.</p>
        
        <p>Thank you for choosing Clean & Green!</p>
        
        <p>Best regards,<br>Clean & Green Team</p>
      `,
    });
    console.log('Customer booking under review email sent successfully');
  } catch (error) {
    console.error('Failed to send booking under review email:', error);
  }
}

export async function sendCustomerBookingConfirmation(
  bookingData: CustomerBookingData
): Promise<void> {
  const baseUrl = getBaseUrl();
  const manageUrl = `${baseUrl}/manage-booking/${bookingData.managementToken}`;
  
  try {
    await resend.emails.send({
      from: 'Clean & Green <noreply@voryn.store>',
      to: bookingData.email,
      subject: `Booking Confirmation - ${escapeHtml(bookingData.serviceType)}`,
      html: `
        <h2>✅ Your Booking is Confirmed!</h2>
        <p>Hi ${escapeHtml(bookingData.name)},</p>
        <p>Great news! Your cleaning service has been confirmed. We look forward to serving you!</p>
        
        <h3>Booking Details:</h3>
        <ul>
          <li><strong>Service:</strong> ${escapeHtml(bookingData.serviceType)}</li>
          <li><strong>Property Size:</strong> ${escapeHtml(bookingData.propertySize)}</li>
          <li><strong>Date:</strong> ${escapeHtml(bookingData.date)}</li>
          <li><strong>Time:</strong> ${escapeHtml(bookingData.timeSlot)}</li>
          <li><strong>Address:</strong> ${escapeHtml(bookingData.address)}</li>
        </ul>
        
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #92400e;">⚠️ Cancellation Policy</h3>
          <p style="margin-bottom: 0; color: #92400e;"><strong>Important:</strong> Cancellations made less than 24 hours before your scheduled appointment are subject to a <strong>$35 cancellation fee</strong>. Please reschedule or cancel as early as possible to avoid this charge.</p>
        </div>
        
        <h3>Need to Make Changes?</h3>
        <p style="margin: 20px 0;">
          <a href="${manageUrl}" style="display: inline-block; padding: 12px 24px; background-color: #22c55e; color: white; text-decoration: none; border-radius: 6px; margin-right: 10px;">Reschedule Booking</a>
          <a href="${manageUrl}" style="display: inline-block; padding: 12px 24px; background-color: #ef4444; color: white; text-decoration: none; border-radius: 6px;">Cancel Booking</a>
        </p>
        
        <p>View your booking status anytime: <a href="${getBaseUrl()}/portal">Customer Portal</a></p>
        
        <p>If you have any questions, feel free to reply to this email or call us.</p>
        
        <p>Thank you for choosing Clean & Green!</p>
        
        <p>Best regards,<br>Clean & Green Team</p>
      `,
    });
    console.log('Customer booking confirmation email sent successfully');
  } catch (error) {
    console.error('Failed to send customer booking confirmation:', error);
  }
}

export async function sendCustomerQuoteConfirmation(
  quoteData: QuoteEmailData
): Promise<void> {
  const propertyInfo = quoteData.customSize 
    ? `${escapeHtml(quoteData.propertySize)} (Custom: ${escapeHtml(quoteData.customSize)})` 
    : escapeHtml(quoteData.propertySize);

  try {
    await resend.emails.send({
      from: 'Clean & Green <noreply@voryn.store>',
      to: quoteData.email,
      subject: 'Quote Request Received - Clean & Green',
      html: `
        <h2>Thank You for Your Quote Request!</h2>
        <p>Hi ${escapeHtml(quoteData.name)},</p>
        <p>We've received your quote request and will get back to you within 24 hours with a custom estimate.</p>
        
        <h3>Your Request Details:</h3>
        <ul>
          <li><strong>Service Type:</strong> ${escapeHtml(quoteData.serviceType)}</li>
          <li><strong>Property Size:</strong> ${propertyInfo}</li>
          <li><strong>Details:</strong> ${escapeHtml(quoteData.details)}</li>
          <li><strong>Address:</strong> ${escapeHtml(quoteData.address)}</li>
        </ul>
        
        <h3>What's Next?</h3>
        <p>Our team will review your request and send you a detailed quote tailored to your specific needs. We'll contact you at ${escapeHtml(quoteData.phone)} or via email if we need any additional information.</p>
        
        <p>Looking forward to serving you with our eco-friendly cleaning services!</p>
        
        <p>Best regards,<br>Clean & Green Team</p>
      `,
    });
    console.log('Customer quote confirmation email sent successfully');
  } catch (error) {
    console.error('Failed to send customer quote confirmation:', error);
  }
}

export async function sendBookingChangeNotification(
  bookingData: BookingEmailData & { action: 'rescheduled' | 'cancelled', originalDate?: string, originalTimeSlot?: string },
  businessEmail: string
): Promise<void> {
  try {
    await resend.emails.send({
      from: 'Clean & Green <noreply@voryn.store>',
      to: businessEmail,
      replyTo: bookingData.email,
      subject: `Booking ${bookingData.action.charAt(0).toUpperCase() + bookingData.action.slice(1)} - ${escapeHtml(bookingData.name)}`,
      html: `
        <h2>Customer ${bookingData.action.charAt(0).toUpperCase() + bookingData.action.slice(1)} Booking</h2>
        <p>${escapeHtml(bookingData.name)} has ${bookingData.action} their booking.</p>
        
        <h3>Customer Information:</h3>
        <ul>
          <li><strong>Name:</strong> ${escapeHtml(bookingData.name)}</li>
          <li><strong>Email:</strong> <a href="mailto:${escapeHtml(bookingData.email)}">${escapeHtml(bookingData.email)}</a></li>
          <li><strong>Phone:</strong> ${escapeHtml(bookingData.phone)}</li>
          <li><strong>Address:</strong> ${escapeHtml(bookingData.address)}</li>
        </ul>
        
        ${bookingData.originalDate ? `<p><strong>Original Date:</strong> ${escapeHtml(bookingData.originalDate)} at ${escapeHtml(bookingData.originalTimeSlot || '')}</p>` : ''}
        ${bookingData.action === 'rescheduled' ? `<p><strong>New Date:</strong> ${escapeHtml(bookingData.date)} at ${escapeHtml(bookingData.timeSlot)}</p>` : ''}
        
        <p><a href="${getBaseUrl()}/admin/bookings">View in Admin Dashboard</a></p>
      `,
    });
    console.log('Booking change notification email sent successfully');
  } catch (error) {
    console.error('Failed to send booking change notification:', error);
  }
}

export async function sendEmployeeAssignmentNotification(
  bookingData: BookingEmailData,
  employeeEmail: string,
  employeeName: string
): Promise<void> {
  try {
    await resend.emails.send({
      from: 'Clean & Green <noreply@voryn.store>',
      to: employeeEmail,
      subject: `New Assignment - ${escapeHtml(bookingData.serviceType)} on ${escapeHtml(bookingData.date)}`,
      html: `
        <h2>New Cleaning Assignment</h2>
        <p>Hi ${escapeHtml(employeeName)},</p>
        <p>You have been assigned to a new cleaning job. Please review the details below:</p>
        
        <h3>Job Details:</h3>
        <ul>
          <li><strong>Service:</strong> ${escapeHtml(bookingData.serviceType)}</li>
          <li><strong>Property Size:</strong> ${escapeHtml(bookingData.propertySize)}</li>
          <li><strong>Date:</strong> ${escapeHtml(bookingData.date)}</li>
          <li><strong>Time:</strong> ${escapeHtml(bookingData.timeSlot)}</li>
          <li><strong>Address:</strong> ${escapeHtml(bookingData.address)}</li>
        </ul>
        
        <h3>Customer Information:</h3>
        <ul>
          <li><strong>Name:</strong> ${escapeHtml(bookingData.name)}</li>
          <li><strong>Phone:</strong> ${escapeHtml(bookingData.phone)}</li>
          <li><strong>Email:</strong> ${escapeHtml(bookingData.email)}</li>
        </ul>
        
        <p>Please log in to your employee dashboard to view all your assignments: <a href="${getBaseUrl()}/employee/dashboard">Employee Dashboard</a></p>
        
        <p>Thank you,<br>Clean & Green Management</p>
      `,
    });
    console.log('Employee assignment notification email sent successfully');
  } catch (error) {
    console.error('Failed to send employee assignment notification:', error);
  }
}

export async function sendInvoicePaymentLinkEmail(
  customerEmail: string,
  customerName: string,
  invoiceNumber: string,
  invoiceId: string,
  totalAmount: number,
  breakdown?: {
    basePrice?: number;
    promoCode?: string;
    discountAmount?: number;
    subtotal: number;
    tax: number;
  }
) {
  try {
    const baseUrl = getBaseUrl();
    const paymentUrl = `${baseUrl}/pay-invoice/${invoiceId}`;
    
    // Build price breakdown HTML if promo code was used
    let breakdownHtml = '';
    if (breakdown && breakdown.promoCode && breakdown.basePrice && breakdown.discountAmount) {
      breakdownHtml = `
        <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="margin-top: 0;">Price Breakdown:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0;"><strong>Service Price:</strong></td>
              <td style="padding: 8px 0; text-align: right;">$${(breakdown.basePrice / 100).toFixed(2)}</td>
            </tr>
            <tr style="color: #22c55e;">
              <td style="padding: 8px 0;"><strong>Promo Code (${escapeHtml(breakdown.promoCode)}):</strong></td>
              <td style="padding: 8px 0; text-align: right;">-$${(breakdown.discountAmount / 100).toFixed(2)}</td>
            </tr>
            <tr style="border-top: 1px solid #e5e7eb;">
              <td style="padding: 8px 0;"><strong>Subtotal:</strong></td>
              <td style="padding: 8px 0; text-align: right;">$${(breakdown.subtotal / 100).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Tax:</strong></td>
              <td style="padding: 8px 0; text-align: right;">$${(breakdown.tax / 100).toFixed(2)}</td>
            </tr>
            <tr style="border-top: 2px solid #22c55e; font-size: 18px;">
              <td style="padding: 12px 0;"><strong>Total:</strong></td>
              <td style="padding: 12px 0; text-align: right;"><strong>$${totalAmount.toFixed(2)}</strong></td>
            </tr>
          </table>
        </div>
      `;
    } else {
      breakdownHtml = `
        <ul>
          <li><strong>Invoice Number:</strong> ${escapeHtml(invoiceNumber)}</li>
          <li><strong>Total Amount:</strong> $${totalAmount.toFixed(2)}</li>
        </ul>
      `;
    }
    
    await resend.emails.send({
      from: 'Clean & Green <noreply@voryn.store>',
      to: customerEmail,
      subject: `Invoice ${escapeHtml(invoiceNumber)} - Payment Link`,
      html: `
        <h2>Your Invoice is Ready</h2>
        <p>Hi ${escapeHtml(customerName)},</p>
        <p>Your invoice is ready for payment. Please review the details below:</p>
        
        ${breakdownHtml}
        
        <p><a href="${paymentUrl}" style="display: inline-block; padding: 12px 24px; background-color: #22c55e; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">Pay Invoice Now</a></p>
        
        <p>Or copy this link: <a href="${paymentUrl}">${paymentUrl}</a></p>
        
        <p>Thank you for choosing Clean & Green!</p>
        <p>Best regards,<br>Clean & Green Team</p>
      `,
    });
    console.log(`Invoice payment link email sent to ${customerEmail}`);
  } catch (error) {
    console.error('Failed to send invoice payment link email:', error);
  }
}

export async function sendBookingStatusUpdateEmail(
  customerEmail: string,
  customerName: string,
  status: string,
  bookingDetails: {
    serviceType: string;
    date: string;
    timeSlot: string;
    address: string;
  }
) {
  try {
    let subject = '';
    let message = '';
    
    if (status === 'confirmed') {
      subject = 'Booking Confirmed - Clean & Green';
      message = `
        <h2 style="color: #22c55e;">✅ Your Booking is Confirmed!</h2>
        <p>Hi ${escapeHtml(customerName)},</p>
        <p>Great news! Your cleaning service has been confirmed. We look forward to serving you!</p>
      `;
    } else if (status === 'cancelled') {
      subject = 'Booking Cancelled - Clean & Green';
      message = `
        <h2 style="color: #ef4444;">❌ Your Booking Has Been Cancelled</h2>
        <p>Hi ${escapeHtml(customerName)},</p>
        <p>Your cleaning service booking has been cancelled. If you have any questions, please contact us.</p>
      `;
    } else if (status === 'completed') {
      subject = 'Service Completed - Clean & Green';
      message = `
        <h2 style="color: #22c55e;">✨ Service Completed!</h2>
        <p>Hi ${escapeHtml(customerName)},</p>
        <p>Thank you for choosing Clean & Green! Your cleaning service has been completed.</p>
      `;
    } else {
      return; // Don't send email for other status changes
    }
    
    await resend.emails.send({
      from: 'Clean & Green <noreply@voryn.store>',
      to: customerEmail,
      subject,
      html: `
        ${message}
        
        <h3>Booking Details:</h3>
        <ul>
          <li><strong>Service:</strong> ${escapeHtml(bookingDetails.serviceType)}</li>
          <li><strong>Date:</strong> ${escapeHtml(bookingDetails.date)}</li>
          <li><strong>Time:</strong> ${escapeHtml(bookingDetails.timeSlot)}</li>
          <li><strong>Address:</strong> ${escapeHtml(bookingDetails.address)}</li>
        </ul>
        
        <p>View your booking status anytime: <a href="${getBaseUrl()}/portal">Customer Portal</a></p>
        
        <p>Thank you for choosing Clean & Green!</p>
        <p>Best regards,<br>Clean & Green Team</p>
      `,
    });
    console.log(`Booking status update email sent to ${customerEmail} (status: ${status})`);
  } catch (error) {
    console.error('Failed to send booking status update email:', error);
  }
}

export async function sendPaymentReceiptEmail(
  customerEmail: string,
  customerName: string,
  invoiceNumber: string,
  serviceDescription: string,
  amount: number,
  tax: number,
  total: number,
  paidDate: Date
) {
  try {
    await resend.emails.send({
      from: 'Clean & Green <noreply@voryn.store>',
      to: customerEmail,
      subject: `Payment Receipt - Invoice ${escapeHtml(invoiceNumber)}`,
      html: `
        <h2 style="color: #22c55e;">✅ Payment Received!</h2>
        <p>Hi ${escapeHtml(customerName)},</p>
        <p>Thank you for your payment! Your invoice has been marked as paid.</p>
        
        <h3>Receipt Details:</h3>
        <ul>
          <li><strong>Invoice Number:</strong> ${escapeHtml(invoiceNumber)}</li>
          <li><strong>Service:</strong> ${escapeHtml(serviceDescription)}</li>
          <li><strong>Payment Date:</strong> ${paidDate.toLocaleDateString()}</li>
        </ul>
        
        <h3>Payment Breakdown:</h3>
        <ul>
          <li><strong>Amount:</strong> $${(amount / 100).toFixed(2)}</li>
          <li><strong>Tax:</strong> $${(tax / 100).toFixed(2)}</li>
          <li><strong>Total Paid:</strong> $${(total / 100).toFixed(2)}</li>
        </ul>
        
        <p>This email serves as your receipt. Please keep it for your records.</p>
        
        <p>Thank you for choosing Clean & Green!</p>
        <p>Best regards,<br>Clean & Green Team</p>
      `,
    });
    console.log(`Payment receipt email sent to ${customerEmail}`);
  } catch (error) {
    console.error('Failed to send payment receipt email:', error);
  }
}

export async function sendAdminPaymentNotification(
  adminEmail: string,
  invoiceNumber: string,
  customerName: string,
  customerEmail: string,
  total: number,
  paidDate: Date
) {
  try {
    await resend.emails.send({
      from: 'Clean & Green <noreply@voryn.store>',
      to: adminEmail,
      subject: `💰 Payment Received - Invoice ${escapeHtml(invoiceNumber)}`,
      html: `
        <h2 style="color: #22c55e;">💰 Payment Received!</h2>
        <p>A customer has just paid an invoice.</p>
        
        <h3>Payment Details:</h3>
        <ul>
          <li><strong>Invoice Number:</strong> ${escapeHtml(invoiceNumber)}</li>
          <li><strong>Customer:</strong> ${escapeHtml(customerName)}</li>
          <li><strong>Email:</strong> ${escapeHtml(customerEmail)}</li>
          <li><strong>Amount:</strong> $${(total / 100).toFixed(2)}</li>
          <li><strong>Payment Date:</strong> ${paidDate.toLocaleDateString()} at ${paidDate.toLocaleTimeString()}</li>
        </ul>
        
        <p>View invoice details: <a href="${getBaseUrl()}/admin/invoices">Admin Dashboard</a></p>
        
        <p>Clean & Green Notification System</p>
      `,
    });
    console.log(`Admin payment notification sent to ${adminEmail}`);
  } catch (error) {
    console.error('Failed to send admin payment notification:', error);
  }
}

export async function sendNewsletterWelcomeEmail(
  email: string,
  name: string
) {
  try {
    await resend.emails.send({
      from: 'Clean & Green <noreply@voryn.store>',
      to: email,
      subject: '🌿 Welcome to Clean & Green Newsletter!',
      html: `
        <h2 style="color: #22c55e;">Welcome to Clean & Green!</h2>
        <p>Hi ${escapeHtml(name || 'there')},</p>
        <p>Thank you for subscribing to our newsletter! We're excited to have you join our eco-friendly cleaning community.</p>
        
        <p>You'll receive updates about:</p>
        <ul>
          <li>🌿 Eco-friendly cleaning tips and tricks</li>
          <li>🎉 Special promotions and exclusive offers</li>
          <li>📅 Upcoming events and seasonal services</li>
          <li>💚 Our commitment to sustainability</li>
        </ul>
        
        <p>Stay tuned for our first newsletter coming soon!</p>
        
        <p>Best regards,<br>The Clean & Green Team</p>
        
        <p style="font-size: 12px; color: #666;">You're receiving this because you subscribed to Clean & Green newsletter. If you wish to unsubscribe, please contact us.</p>
      `,
    });
    console.log(`Newsletter welcome email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send newsletter welcome email:', error);
  }
}

export async function sendNewsletterEmail(
  email: string,
  name: string,
  subject: string,
  htmlContent: string
) {
  try {
    await resend.emails.send({
      from: 'Clean & Green <noreply@voryn.store>',
      to: email,
      subject: subject,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <p>Hi ${escapeHtml(name || 'there')},</p>
          
          ${htmlContent}
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="font-size: 12px; color: #666;">
            You're receiving this email because you subscribed to Clean & Green newsletter.<br>
            Clean & Green - Eco-Friendly Cleaning Services in Oklahoma
          </p>
        </div>
      `,
    });
    console.log(`Newsletter email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send newsletter email to ${email}:`, error);
  }
}

export async function sendReviewRequestEmail(
  customerEmail: string,
  customerName: string,
  bookingId: string,
  service: string
) {
  try {
    const baseUrl = getBaseUrl();
    const reviewUrl = `${baseUrl}/review/${bookingId}`;
    
    await resend.emails.send({
      from: 'Clean & Green <noreply@voryn.store>',
      to: customerEmail,
      subject: '🌟 How was your cleaning service?',
      html: `
        <h2 style="color: #22c55e;">We'd Love Your Feedback!</h2>
        <p>Hi ${escapeHtml(customerName)},</p>
        <p>Thank you for choosing Clean & Green for your ${escapeHtml(service)} service!</p>
        
        <p>We hope you're happy with the results. Your feedback helps us improve and helps others find great eco-friendly cleaning services.</p>
        
        <p style="text-align: center; margin: 30px 0;">
          <a href="${reviewUrl}" style="background-color: #22c55e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Leave a Review
          </a>
        </p>
        
        <p>Your review will be checked by our team before being published on our website.</p>
        
        <p>Thank you for your time!</p>
        <p>Best regards,<br>The Clean & Green Team</p>
      `,
    });
    console.log(`Review request email sent to ${customerEmail}`);
  } catch (error) {
    console.error('Failed to send review request email:', error);
  }
}

export interface PaymentThankYouEmailData {
  customerEmail: string;
  customerName: string;
  serviceDescription: string;
  invoiceNumber?: string; // Optional - for context only (not shown in email)
}

export async function sendPaymentThankYouEmail(data: PaymentThankYouEmailData): Promise<void> {
  try {
    // Get settings for custom templates
    const settings = await storage.getBusinessSettings();
    
    const baseUrl = getBaseUrl();
    const reviewUrl = `${baseUrl}/reviews#review-form`;
    
    // Default templates
    const defaultSubject = '{{customerName}}, How was your cleaning experience? ⭐';
    const defaultBody = `Hi {{customerName}}!

Thank you for choosing Clean & Green for your {{serviceType}}!

We'd love to hear about your experience. Your feedback helps us improve and lets others know about our eco-friendly cleaning services.

Please take a moment to leave us a review and let us know how we did!

Best regards,
Clean & Green Team`;

    // Use custom templates if available, otherwise use defaults
    const subjectTemplate = settings?.reviewEmailSubject || defaultSubject;
    const bodyTemplate = settings?.reviewEmailBody || defaultBody;
    
    // Replace placeholders
    const subject = replaceTemplatePlaceholders(subjectTemplate, {
      customerName: data.customerName,
      serviceType: data.serviceDescription,
    });
    
    const bodyText = replaceTemplatePlaceholders(bodyTemplate, {
      customerName: data.customerName,
      serviceType: data.serviceDescription,
    });
    
    // Convert plain text to HTML with proper formatting
    const bodyHtml = bodyText
      .split('\n\n')
      .map(para => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
      .join('');
    
    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; padding: 20px;">
        ${bodyHtml}
        
        <p style="text-align: center; margin: 30px 0;">
          <a href="${reviewUrl}" style="background-color: #22c55e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
            Leave a Review ⭐
          </a>
        </p>
        
        <p style="font-size: 12px; color: #999; margin-top: 30px;">Clean & Green - Making Oklahoma cleaner, one eco-friendly service at a time.</p>
      </div>
    `;
    
    await resend.emails.send({
      from: 'Clean & Green <noreply@voryn.store>',
      to: data.customerEmail,
      subject,
      html,
    });
    console.log(`Review request email sent to ${data.customerEmail} for invoice ${data.invoiceNumber}`);
  } catch (error) {
    console.error('Failed to send review request email:', error);
    // Don't throw - email failures shouldn't break the process
  }
}

export interface CancellationFeeBookingDetails {
  serviceType: string;
  date: string;
  timeSlot: string;
  address: string;
}

export async function sendCancellationFeeDismissedEmail(
  customerEmail: string,
  customerName: string,
  bookingDetails: CancellationFeeBookingDetails
): Promise<void> {
  try {
    await resend.emails.send({
      from: 'Clean & Green <noreply@voryn.store>',
      to: customerEmail,
      subject: 'Cancellation Fee Waived - Clean & Green',
      html: `
        <h2 style="color: #22c55e;">Cancellation Fee Waived</h2>
        <p>Hi ${escapeHtml(customerName)},</p>
        <p>We wanted to let you know that your $35 cancellation fee has been waived as a courtesy.</p>
        
        <h3>Cancelled Booking Details:</h3>
        <ul>
          <li><strong>Service:</strong> ${escapeHtml(bookingDetails.serviceType)}</li>
          <li><strong>Date:</strong> ${escapeHtml(bookingDetails.date)}</li>
          <li><strong>Time:</strong> ${escapeHtml(bookingDetails.timeSlot)}</li>
          <li><strong>Address:</strong> ${escapeHtml(bookingDetails.address)}</li>
        </ul>
        
        <p>We understand that plans change, and we appreciate your business. We hope to serve you again in the future!</p>
        
        <p>If you'd like to schedule a new cleaning, we're just a click away: <a href="${getBaseUrl()}/book">Book Now</a></p>
        
        <p>Thank you for choosing Clean & Green!</p>
        <p>Best regards,<br>Clean & Green Team</p>
      `,
    });
    console.log(`Cancellation fee dismissed email sent to ${customerEmail}`);
  } catch (error) {
    console.error('Failed to send cancellation fee dismissed email:', error);
  }
}

export async function sendCancellationFeeChargedEmail(
  customerEmail: string,
  customerName: string,
  amount: number,
  bookingDetails: CancellationFeeBookingDetails
): Promise<void> {
  try {
    await resend.emails.send({
      from: 'Clean & Green <noreply@voryn.store>',
      to: customerEmail,
      subject: 'Cancellation Fee Processed - Clean & Green',
      html: `
        <h2>Cancellation Fee Processed</h2>
        <p>Hi ${escapeHtml(customerName)},</p>
        <p>This email confirms that a $${amount.toFixed(2)} cancellation fee has been charged to your card on file.</p>
        
        <h3>Cancelled Booking Details:</h3>
        <ul>
          <li><strong>Service:</strong> ${escapeHtml(bookingDetails.serviceType)}</li>
          <li><strong>Date:</strong> ${escapeHtml(bookingDetails.date)}</li>
          <li><strong>Time:</strong> ${escapeHtml(bookingDetails.timeSlot)}</li>
          <li><strong>Address:</strong> ${escapeHtml(bookingDetails.address)}</li>
        </ul>
        
        <h3>About This Fee:</h3>
        <p>This fee was applied because the booking was cancelled less than 24 hours before the scheduled service time. Our cancellation policy helps us manage our schedule and compensate our team.</p>
        
        <p>We appreciate your understanding. If you have any questions about this charge, please don't hesitate to contact us.</p>
        
        <p>We hope to serve you again in the future: <a href="${getBaseUrl()}/book">Book a Service</a></p>
        
        <p>Best regards,<br>Clean & Green Team</p>
      `,
    });
    console.log(`Cancellation fee charged email sent to ${customerEmail}`);
  } catch (error) {
    console.error('Failed to send cancellation fee charged email:', error);
  }
}

export interface ReferralWelcomeEmailData {
  customerEmail: string;
  customerName: string;
  referralCode: string;
}

export async function sendReferralWelcomeEmail(data: ReferralWelcomeEmailData): Promise<void> {
  if (!resend) {
    console.log('Email not configured - skipping referral welcome email');
    return;
  }

  try {
    await resend.emails.send({
      from: 'Clean & Green <noreply@voryn.store>',
      to: data.customerEmail,
      subject: 'Share the Clean with Friends! 🎁',
      html: `
        <h2>Thanks for Choosing Clean & Green! 🌿</h2>
        <p>Hi ${escapeHtml(data.customerName)},</p>
        
        <p>We loved serving you! As a thank you, we want to share a special opportunity with you.</p>
        
        <h3>Your Personal Referral Code:</h3>
        <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
          <p style="font-size: 28px; font-weight: bold; color: #22c55e; margin: 0;">${escapeHtml(data.referralCode)}</p>
        </div>
        
        <h3>How It Works:</h3>
        <ol>
          <li><strong>Share your code</strong> with friends and family</li>
          <li><strong>They get $10-$20 off</strong> their first cleaning (tiered rewards!)</li>
          <li><strong>You earn credits</strong> after their service is completed:
            <ul>
              <li>1st referral: Both get $10 off</li>
              <li>2nd referral: Both get $15 off</li>
              <li>3rd+ referrals: Both get $20 off!</li>
            </ul>
          </li>
        </ol>
        
        <p style="text-align: center; margin: 30px 0;">
          <a href="${getBaseUrl()}/book" style="background-color: #22c55e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            Book Your Next Cleaning
          </a>
        </p>
        
        <p>Questions? Just reply to this email!</p>
        
        <p>Best regards,<br>Clean & Green Team</p>
      `,
    });
    console.log(`Referral welcome email sent to ${data.customerEmail}`);
  } catch (error) {
    console.error('Failed to send referral welcome email:', error);
  }
}

export interface ReferralCreditEarnedEmailData {
  customerEmail: string;
  customerName: string;
  referredName: string;
  creditAmount: number;
  tier: string;
}

export async function sendReferralCreditEarnedEmail(data: ReferralCreditEarnedEmailData): Promise<void> {
  if (!resend) {
    console.log('Email not configured - skipping referral credit email');
    return;
  }

  try {
    const amount = (data.creditAmount / 100).toFixed(2);
    
    await resend.emails.send({
      from: 'Clean & Green <noreply@voryn.store>',
      to: data.customerEmail,
      subject: `You Earned $${amount}! 🎉`,
      html: `
        <h2>Great News! Your Referral Paid Off! 🎉</h2>
        <p>Hi ${escapeHtml(data.customerName)},</p>
        
        <p>Your friend ${escapeHtml(data.referredName)} just completed their first Clean & Green service!</p>
        
        <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
          <p style="font-size: 18px; margin: 0;">You've earned</p>
          <p style="font-size: 36px; font-weight: bold; color: #22c55e; margin: 10px 0;">$${amount}</p>
          <p style="font-size: 14px; color: #666; margin: 0;">in referral credits!</p>
        </div>
        
        <p><strong>Your ${data.tier} referral bonus!</strong> Keep referring friends to unlock higher rewards:</p>
        <ul>
          <li>1st referral: $10 off ✓</li>
          <li>2nd referral: $15 off ${data.tier === '2nd' ? '✓' : ''}</li>
          <li>3rd+ referrals: $20 off ${data.tier === '3rd+' ? '✓' : ''}</li>
        </ul>
        
        <h3>Ready to Use Your Credits?</h3>
        <p>Your credits will automatically be available when you book your next cleaning. We'll remind you when creating your invoice!</p>
        
        <p style="text-align: center; margin: 30px 0;">
          <a href="${getBaseUrl()}/book" style="background-color: #22c55e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            Book Your Next Cleaning
          </a>
        </p>
        
        <p>Keep sharing your code to earn more!</p>
        
        <p>Best regards,<br>Clean & Green Team</p>
      `,
    });
    console.log(`Referral credit earned email sent to ${data.customerEmail}`);
  } catch (error) {
    console.error('Failed to send referral credit earned email:', error);
  }
}
