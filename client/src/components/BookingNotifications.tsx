import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

interface RecentBooking {
  id: string;
  service: string;
  city: string;
  firstName: string;
  timeAgo: string;
}

export default function BookingNotifications() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const { data: bookings } = useQuery<RecentBooking[]>({
    queryKey: ["/api/public/recent-bookings"],
  });

  useEffect(() => {
    if (!bookings || bookings.length === 0) return;

    const showNextNotification = () => {
      setIsVisible(true);

      // Hide after 6 seconds
      setTimeout(() => {
        setIsVisible(false);
      }, 6000);

      // Move to next booking after 8 seconds (includes fade out time)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % bookings.length);
      }, 8000);
    };

    // Show first notification after 3 seconds
    const initialDelay = setTimeout(showNextNotification, 3000);

    return () => clearTimeout(initialDelay);
  }, [bookings]);

  useEffect(() => {
    if (!bookings || bookings.length === 0 || currentIndex === 0) return;

    // Show each subsequent notification
    const timer = setTimeout(() => {
      setIsVisible(true);

      setTimeout(() => {
        setIsVisible(false);
      }, 6000);
    }, 500);

    return () => clearTimeout(timer);
  }, [currentIndex, bookings]);

  if (!bookings || bookings.length === 0) return null;

  const booking = bookings[currentIndex];

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-all duration-500 ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
      data-testid="notification-recent-booking"
    >
      <div className="bg-card border border-border rounded-lg shadow-lg p-4 max-w-sm backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              <span className="font-semibold">{booking.firstName}</span> from{" "}
              {booking.city}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Just booked {booking.service} · {booking.timeAgo}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
