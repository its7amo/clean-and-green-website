import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BookingForm } from "@/components/BookingForm";

export default function Book() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-16 md:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Book Your Cleaning</h1>
            <p className="text-lg text-muted-foreground">
              Schedule your eco-friendly cleaning service in just a few simple steps
            </p>
          </div>

          <BookingForm />
        </div>
      </main>
      <Footer />
    </div>
  );
}
