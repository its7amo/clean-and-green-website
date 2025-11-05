import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CallToAction } from "@/components/CallToAction";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Review } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

export default function Reviews() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    rating: 5,
    reviewText: "",
  });

  const { toast } = useToast();

  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ["/api/reviews/approved"],
  });

  const submitReviewMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit review");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Review submitted!",
        description: "Thank you for your feedback. Your review will be published after approval.",
      });
      setFormData({
        customerName: "",
        customerEmail: "",
        rating: 5,
        reviewText: "",
      });
      setShowForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to submit review",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitReviewMutation.mutate(formData);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-6" data-testid="text-reviews-title">
                Customer Reviews
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                See what our satisfied customers have to say about our eco-friendly cleaning services
              </p>
              <Button
                onClick={() => setShowForm(!showForm)}
                data-testid="button-write-review"
                size="lg"
              >
                Write a Review
              </Button>
            </div>

            {showForm && (
              <Card className="max-w-2xl mx-auto p-6 mb-12" data-testid="card-review-form">
                <h2 className="text-2xl font-bold mb-6">Share Your Experience</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-2">
                      Your Name
                    </label>
                    <Input
                      id="name"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      required
                      data-testid="input-review-name"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2">
                      Email Address
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                      required
                      data-testid="input-review-email"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Rating</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFormData({ ...formData, rating: star })}
                          data-testid={`button-rating-${star}`}
                          className="hover-elevate rounded-md p-1"
                        >
                          <Star
                            className={`h-8 w-8 ${
                              star <= formData.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="review" className="block text-sm font-medium mb-2">
                      Your Review
                    </label>
                    <Textarea
                      id="review"
                      value={formData.reviewText}
                      onChange={(e) => setFormData({ ...formData, reviewText: e.target.value })}
                      required
                      rows={6}
                      data-testid="textarea-review-text"
                      placeholder="Tell us about your experience..."
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForm(false)}
                      data-testid="button-cancel-review"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitReviewMutation.isPending}
                      data-testid="button-submit-review"
                    >
                      {submitReviewMutation.isPending ? "Submitting..." : "Submit Review"}
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-6">
                    <div className="space-y-4">
                      <div className="h-5 bg-muted rounded animate-pulse w-24" />
                      <div className="h-4 bg-muted rounded animate-pulse w-full" />
                      <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
                      <div className="h-4 bg-muted rounded animate-pulse w-4/6" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-12" data-testid="text-no-reviews">
                <p className="text-muted-foreground text-lg">
                  No reviews yet. Be the first to share your experience!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reviews.map((review) => (
                  <Card key={review.id} className="p-6" data-testid={`review-card-${review.id}`}>
                    <div className="mb-4">
                      {renderStars(review.rating)}
                    </div>
                    <p className="text-muted-foreground mb-4" data-testid={`review-text-${review.id}`}>
                      "{review.comment}"
                    </p>
                    <div className="border-t pt-4">
                      <p className="font-semibold" data-testid={`review-author-${review.id}`}>
                        {review.customerName}
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid={`review-date-${review.id}`}>
                        {format(new Date(review.createdAt), "MMMM d, yyyy")}
                      </p>
                    </div>
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
