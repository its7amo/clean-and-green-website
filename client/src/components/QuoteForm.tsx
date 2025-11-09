import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, Home, Building2, Check, Sparkles, Star, Shield, Zap, Mail, Phone, MapPin } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const propertySizes = [
  { value: "Small", label: "Small", icon: Home, description: "< 1,500 sq ft", examples: "Apartment, Studio" },
  { value: "Medium", label: "Medium", icon: Building2, description: "1,500-3,000 sq ft", examples: "House, Townhome" },
  { value: "Large", label: "Large", icon: Building2, description: "3,000-5,000 sq ft", examples: "Large House, Office" },
  { value: "Custom", label: "Custom", icon: Building2, description: "Over 5,000 sq ft", examples: "Commercial, Estate" }
];

export function QuoteForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    serviceType: "",
    propertySize: "",
    customSize: "",
    details: "",
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const updateFormData = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const createQuoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/quotes", data);
      return await res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Quote Request Received!",
        description: "We'll review your request and send you a custom quote within 24 hours.",
      });
      setTimeout(() => {
        setLocation("/");
      }, 3000);
    },
    onError: () => {
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your quote request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const quoteData = {
      serviceType: formData.serviceType,
      propertySize: formData.propertySize,
      customSize: formData.customSize || null,
      details: formData.details,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      status: "pending",
    };
    createQuoteMutation.mutate(quoteData);
  };

  if (submitted) {
    return (
      <div className="min-h-[600px] flex items-center justify-center px-4">
        <Card className="p-12 max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Request Received!</h2>
          <p className="text-muted-foreground mb-6">
            Thank you for your interest in Clean and Green. Our team will review your request and send you a detailed custom quote within 24 hours.
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-center gap-2 text-primary">
              <Check className="h-4 w-4" />
              <span>Quote request confirmed</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-primary">
              <Check className="h-4 w-4" />
              <span>Email notification sent</span>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      {/* Header Section */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-3">Request a Custom Quote</h1>
        <p className="text-muted-foreground mb-4">Tell us about your cleaning needs and we'll create a personalized quote</p>
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <span className="text-muted-foreground">5.0 Rating</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Free Estimates</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">24-Hour Response</span>
          </div>
        </div>
      </div>

      <Card className="p-6 md:p-8 lg:p-12">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Service Type Section */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="serviceType" className="text-base font-semibold mb-2 block">
                What type of service do you need?
              </Label>
              <p className="text-sm text-muted-foreground mb-4">
                Examples: Office cleaning, Restaurant deep clean, Move-out service, etc.
              </p>
            </div>
            <Input
              id="serviceType"
              size-variant="lg"
              placeholder="e.g., Office building weekly cleaning"
              value={formData.serviceType}
              onChange={(e) => updateFormData("serviceType", e.target.value)}
              required
              data-testid="input-service-type"
            />
          </div>

          {/* Property Size Section */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold mb-2 block">Property Size</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Choose the size that best matches your property
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {propertySizes.map((size) => {
                const Icon = size.icon;
                const isSelected = formData.propertySize === size.value;
                return (
                  <button
                    key={size.value}
                    type="button"
                    onClick={() => updateFormData("propertySize", size.value)}
                    className={`p-4 rounded-xl border-2 transition-all text-left hover-elevate ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                    data-testid={`button-quote-size-${size.value}`}
                  >
                    <Icon className={`h-6 w-6 mb-3 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="space-y-1">
                      <div className="font-semibold text-sm">{size.label}</div>
                      <div className="text-xs text-muted-foreground">{size.description}</div>
                      <div className="text-xs text-muted-foreground italic">{size.examples}</div>
                    </div>
                    {isSelected && (
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {formData.propertySize === "Custom" && (
            <div className="space-y-2 pl-4 border-l-2 border-primary/30">
              <Label htmlFor="customSize" className="text-sm font-semibold">
                Specify Size (square feet)
              </Label>
              <Input
                id="customSize"
                type="number"
                placeholder="Enter square footage"
                value={formData.customSize}
                onChange={(e) => updateFormData("customSize", e.target.value)}
                data-testid="input-custom-size"
              />
            </div>
          )}

          {/* Details Section */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="details" className="text-base font-semibold mb-2 block">
                Detailed Requirements
              </Label>
              <p className="text-sm text-muted-foreground mb-4">
                Tell us about your specific cleaning needs, areas of focus, frequency preferences, etc.
              </p>
            </div>
            <Textarea
              id="details"
              placeholder="Example: I need bi-weekly office cleaning for a 3,000 sq ft space. Focus areas include common areas, bathrooms, and break room. We prefer eco-friendly products."
              className="min-h-32"
              value={formData.details}
              onChange={(e) => updateFormData("details", e.target.value)}
              required
              data-testid="textarea-details"
            />
          </div>

          {/* Photo Upload Section */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold mb-2 block">
                Property Photos (Optional)
              </Label>
              <p className="text-sm text-muted-foreground mb-4">
                Upload photos to help us better understand your space
              </p>
            </div>
            <div 
              className="border-2 border-dashed rounded-xl p-8 md:p-12 text-center hover-elevate cursor-pointer transition-all" 
              data-testid="upload-area"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <p className="font-medium mb-1">Click to upload or drag and drop</p>
              <p className="text-sm text-muted-foreground">PNG, JPG up to 10MB</p>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="border-t pt-8">
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-2">Your Contact Information</h3>
              <p className="text-sm text-muted-foreground">We'll send your custom quote to this information</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="quote-name" className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Full Name
                </Label>
                <Input
                  id="quote-name"
                  size-variant="lg"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => updateFormData("name", e.target.value)}
                  required
                  data-testid="input-quote-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quote-email" className="text-sm font-semibold flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  Email Address
                </Label>
                <Input
                  id="quote-email"
                  type="email"
                  size-variant="lg"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => updateFormData("email", e.target.value)}
                  required
                  data-testid="input-quote-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quote-phone" className="text-sm font-semibold flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  Phone Number
                </Label>
                <Input
                  id="quote-phone"
                  type="tel"
                  size-variant="lg"
                  placeholder="(405) 555-0123"
                  value={formData.phone}
                  onChange={(e) => updateFormData("phone", e.target.value)}
                  required
                  data-testid="input-quote-phone"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quote-address" className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Property Address
                </Label>
                <Input
                  id="quote-address"
                  size-variant="lg"
                  placeholder="123 Main St, Oklahoma City, OK"
                  value={formData.address}
                  onChange={(e) => updateFormData("address", e.target.value)}
                  required
                  data-testid="input-quote-address"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="border-t pt-8">
            <Button 
              type="submit" 
              size="lg" 
              className="w-full md:w-auto md:min-w-64" 
              disabled={createQuoteMutation.isPending}
              data-testid="button-submit-quote"
            >
              {createQuoteMutation.isPending ? (
                <>
                  <div className="h-4 w-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2" />
                  Submitting Request...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Get Your Free Quote
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground mt-4 text-center md:text-left">
              ✓ Free estimates &nbsp;&nbsp; ✓ No obligation &nbsp;&nbsp; ✓ 24-hour response
            </p>
          </div>
        </form>
      </Card>

      {/* Trust Section */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/5 rounded-full px-6 py-3">
          <Shield className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Your information is secure and will never be shared</span>
        </div>
      </div>
    </div>
  );
}
