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
 * Normalize phone number to E.164 format for Twilio
 * Converts formats like "405-473-5908", "(405) 473-5908", "4054735908"
 * to E.164 format: "+14054735908"
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If it's 10 digits (US number without country code), add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // If it's 11 digits starting with 1, add +
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // If it already starts with +, return as-is
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // Otherwise assume it needs +1 prefix
  return `+1${digits}`;
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
    const normalizedPhone = normalizePhoneNumber(customerPhone);
    console.log(`📱 Normalizing phone: "${customerPhone}" → "${normalizedPhone}"`);
    
    const paymentUrl = `${process.env.REPL_ID ? `https://${process.env.REPL_ID}.replit.app` : 'http://localhost:5000'}/pay-invoice/${invoiceId}`;
    
    const message = `Hi ${customerName}! Your Clean & Green invoice #${invoiceNumber} for $${(total / 100).toFixed(2)} is ready. Pay online: ${paymentUrl}`;

    await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: normalizedPhone,
    });

    console.log(`✓ Invoice payment link SMS sent to ${normalizedPhone}`);
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
    const normalizedPhone = normalizePhoneNumber(customerPhone);
    console.log(`📱 Normalizing phone: "${customerPhone}" → "${normalizedPhone}"`);
    
    const formattedDate = new Date(date).toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const message = `Hi ${customerName}! Your Clean & Green ${serviceType} is confirmed for ${formattedDate} at ${timeSlot}. We'll see you then!`;

    await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: normalizedPhone,
    });

    console.log(`✓ Booking confirmation SMS sent to ${normalizedPhone}`);
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
    const normalizedPhone = normalizePhoneNumber(employeePhone);
    console.log(`📱 Normalizing phone: "${employeePhone}" → "${normalizedPhone}"`);
    
    const formattedDate = new Date(date).toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
    
    const message = `Hi ${employeeName}! New assignment: ${serviceType} for ${customerName} on ${formattedDate} at ${timeSlot}. Location: ${address}`;

    await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: normalizedPhone,
    });

    console.log(`✓ Employee assignment SMS sent to ${normalizedPhone}`);
  } catch (error) {
    console.error('Failed to send employee assignment SMS:', error);
    // Don't throw - assignment should succeed even if SMS fails
  }
}

/**
 * Send SMS notification when cancellation fee is waived
 */
export async function sendCancellationFeeDismissedSMS(
  phone: string,
  name: string
): Promise<void> {
  if (!twilioClient || !twilioPhoneNumber) {
    console.log('SMS not configured - skipping cancellation fee dismissed SMS');
    return;
  }

  try {
    const normalizedPhone = normalizePhoneNumber(phone);
    console.log(`📱 Normalizing phone: "${phone}" → "${normalizedPhone}"`);
    
    const message = `Hi ${name}, your $35 cancellation fee has been waived. Thank you for choosing Clean & Green!`;

    await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: normalizedPhone,
    });

    console.log(`✓ Cancellation fee dismissed SMS sent to ${normalizedPhone}`);
  } catch (error) {
    console.error('Failed to send cancellation fee dismissed SMS:', error);
  }
}

/**
 * Send SMS notification when cancellation fee is charged
 */
export async function sendCancellationFeeChargedSMS(
  phone: string,
  name: string,
  amount: number,
  businessPhone?: string
): Promise<void> {
  if (!twilioClient || !twilioPhoneNumber) {
    console.log('SMS not configured - skipping cancellation fee charged SMS');
    return;
  }

  try {
    const normalizedPhone = normalizePhoneNumber(phone);
    console.log(`📱 Normalizing phone: "${phone}" → "${normalizedPhone}"`);
    
    const contactInfo = businessPhone ? ` Questions? Call us at ${businessPhone}` : '';
    const message = `Hi ${name}, a $${amount.toFixed(2)} cancellation fee was charged to your card for late cancellation.${contactInfo}`;

    await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: normalizedPhone,
    });

    console.log(`✓ Cancellation fee charged SMS sent to ${normalizedPhone}`);
  } catch (error) {
    console.error('Failed to send cancellation fee charged SMS:', error);
  }
}
