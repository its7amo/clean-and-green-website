import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Calendar, Users, TrendingUp, ExternalLink } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface AnalyticsMetrics {
  totalRevenue: number;
  avgBookingValue: number;
  totalCustomers: number;
  totalBookings: number;
}

interface RevenueTrend {
  date: string;
  revenue: number;
}

interface BookingStats {
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
}

interface TopService {
  service: string;
  revenue: number;
  count: number;
}

interface CustomerAcquisition {
  month: string;
  count: number;
}

interface TopCustomer {
  id: string;
  name: string;
  email: string;
  lifetimeRevenue: number;
  totalBookings: number;
}

const COLORS = {
  pending: "hsl(var(--chart-1))",
  confirmed: "hsl(var(--chart-2))",
  completed: "hsl(var(--chart-3))",
  cancelled: "hsl(var(--chart-4))",
};

const TIME_PERIODS = [
  { label: "7 Days", value: "7" },
  { label: "30 Days", value: "30" },
  { label: "90 Days", value: "90" },
  { label: "1 Year", value: "365" },
];

export default function AdminAnalytics() {
  const [revenuePeriod, setRevenuePeriod] = useState("30");

  const { data: metrics, isLoading: metricsLoading } = useQuery<AnalyticsMetrics>({
    queryKey: ["/api/analytics/metrics"],
  });

  const { data: revenueTrends, isLoading: trendsLoading } = useQuery<RevenueTrend[]>({
    queryKey: ["/api/analytics/revenue-trends", { period: revenuePeriod }],
  });

  const { data: bookingStats, isLoading: statsLoading } = useQuery<BookingStats>({
    queryKey: ["/api/analytics/booking-stats"],
  });

  const { data: topServices, isLoading: servicesLoading } = useQuery<TopService[]>({
    queryKey: ["/api/analytics/top-services"],
  });

  const { data: customerAcquisition, isLoading: acquisitionLoading } = useQuery<CustomerAcquisition[]>({
    queryKey: ["/api/analytics/customer-acquisition"],
  });

  const { data: topCustomers, isLoading: topCustomersLoading } = useQuery<TopCustomer[]>({
    queryKey: ["/api/analytics/top-customers", { limit: 10 }],
  });

  const isLoading = metricsLoading || trendsLoading || statsLoading || servicesLoading || acquisitionLoading || topCustomersLoading;

  // Transform booking stats for pie chart
  const bookingStatsData = bookingStats ? [
    { name: "Pending", value: bookingStats.pending, color: COLORS.pending },
    { name: "Confirmed", value: bookingStats.confirmed, color: COLORS.confirmed },
    { name: "Completed", value: bookingStats.completed, color: COLORS.completed },
    { name: "Cancelled", value: bookingStats.cancelled, color: COLORS.cancelled },
  ].filter(item => item.value > 0) : [];

  // Format revenue data for chart
  const revenueChartData = (revenueTrends || []).map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: item.revenue / 100, // Convert cents to dollars
  }));

  // Format top services for bar chart
  const topServicesData = (topServices || []).map(item => ({
    service: item.service.length > 20 ? item.service.substring(0, 20) + "..." : item.service,
    revenue: item.revenue / 100, // Convert cents to dollars
    count: item.count,
  }));

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2" data-testid="heading-analytics">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Comprehensive insights into your business performance
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="heading-analytics">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your business performance
          </p>
        </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card data-testid="card-total-revenue">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-revenue">
              ${((metrics?.totalRevenue || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From paid invoices
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-booking-value">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Booking Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-booking-value">
              ${((metrics?.avgBookingValue || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Per completed booking
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-customers">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-customers">
              {(metrics?.totalCustomers || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Unique customer records
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-bookings">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-bookings">
              {(metrics?.totalBookings || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All time bookings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trends Chart */}
        <Card data-testid="card-revenue-trends">
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle>Revenue Trends</CardTitle>
                <CardDescription>Daily revenue from paid invoices</CardDescription>
              </div>
              <div className="flex gap-2 flex-wrap">
                {TIME_PERIODS.map((period) => (
                  <Button
                    key={period.value}
                    variant={revenuePeriod === period.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRevenuePeriod(period.value)}
                    data-testid={`button-period-${period.value}`}
                  >
                    {period.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                    name="Revenue ($)"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No revenue data for selected period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Booking Status Breakdown */}
        <Card data-testid="card-booking-status">
          <CardHeader>
            <CardTitle>Booking Status Breakdown</CardTitle>
            <CardDescription>Distribution of bookings by status</CardDescription>
          </CardHeader>
          <CardContent>
            {bookingStatsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={bookingStatsData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {bookingStatsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No booking data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Services by Revenue */}
        <Card data-testid="card-top-services">
          <CardHeader>
            <CardTitle>Top Services by Revenue</CardTitle>
            <CardDescription>Services ranked by total revenue generated</CardDescription>
          </CardHeader>
          <CardContent>
            {topServicesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topServicesData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    type="number"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <YAxis 
                    type="category"
                    dataKey="service"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'revenue') return [`$${value.toFixed(2)}`, 'Revenue'];
                      return [value, 'Bookings'];
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="revenue" 
                    fill="hsl(var(--primary))"
                    name="Revenue ($)"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No service data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Acquisition Trend */}
        <Card data-testid="card-customer-acquisition">
          <CardHeader>
            <CardTitle>Customer Acquisition</CardTitle>
            <CardDescription>New customers acquired over last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            {(customerAcquisition || []).length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={customerAcquisition}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                    formatter={(value: number) => [value, 'New Customers']}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-2))' }}
                    name="New Customers"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No customer acquisition data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Customers Section */}
      <Card data-testid="card-top-customers">
        <CardHeader>
          <CardTitle>Top Customers by Lifetime Revenue</CardTitle>
          <CardDescription>Your most valuable customers based on total revenue</CardDescription>
        </CardHeader>
        <CardContent>
          {(topCustomers || []).length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Total Bookings</TableHead>
                    <TableHead className="text-right">Lifetime Revenue</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(topCustomers || []).map((customer) => (
                    <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell className="text-muted-foreground">{customer.email}</TableCell>
                      <TableCell className="text-right">{customer.totalBookings}</TableCell>
                      <TableCell className="text-right font-semibold">
                        ${(customer.lifetimeRevenue / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/customers/${encodeURIComponent(customer.email)}`}>
                          <Button 
                            variant="outline" 
                            size="sm"
                            data-testid={`button-view-profile-${customer.id}`}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Profile
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              No customer data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}
