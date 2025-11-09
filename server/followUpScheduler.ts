import { storage } from "./storage";
import { resend, escapeHtml, replaceTemplatePlaceholders } from "./email";

const FOLLOW_UP_INTERVAL = 24 * 60 * 60 * 1000; // Check once per day
const DAYS_AFTER_COMPLETION = 30;

export function startFollowUpScheduler() {
  console.log("✓ Follow-up email scheduler started");
  
  // Run immediately on startup, then every 24 hours
  checkAndSendFollowUps();
  setInterval(checkAndSendFollowUps, FOLLOW_UP_INTERVAL);
}

async function checkAndSendFollowUps() {
  try {
    // Check if follow-up emails are enabled
    const settings = await storage.getBusinessSettings();
    if (!settings?.followUpEmailEnabled) {
      return; // Skip if disabled
    }

    const bookings = await storage.getBookings();
    const now = new Date();
    
    for (const booking of bookings) {
      // Only send follow-ups for completed bookings
      if (booking.status !== 'completed' || !booking.completedDate) {
        continue;
      }
      
      // Check if it's been exactly 30 days (±1 day tolerance)
      const completedDate = new Date(booking.completedDate);
      const daysSinceCompletion = Math.floor((now.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Send follow-up if it's been 30 days and we haven't sent one yet
      if (daysSinceCompletion === DAYS_AFTER_COMPLETION && !booking.followUpSent) {
        await sendFollowUpEmail(booking, settings);
      }
    }
  } catch (error) {
    console.error("Error in follow-up scheduler:", error);
  }
}

async function sendFollowUpEmail(booking: any, settings: any) {
  try {
    // Default templates
    const defaultSubject = '{{customerName}}, Ready for Another Cleaning? 🏡';
    const defaultBody = `Hi {{customerName}}!

It's been 30 days since we cleaned your home, and we wanted to check in. Your space is probably ready for another refresh!

We'd love to help you maintain that clean, fresh feeling.

As a returning customer, you're always our top priority. Book your next service today and experience:

✨ The same eco-friendly products you loved
🏡 Professional deep cleaning service
💚 100% satisfaction guaranteed

Ready to book? Click here to schedule your next appointment!

Best regards,
Clean & Green Team`;

    // Use custom templates if available
    const subjectTemplate = settings?.followUpEmailSubject || defaultSubject;
    const bodyTemplate = settings?.followUpEmailBody || defaultBody;
    
    const firstName = booking.name.split(' ')[0];
    
    // Replace placeholders
    const subject = replaceTemplatePlaceholders(subjectTemplate, {
      customerName: firstName,
    });
    
    const bodyText = replaceTemplatePlaceholders(bodyTemplate, {
      customerName: firstName,
    });
    
    // Convert plain text to HTML with proper formatting
    const bodyHtml = bodyText
      .split('\n\n')
      .map(para => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
      .join('');
    
    const baseUrl = process.env.APP_URL || 'https://clean-and-green-website.onrender.com';
    const bookUrl = `${baseUrl}/book`;
    
    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; padding: 20px;">
        ${bodyHtml}
        
        <p style="text-align: center; margin: 30px 0;">
          <a href="${bookUrl}" style="background-color: #22c55e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
            Book Your Next Cleaning
          </a>
        </p>
        
        <p style="font-size: 12px; color: #999; margin-top: 30px;">Clean & Green - Making Oklahoma cleaner, one eco-friendly service at a time.</p>
      </div>
    `;
    
    await resend.emails.send({
      from: 'Clean & Green <noreply@voryn.store>',
      to: booking.email,
      subject,
      html,
    });
    
    // Mark follow-up as sent
    await storage.updateBooking(booking.id, { followUpSent: true });
    
    console.log(`✓ Follow-up email sent to ${booking.email}`);
  } catch (error) {
    console.error(`Failed to send follow-up email to ${booking.email}:`, error);
  }
}
