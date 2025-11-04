import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Services } from "@/components/Services";
import { CallToAction } from "@/components/CallToAction";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What eco-friendly products do you use?",
    answer: "We use certified green cleaning products that are non-toxic, biodegradable, and safe for children and pets. All our products meet EPA Safer Choice standards.",
  },
  {
    question: "Do you bring your own supplies?",
    answer: "Yes! We bring all necessary cleaning supplies and equipment. You don't need to provide anything.",
  },
  {
    question: "How long does a typical cleaning take?",
    answer: "A standard residential cleaning takes 2-4 hours depending on size. Commercial cleanings are scheduled based on your specific needs.",
  },
  {
    question: "Are you insured?",
    answer: "Yes, we are fully insured and bonded for your protection and peace of mind.",
  },
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Our Services</h1>
              <p className="text-lg text-muted-foreground">
                Comprehensive eco-friendly cleaning solutions for homes and businesses across Oklahoma
              </p>
            </div>
          </div>
        </section>

        <Services />

        <section className="py-16 md:py-24">
          <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8">
            <h2 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger data-testid={`faq-question-${index}`}>{faq.question}</AccordionTrigger>
                  <AccordionContent data-testid={`faq-answer-${index}`}>{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <CallToAction />
      </main>
      <Footer />
    </div>
  );
}
