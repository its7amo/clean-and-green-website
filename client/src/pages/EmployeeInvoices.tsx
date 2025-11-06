import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Invoice, Employee } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useEmployeePermissions } from "@/hooks/use-employee-permissions";
import { EmployeeLayout } from "@/components/EmployeeLayout";
import { format } from "date-fns";
import { FileText, Send } from "lucide-react";

export default function EmployeeInvoices() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { canView, hasPermission, isLoading: permissionsLoading } = useEmployeePermissions();

  const { data: employee, isLoading: employeeLoading } = useQuery<Employee>({
    queryKey: ["/api/employee/auth/user"],
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/employee/invoices"],
    enabled: !!employee && !permissionsLoading && canView("invoices"),
  });

  useEffect(() => {
    if (!employeeLoading && !employee) {
      setLocation("/employee/login");
    }
  }, [employee, employeeLoading, setLocation]);

  const sendPaymentLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/employee/invoices/${id}/send-payment-link`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee/invoices"] });
      toast({ title: "Payment link sent successfully" });
    },
    onError: () => {
      toast({ title: "Failed to send payment link", variant: "destructive" });
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

  if (!canView("invoices")) {
    return (
      <EmployeeLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                You don't have permission to view invoices.
              </p>
            </CardContent>
          </Card>
        </div>
      </EmployeeLayout>
    );
  }

  const canSendPaymentLink = hasPermission("invoices", "send_payment_link");

  return (
    <EmployeeLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-green-600" />
          <h1 className="text-2xl font-bold">Invoices</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Management</CardTitle>
            <CardDescription>
              {canSendPaymentLink ? "View invoices and send payment links" : "View invoices (read-only)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invoicesLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading invoices...</div>
            ) : !invoices || invoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No invoices found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    {canSendPaymentLink && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                      <TableCell>{format(invoice.createdAt, "MMM d, yyyy")}</TableCell>
                      <TableCell className="font-medium">{invoice.customerName}</TableCell>
                      <TableCell>${(invoice.amount / 100).toFixed(2)}</TableCell>
                      <TableCell>{invoice.dueDate ? format(invoice.dueDate, "MMM d, yyyy") : "N/A"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            invoice.status === "paid" ? "default" :
                            invoice.status === "sent" ? "outline" :
                            "secondary"
                          }
                        >
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      {canSendPaymentLink && (
                        <TableCell>
                          {invoice.status !== "paid" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => sendPaymentLinkMutation.mutate(invoice.id)}
                              disabled={sendPaymentLinkMutation.isPending}
                              data-testid={`button-send-link-${invoice.id}`}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Send Link
                            </Button>
                          )}
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
