import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { Service, BusinessSettings } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const timeSlots = ["8:00 AM", "10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM"];
const propertySizes = ["Small (< 1000 sq ft)", "Medium (1000-2000 sq ft)", "Large (2000-3000 sq ft)", "Extra Large (> 3000 sq ft)"];

const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

function PaymentMethodForm({ onSuccess }: { onSuccess: (pmId: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const { error: submitError, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
      });

      if (submitError) {
        setError(submitError.message || "Failed to process payment method");
        return;
      }

      if (setupIntent?.payment_method) {
        onSuccess(setupIntent.payment_method as string);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmitPayment} className="space-y-6">
      <PaymentElement />
      {error && (
        <div className="text-sm text-destructive" data-testid="text-payment-error">
          {error}
        </div>
      )}
      <Button 
        type="submit" 
        disabled={!stripe || processing}
        className="w-full"
        data-testid="button-confirm-payment"
      >
        {processing ? "Processing..." : "Confirm Booking"}
      </Button>
    </form>
  );
}

export function BookingForm() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [bookingSubmitted, setBookingSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    service: "",
    propertySize: "",
    date: undefined as Date | undefined,
    timeSlot: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    paymentMethodId: "",
    agreedToCancellationPolicy: false,
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: settings } = useQuery<BusinessSettings>({
    queryKey: ["/api/settings"],
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
      setBookingSubmitted(true);
      toast({
        title: "Booking Confirmed!",
        description: "We've received your booking request. We'll contact you shortly to confirm.",
      });
      setTimeout(() => {
        setLocation("/");
      }, 3000);
    },
    onError: () => {
      toast({
        title: "Booking Failed",
        description: "There was an error submitting your booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  const fetchSetupIntentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/create-setup-intent");
      return await res.json();
    },
    onSuccess: (data: { clientSecret: string }) => {
      setClientSecret(data.clientSecret);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
      setStep(3);
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
      paymentMethodId: formData.paymentMethodId,
    };
    createBookingMutation.mutate(bookingData);
  };

  if (bookingSubmitted) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card className="p-8 text-center">
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
              <p className="text-muted-foreground">
                Thank you for your booking. We've received your request and will contact you shortly to confirm.
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Redirecting you to the homepage...
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
                data-testid={`step-indicator-${s}`}
              >
                {step > s ? <Check className="h-5 w-5" /> : s}
              </div>
              {s < 4 && (
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
          <span className={step >= 4 ? "text-foreground font-medium" : "text-muted-foreground"}>Payment</span>
        </div>
      </div>

      <Card className="p-8">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Select Service</h2>
            {servicesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-6 rounded-lg border-2">
                    <Skeleton className="h-10 w-10 mx-auto mb-3 rounded-full" />
                    <Skeleton className="h-6 w-24 mx-auto mb-1" />
                    <Skeleton className="h-4 w-16 mx-auto" />
                  </div>
                ))}
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No services available. Please check back later.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => updateFormData("service", service.name)}
                    className={`p-6 rounded-lg border-2 transition-all hover-elevate ${
                      formData.service === service.name
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                    data-testid={`button-service-${service.name}`}
                  >
                    <Sparkles className="h-10 w-10 text-primary mx-auto mb-3" />
                    <h3 className="font-semibold mb-1">{service.name}</h3>
                    <p className="text-sm text-muted-foreground">From ${(service.basePrice / 100).toFixed(2)}</p>
                  </button>
                ))}
              </div>
            )}
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

        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Payment Method & Cancellation Policy</h2>
            <p className="text-muted-foreground">
              We require a payment method to hold your booking. You won't be charged now, but this card will be used if cancellation fees apply.
            </p>
            
            {settings?.cancellationPolicy && (
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Cancellation Policy</h3>
                <p className="text-sm">{settings.cancellationPolicy}</p>
              </div>
            )}
            
            <div className="flex items-start space-x-2">
              <Checkbox 
                id="agree-policy"
                checked={formData.agreedToCancellationPolicy}
                onCheckedChange={(checked) => updateFormData("agreedToCancellationPolicy", checked)}
                data-testid="checkbox-policy"
              />
              <Label htmlFor="agree-policy" className="cursor-pointer text-sm">
                I have read and agree to the cancellation policy
              </Label>
            </div>
            
            {!formData.agreedToCancellationPolicy && (
              <p className="text-sm text-muted-foreground">
                Please agree to the cancellation policy to continue.
              </p>
            )}
            
            {formData.agreedToCancellationPolicy && clientSecret && stripePromise && (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <PaymentMethodForm onSuccess={(pmId) => {
                  updateFormData("paymentMethodId", pmId);
                  handleSubmit();
                }} />
              </Elements>
            )}

            {formData.agreedToCancellationPolicy && !clientSecret && fetchSetupIntentMutation.isPending && (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Loading payment form...</p>
              </div>
            )}
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
          
          {step < 4 && (
            <Button
              onClick={() => {
                if (step === 3) {
                  fetchSetupIntentMutation.mutate();
                }
                setStep(step + 1);
              }}
              disabled={
                (step === 1 && !formData.service) ||
                (step === 2 && (!formData.propertySize || !formData.date || !formData.timeSlot)) ||
                (step === 3 && (!formData.name || !formData.email || !formData.phone || !formData.address))
              }
              data-testid="button-next"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
