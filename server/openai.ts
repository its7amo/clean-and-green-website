import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function getChatResponse(
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  businessContext?: {
    businessName: string;
    services: Array<{ name: string; description: string; basePrice: number }>;
    phone: string;
    email: string;
    hours: string;
  }
): Promise<string> {
  const systemPrompt = businessContext
    ? `You are a friendly AI assistant for ${businessContext.businessName}, a professional cleaning service company in Oklahoma. Your role is to help customers:
- Learn about our cleaning services
- Understand pricing (all prices are estimates, final quotes may vary)
- Answer questions about booking and scheduling
- Provide general information about our business

Available Services:
${businessContext.services.map(s => `- ${s.name}: ${s.description} (Starting at $${(s.basePrice / 100).toFixed(2)})`).join('\n')}

Contact Information:
- Phone: ${businessContext.phone}
- Email: ${businessContext.email}
- Hours: ${businessContext.hours}

Guidelines:
- Be helpful, friendly, and professional
- For booking or specific quotes, encourage customers to fill out our booking/quote form or call us
- Don't make promises about availability or exact pricing without verification
- If asked about something outside your knowledge, politely suggest they contact us directly
- Keep responses concise but informative`
    : `You are a helpful AI assistant for a cleaning service company. Help customers with their questions about cleaning services, booking, and general inquiries.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
    max_completion_tokens: 500,
  });

  return response.choices[0].message.content || "I apologize, I couldn't generate a response. Please try again.";
}

export { openai };
