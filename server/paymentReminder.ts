import { resend, escapeHtml } from './email';
import type { Invoice } from '@shared/schema';

export interface PaymentReminderData {
  invoice: Invoice;
  daysOverdue: number;
  reminderNumber: number;
}

export async function sendPaymentReminderEmail(data: PaymentReminderData): Promise<void> {
  const { invoice, daysOverdue, reminderNumber } = data;
  
  const amountDue = (invoice.total / 100).toFixed(2);
  const paymentLink = `${process.env.REPLIT_DOMAINS}/invoice/${invoice.id}/pay`;
  
  const urgencyLevel = reminderNumber === 3 ? 'URGENT' : reminderNumber === 2 ? 'Important' : '';
  const subject = urgencyLevel 
    ? `${urgencyLevel}: Payment Reminder - Invoice ${escapeHtml(invoice.invoiceNumber)}`
    : `Payment Reminder - Invoice ${escapeHtml(invoice.invoiceNumber)}`;
  
  const greetingTone = reminderNumber === 1 
    ? 'This is a friendly reminder'
    : reminderNumber === 2
    ? 'We wanted to follow up'
    : 'This is an urgent reminder';
  
  const closingMessage = reminderNumber === 1
    ? 'If you\'ve already made this payment, please disregard this email. Thank you for your business!'
    : reminderNumber === 2
    ? 'If you have any questions or concerns about this invoice, please don\'t hesitate to reach out. We\'re here to help!'
    : 'If there\'s an issue with this invoice or you need to discuss payment arrangements, please contact us immediately. We value your business and want to work with you.';
  
  try {
    await resend.emails.send({
      from: 'Clean & Green <noreply@voryn.store>',
      to: invoice.customerEmail,
      subject,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; padding: 20px; background-color: #ffffff;">
          ${reminderNumber === 3 ? `
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin-bottom: 20px;">
              <h3 style="margin-top: 0; color: #991b1b;">⚠️ URGENT - Action Required</h3>
              <p style="margin-bottom: 0; color: #991b1b;">This invoice is significantly overdue. Please review and submit payment as soon as possible.</p>
            </div>
          ` : ''}
          
          <h2 style="color: #22c55e; margin-bottom: 10px;">Payment Reminder</h2>
          
          <p>Hi ${escapeHtml(invoice.customerName)},</p>
          
          <p>${greetingTone} that payment for the following invoice is now <strong>${daysOverdue} days overdue</strong>.</p>
          
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #374151;">Invoice Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Invoice Number:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${escapeHtml(invoice.invoiceNumber)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Service:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${escapeHtml(invoice.serviceDescription)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Amount Due:</strong></td>
                <td style="padding: 8px 0; text-align: right; font-size: 18px; font-weight: bold; color: #22c55e;">$${amountDue}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Days Overdue:</strong></td>
                <td style="padding: 8px 0; text-align: right; color: #ef4444; font-weight: bold;">${daysOverdue} days</td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${paymentLink}" style="display: inline-block; padding: 14px 32px; background-color: #22c55e; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Pay Invoice Now
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            ${closingMessage}
          </p>
          
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
