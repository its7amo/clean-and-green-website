import { resend, escapeHtml } from './email';
import type { Invoice, BusinessSettings } from '@shared/schema';

export interface PaymentReminderData {
  invoice: Invoice;
  daysOverdue: number;
  reminderNumber: number;
  settings?: BusinessSettings;
}

// Default templates
const DEFAULT_3DAY_SUBJECT = 'Payment Reminder - Invoice {{invoiceNumber}}';
const DEFAULT_3DAY_BODY = 'Hi {{customerName}},\n\n' +
  'This is a friendly reminder that payment for Invoice {{invoiceNumber}} is now {{daysOverdue}} days overdue.\n\n' +
  'Amount Due: ${{amountDue}}\n\n' +
  'Please click the link below to make your payment:\n' +
  '{{paymentLink}}\n\n' +
  'If you\'ve already made this payment, please disregard this email. Thank you for your business!\n\n' +
  'Best regards,\n' +
  'Clean & Green Team';

const DEFAULT_7DAY_SUBJECT = 'Important: Payment Reminder - Invoice {{invoiceNumber}}';
const DEFAULT_7DAY_BODY = 'Hi {{customerName}},\n\n' +
  'We wanted to follow up regarding your overdue invoice.\n\n' +
  'Invoice {{invoiceNumber}} is now {{daysOverdue}} days overdue.\n' +
  'Amount Due: ${{amountDue}}\n\n' +
  'Please make your payment as soon as possible:\n' +
  '{{paymentLink}}\n\n' +
  'If you have any questions or concerns about this invoice, please don\'t hesitate to reach out. We\'re here to help!\n\n' +
  'Best regards,\n' +
  'Clean & Green Team';

const DEFAULT_14DAY_SUBJECT = 'URGENT: Payment Required - Invoice {{invoiceNumber}}';
const DEFAULT_14DAY_BODY = 'Hi {{customerName}},\n\n' +
  '⚠️ URGENT - This is a final reminder regarding your significantly overdue invoice.\n\n' +
  'Invoice {{invoiceNumber}} is now {{daysOverdue}} days overdue.\n' +
  'Amount Due: ${{amountDue}}\n\n' +
  'Please submit payment immediately:\n' +
  '{{paymentLink}}\n\n' +
  'If there\'s an issue with this invoice or you need to discuss payment arrangements, please contact us immediately. We value your business and want to work with you.\n\n' +
  'Best regards,\n' +
  'Clean & Green Team';

function replacePlaceholders(template: string, data: {
  customerName: string;
  invoiceNumber: string;
  amountDue: string;
  daysOverdue: number;
  paymentLink: string;
}): string {
  return template
    .replace(/\{\{customerName\}\}/g, data.customerName)
    .replace(/\{\{invoiceNumber\}\}/g, data.invoiceNumber)
    .replace(/\{\{amountDue\}\}/g, data.amountDue)
    .replace(/\{\{daysOverdue\}\}/g, data.daysOverdue.toString())
    .replace(/\{\{paymentLink\}\}/g, data.paymentLink);
}

export async function sendPaymentReminderEmail(data: PaymentReminderData): Promise<void> {
  const { invoice, daysOverdue, reminderNumber, settings } = data;
  
  const amountDue = (invoice.total / 100).toFixed(2);
  const paymentLink = `${process.env.REPLIT_DOMAINS}/invoice/${invoice.id}/pay`;
  
  // Get custom or default templates based on reminder number
  let subjectTemplate: string;
  let bodyTemplate: string;
  
  if (reminderNumber === 1) {
    subjectTemplate = settings?.paymentReminder3DaySubject || DEFAULT_3DAY_SUBJECT;
    bodyTemplate = settings?.paymentReminder3DayBody || DEFAULT_3DAY_BODY;
  } else if (reminderNumber === 2) {
    subjectTemplate = settings?.paymentReminder7DaySubject || DEFAULT_7DAY_SUBJECT;
    bodyTemplate = settings?.paymentReminder7DayBody || DEFAULT_7DAY_BODY;
  } else {
    subjectTemplate = settings?.paymentReminder14DaySubject || DEFAULT_14DAY_SUBJECT;
    bodyTemplate = settings?.paymentReminder14DayBody || DEFAULT_14DAY_BODY;
  }
  
  // Replace placeholders
  const placeholderData = {
    customerName: invoice.customerName,
    invoiceNumber: invoice.invoiceNumber,
    amountDue,
    daysOverdue,
    paymentLink,
  };
  
  const subject = replacePlaceholders(subjectTemplate, placeholderData);
  const body = replacePlaceholders(bodyTemplate, placeholderData);
  
  // Convert plain text body to HTML
  const htmlBody = body
    .split('\n')
    .map(line => line.trim() ? `<p>${escapeHtml(line)}</p>` : '<br/>')
    .join('');
  
  const urgencyColor = reminderNumber === 3 ? '#ef4444' : reminderNumber === 2 ? '#f59e0b' : '#22c55e';
  
  try {
    await resend.emails.send({
      from: 'Clean & Green <noreply@voryn.store>',
      to: invoice.customerEmail,
      subject,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; padding: 20px; background-color: #ffffff;">
          ${reminderNumber === 3 ? `
            <div style="background-color: #fef2f2; border-left: 4px solid ${urgencyColor}; padding: 15px; margin-bottom: 20px;">
              <h3 style="margin-top: 0; color: #991b1b;">⚠️ URGENT - Action Required</h3>
            </div>
          ` : ''}
          
          <h2 style="color: ${urgencyColor}; margin-bottom: 20px;">Payment Reminder</h2>
          
          ${htmlBody}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${paymentLink}" style="display: inline-block; padding: 14px 32px; background-color: ${urgencyColor}; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Pay Invoice Now
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">
            Clean & Green - Making Oklahoma cleaner, one eco-friendly service at a time.
          </p>
        </div>
      `,
    });
    
    console.log(`✓ Payment reminder #${reminderNumber} sent for invoice ${invoice.invoiceNumber} (${daysOverdue} days overdue)`);
  } catch (error) {
    console.error(`Failed to send payment reminder for invoice ${invoice.invoiceNumber}:`, error);
    throw error;
  }
}
