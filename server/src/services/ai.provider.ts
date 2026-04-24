import type { AnalysisResult, InboxItem } from "../types/index.js";

export interface AIProvider {
  analyze(items: InboxItem[]): Promise<AnalysisResult>;
}
