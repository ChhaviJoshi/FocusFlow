import { GoogleGenAI, Type } from "@google/genai";
import { env } from "../config/env.js";
import { AnalysisResultSchema } from "../validators/gemini.schema.js";
import { maskPII } from "../validators/sanitizer.js";
import type { InboxItem, AnalysisResult } from "../types/index.js";
import type { AIProvider } from "./ai.provider.js";

const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });

function isLowConfidence(result: AnalysisResult): boolean {
  const scores = result.topPriorities.map((task) => task.urgencyScore);
  if (scores.length < 2) return false;

  const sorted = [...scores].sort((a, b) => a - b);
  let largestCluster = 1;

  for (let start = 0; start < sorted.length; start += 1) {
    let end = start;
    while (end < sorted.length && sorted[end] - sorted[start] <= 0.1) {
      end += 1;
    }
    largestCluster = Math.max(largestCluster, end - start);
  }

  return largestCluster / sorted.length > 0.8;
}

export class GeminiProvider implements AIProvider {
  async analyze(items: InboxItem[]): Promise<AnalysisResult> {
    try {
      const promptItems = maskPII(items);

      const prompt = `
You are an expert Executive Productivity Assistant.
Analyze the following list of incoming communications (Emails, Slack messages, Jira tickets, Calendar events).

Your goal is to:
1. Identify the top 3-5 most critical tasks based on Urgency (time sensitivity) and Importance (business impact).
2. Classify EVERY single input item into one of four categories: "Urgent", "Important", "Routine", or "Noise".
3. Provide a reasoning for why the top items are prioritized.
4. Suggest an immediate action for top items.
5. Calculate a 'Productivity Score' (0-100).
6. Provide distribution counts.

Input Data (PII-masked):
${JSON.stringify(promptItems)}
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              topPriorities: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: {
                      type: Type.STRING,
                      description: "A unique ID for the priority item",
                    },
                    originalItemId: {
                      type: Type.STRING,
                      description: "The ID of the input item",
                    },
                    title: {
                      type: Type.STRING,
                      description: "A concise action-oriented title",
                    },
                    summary: {
                      type: Type.STRING,
                      description: "Brief summary of the issue",
                    },
                    urgencyScore: {
                      type: Type.NUMBER,
                      description: "0-1 scale",
                    },
                    importanceScore: {
                      type: Type.NUMBER,
                      description: "0-1 scale",
                    },
                    reason: {
                      type: Type.STRING,
                      description: "Why this is prioritized",
                    },
                    suggestedAction: {
                      type: Type.STRING,
                      description: "Next step to take",
                    },
                    category: {
                      type: Type.STRING,
                      enum: ["Client", "Internal", "Project", "Admin"],
                    },
                  },
                  required: [
                    "id",
                    "originalItemId",
                    "title",
                    "summary",
                    "urgencyScore",
                    "importanceScore",
                    "reason",
                    "suggestedAction",
                    "category",
                  ],
                },
              },
              productivityScore: { type: Type.NUMBER },
              distribution: {
                type: Type.OBJECT,
                properties: {
                  urgent: { type: Type.NUMBER },
                  important: { type: Type.NUMBER },
                  routine: { type: Type.NUMBER },
                  noise: { type: Type.NUMBER },
                },
                required: ["urgent", "important", "routine", "noise"],
              },
              itemClassifications: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    itemId: { type: Type.STRING },
                    category: {
                      type: Type.STRING,
                      enum: ["Urgent", "Important", "Routine", "Noise"],
                    },
                  },
                  required: ["itemId", "category"],
                },
              },
            },
            required: [
              "topPriorities",
              "productivityScore",
              "distribution",
              "itemClassifications",
            ],
          },
        },
      });

      if (!response.text) {
        throw new Error("No response text from Gemini");
      }

      const parsed = JSON.parse(response.text);
      const validated = AnalysisResultSchema.parse(parsed);
      validated.lowConfidence = isLowConfidence(validated);

      return validated;
    } catch (error) {
      throw new Error(
        `Gemini analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
