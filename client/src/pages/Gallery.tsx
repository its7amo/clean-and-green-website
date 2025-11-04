import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CallToAction } from "@/components/CallToAction";
import { useQuery } from "@tanstack/react-query";
import type { GalleryImage } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function Gallery() {
  const { data: galleryImages = [], isLoading } = useQuery<GalleryImage[]>({
    queryKey: ["/api/gallery"],
  });

  const activeGalleryImages = galleryImages
    .filter(img => img.active)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Our Work Gallery</h1>
              <p className="text-lg text-muted-foreground">
                See the results of our eco-friendly cleaning services in action
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="aspect-square w-full" />
                    <div className="p-4">
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : activeGalleryImages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No gallery images available at the moment. Please check back later.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {activeGalleryImages.map((image) => (
                  <Card key={image.id} className="overflow-hidden hover-elevate" data-testid={`gallery-item-${image.id}`}>
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={image.imageUrl}
                        alt={image.caption || "Gallery image"}
                        className="w-full h-full object-cover"
                        data-testid={`gallery-image-${image.id}`}
                      />
                    </div>
                    {image.caption && (
                      <div className="p-4">
                        <p className="text-sm text-muted-foreground" data-testid={`gallery-caption-${image.id}`}>{image.caption}</p>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>

        <CallToAction />
      </main>
      <Footer />
    </div>
  );
}
