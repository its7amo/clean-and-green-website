import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Service } from "@shared/schema";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";

const serviceFormSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  description: z.string().min(1, "Description is required"),
  basePrice: z.number().min(0, "Price must be positive"),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

export default function AdminServices() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["/api/admin/services"],
  });

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: "",
      description: "",
      basePrice: 0,
      featured: false,
      active: true,
    },
  });

  useEffect(() => {
    if (editingService) {
      form.reset({
        name: editingService.name,
        description: editingService.description,
        basePrice: editingService.basePrice,
        featured: editingService.featured,
        active: editingService.active,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        basePrice: 0,
        featured: false,
        active: true,
      });
    }
  }, [editingService, form]);

  const createMutation = useMutation({
    mutationFn: async (data: ServiceFormValues) => {
      const res = await apiRequest("POST", "/api/services", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services"] });
      setIsDialogOpen(false);
      setEditingService(null);
      form.reset();
      toast({
        title: "Service created",
        description: "Service has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create service",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ServiceFormValues }) => {
      const res = await apiRequest("PATCH", `/api/services/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services"] });
      setIsDialogOpen(false);
      setEditingService(null);
      form.reset();
      toast({
        title: "Service updated",
        description: "Service has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update service",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/services/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services"] });
      toast({
        title: "Service deleted",
        description: "Service has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete service",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ServiceFormValues) => {
    if (editingService) {
      updateMutation.mutate({ id: editingService.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this service?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingService(null);
      form.reset();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          Services
        </h1>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle>Manage Services</CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-service">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Service
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingService ? "Edit Service" : "Add New Service"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingService
                        ? "Update the service details below."
                        : "Create a new service for your business."}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Name</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                data-testid="input-service-name"
                                placeholder="Residential Cleaning"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                data-testid="input-service-description"
                                placeholder="Describe the service..."
                                className="min-h-24"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="basePrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Base Price (cents)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                data-testid="input-service-price"
                                placeholder="9900"
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="featured"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="input-service-featured"
                              />
                            </FormControl>
                            <FormLabel className="!mt-0">Featured Service</FormLabel>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="active"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="input-service-active"
                              />
                            </FormControl>
                            <FormLabel className="!mt-0">Active</FormLabel>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end gap-4 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleDialogChange(false)}
                          data-testid="button-cancel"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={createMutation.isPending || updateMutation.isPending}
                          data-testid="button-submit-service"
                        >
                          {(createMutation.isPending || updateMutation.isPending) ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            editingService ? "Update" : "Create"
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : services.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground" data-testid="text-no-services">
                  No services found. Add your first service to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Featured</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.map((service) => (
                      <TableRow key={service.id} data-testid={`row-service-${service.id}`}>
                        <TableCell className="font-medium" data-testid={`text-service-name-${service.id}`}>
                          {service.name}
                        </TableCell>
                        <TableCell className="max-w-md truncate" data-testid={`text-service-description-${service.id}`}>
                          {service.description}
                        </TableCell>
                        <TableCell data-testid={`text-service-price-${service.id}`}>
                          ${(service.basePrice / 100).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {service.featured ? (
                            <Badge variant="default" data-testid={`badge-featured-${service.id}`}>
                              Featured
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {service.active ? (
                            <Badge variant="default" data-testid={`badge-active-${service.id}`}>
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" data-testid={`badge-inactive-${service.id}`}>
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(service)}
                              data-testid={`button-edit-${service.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(service.id)}
                              data-testid={`button-delete-${service.id}`}
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
      </div>
    </AdminLayout>
  );
}
