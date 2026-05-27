import { env } from "../config/env.js";
import type { AnalysisResult, InboxItem } from "../types/index.js";
import type { AIProvider } from "./ai.provider.js";
import { GeminiProvider } from "./gemini.service.js";

function createProvider(): AIProvider {
  const provider = env.aiProvider.toLowerCase();

  switch (provider) {
    case "gemini":
      return new GeminiProvider();
    default:
      throw new Error(`Unsupported AI_PROVIDER: ${env.aiProvider}`);
  }
}

const aiProvider = createProvider();

export async function analyzePriorities(
  items: InboxItem[],
): Promise<AnalysisResult> {
  return aiProvider.analyze(items);
}
