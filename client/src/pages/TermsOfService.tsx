import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PromoBanner } from "@/components/PromoBanner";
import { useQuery } from "@tanstack/react-query";
import type { BusinessSettings } from "@shared/schema";
import { Card } from "@/components/ui/card";

export default function TermsOfService() {
  const { data: settings, isLoading } = useQuery<BusinessSettings>({
    queryKey: ["/api/settings"],
  });

  return (
    <div className="min-h-screen flex flex-col">
      <PromoBanner />
      <Header />
      <main className="flex-1 py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-8" data-testid="text-terms-title">
            Terms of Service
          </h1>
          
          <Card className="p-6 md:p-8">
            {isLoading ? (
              <div className="space-y-4">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
                <div className="h-4 bg-muted rounded animate-pulse w-4/6" />
              </div>
            ) : settings?.termsOfService ? (
              <div 
                className="prose prose-sm md:prose-base max-w-none"
                data-testid="text-terms-content"
                dangerouslySetInnerHTML={{ __html: settings.termsOfService }}
              />
            ) : (
              <div className="text-muted-foreground" data-testid="text-terms-placeholder">
                <h2 className="text-2xl font-bold mb-4">Agreement to Terms</h2>
                <p className="mb-4">
                  By accessing and using {settings?.businessName || "Clean & Green"}'s services, 
                  you agree to be bound by these Terms of Service and all applicable laws and regulations.
                </p>

                <h2 className="text-2xl font-bold mb-4 mt-8">Service Description</h2>
                <p className="mb-4">
                  We provide professional eco-friendly cleaning services including residential cleaning, 
                  commercial cleaning, and deep cleaning services. All services are subject to availability 
                  and our standard operating procedures.
                </p>

                <h2 className="text-2xl font-bold mb-4 mt-8">Booking and Cancellation</h2>
                <p className="mb-4">
                  Bookings can be made through our website or by contacting us directly. We require 
                  at least 24 hours notice for cancellations to avoid cancellation fees. Late cancellations 
                  (less than 24 hours) may be subject to a fee.
                </p>

                <h2 className="text-2xl font-bold mb-4 mt-8">Payment Terms</h2>
                <p className="mb-4">
                  Payment is due upon completion of service unless otherwise arranged. We accept credit 
                  cards and other payment methods as specified. Invoices not paid within 30 days may be 
                  subject to late fees.
                </p>

                <h2 className="text-2xl font-bold mb-4 mt-8">Liability</h2>
                <p className="mb-4">
                  We maintain liability insurance and take all reasonable care during service delivery. 
                  Any damage claims must be reported within 24 hours of service completion. We are not 
                  liable for pre-existing damage or items not properly disclosed.
                </p>

                <h2 className="text-2xl font-bold mb-4 mt-8">Access and Safety</h2>
                <p className="mb-4">
                  Customers must provide safe access to all areas requiring cleaning. We reserve the 
                  right to refuse service in unsafe conditions. Pets should be secured during service.
                </p>

                <h2 className="text-2xl font-bold mb-4 mt-8">Modifications to Terms</h2>
                <p className="mb-4">
                  We reserve the right to modify these terms at any time. Continued use of our services 
                  constitutes acceptance of any changes.
                </p>

                <h2 className="text-2xl font-bold mb-4 mt-8">Contact Information</h2>
                <p className="mb-4">
                  For questions about these Terms of Service, please contact us at{" "}
                  <a href={`mailto:${settings?.email}`} className="text-primary hover:underline">
                    {settings?.email}
                  </a>
                </p>
              </div>
            )}
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
