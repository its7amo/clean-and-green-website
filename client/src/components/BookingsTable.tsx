import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle, XCircle } from "lucide-react";

const mockBookings = [
  { id: 1, customer: "Sarah Johnson", service: "Residential", date: "2024-11-10", time: "10:00 AM", status: "confirmed", amount: "$89" },
  { id: 2, customer: "Michael Roberts", service: "Commercial", date: "2024-11-12", time: "2:00 PM", status: "pending", amount: "$149" },
  { id: 3, customer: "Emily Davis", service: "Deep Cleaning", date: "2024-11-08", time: "8:00 AM", status: "completed", amount: "$199" },
  { id: 4, customer: "James Wilson", service: "Residential", date: "2024-11-15", time: "12:00 PM", status: "pending", amount: "$89" },
  { id: 5, customer: "Linda Brown", service: "Commercial", date: "2024-11-09", time: "4:00 PM", status: "completed", amount: "$149" },
];

const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  confirmed: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  completed: "bg-green-500/10 text-green-700 dark:text-green-400",
};

export function BookingsTable() {
  return (
    <Card>
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold">Recent Bookings</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Service
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Date & Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mockBookings.map((booking) => (
              <tr key={booking.id} className="hover-elevate" data-testid={`booking-row-${booking.id}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium">{booking.customer}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">{booking.service}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">{booking.date}</div>
                  <div className="text-xs text-muted-foreground">{booking.time}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge className={statusColors[booking.status as keyof typeof statusColors]}>
                    {booking.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium">{booking.amount}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" data-testid={`button-view-${booking.id}`}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {booking.status === "pending" && (
                      <>
                        <Button size="icon" variant="ghost" data-testid={`button-approve-${booking.id}`}>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button size="icon" variant="ghost" data-testid={`button-reject-${booking.id}`}>
                          <XCircle className="h-4 w-4 text-red-600" />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
