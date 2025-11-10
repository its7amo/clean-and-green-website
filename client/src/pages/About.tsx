import { Header } from "@/components/Header";
import { PromoBanner } from "@/components/PromoBanner";
import { Footer } from "@/components/Footer";
import { CallToAction } from "@/components/CallToAction";
import { Leaf, Heart, Award, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import teamPhoto from "@assets/generated_images/Clean_and_Green_team_photo_4ef6f78f.png";
import { useQuery } from "@tanstack/react-query";
import type { BusinessSettings, GalleryImage, TeamMember } from "@shared/schema";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useCmsContent } from "@/hooks/use-cms-content";

const values = [
  {
    icon: Leaf,
    title: "Eco-Conscious",
    description: "We use only environmentally friendly products that are safe for your family and the planet.",
  },
  {
    icon: Heart,
    title: "Customer First",
    description: "Your satisfaction is our priority. We go above and beyond to exceed expectations.",
  },
  {
    icon: Award,
    title: "Quality Service",
    description: "Professionally trained staff delivering consistent, thorough cleaning every time.",
  },
  {
    icon: Users,
    title: "Community Focused",
    description: "Proud to serve Oklahoma communities and support local environmental initiatives.",
  },
];

export default function About() {
  const { data: settings } = useQuery<BusinessSettings>({
    queryKey: ["/api/settings"],
  });

  const { content: cmsContent } = useCmsContent("about_page");

  const { data: galleryImages = [] } = useQuery<GalleryImage[]>({
    queryKey: ["/api/gallery"],
  });

  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ["/api/team"],
  });

  const activeGalleryImages = galleryImages
    .filter(img => img.active)
    .sort((a, b) => a.order - b.order)
    .slice(0, 6);

  return (
    <div className="min-h-screen flex flex-col">
      <PromoBanner />
      <Header />
      <main className="flex-1">
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-6" data-testid="text-about-title">
                {cmsContent.title || `About ${settings?.businessName || "Clean & Green"}`}
              </h1>
              <p className="text-lg text-muted-foreground">
                {cmsContent.description || "We're more than just a cleaning company - we're your partners in creating healthier, cleaner spaces while protecting our environment."}
              </p>
            </div>

            <div className="mb-16">
              <img
                src={cmsContent.team_image || teamPhoto}
                alt={`${settings?.businessName || "Clean and Green"} team`}
                className="w-full rounded-lg max-w-4xl mx-auto"
              />
            </div>

            <div className="max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-bold mb-6">{cmsContent.mission_title || "Our Story"}</h2>
              <div className="space-y-4 text-muted-foreground" data-testid="text-about-story">
                {cmsContent.mission_text || settings?.aboutText ? (
                  <p>{cmsContent.mission_text || settings?.aboutText}</p>
                ) : (
                  <>
                    <p>
                      Founded in 2020, Clean & Green emerged from a simple belief: professional cleaning services shouldn't compromise the health of our families or our planet. As Oklahoma residents, we saw firsthand the need for reliable, eco-friendly cleaning solutions.
                    </p>
                    <p>
                      Today, we're proud to serve hundreds of satisfied customers across Oklahoma, from family homes to bustling businesses. Our team of trained professionals uses only certified green products, ensuring your spaces are not just clean, but truly healthy.
                    </p>
                    <p>
                      We believe in building lasting relationships with our customers and our community. That's why we're committed to exceptional service, transparent pricing, and sustainable practices in everything we do.
                    </p>
                  </>
                )}
              </div>
            </div>

            {activeGalleryImages.length > 0 && (
              <div className="mb-16">
                <h2 className="text-3xl font-bold mb-8 text-center">Our Work</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {activeGalleryImages.map((image) => (
                    <div key={image.id} className="aspect-square overflow-hidden rounded-lg" data-testid={`gallery-image-${image.id}`}>
                      <img
                        src={image.imageUrl}
                        alt={image.caption || "Gallery image"}
                        className="w-full h-full object-cover hover-elevate"
                      />
                    </div>
                  ))}
                </div>
                <div className="text-center mt-8">
                  <Link href="/gallery">
                    <Button variant="outline" data-testid="button-view-full-gallery">
                      View Full Gallery
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {teamMembers.length > 0 && (
              <div className="mb-16">
                <h2 className="text-3xl font-bold mb-8 text-center">Meet Our Crew</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {teamMembers.map((member) => (
                    <Card key={member.id} className="p-6 text-center" data-testid={`team-member-${member.id}`}>
                      <Avatar className="h-24 w-24 mx-auto mb-4">
                        <AvatarImage src={member.photoUrl || undefined} alt={member.name} />
                        <AvatarFallback className="text-2xl">
                          {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="font-semibold text-lg mb-1" data-testid={`text-member-name-${member.id}`}>{member.name}</h3>
                      <p className="text-sm text-primary mb-3" data-testid={`text-member-role-${member.id}`}>{member.role}</p>
                      {member.description && (
                        <p className="text-sm text-muted-foreground" data-testid={`text-member-bio-${member.id}`}>{member.description}</p>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-3xl font-bold mb-8 text-center">Our Values</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {values.map((value, index) => (
                  <Card key={index} className="p-6 text-center">
                    <value.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">{value.title}</h3>
                    <p className="text-sm text-muted-foreground">{value.description}</p>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        <CallToAction />
      </main>
      <Footer />
    </div>
  );
}
