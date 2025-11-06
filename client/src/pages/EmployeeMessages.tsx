import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ContactMessage, Employee } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useEmployeePermissions } from "@/hooks/use-employee-permissions";
import { EmployeeLayout } from "@/components/EmployeeLayout";
import { format } from "date-fns";
import { Mail } from "lucide-react";

export default function EmployeeMessages() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { canView, canEdit, canDelete, isLoading: permissionsLoading } = useEmployeePermissions();

  const { data: employee, isLoading: employeeLoading } = useQuery<Employee>({
    queryKey: ["/api/employee/auth/user"],
  });

  const { data: messages, isLoading: messagesLoading } = useQuery<ContactMessage[]>({
    queryKey: ["/api/employee/messages"],
    enabled: !!employee && !permissionsLoading && canView("messages"),
  });

  useEffect(() => {
    if (!employeeLoading && !employee) {
      setLocation("/employee/login");
    }
  }, [employee, employeeLoading, setLocation]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/employee/messages/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee/messages"] });
      toast({ title: "Message status updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update message status", variant: "destructive" });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/employee/messages/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee/messages"] });
      toast({ title: "Message deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete message", variant: "destructive" });
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

  if (!canView("messages")) {
    return (
      <EmployeeLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                You don't have permission to view contact messages.
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
          <Mail className="h-6 w-6 text-green-600" />
          <h1 className="text-2xl font-bold">Contact Messages</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Customer Inquiries</CardTitle>
            <CardDescription>
              {canEdit("messages") ? "View and manage customer messages" : "View customer messages (read-only)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {messagesLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading messages...</div>
            ) : !messages || messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No messages found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    {(canEdit("messages") || canDelete("messages")) && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((message) => (
                    <TableRow key={message.id} data-testid={`row-message-${message.id}`}>
                      <TableCell>{format(message.createdAt, "MMM d, yyyy")}</TableCell>
                      <TableCell className="font-medium">{message.name}</TableCell>
                      <TableCell>{message.email}</TableCell>
                      <TableCell>{message.phone}</TableCell>
                      <TableCell className="max-w-xs truncate">{message.subject}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            message.status === "read" ? "default" :
                            message.status === "archived" ? "secondary" :
                            "outline"
                          }
                        >
                          {message.status}
                        </Badge>
                      </TableCell>
                      {(canEdit("messages") || canDelete("messages")) && (
                        <TableCell>
                          <div className="flex gap-2">
                            {canEdit("messages") && (
                              <Select
                                value={message.status}
                                onValueChange={(newStatus) => updateStatusMutation.mutate({ id: message.id, status: newStatus })}
                                disabled={updateStatusMutation.isPending}
                              >
                                <SelectTrigger className="w-32" data-testid={`select-status-${message.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unread">Unread</SelectItem>
                                  <SelectItem value="read">Read</SelectItem>
                                  <SelectItem value="archived">Archived</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            {canDelete("messages") && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this message?")) {
                                    deleteMessageMutation.mutate(message.id);
                                  }
                                }}
                                disabled={deleteMessageMutation.isPending}
                                data-testid={`button-delete-${message.id}`}
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
