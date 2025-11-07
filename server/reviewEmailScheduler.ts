import { db } from './db';
import { invoices, bookings } from '@shared/schema';
import { sql } from 'drizzle-orm';
import { sendPaymentThankYouEmail } from './email';
import { storage } from './storage';

export async function checkAndSendReviewEmails() {
  try {
    // Check if review emails are enabled
    const settings = await storage.getBusinessSettings();
    if (!settings?.reviewEmailEnabled) {
      return; // Skip if disabled
    }

    // Find invoices that were paid at least 24 hours ago (but not more than 7 days ago)
    // and haven't had the review email sent yet
    // The upper bound prevents sending very old invoices if the feature was just enabled
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Check for paid invoices
    const eligibleInvoices = await db
      .select()
      .from(invoices)
      .where(
        sql`${invoices.paidDate} IS NOT NULL 
            AND ${invoices.paidDate} <= ${twentyFourHoursAgo}
            AND ${invoices.paidDate} >= ${sevenDaysAgo}
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

    // Check for completed bookings
    const eligibleBookings = await db
      .select()
      .from(bookings)
      .where(
        sql`${bookings.completedDate} IS NOT NULL 
            AND ${bookings.completedDate} <= ${twentyFourHoursAgo}
            AND ${bookings.completedDate} >= ${sevenDaysAgo}
            AND ${bookings.reviewEmailSent} = false`
      );

    console.log(`Found ${eligibleBookings.length} bookings eligible for review emails`);

    for (const booking of eligibleBookings) {
      try {
        // Send the thank you email with review request
        await sendPaymentThankYouEmail({
          customerEmail: booking.email,
          customerName: booking.name,
          serviceDescription: booking.service,
          invoiceNumber: `Booking #${booking.id.substring(0, 8)}`,
        });

        // Mark as sent
        await db
          .update(bookings)
          .set({ reviewEmailSent: true })
          .where(sql`${bookings.id} = ${booking.id}`);

        console.log(`✓ Review email sent for booking ${booking.id.substring(0, 8)}`);
      } catch (error) {
        console.error(`Failed to send review email for booking ${booking.id}:`, error);
        // Continue with other bookings even if one fails
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
