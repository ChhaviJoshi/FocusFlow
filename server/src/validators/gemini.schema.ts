import { z } from 'zod';

/**
 * Zod schema for validating Gemini AI responses.
 * We NEVER trust `as AnalysisResult` — the AI could return malformed JSON,
 * missing fields, or wrong types. Zod catches all of that at runtime.
 */

const PrioritizedTaskSchema = z.object({
  id: z.string(),
  originalItemId: z.string(),
  title: z.string(),
  summary: z.string(),
  urgencyScore: z.number().min(1).max(10),
  importanceScore: z.number().min(1).max(10),
  reason: z.string(),
  suggestedAction: z.string(),
  category: z.enum(['Client', 'Internal', 'Project', 'Admin']),
});

const ItemClassificationSchema = z.object({
  itemId: z.string(),
  category: z.enum(['Urgent', 'Important', 'Routine', 'Noise']),
});

export const AnalysisResultSchema = z.object({
  topPriorities: z.array(PrioritizedTaskSchema).min(0).max(10),
  productivityScore: z.number().min(0).max(100),
  distribution: z.object({
    urgent: z.number().min(0),
    important: z.number().min(0),
    routine: z.number().min(0),
    noise: z.number().min(0),
  }),
  itemClassifications: z.array(ItemClassificationSchema),
});

export type ValidatedAnalysisResult = z.infer<typeof AnalysisResultSchema>;
