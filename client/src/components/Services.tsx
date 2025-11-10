import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Building2, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Service } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import residentialImage from "@assets/generated_images/Clean_residential_kitchen_showcase_46bf75b4.png";
import commercialImage from "@assets/generated_images/Clean_commercial_office_space_fdef0e70.png";
import deepCleanImage from "@assets/generated_images/Deep_cleaning_before_after_cf8f1b84.png";
import { useCmsContent } from "@/hooks/use-cms-content";

const getServiceIcon = (name: string) => {
  const nameLower = name.toLowerCase();
  if (nameLower.includes("residential") || nameLower.includes("home")) return Home;
  if (nameLower.includes("commercial") || nameLower.includes("office")) return Building2;
  return Sparkles;
};

const getServiceImage = (name: string) => {
  const nameLower = name.toLowerCase();
  if (nameLower.includes("residential") || nameLower.includes("home")) return residentialImage;
  if (nameLower.includes("commercial") || nameLower.includes("office")) return commercialImage;
  return deepCleanImage;
};

export function Services() {
  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { content: cmsContent } = useCmsContent("services_intro");
  const activeServices = services.filter(service => service.active);

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{cmsContent.title || "Our Services"}</h2>
          <p className="text-lg text-muted-foreground">
            {cmsContent.description || "Professional cleaning solutions tailored to your needs, all using eco-friendly products"}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-video w-full" />
                <div className="p-6 space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </Card>
            ))}
          </div>
        ) : activeServices.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No services available at the moment. Please check back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {activeServices.map((service) => {
              const ServiceIcon = getServiceIcon(service.name);
              const serviceImage = getServiceImage(service.name);
              const formattedPrice = `From $${(service.basePrice / 100).toFixed(2)}`;

              return (
                <Card key={service.id} className="overflow-hidden hover-elevate" data-testid={`card-service-${service.id}`}>
                  <div className="aspect-video w-full overflow-hidden">
                    <img
                      src={serviceImage}
                      alt={service.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <ServiceIcon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold" data-testid={`text-service-name-${service.id}`}>{service.name}</h3>
                    </div>
                    <p className="text-muted-foreground mb-4" data-testid={`text-service-description-${service.id}`}>{service.description}</p>
                    <div className="mb-6">
                      <p className="text-2xl font-bold text-primary" data-testid={`text-service-price-${service.id}`}>{formattedPrice}</p>
                    </div>
                    <Link href="/book">
                      <Button className="w-full" data-testid={`button-book-${service.id}`}>
                        Book Now
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
