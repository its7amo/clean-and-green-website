import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Star, CheckCircle, Leaf } from "lucide-react";
import heroImage from "@assets/generated_images/Hero_cleaning_team_in_action_2c2b9c2e.png";
import { useQuery } from "@tanstack/react-query";
import type { BusinessSettings } from "@shared/schema";
import { useCmsContent } from "@/hooks/use-cms-content";

export function Hero() {
  const { data: settings } = useQuery<BusinessSettings>({
    queryKey: ["/api/settings"],
  });

  const { content: cmsContent, assets: cmsAssets, isVisible } = useCmsContent("home_hero");

  if (!isVisible) return null;

  return (
    <section className="relative min-h-[600px] md:min-h-[700px] flex items-center">
      <div className="absolute inset-0 z-0">
        <img
          src={cmsAssets.hero_image || heroImage}
          alt={`${settings?.businessName || "Clean and Green"} professional cleaning team`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-20 md:py-32">
        <div className="max-w-4xl">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6" data-testid="text-hero-title">
            {cmsContent.title || settings?.tagline || "Eco-Friendly Cleaning for a Healthier Oklahoma"}
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8">
            {cmsContent.subtitle || "Professional cleaning services using only green, sustainable products. We care for your home and our planet."}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Link href={cmsContent.cta_link || "/book"}>
              <Button size="lg" className="text-lg px-8 py-6" data-testid="button-hero-book">
                {cmsContent.cta_text || "Book Cleaning"}
              </Button>
            </Link>
            <Link href="/quote">
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20"
                data-testid="button-hero-quote"
              >
                Get Quote
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap gap-6 text-white">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span className="font-medium">Locally Owned & Operated</span>
            </div>
            <div className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-primary" />
              <span className="font-medium">100% Eco-Friendly Products</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span className="font-medium">Serving All of Oklahoma</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
