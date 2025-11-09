import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Employee, InsertEmployee, EmployeePermission } from "@shared/schema";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEmployeeSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Shield, Mail, Calendar, X } from "lucide-react";
import { PERMISSION_METADATA, type PermissionTemplate, type Feature, type Action } from "@shared/permissions";

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export default function AdminEmployees() {
  const { toast } = useToast();
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [permissionsEmployee, setPermissionsEmployee] = useState<Employee | null>(null);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<Map<Feature, Set<Action>>>(new Map());
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [vacationDays, setVacationDays] = useState<string[]>([]);
  const [newVacationDate, setNewVacationDate] = useState("");

  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const form = useForm<InsertEmployee>({
    resolver: zodResolver(insertEmployeeSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "cleaner",
      active: true,
      availability: {
        monday: { start: "09:00", end: "17:00", available: true },
        tuesday: { start: "09:00", end: "17:00", available: true },
        wednesday: { start: "09:00", end: "17:00", available: true },
        thursday: { start: "09:00", end: "17:00", available: true },
        friday: { start: "09:00", end: "17:00", available: true },
        saturday: { start: "09:00", end: "17:00", available: false },
        sunday: { start: "09:00", end: "17:00", available: false },
      },
      vacationDays: [],
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertEmployee) => {
      const res = await apiRequest("POST", "/api/employees", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: "Employee created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create employee", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertEmployee> }) => {
      const res = await apiRequest("PATCH", `/api/employees/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: "Employee updated successfully" });
      setIsDialogOpen(false);
      setEditingEmployee(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to update employee", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: "Employee deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete employee", variant: "destructive" });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (data: { employeeIds: string[]; subject: string; message: string }) => {
      const res = await apiRequest("POST", "/api/employees/send-email", data);
      if (!res.ok) {
        try {
          const error = await res.json();
          throw new Error(error.error || "Failed to send emails");
        } catch (e) {
          throw new Error("Failed to send emails");
        }
      }
      try {
        return await res.json();
      } catch (e) {
        throw new Error("Invalid response from server");
      }
    },
    onSuccess: (data: any) => {
      const { sent, skipped } = data;
      let description = `Email sent to ${sent} employee(s)`;
      if (skipped > 0) {
        description += `. ${skipped} employee(s) skipped (no email address)`;
      }
      toast({ 
        title: "Emails sent successfully",
        description 
      });
      setIsEmailDialogOpen(false);
      setEmailSubject("");
      setEmailMessage("");
      setSelectedEmployees(new Set());
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to send emails", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const { data: templates } = useQuery<PermissionTemplate[]>({
    queryKey: ["/api/permission-templates"],
  });

  const { data: employeePermissions, refetch: refetchPermissions } = useQuery<EmployeePermission[]>({
    queryKey: ["/api/employees", permissionsEmployee?.id, "permissions"],
    enabled: !!permissionsEmployee,
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ employeeId, permissions }: { employeeId: string; permissions: Array<{ feature: string; actions: string[] }> }) => {
      const res = await apiRequest("PUT", `/api/employees/${employeeId}/permissions`, { permissions });
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees", variables.employeeId, "permissions"] });
      toast({ title: "Permissions updated successfully" });
      setIsPermissionsDialogOpen(false);
      setPermissionsEmployee(null);
    },
    onError: () => {
      toast({ title: "Failed to update permissions", variant: "destructive" });
    },
  });

  // Load permissions when dialog opens
  useEffect(() => {
    if (employeePermissions) {
      const permsMap = new Map<Feature, Set<Action>>();
      employeePermissions.forEach(perm => {
        permsMap.set(perm.feature as Feature, new Set(perm.actions as Action[]));
      });
      setSelectedPermissions(permsMap);
    }
  }, [employeePermissions]);

  const onSubmit = (data: InsertEmployee) => {
    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    const defaultAvailability = {
      monday: { start: "09:00", end: "17:00", available: true },
      tuesday: { start: "09:00", end: "17:00", available: true },
      wednesday: { start: "09:00", end: "17:00", available: true },
      thursday: { start: "09:00", end: "17:00", available: true },
      friday: { start: "09:00", end: "17:00", available: true },
      saturday: { start: "09:00", end: "17:00", available: false },
      sunday: { start: "09:00", end: "17:00", available: false },
    };
    form.reset({
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      role: employee.role,
      active: employee.active,
      availability: employee.availability || defaultAvailability,
      vacationDays: employee.vacationDays || [],
    });
    setVacationDays(employee.vacationDays || []);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this employee?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingEmployee(null);
    setVacationDays([]);
    setNewVacationDate("");
    form.reset();
  };

  const addVacationDay = () => {
    if (newVacationDate && !vacationDays.includes(newVacationDate)) {
      const updatedDays = [...vacationDays, newVacationDate].sort();
      setVacationDays(updatedDays);
      form.setValue('vacationDays', updatedDays);
      setNewVacationDate("");
    }
  };

  const removeVacationDay = (date: string) => {
    const updatedDays = vacationDays.filter(d => d !== date);
    setVacationDays(updatedDays);
    form.setValue('vacationDays', updatedDays);
  };

  const handleManagePermissions = (employee: Employee) => {
    setPermissionsEmployee(employee);
    setIsPermissionsDialogOpen(true);
  };

  const togglePermission = (feature: Feature, action: Action) => {
    setSelectedPermissions(prev => {
      const newMap = new Map(prev);
      const actions = newMap.get(feature) || new Set<Action>();
      
      if (actions.has(action)) {
        actions.delete(action);
      } else {
        actions.add(action);
      }
      
      if (actions.size === 0) {
        newMap.delete(feature);
      } else {
        newMap.set(feature, actions);
      }
      
      return newMap;
    });
  };

  const applyTemplate = (template: PermissionTemplate) => {
    const permsMap = new Map<Feature, Set<Action>>();
    template.permissions.forEach(perm => {
      permsMap.set(perm.feature, new Set(perm.actions));
    });
    setSelectedPermissions(permsMap);
    toast({ title: `Applied ${template.name} template` });
  };

  const savePermissions = () => {
    if (!permissionsEmployee) return;
    
    const permissions = Array.from(selectedPermissions.entries()).map(([feature, actions]) => ({
      feature,
      actions: Array.from(actions),
    }));
    
    updatePermissionsMutation.mutate({
      employeeId: permissionsEmployee.id,
      permissions,
    });
  };

  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployees(prev => {
      const newSet = new Set(prev);
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId);
      } else {
        newSet.add(employeeId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedEmployees.size === employees?.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(employees?.map(e => e.id) || []));
    }
  };

  const handleSendEmail = () => {
    if (selectedEmployees.size === 0) {
      toast({ title: "Please select at least one employee", variant: "destructive" });
      return;
    }
    if (!emailSubject.trim() || !emailMessage.trim()) {
      toast({ title: "Please fill in subject and message", variant: "destructive" });
      return;
    }
    sendEmailMutation.mutate({
      employeeIds: Array.from(selectedEmployees),
      subject: emailSubject,
      message: emailMessage,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Employees</h1>
            <p className="text-muted-foreground">Manage your cleaning staff</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingEmployee(null); form.reset(); }} data-testid="button-add-employee">
                <Plus className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingEmployee ? "Edit" : "Add"} Employee</DialogTitle>
                <DialogDescription>
                  {editingEmployee ? "Update employee information" : "Add a new employee to your team"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password {editingEmployee && "(leave blank to keep current)"}</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} value={field.value || ""} data-testid="input-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <FormControl>
                          <select 
                            {...field} 
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            data-testid="select-role"
                          >
                            <option value="cleaner">Cleaner</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="manager">Manager</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Active Status</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Employee can be assigned to bookings
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-active"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4 border rounded-lg p-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Weekly Availability
                    </h3>
                    {DAYS_OF_WEEK.map((day) => (
                      <div key={day} className="flex items-center gap-4 flex-wrap">
                        <FormField
                          control={form.control}
                          name={`availability.${day}.available`}
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid={`switch-${day}-available`}
                                />
                              </FormControl>
                              <FormLabel className="capitalize min-w-[100px] !mt-0">
                                {day}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`availability.${day}.start`}
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2">
                              <FormControl>
                                <Input
                                  type="time"
                                  {...field}
                                  disabled={!form.watch(`availability.${day}.available`)}
                                  className="w-32"
                                  data-testid={`input-${day}-start`}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <span className="text-muted-foreground">to</span>
                        <FormField
                          control={form.control}
                          name={`availability.${day}.end`}
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2">
                              <FormControl>
                                <Input
                                  type="time"
                                  {...field}
                                  disabled={!form.watch(`availability.${day}.available`)}
                                  className="w-32"
                                  data-testid={`input-${day}-end`}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4 border rounded-lg p-4">
                    <h3 className="font-medium">Vacation Days</h3>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={newVacationDate}
                        onChange={(e) => setNewVacationDate(e.target.value)}
                        data-testid="input-vacation-date"
                      />
                      <Button type="button" onClick={addVacationDay} data-testid="button-add-vacation">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {vacationDays.length > 0 && (
                      <div className="space-y-2">
                        {vacationDays.map((date) => (
                          <div key={date} className="flex items-center justify-between bg-muted p-2 rounded">
                            <span data-testid={`text-vacation-${date}`}>{new Date(date).toLocaleDateString()}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeVacationDay(date)}
                              data-testid={`button-remove-vacation-${date}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={handleDialogClose} data-testid="button-cancel">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit">
                      {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : editingEmployee ? "Update" : "Create"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {selectedEmployees.size > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <Button
              onClick={() => setIsEmailDialogOpen(true)}
              data-testid="button-send-email"
            >
              <Mail className="mr-2 h-4 w-4" />
              Send Email ({selectedEmployees.size} selected)
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedEmployees(new Set())}
              data-testid="button-clear-selection"
            >
              Clear Selection
            </Button>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>All Employees</CardTitle>
            <CardDescription>
              {employees?.length || 0} total employees
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : !employees || employees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No employees yet. Add your first team member!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedEmployees.size === employees.length}
                        onCheckedChange={toggleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id} data-testid={`row-employee-${employee.id}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedEmployees.has(employee.id)}
                          onCheckedChange={() => toggleEmployeeSelection(employee.id)}
                          data-testid={`checkbox-employee-${employee.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {employee.name}
                      </TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{employee.phone}</TableCell>
                      <TableCell className="capitalize">{employee.role}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            employee.active
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
                          }`}
                          data-testid={`status-employee-${employee.id}`}
                        >
                          {employee.active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleManagePermissions(employee)}
                            data-testid={`button-permissions-${employee.id}`}
                            title="Manage Permissions"
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(employee)}
                            data-testid={`button-edit-${employee.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(employee.id)}
                            data-testid={`button-delete-${employee.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Permissions Management Dialog */}
        <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" data-testid="dialog-manage-permissions">
            <DialogHeader>
              <DialogTitle>Manage Permissions - {permissionsEmployee?.name}</DialogTitle>
              <DialogDescription>
                Control what features this employee can access
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="manual" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">Custom Permissions</TabsTrigger>
                <TabsTrigger value="templates">Quick Templates</TabsTrigger>
              </TabsList>
              
              <TabsContent value="manual" className="space-y-4 mt-4">
                <div className="grid gap-4">
                  {PERMISSION_METADATA.map((meta) => {
                    const featureActions = selectedPermissions.get(meta.feature) || new Set<Action>();
                    const allSelected = meta.availableActions.every(a => featureActions.has(a.action));
                    const someSelected = meta.availableActions.some(a => featureActions.has(a.action));
                    
                    return (
                      <Card key={meta.feature}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{meta.label}</CardTitle>
                            <Badge variant={allSelected ? "default" : someSelected ? "secondary" : "outline"}>
                              {featureActions.size} / {meta.availableActions.length}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {meta.availableActions.map((actionMeta) => (
                              <div key={actionMeta.action} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${meta.feature}-${actionMeta.action}`}
                                  checked={featureActions.has(actionMeta.action)}
                                  onCheckedChange={() => togglePermission(meta.feature, actionMeta.action)}
                                  data-testid={`checkbox-${meta.feature}-${actionMeta.action}`}
                                />
                                <label
                                  htmlFor={`${meta.feature}-${actionMeta.action}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                  {actionMeta.label}
                                </label>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
              
              <TabsContent value="templates" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Quick apply predefined permission sets
                </p>
                <div className="grid gap-3">
                  {templates?.map((template) => (
                    <Card key={template.id} className="hover-elevate cursor-pointer" onClick={() => applyTemplate(template)}>
                      <CardHeader>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <CardDescription>{template.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {template.permissions.map((perm) => (
                            <Badge key={perm.feature} variant="secondary">
                              {PERMISSION_METADATA.find(m => m.feature === perm.feature)?.label}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsPermissionsDialogOpen(false)}
                data-testid="button-cancel-permissions"
              >
                Cancel
              </Button>
              <Button 
                onClick={savePermissions}
                disabled={updatePermissionsMutation.isPending || !employeePermissions}
                data-testid="button-save-permissions"
              >
                {updatePermissionsMutation.isPending ? "Saving..." : "Save Permissions"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Email Dialog */}
        <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Email to Employees</DialogTitle>
              <DialogDescription>
                Compose an email to send to {selectedEmployees.size} selected employee{selectedEmployees.size !== 1 ? 's' : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Subject</label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Email subject"
                  data-testid="input-email-subject"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Message</label>
                <Textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  placeholder="Your message to employees..."
                  rows={6}
                  data-testid="textarea-email-message"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsEmailDialogOpen(false)}
                data-testid="button-cancel-email"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSendEmail}
                disabled={sendEmailMutation.isPending}
                data-testid="button-confirm-send-email"
              >
                {sendEmailMutation.isPending ? "Sending..." : "Send Email"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
