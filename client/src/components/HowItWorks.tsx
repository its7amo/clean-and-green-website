import { Calendar, Sparkles, Heart } from "lucide-react";
import { Card } from "@/components/ui/card";

const steps = [
  {
    id: 1,
    icon: Calendar,
    title: "Book Online",
    description: "Choose your service, select a date and time that works for you, and book instantly online.",
  },
  {
    id: 2,
    icon: Sparkles,
    title: "We Clean",
    description: "Our professional team arrives on time with eco-friendly products and cleans your space thoroughly.",
  },
  {
    id: 3,
    icon: Heart,
    title: "Enjoy",
    description: "Relax in your sparkling clean space knowing you made an eco-conscious choice.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-lg text-muted-foreground">
            Getting your space professionally cleaned is easy with Clean & Green
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, idx) => (
            <div key={step.id} className="relative">
              <Card className="p-8 text-center h-full" data-testid={`card-step-${step.id}`}>
                <div className="mb-4 flex justify-center">
                  <div className="p-4 rounded-full bg-primary/10">
                    <step.icon className="h-12 w-12 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </Card>
              {idx < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-primary/30 z-10" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
