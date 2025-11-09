import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Check,
  X,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AnomalyAlert {
  id: string;
  type: string;
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  payload?: Record<string, any>;
  triggeredBy?: string;
  status: "open" | "acknowledged" | "resolved";
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

export default function AdminAlerts() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | "open" | "acknowledged">("open");
  const [deleteAlertId, setDeleteAlertId] = useState<string | null>(null);

  const { data: alerts, isLoading } = useQuery<AnomalyAlert[]>({
    queryKey: ["/api/alerts", filter === "all" ? undefined : filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter !== "all") {
        params.append("status", filter);
      }
      const url = `/api/alerts${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url, {
        credentials: "include",
        headers: {
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch alerts");
      return response.json();
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/alerts/${id}/acknowledge`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quick-actions"] });
      toast({ title: "Alert acknowledged" });
    },
    onError: () => {
      toast({
        title: "Failed to acknowledge alert",
        variant: "destructive",
      });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/alerts/${id}/resolve`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quick-actions"] });
      toast({ title: "Alert resolved" });
    },
    onError: () => {
      toast({
        title: "Failed to resolve alert",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/alerts/${id}`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quick-actions"] });
      toast({ title: "Alert deleted" });
      setDeleteAlertId(null);
    },
    onError: () => {
      toast({
        title: "Failed to delete alert",
        variant: "destructive",
      });
    },
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "high":
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case "medium":
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      high: "destructive",
      medium: "default",
      low: "secondary",
    } as const;
    return variants[severity as keyof typeof variants] || "secondary";
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      open: "destructive",
      acknowledged: "default",
      resolved: "secondary",
    } as const;
    return variants[status as keyof typeof variants] || "secondary";
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      bulk_promo_creation: "Bulk Promo Creation",
      large_invoice_change: "Large Invoice Change",
      mass_cancellations: "Mass Cancellations",
      bulk_deletions: "Bulk Deletions",
    };
    return labels[type] || type;
  };

  return (
    <AdminLayout>
      <div className="space-y-6" data-testid="page-admin-alerts">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Anomaly Alerts</h1>
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
              data-testid="filter-all"
            >
              All
            </Button>
            <Button
              variant={filter === "open" ? "default" : "outline"}
              onClick={() => setFilter("open")}
              data-testid="filter-open"
            >
              Open
            </Button>
            <Button
              variant={filter === "acknowledged" ? "default" : "outline"}
              onClick={() => setFilter("acknowledged")}
              data-testid="filter-acknowledged"
            >
              Acknowledged
            </Button>
          </div>
        </div>

        {isLoading ? (
          <Card className="p-6">
            <div className="text-center text-muted-foreground">Loading alerts...</div>
          </Card>
        ) : !alerts || alerts.length === 0 ? (
          <Card className="p-6" data-testid="alerts-empty">
            <div className="text-center text-muted-foreground">
              No alerts found. Your system is running smoothly!
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <Card key={alert.id} className="p-6" data-testid={`alert-${alert.id}`}>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {getSeverityIcon(alert.severity)}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg" data-testid={`alert-title-${alert.id}`}>
                          {alert.title}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={getSeverityBadge(alert.severity)} data-testid={`badge-severity-${alert.id}`}>
                            {alert.severity}
                          </Badge>
                          <Badge variant={getStatusBadge(alert.status)} data-testid={`badge-status-${alert.id}`}>
                            {alert.status}
                          </Badge>
                          <Badge variant="outline" data-testid={`badge-type-${alert.id}`}>
                            {getTypeLabel(alert.type)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(alert.createdAt), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {alert.status === "open" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => acknowledgeMutation.mutate(alert.id)}
                            disabled={acknowledgeMutation.isPending}
                            data-testid={`button-acknowledge-${alert.id}`}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Acknowledge
                          </Button>
                        )}
                        {(alert.status === "open" || alert.status === "acknowledged") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resolveMutation.mutate(alert.id)}
                            disabled={resolveMutation.isPending}
                            data-testid={`button-resolve-${alert.id}`}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Resolve
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteAlertId(alert.id)}
                          data-testid={`button-delete-${alert.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid={`alert-description-${alert.id}`}>
                      {alert.description}
                    </p>
                    {alert.payload && Object.keys(alert.payload).length > 0 && (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          View Details
                        </summary>
                        <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto">
                          {JSON.stringify(alert.payload, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteAlertId} onOpenChange={() => setDeleteAlertId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Alert</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this alert? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAlertId && deleteMutation.mutate(deleteAlertId)}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
