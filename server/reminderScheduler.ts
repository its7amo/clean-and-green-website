import { storage } from "./storage";
import { sendBookingConfirmationSMS } from "./sms";
import { sendCustomerBookingConfirmation } from "./email";

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
          await sendBookingConfirmationSMS({
            customerName: booking.name,
            customerPhone: booking.phone,
            serviceType: booking.service,
            date: booking.date,
            timeSlot: booking.timeSlot,
            propertySize: booking.propertySize || '',
          });

          // Send email reminder
          await sendCustomerBookingConfirmation({
            customerName: booking.name,
            customerEmail: booking.email,
            serviceType: booking.service,
            date: booking.date,
            timeSlot: booking.timeSlot,
            propertySize: booking.propertySize || '',
            address: booking.address,
          });

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

export async function checkAndSendRemindersNow() {
  await checkAndSendReminders();
}
