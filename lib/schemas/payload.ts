import { z } from "zod";

export const MAX_PAYLOAD_BYTES = 256 * 1024;

export const providerSchema = z.enum(["github", "stripe", "generic"]);
export type Provider = z.infer<typeof providerSchema>;

const payloadSize = (value: string) =>
  new TextEncoder().encode(value).byteLength;

export const analysisInputSchema = z.object({
  rawPayload: z
    .string()
    .min(1, "Paste a JSON payload or load the sample first.")
    .refine(
      (value) => payloadSize(value) <= MAX_PAYLOAD_BYTES,
      "Payload exceeds the 256 KiB browser limit. Trim it before scanning.",
    ),
  provider: providerSchema,
  customKeys: z
    .string()
    .max(1_000, "Custom key list is too long. Keep it under 1,000 characters."),
});

export const signatureInputSchema = z.object({
  rawPayload: analysisInputSchema.shape.rawPayload,
  provider: providerSchema,
  secret: z
    .string()
    .min(1, "Enter the webhook secret used by the sending provider.")
    .max(512, "Secret exceeds the 512-character local input limit."),
  receivedSignature: z
    .string()
    .min(1, "Paste the signature header received with the webhook.")
    .max(2_048, "Signature header exceeds the 2,048-character input limit."),
});

export function parseCustomKeys(value: string): string[] {
  const keys = value
    .split(/[\n,]/)
    .map((key) => key.trim())
    .filter(Boolean);

  return [...new Set(keys)].slice(0, 50);
}
