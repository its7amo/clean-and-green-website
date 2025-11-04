import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Leaf } from "lucide-react";

export function CallToAction() {
  return (
    <section className="py-16 md:py-24 bg-primary text-primary-foreground">
      <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 text-center">
        <Leaf className="h-16 w-16 mx-auto mb-6" />
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Ready for a Cleaner, Greener Space?
        </h2>
        <p className="text-xl mb-8 text-primary-foreground/90">
          Book your eco-friendly cleaning service today and experience the Clean & Green difference
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/book">
            <Button
              size="lg"
              variant="outline"
              className="bg-white text-primary hover:bg-white/90 border-white"
              data-testid="button-cta-book"
            >
              Schedule a Cleaning
            </Button>
          </Link>
          <Link href="/quote">
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10"
              data-testid="button-cta-quote"
            >
              Get Free Quote
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
