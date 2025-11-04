import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Home, Building2, Sparkles, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const services = [
  { id: "residential", icon: Home, title: "Residential", price: "$89" },
  { id: "commercial", icon: Building2, title: "Commercial", price: "$149" },
  { id: "deep", icon: Sparkles, title: "Deep Cleaning", price: "$199" },
];

const timeSlots = ["8:00 AM", "10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM"];
const propertySizes = ["Small (< 1000 sq ft)", "Medium (1000-2000 sq ft)", "Large (2000-3000 sq ft)", "Extra Large (> 3000 sq ft)"];

export function BookingForm() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    service: "",
    propertySize: "",
    date: undefined as Date | undefined,
    timeSlot: "",
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const updateFormData = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const createBookingMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/bookings", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Booking Confirmed!",
        description: "We've received your booking request. We'll contact you shortly to confirm.",
      });
      setTimeout(() => {
        setLocation("/");
      }, 2000);
    },
    onError: () => {
      toast({
        title: "Booking Failed",
        description: "There was an error submitting your booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    const bookingData = {
      service: formData.service,
      propertySize: formData.propertySize,
      date: formData.date ? format(formData.date, "yyyy-MM-dd") : "",
      timeSlot: formData.timeSlot,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      status: "pending",
    };
    createBookingMutation.mutate(bookingData);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
                data-testid={`step-indicator-${s}`}
              >
                {step > s ? <Check className="h-5 w-5" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`flex-1 h-1 mx-2 ${step > s ? "bg-primary" : "bg-muted"}`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm">
          <span className={step >= 1 ? "text-foreground font-medium" : "text-muted-foreground"}>Service</span>
          <span className={step >= 2 ? "text-foreground font-medium" : "text-muted-foreground"}>Details</span>
          <span className={step >= 3 ? "text-foreground font-medium" : "text-muted-foreground"}>Contact</span>
        </div>
      </div>

      <Card className="p-8">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Select Service</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => updateFormData("service", service.id)}
                  className={`p-6 rounded-lg border-2 transition-all hover-elevate ${
                    formData.service === service.id
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                  data-testid={`button-service-${service.id}`}
                >
                  <service.icon className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">{service.title}</h3>
                  <p className="text-sm text-muted-foreground">From {service.price}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Schedule & Details</h2>
            
            <div className="space-y-2">
              <Label>Property Size</Label>
              <RadioGroup value={formData.propertySize} onValueChange={(value) => updateFormData("propertySize", value)}>
                {propertySizes.map((size) => (
                  <div key={size} className="flex items-center space-x-2">
                    <RadioGroupItem value={size} id={size} data-testid={`radio-size-${size}`} />
                    <Label htmlFor={size} className="cursor-pointer">{size}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Preferred Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    data-testid="button-date-picker"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? format(formData.date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => updateFormData("date", date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Preferred Time</Label>
              <div className="grid grid-cols-3 gap-2">
                {timeSlots.map((time) => (
                  <Button
                    key={time}
                    variant={formData.timeSlot === time ? "default" : "outline"}
                    onClick={() => updateFormData("timeSlot", time)}
                    data-testid={`button-time-${time}`}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Contact Information</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateFormData("name", e.target.value)}
                  data-testid="input-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData("email", e.target.value)}
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateFormData("phone", e.target.value)}
                  data-testid="input-phone"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Service Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => updateFormData("address", e.target.value)}
                  data-testid="input-address"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
            data-testid="button-back"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && !formData.service) ||
                (step === 2 && (!formData.propertySize || !formData.date || !formData.timeSlot))
              }
              data-testid="button-next"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={createBookingMutation.isPending}
              data-testid="button-submit-booking"
            >
              {createBookingMutation.isPending ? "Submitting..." : "Confirm Booking"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
