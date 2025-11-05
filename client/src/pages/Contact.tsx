import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { BusinessSettings } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const { toast } = useToast();

  const { data: settings } = useQuery<BusinessSettings>({
    queryKey: ["/api/settings"],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message sent!",
      description: "We'll get back to you as soon as possible.",
    });
    setFormData({
      name: "",
      email: "",
      phone: "",
      message: "",
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
            <p className="text-lg text-muted-foreground">
              Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <Card className="p-6 text-center">
              <Phone className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Phone</h3>
              <p className="text-muted-foreground" data-testid="text-contact-phone">{settings?.phone || "(405) 555-0123"}</p>
            </Card>

            <Card className="p-6 text-center">
              <Mail className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Email</h3>
              <p className="text-muted-foreground" data-testid="text-contact-email">{settings?.email || "info@cleanandgreen.com"}</p>
            </Card>

            <Card className="p-6 text-center">
              <Clock className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Hours</h3>
              <div className="text-muted-foreground" data-testid="text-contact-hours">
                {settings?.hoursMonFri ? (
                  <>
                    <p>Mon-Fri: {settings.hoursMonFri}</p>
                    {settings.hoursSat && <p>Sat: {settings.hoursSat}</p>}
                    {settings.hoursSun && <p>Sun: {settings.hoursSun}</p>}
                  </>
                ) : (
                  <p>Mon-Sat: 8AM - 6PM</p>
                )}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <Card className="p-8">
              <h2 className="text-2xl font-bold mb-6">Send us a message</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Name</Label>
                  <Input
                    id="contact-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="input-contact-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-email">Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    data-testid="input-contact-email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Phone</Label>
                  <Input
                    id="contact-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    data-testid="input-contact-phone"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-message">Message</Label>
                  <Textarea
                    id="contact-message"
                    className="min-h-32"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    data-testid="textarea-contact-message"
                  />
                </div>

                <Button type="submit" size="lg" className="w-full" data-testid="button-send-message">
                  Send Message
                </Button>
              </form>
            </Card>

            <div className="space-y-6">
              <Card className="p-6">
                <MapPin className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Service Areas</h3>
                <p className="text-muted-foreground mb-4">
                  We proudly serve all of Oklahoma, including:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Oklahoma City</li>
                  <li>• Tulsa</li>
                  <li>• Norman</li>
                  <li>• Edmond</li>
                  <li>• Broken Arrow</li>
                  <li>• And surrounding areas</li>
                </ul>
              </Card>

              <Card className="p-6 bg-primary text-primary-foreground">
                <h3 className="font-semibold mb-2">Ready to book?</h3>
                <p className="mb-4 text-primary-foreground/90">
                  Skip the contact form and schedule your cleaning directly online!
                </p>
                <Button variant="outline" className="bg-white text-primary hover:bg-white/90" data-testid="button-contact-book">
                  Book Now
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
