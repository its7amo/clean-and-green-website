import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";

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
  const [isPopping, setIsPopping] = useState(false);

  const { data: bookings } = useQuery<RecentBooking[]>({
    queryKey: ["/api/public/recent-bookings"],
  });

  useEffect(() => {
    if (!bookings || bookings.length === 0) return;

    const showNextNotification = () => {
      setIsVisible(true);
      setIsPopping(false);

      // Start popping animation after 7 seconds
      setTimeout(() => {
        setIsPopping(true);
      }, 7000);

      // Hide completely after pop animation
      setTimeout(() => {
        setIsVisible(false);
      }, 7500);

      // Move to next booking
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % bookings.length);
      }, 8500);
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
      setIsPopping(false);

      setTimeout(() => {
        setIsPopping(true);
      }, 7000);

      setTimeout(() => {
        setIsVisible(false);
      }, 7500);
    }, 500);

    return () => clearTimeout(timer);
  }, [currentIndex, bookings]);

  if (!bookings || bookings.length === 0) return null;

  const booking = bookings[currentIndex];

  return (
    <div
      className={`fixed left-8 top-1/2 -translate-y-1/2 z-50 transition-all duration-700 ${
        isVisible && !isPopping
          ? "opacity-100 translate-x-0 scale-100"
          : isPopping
          ? "opacity-0 scale-150"
          : "opacity-0 -translate-x-full scale-90"
      }`}
      data-testid="notification-recent-booking"
      style={{
        animation: isVisible && !isPopping ? "float 3s ease-in-out infinite" : "none",
      }}
    >
      <div
        className="relative w-48 h-48 rounded-full flex items-center justify-center"
        style={{
          background: "radial-gradient(circle at 30% 30%, rgba(34, 197, 94, 0.3), rgba(22, 163, 74, 0.15))",
          backdropFilter: "blur(8px)",
          border: "2px solid rgba(34, 197, 94, 0.4)",
          boxShadow: "0 8px 32px rgba(34, 197, 94, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Shine effect */}
        <div
          className="absolute top-6 left-6 w-16 h-16 rounded-full opacity-40"
          style={{
            background: "radial-gradient(circle, rgba(255, 255, 255, 0.8), transparent)",
          }}
        />
        
        {/* Content */}
        <div className="text-center px-6 z-10">
          <div className="flex justify-center mb-2">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-bold text-foreground mb-1">
            {booking.firstName}
          </p>
          <p className="text-xs text-muted-foreground font-medium">
            booked {booking.service}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {booking.timeAgo}
          </p>
        </div>

        {/* Bubble reflection effect */}
        <div
          className="absolute bottom-8 right-8 w-12 h-12 rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, rgba(255, 255, 255, 0.6), transparent)",
          }}
        />
      </div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(-50%) translateY(0px);
          }
          50% {
            transform: translateY(-50%) translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
}
