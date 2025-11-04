import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Building2, Sparkles } from "lucide-react";
import { Link } from "wouter";
import residentialImage from "@assets/generated_images/Clean_residential_kitchen_showcase_46bf75b4.png";
import commercialImage from "@assets/generated_images/Clean_commercial_office_space_fdef0e70.png";
import deepCleanImage from "@assets/generated_images/Deep_cleaning_before_after_cf8f1b84.png";

const services = [
  {
    id: 1,
    icon: Home,
    title: "Residential Cleaning",
    description: "Keep your home spotless with our comprehensive house cleaning services. From regular maintenance to move-in/out cleaning.",
    price: "From $89",
    image: residentialImage,
    features: ["Kitchen & Bathrooms", "Dusting & Vacuuming", "Floor Cleaning", "Window Cleaning"],
  },
  {
    id: 2,
    icon: Building2,
    title: "Commercial Cleaning",
    description: "Professional office and commercial space cleaning. We work around your schedule to keep your business looking its best.",
    price: "From $149",
    image: commercialImage,
    features: ["Office Spaces", "Retail Stores", "Restaurants", "Warehouses"],
  },
  {
    id: 3,
    icon: Sparkles,
    title: "Deep Cleaning",
    description: "Intensive cleaning service that covers every corner. Perfect for spring cleaning or preparing for special occasions.",
    price: "From $199",
    image: deepCleanImage,
    features: ["Detailed Scrubbing", "Appliance Cleaning", "Baseboards & Walls", "Grout & Tile"],
  },
];

export function Services() {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Services</h2>
          <p className="text-lg text-muted-foreground">
            Professional cleaning solutions tailored to your needs, all using eco-friendly products
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service) => (
            <Card key={service.id} className="overflow-hidden hover-elevate" data-testid={`card-service-${service.id}`}>
              <div className="aspect-video w-full overflow-hidden">
                <img
                  src={service.image}
                  alt={service.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <service.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">{service.title}</h3>
                </div>
                <p className="text-muted-foreground mb-4">{service.description}</p>
                <div className="mb-4">
                  <p className="text-2xl font-bold text-primary">{service.price}</p>
                </div>
                <ul className="space-y-2 mb-6">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/book">
                  <Button className="w-full" data-testid={`button-book-${service.id}`}>
                    Book Now
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
