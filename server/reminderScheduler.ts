import { storage } from "./storage";
import { sendBookingConfirmationSMS } from "./sms";
import { sendCustomerBookingConfirmation, replaceTemplatePlaceholders, escapeHtml, resend } from "./email";

export function startReminderScheduler() {
  // Run every hour to check for bookings needing reminders
  const intervalMs = 60 * 60 * 1000; // 1 hour
  
  setInterval(async () => {
    await checkAndSendReminders();
  }, intervalMs);

  // Also run immediately on startup
  checkAndSendReminders();
  
  console.log("✓ Appointment reminder scheduler started (checks every hour)");
}

async function checkAndSendReminders() {
  try {
    // Check if reminder emails are enabled
    const settings = await storage.getBusinessSettings();
    if (!settings?.reminderEmailEnabled) {
      return; // Skip if disabled
    }

    const bookings = await storage.getBookings();
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    let remindersSent = 0;

    for (const booking of bookings) {
      // Only send reminders for confirmed bookings that haven't been reminded
      if (booking.status !== 'confirmed' || booking.reminderSent) {
        continue;
      }

      const bookingDate = new Date(booking.date);

      // Check if booking is within 24 hours but at least 2 hours away
      if (bookingDate >= twoHoursFromNow && bookingDate <= tomorrow) {
        try {
          // Send SMS reminder
          await sendBookingConfirmationSMS(
            booking.phone,
            booking.name,
            booking.service,
            new Date(booking.date),
            booking.timeSlot
          );

          // Send email reminder with custom template
          await sendReminderEmail(booking, settings);

          // Mark reminder as sent
          await storage.updateBooking(booking.id, {
            reminderSent: true,
          });

          remindersSent++;
          console.log(`✓ Reminder sent for booking ${booking.id} (${booking.name})`);
        } catch (error) {
          console.error(`Error sending reminder for booking ${booking.id}:`, error);
        }
      }
    }

    if (remindersSent > 0) {
      console.log(`Sent ${remindersSent} appointment reminder(s)`);
    }
  } catch (error) {
    console.error("Error checking for reminders:", error);
  }
}

async function sendReminderEmail(booking: any, settings: any) {
  // Default templates
  const defaultSubject = 'Reminder: Your cleaning appointment tomorrow ⏰';
  const defaultBody = `Hi {{customerName}}!

This is a friendly reminder that your {{serviceType}} is scheduled for tomorrow:

Date: {{appointmentDate}}
Time: {{timeSlot}}
Address: {{customerAddress}}

Our team will arrive on time with all eco-friendly cleaning supplies. Please ensure someone is available to let us in.

If you need to reschedule, please contact us as soon as possible.

Looking forward to seeing you tomorrow!

Best regards,
Clean & Green Team`;

  // Use custom templates if available
  const subjectTemplate = settings?.reminderEmailSubject || defaultSubject;
  const bodyTemplate = settings?.reminderEmailBody || defaultBody;
  
  // Replace placeholders
  const subject = replaceTemplatePlaceholders(subjectTemplate, {
    customerName: booking.name,
    serviceType: booking.service,
    appointmentDate: booking.date,
    timeSlot: booking.timeSlot,
    customerAddress: booking.address,
  });
  
  const bodyText = replaceTemplatePlaceholders(bodyTemplate, {
    customerName: booking.name,
    serviceType: booking.service,
    appointmentDate: booking.date,
    timeSlot: booking.timeSlot,
    customerAddress: booking.address,
  });
  
  // Convert plain text to HTML with proper formatting
  const bodyHtml = bodyText
    .split('\n\n')
    .map(para => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
    .join('');
  
  const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; padding: 20px;">
      ${bodyHtml}
      <p style="font-size: 12px; color: #999; margin-top: 30px;">Clean & Green - Making Oklahoma cleaner, one eco-friendly service at a time.</p>
    </div>
  `;
  
  await resend.emails.send({
    from: 'Clean & Green <noreply@voryn.store>',
    to: booking.email,
    subject,
    html,
  });
}

export async function checkAndSendRemindersNow() {
  await checkAndSendReminders();
}
