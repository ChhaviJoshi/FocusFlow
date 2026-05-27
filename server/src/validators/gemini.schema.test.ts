import { ZodError } from "zod";
import { AnalysisResultSchema } from "./gemini.schema";

function makeValidAnalysisResult() {
  return {
    topPriorities: [
      {
        id: "priority-1",
        originalItemId: "item-1",
        title: "Respond to customer issue",
        summary: "Customer escalation requires same-day response",
        urgencyScore: 0.92,
        importanceScore: 0.88,
        reason: "Revenue-impacting client at risk",
        suggestedAction: "Reply with ETA and mitigation plan",
        category: "Client",
      },
    ],
    productivityScore: 72,
    distribution: {
      urgent: 3,
      important: 5,
      routine: 2,
      noise: 1,
    },
    itemClassifications: [
      {
        itemId: "item-1",
        category: "Urgent",
      },
    ],
  };
}

describe("AnalysisResultSchema", () => {
  it("passes for a valid AnalysisResult shape", () => {
    const parsed = AnalysisResultSchema.parse(makeValidAnalysisResult());
    expect(parsed.topPriorities).toHaveLength(1);
  });

  it("throws ZodError when required fields are missing", () => {
    const invalid = makeValidAnalysisResult();
    delete (invalid as any).distribution;

    expect(() => AnalysisResultSchema.parse(invalid)).toThrow(ZodError);
  });

  it("throws ZodError when urgencyScore is outside 0-1 range", () => {
    const invalid = makeValidAnalysisResult();
    invalid.topPriorities[0].urgencyScore = 1.2;

    expect(() => AnalysisResultSchema.parse(invalid)).toThrow(ZodError);
  });

  it("defaults lowConfidence to false when omitted", () => {
    const parsed = AnalysisResultSchema.parse(makeValidAnalysisResult());
    expect(parsed.lowConfidence).toBe(false);
  });
});
