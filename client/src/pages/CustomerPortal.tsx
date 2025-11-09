import { useState, useMemo } from "react";
import { PromoBanner } from "@/components/PromoBanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Booking, Invoice, RecurringBooking, Review, ContactMessage, Customer } from "@shared/schema";
import { Link } from "wouter";
import { PhotoViewButton } from "@/components/CustomerPhotoViewer";
import { 
  Calendar, Clock, Home, Mail, Phone, MapPin, AlertTriangle, DollarSign, Gift, 
  Share2, Check, Copy, Users, TrendingUp, Bell, Star, MessageSquare, RefreshCw,
  Heart, Award, FileText, CreditCard, Sparkles, Settings, ChevronRight, Package,
  Leaf
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, differenceInDays, parseISO } from "date-fns";

const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  confirmed: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  completed: "bg-green-500/10 text-green-700 dark:text-green-400",
  cancelled: "bg-red-500/10 text-red-700 dark:text-red-400",
};

const feeStatusColors = {
  not_applicable: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  dismissed: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
  charged: "bg-green-500/10 text-green-700 dark:text-green-400",
};

const feeStatusLabels = {
  not_applicable: "No Fee",
  pending: "Fee Pending",
  dismissed: "Fee Waived",
  charged: "Fee Charged",
};

const serviceNames: Record<string, string> = {
  residential: "Residential Cleaning",
  commercial: "Commercial Cleaning",
  deep: "Deep Cleaning",
};

export default function CustomerPortal() {
  const [email, setEmail] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [rebookService, setRebookService] = useState<string | null>(null);
  const [specialRequests, setSpecialRequests] = useState("");
  const [savedAddresses, setSavedAddresses] = useState("");
  const { toast } = useToast();

  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings/customer", searchEmail],
    enabled: !!searchEmail,
  });

  const { data: referralData, isLoading: referralLoading } = useQuery<{
    referralCode: string | null;
    successfulReferrals: number;
    availableCredits: number;
    tierLevel: number;
    nextTierAmount: number;
    referrals: Array<{
      id: string;
      referredCustomerName: string;
      creditAmount: number;
      status: string;
      createdAt: string;
    }>;
  }>({
    queryKey: ["/api/referrals/customer-stats", searchEmail],
    enabled: !!searchEmail,
  });

  const { data: customer } = useQuery<Customer>({
    queryKey: ["/api/customer-portal/customer", searchEmail],
    enabled: !!searchEmail,
  });

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ["/api/customer-portal/invoices", searchEmail],
    enabled: !!searchEmail,
  });

  const { data: recurringBookings = [] } = useQuery<RecurringBooking[]>({
    queryKey: ["/api/customer-portal/recurring-bookings", searchEmail],
    enabled: !!searchEmail,
  });

  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: ["/api/customer-portal/reviews", searchEmail],
    enabled: !!searchEmail,
  });

  const { data: messages = [] } = useQuery<ContactMessage[]>({
    queryKey: ["/api/customer-portal/messages", searchEmail],
    enabled: !!searchEmail,
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: {
      notificationPreferences?: any;
      savedPreferences?: any;
    }) => {
      return await apiRequest(`/api/customer-portal/preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: searchEmail, ...data }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-portal/customer", searchEmail] });
      toast({
        title: "Preferences saved",
        description: "Your preferences have been updated successfully",
      });
    },
  });

  const pauseRecurringMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/customer-portal/recurring-bookings/${id}/pause`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-portal/recurring-bookings", searchEmail] });
      toast({ title: "Subscription paused", description: "Your recurring booking has been paused" });
    },
  });

  const resumeRecurringMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/customer-portal/recurring-bookings/${id}/resume`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-portal/recurring-bookings", searchEmail] });
      toast({ title: "Subscription resumed", description: "Your recurring booking has been resumed" });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchEmail(email);
  };

  const handleCopyReferralCode = () => {
    if (referralData?.referralCode) {
      navigator.clipboard.writeText(referralData.referralCode);
      setCopiedCode(true);
      toast({
        title: "Code copied!",
        description: "Your referral code has been copied to clipboard",
      });
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleShareReferralLink = () => {
    if (referralData?.referralCode) {
      const referralLink = `${window.location.origin}/book?ref=${referralData.referralCode}`;
      navigator.clipboard.writeText(referralLink);
      toast({
        title: "Link copied!",
        description: "Share this link with friends to give them a discount",
      });
    }
  };

  const upcomingBookings = useMemo(() => {
    if (!bookings) return [];
    const today = new Date();
    return bookings
      .filter(b => {
        if (b.status === "cancelled" || b.status === "completed") return false;
        try {
          const bookingDate = parseISO(b.date);
          return bookingDate >= today;
        } catch {
          return false;
        }
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3);
  }, [bookings]);

  const totalCleanings = useMemo(() => {
    return bookings?.filter(b => b.status === "completed").length || 0;
  }, [bookings]);

  const ecoSavings = useMemo(() => {
    const completedBookings = bookings?.filter(b => b.status === "completed").length || 0;
    return {
      waterSaved: completedBookings * 15,
      chemicalsAvoided: completedBookings * 8,
      co2Reduced: completedBookings * 5,
    };
  }, [bookings]);

  const customerSince = useMemo(() => {
    if (!bookings || bookings.length === 0) return null;
    const oldestBooking = bookings.reduce((oldest, current) => {
      return new Date(current.createdAt || current.date) < new Date(oldest.createdAt || oldest.date) ? current : oldest;
    });
    return format(new Date(oldestBooking.createdAt || oldestBooking.date), "MMMM yyyy");
  }, [bookings]);

  const loyaltyPoints = customer?.loyaltyPoints || 0;
  const loyaltyTier = loyaltyPoints >= 500 ? "Platinum" : loyaltyPoints >= 250 ? "Gold" : loyaltyPoints >= 100 ? "Silver" : "Bronze";

  const notificationPreferences = customer?.notificationPreferences || {
    emailBookingConfirmation: true,
    emailReminders: true,
    emailPromotions: true,
    smsReminders: false,
    smsPromotions: false,
  };

  const handleNotificationToggle = (key: string, value: boolean) => {
    updatePreferencesMutation.mutate({
      notificationPreferences: {
        ...notificationPreferences,
        [key]: value,
      },
    });
  };

  const handleSavePreferences = () => {
    updatePreferencesMutation.mutate({
      savedPreferences: {
        specialRequests,
        savedAddresses: savedAddresses.split("\n").filter(a => a.trim()),
      },
    });
  };

  return (
    <>
      <PromoBanner />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Customer Portal</h1>
            <p className="text-muted-foreground">
              Manage your bookings, preferences, and rewards
            </p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Access Your Account</CardTitle>
              <CardDescription>
                Enter your email address to view your customer portal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="email" className="sr-only">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="input-customer-email"
                  />
                </div>
                <Button type="submit" data-testid="button-search-bookings">
                  Access Portal
                </Button>
              </form>
            </CardContent>
          </Card>

          {isLoading && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Loading your account...</p>
            </Card>
          )}

          {searchEmail && !isLoading && (!bookings || bookings.length === 0) && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                No account found for {searchEmail}
              </p>
            </Card>
          )}

          {searchEmail && !isLoading && bookings && bookings.length > 0 && (
            <div className="space-y-6">
              {upcomingBookings.length > 0 && (
                <Card data-testid="card-upcoming-appointments">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <CardTitle>Upcoming Appointments</CardTitle>
                    </div>
                    <CardDescription>Your next scheduled cleanings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {upcomingBookings.map((booking) => {
                        const daysUntil = differenceInDays(parseISO(booking.date), new Date());
                        return (
                          <div
                            key={booking.id}
                            className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                            data-testid={`upcoming-booking-${booking.id}`}
                          >
                            <div className="flex-1">
                              <p className="font-semibold">{serviceNames[booking.service] || booking.service}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(parseISO(booking.date), "EEEE, MMMM d, yyyy")} at {booking.timeSlot}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge variant={daysUntil <= 2 ? "default" : "secondary"}>
                                {daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `In ${daysUntil} days`}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card data-testid="card-service-history">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <CardTitle>Service History</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Cleanings</p>
                        <p className="text-2xl font-bold" data-testid="text-total-cleanings">{totalCleanings}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Customer Since</p>
                        <p className="text-lg font-semibold" data-testid="text-customer-since">{customerSince || "N/A"}</p>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Leaf className="h-4 w-4 text-green-600" />
                        <p className="text-sm font-semibold text-green-600">Eco Impact</p>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Water Saved</span>
                          <span className="font-medium">{ecoSavings.waterSaved}L</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Harsh Chemicals Avoided</span>
                          <span className="font-medium">{ecoSavings.chemicalsAvoided}kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">CO₂ Reduced</span>
                          <span className="font-medium">{ecoSavings.co2Reduced}kg</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-loyalty-program">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" />
                      <CardTitle>Loyalty Rewards</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Your Tier</span>
                        <Badge variant="default" data-testid="badge-loyalty-tier">{loyaltyTier}</Badge>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Total Points</span>
                        <span className="text-2xl font-bold" data-testid="text-loyalty-points">{loyaltyPoints}</span>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-2 text-sm">
                      <p className="font-semibold mb-2">Tier Benefits:</p>
                      <div className="flex items-center gap-2">
                        <Check className={`h-4 w-4 ${loyaltyTier !== "Bronze" ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={loyaltyTier !== "Bronze" ? "" : "text-muted-foreground"}>
                          Silver (100pts): 5% off all services
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className={`h-4 w-4 ${loyaltyPoints >= 250 ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={loyaltyPoints >= 250 ? "" : "text-muted-foreground"}>
                          Gold (250pts): 10% off + priority booking
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className={`h-4 w-4 ${loyaltyPoints >= 500 ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={loyaltyPoints >= 500 ? "" : "text-muted-foreground"}>
                          Platinum (500pts): 15% off + free upgrades
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Earn 10 points per completed service
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="invoices">Invoices</TabsTrigger>
                  <TabsTrigger value="recurring">Subscriptions</TabsTrigger>
                  <TabsTrigger value="preferences">Preferences</TabsTrigger>
                  <TabsTrigger value="support">Support</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  {referralData && referralData.referralCode && (
                    <Card data-testid="card-referral-program">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <Gift className="h-5 w-5 text-primary" />
                          <CardTitle>Referral Program</CardTitle>
                        </div>
                        <CardDescription>
                          Share your code and earn rewards when friends book!
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="bg-primary/5 rounded-lg p-4">
                          <Label className="text-sm text-muted-foreground mb-2 block">
                            Your Referral Code
                          </Label>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-background border rounded-lg px-4 py-3 font-mono text-lg font-bold">
                              {referralData.referralCode}
                            </div>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={handleCopyReferralCode}
                              data-testid="button-copy-referral-code"
                            >
                              {copiedCode ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <Button
                            variant="outline"
                            className="w-full mt-3"
                            onClick={handleShareReferralLink}
                            data-testid="button-share-referral-link"
                          >
                            <Share2 className="h-4 w-4 mr-2" />
                            Share Referral Link
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card>
                            <CardContent className="pt-6">
                              <div className="flex items-center gap-2 mb-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Successful Referrals</span>
                              </div>
                              <p className="text-2xl font-bold" data-testid="text-successful-referrals">
                                {referralData.successfulReferrals}
                              </p>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardContent className="pt-6">
                              <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Current Tier</span>
                              </div>
                              <p className="text-2xl font-bold" data-testid="text-tier-level">
                                Tier {referralData.tierLevel}
                              </p>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardContent className="pt-6">
                              <div className="flex items-center gap-2 mb-2">
                                <Gift className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Available Credits</span>
                              </div>
                              <p className="text-2xl font-bold text-primary" data-testid="text-available-credits">
                                ${(referralData.availableCredits / 100).toFixed(2)}
                              </p>
                            </CardContent>
                          </Card>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Link href="/book">
                        <Button variant="default" className="w-full" data-testid="button-quick-rebook">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Book Another Cleaning
                        </Button>
                      </Link>
                      <Link href="/quote">
                        <Button variant="outline" className="w-full">
                          <FileText className="h-4 w-4 mr-2" />
                          Request Custom Quote
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>

                  {reviews.length > 0 && (
                    <Card data-testid="card-reviews">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <Star className="h-5 w-5 text-primary" />
                          <CardTitle>Your Reviews</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {reviews.map((review) => (
                            <div key={review.id} className="p-4 bg-muted/50 rounded-lg" data-testid={`review-${review.id}`}>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="flex">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-4 w-4 ${i < review.rating ? "fill-yellow-500 text-yellow-500" : "text-gray-300"}`}
                                    />
                                  ))}
                                </div>
                                <Badge variant={review.status === "approved" ? "default" : "secondary"}>
                                  {review.status}
                                </Badge>
                              </div>
                              <p className="text-sm">{review.reviewText}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {format(new Date(review.createdAt), "MMM d, yyyy")}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle>All Bookings ({bookings.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {bookings.slice(0, 5).map((booking) => (
                          <div
                            key={booking.id}
                            className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                            data-testid={`booking-summary-${booking.id}`}
                          >
                            <div className="flex-1">
                              <p className="font-semibold">{serviceNames[booking.service] || booking.service}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(parseISO(booking.date), "MMM d, yyyy")} • {booking.timeSlot}
                              </p>
                            </div>
                            <Badge className={statusColors[booking.status as keyof typeof statusColors]}>
                              {booking.status}
                            </Badge>
                          </div>
                        ))}
                        {bookings.length > 5 && (
                          <p className="text-sm text-center text-muted-foreground">
                            Showing 5 of {bookings.length} bookings
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="invoices">
                  <Card data-testid="card-invoices">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        <CardTitle>Payment History</CardTitle>
                      </div>
                      <CardDescription>View and manage your invoices</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {invoices.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No invoices found</p>
                      ) : (
                        <div className="space-y-3">
                          {invoices.map((invoice) => (
                            <div
                              key={invoice.id}
                              className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                              data-testid={`invoice-${invoice.id}`}
                            >
                              <div className="flex-1">
                                <p className="font-semibold">Invoice #{invoice.invoiceNumber}</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(invoice.createdAt), "MMM d, yyyy")}
                                </p>
                              </div>
                              <div className="text-right flex items-center gap-3">
                                <div>
                                  <p className="font-semibold">${(invoice.amount / 100).toFixed(2)}</p>
                                  <Badge
                                    variant={invoice.status === "paid" ? "default" : "secondary"}
                                    className={invoice.status === "paid" ? "bg-green-500/10 text-green-700" : ""}
                                  >
                                    {invoice.status}
                                  </Badge>
                                </div>
                                {invoice.status !== "paid" && (
                                  <Link href={`/invoice/${invoice.id}`}>
                                    <Button size="sm" data-testid={`button-pay-invoice-${invoice.id}`}>
                                      Pay Now
                                    </Button>
                                  </Link>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="recurring">
                  <Card data-testid="card-recurring-bookings">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        <CardTitle>Active Subscriptions</CardTitle>
                      </div>
                      <CardDescription>Manage your recurring cleaning services</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {recurringBookings.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground mb-4">No active subscriptions</p>
                          <Link href="/book">
                            <Button variant="outline">
                              Set Up Recurring Service
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {recurringBookings.map((recurring) => (
                            <div
                              key={recurring.id}
                              className="p-4 bg-muted/50 rounded-lg space-y-3"
                              data-testid={`recurring-${recurring.id}`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-semibold">{serviceNames[recurring.service] || recurring.service}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Every {recurring.frequency} • Next: {format(parseISO(recurring.nextOccurrence), "MMM d, yyyy")}
                                  </p>
                                </div>
                                <Badge
                                  variant={recurring.status === "active" ? "default" : "secondary"}
                                  data-testid={`badge-recurring-status-${recurring.id}`}
                                >
                                  {recurring.status}
                                </Badge>
                              </div>
                              <div className="flex gap-2">
                                {recurring.status === "active" ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => pauseRecurringMutation.mutate(recurring.id)}
                                    disabled={pauseRecurringMutation.isPending}
                                    data-testid={`button-pause-${recurring.id}`}
                                  >
                                    Pause Subscription
                                  </Button>
                                ) : (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => resumeRecurringMutation.mutate(recurring.id)}
                                    disabled={resumeRecurringMutation.isPending}
                                    data-testid={`button-resume-${recurring.id}`}
                                  >
                                    Resume Subscription
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="preferences" className="space-y-6">
                  <Card data-testid="card-notification-preferences">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-primary" />
                        <CardTitle>Notification Preferences</CardTitle>
                      </div>
                      <CardDescription>Manage how you receive updates from us</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Email - Booking Confirmations</p>
                          <p className="text-sm text-muted-foreground">Receive confirmation emails for new bookings</p>
                        </div>
                        <Switch
                          checked={notificationPreferences.emailBookingConfirmation}
                          onCheckedChange={(checked) => handleNotificationToggle("emailBookingConfirmation", checked)}
                          data-testid="switch-email-confirmations"
                        />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Email - Appointment Reminders</p>
                          <p className="text-sm text-muted-foreground">Get reminded 24 hours before your appointment</p>
                        </div>
                        <Switch
                          checked={notificationPreferences.emailReminders}
                          onCheckedChange={(checked) => handleNotificationToggle("emailReminders", checked)}
                          data-testid="switch-email-reminders"
                        />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Email - Promotions & Updates</p>
                          <p className="text-sm text-muted-foreground">Stay updated on special offers and news</p>
                        </div>
                        <Switch
                          checked={notificationPreferences.emailPromotions}
                          onCheckedChange={(checked) => handleNotificationToggle("emailPromotions", checked)}
                          data-testid="switch-email-promotions"
                        />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">SMS - Appointment Reminders</p>
                          <p className="text-sm text-muted-foreground">Receive text reminders for appointments</p>
                        </div>
                        <Switch
                          checked={notificationPreferences.smsReminders}
                          onCheckedChange={(checked) => handleNotificationToggle("smsReminders", checked)}
                          data-testid="switch-sms-reminders"
                        />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">SMS - Promotions</p>
                          <p className="text-sm text-muted-foreground">Receive promotional text messages</p>
                        </div>
                        <Switch
                          checked={notificationPreferences.smsPromotions}
                          onCheckedChange={(checked) => handleNotificationToggle("smsPromotions", checked)}
                          data-testid="switch-sms-promotions"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card data-testid="card-saved-preferences">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-primary" />
                        <CardTitle>Saved Preferences</CardTitle>
                      </div>
                      <CardDescription>Store your preferences for faster booking</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="special-requests">Special Requests & Notes</Label>
                        <Textarea
                          id="special-requests"
                          placeholder="e.g., Please use fragrance-free products, avoid the master bedroom, etc."
                          value={specialRequests}
                          onChange={(e) => setSpecialRequests(e.target.value)}
                          className="mt-2"
                          rows={3}
                          data-testid="textarea-special-requests"
                        />
                      </div>
                      <div>
                        <Label htmlFor="saved-addresses">Saved Addresses</Label>
                        <Textarea
                          id="saved-addresses"
                          placeholder="Enter addresses (one per line)"
                          value={savedAddresses}
                          onChange={(e) => setSavedAddresses(e.target.value)}
                          className="mt-2"
                          rows={3}
                          data-testid="textarea-saved-addresses"
                        />
                        <p className="text-xs text-muted-foreground mt-1">One address per line</p>
                      </div>
                      <Button
                        onClick={handleSavePreferences}
                        disabled={updatePreferencesMutation.isPending}
                        data-testid="button-save-preferences"
                      >
                        Save Preferences
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="support">
                  <Card data-testid="card-customer-support">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        <CardTitle>Customer Support</CardTitle>
                      </div>
                      <CardDescription>Your message history with our team</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {messages.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground mb-4">No messages yet</p>
                          <Link href="/contact">
                            <Button variant="outline">
                              Contact Us
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {messages.map((message) => (
                            <div
                              key={message.id}
                              className="p-4 bg-muted/50 rounded-lg"
                              data-testid={`message-${message.id}`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <p className="font-semibold">{message.subject || "General Inquiry"}</p>
                                <Badge variant={message.status === "replied" ? "default" : "secondary"}>
                                  {message.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{message.message}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(message.createdAt), "MMM d, yyyy h:mm a")}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
