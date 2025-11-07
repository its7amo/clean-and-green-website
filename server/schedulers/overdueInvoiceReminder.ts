import { db } from '../db';
import { invoices, businessSettings } from '@shared/schema';
import { sql } from 'drizzle-orm';
import { sendPaymentReminderEmail } from '../paymentReminder';
import { logActivity } from '../activityLogger';
import { differenceInDays } from 'date-fns';

export async function checkAndSendOverdueReminders() {
  try {
    const now = new Date();
    
    // Check if payment reminders are enabled
    const settings = await db.select().from(businessSettings).limit(1);
    if (settings.length > 0 && !settings[0].paymentReminderEnabled) {
      console.log('Payment reminders are disabled in settings');
      return;
    }
    
    // Query for unpaid/partially_paid invoices with a due date in the past
    const overdueInvoices = await db
      .select()
      .from(invoices)
      .where(
        sql`${invoices.dueDate} IS NOT NULL 
            AND ${invoices.dueDate} < ${now}
            AND ${invoices.status} != 'paid' 
            AND ${invoices.status} != 'cancelled'`
      );

    console.log(`Found ${overdueInvoices.length} overdue invoices to check`);

    let remindersSent = 0;

    for (const invoice of overdueInvoices) {
      try {
        // Calculate days overdue
        const daysOverdue = differenceInDays(now, new Date(invoice.dueDate!));
        
        // Determine if we should send a reminder based on days overdue and reminder count
        let shouldSendReminder = false;
        let reminderNumber = 0;
        
        if (daysOverdue >= 3 && invoice.reminderCount === 0) {
          // First reminder at 3 days
          shouldSendReminder = true;
          reminderNumber = 1;
        } else if (daysOverdue >= 7 && invoice.reminderCount === 1) {
          // Second reminder at 7 days
          shouldSendReminder = true;
          reminderNumber = 2;
        } else if (daysOverdue >= 14 && invoice.reminderCount === 2) {
          // Third reminder at 14 days
          shouldSendReminder = true;
          reminderNumber = 3;
        }
        
        if (shouldSendReminder) {
          // Send the reminder email
          await sendPaymentReminderEmail({
            invoice,
            daysOverdue,
            reminderNumber,
            settings: settings[0],
          });
          
          // Update the invoice record
          await db
            .update(invoices)
            .set({
              lastReminderSentAt: now,
              reminderCount: invoice.reminderCount + 1,
              updatedAt: now,
            })
            .where(sql`${invoices.id} = ${invoice.id}`);
          
          // Log the activity
          await logActivity({
            context: {
              userRole: 'system',
              userName: 'Payment Reminder System',
            },
            action: 'sent_reminder',
            entityType: 'invoice',
            entityId: invoice.id,
            entityName: invoice.invoiceNumber,
            details: `Sent payment reminder #${reminderNumber} for invoice ${invoice.invoiceNumber} (${daysOverdue} days overdue)`,
          });
          
          remindersSent++;
          console.log(`✓ Reminder #${reminderNumber} sent for invoice ${invoice.invoiceNumber} (${daysOverdue} days overdue)`);
        }
      } catch (error) {
        console.error(`Error processing invoice ${invoice.invoiceNumber}:`, error);
        // Continue with other invoices even if one fails
      }
    }

    if (remindersSent > 0) {
      console.log(`Sent ${remindersSent} payment reminder(s)`);
    }
  } catch (error) {
    console.error('Error in overdue invoice reminder scheduler:', error);
  }
}

// Run the check every hour
export function startOverdueInvoiceReminder() {
  console.log('✓ Overdue invoice reminder scheduler started (checks every hour)');
  
  // Run immediately on startup
  checkAndSendOverdueReminders();
  
  // Then run every hour
  setInterval(checkAndSendOverdueReminders, 60 * 60 * 1000); // 1 hour
}
