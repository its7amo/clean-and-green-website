import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, CheckCircle, XCircle, Users, Trash2, Camera, DollarSign, Edit2, Search } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PhotoUpload } from "@/components/PhotoUpload";
import type { Booking, Employee, PromoCode } from "@shared/schema";

const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  confirmed: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  completed: "bg-green-500/10 text-green-700 dark:text-green-400",
};

const serviceNames: Record<string, string> = {
  residential: "Residential",
  commercial: "Commercial",
  deep: "Deep Cleaning",
};

export function BookingsTable() {
  const { toast } = useToast();
  const [viewDialogOpen, setViewDialogOpen] = useState<string | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState<string | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [actualPriceInput, setActualPriceInput] = useState<string>("");
  const [editingPromoCode, setEditingPromoCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: promoCodes = [] } = useQuery<PromoCode[]>({
    queryKey: ["/api/promo-codes"],
    enabled: viewDialogOpen !== null,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/bookings/${id}/status`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
  });

  const assignEmployeesMutation = useMutation({
    mutationFn: async ({ bookingId, employeeIds }: { bookingId: string; employeeIds: string[] }) => {
      const res = await apiRequest("PATCH", `/api/bookings/${bookingId}/assign`, { employeeIds });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setAssignDialogOpen(null);
      setSelectedEmployees([]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/bookings/${id}`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setDeleteDialogOpen(null);
      toast({
        title: "Booking deleted",
        description: "Booking has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete booking",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const updateActualPriceMutation = useMutation({
    mutationFn: async ({ bookingId, actualPrice }: { bookingId: string; actualPrice: number }) => {
      const res = await apiRequest("PATCH", `/api/bookings/${bookingId}/actual-price`, { actualPrice });
      return await res.json();
    },
    onSuccess: (updatedBooking) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setActualPriceInput("");
      toast({
        title: "Actual price updated",
        description: `Promo discount recalculated: $${((updatedBooking.discountAmount || 0) / 100).toFixed(2)}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update actual price",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const removePromoCodeMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await apiRequest("DELETE", `/api/bookings/${bookingId}/promo-code`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Promo code removed",
        description: "Promo code and discount have been removed from this booking.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove promo code",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const replacePromoCodeMutation = useMutation({
    mutationFn: async ({ bookingId, promoCode }: { bookingId: string; promoCode: string }) => {
      const res = await apiRequest("PATCH", `/api/bookings/${bookingId}/promo-code`, { promoCode });
      return await res.json();
    },
    onSuccess: (updatedBooking) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setEditingPromoCode(null);
      toast({
        title: "Promo code updated",
        description: `New discount: $${((updatedBooking.discountAmount || 0) / 100).toFixed(2)}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update promo code",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = (id: string, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleOpenAssignDialog = (booking: Booking) => {
    setSelectedEmployees(booking.assignedEmployeeIds || []);
    setAssignDialogOpen(booking.id);
  };

  const handleAssignEmployees = () => {
    if (assignDialogOpen) {
      assignEmployeesMutation.mutate({ bookingId: assignDialogOpen, employeeIds: selectedEmployees });
    }
  };

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId) ? prev.filter(id => id !== employeeId) : [...prev, employeeId]
    );
  };

  const handleDelete = () => {
    if (deleteDialogOpen) {
      deleteMutation.mutate(deleteDialogOpen);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Loading bookings...</p>
      </Card>
    );
  }

  const filteredBookings = bookings?.filter(booking =>
    booking.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    booking.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (booking.phone && booking.phone.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (booking.address && booking.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
    serviceNames[booking.service].toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (!bookings || bookings.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No bookings yet</p>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Recent Bookings</h3>
        </div>
        <div className="p-6 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer name, email, phone, address, or service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
              data-testid="input-search-bookings"
            />
          </div>
        </div>
        {filteredBookings.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground" data-testid="text-no-bookings">
              {searchQuery ? "No bookings match your search." : "No bookings yet"}
            </p>
          </div>
        ) : (
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
                Assigned
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredBookings.map((booking) => (
              <tr key={booking.id} className="hover-elevate" data-testid={`booking-row-${booking.id}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium">{booking.name}</div>
                  <div className="text-xs text-muted-foreground">{booking.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">{serviceNames[booking.service] || booking.service}</div>
                  <div className="text-xs text-muted-foreground">{booking.propertySize}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">{booking.date}</div>
                  <div className="text-xs text-muted-foreground">{booking.timeSlot}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge className={statusColors[booking.status as keyof typeof statusColors]}>
                    {booking.status}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <Dialog open={assignDialogOpen === booking.id} onOpenChange={(open) => !open && setAssignDialogOpen(null)}>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleOpenAssignDialog(booking)}
                        data-testid={`button-assign-${booking.id}`}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        {booking.assignedEmployeeIds?.length || 0}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Assign Employees</DialogTitle>
                        <DialogDescription>
                          Select employees to assign to this booking
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        {employees?.map((employee) => (
                          <div key={employee.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={employee.id}
                              checked={selectedEmployees.includes(employee.id)}
                              onCheckedChange={() => toggleEmployee(employee.id)}
                              data-testid={`checkbox-employee-${employee.id}`}
                            />
                            <label htmlFor={employee.id} className="text-sm font-medium leading-none">
                              {employee.name} ({employee.role})
                            </label>
                          </div>
                        ))}
                        {!employees || employees.length === 0 && (
                          <p className="text-sm text-muted-foreground">No employees available</p>
                        )}
                      </div>
                      <Button 
                        onClick={handleAssignEmployees} 
                        disabled={assignEmployeesMutation.isPending}
                        data-testid="button-save-assignment"
                      >
                        {assignEmployeesMutation.isPending ? "Saving..." : "Save Assignment"}
                      </Button>
                    </DialogContent>
                  </Dialog>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">{booking.phone}</div>
                  <div className="text-xs text-muted-foreground">{booking.address}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex gap-2">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => setViewDialogOpen(booking.id)}
                      data-testid={`button-view-${booking.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => {
                        setSelectedBookingId(booking.id);
                        setPhotoDialogOpen(true);
                      }}
                      data-testid={`button-photos-${booking.id}`}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                    {booking.status === "pending" && (
                      <>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleStatusUpdate(booking.id, "confirmed")}
                          data-testid={`button-approve-${booking.id}`}
                        >
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleStatusUpdate(booking.id, "cancelled")}
                          data-testid={`button-reject-${booking.id}`}
                        >
                          <XCircle className="h-4 w-4 text-red-600" />
                        </Button>
                      </>
                    )}
                    {booking.status === "confirmed" && (
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => handleStatusUpdate(booking.id, "completed")}
                        data-testid={`button-complete-${booking.id}`}
                      >
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </Button>
                    )}
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => setDeleteDialogOpen(booking.id)}
                      data-testid={`button-delete-${booking.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        )}
      </Card>

      {/* View Booking Dialog */}
      <Dialog open={viewDialogOpen !== null} onOpenChange={(open) => !open && setViewDialogOpen(null)}>
        <DialogContent data-testid="dialog-view-booking">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              View complete booking information and customer details
            </DialogDescription>
          </DialogHeader>
          {viewDialogOpen && bookings?.find(b => b.id === viewDialogOpen) && (() => {
            const booking = bookings.find(b => b.id === viewDialogOpen)!;
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Customer Name</p>
                    <p className="font-medium" data-testid="view-booking-name">{booking.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={statusColors[booking.status as keyof typeof statusColors]} data-testid="view-booking-status">
                      {booking.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p data-testid="view-booking-email">{booking.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p data-testid="view-booking-phone">{booking.phone}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p data-testid="view-booking-address">{booking.address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Service</p>
                    <p className="font-medium" data-testid="view-booking-service">{serviceNames[booking.service] || booking.service}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Property Size</p>
                    <p data-testid="view-booking-property">{booking.propertySize}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium" data-testid="view-booking-date">{booking.date}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Time</p>
                    <p data-testid="view-booking-time">{booking.timeSlot}</p>
                  </div>
                  {booking.assignedEmployeeIds && booking.assignedEmployeeIds.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Assigned Employees</p>
                      <p data-testid="view-booking-employees">{booking.assignedEmployeeIds.length} employee(s)</p>
                    </div>
                  )}
                  {booking.promoCode && (
                    <>
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">Promo Code</p>
                        {editingPromoCode === booking.id ? (
                          <div className="flex items-center gap-2">
                            <Select
                              value=""
                              onValueChange={(newPromoCode) => {
                                replacePromoCodeMutation.mutate({ bookingId: booking.id, promoCode: newPromoCode });
                              }}
                              disabled={replacePromoCodeMutation.isPending}
                            >
                              <SelectTrigger className="w-[200px]" data-testid="select-new-promo-code">
                                <SelectValue placeholder="Select new promo code" />
                              </SelectTrigger>
                              <SelectContent>
                                {promoCodes
                                  .filter(pc => pc.status === "active" && pc.code !== booking.promoCode)
                                  .map((pc) => (
                                    <SelectItem key={pc.id} value={pc.code}>
                                      {pc.code} ({pc.discountType === "percentage" ? `${pc.discountValue}%` : `$${pc.discountValue}`})
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingPromoCode(null)}
                              disabled={replacePromoCodeMutation.isPending}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" data-testid="view-booking-promo-code">{booking.promoCode}</Badge>
                            <span className="text-sm text-primary font-medium">
                              Discount: ${((booking.discountAmount || 0) / 100).toFixed(2)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingPromoCode(booking.id)}
                              data-testid="button-edit-promo"
                              title="Change promo code"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("Remove promo code from this booking? This will also remove the actual price if set.")) {
                                  removePromoCodeMutation.mutate(booking.id);
                                }
                              }}
                              disabled={removePromoCodeMutation.isPending}
                              data-testid="button-remove-promo"
                              title="Remove promo code"
                            >
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="col-span-2 p-4 border rounded-md bg-muted/30">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-primary" />
                            <h4 className="font-medium text-sm">Set Actual Quote Price</h4>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Since this booking has a promo code, enter the actual quoted price for this specific job. The discount will be recalculated automatically.
                          </p>
                          
                          {booking.actualPrice && (
                            <div className="space-y-2 p-3 bg-background/50 rounded-md border">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Current Actual Price:</span>
                                <span className="font-semibold">${(booking.actualPrice / 100).toFixed(2)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Promo Discount:</span>
                                <span className="font-semibold text-primary">-${((booking.discountAmount || 0) / 100).toFixed(2)}</span>
                              </div>
                              <div className="flex items-center justify-between pt-2 border-t">
                                <span className="text-sm font-medium">Final Price:</span>
                                <span className="font-bold text-lg">${((booking.actualPrice - (booking.discountAmount || 0)) / 100).toFixed(2)}</span>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <div className="flex-1">
                              <Label htmlFor="actual-price" className="text-xs">
                                {booking.actualPrice ? 'Update Actual Price ($)' : 'Actual Price ($)'}
                              </Label>
                              <Input
                                id="actual-price"
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder={booking.actualPrice ? (booking.actualPrice / 100).toFixed(2) : "150.00"}
                                value={actualPriceInput}
                                onChange={(e) => setActualPriceInput(e.target.value)}
                                data-testid="input-actual-price"
                              />
                            </div>
                            <div className="flex items-end">
                              <Button
                                size="sm"
                                onClick={() => {
                                  const price = parseFloat(actualPriceInput);
                                  if (price && price > 0) {
                                    updateActualPriceMutation.mutate({ bookingId: booking.id, actualPrice: price });
                                  }
                                }}
                                disabled={updateActualPriceMutation.isPending || !actualPriceInput || parseFloat(actualPriceInput) <= 0}
                                data-testid="button-save-actual-price"
                              >
                                {updateActualPriceMutation.isPending ? "Saving..." : "Save"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen !== null} onOpenChange={(open) => !open && setDeleteDialogOpen(null)}>
        <DialogContent data-testid="dialog-delete-booking">
          <DialogHeader>
            <DialogTitle>Delete Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this booking? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(null)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedBookingId && (
        <PhotoUpload
          bookingId={selectedBookingId}
          open={photoDialogOpen}
          onOpenChange={(open) => {
            setPhotoDialogOpen(open);
            if (!open) {
              setSelectedBookingId(null);
            }
          }}
        />
      )}
    </>
  );
}
