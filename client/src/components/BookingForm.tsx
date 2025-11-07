import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check, AlertTriangle, MapPin } from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { Service, BusinessSettings, ServiceArea } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [zipCodeValid, setZipCodeValid] = useState<boolean | null>(null);
  const [extractedZipCode, setExtractedZipCode] = useState<string>("");
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
    promoCode: "",
    promoCodeId: null as string | null,
    promoCodeDiscount: 0,
    referralCode: "",
    referralCodeValid: false,
    referralReferrerName: "",
    referralDiscountAmount: 0,
    isRecurring: false,
    recurringFrequency: "weekly" as "weekly" | "biweekly" | "monthly",
    recurringEndDate: undefined as Date | undefined,
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: settings } = useQuery<BusinessSettings>({
    queryKey: ["/api/settings"],
  });

  const { data: serviceAreas = [] } = useQuery<ServiceArea[]>({
    queryKey: ["/api/service-areas"],
  });

  const extractZipCode = (address: string): string => {
    const zipMatch = address.match(/\b\d{5}\b/);
    return zipMatch ? zipMatch[0] : "";
  };

  const updateFormData = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    
    if (field === "address") {
      const zip = extractZipCode(value);
      setExtractedZipCode(zip);
      if (zip && zip.length === 5) {
        checkZipCodeMutation.mutate(zip);
      } else {
        setZipCodeValid(null);
      }
    }
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

  const checkZipCodeMutation = useMutation({
    mutationFn: async (zipCode: string) => {
      const res = await fetch(`/api/service-areas/check/${zipCode}`);
      return await res.json();
    },
    onSuccess: (data: { served: boolean }) => {
      setZipCodeValid(data.served);
    },
    onError: () => {
      setZipCodeValid(null);
    },
  });

  const validatePromoCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/promo-codes/validate", { code });
      return await res.json();
    },
    onSuccess: (data: any) => {
      if (data.valid) {
        updateFormData("promoCodeId", data.promoCode.id);
        updateFormData("promoCodeDiscount", data.discountAmount || 0);
        toast({
          title: "Promo code applied!",
          description: `You'll save ${data.promoCode.discountType === "percentage" ? `${data.promoCode.discountValue}%` : `$${(data.promoCode.discountValue / 100).toFixed(2)}`}`,
        });
      } else {
        updateFormData("promoCodeId", null);
        updateFormData("promoCodeDiscount", 0);
        toast({
          title: "Invalid promo code",
          description: data.message || "This promo code is not valid",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      updateFormData("promoCodeId", null);
      updateFormData("promoCodeDiscount", 0);
      toast({
        title: "Error",
        description: "Failed to validate promo code",
        variant: "destructive",
      });
    },
  });

  const validateReferralCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/referrals/validate", { code });
      return await res.json();
    },
    onSuccess: (data: any) => {
      if (data.valid) {
        updateFormData("referralCodeValid", true);
        updateFormData("referralReferrerName", data.referrerName);
        updateFormData("referralDiscountAmount", data.discountAmount);
        toast({
          title: "Referral code applied!",
          description: `You'll save $${(data.discountAmount / 100).toFixed(2)} thanks to ${data.referrerName}!`,
        });
      } else {
        updateFormData("referralCodeValid", false);
        updateFormData("referralReferrerName", "");
        updateFormData("referralDiscountAmount", 0);
        toast({
          title: "Invalid referral code",
          description: data.message || "This referral code is not valid",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      updateFormData("referralCodeValid", false);
      updateFormData("referralReferrerName", "");
      updateFormData("referralDiscountAmount", 0);
      toast({
        title: "Error",
        description: "Failed to validate referral code",
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
      paymentMethodId: formData.paymentMethodId,
      promoCodeId: formData.promoCodeId,
      discountAmount: formData.promoCodeDiscount,
      referralCode: formData.referralCodeValid ? formData.referralCode : undefined,
      isRecurring: formData.isRecurring,
      recurringFrequency: formData.isRecurring ? formData.recurringFrequency : undefined,
      recurringEndDate: formData.isRecurring && formData.recurringEndDate ? format(formData.recurringEndDate, "yyyy-MM-dd") : undefined,
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
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center text-sm sm:text-base font-semibold ${
                  step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
                data-testid={`step-indicator-${s}`}
              >
                {step > s ? <Check className="h-4 w-4 sm:h-5 sm:w-5" /> : s}
              </div>
              {s < 4 && (
                <div
                  className={`flex-1 h-0.5 sm:h-1 mx-1 sm:mx-2 ${step > s ? "bg-primary" : "bg-muted"}`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs sm:text-sm px-1">
          <span className={step >= 1 ? "text-foreground font-medium" : "text-muted-foreground"}>Service</span>
          <span className={step >= 2 ? "text-foreground font-medium" : "text-muted-foreground"}>Details</span>
          <span className={step >= 3 ? "text-foreground font-medium" : "text-muted-foreground"}>Contact</span>
          <span className={step >= 4 ? "text-foreground font-medium" : "text-muted-foreground"}>Payment</span>
        </div>
      </div>

      <Card className="p-4 sm:p-6 md:p-8">
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

            <div className="border-t pt-6 mt-6">
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  id="recurring"
                  checked={formData.isRecurring}
                  onCheckedChange={(checked) => updateFormData("isRecurring", checked)}
                  data-testid="checkbox-recurring"
                />
                <Label htmlFor="recurring" className="cursor-pointer font-medium">
                  Make this a recurring booking
                </Label>
              </div>

              {formData.isRecurring && (
                <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <RadioGroup 
                      value={formData.recurringFrequency} 
                      onValueChange={(value) => updateFormData("recurringFrequency", value as "weekly" | "biweekly" | "monthly")}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="weekly" id="weekly" data-testid="radio-frequency-weekly" />
                        <Label htmlFor="weekly" className="cursor-pointer">Weekly</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="biweekly" id="biweekly" data-testid="radio-frequency-biweekly" />
                        <Label htmlFor="biweekly" className="cursor-pointer">Bi-weekly (Every 2 weeks)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="monthly" id="monthly" data-testid="radio-frequency-monthly" />
                        <Label htmlFor="monthly" className="cursor-pointer">Monthly</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label>End Date (Optional)</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Leave blank for ongoing service, or select when to stop recurring bookings
                    </p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          data-testid="button-recurring-end-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.recurringEndDate ? format(formData.recurringEndDate, "PPP") : "No end date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.recurringEndDate}
                          onSelect={(date) => updateFormData("recurringEndDate", date)}
                          disabled={(date) => date < (formData.date || new Date())}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="bg-primary/5 rounded-lg p-4 text-sm">
                    <p className="font-medium text-foreground mb-1">
                      Your recurring schedule:
                    </p>
                    <p className="text-muted-foreground">
                      Service will be scheduled {formData.recurringFrequency === "weekly" ? "every week" : formData.recurringFrequency === "biweekly" ? "every 2 weeks" : "every month"} 
                      {formData.date ? ` starting ${format(formData.date, "PPP")}` : ""}
                      {formData.recurringEndDate ? ` until ${format(formData.recurringEndDate, "PPP")}` : " with no end date"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Contact Information</h2>
            
            {serviceAreas.length > 0 && (
              <div className="bg-primary/5 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-1">We serve these areas:</p>
                    <p className="text-sm text-muted-foreground">
                      {serviceAreas.filter(area => area.isActive).map(area => area.name).join(", ")}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
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
                  placeholder="123 Main St, City, State 73102"
                  className={zipCodeValid === false ? "border-destructive" : ""}
                  data-testid="input-address"
                />
                {extractedZipCode && zipCodeValid === false && (
                  <Alert variant="destructive" data-testid="alert-zip-not-served">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Zip code {extractedZipCode} is not in our service area. We may not be able to fulfill your booking request.
                    </AlertDescription>
                  </Alert>
                )}
                {extractedZipCode && zipCodeValid === true && (
                  <p className="text-sm text-primary flex items-center gap-1" data-testid="text-zip-valid">
                    <Check className="h-3 w-3" />
                    We serve your area!
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="promo-code">Promo Code (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="promo-code"
                    value={formData.promoCode}
                    onChange={(e) => updateFormData("promoCode", e.target.value.toUpperCase())}
                    placeholder="Enter promo code"
                    data-testid="input-promo-code"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => validatePromoCodeMutation.mutate(formData.promoCode)}
                    disabled={!formData.promoCode || validatePromoCodeMutation.isPending}
                    data-testid="button-apply-promo"
                  >
                    {validatePromoCodeMutation.isPending ? "Checking..." : "Apply"}
                  </Button>
                </div>
                {formData.promoCodeId && (
                  <p className="text-sm text-primary font-medium" data-testid="text-promo-applied">
                    ✓ Promo code applied
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="referral-code">Referral Code (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="referral-code"
                    value={formData.referralCode}
                    onChange={(e) => updateFormData("referralCode", e.target.value.toUpperCase())}
                    placeholder="Enter referral code"
                    data-testid="input-referral-code"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => validateReferralCodeMutation.mutate(formData.referralCode)}
                    disabled={!formData.referralCode || validateReferralCodeMutation.isPending}
                    data-testid="button-apply-referral"
                  >
                    {validateReferralCodeMutation.isPending ? "Checking..." : "Apply"}
                  </Button>
                </div>
                {formData.referralCodeValid && formData.referralReferrerName && (
                  <div className="bg-primary/5 rounded-lg p-3 space-y-1" data-testid="alert-referral-applied">
                    <p className="text-sm text-primary font-medium flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Referral code applied!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Referred by: <span className="font-medium text-foreground">{formData.referralReferrerName}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Discount: <span className="font-medium text-primary">${(formData.referralDiscountAmount / 100).toFixed(2)}</span>
                    </p>
                  </div>
                )}
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
