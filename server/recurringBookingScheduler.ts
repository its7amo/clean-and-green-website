import { storage } from "./storage";
import { sendBookingConfirmationSMS } from "./sms";
import { sendBookingUnderReviewEmail } from "./email";

export function startRecurringBookingScheduler() {
  // Run every hour to check for recurring bookings that need new appointments
  const intervalMs = 60 * 60 * 1000; // 1 hour
  
  setInterval(async () => {
    await processRecurringBookings();
  }, intervalMs);

  // Also run immediately on startup
  processRecurringBookings();
  
  console.log("✓ Recurring booking scheduler started (checks every hour)");
}

async function processRecurringBookings() {
  try {
    const recurringBookings = await storage.getRecurringBookings();
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    let bookingsCreated = 0;

    for (const recurring of recurringBookings) {
      // Skip if not active
      if (recurring.status !== 'active') {
        continue;
      }

      const nextOccurrence = new Date(recurring.nextOccurrence);

      // Check if next occurrence exceeds end date (if set)
      if (recurring.endDate) {
        const endDate = new Date(recurring.endDate);
        if (nextOccurrence > endDate) {
          // Mark as cancelled since it has reached its end date
          await storage.updateRecurringBooking(recurring.id, { status: 'cancelled' });
          console.log(`Recurring booking ${recurring.id} ended (next occurrence ${recurring.nextOccurrence} is after end date ${recurring.endDate})`);
          continue;
        }
      }

      // Create booking if next occurrence is within the next 7 days
      if (nextOccurrence <= sevenDaysFromNow) {
        try {
          // Check for duplicate booking on the same date
          const existingBookings = await storage.getBookingsByEmail(recurring.email);
          const hasDuplicate = existingBookings.some(
            booking => booking.date === recurring.nextOccurrence
          );

          if (!hasDuplicate) {
            // Create the new booking
            const newBooking = await storage.createBooking({
              name: recurring.name,
              email: recurring.email,
              phone: recurring.phone,
              address: recurring.address,
              service: recurring.service,
              propertySize: recurring.propertySize,
              date: recurring.nextOccurrence,
              timeSlot: recurring.preferredTimeSlot,
              status: 'pending',
              recurringBookingId: recurring.id,
              leadType: 'web', // Recurring bookings are web-based
            });

            bookingsCreated++;
            console.log(`✓ Created recurring booking for ${recurring.name} on ${recurring.nextOccurrence}`);

            // Send notifications (async, don't block)
            (async () => {
              try {
                const settings = await storage.getBusinessSettings();
                if (settings) {
                  // Send "under review" email to customer (not confirmed yet)
                  await sendBookingUnderReviewEmail({
                    bookingId: newBooking.id,
                    managementToken: newBooking.managementToken,
                    name: newBooking.name,
                    email: newBooking.email,
                    phone: newBooking.phone,
                    address: newBooking.address,
                    serviceType: newBooking.service,
                    propertySize: newBooking.propertySize,
                    date: newBooking.date,
                    timeSlot: newBooking.timeSlot,
                  });
                }
              } catch (notificationError) {
                console.error("Failed to send recurring booking notifications:", notificationError);
              }
            })();
          } else {
            console.log(`Skipping duplicate booking for ${recurring.name} on ${recurring.nextOccurrence}`);
          }

          // Calculate next occurrence based on frequency
          const currentOccurrence = new Date(recurring.nextOccurrence);
          let nextDate: Date;

          switch (recurring.frequency) {
            case 'weekly':
              nextDate = new Date(currentOccurrence.getTime() + 7 * 24 * 60 * 60 * 1000);
              break;
            case 'biweekly':
              nextDate = new Date(currentOccurrence.getTime() + 14 * 24 * 60 * 60 * 1000);
              break;
            case 'monthly':
              // Use calendar month math instead of fixed 30 days
              nextDate = new Date(currentOccurrence);
              nextDate.setMonth(nextDate.getMonth() + 1);
              break;
            default:
              nextDate = new Date(currentOccurrence.getTime() + 7 * 24 * 60 * 60 * 1000);
          }

          // Format as YYYY-MM-DD
          const formattedNextDate = nextDate.toISOString().split('T')[0];

          // Update next occurrence
          await storage.updateRecurringBooking(recurring.id, {
            nextOccurrence: formattedNextDate,
          });

        } catch (error) {
          console.error(`Error processing recurring booking ${recurring.id}:`, error);
        }
      }
    }

    if (bookingsCreated > 0) {
      console.log(`Created ${bookingsCreated} booking(s) from recurring schedules`);
    }
  } catch (error) {
    console.error("Error processing recurring bookings:", error);
  }
}

export async function processRecurringBookingsNow() {
  await processRecurringBookings();
}
