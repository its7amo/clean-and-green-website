import { db } from "./db";
import { services, faqItems, businessSettings, serviceAreas } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Starting database seed...");

  // Add default services
  const defaultServices = [
    {
      name: "Residential Cleaning",
      description: "Professional cleaning for your home. We use eco-friendly products to ensure your living space is spotless and safe for your family.",
      basePrice: 8900, // $89.00
      imageUrl: "",
      icon: "home",
      active: true,
    },
    {
      name: "Commercial Cleaning",
      description: "Comprehensive cleaning solutions for offices and commercial spaces. Maintain a professional environment for your employees and clients.",
      basePrice: 14900, // $149.00
      imageUrl: "",
      icon: "building",
      active: true,
    },
    {
      name: "Deep Cleaning",
      description: "Intensive cleaning service that reaches every corner. Perfect for seasonal cleaning or preparing your space for special occasions.",
      basePrice: 19900, // $199.00
      imageUrl: "",
      icon: "sparkles",
      active: true,
    },
    {
      name: "Move In/Out Cleaning",
      description: "Make your move stress-free with our thorough move-in or move-out cleaning service. We ensure the property is spotless.",
      basePrice: 24900, // $249.00
      imageUrl: "",
      icon: "truck",
      active: true,
    },
  ];

  console.log("Adding services...");
  for (const service of defaultServices) {
    const existing = await db.select().from(services).where(eq(services.name, service.name));
    if (existing.length === 0) {
      await db.insert(services).values(service);
      console.log(`Added service: ${service.name}`);
    } else {
      console.log(`Service already exists: ${service.name}`);
    }
  }

  // Add default FAQ items
  const defaultFAQs = [
    {
      question: "What areas do you serve in Oklahoma?",
      answer: "We proudly serve the greater Oklahoma City metro area and surrounding communities. Contact us to confirm service availability in your specific location.",
      order: 1,
      active: true,
    },
    {
      question: "Are your cleaning products eco-friendly?",
      answer: "Yes! All our cleaning products are 100% eco-friendly and safe for your family, pets, and the environment. We're committed to green cleaning practices.",
      order: 2,
      active: true,
    },
    {
      question: "Do I need to provide cleaning supplies?",
      answer: "No, we bring all necessary cleaning supplies and equipment. However, if you have specific products you'd like us to use, we're happy to accommodate.",
      order: 3,
      active: true,
    },
    {
      question: "How much does a cleaning service cost?",
      answer: "Pricing varies based on the size of your property and the type of service. Residential cleaning starts at $89, commercial at $149, and deep cleaning at $199. Request a free quote for an accurate estimate.",
      order: 4,
      active: true,
    },
    {
      question: "What if I need to reschedule my appointment?",
      answer: "We understand plans change! Please contact us at least 24 hours in advance to reschedule your appointment without any fees.",
      order: 5,
      active: true,
    },
    {
      question: "Are you insured and bonded?",
      answer: "Yes, Clean & Green is fully insured and bonded for your peace of mind. Your property is protected while we work.",
      order: 6,
      active: true,
    },
    {
      question: "How long does a typical cleaning take?",
      answer: "Cleaning time depends on property size and service type. A standard residential cleaning typically takes 2-4 hours, while deep cleaning may take 4-6 hours.",
      order: 7,
      active: true,
    },
    {
      question: "Do I need to be home during the cleaning?",
      answer: "No, you don't need to be present. Many clients provide access instructions and go about their day. We'll secure your property when finished.",
      order: 8,
      active: true,
    },
  ];

  console.log("Adding FAQ items...");
  for (const faq of defaultFAQs) {
    const existing = await db.select().from(faqItems).where(eq(faqItems.question, faq.question));
    if (existing.length === 0) {
      await db.insert(faqItems).values(faq);
      console.log(`Added FAQ: ${faq.question}`);
    } else {
      console.log(`FAQ already exists: ${faq.question}`);
    }
  }

  // Add business settings if they don't exist
  console.log("Adding business settings...");
  const existingSettings = await db.select().from(businessSettings);
  if (existingSettings.length === 0) {
    await db.insert(businessSettings).values({
      businessName: "Clean & Green",
      tagline: "Eco-Friendly Cleaning for a Healthier Oklahoma",
      phone: "(405) 555-0123",
      email: "cleanandgreenok@gmail.com",
      address: "Oklahoma City, OK",
      hoursMonFri: "8:00 AM - 6:00 PM",
      hoursSat: "9:00 AM - 4:00 PM",
      hoursSun: "Closed",
      aboutText: "We are Oklahoma's premier eco-friendly cleaning service, dedicated to providing professional cleaning solutions using only green, sustainable products.",
    });
    console.log("Added business settings");
  } else {
    console.log("Business settings already exist");
  }

  // Add service areas with zip codes
  const defaultServiceAreas = [
    {
      name: "Oklahoma City",
      zipCodes: ["73101", "73102", "73103", "73104", "73105", "73106", "73107", "73108", "73109", "73110", "73111", "73112", "73113", "73114", "73115", "73116", "73117", "73118", "73119", "73120", "73121", "73122", "73123", "73124", "73125", "73126", "73127", "73128", "73129", "73130", "73131", "73132", "73134", "73135", "73136", "73137", "73139", "73140", "73141", "73142", "73143", "73144", "73145", "73146", "73147", "73148", "73149", "73150", "73151", "73152", "73153", "73154", "73155", "73156", "73157", "73159", "73160", "73162", "73163", "73164", "73165", "73167", "73169", "73170", "73172", "73173", "73178", "73179", "73184", "73185", "73189", "73190", "73194", "73195", "73196", "73198"],
      isActive: true,
    },
    {
      name: "Edmond",
      zipCodes: ["73003", "73012", "73013", "73025", "73034", "73083"],
      isActive: true,
    },
    {
      name: "Piedmont",
      zipCodes: ["73078"],
      isActive: true,
    },
    {
      name: "Yukon",
      zipCodes: ["73085", "73099"],
      isActive: true,
    },
    {
      name: "Moore",
      zipCodes: ["73153", "73160", "73165", "73170"],
      isActive: true,
    },
    {
      name: "Norman",
      zipCodes: ["73019", "73026", "73069", "73070", "73071", "73072"],
      isActive: true,
    },
    {
      name: "Mustang",
      zipCodes: ["73064"],
      isActive: true,
    },
    {
      name: "El Reno",
      zipCodes: ["73036"],
      isActive: true,
    },
  ];

  console.log("Adding service areas...");
  for (const area of defaultServiceAreas) {
    const existing = await db.select().from(serviceAreas).where(eq(serviceAreas.name, area.name));
    if (existing.length === 0) {
      await db.insert(serviceAreas).values(area);
      console.log(`Added service area: ${area.name} with ${area.zipCodes.length} zip codes`);
    } else {
      // Update existing area with new zip codes
      await db.update(serviceAreas).set({ zipCodes: area.zipCodes }).where(eq(serviceAreas.name, area.name));
      console.log(`Updated service area: ${area.name} with ${area.zipCodes.length} zip codes`);
    }
  }

  console.log("Seed completed successfully!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
