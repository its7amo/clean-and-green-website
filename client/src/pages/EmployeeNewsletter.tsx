import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { NewsletterSubscriber, Employee } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmployeePermissions } from "@/hooks/use-employee-permissions";
import { EmployeeLayout } from "@/components/EmployeeLayout";
import { format } from "date-fns";
import { Mail } from "lucide-react";

export default function EmployeeNewsletter() {
  const [, setLocation] = useLocation();
  const { canView, isLoading: permissionsLoading } = useEmployeePermissions();

  const { data: employee, isLoading: employeeLoading } = useQuery<Employee>({
    queryKey: ["/api/employee/auth/user"],
  });

  const { data: subscribers, isLoading: subscribersLoading } = useQuery<NewsletterSubscriber[]>({
    queryKey: ["/api/employee/newsletter"],
    enabled: !!employee && !permissionsLoading && canView("newsletter"),
  });

  useEffect(() => {
    if (!employeeLoading && !employee) {
      setLocation("/employee/login");
    }
  }, [employee, employeeLoading, setLocation]);

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

  if (!canView("newsletter")) {
    return (
      <EmployeeLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                You don't have permission to view newsletter subscribers.
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
          <h1 className="text-2xl font-bold">Newsletter Subscribers</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Email Subscribers</CardTitle>
            <CardDescription>View newsletter subscription list (read-only)</CardDescription>
          </CardHeader>
          <CardContent>
            {subscribersLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading subscribers...</div>
            ) : !subscribers || subscribers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No subscribers found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Subscribed Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscribers.map((subscriber) => (
                    <TableRow key={subscriber.id} data-testid={`row-subscriber-${subscriber.id}`}>
                      <TableCell className="font-medium">{subscriber.email}</TableCell>
                      <TableCell>{format(subscriber.createdAt, "MMM d, yyyy")}</TableCell>
                      <TableCell>{subscriber.subscribed ? "Active" : "Unsubscribed"}</TableCell>
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
