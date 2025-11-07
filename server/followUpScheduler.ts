import { storage } from "./storage";
import { resend, escapeHtml } from "./email";

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
        await sendFollowUpEmail(booking);
      }
    }
  } catch (error) {
    console.error("Error in follow-up scheduler:", error);
  }
}

async function sendFollowUpEmail(booking: any) {
  try {
    const firstName = booking.name.split(' ')[0];
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .cta-button { display: inline-block; background: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Time for Another Cleaning?</h1>
          </div>
          <div class="content">
            <p>Hi ${escapeHtml(firstName)}!</p>
            
            <p>It's been 30 days since we cleaned your home, and we wanted to check in. Your space is probably ready for another refresh!</p>
            
            <p><strong>We'd love to help you maintain that clean, fresh feeling.</strong></p>
            
            <p>As a returning customer, you're always our top priority. Book your next service today and experience:</p>
            <ul>
              <li>✨ The same eco-friendly products you loved</li>
              <li>🏡 Professional deep cleaning service</li>
              <li>💚 100% satisfaction guaranteed</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="${process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/book` : 'https://yoursite.com/book'}" class="cta-button">
                Book Your Next Cleaning
              </a>
            </div>
            
            <p style="margin-top: 30px;">Questions? Just reply to this email - we're here to help!</p>
            
            <p>Thank you for choosing Clean & Green,<br>
            <em>Your Eco-Friendly Cleaning Team</em></p>
          </div>
          <div class="footer">
            <p>© 2025 Clean & Green • Oklahoma's Premier Eco-Friendly Cleaning Service</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    await resend.emails.send({
      from: 'Clean & Green <noreply@cleanandgreen.com>',
      to: booking.email,
      subject: `${firstName}, Ready for Another Cleaning? 🏡`,
      html,
    });
    
    // Mark follow-up as sent
    await storage.updateBooking(booking.id, { followUpSent: true });
    
    console.log(`✓ Follow-up email sent to ${booking.email}`);
  } catch (error) {
    console.error(`Failed to send follow-up email to ${booking.email}:`, error);
  }
}
