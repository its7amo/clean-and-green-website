import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AdminLayout } from "@/components/AdminLayout";
import type { NewsletterSubscriber } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Mail, Users } from "lucide-react";
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

export default function AdminNewsletter() {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subscriberToDelete, setSubscriberToDelete] = useState<string | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");

  const { data: subscribers = [], isLoading } = useQuery<NewsletterSubscriber[]>({
    queryKey: ["/api/newsletter/subscribers"],
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (data: { subject: string; htmlContent: string }) => {
      const response = await fetch("/api/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send newsletter");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Newsletter sent!",
        description: data.message || "Newsletter has been sent to all active subscribers.",
      });
      setSendDialogOpen(false);
      setEmailSubject("");
      setEmailContent("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send newsletter",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/newsletter/subscribers/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete subscriber");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/newsletter/subscribers"] });
      setDeleteDialogOpen(false);
      setSubscriberToDelete(null);
      toast({
        title: "Subscriber deleted",
        description: "Subscriber has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete subscriber",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (subscriberToDelete) {
      deleteMutation.mutate(subscriberToDelete);
    }
  };

  const confirmDelete = (id: string) => {
    setSubscriberToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleSendNewsletter = () => {
    if (!emailSubject.trim() || !emailContent.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both subject and content for the newsletter.",
        variant: "destructive",
      });
      return;
    }

    sendEmailMutation.mutate({
      subject: emailSubject,
      htmlContent: emailContent.replace(/\n/g, "<br>"),
    });
  };

  const activeSubscribers = subscribers.filter(s => s.active);
  const totalSubscribers = subscribers.length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Newsletter</h1>
          <Button
            onClick={() => setSendDialogOpen(true)}
            disabled={activeSubscribers.length === 0}
            data-testid="button-send-newsletter"
          >
            <Mail className="h-4 w-4 mr-2" />
            Send Newsletter
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold" data-testid="text-total-subscribers">{totalSubscribers}</div>
                <div className="text-sm text-muted-foreground">Total Subscribers</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Mail className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold" data-testid="text-active-subscribers">{activeSubscribers.length}</div>
                <div className="text-sm text-muted-foreground">Active Subscribers</div>
              </div>
            </div>
          </Card>
        </div>

        {isLoading ? (
          <Card className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded animate-pulse w-48" />
                    <div className="h-3 bg-muted rounded animate-pulse w-32" />
                  </div>
                  <div className="h-8 w-20 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          </Card>
        ) : subscribers.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground" data-testid="text-no-subscribers">
              No newsletter subscribers yet
            </p>
          </Card>
        ) : (
          <Card className="p-6">
            <div className="space-y-4">
              {subscribers.map((subscriber) => (
                <div
                  key={subscriber.id}
                  className="flex items-center justify-between pb-4 border-b last:border-0"
                  data-testid={`subscriber-${subscriber.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {subscriber.name && (
                        <p className="font-medium" data-testid={`text-name-${subscriber.id}`}>
                          {subscriber.name}
                        </p>
                      )}
                      {subscriber.active ? (
                        <Badge data-testid={`badge-active-${subscriber.id}`}>Active</Badge>
                      ) : (
                        <Badge variant="secondary" data-testid={`badge-inactive-${subscriber.id}`}>
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid={`text-email-${subscriber.id}`}>
                      {subscriber.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Subscribed: {format(new Date(subscriber.subscribedAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => confirmDelete(subscriber.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-${subscriber.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-send-newsletter">
          <DialogHeader>
            <DialogTitle>Send Newsletter</DialogTitle>
            <DialogDescription>
              Send an email to all {activeSubscribers.length} active subscribers
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="subject" className="block text-sm font-medium mb-2">
                Subject
              </label>
              <Input
                id="subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Newsletter subject..."
                data-testid="input-newsletter-subject"
              />
            </div>
            <div>
              <label htmlFor="content" className="block text-sm font-medium mb-2">
                Content
              </label>
              <Textarea
                id="content"
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                placeholder="Newsletter content..."
                rows={10}
                data-testid="textarea-newsletter-content"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSendDialogOpen(false)}
              data-testid="button-cancel-send"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendNewsletter}
              disabled={sendEmailMutation.isPending}
              data-testid="button-confirm-send"
            >
              {sendEmailMutation.isPending ? "Sending..." : "Send Newsletter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent data-testid="dialog-delete-subscriber">
          <DialogHeader>
            <DialogTitle>Delete Subscriber</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this subscriber? This action cannot be undone.
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
