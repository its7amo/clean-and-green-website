import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Booking, Employee } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useEmployeePermissions } from "@/hooks/use-employee-permissions";
import { EmployeeLayout } from "@/components/EmployeeLayout";
import { format, parseISO } from "date-fns";
import { Calendar } from "lucide-react";

export default function EmployeeBookings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { canView, canEdit, canDelete, isLoading: permissionsLoading } = useEmployeePermissions();

  const { data: employee, isLoading: employeeLoading } = useQuery<Employee>({
    queryKey: ["/api/employee/auth/user"],
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/employee/all-bookings"],
    enabled: !!employee && !permissionsLoading && canView("bookings"),
  });

  useEffect(() => {
    if (!employeeLoading && !employee) {
      setLocation("/employee/login");
    }
  }, [employee, employeeLoading, setLocation]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/employee/bookings/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee/all-bookings"] });
      toast({ title: "Booking status updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update booking status", variant: "destructive" });
    },
  });

  const deleteBookingMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/employee/bookings/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee/all-bookings"] });
      toast({ title: "Booking deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete booking", variant: "destructive" });
    },
  });

  if (employeeLoading || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!employee) {
    return null;
  }

  if (!canView("bookings")) {
    return (
      <EmployeeLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                You don't have permission to view bookings.
              </p>
            </CardContent>
          </Card>
        </div>
      </EmployeeLayout>
    );
  }

  return (
    <EmployeeLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6 text-green-600" />
          <h1 className="text-2xl font-bold">Bookings Management</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Bookings</CardTitle>
            <CardDescription>
              {canEdit("bookings") ? "View and manage all bookings" : "View all bookings (read-only)"}
            </CardDescription>
            {/* DEBUG: Show current permissions */}
            <div className="mt-2 p-2 bg-muted rounded text-xs">
              <strong>Debug - Your Permissions:</strong>
              <br />
              View: {canView("bookings") ? "✓" : "✗"}
              {" | "}
              Edit: {canEdit("bookings") ? "✓" : "✗"}
              {" | "}
              Delete: {canDelete("bookings") ? "✓" : "✗"}
            </div>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading bookings...</div>
            ) : !bookings || bookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No bookings found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    {(canEdit("bookings") || canDelete("bookings")) && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id} data-testid={`row-booking-${booking.id}`}>
                      <TableCell>{format(parseISO(booking.date), "MMM d, yyyy")}</TableCell>
                      <TableCell>{booking.timeSlot}</TableCell>
                      <TableCell>{booking.service}</TableCell>
                      <TableCell>{booking.name}</TableCell>
                      <TableCell>{booking.phone}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            booking.status === "confirmed" ? "default" :
                            booking.status === "completed" ? "secondary" :
                            "outline"
                          }
                        >
                          {booking.status}
                        </Badge>
                      </TableCell>
                      {(canEdit("bookings") || canDelete("bookings")) && (
                        <TableCell>
                          <div className="flex gap-2">
                            {canEdit("bookings") && booking.status === "pending" && (
                              <Button
                                size="sm"
                                onClick={() => updateStatusMutation.mutate({ id: booking.id, status: "confirmed" })}
                                disabled={updateStatusMutation.isPending}
                                data-testid={`button-confirm-${booking.id}`}
                              >
                                Confirm
                              </Button>
                            )}
                            {canEdit("bookings") && booking.status === "confirmed" && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => updateStatusMutation.mutate({ id: booking.id, status: "completed" })}
                                disabled={updateStatusMutation.isPending}
                                data-testid={`button-complete-${booking.id}`}
                              >
                                Complete
                              </Button>
                            )}
                            {canDelete("bookings") && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this booking?")) {
                                    deleteBookingMutation.mutate(booking.id);
                                  }
                                }}
                                disabled={deleteBookingMutation.isPending}
                                data-testid={`button-delete-${booking.id}`}
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
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
