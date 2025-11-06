import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { JobPhoto } from "@shared/schema";
import { Card } from "@/components/ui/card";

interface CustomerPhotoViewerProps {
  bookingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerPhotoViewer({ bookingId, open, onOpenChange }: CustomerPhotoViewerProps) {
  const { data: photos = [], isLoading } = useQuery<JobPhoto[]>({
    queryKey: ["/api/job-photos", bookingId],
    enabled: open,
  });

  const beforePhotos = photos.filter(p => p.photoType === "before");
  const afterPhotos = photos.filter(p => p.photoType === "after");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Before & After Photos</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading photos...</p>
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-8">
            <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No photos available yet for this booking.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Photos will appear here once our team has completed the work.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3 text-lg">
                Before ({beforePhotos.length})
              </h3>
              {beforePhotos.length === 0 ? (
                <p className="text-muted-foreground text-sm">No before photos yet</p>
              ) : (
                <div className="space-y-3">
                  {beforePhotos.map((photo) => (
                    <Card key={photo.id} className="p-3" data-testid={`photo-before-${photo.id}`}>
                      <img
                        src={photo.photoData}
                        alt="Before cleaning"
                        className="w-full h-64 object-cover rounded-md mb-2"
                      />
                      {photo.caption && (
                        <p className="text-sm text-muted-foreground">{photo.caption}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Taken by {photo.uploadedByName}
                      </p>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-lg">
                After ({afterPhotos.length})
              </h3>
              {afterPhotos.length === 0 ? (
                <p className="text-muted-foreground text-sm">No after photos yet</p>
              ) : (
                <div className="space-y-3">
                  {afterPhotos.map((photo) => (
                    <Card key={photo.id} className="p-3" data-testid={`photo-after-${photo.id}`}>
                      <img
                        src={photo.photoData}
                        alt="After cleaning"
                        className="w-full h-64 object-cover rounded-md mb-2"
                      />
                      {photo.caption && (
                        <p className="text-sm text-muted-foreground">{photo.caption}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Taken by {photo.uploadedByName}
                      </p>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Inline button component to trigger the viewer
interface PhotoViewButtonProps {
  bookingId: string;
}

export function PhotoViewButton({ bookingId }: PhotoViewButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        data-testid={`button-view-photos-${bookingId}`}
      >
        <Camera className="h-4 w-4 mr-2" />
        View Photos
      </Button>
      <CustomerPhotoViewer
        bookingId={bookingId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
