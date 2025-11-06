import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Employee } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEmployeePermissions } from "@/hooks/use-employee-permissions";
import { EmployeeLayout } from "@/components/EmployeeLayout";
import { Users } from "lucide-react";

export default function EmployeeEmployees() {
  const [, setLocation] = useLocation();
  const { canView, isLoading: permissionsLoading } = useEmployeePermissions();

  const { data: employee, isLoading: employeeLoading } = useQuery<Employee>({
    queryKey: ["/api/employee/auth/user"],
  });

  const { data: employees, isLoading: employeesListLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employee/employees"],
    enabled: !!employee && !permissionsLoading && canView("employees"),
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

  if (!canView("employees")) {
    return (
      <EmployeeLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                You don't have permission to view employee list.
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
          <Users className="h-6 w-6 text-green-600" />
          <h1 className="text-2xl font-bold">Employees</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Employee Directory</CardTitle>
            <CardDescription>View staff members and their roles (read-only)</CardDescription>
          </CardHeader>
          <CardContent>
            {employeesListLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading employees...</div>
            ) : !employees || employees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No employees found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.id} data-testid={`row-employee-${emp.id}`}>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell>{emp.email}</TableCell>
                      <TableCell>{emp.phone}</TableCell>
                      <TableCell>
                        <Badge variant={emp.isManager ? "default" : "outline"}>
                          {emp.isManager ? "Manager" : "Staff"}
                        </Badge>
                      </TableCell>
                      <TableCell>{emp.isActive ? "Active" : "Inactive"}</TableCell>
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
