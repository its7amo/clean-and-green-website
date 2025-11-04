import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { QuoteForm } from "@/components/QuoteForm";

export default function Quote() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-16 md:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Get a Custom Quote</h1>
            <p className="text-lg text-muted-foreground">
              Tell us about your cleaning needs and we'll provide a personalized quote within 24 hours
            </p>
          </div>

          <QuoteForm />
        </div>
      </main>
      <Footer />
    </div>
  );
}
