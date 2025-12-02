import { GoogleGenAI, Type } from "@google/genai";
import { GameTheme } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Default theme in case API fails or for initial state
export const DEFAULT_THEME: GameTheme = {
  name: "Neon Genesis",
  gridColor: "#1f2937",
  snakeHeadColor: "#00ffcc",
  snakeBodyColor: "#00ccaa",
  foodColor: "#ff00ff",
  backgroundColor: "#000000",
  glowColor: "rgba(0, 255, 204, 0.5)",
  storyText: "System initialized. Grid online. Consume energy nodes to survive."
};

export const generateLevelTheme = async (level: number, previousThemeName: string): Promise<GameTheme> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a visual theme for Level ${level} of a cyber-snake game. 
      Previous theme was: ${previousThemeName}. Make it distinct and cool.
      Return JSON only. Colors must be hex codes.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            gridColor: { type: Type.STRING, description: "Dark hex color for grid lines" },
            snakeHeadColor: { type: Type.STRING, description: "Bright hex color" },
            snakeBodyColor: { type: Type.STRING, description: "Slightly dimmer hex color" },
            foodColor: { type: Type.STRING, description: "Contrasting bright hex color" },
            backgroundColor: { type: Type.STRING, description: "Very dark background color" },
            glowColor: { type: Type.STRING, description: "CSS rgba string for box-shadow glow" },
            storyText: { type: Type.STRING, description: "A short, 1-sentence sci-fi flavor text about this sector." },
          },
          required: ["name", "gridColor", "snakeHeadColor", "snakeBodyColor", "foodColor", "backgroundColor", "glowColor", "storyText"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as GameTheme;
    }
    return DEFAULT_THEME;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      ...DEFAULT_THEME,
      name: `Level ${level} (Offline Mode)`,
      storyText: "Uplink failed. Running local simulation."
    };
  }
};
