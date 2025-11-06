import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Calendar, Users, TrendingUp } from "lucide-react";
import type { Booking, Invoice } from "@shared/schema";

export default function AdminAnalytics() {
  const { data: bookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  if (bookingsLoading || invoicesLoading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Analytics</h1>
        <div className="text-center py-8">Loading analytics...</div>
      </div>
    );
  }

  // Calculate metrics
  const totalRevenue = (invoices || [])
    .filter(inv => inv.status === "paid")
    .reduce((sum, inv) => sum + inv.total, 0);

  const totalBookings = bookings?.length || 0;
  
  const completedBookings = (bookings || []).filter(
    b => b.status === "completed"
  ).length;

  const confirmedBookings = (bookings || []).filter(
    b => b.status === "confirmed"
  ).length;

  // Service breakdown
  const serviceStats = (bookings || []).reduce((acc: Record<string, number>, booking) => {
    acc[booking.service] = (acc[booking.service] || 0) + 1;
    return acc;
  }, {});

  const topServices = Object.entries(serviceStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Recent revenue trend (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentRevenue = (invoices || [])
    .filter(inv => inv.status === "paid" && new Date(inv.createdAt) > thirtyDaysAgo)
    .reduce((sum, inv) => sum + inv.total, 0);

  const recentBookings = (bookings || []).filter(
    b => new Date(b.createdAt) > thirtyDaysAgo
  ).length;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Analytics Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card data-testid="card-total-revenue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-revenue">
              ${(totalRevenue / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              ${(recentRevenue / 100).toFixed(2)} in last 30 days
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-bookings">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-bookings">
              {totalBookings}
            </div>
            <p className="text-xs text-muted-foreground">
              {recentBookings} in last 30 days
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-completed-bookings">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Bookings</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-completed-bookings">
              {completedBookings}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalBookings > 0 ? ((completedBookings / totalBookings) * 100).toFixed(1) : 0}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-confirmed-bookings">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed Bookings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-confirmed-bookings">
              {confirmedBookings}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting service
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Services</CardTitle>
          </CardHeader>
          <CardContent>
            {topServices.length > 0 ? (
              <div className="space-y-4">
                {topServices.map(([service, count], index) => (
                  <div key={service} className="flex items-center justify-between" data-testid={`service-${index}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="font-medium">{service}</span>
                    </div>
                    <span className="text-muted-foreground">{count} bookings</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No bookings yet
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Paid Invoices</span>
                <span className="text-sm text-muted-foreground">
                  {(invoices || []).filter(inv => inv.status === "paid").length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Pending Invoices</span>
                <span className="text-sm text-muted-foreground">
                  {(invoices || []).filter(inv => inv.status === "sent").length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Average Invoice</span>
                <span className="text-sm text-muted-foreground">
                  ${invoices && invoices.length > 0
                    ? ((totalRevenue / invoices.length) / 100).toFixed(2)
                    : "0.00"}
                </span>
              </div>
              <div className="flex items-center justify-between pt-4 border-t">
                <span className="font-bold">Total Revenue</span>
                <span className="font-bold text-primary">
                  ${(totalRevenue / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
