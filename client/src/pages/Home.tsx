import { Header } from "@/components/Header";
import { PromoBanner } from "@/components/PromoBanner";
import { Hero } from "@/components/Hero";
import { Services } from "@/components/Services";
import { StatsSection } from "@/components/StatsSection";
import { FeaturedGallery } from "@/components/FeaturedGallery";
import { HowItWorks } from "@/components/HowItWorks";
import { Testimonials } from "@/components/Testimonials";
import { CallToAction } from "@/components/CallToAction";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <PromoBanner />
      <Header />
      <main className="flex-1">
        <Hero />
        <Services />
        <StatsSection />
        <FeaturedGallery />
        <HowItWorks />
        <Testimonials />
        <CallToAction />
      </main>
      <Footer />
    </div>
  );
}
