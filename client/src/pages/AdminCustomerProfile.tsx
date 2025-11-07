import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2, Mail, Phone, MapPin, DollarSign, Calendar, Trash2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Booking, Quote, Invoice, CustomerNote, Customer } from "@shared/schema";
import { format } from "date-fns";

interface CustomerProfile {
  customer: Customer | null;
  bookings: Booking[];
  quotes: Quote[];
  invoices: Invoice[];
  notes: CustomerNote[];
  stats: {
    totalSpent: number;
    completedBookings: number;
    totalBookings: number;
    totalQuotes: number;
  };
}

export default function AdminCustomerProfile() {
  const params = useParams();
  const email = params.email as string;
  const [newNote, setNewNote] = useState("");
  const { toast } = useToast();

  const profileUrl = `/api/customers/${encodeURIComponent(email)}/profile`;

  const { data: profile, isLoading } = useQuery<CustomerProfile>({
    queryKey: [profileUrl],
  });

  const addNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      const res = await apiRequest("POST", `/api/customers/${encodeURIComponent(email)}/notes`, { note });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: [profileUrl] });
      setNewNote("");
      toast({ title: "Note added successfully" });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      await apiRequest("DELETE", `/api/customers/notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: [profileUrl] });
      toast({ title: "Note deleted" });
    },
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!profile) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Customer not found</p>
        </div>
      </AdminLayout>
    );
  }

  const { customer, bookings, quotes, invoices, notes, stats } = profile;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{customer?.name || "Customer"}</CardTitle>
                <CardDescription className="flex flex-col gap-1 mt-2">
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {email}
                  </span>
                  {customer?.phone && (
                    <span className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {customer.phone}
                    </span>
                  )}
                  {customer?.address && (
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {customer.address}
                    </span>
                  )}
                </CardDescription>
              </div>
              <Badge variant={stats.completedBookings > 5 ? "default" : "secondary"}>
                {stats.completedBookings > 10 ? "VIP" : stats.completedBookings > 5 ? "Regular" : "New"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <DollarSign className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">${(stats.totalSpent / 100).toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Total Spent</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <Calendar className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">{stats.completedBookings}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <Calendar className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">{stats.totalBookings}</p>
                <p className="text-xs text-muted-foreground">Total Bookings</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <Calendar className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">{stats.totalQuotes}</p>
                <p className="text-xs text-muted-foreground">Quotes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Notes</CardTitle>
              <CardDescription>Special requests, allergies, preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a note about this customer..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                  data-testid="input-customer-note"
                />
                <Button
                  onClick={() => addNoteMutation.mutate(newNote)}
                  disabled={!newNote.trim() || addNoteMutation.isPending}
                  data-testid="button-add-note"
                >
                  {addNoteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Add Note
                </Button>
              </div>

              <Separator />

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No notes yet</p>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="p-3 bg-muted/30 rounded-lg" data-testid={`note-${note.id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm">{note.note}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {note.createdByName} • {format(new Date(note.createdAt), "MMM d, yyyy")}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteNoteMutation.mutate(note.id)}
                          data-testid={`button-delete-note-${note.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Booking History</CardTitle>
              <CardDescription>{bookings.length} total bookings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {bookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No bookings yet</p>
                ) : (
                  bookings.map((booking) => (
                    <div key={booking.id} className="p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{booking.service}</p>
                          <p className="text-xs text-muted-foreground">{booking.date} at {booking.timeSlot}</p>
                        </div>
                        <Badge variant={
                          booking.status === 'completed' ? 'default' :
                          booking.status === 'confirmed' ? 'secondary' :
                          booking.status === 'cancelled' ? 'destructive' : 'outline'
                        }>
                          {booking.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
