import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

interface RecentBooking {
  id: string;
  service: string;
  city: string;
  firstName: string;
  createdAt: Date;
}

export function RecentBookings() {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const { data: bookings = [] } = useQuery<RecentBooking[]>({
    queryKey: ["/api/public/recent-bookings"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  useEffect(() => {
    if (bookings.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % bookings.length);
    }, 4000); // Change every 4 seconds
    
    return () => clearInterval(interval);
  }, [bookings.length]);

  if (bookings.length === 0) return null;

  const current = bookings[currentIndex];

  return (
    <div className="bg-muted/30 border-y">
      <div className="container mx-auto px-4">
        <div className="py-3 flex items-center justify-center gap-2 text-sm md:text-base">
          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">{current.firstName}</span>
            {" "}in{" "}
            <span className="font-semibold text-foreground">{current.city}</span>
            {" "}just booked{" "}
            <span className="font-semibold text-foreground">{current.service}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
