import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let twilioClient: ReturnType<typeof twilio> | null = null;

if (accountSid && authToken && twilioPhoneNumber) {
  twilioClient = twilio(accountSid, authToken);
  console.log('✓ Twilio SMS client initialized');
} else {
  console.warn('⚠ Twilio credentials not found - SMS notifications disabled');
}

/**
 * Send an SMS notification to a customer with their invoice payment link
 */
export async function sendInvoicePaymentLinkSMS(
  customerPhone: string,
  customerName: string,
  invoiceNumber: string,
  invoiceId: string,
  total: number
): Promise<void> {
  if (!twilioClient || !twilioPhoneNumber) {
    console.log('SMS not configured - skipping invoice payment link SMS');
    return;
  }

  try {
    const paymentUrl = `${process.env.REPL_ID ? `https://${process.env.REPL_ID}.replit.app` : 'http://localhost:5000'}/pay-invoice/${invoiceId}`;
    
    const message = `Hi ${customerName}! Your Clean & Green invoice #${invoiceNumber} for $${(total / 100).toFixed(2)} is ready. Pay online: ${paymentUrl}`;

    await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: customerPhone,
    });

    console.log(`✓ Invoice payment link SMS sent to ${customerPhone}`);
  } catch (error) {
    console.error('Failed to send invoice payment link SMS:', error);
    // Don't throw - invoice creation should succeed even if SMS fails
  }
}

/**
 * Send a booking confirmation SMS to a customer
 */
export async function sendBookingConfirmationSMS(
  customerPhone: string,
  customerName: string,
  serviceType: string,
  date: Date,
  timeSlot: string
): Promise<void> {
  if (!twilioClient || !twilioPhoneNumber) {
    console.log('SMS not configured - skipping booking confirmation SMS');
    return;
  }

  try {
    const formattedDate = new Date(date).toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const message = `Hi ${customerName}! Your Clean & Green ${serviceType} is confirmed for ${formattedDate} at ${timeSlot}. We'll see you then!`;

    await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: customerPhone,
    });

    console.log(`✓ Booking confirmation SMS sent to ${customerPhone}`);
  } catch (error) {
    console.error('Failed to send booking confirmation SMS:', error);
    // Don't throw - booking should succeed even if SMS fails
  }
}

/**
 * Send an employee work assignment notification SMS
 */
export async function sendEmployeeAssignmentSMS(
  employeePhone: string,
  employeeName: string,
  customerName: string,
  serviceType: string,
  date: Date,
  timeSlot: string,
  address: string
): Promise<void> {
  if (!twilioClient || !twilioPhoneNumber) {
    console.log('SMS not configured - skipping employee assignment SMS');
    return;
  }

  try {
    const formattedDate = new Date(date).toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
    
    const message = `Hi ${employeeName}! New assignment: ${serviceType} for ${customerName} on ${formattedDate} at ${timeSlot}. Location: ${address}`;

    await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: employeePhone,
    });

    console.log(`✓ Employee assignment SMS sent to ${employeePhone}`);
  } catch (error) {
    console.error('Failed to send employee assignment SMS:', error);
    // Don't throw - assignment should succeed even if SMS fails
  }
}
