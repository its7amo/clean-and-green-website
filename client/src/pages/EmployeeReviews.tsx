import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Review, Employee } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useEmployeePermissions } from "@/hooks/use-employee-permissions";
import { EmployeeLayout } from "@/components/EmployeeLayout";
import { format } from "date-fns";
import { Star, CheckCircle, XCircle } from "lucide-react";

export default function EmployeeReviews() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { canView, canDelete, hasPermission, isLoading: permissionsLoading } = useEmployeePermissions();

  const { data: employee, isLoading: employeeLoading } = useQuery<Employee>({
    queryKey: ["/api/employee/auth/user"],
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery<Review[]>({
    queryKey: ["/api/employee/reviews"],
    enabled: !!employee && !permissionsLoading && canView("reviews"),
  });

  useEffect(() => {
    if (!employeeLoading && !employee) {
      setLocation("/employee/login");
    }
  }, [employee, employeeLoading, setLocation]);

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/employee/reviews/${id}/approve`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee/reviews"] });
      toast({ title: "Review approved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to approve review", variant: "destructive" });
    },
  });

  const denyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/employee/reviews/${id}/deny`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee/reviews"] });
      toast({ title: "Review denied successfully" });
    },
    onError: () => {
      toast({ title: "Failed to deny review", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/employee/reviews/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee/reviews"] });
      toast({ title: "Review deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete review", variant: "destructive" });
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

  if (!canView("reviews")) {
    return (
      <EmployeeLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                You don't have permission to view reviews.
              </p>
            </CardContent>
          </Card>
        </div>
      </EmployeeLayout>
    );
  }

  const canApprove = hasPermission("reviews", "approve");

  return (
    <EmployeeLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-2">
          <Star className="h-6 w-6 text-green-600" />
          <h1 className="text-2xl font-bold">Customer Reviews</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Review Moderation</CardTitle>
            <CardDescription>
              {canApprove ? "Review and moderate customer feedback" : "View customer reviews (read-only)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reviewsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading reviews...</div>
            ) : !reviews || reviews.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No reviews found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Status</TableHead>
                    {(canApprove || canDelete("reviews")) && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((review) => (
                    <TableRow key={review.id} data-testid={`row-review-${review.id}`}>
                      <TableCell>{format(review.createdAt, "MMM d, yyyy")}</TableCell>
                      <TableCell className="font-medium">{review.name}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {Array.from({ length: review.rating }).map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md truncate">{review.comment}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            review.approved ? "default" :
                            review.approved === false ? "destructive" :
                            "outline"
                          }
                        >
                          {review.approved ? "Approved" : review.approved === false ? "Denied" : "Pending"}
                        </Badge>
                      </TableCell>
                      {(canApprove || canDelete("reviews")) && (
                        <TableCell>
                          <div className="flex gap-2">
                            {canApprove && review.approved === null && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => approveMutation.mutate(review.id)}
                                  disabled={approveMutation.isPending}
                                  data-testid={`button-approve-${review.id}`}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => denyMutation.mutate(review.id)}
                                  disabled={denyMutation.isPending}
                                  data-testid={`button-deny-${review.id}`}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Deny
                                </Button>
                              </>
                            )}
                            {canDelete("reviews") && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this review?")) {
                                    deleteMutation.mutate(review.id);
                                  }
                                }}
                                disabled={deleteMutation.isPending}
                                data-testid={`button-delete-${review.id}`}
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
