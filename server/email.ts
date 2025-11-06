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
        
        <p><a href="https://clean-and-green-website.onrender.com/admin/bookings">View in Admin Dashboard</a></p>
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
        
        <p><a href="https://clean-and-green-website.onrender.com/admin/messages">View in Admin Dashboard</a></p>
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

export async function sendCustomerBookingConfirmation(
  bookingData: CustomerBookingData
): Promise<void> {
  const manageUrl = `https://clean-and-green-website.onrender.com/booking/${bookingData.bookingId}?token=${bookingData.managementToken}`;
  
  try {
    await resend.emails.send({
      from: 'Clean & Green <noreply@voryn.store>',
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
        
        <p><a href="https://clean-and-green-website.onrender.com/admin/bookings">View in Admin Dashboard</a></p>
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
        
        <p>Please log in to your employee dashboard to view all your assignments: <a href="https://clean-and-green-website.onrender.com/employee/dashboard">Employee Dashboard</a></p>
        
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
  totalAmount: number
) {
  try {
    const paymentUrl = `https://clean-and-green-website.onrender.com/pay-invoice/${invoiceId}`;
    
    await resend.emails.send({
      from: 'Clean & Green <noreply@voryn.store>',
      to: customerEmail,
      subject: `Invoice ${escapeHtml(invoiceNumber)} - Payment Link`,
      html: `
        <h2>Your Invoice is Ready</h2>
        <p>Hi ${escapeHtml(customerName)},</p>
        <p>Your invoice is ready for payment. Please review the details below:</p>
        
        <ul>
          <li><strong>Invoice Number:</strong> ${escapeHtml(invoiceNumber)}</li>
          <li><strong>Total Amount:</strong> $${totalAmount.toFixed(2)}</li>
        </ul>
        
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
        
        <p>View your booking status anytime: <a href="https://clean-and-green-website.onrender.com/portal">Customer Portal</a></p>
        
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
        
        <p>View invoice details: <a href="https://clean-and-green-website.onrender.com/admin/invoices">Admin Dashboard</a></p>
        
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
    const reviewUrl = `https://clean-and-green-website.onrender.com/review/${bookingId}`;
    
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
  invoiceNumber: string;
}

export async function sendPaymentThankYouEmail(data: PaymentThankYouEmailData): Promise<void> {
  try {
    const reviewUrl = `https://clean-and-green-website.onrender.com/reviews#review-form`;
    
    await resend.emails.send({
      from: 'Clean & Green <noreply@voryn.store>',
      to: data.customerEmail,
      subject: '✨ Thank You for Your Payment!',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #22c55e;">Thank You, ${escapeHtml(data.customerName)}!</h2>
          
          <p>We've received your payment for invoice #${escapeHtml(data.invoiceNumber)}.</p>
          
          <p>We sincerely appreciate you choosing Clean & Green for your ${escapeHtml(data.serviceDescription)}. Our eco-friendly approach means a lot to us, and we hope you're thrilled with the results!</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          
          <h3 style="color: #22c55e;">💚 We'd Love Your Feedback!</h3>
          
          <p>Your opinion matters to us and helps others in the Oklahoma community discover great eco-friendly cleaning services. Would you take a moment to share your experience?</p>
          
          <p style="text-align: center; margin: 30px 0;">
            <a href="${reviewUrl}" style="background-color: #22c55e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
              Leave a Review ⭐
            </a>
          </p>
          
          <p style="font-size: 14px; color: #666;">Your review will be checked by our team before being published on our website.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          
          <p>Thank you for being part of our eco-friendly cleaning community!</p>
          
          <p>Best regards,<br><strong>The Clean & Green Team</strong><br>Oklahoma's Eco-Friendly Cleaning Service</p>
          
          <p style="font-size: 12px; color: #999; margin-top: 30px;">Clean & Green - Making Oklahoma cleaner, one eco-friendly service at a time.</p>
        </div>
      `,
    });
    console.log(`Payment thank you email sent to ${data.customerEmail} for invoice ${data.invoiceNumber}`);
  } catch (error) {
    console.error('Failed to send payment thank you email:', error);
    // Don't throw - email failures shouldn't break the process
  }
}
