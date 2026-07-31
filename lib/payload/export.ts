import { countFindings, type AnalysisResult } from "@/lib/payload/redact";
import type { Provider } from "@/lib/schemas/payload";

export type FixtureManifest = {
  schemaVersion: "1.0";
  tool: "FixtureSafe";
  toolVersion: "0.1.0";
  generatedAt: string;
  provider: Provider;
  originalSha256: string;
  originalBytes: number;
  findingCount: number;
  findingTypes: Record<string, number>;
  customKeys: string[];
  notice: string;
};

export function buildManifest(input: {
  analysis: AnalysisResult;
  provider: Provider;
  customKeys: string[];
  originalSha256: string;
  generatedAt?: string;
}): FixtureManifest {
  return {
    schemaVersion: "1.0",
    tool: "FixtureSafe",
    toolVersion: "0.1.0",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    provider: input.provider,
    originalSha256: input.originalSha256,
    originalBytes: input.analysis.bytes,
    findingCount: input.analysis.findings.length,
    findingTypes: countFindings(input.analysis.findings),
    customKeys: [...input.customKeys],
    notice: "Heuristic scan. Review the sanitized fixture before sharing it.",
  };
}
