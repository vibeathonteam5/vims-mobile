import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const isQuotaError = (error: any) => {
  const e = error || {};
  const msg = e.message || e.toString() || '';
  // Check deeper nested API error objects (e.g. error.error.code)
  const code = e.code || e.error?.code;
  const status = e.status || e.error?.status;
  const nestedMsg = e.error?.message || '';

  return msg.includes('429') || 
         msg.toLowerCase().includes('quota') || 
         msg.includes('RESOURCE_EXHAUSTED') ||
         nestedMsg.includes('429') ||
         nestedMsg.toLowerCase().includes('quota') ||
         code === 429 ||
         status === 'RESOURCE_EXHAUSTED';
};

export async function askVisitorAssistant(query: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: query,
      config: {
        systemInstruction: `You are the Vanguard VMS AI Assistant for a high-security corporate campus.
        Campus Details:
        - Tower A: Finance & Executives
        - Tower B: Tech & Innovation
        - Tower C: HR & Operations
        - Parking: Levels P1 to P4. Level P1 has 20 EV charging stations.
        - Security Rules: Visitors must wear lanyards at all times. No tailgating.
        - Facilities: Gym on Tower B Level 2, Cafeteria in Tower C Lobby.
        - Emergency: Dial 999 or call security extension 4444.
        
        Keep responses helpful, professional, and safety-oriented.`,
        temperature: 0.7,
      },
    });
    return response.text;
  } catch (error: any) {
    console.error("AI Assistant error:", error);
    
    if (isQuotaError(error)) {
        // Smart Offline Responses
        const q = query.toLowerCase();
        
        if (q.includes('park') || q.includes('car')) {
            return "🅿️ [Offline Mode] Visitor parking is available in Zone A and B (Levels P1-P2). EV charging is on P1.";
        }
        if (q.includes('wifi') || q.includes('internet')) {
            return "📶 [Offline Mode] The guest Wi-Fi network is 'Vanguard-Guest'. No password is required for the first 2 hours.";
        }
        if (q.includes('food') || q.includes('cafe') || q.includes('eat')) {
            return "☕ [Offline Mode] The main cafeteria is located in the Tower C Lobby, open from 8:00 AM to 4:00 PM.";
        }
        if (q.includes('toilet') || q.includes('restroom') || q.includes('washroom')) {
             return "🚻 [Offline Mode] Restrooms are located near the elevator banks on every floor.";
        }
        if (q.includes('nav') || q.includes('map') || q.includes('where')) {
             return "🗺️ [Offline Mode] You can use the 'Navigate Live' feature on your digital pass to find your way around.";
        }

        return "⚠️ High Traffic Warning: The AI Assistant is currently in limited mode due to network congestion. Please ask Security for complex queries.";
    }
    return "I'm having trouble connecting to the building mainframe. Please see the nearest security desk.";
  }
}