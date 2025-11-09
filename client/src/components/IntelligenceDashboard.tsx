import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import type { IntelligenceOverview } from "@shared/schema";

export function IntelligenceDashboard() {
  const { data, isLoading, error } = useQuery<IntelligenceOverview>({
    queryKey: ["/api/intelligence-overview"],
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <Card className="p-6" data-testid="intelligence-dashboard-loading">
        <h3 className="text-lg font-semibold mb-4">Intelligence Dashboard</h3>
        <div className="text-sm text-muted-foreground">Loading insights...</div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border-destructive bg-destructive/5" data-testid="intelligence-dashboard-error">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div>
            <h3 className="font-semibold text-destructive">Failed to Load Intelligence Data</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Unable to fetch business insights. Please try refreshing the page.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const hasCriticalAlerts =
    (data?.churnRisk.highRiskCount || 0) > 0 || (data?.anomalies.highSeverityCount || 0) > 0;

  return (
    <div className="space-y-6" data-testid="intelligence-dashboard">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Business Intelligence</h2>
        {data?.lastUpdated && (
          <span className="text-sm text-muted-foreground">
            Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          className={`${
            (data?.churnRisk.totalAtRisk || 0) > 0
              ? "border-destructive bg-destructive/5"
              : "border-border"
          }`}
          data-testid="widget-churn-risk"
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle className="text-xl">Churn Risk</CardTitle>
              </div>
              {data?.churnRisk.trend === "up" && (
                <div className="flex items-center gap-1 text-destructive text-sm">
                  <TrendingUp className="h-4 w-4" />
                  <span>Rising</span>
                </div>
              )}
              {data?.churnRisk.trend === "down" && (
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                  <TrendingDown className="h-4 w-4" />
                  <span>Declining</span>
                </div>
              )}
            </div>
            <CardDescription>Customers at risk of not returning</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-destructive" data-testid="churn-high-count">
                  {data?.churnRisk.highRiskCount || 0}
                </div>
                <div className="text-xs text-muted-foreground">High Risk</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400" data-testid="churn-medium-count">
                  {data?.churnRisk.mediumRiskCount || 0}
                </div>
                <div className="text-xs text-muted-foreground">Medium Risk</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold" data-testid="churn-total-count">
                  {data?.churnRisk.totalAtRisk || 0}
                </div>
                <div className="text-xs text-muted-foreground">Total At-Risk</div>
              </div>
            </div>
            {(data?.churnRisk.totalAtRisk || 0) > 0 && (
              <Link href="/admin/customers?filter=at-risk">
                <Button variant="destructive" className="w-full" data-testid="button-view-at-risk">
                  <Users className="mr-2 h-4 w-4" />
                  View At-Risk Customers
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card
          className={`${
            (data?.anomalies.openCount || 0) > 0
              ? "border-destructive bg-destructive/5"
              : "border-border"
          }`}
          data-testid="widget-anomaly-alerts"
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-xl">Anomaly Alerts</CardTitle>
            </div>
            <CardDescription>Unusual activity requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-destructive" data-testid="anomaly-high-severity">
                  {data?.anomalies.highSeverityCount || 0}
                </div>
                <div className="text-xs text-muted-foreground">High Severity</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold" data-testid="anomaly-open-count">
                  {data?.anomalies.openCount || 0}
                </div>
                <div className="text-xs text-muted-foreground">Total Open</div>
              </div>
            </div>
            {data?.anomalies.recentAlerts && data.anomalies.recentAlerts.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Recent Alerts:</p>
                <div className="space-y-1">
                  {data.anomalies.recentAlerts.slice(0, 3).map((alert) => (
                    <div
                      key={alert.id}
                      className="text-sm p-2 rounded bg-muted flex items-center justify-between"
                      data-testid={`alert-item-${alert.id}`}
                    >
                      <span className="truncate flex-1">{alert.title}</span>
                      <Badge
                        variant={alert.severity === "high" ? "destructive" : "secondary"}
                        className="ml-2"
                      >
                        {alert.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(data?.anomalies.openCount || 0) > 0 && (
              <Link href="/admin/alerts">
                <Button variant="destructive" className="w-full" data-testid="button-view-alerts">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  View All Alerts
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="widget-customer-segments">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Customer Segments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">VIP</span>
              <Badge variant="secondary">{data?.segments.vipCount || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">At-Risk</span>
              <Badge variant="destructive">{data?.segments.atRiskCount || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">New</span>
              <Badge variant="secondary">{data?.segments.newCount || 0}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="widget-message-status">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Message Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">New</span>
              <Badge variant="destructive">{data?.messageStatus.newCount || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">In Progress</span>
              <Badge variant="secondary">{data?.messageStatus.inProgressCount || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Unresolved</span>
              <Badge>{data?.messageStatus.totalUnresolved || 0}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="widget-quick-actions">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/quotes?filter=pending">
              <div className="flex justify-between items-center hover-elevate active-elevate-2 p-2 rounded cursor-pointer">
                <span className="text-sm">Pending Quotes</span>
                <Badge>{data?.quickActions.pendingQuotes || 0}</Badge>
              </div>
            </Link>
            <Link href="/admin/invoices?filter=overdue">
              <div className="flex justify-between items-center hover-elevate active-elevate-2 p-2 rounded cursor-pointer">
                <span className="text-sm">Overdue Invoices</span>
                <Badge variant="destructive">{data?.quickActions.overdueInvoices || 0}</Badge>
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card data-testid="widget-business-settings">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Intelligence Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Win-Back</span>
              <Badge variant={data?.businessSettings.winBackCampaignsEnabled ? "secondary" : "outline"}>
                {data?.businessSettings.winBackCampaignsEnabled ? "ON" : "OFF"}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Anomaly Detection</span>
              <Badge variant={data?.businessSettings.anomalyDetectionEnabled ? "secondary" : "outline"}>
                {data?.businessSettings.anomalyDetectionEnabled ? "ON" : "OFF"}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Auto-Tagging</span>
              <Badge variant={data?.businessSettings.autoTaggingEnabled ? "secondary" : "outline"}>
                {data?.businessSettings.autoTaggingEnabled ? "ON" : "OFF"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {!hasCriticalAlerts && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950" data-testid="all-clear-message">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-600 dark:bg-green-400 p-2">
                <AlertCircle className="h-5 w-5 text-white dark:text-green-950" />
              </div>
              <div>
                <h3 className="font-semibold text-green-900 dark:text-green-100">All Clear!</h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  No critical alerts at this time. Your business is running smoothly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
