import { storage } from "./storage";
import { sendReferralCreditEarnedEmail, sendReferralWelcomeEmail } from "./email";

export function startReferralScheduler() {
  console.log("✓ Referral auto-crediting scheduler started (checks every 5 minutes)");
  
  // Run immediately on startup
  processReferralCredits();
  generateMissingReferralCodes();
  
  // Then run every 5 minutes
  setInterval(processReferralCredits, 5 * 60 * 1000);
  setInterval(generateMissingReferralCodes, 15 * 60 * 1000);
}

async function processReferralCredits() {
  try {
    const settings = await storage.getReferralSettings();
    if (!settings?.enabled) {
      return;
    }

    const bookings = await storage.getBookings();
    
    for (const booking of bookings) {
      if (booking.status !== 'completed' || !booking.referralCode) {
        continue;
      }

      const existingReferral = await storage.getReferralByBooking(booking.id);
      if (existingReferral) {
        if (existingReferral.status === 'pending') {
          await storage.updateReferralStatus(
            existingReferral.id,
            'completed'
          );
        }
        
        if (existingReferral.status === 'completed') {
          const referrer = await storage.getCustomer(existingReferral.referrerId);
          if (referrer) {
            await storage.addReferralCredit(
              existingReferral.referrerId,
              existingReferral.creditAmount
            );
            
            await storage.updateReferralStatus(
              existingReferral.id,
              'credited',
              new Date()
            );

            if (settings.creditEarnedEmailEnabled) {
              const tierLabels = ['1st', '2nd', '3rd+'];
              const tierLabel = tierLabels[existingReferral.tier - 1] || '3rd+';
              
              await sendReferralCreditEarnedEmail({
                customerEmail: referrer.email,
                customerName: referrer.name,
                referredName: booking.name,
                creditAmount: existingReferral.creditAmount,
                tier: tierLabel,
              });
            }

            console.log(`✓ Credited ${existingReferral.creditAmount / 100} to ${referrer.name} for referral`);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error processing referral credits:", error);
  }
}

async function generateMissingReferralCodes() {
  try {
    const settings = await storage.getReferralSettings();
    if (!settings?.enabled) {
      return;
    }

    const customers = await storage.getCustomers();
    
    for (const customer of customers) {
      if (!customer.referralCode && customer.totalBookings > 0) {
        const bookings = await storage.getBookings();
        const completedBooking = bookings.find(
          b => (b.email === customer.email || b.customerId === customer.id) && 
               b.status === 'completed'
        );

        if (completedBooking) {
          const code = await storage.generateReferralCode(customer.name);
          await storage.updateCustomer(customer.id, { referralCode: code });

          if (settings.welcomeEmailEnabled) {
            await sendReferralWelcomeEmail({
              customerEmail: customer.email,
              customerName: customer.name,
              referralCode: code,
            });
          }

          console.log(`✓ Generated referral code ${code} for ${customer.name}`);
        }
      }
    }
  } catch (error) {
    console.error("Error generating referral codes:", error);
  }
}
