import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AdminLayout } from "@/components/AdminLayout";
import type { Review } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Check, X, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminReviews() {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);

  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ["/api/reviews"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const endpoint = status === "approved" ? "approve" : "reject";
      return await apiRequest("PATCH", `/api/reviews/${id}/${endpoint}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/approved"] });
      toast({
        title: "Review updated",
        description: "Review status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update review",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/reviews/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/approved"] });
      setDeleteDialogOpen(false);
      setReviewToDelete(null);
      toast({
        title: "Review deleted",
        description: "Review has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete review",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (id: string) => {
    updateStatusMutation.mutate({ id, status: "approved" });
  };

  const handleReject = (id: string) => {
    updateStatusMutation.mutate({ id, status: "rejected" });
  };

  const handleDelete = () => {
    if (reviewToDelete) {
      deleteMutation.mutate(reviewToDelete);
    }
  };

  const confirmDelete = (id: string) => {
    setReviewToDelete(id);
    setDeleteDialogOpen(true);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted"
            }`}
          />
        ))}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge data-testid={`badge-status-approved`}>Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive" data-testid={`badge-status-rejected`}>Rejected</Badge>;
      default:
        return <Badge variant="secondary" data-testid={`badge-status-pending`}>Pending</Badge>;
    }
  };

  const pendingReviews = reviews.filter(r => r.status === "pending");
  const approvedReviews = reviews.filter(r => r.status === "approved");
  const rejectedReviews = reviews.filter(r => r.status === "rejected");

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold mb-6">Reviews</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-bold" data-testid="text-pending-count">{pendingReviews.length}</div>
            <div className="text-sm text-muted-foreground">Pending Reviews</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold" data-testid="text-approved-count">{approvedReviews.length}</div>
            <div className="text-sm text-muted-foreground">Approved Reviews</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold" data-testid="text-rejected-count">{rejectedReviews.length}</div>
            <div className="text-sm text-muted-foreground">Rejected Reviews</div>
          </Card>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6">
                <div className="space-y-4">
                  <div className="h-4 bg-muted rounded animate-pulse w-32" />
                  <div className="h-4 bg-muted rounded animate-pulse w-full" />
                  <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
                </div>
              </Card>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground" data-testid="text-no-reviews">No reviews yet</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id} className="p-6" data-testid={`review-${review.id}`}>
                <div className="flex justify-between items-start gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold" data-testid={`text-customer-name-${review.id}`}>
                        {review.customerName}
                      </h3>
                      {getStatusBadge(review.status)}
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid={`text-customer-email-${review.id}`}>
                      {review.customerEmail}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {renderStars(review.rating)}
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(review.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-muted-foreground mb-4" data-testid={`text-review-comment-${review.id}`}>
                  "{review.comment}"
                </p>

                {review.bookingId && (
                  <p className="text-xs text-muted-foreground mb-4">
                    Booking ID: {review.bookingId}
                  </p>
                )}

                <div className="flex gap-2">
                  {review.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(review.id)}
                        disabled={updateStatusMutation.isPending}
                        data-testid={`button-approve-${review.id}`}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(review.id)}
                        disabled={updateStatusMutation.isPending}
                        data-testid={`button-reject-${review.id}`}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                  {review.status === "approved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(review.id)}
                      disabled={updateStatusMutation.isPending}
                      data-testid={`button-unapprove-${review.id}`}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Unapprove
                    </Button>
                  )}
                  {review.status === "rejected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApprove(review.id)}
                      disabled={updateStatusMutation.isPending}
                      data-testid={`button-reapprove-${review.id}`}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => confirmDelete(review.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-${review.id}`}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent data-testid="dialog-delete-review">
          <DialogHeader>
            <DialogTitle>Delete Review</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
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
    </AdminLayout>
  );
}
