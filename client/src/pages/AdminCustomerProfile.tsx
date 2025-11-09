import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2, Mail, Phone, MapPin, DollarSign, Calendar, Trash2, ShoppingCart, FileText, TrendingUp, AlertTriangle, Tag, Sparkles } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Booking, Quote, Invoice, CustomerNote, Customer } from "@shared/schema";
import { format } from "date-fns";

interface CustomerProfile {
  customer: Customer | null;
  bookings: Booking[];
  quotes: Quote[];
  invoices: Invoice[];
  notes: CustomerNote[];
  stats: {
    totalSpent: number;
    completedBookings: number;
    totalBookings: number;
    totalQuotes: number;
  };
}

interface CustomerMetrics {
  totalLifetimeRevenue: number;
  totalBookings: number;
  totalQuotes: number;
  avgBookingValue: number;
  repeatRate: number;
  firstBookingDate: string;
  lastBookingDate: string;
  daysAsCustomer: number;
  customerStatus: "New" | "Active" | "Loyal";
}

export default function AdminCustomerProfile() {
  const params = useParams();
  // Email comes URL-decoded from Wouter, so decode it properly
  const email = decodeURIComponent(params.email as string);
  const [newNote, setNewNote] = useState("");
  const { toast } = useToast();

  const { data: profile, isLoading } = useQuery<CustomerProfile>({
    queryKey: ['/api/customers/profile', email],
    queryFn: async () => {
      const url = `/api/customers/${encodeURIComponent(email)}/profile`;
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json();
    },
    staleTime: 0,
    gcTime: 0,
  });

  // Fetch CLV metrics for this customer
  const { data: metrics, isLoading: metricsLoading } = useQuery<CustomerMetrics>({
    queryKey: ['/api/customers/metrics', profile?.customer?.id],
    queryFn: async () => {
      if (!profile?.customer?.id) throw new Error('No customer ID');
      const response = await fetch(`/api/customers/${profile.customer.id}/metrics`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return response.json();
    },
    enabled: !!profile?.customer?.id,
  });

  const addNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      const res = await apiRequest("POST", `/api/customers/${encodeURIComponent(email)}/notes`, { note });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/customers/profile', email] });
      setNewNote("");
      toast({ title: "Note added successfully" });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      await apiRequest("DELETE", `/api/customers/notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/customers/profile', email] });
      toast({ title: "Note deleted" });
    },
  });

  const autoTagMutation = useMutation({
    mutationFn: async () => {
      if (!customer?.id) throw new Error("No customer ID");
      const res = await apiRequest("POST", `/api/customers/${customer.id}/auto-tag`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/customers/profile', email] });
      toast({ title: "Tags updated automatically" });
    },
  });

  const calculateChurnRiskMutation = useMutation({
    mutationFn: async () => {
      if (!customer?.id) throw new Error("No customer ID");
      const res = await apiRequest("GET", `/api/customers/${customer.id}/churn-risk`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/customers/profile', email] });
      toast({ title: "Churn risk calculated" });
    },
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!profile) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Customer not found</p>
        </div>
      </AdminLayout>
    );
  }

  const { customer, bookings, quotes, invoices, notes, stats } = profile;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{customer?.name || "Customer"}</CardTitle>
                <CardDescription className="flex flex-col gap-1 mt-2">
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {email}
                  </span>
                  {customer?.phone && (
                    <span className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {customer.phone}
                    </span>
                  )}
                  {customer?.address && (
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {customer.address}
                    </span>
                  )}
                </CardDescription>
              </div>
              <Badge variant={stats.completedBookings > 5 ? "default" : "secondary"}>
                {stats.completedBookings > 10 ? "VIP" : stats.completedBookings > 5 ? "Regular" : "New"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <DollarSign className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">${(stats.totalSpent / 100).toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Total Spent</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <Calendar className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">{stats.completedBookings}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <Calendar className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">{stats.totalBookings}</p>
                <p className="text-xs text-muted-foreground">Total Bookings</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <Calendar className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">{stats.totalQuotes}</p>
                <p className="text-xs text-muted-foreground">Quotes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Churn Risk & Tags Section */}
        <Card data-testid="card-churn-risk-tags">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Intelligence & Segmentation</CardTitle>
                <CardDescription>Churn risk analysis and customer tags</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => calculateChurnRiskMutation.mutate()}
                  disabled={calculateChurnRiskMutation.isPending || !customer}
                  data-testid="button-calculate-churn-risk"
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  {calculateChurnRiskMutation.isPending ? "Calculating..." : "Calculate Churn Risk"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => autoTagMutation.mutate()}
                  disabled={autoTagMutation.isPending || !customer}
                  data-testid="button-auto-tag"
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  {autoTagMutation.isPending ? "Tagging..." : "Auto-Tag"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Churn Risk */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Churn Risk</span>
                </div>
                {customer?.churnRisk ? (
                  <Badge
                    variant={
                      customer.churnRisk === "high"
                        ? "destructive"
                        : customer.churnRisk === "medium"
                        ? "default"
                        : "secondary"
                    }
                    data-testid="badge-churn-risk"
                  >
                    {customer.churnRisk.toUpperCase()} RISK
                  </Badge>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No churn risk calculated. Click "Calculate Churn Risk" to analyze.
                  </p>
                )}
                {customer?.churnRiskLastCalculated && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last calculated:{" "}
                    {format(new Date(customer.churnRiskLastCalculated), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                )}
              </div>

              <Separator />

              {/* Tags */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Customer Tags</span>
                </div>
                {customer?.tags && customer.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2" data-testid="container-tags">
                    {customer.tags.map((tag) => (
                      <Badge key={tag} variant="outline" data-testid={`tag-${tag}`}>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No tags assigned. Click "Auto-Tag" to automatically categorize this customer.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Value Metrics Section */}
        {metrics && !metricsLoading && (
          <Card data-testid="card-customer-value-metrics">
            <CardHeader>
              <CardTitle>Customer Value Metrics</CardTitle>
              <CardDescription>Lifetime value and engagement insights</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Lifetime Revenue */}
                <div className="text-center p-4 bg-muted/30 rounded-lg" data-testid="metric-lifetime-revenue">
                  <DollarSign className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold">
                    ${(metrics.totalLifetimeRevenue / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">Lifetime Revenue</p>
                </div>

                {/* Total Bookings */}
                <div className="text-center p-4 bg-muted/30 rounded-lg" data-testid="metric-total-bookings">
                  <ShoppingCart className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold">{metrics.totalBookings}</p>
                  <p className="text-xs text-muted-foreground">Total Bookings</p>
                </div>

                {/* Total Quotes */}
                <div className="text-center p-4 bg-muted/30 rounded-lg" data-testid="metric-total-quotes">
                  <FileText className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold">{metrics.totalQuotes}</p>
                  <p className="text-xs text-muted-foreground">Total Quotes</p>
                </div>

                {/* Average Booking Value */}
                <div className="text-center p-4 bg-muted/30 rounded-lg" data-testid="metric-avg-booking-value">
                  <TrendingUp className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold">
                    ${(metrics.avgBookingValue / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Booking Value</p>
                </div>

                {/* Repeat Customer Rate */}
                <div className="text-center p-4 bg-muted/30 rounded-lg" data-testid="metric-repeat-rate">
                  <TrendingUp className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold">{metrics.repeatRate}%</p>
                  <p className="text-xs text-muted-foreground">Repeat Customer Rate</p>
                </div>

                {/* Customer Since */}
                <div className="text-center p-4 bg-muted/30 rounded-lg" data-testid="metric-customer-since">
                  <Calendar className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-xl font-bold">
                    {format(new Date(metrics.firstBookingDate), "MMM d, yyyy")}
                  </p>
                  <p className="text-xs text-muted-foreground">Customer Since</p>
                </div>

                {/* Days as Customer */}
                <div className="text-center p-4 bg-muted/30 rounded-lg" data-testid="metric-days-as-customer">
                  <Calendar className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold">{metrics.daysAsCustomer}</p>
                  <p className="text-xs text-muted-foreground">Days as Customer</p>
                </div>

                {/* Customer Status */}
                <div className="text-center p-4 bg-muted/30 rounded-lg" data-testid="metric-customer-status">
                  <Badge 
                    variant={
                      metrics.customerStatus === "New" ? "default" : 
                      metrics.customerStatus === "Active" ? "default" : 
                      "default"
                    }
                    className={`text-base px-4 py-2 ${
                      metrics.customerStatus === "New" ? "bg-blue-500" :
                      metrics.customerStatus === "Active" ? "bg-green-500" :
                      "bg-yellow-600"
                    }`}
                  >
                    {metrics.customerStatus}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">Customer Status</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Notes</CardTitle>
              <CardDescription>Special requests, allergies, preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a note about this customer..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                  data-testid="input-customer-note"
                />
                <Button
                  onClick={() => addNoteMutation.mutate(newNote)}
                  disabled={!newNote.trim() || addNoteMutation.isPending}
                  data-testid="button-add-note"
                >
                  {addNoteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Add Note
                </Button>
              </div>

              <Separator />

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No notes yet</p>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="p-3 bg-muted/30 rounded-lg" data-testid={`note-${note.id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm">{note.note}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {note.createdByName} • {format(new Date(note.createdAt), "MMM d, yyyy")}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteNoteMutation.mutate(note.id)}
                          data-testid={`button-delete-note-${note.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Booking History</CardTitle>
              <CardDescription>{bookings.length} total bookings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {bookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No bookings yet</p>
                ) : (
                  bookings.map((booking) => (
                    <div key={booking.id} className="p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{booking.service}</p>
                          <p className="text-xs text-muted-foreground">{booking.date} at {booking.timeSlot}</p>
                        </div>
                        <Badge variant={
                          booking.status === 'completed' ? 'default' :
                          booking.status === 'confirmed' ? 'secondary' :
                          booking.status === 'cancelled' ? 'destructive' : 'outline'
                        }>
                          {booking.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
