import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useQuery } from "@tanstack/react-query";
import type { BusinessSettings } from "@shared/schema";
import { Card } from "@/components/ui/card";

export default function PrivacyPolicy() {
  const { data: settings, isLoading } = useQuery<BusinessSettings>({
    queryKey: ["/api/settings"],
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-8" data-testid="text-privacy-title">
            Privacy Policy
          </h1>
          
          <Card className="p-6 md:p-8">
            {isLoading ? (
              <div className="space-y-4">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
                <div className="h-4 bg-muted rounded animate-pulse w-4/6" />
              </div>
            ) : settings?.privacyPolicy ? (
              <div 
                className="prose prose-sm md:prose-base max-w-none"
                data-testid="text-privacy-content"
                dangerouslySetInnerHTML={{ __html: settings.privacyPolicy }}
              />
            ) : (
              <div className="text-muted-foreground" data-testid="text-privacy-placeholder">
                <h2 className="text-2xl font-bold mb-4">Information We Collect</h2>
                <p className="mb-4">
                  We collect information you provide directly to us when you book a cleaning service, 
                  request a quote, or communicate with us. This may include your name, email address, 
                  phone number, physical address, and payment information.
                </p>

                <h2 className="text-2xl font-bold mb-4 mt-8">How We Use Your Information</h2>
                <p className="mb-4">
                  We use the information we collect to:
                </p>
                <ul className="list-disc ml-6 mb-4 space-y-2">
                  <li>Provide, maintain, and improve our cleaning services</li>
                  <li>Process your bookings and payments</li>
                  <li>Send you service updates and communications</li>
                  <li>Respond to your comments and questions</li>
                  <li>Send you newsletters if you've subscribed</li>
                </ul>

                <h2 className="text-2xl font-bold mb-4 mt-8">Information Sharing</h2>
                <p className="mb-4">
                  We do not sell or rent your personal information to third parties. We may share your 
                  information with service providers who assist us in operating our business, such as 
                  payment processors and email service providers.
                </p>

                <h2 className="text-2xl font-bold mb-4 mt-8">Data Security</h2>
                <p className="mb-4">
                  We take reasonable measures to protect your personal information from unauthorized 
                  access, use, or disclosure. However, no internet transmission is completely secure, 
                  and we cannot guarantee absolute security.
                </p>

                <h2 className="text-2xl font-bold mb-4 mt-8">Contact Us</h2>
                <p className="mb-4">
                  If you have questions about this Privacy Policy, please contact us at{" "}
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
