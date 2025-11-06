import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

type ActivityLog = {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  entityName: string | null;
  changes: any;
  createdAt: Date;
};

const actionColors: Record<string, string> = {
  created: "bg-green-500/10 text-green-700 dark:text-green-400",
  updated: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  deleted: "bg-red-500/10 text-red-700 dark:text-red-400",
};

export default function AdminActivityLogs() {
  const { data: logs = [], isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity-logs"],
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          Activity Log
        </h1>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground" data-testid="text-no-logs">
                No activity logs found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity Type</TableHead>
                    <TableHead>Entity Name</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                      <TableCell className="whitespace-nowrap" data-testid={`text-log-date-${log.id}`}>
                        {format(new Date(log.createdAt), "MMM dd, yyyy HH:mm:ss")}
                      </TableCell>
                      <TableCell data-testid={`text-log-user-${log.id}`}>
                        {log.userName || "System"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={actionColors[log.action] || "bg-gray-500/10 text-gray-700"}
                          data-testid={`badge-action-${log.id}`}
                        >
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-log-entity-${log.id}`}>
                        {log.entityType.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell data-testid={`text-log-entity-name-${log.id}`}>
                        {log.entityName || log.entityId || "—"}
                      </TableCell>
                      <TableCell className="max-w-md">
                        {log.changes && typeof log.changes === 'object' && 'before' in log.changes && 'after' in log.changes ? (
                          <div className="text-xs text-muted-foreground" data-testid={`text-log-changes-${log.id}`}>
                            {Object.keys(log.changes.after || {})
                              .filter(key => {
                                const before = log.changes.before?.[key];
                                const after = log.changes.after?.[key];
                                return before !== after;
                              })
                              .map(key => (
                                <div key={key}>
                                  <span className="font-medium">{key}:</span>{' '}
                                  {log.changes.before?.[key] || 'null'} → {log.changes.after?.[key] || 'null'}
                                </div>
                              ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground" data-testid={`text-log-no-changes-${log.id}`}>—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
