import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import customer1 from "@assets/generated_images/Happy_customer_testimonial_portrait_eb9ed62d.png";
import customer2 from "@assets/generated_images/Satisfied_customer_testimonial_portrait_4ff9a5b9.png";
import customer3 from "@assets/generated_images/Young_professional_customer_portrait_886ec1f9.png";

const testimonials = [
  {
    id: 1,
    name: "Sarah Johnson",
    location: "Oklahoma City, OK",
    service: "Residential Cleaning",
    rating: 5,
    image: customer1,
    quote: "Clean & Green transformed my home! The team was professional, thorough, and I love that they use eco-friendly products. My house has never looked better.",
  },
  {
    id: 2,
    name: "Michael Roberts",
    location: "Tulsa, OK",
    service: "Commercial Cleaning",
    rating: 5,
    image: customer2,
    quote: "We've been using Clean & Green for our office for 6 months now. They're reliable, detail-oriented, and our employees love coming to a spotless workspace every morning.",
  },
  {
    id: 3,
    name: "Emily Davis",
    location: "Norman, OK",
    service: "Deep Cleaning",
    rating: 5,
    image: customer3,
    quote: "The deep cleaning service was incredible! They got into every corner and crevice. Worth every penny, and I feel good knowing they're using safe, green products.",
  },
];

export function Testimonials() {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Customers Say</h2>
          <p className="text-lg text-muted-foreground">
            Don't just take our word for it - hear from satisfied Oklahoma homeowners and businesses
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id} className="p-6" data-testid={`card-testimonial-${testimonial.id}`}>
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={testimonial.image} alt={testimonial.name} />
                  <AvatarFallback>{testimonial.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-semibold">{testimonial.name}</h4>
                  <p className="text-sm text-muted-foreground">{testimonial.location}</p>
                </div>
              </div>

              <div className="flex gap-1 mb-3">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              <p className="text-sm italic text-muted-foreground mb-3">"{testimonial.quote}"</p>
              <p className="text-xs text-muted-foreground">Service: {testimonial.service}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
