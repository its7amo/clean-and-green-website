import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Quote } from "@shared/schema";

const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  approved: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  completed: "bg-green-500/10 text-green-700 dark:text-green-400",
};

export function QuotesTable() {
  const { toast } = useToast();
  const [viewDialogOpen, setViewDialogOpen] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);

  const { data: quotes, isLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/quotes/${id}/status`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
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

  const handleDelete = () => {
    if (deleteDialogOpen) {
      deleteMutation.mutate(deleteDialogOpen);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Loading quotes...</p>
      </Card>
    );
  }

  if (!quotes || quotes.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No quote requests yet</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold">Quote Requests</h3>
      </div>
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
            {quotes.map((quote) => (
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
                          onClick={() => handleStatusUpdate(quote.id, "approved")}
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

      {/* View Quote Dialog */}
      <Dialog open={viewDialogOpen !== null} onOpenChange={(open) => !open && setViewDialogOpen(null)}>
        <DialogContent data-testid="dialog-view-quote">
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
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen !== null} onOpenChange={(open) => !open && setDeleteDialogOpen(null)}>
        <DialogContent data-testid="dialog-delete-quote">
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
    </Card>
  );
}
