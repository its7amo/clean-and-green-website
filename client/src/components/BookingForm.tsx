import { useState, useReducer, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check, AlertTriangle, MapPin, Loader2, Clock, Home, Building2, Zap, Shield, Star, Gift } from "lucide-react";
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
import { useDebounce } from "@/hooks/use-debounce";

const timeSlots = ["8:00 AM", "10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM"];

const propertySizes = [
  { value: "Small (< 1000 sq ft)", label: "Small", icon: Home, description: "< 1,000 sq ft" },
  { value: "Medium (1000-2000 sq ft)", label: "Medium", icon: Building2, description: "1,000-2,000 sq ft" },
  { value: "Large (2000-3000 sq ft)", label: "Large", icon: Building2, description: "2,000-3,000 sq ft" },
  { value: "Extra Large (> 3000 sq ft)", label: "Extra Large", icon: Building2, description: "> 3,000 sq ft" }
];

const initialState = {
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
};

type FormState = typeof initialState;

type FormAction =
  | { type: 'UPDATE_FIELD'; field: keyof FormState; value: any }
  | { type: 'SET_PROMO'; id: string | null; discount: number }
  | { type: 'SET_REFERRAL'; valid: boolean; name: string; discount: number }
  | { type: 'RESET' };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'UPDATE_FIELD':
      // When date changes, reset the time slot
      if (action.field === 'date') {
        return { ...state, date: action.value, timeSlot: "" };
      }
      return { ...state, [action.field]: action.value };
    case 'SET_PROMO':
      return { ...state, promoCodeId: action.id, promoCodeDiscount: action.discount };
    case 'SET_REFERRAL':
      return {
        ...state,
        referralCodeValid: action.valid,
        referralReferrerName: action.name,
        referralDiscountAmount: action.discount,
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

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
        size="lg"
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
  const [state, dispatch] = useReducer(formReducer, initialState);
  const { formData } = { formData: state }; // Keep formData for easier refactoring

  const debouncedAddress = useDebounce(formData.address, 500);

  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: settings } = useQuery<BusinessSettings>({
    queryKey: ["/api/settings"],
  });

  const { data: referralSettings } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/public/referral-settings"],
  });

  const { data: serviceAreas = [] } = useQuery<ServiceArea[]>({
    queryKey: ["/api/service-areas"],
  });

  const { data: availability, isLoading: loadingSlots } = useQuery<{
    slots: Array<{ timeSlot: string; available: number; capacity: number }>;
  }>({
    queryKey: ["/api/available-slots", formData.date ? format(formData.date, "yyyy-MM-dd") : ""],
    enabled: !!formData.date,
  });

  useEffect(() => {
    const zip = extractZipCode(debouncedAddress);
    if (zip && zip.length === 5) {
      checkZipCodeMutation.mutate(zip);
    } else {
      setZipCodeValid(null);
    }
  }, [debouncedAddress]);

  useEffect(() => {
    // When the user reaches the payment step, fetch a new SetupIntent client secret
    if (step === 4) {
      fetchSetupIntentMutation.mutate();
    }
  }, [step]);

  const getYesterdayMidnight = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);
    return yesterday;
  };
  
  const updateFormData = (field: keyof FormState, value: any) => {
    dispatch({ type: 'UPDATE_FIELD', field, value });
  };

  const createBookingMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/bookings", data);
      if (!res.ok) {
        const error = await res.json();
        throw error;
      }
      return await res.json();
    },
    onSuccess: () => {
      setBookingSubmitted(true);
      dispatch({ type: 'RESET' });
      toast({
        title: "Booking Confirmed!",
        description: "We've received your booking request. We'll contact you shortly to confirm.",
      });
      setTimeout(() => {
        setLocation("/");
      }, 3000);
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "There was an error submitting your booking. Please try again.";
      toast({
        title: "Booking Failed",
        description: errorMessage,
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
    onSuccess: (data: { valid: boolean; promoCode?: any; discountAmount?: number }) => {
      if (data.valid && data.promoCode) {
        dispatch({ type: 'SET_PROMO', id: data.promoCode.id, discount: data.discountAmount || 0 });
        toast({
          title: "Promo Code Applied",
          description: `You'll receive $${((data.discountAmount || 0) / 100).toFixed(2)} off!`,
        });
      } else {
        // Use a more specific error from the server if available
        throw new Error((data as any).message || "Invalid promo code");
      }
    },
    onError: () => {
      updateFormData("promoCodeId", null);
      updateFormData("promoCodeDiscount", 0);
      toast({
        title: "Invalid Promo Code",
        description: "The code you entered is not valid or has expired.",
        variant: "destructive",
      });
    },
  });

  const validateReferralCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch(`/api/public/referral-codes/validate/${code}`);
      if (!res.ok) throw new Error("Invalid referral code");
      return await res.json();
    },
    onSuccess: (data: { valid: boolean; referrerName: string; discountAmount: number }) => {
      dispatch({ type: 'SET_REFERRAL', valid: data.valid, name: data.referrerName, discount: data.discountAmount });
      toast({
        title: "Referral Code Applied",
        description: `You'll receive $${(data.discountAmount / 100).toFixed(2)} off from ${data.referrerName}!`,
      });
    },
    onError: () => {
      dispatch({ type: 'SET_REFERRAL', valid: false, name: "", discount: 0 });
      toast({
        title: "Invalid Referral Code",
        description: "The referral code you entered is not valid.",
        variant: "destructive",
      });
    },
  });

  const extractZipCode = (address: string): string => {
    const zipMatch = address.match(/\b\d{5}\b/);
    return zipMatch ? zipMatch[0] : "";
  };

  const handleSubmit = () => {
    if (!formData.paymentMethodId) {
      return;
    }

    const bookingData = {
      service: formData.service,
      propertySize: formData.propertySize,
      date: formData.date,
      timeSlot: formData.timeSlot,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      paymentMethodId: formData.paymentMethodId,
      promoCodeId: formData.promoCodeId,
      referralCode: formData.referralCodeValid ? formData.referralCode : null,
      isRecurring: formData.isRecurring,
      recurringFrequency: formData.isRecurring ? formData.recurringFrequency : null,
      recurringEndDate: formData.isRecurring ? formData.recurringEndDate : null,
    };

    createBookingMutation.mutate(bookingData);
  };

  if (bookingSubmitted) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <Card className="p-12 max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Booking Confirmed!</h2>
          <p className="text-muted-foreground mb-6">
            Thank you for choosing Clean and Green. We've received your booking request and will contact you shortly to confirm the details.
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-center gap-2 text-primary">
              <Check className="h-4 w-4" />
              <span>Confirmation email sent</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-primary">
              <Check className="h-4 w-4" />
              <span>Payment method saved</span>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const steps = [
    { number: 1, title: "Service", icon: Sparkles },
    { number: 2, title: "Schedule", icon: CalendarIcon },
    { number: 3, title: "Details", icon: Shield },
    { number: 4, title: "Payment", icon: Check },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      {/* Trust Banner */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-3">Book Your Cleaning Service</h1>
        <p className="text-muted-foreground mb-4">Fast, eco-friendly, and trusted by 500+ Oklahoma families</p>
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <span className="text-muted-foreground">5.0 Rating</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Insured & Bonded</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Eco-Friendly Products</span>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="mb-12">
        <div className="flex items-center justify-between relative">
          {/* Progress Line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-border -z-10" data-testid="progress-line-bg">
            <div 
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${((step - 1) / 3) * 100}%` }}
            />
          </div>
          
          {steps.map((s, index) => {
            const Icon = s.icon;
            const isActive = step === s.number;
            const isCompleted = step > s.number;
            
            return (
              <div key={s.number} className="flex flex-col items-center gap-2 flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isCompleted 
                      ? "bg-primary text-primary-foreground" 
                      : isActive 
                      ? "bg-primary text-primary-foreground shadow-lg scale-110" 
                      : "bg-muted text-muted-foreground"
                  }`}
                  data-testid={`step-indicator-${s.number}`}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span className={`text-xs md:text-sm font-medium hidden md:block ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <Card className="p-6 md:p-8 lg:p-12">
        {step === 1 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">Choose Your Service</h2>
              <p className="text-muted-foreground">Select the cleaning service that fits your needs</p>
            </div>
            
            {servicesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-6">
                    <Skeleton className="h-12 w-12 mx-auto mb-4 rounded-lg" />
                    <Skeleton className="h-6 w-32 mx-auto mb-2" />
                    <Skeleton className="h-4 w-24 mx-auto" />
                  </Card>
                ))}
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No services available. Please check back later.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((service) => {
                  const isSelected = formData.service === service.name;
                  return (
                    <button
                      key={service.id}
                      onClick={() => updateFormData("service", service.name)}
                      className={`relative p-6 rounded-xl border-2 transition-all text-left hover-elevate ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-border"
                      }`}
                      data-testid={`button-service-${service.name}`}
                    >
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                        <Sparkles className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-semibold text-lg mb-1">{service.name}</h3>
                      <p className="text-sm text-primary font-semibold">From ${(service.basePrice / 100).toFixed(2)}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">Schedule & Details</h2>
              <p className="text-muted-foreground">Pick your preferred date, time, and property size</p>
            </div>
            
            <div className="space-y-6">
              <div>
                <Label className="text-base font-semibold mb-4 block">Property Size</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {propertySizes.map((size) => {
                    const Icon = size.icon;
                    const isSelected = formData.propertySize === size.value;
                    return (
                      <button
                        key={size.value}
                        onClick={() => updateFormData("propertySize", size.value)}
                        className={`p-4 rounded-xl border-2 transition-all hover-elevate ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                        data-testid={`button-size-${size.label}`}
                      >
                        <Icon className={`h-6 w-6 mx-auto mb-2 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="text-sm font-semibold mb-0.5">{size.label}</div>
                        <div className="text-xs text-muted-foreground">{size.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-base font-semibold mb-3 block">Preferred Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full justify-start text-left font-normal"
                        data-testid="button-date-picker"
                      >
                        <CalendarIcon className="mr-3 h-5 w-5" />
                        {formData.date ? format(formData.date, "PPP") : "Select a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.date}
                        onSelect={(date) => updateFormData("date", date)}
                        disabled={(date) => date <= getYesterdayMidnight()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5" data-testid="text-min-lead-info">
                    <Clock className="h-3 w-3" />
                    Book at least {settings?.minLeadHours || 12} hours in advance
                  </p> 
                </div>

                <div>
                  <Label className="text-base font-semibold mb-3 block">Preferred Time</Label>
                  {loadingSlots && formData.date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 mb-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Checking availability...</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {timeSlots.map((time, index) => {
                      const slotAvailability = availability?.slots?.find(
                        (slot) => slot.timeSlot === time
                      );
                      const isFullyBooked = slotAvailability ? slotAvailability.available === 0 : false;
                      const showAvailability = formData.date && slotAvailability;
                      const isSelected = formData.timeSlot === time;

                      return (
                        <div key={time} className="relative">
                          <button
                            onClick={() => !isFullyBooked && updateFormData("timeSlot", time)}
                            disabled={isFullyBooked}
                            className={`w-full p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                              isFullyBooked
                                ? "border-border bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                                : isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border hover-elevate"
                            }`}
                            data-testid={`button-time-${time}`}
                          >
                            {time}
                          </button>
                          {showAvailability && (
                            <p
                              className={`text-xs text-center mt-1 ${
                                isFullyBooked
                                  ? "text-destructive font-medium"
                                  : slotAvailability.available <= 1
                                  ? "text-orange-600 font-medium"
                                  : "text-muted-foreground"
                              }`}
                              data-testid={`text-availability-${index}`}
                            >
                              {isFullyBooked
                                ? "Fully booked"
                                : `${slotAvailability.available}/${slotAvailability.capacity} spots left`}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="flex items-start space-x-3 mb-4">
                  <Checkbox
                    id="recurring"
                    checked={formData.isRecurring}
                    onCheckedChange={(checked) => updateFormData("isRecurring", checked)}
                    data-testid="checkbox-recurring"
                    className="mt-0.5"
                  />
                  <div>
                    <Label htmlFor="recurring" className="cursor-pointer font-semibold text-base">
                      Make this a recurring service
                    </Label>
                    <p className="text-sm text-muted-foreground mt-0.5">Save time with automatic rebooking</p>
                  </div>
                </div>

                {formData.isRecurring && (
                  <div className="space-y-6 pl-8 border-l-2 border-primary/30 ml-2">
                    <div>
                      <Label className="text-sm font-semibold mb-3 block">Frequency</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: "weekly", label: "Weekly" },
                          { value: "biweekly", label: "Bi-weekly" },
                          { value: "monthly", label: "Monthly" }
                        ].map((freq) => (
                          <button
                            key={freq.value}
                            onClick={() => updateFormData("recurringFrequency", freq.value)}
                            className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                              formData.recurringFrequency === freq.value
                                ? "border-primary bg-primary/5"
                                : "border-border hover-elevate"
                            }`}
                            data-testid={`button-frequency-${freq.value}`}
                          >
                            {freq.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-semibold mb-2 block">End Date (Optional)</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Leave blank for ongoing service
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

                    <div className="bg-primary/5 rounded-lg p-4">
                      <p className="text-sm font-semibold mb-2">Your schedule:</p>
                      <p className="text-sm text-muted-foreground">
                        {formData.recurringFrequency === "weekly" ? "Every week" : formData.recurringFrequency === "biweekly" ? "Every 2 weeks" : "Every month"}
                        {formData.date ? ` starting ${format(formData.date, "PPP")}` : ""}
                        {formData.recurringEndDate ? ` until ${format(formData.recurringEndDate, "PPP")}` : ""}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">Your Information</h2>
              <p className="text-muted-foreground">Let us know where to reach you</p>
            </div>
            
            {serviceAreas.length > 0 && (
              <Alert className="border-primary/20 bg-primary/5">
                <MapPin className="h-4 w-4 text-primary" />
                <AlertDescription>
                  <span className="font-semibold">Service Areas: </span>
                  {serviceAreas.filter(area => area.isActive).map(area => area.name).join(", ")}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold">Full Name</Label>
                <Input
                  id="name"
                  size-variant="lg"
                  value={formData.name}
                  onChange={(e) => updateFormData("name", e.target.value)}
                  placeholder="John Doe"
                  data-testid="input-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
                <Input
                  id="email"
                  type="email"
                  size-variant="lg"
                  value={formData.email}
                  onChange={(e) => updateFormData("email", e.target.value)}
                  placeholder="john@example.com"
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  size-variant="lg"
                  value={formData.phone}
                  onChange={(e) => updateFormData("phone", e.target.value)}
                  placeholder="(405) 555-0123"
                  data-testid="input-phone"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address" className="text-sm font-semibold">Service Address</Label>
                <Input
                  id="address"
                  size-variant="lg"
                  value={formData.address}
                  onChange={(e) => updateFormData("address", e.target.value)}
                  placeholder="123 Main St, Oklahoma City, OK 73102"
                  className={zipCodeValid === false ? "border-destructive" : ""}
                  data-testid="input-address"
                />
                {debouncedAddress && zipCodeValid === false && (
                  <Alert variant="destructive" data-testid="alert-zip-not-served">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Zip code {extractZipCode(debouncedAddress)} is not in our service area. We may not be able to fulfill your request.
                    </AlertDescription>
                  </Alert>
                )}
                {debouncedAddress && zipCodeValid === true && (
                  <p className="text-sm text-primary flex items-center gap-1.5" data-testid="text-zip-valid">
                    <Check className="h-4 w-4" />
                    Great! We serve your area
                  </p>
                )}
              </div>
            </div>

            <div className="border-t pt-6 space-y-6">
              <div>
                <Label htmlFor="promo-code" className="text-sm font-semibold mb-3 block">Promo Code (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="promo-code"
                    value={formData.promoCode}
                    onChange={(e) => updateFormData("promoCode", e.target.value.toUpperCase())}
                    placeholder="SAVE10"
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
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="default" className="gap-1">
                      <Check className="h-3 w-3" />
                      Promo applied
                    </Badge>
                  </div>
                )}
              </div>

              {referralSettings?.enabled && (
                <div>
                  <Label htmlFor="referral-code" className="text-sm font-semibold mb-3 block flex items-center gap-2"><Gift className="h-4 w-4 text-primary"/>Referral Code (Optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="referral-code"
                      value={formData.referralCode}
                      onChange={(e) => updateFormData("referralCode", e.target.value.toUpperCase())}
                      placeholder="FRIEND123"
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
                    <div className="bg-primary/5 rounded-lg p-4 mt-3 space-y-1" data-testid="alert-referral-applied">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="gap-1">
                          <Check className="h-3 w-3" />
                          Referral applied
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Referred by <span className="font-semibold text-foreground">{formData.referralReferrerName}</span>
                      </p>
                      <p className="text-sm font-semibold text-primary">
                        Save ${(formData.referralDiscountAmount / 100).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">Payment & Policy</h2>
              <p className="text-muted-foreground">Secure your booking with a payment method</p>
            </div>
            
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                We require a payment method to hold your booking. You won't be charged now, but this card will be used if cancellation fees apply.
              </AlertDescription>
            </Alert>
            
            {settings?.cancellationPolicy && (
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  Cancellation Policy
                </h3>
                <p className="text-sm leading-relaxed">{settings.cancellationPolicy}</p>
              </div>
            )}
            
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="agree-policy"
                checked={formData.agreedToCancellationPolicy}
                onCheckedChange={(checked) => updateFormData("agreedToCancellationPolicy", checked)}
                data-testid="checkbox-policy"
                className="mt-0.5"
              />
              <Label htmlFor="agree-policy" className="cursor-pointer text-sm leading-relaxed">
                I have read and agree to the cancellation policy
              </Label>
            </div>
            
            {formData.agreedToCancellationPolicy && clientSecret && stripePromise && (
              <div className="border-t pt-6">
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <PaymentMethodForm onSuccess={(pmId) => {
                    updateFormData("paymentMethodId", pmId);
                    handleSubmit();
                  }} />
                </Elements>
              </div>
            )}

            {formData.agreedToCancellationPolicy && !clientSecret && fetchSetupIntentMutation.isPending && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                <p className="text-muted-foreground">Loading payment form...</p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between items-center mt-12 pt-8 border-t gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
            data-testid="button-back"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          {step < 4 && (
            <Button
              size="lg"
              onClick={() => {
                setStep(step + 1);
              }}
              disabled={
                (step === 1 && !formData.service) ||
                (step === 2 && (!formData.propertySize || !formData.date || !formData.timeSlot)) ||
                (step === 3 && (!formData.name || !formData.email || !formData.phone || !formData.address))
              }
              data-testid="button-next"
            >
              Continue
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
