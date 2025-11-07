import { useQuery } from "@tanstack/react-query";
import type { JobPhoto } from "@shared/schema";
import { useState } from "react";
import { X } from "lucide-react";

export function FeaturedGallery() {
  const [selectedPhoto, setSelectedPhoto] = useState<JobPhoto | null>(null);
  
  const { data: photos = [] } = useQuery<JobPhoto[]>({
    queryKey: ["/api/public/featured-photos"],
  });

  if (photos.length === 0) return null;

  return (
    <>
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Work Speaks for Itself</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              See the transformations we create with every cleaning service
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative aspect-square overflow-hidden rounded-lg hover-elevate active-elevate-2 cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
                data-testid={`gallery-photo-${photo.id}`}
              >
                <img
                  src={photo.photoData}
                  alt={photo.caption || `${photo.photoType} photo`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                  <p className="text-white text-sm font-medium">
                    {photo.photoType === 'before' ? '📷 Before' : '✨ After'}
                  </p>
                  {photo.caption && (
                    <p className="text-white/80 text-xs mt-1">{photo.caption}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
          data-testid="lightbox-overlay"
        >
          <button
            className="absolute top-4 right-4 text-white hover-elevate active-elevate-2 p-2 rounded"
            onClick={() => setSelectedPhoto(null)}
            data-testid="button-close-lightbox"
          >
            <X className="h-8 w-8" />
          </button>
          <div className="max-w-4xl max-h-[90vh] overflow-auto">
            <img
              src={selectedPhoto.photoData}
              alt={selectedPhoto.caption || 'Job photo'}
              className="w-full h-auto rounded-lg"
            />
            {selectedPhoto.caption && (
              <p className="text-white text-center mt-4 text-lg">
                {selectedPhoto.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
