import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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
    ? `${quoteData.propertySize} (Custom: ${quoteData.customSize})` 
    : quoteData.propertySize;

  try {
    await resend.emails.send({
      from: 'Clean & Green <onboarding@resend.dev>',
      to: businessEmail,
      subject: `New Quote Request - ${quoteData.name}`,
      html: `
        <h2>New Quote Request Received</h2>
        <p>You have received a new quote request from your website.</p>
        
        <h3>Customer Information:</h3>
        <ul>
          <li><strong>Name:</strong> ${quoteData.name}</li>
          <li><strong>Email:</strong> ${quoteData.email}</li>
          <li><strong>Phone:</strong> ${quoteData.phone}</li>
          <li><strong>Address:</strong> ${quoteData.address}</li>
        </ul>
        
        <h3>Service Details:</h3>
        <ul>
          <li><strong>Service Type:</strong> ${quoteData.serviceType}</li>
          <li><strong>Property Size:</strong> ${propertyInfo}</li>
          <li><strong>Additional Details:</strong> ${quoteData.details}</li>
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
      subject: `New Booking - ${bookingData.name}`,
      html: `
        <h2>New Booking Received</h2>
        <p>You have received a new booking from your website.</p>
        
        <h3>Customer Information:</h3>
        <ul>
          <li><strong>Name:</strong> ${bookingData.name}</li>
          <li><strong>Email:</strong> ${bookingData.email}</li>
          <li><strong>Phone:</strong> ${bookingData.phone}</li>
          <li><strong>Address:</strong> ${bookingData.address}</li>
        </ul>
        
        <h3>Service Details:</h3>
        <ul>
          <li><strong>Service Type:</strong> ${bookingData.serviceType}</li>
          <li><strong>Property Size:</strong> ${bookingData.propertySize}</li>
          <li><strong>Date:</strong> ${bookingData.date}</li>
          <li><strong>Time Slot:</strong> ${bookingData.timeSlot}</li>
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
