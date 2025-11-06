import { Link } from "wouter";
import { Leaf, Mail, Phone, MapPin, Facebook, Instagram, Twitter, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { BusinessSettings } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function Footer() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const { toast } = useToast();

  const { data: settings } = useQuery<BusinessSettings>({
    queryKey: ["/api/settings"],
  });

  const subscribeMutation = useMutation({
    mutationFn: async (data: { email: string; name?: string }) => {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to subscribe");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "🎉 Subscribed!",
        description: "Welcome to our newsletter! Check your email for confirmation.",
      });
      setEmail("");
      setName("");
    },
    onError: (error: any) => {
      toast({
        title: "Subscription failed",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    subscribeMutation.mutate({ email, name });
  };

  return (
    <footer className="bg-muted/50 border-t">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Leaf className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl" data-testid="text-footer-business-name">{settings?.businessName || "Clean & Green"}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {settings?.aboutText || "Professional eco-friendly cleaning services across Oklahoma. Making homes and businesses sparkle while protecting our planet."}
            </p>
            <div className="flex gap-2">
              {settings?.socialLinks?.facebook && (
                <Button 
                  size="icon" 
                  variant="ghost" 
                  asChild
                  data-testid="button-social-facebook"
                >
                  <a 
                    href={settings.socialLinks.facebook} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                </Button>
              )}
              {settings?.socialLinks?.instagram && (
                <Button 
                  size="icon" 
                  variant="ghost" 
                  asChild
                  data-testid="button-social-instagram"
                >
                  <a 
                    href={settings.socialLinks.instagram} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                </Button>
              )}
              {settings?.socialLinks?.twitter && (
                <Button 
                  size="icon" 
                  variant="ghost" 
                  asChild
                  data-testid="button-social-twitter"
                >
                  <a 
                    href={settings.socialLinks.twitter} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="Twitter"
                  >
                    <Twitter className="h-5 w-5" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/services">
                  <span className="text-muted-foreground hover:text-primary transition-colors cursor-pointer" data-testid="link-footer-services">
                    Services
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/book">
                  <span className="text-muted-foreground hover:text-primary transition-colors cursor-pointer" data-testid="link-footer-book">
                    Book Now
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/quote">
                  <span className="text-muted-foreground hover:text-primary transition-colors cursor-pointer" data-testid="link-footer-quote">
                    Get Quote
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/contact">
                  <span className="text-muted-foreground hover:text-primary transition-colors cursor-pointer" data-testid="link-footer-contact">
                    Contact
                  </span>
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Contact Info</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-muted-foreground" data-testid="text-footer-phone">{settings?.phone || "(405) 555-0123"}</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-muted-foreground" data-testid="text-footer-email">{settings?.email || "info@cleanandgreen.com"}</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-muted-foreground" data-testid="text-footer-address">{settings?.address || "Serving all of Oklahoma"}</span>
              </li>
              {(settings?.hoursMonFri || settings?.hoursSat || settings?.hoursSun) && (
                <li className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-primary mt-0.5" />
                  <div className="text-muted-foreground">
                    {settings?.hoursMonFri && <div data-testid="text-footer-hours-weekday">Mon-Fri: {settings.hoursMonFri}</div>}
                    {settings?.hoursSat && <div data-testid="text-footer-hours-saturday">Sat: {settings.hoursSat}</div>}
                    {settings?.hoursSun && <div data-testid="text-footer-hours-sunday">Sun: {settings.hoursSun}</div>}
                  </div>
                </li>
              )}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Newsletter</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Get cleaning tips and exclusive offers
            </p>
            <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
              <Input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-newsletter-email"
              />
              <Button type="submit" data-testid="button-newsletter-submit">
                Subscribe
              </Button>
            </form>
          </div>
        </div>

        <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>&copy; 2025 Clean & Green. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy">
              <span className="hover:text-primary transition-colors cursor-pointer" data-testid="link-privacy">
                Privacy Policy
              </span>
            </Link>
            <Link href="/terms">
              <span className="hover:text-primary transition-colors cursor-pointer" data-testid="link-terms">
                Terms of Service
              </span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
