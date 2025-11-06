import { db } from './db';
import { invoices } from '@shared/schema';
import { sql } from 'drizzle-orm';
import { sendPaymentThankYouEmail } from './email';

export async function checkAndSendReviewEmails() {
  try {
    // Find invoices that were paid exactly 24 hours ago (with 1 hour tolerance window)
    // and haven't had the review email sent yet
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);

    const eligibleInvoices = await db
      .select()
      .from(invoices)
      .where(
        sql`${invoices.paidDate} IS NOT NULL 
            AND ${invoices.paidDate} >= ${twentyFiveHoursAgo} 
            AND ${invoices.paidDate} <= ${twentyFourHoursAgo}
            AND ${invoices.reviewEmailSent} = false`
      );

    console.log(`Found ${eligibleInvoices.length} invoices eligible for review emails`);

    for (const invoice of eligibleInvoices) {
      try {
        // Send the thank you email with review request
        await sendPaymentThankYouEmail({
          customerEmail: invoice.customerEmail,
          customerName: invoice.customerName,
          serviceDescription: invoice.serviceDescription,
          invoiceNumber: invoice.invoiceNumber,
        });

        // Mark as sent
        await db
          .update(invoices)
          .set({ reviewEmailSent: true })
          .where(sql`${invoices.id} = ${invoice.id}`);

        console.log(`✓ Review email sent for invoice ${invoice.invoiceNumber}`);
      } catch (error) {
        console.error(`Failed to send review email for invoice ${invoice.invoiceNumber}:`, error);
        // Continue with other invoices even if one fails
      }
    }
  } catch (error) {
    console.error('Error in review email scheduler:', error);
  }
}

// Run the check every hour
export function startReviewEmailScheduler() {
  console.log('✓ Review email scheduler started (checks every hour)');
  
  // Run immediately on startup
  checkAndSendReviewEmails();
  
  // Then run every hour
  setInterval(checkAndSendReviewEmails, 60 * 60 * 1000); // 1 hour
}
