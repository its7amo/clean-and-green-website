import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AdminLayout } from "@/components/AdminLayout";
import type { TeamMember } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

type TeamMemberForm = {
  name: string;
  role: string;
  description: string;
  photoUrl: string;
};

export default function AdminTeam() {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [formData, setFormData] = useState<TeamMemberForm>({
    name: "",
    role: "",
    description: "",
    photoUrl: "",
  });

  const { data: teamMembers = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ["/api/team"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: TeamMemberForm) => {
      await apiRequest("POST", "/api/team", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      setFormDialogOpen(false);
      resetForm();
      toast({
        title: "Team member added",
        description: "Team member has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add team member",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TeamMemberForm }) => {
      await apiRequest("PATCH", `/api/team/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      setFormDialogOpen(false);
      setEditingMember(null);
      resetForm();
      toast({
        title: "Team member updated",
        description: "Team member has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update team member",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/team/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
      toast({
        title: "Team member deleted",
        description: "Team member has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete team member",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      role: "",
      description: "",
      photoUrl: "",
    });
  };

  const openAddDialog = () => {
    resetForm();
    setEditingMember(null);
    setFormDialogOpen(true);
  };

  const openEditDialog = (member: TeamMember) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      role: member.role,
      description: member.description || "",
      photoUrl: member.photoUrl || "",
    });
    setFormDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.role.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide at least name and role.",
        variant: "destructive",
      });
      return;
    }

    if (editingMember) {
      updateMutation.mutate({ id: editingMember.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const confirmDelete = (id: string) => {
    setMemberToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (memberToDelete) {
      deleteMutation.mutate(memberToDelete);
    }
  };

  const activeMembers = teamMembers.filter(m => m.active);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Team Members</h1>
          <Button onClick={openAddDialog} data-testid="button-add-member">
            <Plus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </div>

        <Card className="p-4">
          <div className="text-2xl font-bold" data-testid="text-total-members">{activeMembers.length}</div>
          <div className="text-sm text-muted-foreground">Active Team Members</div>
        </Card>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6">
                <div className="space-y-4">
                  <div className="h-20 w-20 bg-muted rounded-full animate-pulse mx-auto" />
                  <div className="h-4 bg-muted rounded animate-pulse w-32 mx-auto" />
                  <div className="h-3 bg-muted rounded animate-pulse w-24 mx-auto" />
                </div>
              </Card>
            ))}
          </div>
        ) : teamMembers.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground" data-testid="text-no-members">
              No team members yet. Add your first team member!
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamMembers.map((member) => (
              <Card key={member.id} className="p-6 text-center" data-testid={`member-card-${member.id}`}>
                <Avatar className="h-24 w-24 mx-auto mb-4">
                  <AvatarImage src={member.photoUrl || undefined} alt={member.name} />
                  <AvatarFallback className="text-2xl">
                    {member.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-lg mb-1" data-testid={`text-name-${member.id}`}>
                  {member.name}
                </h3>
                <p className="text-sm text-primary mb-2" data-testid={`text-role-${member.id}`}>
                  {member.role}
                </p>
                {member.description && (
                  <p className="text-sm text-muted-foreground mb-4" data-testid={`text-description-${member.id}`}>
                    {member.description}
                  </p>
                )}
                <div className="flex items-center justify-center gap-2 mb-4">
                  {member.active ? (
                    <Badge data-testid={`badge-active-${member.id}`}>Active</Badge>
                  ) : (
                    <Badge variant="secondary" data-testid={`badge-inactive-${member.id}`}>
                      Inactive
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2 justify-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(member)}
                    data-testid={`button-edit-${member.id}`}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => confirmDelete(member.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-${member.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-team-form">
          <DialogHeader>
            <DialogTitle>{editingMember ? "Edit" : "Add"} Team Member</DialogTitle>
            <DialogDescription>
              {editingMember ? "Update" : "Add"} team member information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Name *
              </label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                data-testid="input-member-name"
              />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium mb-2">
                Role/Title *
              </label>
              <Input
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="Cleaning Specialist"
                data-testid="input-member-role"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2">
                Bio/Description
              </label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief bio or description..."
                rows={3}
                data-testid="textarea-member-description"
              />
            </div>
            <div>
              <label htmlFor="photoUrl" className="block text-sm font-medium mb-2">
                Photo URL
              </label>
              <Input
                id="photoUrl"
                value={formData.photoUrl}
                onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                placeholder="https://example.com/photo.jpg"
                data-testid="input-member-photo"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFormDialogOpen(false)}
              data-testid="button-cancel-form"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-submit-form"
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingMember
                ? "Update"
                : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent data-testid="dialog-delete-member">
          <DialogHeader>
            <DialogTitle>Delete Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this team member? This action cannot be undone.
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
