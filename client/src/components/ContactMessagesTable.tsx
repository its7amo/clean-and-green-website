import { useQuery, useMutation } from "@tanstack/react-query";
import type { ContactMessage } from "@shared/schema";
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
import { Trash2, Mail, Phone } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ContactMessagesTable() {
  const { toast } = useToast();

  const { data: messages, isLoading } = useQuery<ContactMessage[]>({
    queryKey: ["/api/contact-messages"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest("PATCH", `/api/contact-messages/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-messages"] });
      toast({
        title: "Status updated",
        description: "Message status has been updated",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/contact-messages/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-messages"] });
      toast({
        title: "Message deleted",
        description: "Contact message has been deleted",
      });
    },
  });

  if (isLoading) {
    return <div>Loading messages...</div>;
  }

  const unreadCount = messages?.filter((m) => m.status === "unread").length || 0;
  const readCount = messages?.filter((m) => m.status === "read").length || 0;
  const archivedCount = messages?.filter((m) => m.status === "archived").length || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Unread Messages</CardDescription>
            <CardTitle className="text-3xl">{unreadCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Read Messages</CardDescription>
            <CardTitle className="text-3xl">{readCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Archived Messages</CardDescription>
            <CardTitle className="text-3xl">{archivedCount}</CardTitle>
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
                            <SelectItem value="unread">
                              <Badge variant="default">Unread</Badge>
                            </SelectItem>
                            <SelectItem value="read">
                              <Badge variant="secondary">Read</Badge>
                            </SelectItem>
                            <SelectItem value="archived">
                              <Badge variant="outline">Archived</Badge>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(message.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-message-${message.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
