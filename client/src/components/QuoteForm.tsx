import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload } from "lucide-react";

const propertySizes = ["Small", "Medium", "Large", "Custom"];

export function QuoteForm() {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Quote request submitted:", formData);
  };

  return (
    <Card className="p-8 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Request a Custom Quote</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="serviceType">Service Type</Label>
          <Input
            id="serviceType"
            placeholder="e.g., Office building, Restaurant, Move-out cleaning"
            value={formData.serviceType}
            onChange={(e) => updateFormData("serviceType", e.target.value)}
            required
            data-testid="input-service-type"
          />
        </div>

        <div className="space-y-2">
          <Label>Property Size</Label>
          <RadioGroup value={formData.propertySize} onValueChange={(value) => updateFormData("propertySize", value)}>
            {propertySizes.map((size) => (
              <div key={size} className="flex items-center space-x-2">
                <RadioGroupItem value={size} id={size} data-testid={`radio-quote-size-${size}`} />
                <Label htmlFor={size} className="cursor-pointer">{size}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {formData.propertySize === "Custom" && (
          <div className="space-y-2">
            <Label htmlFor="customSize">Specify Size (sq ft)</Label>
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

        <div className="space-y-2">
          <Label htmlFor="details">Detailed Requirements</Label>
          <Textarea
            id="details"
            placeholder="Please describe your cleaning needs, any specific areas to focus on, frequency, etc."
            className="min-h-32"
            value={formData.details}
            onChange={(e) => updateFormData("details", e.target.value)}
            required
            data-testid="textarea-details"
          />
        </div>

        <div className="space-y-2">
          <Label>Property Photos (Optional)</Label>
          <div className="border-2 border-dashed rounded-lg p-8 text-center hover-elevate cursor-pointer" data-testid="upload-area">
            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
            <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quote-name">Full Name</Label>
            <Input
              id="quote-name"
              value={formData.name}
              onChange={(e) => updateFormData("name", e.target.value)}
              required
              data-testid="input-quote-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quote-email">Email</Label>
            <Input
              id="quote-email"
              type="email"
              value={formData.email}
              onChange={(e) => updateFormData("email", e.target.value)}
              required
              data-testid="input-quote-email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quote-phone">Phone Number</Label>
            <Input
              id="quote-phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => updateFormData("phone", e.target.value)}
              required
              data-testid="input-quote-phone"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quote-address">Property Address</Label>
            <Input
              id="quote-address"
              value={formData.address}
              onChange={(e) => updateFormData("address", e.target.value)}
              required
              data-testid="input-quote-address"
            />
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full" data-testid="button-submit-quote">
          Submit Quote Request
        </Button>
      </form>
    </Card>
  );
}
