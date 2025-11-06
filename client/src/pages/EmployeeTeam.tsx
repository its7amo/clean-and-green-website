import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TeamMember, Employee } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useEmployeePermissions } from "@/hooks/use-employee-permissions";
import { EmployeeLayout } from "@/components/EmployeeLayout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTeamMemberSchema } from "@shared/schema";
import { Users, Plus } from "lucide-react";
import type { z } from "zod";

export default function EmployeeTeam() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { canView, canCreate, canEdit, canDelete, isLoading: permissionsLoading } = useEmployeePermissions();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  const { data: employee, isLoading: employeeLoading } = useQuery<Employee>({
    queryKey: ["/api/employee/auth/user"],
  });

  const { data: teamMembers, isLoading: teamLoading } = useQuery<TeamMember[]>({
    queryKey: ["/api/employee/team"],
    enabled: !!employee && !permissionsLoading && canView("team"),
  });

  useEffect(() => {
    if (!employeeLoading && !employee) {
      setLocation("/employee/login");
    }
  }, [employee, employeeLoading, setLocation]);

  const form = useForm<z.infer<typeof insertTeamMemberSchema>>({
    resolver: zodResolver(insertTeamMemberSchema),
    defaultValues: {
      name: "",
      role: "",
      bio: "",
      imageUrl: "",
      active: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertTeamMemberSchema>) => {
      const res = await apiRequest("POST", "/api/employee/team", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee/team"] });
      toast({ title: "Team member added successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to add team member", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<z.infer<typeof insertTeamMemberSchema>> }) => {
      const res = await apiRequest("PATCH", `/api/employee/team/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee/team"] });
      toast({ title: "Team member updated successfully" });
      setIsDialogOpen(false);
      setEditingMember(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to update team member", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/employee/team/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee/team"] });
      toast({ title: "Team member deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete team member", variant: "destructive" });
    },
  });

  const onSubmit = (data: z.infer<typeof insertTeamMemberSchema>) => {
    if (editingMember) {
      updateMutation.mutate({ id: editingMember.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditDialog = (member: TeamMember) => {
    setEditingMember(member);
    form.reset({
      name: member.name,
      role: member.role,
      bio: member.bio || "",
      imageUrl: member.imageUrl || "",
      active: member.active,
    });
    setIsDialogOpen(true);
  };

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

  if (!canView("team")) {
    return (
      <EmployeeLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                You don't have permission to view team members.
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-green-600" />
            <h1 className="text-2xl font-bold">Team Members</h1>
          </div>
          {canCreate("team") && (
            <Button onClick={() => { setEditingMember(null); form.reset(); setIsDialogOpen(true); }} data-testid="button-add-team">
              <Plus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Team Directory</CardTitle>
            <CardDescription>Manage your team member profiles</CardDescription>
          </CardHeader>
          <CardContent>
            {teamLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading team...</div>
            ) : !teamMembers || teamMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No team members found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Bio</TableHead>
                    <TableHead>Status</TableHead>
                    {(canEdit("team") || canDelete("team")) && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((member) => (
                    <TableRow key={member.id} data-testid={`row-team-${member.id}`}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>{member.role}</TableCell>
                      <TableCell className="max-w-xs truncate">{member.bio}</TableCell>
                      <TableCell>{member.active ? "Active" : "Inactive"}</TableCell>
                      {(canEdit("team") || canDelete("team")) && (
                        <TableCell>
                          <div className="flex gap-2">
                            {canEdit("team") && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditDialog(member)}
                                data-testid={`button-edit-${member.id}`}
                              >
                                Edit
                              </Button>
                            )}
                            {canDelete("team") && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this team member?")) {
                                    deleteMutation.mutate(member.id);
                                  }
                                }}
                                disabled={deleteMutation.isPending}
                                data-testid={`button-delete-${member.id}`}
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingMember ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
              <DialogDescription>Fill in the team member details</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-name" />
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
                        <Input {...field} data-testid="input-role" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="input-bio" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-image-url" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save-team"
                  >
                    {editingMember ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </EmployeeLayout>
  );
}
