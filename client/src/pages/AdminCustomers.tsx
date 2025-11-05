import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Booking, Quote } from "@shared/schema";
import { Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Customer = {
  name: string;
  email: string;
  phone: string;
  address: string;
  source: "booking" | "quote";
  date: string;
  id: string;
};

export default function AdminCustomers() {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: quotes = [], isLoading: quotesLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (customer: Customer) => {
      let actualId: string;
      let endpoint: string;
      
      if (customer.id.startsWith("booking-")) {
        actualId = customer.id.substring("booking-".length);
        endpoint = `/api/bookings/${actualId}`;
      } else if (customer.id.startsWith("quote-")) {
        actualId = customer.id.substring("quote-".length);
        endpoint = `/api/quotes/${actualId}`;
      } else {
        throw new Error("Invalid customer record type");
      }
      
      const res = await apiRequest("DELETE", endpoint);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      // DELETE endpoints return 204 with no body
      return res.status === 204 ? null : res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
      toast({
        title: "Customer record deleted",
        description: "The customer record has been removed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (customer: Customer) => {
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (customerToDelete) {
      deleteMutation.mutate(customerToDelete);
    }
  };

  const customers = useMemo<Customer[]>(() => {
    const bookingCustomers: Customer[] = bookings.map((booking) => ({
      name: booking.name,
      email: booking.email,
      phone: booking.phone,
      address: booking.address,
      source: "booking" as const,
      date: booking.createdAt ? new Date(booking.createdAt).toISOString() : new Date().toISOString(),
      id: `booking-${booking.id}`,
    }));

    const quoteCustomers: Customer[] = quotes.map((quote) => ({
      name: quote.name,
      email: quote.email,
      phone: quote.phone,
      address: quote.address,
      source: "quote" as const,
      date: quote.createdAt ? new Date(quote.createdAt).toISOString() : new Date().toISOString(),
      id: `quote-${quote.id}`,
    }));

    const allCustomers = [...bookingCustomers, ...quoteCustomers];
    
    // Sort by date descending (most recent first)
    return allCustomers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [bookings, quotes]);

  const isLoading = bookingsLoading || quotesLoading;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          Customers
        </h1>
        <Card>
            <CardHeader>
              <CardTitle>All Customers</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : customers.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground" data-testid="text-no-customers">
                  No customers found. Customers will appear here from bookings and quote requests.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`}>
                        <TableCell className="font-medium" data-testid={`text-customer-name-${customer.id}`}>
                          {customer.name}
                        </TableCell>
                        <TableCell data-testid={`text-customer-email-${customer.id}`}>
                          {customer.email}
                        </TableCell>
                        <TableCell data-testid={`text-customer-phone-${customer.id}`}>
                          {customer.phone}
                        </TableCell>
                        <TableCell className="max-w-xs truncate" data-testid={`text-customer-address-${customer.id}`}>
                          {customer.address}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={customer.source === "booking" ? "default" : "secondary"}
                            data-testid={`badge-source-${customer.id}`}
                          >
                            {customer.source === "booking" ? "Booking" : "Quote"}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`text-customer-date-${customer.id}`}>
                          {format(new Date(customer.date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(customer)}
                            data-testid={`button-delete-${customer.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {customerToDelete?.source} record for{" "}
              {customerToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
