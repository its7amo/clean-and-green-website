import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { Clock, CheckCircle2, AlertTriangle, XCircle, CalendarClock } from "lucide-react";

interface RescheduleRequest {
  id: string;
  bookingId: string;
  originalDate: string;
  originalTimeSlot: string;
  requestedDate: string;
  requestedTimeSlot: string;
  customerNotes: string | null;
  status: "pending" | "approved" | "denied";
  decisionById: string | null;
  decisionReason: string | null;
  decisionAt: string | null;
  createdAt: string;
  booking: {
    name: string;
    email: string;
    phone: string | null;
    service: string;
    address: string;
  };
}

export default function AdminReschedules() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedRequest, setSelectedRequest] = useState<RescheduleRequest | null>(null);
  const [actionDialog, setActionDialog] = useState<"approve" | "deny" | null>(null);
  const [decisionReason, setDecisionReason] = useState("");

  const { data: requests, isLoading } = useQuery<RescheduleRequest[]>({
    queryKey: ["/api/admin/reschedule-requests"],
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/reschedule-requests/${id}/approve`, { reason });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to approve request");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reschedule-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setActionDialog(null);
      setSelectedRequest(null);
      setDecisionReason("");
      toast({
        title: "Request approved",
        description: "The reschedule request has been approved and the booking has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to approve",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const denyMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/reschedule-requests/${id}/deny`, { reason });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to deny request");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reschedule-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setActionDialog(null);
      setSelectedRequest(null);
      setDecisionReason("");
      toast({
        title: "Request denied",
        description: "The reschedule request has been denied and the customer has been notified.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to deny",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleApprove = () => {
    if (!selectedRequest) return;
    approveMutation.mutate({ id: selectedRequest.id, reason: decisionReason });
  };

  const handleDeny = () => {
    if (!selectedRequest) return;
    if (!decisionReason.trim()) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for denying this request.",
        variant: "destructive",
      });
      return;
    }
    denyMutation.mutate({ id: selectedRequest.id, reason: decisionReason });
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "MMM dd, yyyy");
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (date: Date | string | null | undefined) => {
    if (!date) return "N/A";
    try {
      return format(typeof date === "string" ? parseISO(date) : date, "MMM dd, yyyy h:mm a");
    } catch {
      return "N/A";
    }
  };

  const pendingRequests = requests?.filter((r) => r.status === "pending") || [];
  const approvedRequests = requests?.filter((r) => r.status === "approved") || [];
  const deniedRequests = requests?.filter((r) => r.status === "denied") || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return "default";
      case "approved":
        return "outline";
      case "denied":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Reschedule Requests</h1>
          <p className="text-muted-foreground mt-2">Review and approve customer reschedule requests</p>
        </div>

        {pendingRequests.length > 0 ? (
          <Alert className="border-amber-500/50 bg-amber-500/10" data-testid="alert-pending-requests">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            <AlertDescription className="text-amber-600 dark:text-amber-500">
              <strong>{pendingRequests.length} pending reschedule request{pendingRequests.length > 1 ? 's' : ''}</strong> requiring review
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-green-500/50 bg-green-500/10" data-testid="alert-no-pending-requests">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
            <AlertDescription className="text-green-600 dark:text-green-500">
              No pending reschedule requests
            </AlertDescription>
          </Alert>
        )}

        {pendingRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-amber-600" />
                Pending Requests
              </CardTitle>
              <CardDescription>
                Customer requests to reschedule their appointments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Current Date/Time</TableHead>
                      <TableHead>Requested Date/Time</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequests.map((request) => (
                      <TableRow key={request.id} data-testid={`request-row-${request.id}`}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{request.booking.name}</div>
                            <div className="text-sm text-muted-foreground">{request.booking.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{request.booking.service}</TableCell>
                        <TableCell>
                          <div>
                            <div>{formatDate(request.originalDate)}</div>
                            <div className="text-sm text-muted-foreground">{request.originalTimeSlot}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-blue-600 dark:text-blue-400">{formatDate(request.requestedDate)}</div>
                            <div className="text-sm font-medium text-blue-600 dark:text-blue-400">{request.requestedTimeSlot}</div>
                          </div>
                        </TableCell>
                        <TableCell>{formatDateTime(request.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRequest(request);
                                setActionDialog("approve");
                              }}
                              data-testid={`button-approve-${request.id}`}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedRequest(request);
                                setActionDialog("deny");
                              }}
                              data-testid={`button-deny-${request.id}`}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Deny
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pending ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="approved" data-testid="tab-approved">
              Approved ({approvedRequests.length})
            </TabsTrigger>
            <TabsTrigger value="denied" data-testid="tab-denied">
              Denied ({deniedRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingRequests.length === 0 && (
              <Card className="p-6">
                <p className="text-center text-muted-foreground" data-testid="text-no-pending">No pending requests</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {approvedRequests.length === 0 ? (
              <Card className="p-6">
                <p className="text-center text-muted-foreground" data-testid="text-no-approved">No approved requests</p>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Approved</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">{request.booking.name}</TableCell>
                          <TableCell>{request.booking.service}</TableCell>
                          <TableCell>
                            <div>
                              <div className="text-sm">{formatDate(request.originalDate)}</div>
                              <div className="text-xs text-muted-foreground">{request.originalTimeSlot}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="text-sm">{formatDate(request.requestedDate)}</div>
                              <div className="text-xs text-muted-foreground">{request.requestedTimeSlot}</div>
                            </div>
                          </TableCell>
                          <TableCell>{formatDateTime(request.decisionAt)}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadge(request.status)}>
                              {request.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="denied" className="space-y-4">
            {deniedRequests.length === 0 ? (
              <Card className="p-6">
                <p className="text-center text-muted-foreground" data-testid="text-no-denied">No denied requests</p>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Denied</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deniedRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">{request.booking.name}</TableCell>
                          <TableCell>{request.booking.service}</TableCell>
                          <TableCell>
                            <div>
                              <div className="text-sm">{formatDate(request.requestedDate)}</div>
                              <div className="text-xs text-muted-foreground">{request.requestedTimeSlot}</div>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{request.decisionReason || "N/A"}</TableCell>
                          <TableCell>{formatDateTime(request.decisionAt)}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadge(request.status)}>
                              {request.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Approve Dialog */}
      <Dialog open={actionDialog === "approve"} onOpenChange={(open) => {
        if (!open) {
          setActionDialog(null);
          setSelectedRequest(null);
          setDecisionReason("");
        }
      }}>
        <DialogContent data-testid="dialog-approve">
          <DialogHeader>
            <DialogTitle>Approve Reschedule Request</DialogTitle>
            <DialogDescription>
              Approve {selectedRequest?.booking.name}'s request to reschedule from{" "}
              {selectedRequest && formatDate(selectedRequest.originalDate)} {selectedRequest?.originalTimeSlot} to{" "}
              {selectedRequest && formatDate(selectedRequest.requestedDate)} {selectedRequest?.requestedTimeSlot}?
            </DialogDescription>
          </DialogHeader>
          {selectedRequest?.customerNotes && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer's Reason:</label>
              <div className="p-3 bg-muted rounded-md text-sm">
                {selectedRequest.customerNotes}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Internal Notes (Optional)</label>
            <Textarea
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              placeholder="Add internal notes about this approval..."
              rows={3}
              data-testid="textarea-approve-reason"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionDialog(null);
                setSelectedRequest(null);
                setDecisionReason("");
              }}
              data-testid="button-cancel-approve"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              data-testid="button-confirm-approve"
            >
              {approveMutation.isPending ? "Approving..." : "Approve Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deny Dialog */}
      <Dialog open={actionDialog === "deny"} onOpenChange={(open) => {
        if (!open) {
          setActionDialog(null);
          setSelectedRequest(null);
          setDecisionReason("");
        }
      }}>
        <DialogContent data-testid="dialog-deny">
          <DialogHeader>
            <DialogTitle>Deny Reschedule Request</DialogTitle>
            <DialogDescription>
              Deny {selectedRequest?.booking.name}'s request to reschedule? The customer will be notified.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest?.customerNotes && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer's Reason:</label>
              <div className="p-3 bg-muted rounded-md text-sm">
                {selectedRequest.customerNotes}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason for Denial <span className="text-destructive">*</span></label>
            <Textarea
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              placeholder="Explain why this request cannot be accommodated..."
              rows={3}
              required
              data-testid="textarea-deny-reason"
            />
          </div>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              The customer will receive an email explaining why their reschedule request was denied.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionDialog(null);
                setSelectedRequest(null);
                setDecisionReason("");
              }}
              data-testid="button-cancel-deny"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeny}
              disabled={denyMutation.isPending || !decisionReason.trim()}
              data-testid="button-confirm-deny"
            >
              {denyMutation.isPending ? "Denying..." : "Deny Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
