import { Card } from "@/components/ui/card";
import { Calendar, FileText, CheckCircle, Clock, Globe, Phone } from "lucide-react";
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
  
  // Lead type statistics
  const webLeads = bookings?.filter(b => b.leadType === 'web').length || 0;
  const phoneLeads = bookings?.filter(b => b.leadType === 'phone').length || 0;

  const stats = [
    { id: 1, label: "Total Bookings", value: totalBookings.toString(), icon: Calendar },
    { id: 2, label: "Pending Bookings", value: pendingBookings.toString(), icon: Clock },
    { id: 3, label: "Completed", value: completedBookings.toString(), icon: CheckCircle },
    { id: 4, label: "Pending Quotes", value: pendingQuotes.toString(), icon: FileText },
    { id: 5, label: "Web Leads", value: webLeads.toString(), icon: Globe },
    { id: 6, label: "Phone Leads", value: phoneLeads.toString(), icon: Phone },
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
