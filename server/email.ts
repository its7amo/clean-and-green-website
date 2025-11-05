import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(text: string): string {
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
      from: 'Clean & Green <onboarding@resend.dev>',
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
        
        <p><a href="https://clean-and-green-website.onrender.com/admin/quotes">View in Admin Dashboard</a></p>
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
      from: 'Clean & Green <onboarding@resend.dev>',
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
        
        <p><a href="https://clean-and-green-website.onrender.com/admin/bookings">View in Admin Dashboard</a></p>
      `,
    });
    console.log('Booking notification email sent successfully');
  } catch (error) {
    console.error('Failed to send booking notification email:', error);
    // Don't throw error - we don't want email failures to break the booking submission
  }
}

export interface CustomerBookingData extends BookingEmailData {
  bookingId: string;
  managementToken: string;
}

export async function sendCustomerBookingConfirmation(
  bookingData: CustomerBookingData
): Promise<void> {
  const manageUrl = `https://clean-and-green-website.onrender.com/booking/${bookingData.bookingId}?token=${bookingData.managementToken}`;
  
  try {
    await resend.emails.send({
      from: 'Clean & Green <onboarding@resend.dev>',
      to: bookingData.email,
      subject: `Booking Confirmation - ${escapeHtml(bookingData.serviceType)}`,
      html: `
        <h2>Thank You for Your Booking!</h2>
        <p>Hi ${escapeHtml(bookingData.name)},</p>
        <p>We've received your booking request and we're excited to serve you!</p>
        
        <h3>Booking Details:</h3>
        <ul>
          <li><strong>Service:</strong> ${escapeHtml(bookingData.serviceType)}</li>
          <li><strong>Property Size:</strong> ${escapeHtml(bookingData.propertySize)}</li>
          <li><strong>Date:</strong> ${escapeHtml(bookingData.date)}</li>
          <li><strong>Time:</strong> ${escapeHtml(bookingData.timeSlot)}</li>
          <li><strong>Address:</strong> ${escapeHtml(bookingData.address)}</li>
        </ul>
        
        <h3>What's Next?</h3>
        <p>Our team will review your booking and confirm within 24 hours. You'll receive a confirmation email once approved.</p>
        
        <h3>Need to Make Changes?</h3>
        <p style="margin: 20px 0;">
          <a href="${manageUrl}" style="display: inline-block; padding: 12px 24px; background-color: #22c55e; color: white; text-decoration: none; border-radius: 6px; margin-right: 10px;">Reschedule Booking</a>
          <a href="${manageUrl}" style="display: inline-block; padding: 12px 24px; background-color: #ef4444; color: white; text-decoration: none; border-radius: 6px;">Cancel Booking</a>
        </p>
        
        <p>If you have any questions, feel free to reply to this email or call us.</p>
        
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
      from: 'Clean & Green <onboarding@resend.dev>',
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
