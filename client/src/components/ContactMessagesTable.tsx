import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { ContactMessage, Employee } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Mail, Phone, Reply, UserPlus } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ContactMessagesTable() {
  const { toast } = useToast();
  const [replyDialogOpen, setReplyDialogOpen] = useState<string | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const { data: messages, isLoading } = useQuery<ContactMessage[]>({
    queryKey: ["/api/contact-messages"],
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest("PATCH", `/api/messages/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quick-actions"] });
      toast({
        title: "Status updated",
        description: "Message status has been updated",
      });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ id, employeeId }: { id: string; employeeId: string }) => {
      const res = await apiRequest("PATCH", `/api/messages/${id}/assign`, { employeeId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quick-actions"] });
      toast({ title: "Employee assigned successfully" });
      setAssignDialogOpen(null);
      setSelectedEmployeeId("");
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({ id, replyMessage }: { id: string; replyMessage: string }) => {
      const res = await apiRequest("POST", `/api/messages/${id}/reply`, { replyMessage });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quick-actions"] });
      toast({ title: "Reply sent successfully" });
      setReplyDialogOpen(null);
      setReplyMessage("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/contact-messages/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quick-actions"] });
      toast({
        title: "Message deleted",
        description: "Contact message has been deleted",
      });
    },
  });

  if (isLoading) {
    return <div>Loading messages...</div>;
  }

  const newCount = messages?.filter((m) => m.status === "new").length || 0;
  const inProgressCount = messages?.filter((m) => m.status === "in_progress").length || 0;
  const repliedCount = messages?.filter((m) => m.status === "replied").length || 0;
  const closedCount = messages?.filter((m) => m.status === "closed").length || 0;

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "new":
        return "destructive";
      case "in_progress":
        return "default";
      case "replied":
        return "secondary";
      case "closed":
      case "spam":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>New Messages</CardDescription>
            <CardTitle className="text-3xl">{newCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>In Progress</CardDescription>
            <CardTitle className="text-3xl">{inProgressCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Replied</CardDescription>
            <CardTitle className="text-3xl">{repliedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Closed</CardDescription>
            <CardTitle className="text-3xl">{closedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Contact Messages</CardTitle>
          <CardDescription>
            Messages received from the contact form
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!messages || messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No contact messages yet
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((message) => (
                    <TableRow key={message.id} data-testid={`row-message-${message.id}`}>
                      <TableCell className="whitespace-nowrap" data-testid={`text-message-date-${message.id}`}>
                        {new Date(message.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-message-name-${message.id}`}>
                        {message.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <a
                              href={`mailto:${message.email}`}
                              className="text-primary hover:underline"
                              data-testid={`link-message-email-${message.id}`}
                            >
                              {message.email}
                            </a>
                          </div>
                          {message.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <a
                                href={`tel:${message.phone}`}
                                className="text-primary hover:underline"
                                data-testid={`link-message-phone-${message.id}`}
                              >
                                {message.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-message-content-${message.id}`}>
                          {message.message}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(message.status)} data-testid={`badge-message-status-${message.id}`}>
                          {message.status.replace("_", " ").toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Select
                            value={message.status}
                            onValueChange={(value) =>
                              updateStatusMutation.mutate({
                                id: message.id,
                                status: value,
                              })
                            }
                            disabled={updateStatusMutation.isPending}
                          >
                            <SelectTrigger className="w-32" data-testid={`select-message-status-${message.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="replied">Replied</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                              <SelectItem value="spam">Spam</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setAssignDialogOpen(message.id)}
                            data-testid={`button-assign-${message.id}`}
                            title="Assign to employee"
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setReplyDialogOpen(message.id)}
                            data-testid={`button-reply-${message.id}`}
                            title="Reply to message"
                          >
                            <Reply className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(message.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-message-${message.id}`}
                            title="Delete message"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Employee Dialog */}
      <Dialog open={!!assignDialogOpen} onOpenChange={() => setAssignDialogOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to Employee</DialogTitle>
            <DialogDescription>
              Assign this message to an employee for follow-up
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger data-testid="select-assign-employee">
                <SelectValue placeholder="Select employee..." />
              </SelectTrigger>
              <SelectContent>
                {employees?.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(null)} data-testid="button-cancel-assign">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (assignDialogOpen && selectedEmployeeId) {
                  assignMutation.mutate({ id: assignDialogOpen, employeeId: selectedEmployeeId });
                }
              }}
              disabled={!selectedEmployeeId || assignMutation.isPending}
              data-testid="button-confirm-assign"
            >
              {assignMutation.isPending ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={!!replyDialogOpen} onOpenChange={() => setReplyDialogOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to Message</DialogTitle>
            <DialogDescription>
              Send a reply to this contact message
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="Type your reply here..."
              rows={6}
              data-testid="textarea-reply-message"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialogOpen(null)} data-testid="button-cancel-reply">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (replyDialogOpen && replyMessage.trim()) {
                  replyMutation.mutate({ id: replyDialogOpen, replyMessage });
                }
              }}
              disabled={!replyMessage.trim() || replyMutation.isPending}
              data-testid="button-confirm-reply"
            >
              {replyMutation.isPending ? "Sending..." : "Send Reply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
