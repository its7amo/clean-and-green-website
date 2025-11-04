import { Link } from "wouter";
import { Leaf, Mail, Phone, MapPin, Facebook, Instagram, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function Footer() {
  const [email, setEmail] = useState("");

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Newsletter signup:", email);
    setEmail("");
  };

  return (
    <footer className="bg-muted/50 border-t">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Leaf className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl">Clean & Green</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Professional eco-friendly cleaning services across Oklahoma. Making homes and businesses sparkle while protecting our planet.
            </p>
            <div className="flex gap-2">
              <Button size="icon" variant="ghost" data-testid="button-social-facebook">
                <Facebook className="h-5 w-5" />
              </Button>
              <Button size="icon" variant="ghost" data-testid="button-social-instagram">
                <Instagram className="h-5 w-5" />
              </Button>
              <Button size="icon" variant="ghost" data-testid="button-social-twitter">
                <Twitter className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/services">
                  <a className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-footer-services">
                    Services
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/book">
                  <a className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-footer-book">
                    Book Now
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/quote">
                  <a className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-footer-quote">
                    Get Quote
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/contact">
                  <a className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-footer-contact">
                    Contact
                  </a>
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Contact Info</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-muted-foreground">(405) 555-0123</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-muted-foreground">info@cleanandgreen.com</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-muted-foreground">Serving all of Oklahoma</span>
              </li>
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
          <p>&copy; 2024 Clean & Green. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy">
              <a className="hover:text-primary transition-colors" data-testid="link-privacy">
                Privacy Policy
              </a>
            </Link>
            <Link href="/terms">
              <a className="hover:text-primary transition-colors" data-testid="link-terms">
                Terms of Service
              </a>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
