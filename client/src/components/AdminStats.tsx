import { Card } from "@/components/ui/card";
import { Calendar, FileText, CheckCircle, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Booking, Quote } from "@shared/schema";

export function AdminStats() {
  const { data: bookings } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: quotes } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  const totalBookings = bookings?.length || 0;
  const pendingBookings = bookings?.filter(b => b.status === "pending").length || 0;
  const completedBookings = bookings?.filter(b => b.status === "completed").length || 0;
  const pendingQuotes = quotes?.filter(q => q.status === "pending").length || 0;

  const stats = [
    { id: 1, label: "Total Bookings", value: totalBookings.toString(), icon: Calendar },
    { id: 2, label: "Pending Bookings", value: pendingBookings.toString(), icon: Clock },
    { id: 3, label: "Completed", value: completedBookings.toString(), icon: CheckCircle },
    { id: 4, label: "Pending Quotes", value: pendingQuotes.toString(), icon: FileText },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <Card key={stat.id} className="p-6" data-testid={`stat-card-${stat.id}`}>
          <div className="flex items-center justify-between mb-2">
            <stat.icon className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="text-3xl font-bold">{stat.value}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
