
import { GoogleGenAI, Type } from "@google/genai";
import { User, Event, Recommendation } from "../types";

// Always use direct process.env.API_KEY as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAIRecommendations = async (user: User, events: Event[]): Promise<Recommendation[]> => {
  const userProfileSummary = `
    Interests: ${user.interests.join(', ')}
    Saved Events: ${user.savedEvents.length}
    Recent Interactions: ${user.interactions.map(i => `${i.type} on event id ${i.eventId}`).join('; ')}
  `;

  const availableEvents = events.map(e => ({
    id: e.id,
    title: e.title,
    category: e.category,
    description: e.description
  }));

  const prompt = `
    As a friendly and helpful local concierge, analyze the user's profile and recommend the top 3-5 events from the provided list.
    
    User Profile:
    ${userProfileSummary}

    Available Events:
    ${JSON.stringify(availableEvents, null, 2)}

    For each recommendation:
    1. Identify why it's a good fit based on their specific interests or past behavior.
    2. Write a warm, human-like explanation.
    3. Assign a match score between 0 and 1.

    Explain clearly and avoid sounding robotic.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              eventId: { type: Type.STRING },
              reason: { type: Type.STRING },
              matchScore: { type: Type.NUMBER }
            },
            required: ["eventId", "reason", "matchScore"]
          }
        }
      }
    });

    // Use .text property as per guidelines
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("AI Recommendation Error:", error);
    return [];
  }
};
