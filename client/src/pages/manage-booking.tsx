import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { AlertTriangle, Info } from "lucide-react";

export default function ManageBooking() {
  const [, params] = useRoute("/manage-booking/:token");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [date, setDate] = useState<Date>();
  const [timeSlot, setTimeSlot] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [acknowledgeFee, setAcknowledgeFee] = useState(false);

  const token = params?.token;

  const { data: booking, isLoading } = useQuery({
    queryKey: ['/api/bookings/manage', token],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(`/api/bookings/manage/${token}`);
      if (!res.ok) throw new Error("Invalid booking link");
      return res.json();
    },
  });

  // Fetch available slots when date changes
  const { data: availableSlots, isLoading: slotsLoading } = useQuery({
    queryKey: ['/api/available-slots', date ? format(date, "yyyy-MM-dd") : null],
    enabled: !!date,
    queryFn: async () => {
      const res = await fetch(`/api/available-slots?date=${format(date!, "yyyy-MM-dd")}`);
      if (!res.ok) throw new Error("Failed to fetch available slots");
      const data = await res.json();
      return data.availableSlots || [];
    },
  });

  useEffect(() => {
    if (booking) {
      setDate(parseISO(booking.date));
      setTimeSlot(booking.timeSlot);
    }
  }, [booking]);

  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/bookings/manage/${token}`, {
        date: date ? format(date, "yyyy-MM-dd") : undefined,
        timeSlot,
        customerNotes,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Reschedule Request Submitted",
        description: "Your reschedule request has been submitted for review. You'll receive an email once it's approved.",
      });
      setTimeout(() => setLocation("/"), 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit reschedule request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/bookings/manage/${token}`, {
        status: "cancelled",
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Booking Cancelled",
        description: "Your booking has been cancelled successfully.",
      });
      setTimeout(() => setLocation("/"), 2000);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to cancel booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription>This booking link is invalid or has expired.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (booking.status === "cancelled") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Booking Cancelled</CardTitle>
            <CardDescription>This booking has already been cancelled.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (booking.status === "pending_reschedule") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Reschedule Request Pending</CardTitle>
            <CardDescription>Your reschedule request is currently under review.</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Under Review</AlertTitle>
              <AlertDescription>
                You'll receive an email notification once your reschedule request has been reviewed.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Manage Your Booking</CardTitle>
            <CardDescription>Reschedule or cancel your cleaning service</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Current Booking Details</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p><span className="font-medium">Service:</span> {booking.service}</p>
                <p><span className="font-medium">Date:</span> {format(parseISO(booking.date), "MMMM d, yyyy")}</p>
                <p><span className="font-medium">Time:</span> {booking.timeSlot}</p>
                <p><span className="font-medium">Address:</span> {booking.address}</p>
                <p><span className="font-medium">Status:</span> {booking.status}</p>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">Request Reschedule</h3>
              
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertTitle>Approval Required</AlertTitle>
                <AlertDescription>
                  Reschedule requests require approval from our team. You'll receive an email notification once your request has been reviewed.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Select New Date</label>
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => {
                      setDate(newDate);
                      setTimeSlot(""); // Reset time slot when date changes
                    }}
                    disabled={(date) => date < new Date()}
                    className="rounded-md border"
                    data-testid="calendar-reschedule"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Select New Time Slot</label>
                  {date && slotsLoading && (
                    <p className="text-sm text-muted-foreground">Loading available slots...</p>
                  )}
                  {date && !slotsLoading && availableSlots && availableSlots.length === 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        No time slots are available for this date. Please select a different date.
                      </AlertDescription>
                    </Alert>
                  )}
                  {date && !slotsLoading && availableSlots && availableSlots.length > 0 && (
                    <Select value={timeSlot} onValueChange={setTimeSlot}>
                      <SelectTrigger data-testid="select-timeslot">
                        <SelectValue placeholder="Choose a time slot" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSlots.map((slot: string) => (
                          <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Reason for Reschedule (Optional)</label>
                  <Textarea
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="Let us know why you need to reschedule..."
                    className="resize-none"
                    rows={3}
                    data-testid="textarea-customer-notes"
                  />
                </div>
                <Button 
                  onClick={() => rescheduleMutation.mutate()} 
                  disabled={!date || !timeSlot || rescheduleMutation.isPending}
                  className="w-full"
                  data-testid="button-reschedule"
                >
                  {rescheduleMutation.isPending ? "Submitting Request..." : "Submit Reschedule Request"}
                </Button>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold mb-2 text-destructive">Cancel Booking</h3>
              
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Cancellation Policy</AlertTitle>
                <AlertDescription>
                  Cancellations made less than 24 hours before your scheduled appointment are subject to a $35 cancellation fee.
                </AlertDescription>
              </Alert>
              
              <Button 
                variant="destructive" 
                onClick={() => {
                  setShowCancelDialog(true);
                  setAcknowledgeFee(false);
                }}
                disabled={cancelMutation.isPending}
                className="w-full"
                data-testid="button-cancel"
              >
                Cancel Booking
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Your Booking?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>Are you sure you want to cancel this booking? This action cannot be undone.</p>
              
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Cancellation Fee Notice</AlertTitle>
                <AlertDescription>
                  If you cancel less than 24 hours before your scheduled appointment time, you may be charged a <strong>$35 cancellation fee</strong>.
                </AlertDescription>
              </Alert>

              <div className="flex items-start space-x-2 pt-2">
                <Checkbox 
                  id="acknowledge-fee" 
                  checked={acknowledgeFee}
                  onCheckedChange={(checked) => setAcknowledgeFee(checked as boolean)}
                  data-testid="checkbox-acknowledge-fee"
                />
                <label
                  htmlFor="acknowledge-fee"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I understand that I may be charged a $35 cancellation fee if I cancel less than 24 hours before my appointment
                </label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAcknowledgeFee(false)}>
              Keep Booking
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!acknowledgeFee || cancelMutation.isPending}
              onClick={() => {
                if (acknowledgeFee) {
                  cancelMutation.mutate();
                  setShowCancelDialog(false);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-cancel"
            >
              {cancelMutation.isPending ? "Cancelling..." : "Yes, Cancel Booking"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
