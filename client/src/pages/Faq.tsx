import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CallToAction } from "@/components/CallToAction";
import { PromoBanner } from "@/components/PromoBanner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useQuery } from "@tanstack/react-query";
import type { FaqItem } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function Faq() {
  const { data: faqItems = [], isLoading } = useQuery<FaqItem[]>({
    queryKey: ["/api/faq"],
  });

  const activeFaqs = faqItems
    .filter(faq => faq.active)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen flex flex-col">
      <PromoBanner />
      <Header />
      <main className="flex-1">
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Frequently Asked Questions</h1>
              <p className="text-lg text-muted-foreground">
                Find answers to common questions about our eco-friendly cleaning services
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="border rounded-lg p-4">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : activeFaqs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No FAQs available at the moment. Please check back later.</p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {activeFaqs.map((faq) => (
                  <AccordionItem key={faq.id} value={faq.id}>
                    <AccordionTrigger data-testid={`faq-question-${faq.id}`}>{faq.question}</AccordionTrigger>
                    <AccordionContent data-testid={`faq-answer-${faq.id}`}>{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </section>

        <CallToAction />
      </main>
      <Footer />
    </div>
  );
}
