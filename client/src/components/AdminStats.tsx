import { Card } from "@/components/ui/card";
import { Calendar, FileText, DollarSign, Users } from "lucide-react";

const stats = [
  { id: 1, label: "Total Bookings", value: "127", icon: Calendar, change: "+12%" },
  { id: 2, label: "Pending Quotes", value: "23", icon: FileText, change: "+5%" },
  { id: 3, label: "Revenue (MTD)", value: "$15,420", icon: DollarSign, change: "+18%" },
  { id: 4, label: "Active Customers", value: "89", icon: Users, change: "+8%" },
];

export function AdminStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <Card key={stat.id} className="p-6" data-testid={`stat-card-${stat.id}`}>
          <div className="flex items-center justify-between mb-2">
            <stat.icon className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-primary">{stat.change}</span>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
