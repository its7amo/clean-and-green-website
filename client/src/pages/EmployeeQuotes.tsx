import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Quote, Employee } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useEmployeePermissions } from "@/hooks/use-employee-permissions";
import { EmployeeLayout } from "@/components/EmployeeLayout";
import { format } from "date-fns";
import { FileText } from "lucide-react";

export default function EmployeeQuotes() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { canView, canEdit, canDelete, isLoading: permissionsLoading } = useEmployeePermissions();

  const { data: employee, isLoading: employeeLoading } = useQuery<Employee>({
    queryKey: ["/api/employee/auth/user"],
  });

  const { data: quotes, isLoading: quotesLoading } = useQuery<Quote[]>({
    queryKey: ["/api/employee/quotes"],
    enabled: !!employee && !permissionsLoading && canView("quotes"),
  });

  useEffect(() => {
    if (!employeeLoading && !employee) {
      setLocation("/employee/login");
    }
  }, [employee, employeeLoading, setLocation]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/employee/quotes/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee/quotes"] });
      toast({ title: "Quote status updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update quote status", variant: "destructive" });
    },
  });

  const deleteQuoteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/employee/quotes/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee/quotes"] });
      toast({ title: "Quote deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete quote", variant: "destructive" });
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

  if (!canView("quotes")) {
    return (
      <EmployeeLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                You don't have permission to view quotes.
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
          <FileText className="h-6 w-6 text-green-600" />
          <h1 className="text-2xl font-bold">Quotes Management</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Quotes</CardTitle>
            <CardDescription>
              {canEdit("quotes") ? "View and manage quote requests" : "View quote requests (read-only)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {quotesLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading quotes...</div>
            ) : !quotes || quotes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No quotes found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Property Size</TableHead>
                    <TableHead>Status</TableHead>
                    {(canEdit("quotes") || canDelete("quotes")) && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((quote) => (
                    <TableRow key={quote.id} data-testid={`row-quote-${quote.id}`}>
                      <TableCell>{format(quote.createdAt, "MMM d, yyyy")}</TableCell>
                      <TableCell>{quote.serviceType}</TableCell>
                      <TableCell>{quote.name}</TableCell>
                      <TableCell>{quote.phone}</TableCell>
                      <TableCell>{quote.propertySize || quote.customSize}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            quote.status === "approved" ? "default" :
                            quote.status === "completed" ? "secondary" :
                            "outline"
                          }
                        >
                          {quote.status}
                        </Badge>
                      </TableCell>
                      {(canEdit("quotes") || canDelete("quotes")) && (
                        <TableCell>
                          <div className="flex gap-2">
                            {canEdit("quotes") && (
                              <Select
                                value={quote.status}
                                onValueChange={(newStatus) => updateStatusMutation.mutate({ id: quote.id, status: newStatus })}
                                disabled={updateStatusMutation.isPending}
                              >
                                <SelectTrigger className="w-32" data-testid={`select-status-${quote.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="approved">Approved</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            {canDelete("quotes") && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this quote?")) {
                                    deleteQuoteMutation.mutate(quote.id);
                                  }
                                }}
                                disabled={deleteQuoteMutation.isPending}
                                data-testid={`button-delete-${quote.id}`}
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
