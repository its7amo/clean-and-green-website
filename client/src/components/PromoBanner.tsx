import { useQuery } from "@tanstack/react-query";
import { X, Sparkles, Gift, TrendingUp, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface PromoCode {
  id: string;
  code: string;
  description: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
}

interface BannerConfig {
  template: "simple" | "gradient" | "cta" | "animated";
  ctaText?: string;
  ctaLink?: string;
}

interface BannerSettings {
  enabled: boolean;
  customMessage?: string;
}

export function PromoBanner() {
  const [isVisible, setIsVisible] = useState(true);

  const { data: activePromo } = useQuery<PromoCode | null>({
    queryKey: ["/api/public/active-promo"],
  });

  const { data: settings } = useQuery<BannerSettings>({
    queryKey: ["/api/public/banner-settings"],
  });

  if (!isVisible || !activePromo || settings?.enabled === false) {
    return null;
  }

  // Parse banner config from customMessage if it exists
  let config: BannerConfig = { template: "simple" };
  try {
    if (settings?.customMessage) {
      const parsed = JSON.parse(settings.customMessage);
      if (parsed.template) {
        config = parsed;
      }
    }
  } catch (e) {
    // Use default simple template if parsing fails
  }

  const message = activePromo.description;
  const discount = activePromo.discountType === "percentage" 
    ? `${activePromo.discountValue}% OFF` 
    : `$${(activePromo.discountValue / 100).toFixed(2)} OFF`;

  const handleDismiss = () => {
    setIsVisible(false);
  };

  // Simple Template
  if (config.template === "simple") {
    return (
      <div className="bg-primary text-primary-foreground py-2 px-4 relative" data-testid="promo-banner">
        <div className="container mx-auto flex items-center justify-center gap-2 text-sm md:text-base">
          <Sparkles className="h-4 w-4 flex-shrink-0" />
          <span className="font-medium">{message}</span>
          <span className="font-bold">{discount}</span>
          <span className="hidden sm:inline">• Use code:</span>
          <code className="bg-primary-foreground/20 px-2 py-0.5 rounded font-mono text-xs md:text-sm">
            {activePromo.code}
          </code>
        </div>
        <button
          onClick={handleDismiss}
          className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-primary-foreground/10 rounded p-1 transition-colors"
          aria-label="Dismiss banner"
          data-testid="button-dismiss-banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Gradient Template
  if (config.template === "gradient") {
    return (
      <div 
        className="bg-gradient-to-r from-primary via-purple-600 to-pink-600 text-white py-3 px-4 relative overflow-hidden" 
        data-testid="promo-banner"
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
        <div className="container mx-auto flex items-center justify-center gap-3 text-sm md:text-base relative z-10">
          <Gift className="h-5 w-5 flex-shrink-0 animate-pulse" />
          <span className="font-semibold">{message}</span>
          <span className="font-bold text-lg bg-white/20 px-3 py-1 rounded-full">{discount}</span>
          <span className="hidden sm:inline">with code</span>
          <code className="bg-white/30 px-3 py-1 rounded font-mono text-sm md:text-base font-bold backdrop-blur-sm">
            {activePromo.code}
          </code>
        </div>
        <button
          onClick={handleDismiss}
          className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-white/20 rounded-full p-1.5 transition-colors z-10"
          aria-label="Dismiss banner"
          data-testid="button-dismiss-banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // CTA Button Template
  if (config.template === "cta") {
    return (
      <div className="bg-primary text-primary-foreground py-3 px-4 relative" data-testid="promo-banner">
        <div className="container mx-auto flex flex-wrap items-center justify-center gap-3 md:gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 flex-shrink-0" />
            <span className="font-semibold text-sm md:text-base">{message}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg">{discount}</span>
            <code className="bg-primary-foreground/20 px-2 py-1 rounded font-mono text-xs md:text-sm">
              {activePromo.code}
            </code>
          </div>
          {config.ctaLink && (
            <Link href={config.ctaLink}>
              <Button 
                variant="secondary" 
                size="sm" 
                className="gap-1"
                data-testid="button-banner-cta"
              >
                {config.ctaText || "Book Now"}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-primary-foreground/10 rounded p-1 transition-colors"
          aria-label="Dismiss banner"
          data-testid="button-dismiss-banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Animated Template
  if (config.template === "animated") {
    return (
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-4 relative overflow-hidden" data-testid="promo-banner">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        </div>
        
        <div className="container mx-auto flex items-center justify-center gap-3 text-sm md:text-base relative z-10">
          <div className="flex items-center gap-2 animate-bounce">
            <Sparkles className="h-5 w-5" />
            <span className="font-bold">{discount}</span>
          </div>
          <span className="font-medium">{message}</span>
          <span className="hidden sm:inline">•</span>
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm">Code:</span>
            <code className="bg-white text-green-600 px-3 py-1 rounded-md font-mono text-sm md:text-base font-bold shadow-lg">
              {activePromo.code}
            </code>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-white/20 rounded-full p-1.5 transition-colors z-10"
          aria-label="Dismiss banner"
          data-testid="button-dismiss-banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return null;
}
