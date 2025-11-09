import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  AlertCircle,
  MessageSquare,
  FileText,
  Calendar,
  Users,
  Star,
  DollarSign,
} from "lucide-react";

interface QuickActionsCounts {
  unreadMessages: number;
  pendingQuotes: number;
  pendingBookings: number;
  atRiskCustomers: number;
  openAlerts: number;
  pendingReviews: number;
  overdueInvoices: number;
}

export function QuickActions() {
  const { data: counts, isLoading } = useQuery<QuickActionsCounts>({
    queryKey: ["/api/quick-actions"],
  });

  if (isLoading) {
    return (
      <Card className="p-6" data-testid="quick-actions-loading">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="text-sm text-muted-foreground">Loading...</div>
      </Card>
    );
  }

  const actions = [
    {
      id: "unread-messages",
      label: "Unread Messages",
      count: counts?.unreadMessages || 0,
      icon: MessageSquare,
      href: "/admin/messages?filter=unread",
      variant: "default" as const,
      show: (counts?.unreadMessages || 0) > 0,
    },
    {
      id: "pending-quotes",
      label: "Pending Quotes",
      count: counts?.pendingQuotes || 0,
      icon: FileText,
      href: "/admin/quotes?filter=pending",
      variant: "default" as const,
      show: (counts?.pendingQuotes || 0) > 0,
    },
    {
      id: "pending-bookings",
      label: "Pending Bookings",
      count: counts?.pendingBookings || 0,
      icon: Calendar,
      href: "/admin/bookings?filter=pending",
      variant: "default" as const,
      show: (counts?.pendingBookings || 0) > 0,
    },
    {
      id: "at-risk-customers",
      label: "At-Risk Customers",
      count: counts?.atRiskCustomers || 0,
      icon: Users,
      href: "/admin/customers?filter=at-risk",
      variant: "destructive" as const,
      show: (counts?.atRiskCustomers || 0) > 0,
    },
    {
      id: "open-alerts",
      label: "Anomaly Alerts",
      count: counts?.openAlerts || 0,
      icon: AlertCircle,
      href: "/admin/alerts",
      variant: "destructive" as const,
      show: (counts?.openAlerts || 0) > 0,
    },
    {
      id: "pending-reviews",
      label: "Pending Reviews",
      count: counts?.pendingReviews || 0,
      icon: Star,
      href: "/admin/reviews?filter=pending",
      variant: "default" as const,
      show: (counts?.pendingReviews || 0) > 0,
    },
    {
      id: "overdue-invoices",
      label: "Overdue Invoices",
      count: counts?.overdueInvoices || 0,
      icon: DollarSign,
      href: "/admin/invoices?filter=overdue",
      variant: "destructive" as const,
      show: (counts?.overdueInvoices || 0) > 0,
    },
  ];

  const visibleActions = actions.filter((action) => action.show);

  if (visibleActions.length === 0) {
    return (
      <Card className="p-6" data-testid="quick-actions-empty">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="text-sm text-muted-foreground">
          All caught up! No pending actions at this time.
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6" data-testid="quick-actions">
      <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {visibleActions.map((action) => (
          <Link key={action.id} href={action.href}>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3"
              data-testid={`quick-action-${action.id}`}
            >
              <action.icon className="h-5 w-5 flex-shrink-0" />
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">{action.label}</div>
              </div>
              <Badge variant={action.variant} data-testid={`badge-${action.id}`}>
                {action.count}
              </Badge>
            </Button>
          </Link>
        ))}
      </div>
    </Card>
  );
}
