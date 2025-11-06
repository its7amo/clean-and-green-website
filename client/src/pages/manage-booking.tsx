import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { AlertTriangle } from "lucide-react";

export default function ManageBooking() {
  const [, params] = useRoute("/manage-booking/:token");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [date, setDate] = useState<Date>();
  const [timeSlot, setTimeSlot] = useState("");
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
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Booking Rescheduled",
        description: "Your booking has been successfully rescheduled. You'll receive a confirmation email shortly.",
      });
      setTimeout(() => setLocation("/"), 2000);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reschedule booking. Please try again.",
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

  const timeSlots = [
    "8:00 AM - 10:00 AM",
    "10:00 AM - 12:00 PM",
    "12:00 PM - 2:00 PM",
    "2:00 PM - 4:00 PM",
    "4:00 PM - 6:00 PM",
  ];

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
              <h3 className="font-semibold mb-4">Reschedule Booking</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Select New Date</label>
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(date) => date < new Date()}
                    className="rounded-md border"
                    data-testid="calendar-reschedule"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Select New Time</label>
                  <Select value={timeSlot} onValueChange={setTimeSlot}>
                    <SelectTrigger data-testid="select-timeslot">
                      <SelectValue placeholder="Choose a time slot" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((slot) => (
                        <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={() => rescheduleMutation.mutate()} 
                  disabled={!date || !timeSlot || rescheduleMutation.isPending}
                  className="w-full"
                  data-testid="button-reschedule"
                >
                  {rescheduleMutation.isPending ? "Rescheduling..." : "Reschedule Booking"}
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
