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
