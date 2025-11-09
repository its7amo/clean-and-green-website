import { X, Tag } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import type { PromoCode } from "@shared/schema";

interface BannerSettings {
  enabled: boolean;
  customMessage?: string;
}

export function PromoBanner() {
  const [isDismissed, setIsDismissed] = useState(false);

  const { data: activePromo } = useQuery<PromoCode | null>({
    queryKey: ["/api/public/active-promo"],
  });

  const { data: settings } = useQuery<BannerSettings>({
    queryKey: ["/api/public/banner-settings"],
  });

  useEffect(() => {
    const dismissedUntil = localStorage.getItem("promo-banner-dismissed");
    console.log("🎯 BANNER DEBUG:", {
      hasPromo: !!activePromo,
      promoCode: activePromo?.code,
      settingsEnabled: settings?.enabled,
      dismissedUntil,
      willShow: !(!activePromo || (dismissedUntil && new Date(dismissedUntil) > new Date()) || settings?.enabled === false)
    });
    if (dismissedUntil) {
      const until = new Date(dismissedUntil);
      if (until > new Date()) {
        setIsDismissed(true);
      } else {
        localStorage.removeItem("promo-banner-dismissed");
      }
    }
  }, [activePromo, settings]);

  const handleDismiss = () => {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    localStorage.setItem("promo-banner-dismissed", sevenDaysFromNow.toISOString());
    setIsDismissed(true);
  };

  if (!activePromo || isDismissed || settings?.enabled === false) {
    return null;
  }

  const discountText = activePromo.discountType === "percentage"
    ? `${activePromo.discountValue}% off`
    : `$${(activePromo.discountValue / 100).toFixed(0)} off`;

  return (
    <div className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-3 flex-1 justify-center">
            <Tag className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm md:text-base font-medium text-center">
              <span className="font-bold">{activePromo.description}</span>
              {" - "}
              {discountText} with code{" "}
              <span className="font-mono bg-primary-foreground/20 px-2 py-1 rounded text-primary-foreground font-bold">
                {activePromo.code}
              </span>
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 hover-elevate active-elevate-2 p-1 rounded"
            aria-label="Dismiss banner"
            data-testid="button-dismiss-banner"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
