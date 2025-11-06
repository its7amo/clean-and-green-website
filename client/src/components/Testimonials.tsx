import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Review } from "@shared/schema";

export function Testimonials() {
  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ["/api/reviews/approved"],
  });

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Customers Say</h2>
          <p className="text-lg text-muted-foreground">
            Don't just take our word for it - hear from satisfied Oklahoma homeowners and businesses
          </p>
          <div className="mt-4">
            <Link href="/reviews#review-form">
              <Button variant="outline" data-testid="button-leave-review">
                Leave a Review
              </Button>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            <p>Be the first to leave a review!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {reviews.slice(0, 3).map((review) => (
            <Card key={review.id} className="p-6" data-testid={`card-review-${review.id}`}>
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg">
                    {review.customerName.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-semibold">{review.customerName}</h4>
                  <p className="text-sm text-muted-foreground">Verified Customer</p>
                </div>
              </div>

              <div className="flex gap-1 mb-3">
                {[...Array(review.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              <p className="text-sm italic text-muted-foreground">"{review.comment}"</p>
            </Card>
            ))}
          </div>
        )}

        {reviews.length > 3 && (
          <div className="text-center mt-8">
            <Link href="/reviews">
              <Button variant="outline" data-testid="button-view-all-reviews">
                View All Reviews
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
