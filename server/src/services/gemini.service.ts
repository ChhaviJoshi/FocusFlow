import { GoogleGenAI, Type } from '@google/genai';
import { env } from '../config/env.js';
import { AnalysisResultSchema } from '../validators/gemini.schema.js';
import { sanitizeInboxItem } from '../validators/sanitizer.js';
import type { InboxItem, AnalysisResult } from '../types/index.js';

/**
 * Gemini AI service — analyzes inbox items and produces prioritized task list.
 * Now runs server-side with:
 * - API key safely in server env (not client bundle)
 * - Zod validation on AI response (never trust raw output)
 * - Prompt injection sanitization on all input content
 */

const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });

export async function analyzePriorities(items: InboxItem[]): Promise<AnalysisResult> {
  // Sanitize all inbox items before they enter the prompt
  const sanitizedItems = items.map(sanitizeInboxItem);

  const prompt = `
    You are an expert Executive Productivity Assistant.
    Analyze the following list of incoming communications (Emails, Slack messages, Jira tickets, Calendar events).
    
    Your goal is to:
    1. Identify the top 3-5 most critical tasks based on Urgency (time sensitivity) and Importance (business impact).
    2. Classify EVERY single input item into one of four categories: "Urgent", "Important", "Routine", or "Noise".
    3. Provide a reasoning for why the top items are prioritized.
    4. Suggest an immediate action for top items.
    5. Calculate a 'Productivity Score' (0-100) representing how well the user is doing based on the volume of urgent vs noise (simulation).
    6. Provide distribution counts.

    Input Data:
    ${JSON.stringify(sanitizedItems)}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topPriorities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: 'A unique ID for the priority item' },
                originalItemId: { type: Type.STRING, description: 'The ID of the input item' },
                title: { type: Type.STRING, description: 'A concise action-oriented title' },
                summary: { type: Type.STRING, description: 'Brief summary of the issue' },
                urgencyScore: { type: Type.NUMBER, description: '1-10 scale' },
                importanceScore: { type: Type.NUMBER, description: '1-10 scale' },
                reason: { type: Type.STRING, description: 'Why this is prioritized' },
                suggestedAction: { type: Type.STRING, description: "Next step: e.g., 'Reply immediately', 'Review doc'" },
                category: { type: Type.STRING, enum: ['Client', 'Internal', 'Project', 'Admin'] },
              },
              required: ['id', 'originalItemId', 'title', 'summary', 'urgencyScore', 'importanceScore', 'reason', 'suggestedAction', 'category'],
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
            required: ['urgent', 'important', 'routine', 'noise'],
          },
          itemClassifications: {
            type: Type.ARRAY,
            description: 'Classification for every single item in the input list',
            items: {
              type: Type.OBJECT,
              properties: {
                itemId: { type: Type.STRING },
                category: { type: Type.STRING, enum: ['Urgent', 'Important', 'Routine', 'Noise'] },
              },
              required: ['itemId', 'category'],
            },
          },
        },
        required: ['topPriorities', 'productivityScore', 'distribution', 'itemClassifications'],
      },
    },
  });

  if (!response.text) {
    throw new Error('No response text from Gemini');
  }

  // Parse and VALIDATE with Zod — never trust AI output blindly
  const parsed = JSON.parse(response.text);
  const validated = AnalysisResultSchema.parse(parsed);

  return validated;
}
