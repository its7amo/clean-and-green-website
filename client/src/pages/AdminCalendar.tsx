import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday, parseISO } from "date-fns";
import type { Booking } from "@shared/schema";

export default function AdminCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: allBookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const bookingsByDate = allBookings.reduce((acc, booking) => {
    try {
      const bookingDate = parseISO(booking.date);
      const dateKey = format(bookingDate, "yyyy-MM-dd");
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(booking);
    } catch (e) {
      console.error("Error parsing booking date:", booking.date, e);
    }
    return acc;
  }, {} as Record<string, Booking[]>);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30";
      case "confirmed":
        return "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30";
      case "completed":
        return "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30";
      case "cancelled":
        return "bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/30";
      default:
        return "bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/30";
    }
  };

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setDialogOpen(true);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const previousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold" data-testid="heading-calendar">Calendar View</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={previousMonth}
              data-testid="button-previous-month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={goToToday}
              className="shrink-0"
              data-testid="button-today"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={nextMonth}
              data-testid="button-next-month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="text-base sm:text-lg font-semibold sm:ml-4" data-testid="text-current-month">
              {format(currentDate, "MMMM yyyy")}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-muted-foreground">Loading calendar...</div>
          </div>
        ) : (
          <Card className="p-2 sm:p-4 md:p-6">
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 sm:mb-4">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="text-center font-semibold text-xs sm:text-sm text-muted-foreground py-1 sm:py-2"
                  data-testid={`text-day-header-${day.toLowerCase()}`}
                >
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day.charAt(0)}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarDays.map((day, index) => {
                const dateKey = format(day, "yyyy-MM-dd");
                const dayBookings = bookingsByDate[dateKey] || [];
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isCurrentDay = isToday(day);

                return (
                  <div
                    key={index}
                    className={`min-h-16 sm:min-h-20 md:min-h-32 border rounded p-1 sm:p-2 ${
                      isCurrentMonth ? "bg-card" : "bg-muted/30"
                    } ${isCurrentDay ? "ring-1 sm:ring-2 ring-primary" : ""}`}
                    data-testid={`calendar-day-${dateKey}`}
                  >
                    <div className={`text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 ${isCurrentMonth ? "" : "text-muted-foreground"}`}>
                      {format(day, "d")}
                    </div>
                    
                    <div className="space-y-0.5 sm:space-y-1 overflow-y-auto max-h-12 sm:max-h-16 md:max-h-24">
                      {dayBookings.slice(0, 2).map((booking) => (
                        <div
                          key={booking.id}
                          className={`text-[10px] sm:text-xs p-0.5 sm:p-1 rounded cursor-pointer hover-elevate border ${getStatusColor(booking.status)}`}
                          onClick={() => handleBookingClick(booking)}
                          data-testid={`booking-card-${booking.id}`}
                        >
                          <div className="font-semibold truncate hidden sm:block">{booking.name}</div>
                          <div className="truncate text-[9px] sm:text-[10px]">
                            <span className="hidden sm:inline">{booking.service.split(" ")[0]} • </span>{booking.timeSlot.split(" ")[0]}
                          </div>
                        </div>
                      ))}
                      
                      {dayBookings.length > 2 && (
                        <div className="text-[9px] sm:text-[10px] text-center text-muted-foreground font-medium">
                          +{dayBookings.length - 2}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-booking-details">
            <DialogHeader>
              <DialogTitle>Booking Details</DialogTitle>
            </DialogHeader>
            
            {selectedBooking && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Status</div>
                    <Badge className={getStatusColor(selectedBooking.status)} data-testid="badge-booking-status">
                      {selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1)}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Booking ID</div>
                    <div className="text-sm" data-testid="text-booking-id">{selectedBooking.id}</div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Customer Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Name</div>
                      <div className="text-sm" data-testid="text-customer-name">{selectedBooking.name}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Email</div>
                      <div className="text-sm" data-testid="text-customer-email">{selectedBooking.email}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Phone</div>
                      <div className="text-sm" data-testid="text-customer-phone">{selectedBooking.phone}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Address</div>
                      <div className="text-sm" data-testid="text-customer-address">{selectedBooking.address}</div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Service Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Service Type</div>
                      <div className="text-sm" data-testid="text-service-type">{selectedBooking.service}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Property Size</div>
                      <div className="text-sm" data-testid="text-property-size">{selectedBooking.propertySize || "N/A"}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Date</div>
                      <div className="text-sm" data-testid="text-booking-date">
                        {format(parseISO(selectedBooking.date), "MMMM dd, yyyy")}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Time Slot</div>
                      <div className="text-sm" data-testid="text-time-slot">{selectedBooking.timeSlot}</div>
                    </div>
                  </div>
                </div>

                {selectedBooking.assignedEmployeeIds && selectedBooking.assignedEmployeeIds.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Assigned Employees</h3>
                    <div className="text-sm" data-testid="text-assigned-employees">
                      {selectedBooking.assignedEmployeeIds.length} employee(s) assigned
                    </div>
                  </div>
                )}

                {selectedBooking.promoCode && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Promo Code</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Code</div>
                        <div className="text-sm" data-testid="text-promo-code">{selectedBooking.promoCode}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Discount</div>
                        <div className="text-sm" data-testid="text-discount-amount">
                          ${((selectedBooking.discountAmount || 0) / 100).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    data-testid="button-close-dialog"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => window.location.href = `/admin/bookings`}
                    data-testid="button-view-full-booking"
                  >
                    View Full Booking
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
