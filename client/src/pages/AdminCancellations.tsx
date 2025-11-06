import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, DollarSign, Calendar, Clock, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import type { Booking } from "@shared/schema";

export default function AdminCancellations() {
  const { toast } = useToast();
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/admin/cancellations"],
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/admin/cancellations/${id}/dismiss`, {});
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to dismiss fee");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cancellations"] });
      toast({
        title: "Fee dismissed",
        description: "Cancellation fee has been dismissed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to dismiss fee",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const chargeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/cancellations/${id}/charge`, {});
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to charge fee");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cancellations"] });
      setSelectedBookingId(null);
      toast({
        title: "Fee charged",
        description: "Cancellation fee of $35 has been charged successfully.",
      });
    },
    onError: (error: Error) => {
      setSelectedBookingId(null);
      toast({
        title: "Failed to charge fee",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleChargeClick = (bookingId: string) => {
    setSelectedBookingId(bookingId);
  };

  const handleChargeConfirm = () => {
    if (selectedBookingId) {
      chargeMutation.mutate(selectedBookingId);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM dd, yyyy");
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (date: Date | string | null | undefined) => {
    if (!date) return "N/A";
    try {
      return format(new Date(date), "MMM dd, yyyy h:mm a");
    } catch {
      return "N/A";
    }
  };

  const getFeeStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: any }> = {
      pending: { variant: "default", icon: AlertTriangle },
      dismissed: { variant: "secondary", icon: XCircle },
      charged: { variant: "default", icon: CheckCircle2 },
      not_applicable: { variant: "outline", icon: CheckCircle2 },
    };

    const config = variants[status] || variants.not_applicable;
    const Icon = config.icon;

    const colorClass = status === 'pending' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20' 
      : status === 'dismissed' ? 'bg-secondary' 
      : status === 'charged' ? 'bg-green-500/10 text-green-600 dark:text-green-500 border-green-500/20' 
      : '';

    return (
      <Badge variant={config.variant} className={colorClass}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const pendingBookings = bookings?.filter(b => b.cancellationFeeStatus === 'pending') || [];
  const filteredBookings = bookings?.filter(b => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return b.cancellationFeeStatus === 'pending';
    if (activeTab === 'dismissed') return b.cancellationFeeStatus === 'dismissed';
    if (activeTab === 'charged') return b.cancellationFeeStatus === 'charged';
    if (activeTab === 'not_applicable') return b.cancellationFeeStatus === 'not_applicable';
    return true;
  }) || [];

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading cancellations...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Cancellations</h1>
          <p className="text-muted-foreground mt-2">Manage late cancellation fees</p>
        </div>

        {pendingBookings.length > 0 ? (
          <Alert className="border-amber-500/50 bg-amber-500/10" data-testid="alert-pending-fees">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            <AlertDescription className="text-amber-600 dark:text-amber-500">
              <strong>{pendingBookings.length} pending cancellation fee{pendingBookings.length > 1 ? 's' : ''}</strong> requiring action
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-green-500/50 bg-green-500/10" data-testid="alert-no-pending-fees">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
            <AlertDescription className="text-green-600 dark:text-green-500">
              No pending cancellation fees
            </AlertDescription>
          </Alert>
        )}

        {pendingBookings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-amber-600" />
                Pending Fees
              </CardTitle>
              <CardDescription>
                Bookings cancelled within 24 hours requiring fee collection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Cancelled At</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">{booking.name}</TableCell>
                        <TableCell>{booking.service}</TableCell>
                        <TableCell>{formatDate(booking.date)}</TableCell>
                        <TableCell>{booking.timeSlot}</TableCell>
                        <TableCell>{formatDateTime(booking.cancelledAt)}</TableCell>
                        <TableCell className="font-semibold">$35.00</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => dismissMutation.mutate(booking.id)}
                              disabled={dismissMutation.isPending}
                              data-testid={`button-dismiss-fee-${booking.id}`}
                            >
                              Dismiss Fee
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleChargeClick(booking.id)}
                              disabled={chargeMutation.isPending || !booking.paymentMethodId}
                              data-testid={`button-charge-fee-${booking.id}`}
                            >
                              <DollarSign className="h-4 w-4 mr-1" />
                              Charge $35
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              All Cancelled Bookings
            </CardTitle>
            <CardDescription>
              Complete history of cancelled bookings and their fee status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="all" data-testid="tab-all">
                  All ({bookings?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="pending" data-testid="tab-pending">
                  Pending ({bookings?.filter(b => b.cancellationFeeStatus === 'pending').length || 0})
                </TabsTrigger>
                <TabsTrigger value="dismissed" data-testid="tab-dismissed">
                  Dismissed ({bookings?.filter(b => b.cancellationFeeStatus === 'dismissed').length || 0})
                </TabsTrigger>
                <TabsTrigger value="charged" data-testid="tab-charged">
                  Charged ({bookings?.filter(b => b.cancellationFeeStatus === 'charged').length || 0})
                </TabsTrigger>
                <TabsTrigger value="not_applicable" data-testid="tab-not-applicable">
                  Not Applicable ({bookings?.filter(b => b.cancellationFeeStatus === 'not_applicable').length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab}>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Cancelled At</TableHead>
                        <TableHead>Fee Status</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBookings.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No cancelled bookings found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredBookings.map((booking) => (
                          <TableRow key={booking.id}>
                            <TableCell className="font-medium">{booking.name}</TableCell>
                            <TableCell>{booking.service}</TableCell>
                            <TableCell>{formatDate(booking.date)}</TableCell>
                            <TableCell>{formatDateTime(booking.cancelledAt)}</TableCell>
                            <TableCell>
                              <span data-testid={`badge-fee-status-${booking.id}`}>
                                {getFeeStatusBadge(booking.cancellationFeeStatus)}
                              </span>
                            </TableCell>
                            <TableCell>
                              {booking.cancellationFeeStatus === 'pending' || booking.cancellationFeeStatus === 'charged' 
                                ? '$35.00' 
                                : '—'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!selectedBookingId} onOpenChange={(open) => !open && setSelectedBookingId(null)}>
        <AlertDialogContent data-testid="dialog-charge-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-amber-600" />
              Confirm Cancellation Fee Charge
            </AlertDialogTitle>
            <AlertDialogDescription>
              Charge $35 cancellation fee to this customer's card on file?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-charge">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleChargeConfirm}
              data-testid="button-confirm-charge"
            >
              Charge $35
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
