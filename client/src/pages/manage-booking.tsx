import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

export default function ManageBooking() {
  const [, params] = useRoute("/booking/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [date, setDate] = useState<Date>();
  const [timeSlot, setTimeSlot] = useState("");

  const token = new URLSearchParams(window.location.search).get("token");

  const { data: booking, isLoading } = useQuery({
    queryKey: ['/api/bookings', params?.id, 'manage', token],
    enabled: !!params?.id && !!token,
    queryFn: async () => {
      const res = await fetch(`/api/bookings/${params?.id}/manage?token=${token}`);
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
      const res = await apiRequest("PATCH", `/api/bookings/${params?.id}/manage?token=${token}`, {
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
      const res = await apiRequest("PATCH", `/api/bookings/${params?.id}/manage?token=${token}`, {
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
              <p className="text-sm text-muted-foreground mb-4">
                If you need to cancel this booking, click the button below. This action cannot be undone.
              </p>
              <Button 
                variant="destructive" 
                onClick={() => {
                  if (confirm("Are you sure you want to cancel this booking?")) {
                    cancelMutation.mutate();
                  }
                }}
                disabled={cancelMutation.isPending}
                className="w-full"
                data-testid="button-cancel"
              >
                {cancelMutation.isPending ? "Cancelling..." : "Cancel Booking"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
