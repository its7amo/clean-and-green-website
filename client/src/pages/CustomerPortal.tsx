import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Booking } from "@shared/schema";
import { Link } from "wouter";
import { PhotoViewButton } from "@/components/CustomerPhotoViewer";
import { Calendar, Clock, Home, Mail, Phone, MapPin, AlertTriangle, DollarSign, Gift, Share2, Check, Copy, Users, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Customer Portal</h1>
          <p className="text-muted-foreground">
            View and manage your bookings
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Find Your Bookings</CardTitle>
            <CardDescription>
              Enter your email address to view all your bookings
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
                View Bookings
              </Button>
            </form>
          </CardContent>
        </Card>

        {isLoading && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Loading your bookings...</p>
          </Card>
        )}

        {searchEmail && !isLoading && (!bookings || bookings.length === 0) && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              No bookings found for {searchEmail}
            </p>
          </Card>
        )}

        {searchEmail && !isLoading && referralData && referralData.referralCode && (
          <Card className="mb-8" data-testid="card-referral-program">
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

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Tier Rewards
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className={referralData.tierLevel >= 1 ? "text-primary font-medium" : "text-muted-foreground"}>
                      1st referral: $10 for you & your friend
                    </span>
                    {referralData.tierLevel >= 1 && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={referralData.tierLevel >= 2 ? "text-primary font-medium" : "text-muted-foreground"}>
                      2nd referral: $15 for you & your friend
                    </span>
                    {referralData.tierLevel >= 2 && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={referralData.tierLevel >= 3 ? "text-primary font-medium" : "text-muted-foreground"}>
                      3rd+ referrals: $20 for you & your friend
                    </span>
                    {referralData.tierLevel >= 3 && <Check className="h-4 w-4 text-primary" />}
                  </div>
                </div>
              </div>

              {referralData.referrals && referralData.referrals.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Your Referral History</h4>
                  <div className="space-y-2">
                    {referralData.referrals.map((ref) => (
                      <div
                        key={ref.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        data-testid={`referral-${ref.id}`}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">{ref.referredCustomerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(ref.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-primary">
                            +${(ref.creditAmount / 100).toFixed(2)}
                          </p>
                          <Badge
                            className={
                              ref.status === "credited"
                                ? "bg-green-500/10 text-green-700 dark:text-green-400"
                                : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                            }
                          >
                            {ref.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {bookings && bookings.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              Your Bookings ({bookings.length})
            </h2>
            {bookings.map((booking) => (
              <Card key={booking.id} data-testid={`booking-card-${booking.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {serviceNames[booking.service] || booking.service}
                      </CardTitle>
                      <CardDescription>
                        Booking #{booking.id.slice(0, 8)}
                      </CardDescription>
                    </div>
                    <Badge
                      className={
                        statusColors[booking.status as keyof typeof statusColors]
                      }
                    >
                      {booking.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{booking.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{booking.timeSlot}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <span>{booking.propertySize}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{booking.address}</span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold mb-2">Contact Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{booking.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{booking.phone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold mb-2">Before & After Photos</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      View photos of your cleaning service
                    </p>
                    <PhotoViewButton bookingId={booking.id} />
                  </div>

                  {booking.status === "cancelled" && booking.cancellationFeeStatus && booking.cancellationFeeStatus !== "not_applicable" && (
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Cancellation Fee</span>
                        </div>
                        <Badge
                          className={feeStatusColors[booking.cancellationFeeStatus as keyof typeof feeStatusColors]}
                          data-testid={`badge-fee-status-${booking.id}`}
                        >
                          {feeStatusLabels[booking.cancellationFeeStatus as keyof typeof feeStatusLabels]}
                        </Badge>
                      </div>
                      {booking.cancellationFeeStatus === "pending" && (
                        <Alert className="mt-3">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Late Cancellation</AlertTitle>
                          <AlertDescription>
                            Your booking was cancelled less than 24 hours before the scheduled appointment. A $35 cancellation fee is pending review.
                          </AlertDescription>
                        </Alert>
                      )}
                      {booking.cancellationFeeStatus === "charged" && (
                        <p className="text-sm text-muted-foreground mt-2">
                          A $35 late cancellation fee was charged to your payment method on file.
                        </p>
                      )}
                      {booking.cancellationFeeStatus === "dismissed" && (
                        <p className="text-sm text-muted-foreground mt-2">
                          The cancellation fee was waived as a courtesy.
                        </p>
                      )}
                    </div>
                  )}

                  {booking.managementToken && booking.status !== "cancelled" && booking.status !== "completed" && (
                    <div className="border-t pt-4">
                      <Link href={`/manage-booking/${booking.managementToken}`}>
                        <Button variant="outline" className="w-full" data-testid={`button-manage-${booking.id}`}>
                          Manage This Booking
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
