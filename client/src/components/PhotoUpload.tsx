import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Camera, Upload, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { JobPhoto, Employee } from "@shared/schema";
import { Card } from "@/components/ui/card";

interface PhotoUploadProps {
  bookingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PhotoUpload({ bookingId, open, onOpenChange }: PhotoUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoType, setPhotoType] = useState<"before" | "after">("before");
  const [caption, setCaption] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const { data: employee } = useQuery<Employee>({
    queryKey: ["/api/employee/auth/user"],
  });

  const { data: photos = [], isLoading } = useQuery<JobPhoto[]>({
    queryKey: ["/api/job-photos", bookingId],
    enabled: open,
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: { photoData: string; photoType: string; caption: string }) => {
      const result = await apiRequest("POST", "/api/job-photos", {
        bookingId,
        photoData: data.photoData,
        photoType: data.photoType,
        uploadedByEmployeeId: employee?.id || null,
        uploadedByName: employee?.name || "Employee",
        caption: data.caption,
      });
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-photos", bookingId] });
      setPreviewImage(null);
      setCaption("");
      toast({
        title: "Photo uploaded successfully",
      });
    },
    onError: (error) => {
      console.error("Upload mutation onError triggered", error);
      toast({
        title: "Failed to upload photo",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (photoId: string) => {
      await apiRequest("DELETE", `/api/job-photos/${photoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-photos", bookingId] });
      toast({
        title: "Photo deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Failed to delete photo",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = () => {
    if (!previewImage) {
      toast({
        title: "No image selected",
        description: "Please select an image to upload",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate({
      photoData: previewImage,
      photoType,
      caption,
    });
  };

  const beforePhotos = photos.filter(p => p.photoType === "before");
  const afterPhotos = photos.filter(p => p.photoType === "after");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Job Photos</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload new photo */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Upload New Photo</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Photo Type</Label>
                  <Select value={photoType} onValueChange={(v) => setPhotoType(v as "before" | "after")}>
                    <SelectTrigger data-testid="select-photo-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="before">Before</SelectItem>
                      <SelectItem value="after">After</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Caption (optional)</Label>
                  <Input
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a description..."
                    data-testid="input-photo-caption"
                  />
                </div>
              </div>

              {previewImage && (
                <div className="relative">
                  <img
                    src={previewImage}
                    alt="Preview"
                    className="w-full max-h-64 object-contain rounded-md border"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2"
                    onClick={() => setPreviewImage(null)}
                    data-testid="button-remove-preview"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-file-upload"
                />
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                  data-testid="button-select-file"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Select Photo
                </Button>

                <Button
                  type="button"
                  onClick={handleUpload}
                  disabled={!previewImage || uploadMutation.isPending}
                  className="flex-1"
                  data-testid="button-upload-photo"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {uploadMutation.isPending ? "Uploading..." : "Upload Photo"}
                </Button>
              </div>
            </div>
          </Card>

          {/* Existing photos */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">Before Photos ({beforePhotos.length})</h3>
              {isLoading ? (
                <p className="text-muted-foreground text-sm">Loading...</p>
              ) : beforePhotos.length === 0 ? (
                <p className="text-muted-foreground text-sm">No before photos yet</p>
              ) : (
                <div className="space-y-3">
                  {beforePhotos.map((photo) => (
                    <Card key={photo.id} className="p-3">
                      <img
                        src={photo.photoData}
                        alt="Before"
                        className="w-full h-48 object-cover rounded-md mb-2"
                        data-testid={`img-before-${photo.id}`}
                      />
                      {photo.caption && (
                        <p className="text-sm text-muted-foreground mb-2">{photo.caption}</p>
                      )}
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>By {photo.uploadedByName}</span>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteMutation.mutate(photo.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${photo.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold mb-3">After Photos ({afterPhotos.length})</h3>
              {isLoading ? (
                <p className="text-muted-foreground text-sm">Loading...</p>
              ) : afterPhotos.length === 0 ? (
                <p className="text-muted-foreground text-sm">No after photos yet</p>
              ) : (
                <div className="space-y-3">
                  {afterPhotos.map((photo) => (
                    <Card key={photo.id} className="p-3">
                      <img
                        src={photo.photoData}
                        alt="After"
                        className="w-full h-48 object-cover rounded-md mb-2"
                        data-testid={`img-after-${photo.id}`}
                      />
                      {photo.caption && (
                        <p className="text-sm text-muted-foreground mb-2">{photo.caption}</p>
                      )}
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>By {photo.uploadedByName}</span>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteMutation.mutate(photo.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${photo.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
