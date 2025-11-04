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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { GalleryImage } from "@shared/schema";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";

const galleryFormSchema = z.object({
  imageUrl: z.string().url("Must be a valid URL"),
  caption: z.string().optional(),
  order: z.number().min(0, "Order must be positive"),
  active: z.boolean().default(true),
});

type GalleryFormValues = z.infer<typeof galleryFormSchema>;

export default function AdminGallery() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);

  const { data: images = [], isLoading } = useQuery<GalleryImage[]>({
    queryKey: ["/api/admin/gallery"],
  });

  const form = useForm<GalleryFormValues>({
    resolver: zodResolver(galleryFormSchema),
    defaultValues: {
      imageUrl: "",
      caption: "",
      order: 0,
      active: true,
    },
  });

  useEffect(() => {
    if (editingImage) {
      form.reset({
        imageUrl: editingImage.imageUrl,
        caption: editingImage.caption || "",
        order: editingImage.order,
        active: editingImage.active,
      });
    } else {
      form.reset({
        imageUrl: "",
        caption: "",
        order: 0,
        active: true,
      });
    }
  }, [editingImage, form]);

  const createMutation = useMutation({
    mutationFn: async (data: GalleryFormValues) => {
      const res = await apiRequest("POST", "/api/gallery", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gallery"] });
      setIsDialogOpen(false);
      setEditingImage(null);
      form.reset();
      toast({
        title: "Image added",
        description: "Gallery image has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add image",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: GalleryFormValues }) => {
      const res = await apiRequest("PATCH", `/api/gallery/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gallery"] });
      setIsDialogOpen(false);
      setEditingImage(null);
      form.reset();
      toast({
        title: "Image updated",
        description: "Gallery image has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update image",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/gallery/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gallery"] });
      toast({
        title: "Image deleted",
        description: "Gallery image has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete image",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: GalleryFormValues) => {
    if (editingImage) {
      updateMutation.mutate({ id: editingImage.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (image: GalleryImage) => {
    setEditingImage(image);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this image?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingImage(null);
      form.reset();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          Gallery
        </h1>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle>Manage Gallery Images</CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-image">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Image
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingImage ? "Edit Gallery Image" : "Add New Gallery Image"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingImage
                        ? "Update the gallery image details below."
                        : "Add a new image to your gallery."}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="imageUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Image URL</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                data-testid="input-image-url"
                                placeholder="https://example.com/image.jpg"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="caption"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Caption (optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                data-testid="input-image-caption"
                                placeholder="Add a caption for this image..."
                                className="min-h-20"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="order"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Display Order</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                data-testid="input-image-order"
                                placeholder="0"
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
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
                                data-testid="input-image-active"
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
                          data-testid="button-submit-image"
                        >
                          {(createMutation.isPending || updateMutation.isPending) ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            editingImage ? "Update" : "Create"
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
              ) : images.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground" data-testid="text-no-images">
                  No gallery images found. Add your first image to get started.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {images.map((image) => (
                    <Card key={image.id} data-testid={`card-image-${image.id}`}>
                      <CardContent className="p-4">
                        <div className="aspect-video rounded-lg overflow-hidden bg-muted mb-4">
                          <img
                            src={image.imageUrl}
                            alt={image.caption || "Gallery image"}
                            className="w-full h-full object-cover"
                            data-testid={`img-${image.id}`}
                          />
                        </div>
                        <div className="space-y-2">
                          {image.caption && (
                            <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-caption-${image.id}`}>
                              {image.caption}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" data-testid={`badge-order-${image.id}`}>
                                Order: {image.order}
                              </Badge>
                              {image.active ? (
                                <Badge variant="default" data-testid={`badge-active-${image.id}`}>
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="secondary" data-testid={`badge-inactive-${image.id}`}>
                                  Inactive
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(image)}
                                data-testid={`button-edit-${image.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(image.id)}
                                data-testid={`button-delete-${image.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
      </div>
    </AdminLayout>
  );
}
