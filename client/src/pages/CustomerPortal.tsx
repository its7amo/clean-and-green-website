import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Booking } from "@shared/schema";
import { Link } from "wouter";
import { Calendar, Clock, Home, Mail, Phone, MapPin } from "lucide-react";

const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  confirmed: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  completed: "bg-green-500/10 text-green-700 dark:text-green-400",
  cancelled: "bg-red-500/10 text-red-700 dark:text-red-400",
};

const serviceNames: Record<string, string> = {
  residential: "Residential Cleaning",
  commercial: "Commercial Cleaning",
  deep: "Deep Cleaning",
};

export default function CustomerPortal() {
  const [email, setEmail] = useState("");
  const [searchEmail, setSearchEmail] = useState("");

  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings/customer", searchEmail],
    enabled: !!searchEmail,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchEmail(email);
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
