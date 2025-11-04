import { useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { AdminSidebar } from "@/components/AdminSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Booking, Quote } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

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
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [isAuthenticated, authLoading]);

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    enabled: isAuthenticated,
  });

  const { data: quotes = [], isLoading: quotesLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
    enabled: isAuthenticated,
  });

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

  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen">
      <AdminSidebar />

      <div className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 bg-background border-b">
          <div className="flex items-center justify-between p-4">
            <h1 className="text-2xl font-bold" data-testid="text-page-title">
              Customers
            </h1>
            <ThemeToggle />
          </div>
        </header>

        <main className="p-8">
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
