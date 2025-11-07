import { useQuery } from "@tanstack/react-query";
import { Home, Star, Leaf, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface Stats {
  homesClean: number;
  averageRating: number;
  ecoFriendly: number;
  reviewCount: number;
}

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const stepValue = target / steps;
    const stepDuration = duration / steps;

    let current = 0;
    const timer = setInterval(() => {
      current += stepValue;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [target]);

  return (
    <span className="text-4xl md:text-5xl font-bold text-primary">
      {count.toLocaleString()}{suffix}
    </span>
  );
}

export function StatsSection() {
  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/public/stats"],
    refetchInterval: 60000, // Refresh every minute
  });

  if (!stats) return null;

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center" data-testid="stat-homes-cleaned">
            <Home className="h-8 w-8 text-primary mx-auto mb-3" />
            <AnimatedCounter target={stats.homesClean} />
            <p className="text-sm text-muted-foreground mt-2 font-medium">Homes Cleaned</p>
          </div>
          
          <div className="text-center" data-testid="stat-rating">
            <Star className="h-8 w-8 text-primary mx-auto mb-3" />
            <AnimatedCounter target={stats.averageRating} suffix=" ★" />
            <p className="text-sm text-muted-foreground mt-2 font-medium">Average Rating</p>
          </div>
          
          <div className="text-center" data-testid="stat-eco-friendly">
            <Leaf className="h-8 w-8 text-primary mx-auto mb-3" />
            <AnimatedCounter target={stats.ecoFriendly} suffix="%" />
            <p className="text-sm text-muted-foreground mt-2 font-medium">Eco-Friendly</p>
          </div>
          
          <div className="text-center" data-testid="stat-reviews">
            <MessageCircle className="h-8 w-8 text-primary mx-auto mb-3" />
            <AnimatedCounter target={stats.reviewCount} suffix="+" />
            <p className="text-sm text-muted-foreground mt-2 font-medium">Happy Reviews</p>
          </div>
        </div>
      </div>
    </section>
  );
}
