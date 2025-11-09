import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, CheckCircle, XCircle, Trash2, Search, Calendar, Image as ImageIcon, X } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Quote, QuotePhoto } from "@shared/schema";

const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  approved: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  completed: "bg-green-500/10 text-green-700 dark:text-green-400",
};

export function QuotesTable() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [viewDialogOpen, setViewDialogOpen] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState<string | null>(null);
  const [enlargedPhoto, setEnlargedPhoto] = useState<QuotePhoto | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [approvalData, setApprovalData] = useState({ date: "", timeSlot: "" });

  const { data: quotes, isLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  const { data: photos = [], isLoading: photosLoading } = useQuery<QuotePhoto[]>({
    queryKey: [`/api/quotes/${viewDialogOpen}/photos`],
    enabled: !!viewDialogOpen,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, date, timeSlot }: { id: string; status: string; date?: string; timeSlot?: string }) => {
      const payload: any = { status };
      if (date) payload.date = date;
      if (timeSlot) payload.timeSlot = timeSlot;
      const res = await apiRequest("PATCH", `/api/quotes/${id}/status`, payload);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update quote status");
      }
      return { ...await res.json(), requestedStatus: status };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      setApproveDialogOpen(null);
      setApprovalData({ date: "", timeSlot: "" });
      
      const messages = {
        approved: {
          title: "Quote approved",
          description: "Quote has been approved and converted to a booking.",
        },
        rejected: {
          title: "Quote rejected",
          description: "Quote has been rejected.",
        },
        completed: {
          title: "Quote completed",
          description: "Quote has been marked as completed.",
        },
      };
      
      const message = messages[data.requestedStatus as keyof typeof messages] || {
        title: "Quote updated",
        description: "Quote status has been updated.",
      };
      
      toast(message);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update quote",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/quotes/${id}`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      setDeleteDialogOpen(null);
      toast({
        title: "Quote deleted",
        description: "Quote request has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete quote",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = (id: string, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleApproveQuote = () => {
    if (!approveDialogOpen || !approvalData.date || !approvalData.timeSlot) {
      toast({
        title: "Missing required fields",
        description: "Please select both date and time slot",
        variant: "destructive",
      });
      return;
    }
    updateStatusMutation.mutate({
      id: approveDialogOpen,
      status: "approved",
      date: approvalData.date,
      timeSlot: approvalData.timeSlot,
    });
  };

  const handleDelete = () => {
    if (deleteDialogOpen) {
      deleteMutation.mutate(deleteDialogOpen);
    }
  };

  const handleConvertToBooking = (quote: Quote) => {
    const params = new URLSearchParams({
      fromQuote: "true",
      quoteId: quote.id,
      name: quote.name,
      email: quote.email,
      phone: quote.phone || "",
      address: quote.address || "",
      service: quote.serviceType,
      propertySize: quote.propertySize,
    });
    setLocation(`/book?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Loading quotes...</p>
      </Card>
    );
  }

  const filteredQuotes = quotes?.filter(quote =>
    quote.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    quote.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (quote.phone && quote.phone.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (quote.address && quote.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
    quote.serviceType.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (!quotes || quotes.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No quote requests yet</p>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Quote Requests</h3>
        </div>
        <div className="p-6 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer name, email, phone, address, or service type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
              data-testid="input-search-quotes"
            />
          </div>
        </div>
        {filteredQuotes.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground" data-testid="text-no-quotes">
              {searchQuery ? "No quotes match your search." : "No quote requests yet"}
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
                    Service Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Property Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
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
                {filteredQuotes.map((quote) => (
                  <tr key={quote.id} className="hover-elevate" data-testid={`quote-row-${quote.id}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium">{quote.name}</div>
                      <div className="text-xs text-muted-foreground">{quote.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm max-w-xs">{quote.serviceType}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">{quote.propertySize}</div>
                      {quote.customSize && (
                        <div className="text-xs text-muted-foreground">{quote.customSize} sq ft</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={statusColors[quote.status as keyof typeof statusColors]}>
                        {quote.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">{quote.phone}</div>
                      <div className="text-xs text-muted-foreground">{quote.address}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => setViewDialogOpen(quote.id)}
                          data-testid={`button-view-quote-${quote.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {quote.status === "pending" && (
                          <>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => setApproveDialogOpen(quote.id)}
                              data-testid={`button-approve-quote-${quote.id}`}
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => handleStatusUpdate(quote.id, "rejected")}
                              data-testid={`button-reject-quote-${quote.id}`}
                            >
                              <XCircle className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}
                        {(quote.status === "pending" || quote.status === "approved") && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => handleConvertToBooking(quote)}
                            data-testid={`button-convert-quote-${quote.id}`}
                            title="Convert to Booking"
                          >
                            <Calendar className="h-4 w-4 text-blue-600" />
                          </Button>
                        )}
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => setDeleteDialogOpen(quote.id)}
                          data-testid={`button-delete-quote-${quote.id}`}
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

      {/* View Quote Dialog */}
      <Dialog open={viewDialogOpen !== null} onOpenChange={(open) => !open && setViewDialogOpen(null)}>
        <DialogContent className="max-w-full sm:max-w-2xl" data-testid="dialog-view-quote">
          <DialogHeader>
            <DialogTitle>Quote Request Details</DialogTitle>
            <DialogDescription>
              View complete quote request information and customer details
            </DialogDescription>
          </DialogHeader>
          {viewDialogOpen && quotes?.find(q => q.id === viewDialogOpen) && (() => {
            const quote = quotes.find(q => q.id === viewDialogOpen)!;
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Customer Name</p>
                    <p className="font-medium" data-testid="view-quote-name">{quote.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={statusColors[quote.status as keyof typeof statusColors]} data-testid="view-quote-status">
                      {quote.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p data-testid="view-quote-email">{quote.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p data-testid="view-quote-phone">{quote.phone}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p data-testid="view-quote-address">{quote.address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Service Type</p>
                    <p className="font-medium" data-testid="view-quote-service">{quote.serviceType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Property Size</p>
                    <p data-testid="view-quote-property">{quote.propertySize}</p>
                  </div>
                  {quote.customSize && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Custom Size</p>
                      <p data-testid="view-quote-custom-size">{quote.customSize} sq ft</p>
                    </div>
                  )}
                  {quote.details && (
                    <div className="col-span-2 pt-2 border-t">
                      <p className="text-sm text-muted-foreground">Additional Details</p>
                      <p className="mt-1" data-testid="view-quote-details">{quote.details}</p>
                    </div>
                  )}
                  <div className="col-span-2 pt-2 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Property Photos</p>
                    {photosLoading ? (
                      <p className="text-sm text-muted-foreground">Loading photos...</p>
                    ) : photos.length === 0 ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ImageIcon className="h-4 w-4" />
                        <span>No photos attached</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-auto">
                        {photos.map((photo) => (
                          <button
                            key={photo.id}
                            onClick={() => setEnlargedPhoto(photo)}
                            className="relative rounded-md overflow-hidden hover-elevate"
                            data-testid={`button-view-photo-${photo.id}`}
                          >
                            <img
                              src={photo.photoData}
                              alt={photo.originalName || "Property photo"}
                              className="object-cover w-full max-h-48 rounded-md"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Approve Quote Dialog */}
      <Dialog open={approveDialogOpen !== null} onOpenChange={(open) => {
        if (!open) {
          setApproveDialogOpen(null);
          setApprovalData({ date: "", timeSlot: "" });
        }
      }}>
        <DialogContent className="max-w-full sm:max-w-md" data-testid="dialog-approve-quote">
          <DialogHeader>
            <DialogTitle>Approve Quote & Create Booking</DialogTitle>
            <DialogDescription>
              Select a date and time slot to approve this quote and convert it to a booking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="approval-date">Date *</Label>
              <Input
                id="approval-date"
                type="date"
                value={approvalData.date}
                onChange={(e) => setApprovalData({ ...approvalData, date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                data-testid="input-approval-date"
              />
            </div>
            <div>
              <Label htmlFor="approval-time">Time Slot *</Label>
              <Select
                value={approvalData.timeSlot}
                onValueChange={(value) => setApprovalData({ ...approvalData, timeSlot: value })}
              >
                <SelectTrigger id="approval-time" data-testid="select-approval-time">
                  <SelectValue placeholder="Select time slot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="8:00 AM - 10:00 AM">8:00 AM - 10:00 AM</SelectItem>
                  <SelectItem value="10:00 AM - 12:00 PM">10:00 AM - 12:00 PM</SelectItem>
                  <SelectItem value="12:00 PM - 2:00 PM">12:00 PM - 2:00 PM</SelectItem>
                  <SelectItem value="2:00 PM - 4:00 PM">2:00 PM - 4:00 PM</SelectItem>
                  <SelectItem value="4:00 PM - 6:00 PM">4:00 PM - 6:00 PM</SelectItem>
                  <SelectItem value="6:00 PM - 8:00 PM">6:00 PM - 8:00 PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setApproveDialogOpen(null);
                setApprovalData({ date: "", timeSlot: "" });
              }}
              data-testid="button-cancel-approve"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApproveQuote}
              disabled={updateStatusMutation.isPending || !approvalData.date || !approvalData.timeSlot}
              data-testid="button-confirm-approve"
            >
              {updateStatusMutation.isPending ? "Approving..." : "Approve & Create Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Quote Dialog */}
      <Dialog open={deleteDialogOpen !== null} onOpenChange={(open) => !open && setDeleteDialogOpen(null)}>
        <DialogContent className="max-w-full sm:max-w-md" data-testid="dialog-delete-quote">
          <DialogHeader>
            <DialogTitle>Delete Quote</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this quote request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(null)}
              data-testid="button-cancel-delete-quote"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-quote"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enlarged Photo Dialog */}
      <Dialog open={enlargedPhoto !== null} onOpenChange={(open) => !open && setEnlargedPhoto(null)}>
        <DialogContent className="max-w-full sm:max-w-4xl" data-testid="dialog-enlarged-photo">
          <DialogHeader>
            <DialogTitle>Property Photo</DialogTitle>
            <button
              onClick={() => setEnlargedPhoto(null)}
              className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
              data-testid="button-close-photo"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogHeader>
          {enlargedPhoto && (
            <div className="space-y-4">
              <img
                src={enlargedPhoto.photoData}
                alt={enlargedPhoto.originalName || "Property photo"}
                className="w-full h-auto rounded-md"
                data-testid="img-enlarged-photo"
              />
              {enlargedPhoto.originalName && (
                <p className="text-sm text-muted-foreground">
                  {enlargedPhoto.originalName}
                </p>
              )}
              <div className="flex gap-2">
                <a
                  href={enlargedPhoto.photoData}
                  download={enlargedPhoto.originalName || "property-photo"}
                  className="inline-flex"
                >
                  <Button variant="outline" data-testid="button-download-photo">
                    Download
                  </Button>
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
