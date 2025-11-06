import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Booking, Employee } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, MapPin, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { EmployeeLayout } from "@/components/EmployeeLayout";

export default function EmployeeDashboard() {
  const [, setLocation] = useLocation();

  const { data: employee, isLoading: employeeLoading } = useQuery<Employee>({
    queryKey: ["/api/employee/auth/user"],
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/employee/bookings"],
    enabled: !!employee,
  });

  useEffect(() => {
    if (!employeeLoading && !employee) {
      setLocation("/employee/login");
    }
  }, [employee, employeeLoading, setLocation]);

  if (employeeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!employee) {
    return null;
  }

  const upcomingBookings = bookings?.filter(b => b.status !== "cancelled" && b.status !== "completed") || [];
  const completedBookings = bookings?.filter(b => b.status === "completed") || [];

  return (
    <EmployeeLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookings?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingBookings.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedBookings.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Assignments</CardTitle>
            <CardDescription>
              Upcoming cleaning jobs assigned to you
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading assignments...</div>
            ) : !bookings || bookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No assignments yet. Check back later!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id} data-testid={`row-booking-${booking.id}`}>
                      <TableCell>{format(parseISO(booking.date), "MMM d, yyyy")}</TableCell>
                      <TableCell>{booking.timeSlot}</TableCell>
                      <TableCell>{booking.service}</TableCell>
                      <TableCell>{booking.name}</TableCell>
                      <TableCell className="max-w-xs truncate">{booking.address}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            booking.status === "confirmed"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                              : booking.status === "completed"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                          }`}
                        >
                          {booking.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </EmployeeLayout>
  );
}
