import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Search, MapPin } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertServiceAreaSchema, type ServiceArea } from "@shared/schema";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const serviceAreaFormSchema = insertServiceAreaSchema.extend({
  zipCodes: z.string().min(1, "At least one zip code is required"),
});

type ServiceAreaFormData = z.infer<typeof serviceAreaFormSchema>;

export default function AdminServiceAreas() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingServiceArea, setEditingServiceArea] = useState<ServiceArea | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: serviceAreas, isLoading } = useQuery<ServiceArea[]>({
    queryKey: ["/api/service-areas"],
  });

  const form = useForm<ServiceAreaFormData>({
    resolver: zodResolver(serviceAreaFormSchema),
    defaultValues: {
      name: "",
      zipCodes: "",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ServiceAreaFormData) => {
      const zipCodesArray = data.zipCodes
        .split(/[\n,]+/)
        .map(zip => zip.trim())
        .filter(zip => zip.length > 0);
      
      await apiRequest("POST", "/api/service-areas", {
        name: data.name,
        zipCodes: zipCodesArray,
        isActive: data.isActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-areas"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Service area created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create service area",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ServiceAreaFormData> }) => {
      const payload: any = { ...data };
      
      if (data.zipCodes) {
        payload.zipCodes = data.zipCodes
          .split(/[\n,]+/)
          .map(zip => zip.trim())
          .filter(zip => zip.length > 0);
      }
      
      await apiRequest("PATCH", `/api/service-areas/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-areas"] });
      setIsDialogOpen(false);
      setEditingServiceArea(null);
      form.reset();
      toast({
        title: "Success",
        description: "Service area updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update service area",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/service-areas/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-areas"] });
      toast({
        title: "Success",
        description: "Service area deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete service area",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ServiceAreaFormData) => {
    if (editingServiceArea) {
      updateMutation.mutate({ id: editingServiceArea.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (serviceArea: ServiceArea) => {
    setEditingServiceArea(serviceArea);
    form.reset({
      name: serviceArea.name,
      zipCodes: serviceArea.zipCodes.join(", "),
      isActive: serviceArea.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this service area?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingServiceArea(null);
      form.reset();
    }
  };

  const filteredServiceAreas = serviceAreas?.filter(area =>
    area.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    area.zipCodes.some(zip => zip.includes(searchQuery))
  ) || [];

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Service Areas</h1>
            <p className="text-muted-foreground mt-1">Manage geographic areas and zip codes served by your business</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-service-area">
                <Plus className="h-4 w-4 mr-2" />
                Add Service Area
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingServiceArea ? "Edit Service Area" : "Create New Service Area"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Region Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Downtown OKC, Edmond, etc." 
                            {...field} 
                            data-testid="input-service-area-name"
                          />
                        </FormControl>
                        <FormDescription>
                          A descriptive name for this service area
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="zipCodes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zip Codes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="73102, 73103, 73104 (comma-separated or one per line)" 
                            {...field}
                            rows={6}
                            data-testid="input-service-area-zip-codes"
                          />
                        </FormControl>
                        <FormDescription>
                          Enter zip codes separated by commas or one per line
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active Status</FormLabel>
                          <FormDescription>
                            Inactive service areas will not accept bookings from their zip codes
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-service-area-active"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel">
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createMutation.isPending || updateMutation.isPending} 
                      data-testid="button-save-service-area"
                    >
                      {editingServiceArea ? "Update" : "Create"} Service Area
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Service Areas</CardTitle>
          </CardHeader>
          <div className="p-6 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by region name or zip code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
                data-testid="input-search-service-areas"
              />
            </div>
          </div>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : filteredServiceAreas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-service-areas">
                {searchQuery ? "No service areas match your search." : "No service areas yet. Create one to get started!"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Region Name</TableHead>
                      <TableHead>Zip Codes</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredServiceAreas.map((serviceArea) => (
                      <TableRow key={serviceArea.id} data-testid={`row-service-area-${serviceArea.id}`}>
                        <TableCell className="font-semibold" data-testid={`text-name-${serviceArea.id}`}>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            {serviceArea.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {serviceArea.zipCodes.slice(0, 5).map((zip, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {zip}
                              </Badge>
                            ))}
                            {serviceArea.zipCodes.length > 5 && (
                              <Badge variant="secondary" className="text-xs">
                                +{serviceArea.zipCodes.length - 5} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={serviceArea.isActive ? "default" : "secondary"}>
                            {serviceArea.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(serviceArea)}
                              data-testid={`button-edit-${serviceArea.id}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(serviceArea.id)}
                              data-testid={`button-delete-${serviceArea.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
