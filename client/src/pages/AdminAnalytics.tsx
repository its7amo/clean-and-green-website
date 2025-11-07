import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DollarSign, Calendar, Users, TrendingUp, ExternalLink, CalendarIcon, Download, FileText, FileSpreadsheet, ChevronDown } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { AdminLayout } from "@/components/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
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

const DATE_PRESETS = [
  { label: "Today", value: "today", days: 0 },
  { label: "7 Days", value: "7", days: 7 },
  { label: "30 Days", value: "30", days: 30 },
  { label: "90 Days", value: "90", days: 90 },
  { label: "1 Year", value: "365", days: 365 },
  { label: "Custom", value: "custom", days: null },
];

const buildQueryString = (params: Record<string, any>) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
};

export default function AdminAnalytics() {
  const [revenuePeriod, setRevenuePeriod] = useState("30");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [selectedPreset, setSelectedPreset] = useState("30");
  const { toast } = useToast();

  const { data: metrics, isLoading: metricsLoading } = useQuery<AnalyticsMetrics>({
    queryKey: [`/api/analytics/metrics?${buildQueryString({
      fromDate: dateRange.from.toISOString(),
      toDate: dateRange.to.toISOString(),
    })}`],
  });

  const { data: revenueTrends, isLoading: trendsLoading } = useQuery<RevenueTrend[]>({
    queryKey: [`/api/analytics/revenue-trends?${buildQueryString({
      period: revenuePeriod,
      fromDate: dateRange.from.toISOString(),
      toDate: dateRange.to.toISOString(),
    })}`],
  });

  const { data: bookingStats, isLoading: statsLoading } = useQuery<BookingStats>({
    queryKey: [`/api/analytics/booking-stats?${buildQueryString({
      fromDate: dateRange.from.toISOString(),
      toDate: dateRange.to.toISOString(),
    })}`],
  });

  const { data: topServices, isLoading: servicesLoading } = useQuery<TopService[]>({
    queryKey: [`/api/analytics/top-services?${buildQueryString({
      fromDate: dateRange.from.toISOString(),
      toDate: dateRange.to.toISOString(),
    })}`],
  });

  const { data: customerAcquisition, isLoading: acquisitionLoading } = useQuery<CustomerAcquisition[]>({
    queryKey: [`/api/analytics/customer-acquisition?${buildQueryString({
      fromDate: dateRange.from.toISOString(),
      toDate: dateRange.to.toISOString(),
    })}`],
  });

  const { data: topCustomers, isLoading: topCustomersLoading } = useQuery<TopCustomer[]>({
    queryKey: [`/api/analytics/top-customers?${buildQueryString({
      limit: 10,
      fromDate: dateRange.from.toISOString(),
      toDate: dateRange.to.toISOString(),
    })}`],
  });

  const isLoading = metricsLoading || trendsLoading || statsLoading || servicesLoading || acquisitionLoading || topCustomersLoading;

  const handlePresetClick = (preset: typeof DATE_PRESETS[0]) => {
    setSelectedPreset(preset.value);
    if (preset.days !== null) {
      const to = endOfDay(new Date());
      const from = preset.days === 0 ? startOfDay(new Date()) : startOfDay(subDays(new Date(), preset.days - 1));
      setDateRange({ from, to });
    }
  };
  
  const handleCustomDateChange = (range: any) => {
    if (range?.from && range?.to) {
      setDateRange({
        from: startOfDay(range.from),
        to: endOfDay(range.to),
      });
    }
  };

  const handleDownloadCSV = () => {
    try {
      const csvData = [];
      
      csvData.push([`Analytics Report - ${format(dateRange.from, "MMM d, yyyy")} to ${format(dateRange.to, "MMM d, yyyy")}`]);
      csvData.push([]);
      
      csvData.push(['Key Performance Indicators']);
      csvData.push(['Metric', 'Value']);
      csvData.push(['Total Revenue', `$${((metrics?.totalRevenue || 0) / 100).toFixed(2)}`]);
      csvData.push(['Avg Booking Value', `$${((metrics?.avgBookingValue || 0) / 100).toFixed(2)}`]);
      csvData.push(['Total Customers', metrics?.totalCustomers || 0]);
      csvData.push(['Total Bookings', metrics?.totalBookings || 0]);
      csvData.push([]);
      
      csvData.push(['Booking Statistics']);
      csvData.push(['Status', 'Count']);
      csvData.push(['Pending', bookingStats?.pending || 0]);
      csvData.push(['Confirmed', bookingStats?.confirmed || 0]);
      csvData.push(['Completed', bookingStats?.completed || 0]);
      csvData.push(['Cancelled', bookingStats?.cancelled || 0]);
      csvData.push([]);
      
      csvData.push(['Top Services by Revenue']);
      csvData.push(['Service', 'Revenue', 'Bookings']);
      (topServices || []).forEach(service => {
        csvData.push([
          service.service,
          `$${(service.revenue / 100).toFixed(2)}`,
          service.count
        ]);
      });
      csvData.push([]);
      
      csvData.push(['Top 10 Customers']);
      csvData.push(['Name', 'Email', 'Total Bookings', 'Lifetime Revenue']);
      (topCustomers || []).forEach(customer => {
        csvData.push([
          customer.name,
          customer.email,
          customer.totalBookings,
          `$${(customer.lifetimeRevenue / 100).toFixed(2)}`
        ]);
      });
      
      const csvContent = csvData.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `analytics-report-${format(dateRange.from, "yyyy-MM-dd")}-to-${format(dateRange.to, "yyyy-MM-dd")}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Report Downloaded",
        description: "CSV report has been downloaded successfully",
      });
    } catch (error) {
      console.error("Error downloading CSV:", error);
      toast({
        title: "Download Failed",
        description: "Failed to download CSV report",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = async () => {
    try {
      toast({
        title: "Generating PDF",
        description: "Please wait while we generate your report...",
      });
      
      const reportElement = document.createElement('div');
      reportElement.style.position = 'absolute';
      reportElement.style.left = '-9999px';
      reportElement.style.width = '800px';
      reportElement.style.backgroundColor = 'white';
      reportElement.style.padding = '40px';
      
      reportElement.innerHTML = `
        <div style="font-family: Arial, sans-serif;">
          <h1 style="color: #22c55e; margin-bottom: 10px;">Analytics Report</h1>
          <p style="color: #666; margin-bottom: 30px;">
            ${format(dateRange.from, "MMMM d, yyyy")} - ${format(dateRange.to, "MMMM d, yyyy")}
          </p>
          
          <div style="margin-bottom: 30px;">
            <h2 style="color: #333; font-size: 18px; margin-bottom: 15px;">Key Performance Indicators</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 12px 0; font-weight: bold;">Total Revenue</td>
                <td style="padding: 12px 0; text-align: right;">$${((metrics?.totalRevenue || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 12px 0; font-weight: bold;">Avg Booking Value</td>
                <td style="padding: 12px 0; text-align: right;">$${((metrics?.avgBookingValue || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 12px 0; font-weight: bold;">Total Customers</td>
                <td style="padding: 12px 0; text-align: right;">${metrics?.totalCustomers || 0}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; font-weight: bold;">Total Bookings</td>
                <td style="padding: 12px 0; text-align: right;">${metrics?.totalBookings || 0}</td>
              </tr>
            </table>
          </div>
          
          <div style="margin-bottom: 30px;">
            <h2 style="color: #333; font-size: 18px; margin-bottom: 15px;">Booking Statistics</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 12px 0;">Pending</td>
                <td style="padding: 12px 0; text-align: right;">${bookingStats?.pending || 0}</td>
              </tr>
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 12px 0;">Confirmed</td>
                <td style="padding: 12px 0; text-align: right;">${bookingStats?.confirmed || 0}</td>
              </tr>
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 12px 0;">Completed</td>
                <td style="padding: 12px 0; text-align: right;">${bookingStats?.completed || 0}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0;">Cancelled</td>
                <td style="padding: 12px 0; text-align: right;">${bookingStats?.cancelled || 0}</td>
              </tr>
            </table>
          </div>
          
          <div>
            <h2 style="color: #333; font-size: 18px; margin-bottom: 15px;">Top 10 Customers</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <thead>
                <tr style="border-bottom: 2px solid #ddd; background-color: #f9f9f9;">
                  <th style="padding: 10px; text-align: left;">Name</th>
                  <th style="padding: 10px; text-align: right;">Bookings</th>
                  <th style="padding: 10px; text-align: right;">Revenue</th>
                </tr>
              </thead>
              <tbody>
                ${(topCustomers || []).map((customer, idx) => `
                  <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px;">${customer.name}</td>
                    <td style="padding: 10px; text-align: right;">${customer.totalBookings}</td>
                    <td style="padding: 10px; text-align: right;">$${(customer.lifetimeRevenue / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
      
      document.body.appendChild(reportElement);
      
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        backgroundColor: '#ffffff',
      });
      
      document.body.removeChild(reportElement);
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;
      
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }
      
      pdf.save(`analytics-report-${format(dateRange.from, "yyyy-MM-dd")}-to-${format(dateRange.to, "yyyy-MM-dd")}.pdf`);
      
      toast({
        title: "Report Downloaded",
        description: "PDF report has been downloaded successfully",
      });
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast({
        title: "Download Failed",
        description: "Failed to download PDF report",
        variant: "destructive",
      });
    }
  };

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

      {/* Report Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Report Settings</CardTitle>
          <CardDescription>Select date range and download reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant={selectedPreset === preset.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePresetClick(preset)}
                  data-testid={`button-preset-${preset.value}`}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            
            {selectedPreset === "custom" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" data-testid="button-date-picker">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={handleCustomDateChange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="sm" data-testid="button-download-report">
                  <Download className="mr-2 h-4 w-4" />
                  Download Report
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownloadPDF} data-testid="menu-download-pdf">
                  <FileText className="mr-2 h-4 w-4" />
                  Download as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadCSV} data-testid="menu-download-csv">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Download as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

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
