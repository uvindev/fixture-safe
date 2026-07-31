import { describe, expect, it } from "vitest";
import { buildManifest } from "@/lib/payload/export";
import { analyzePayload } from "@/lib/payload/redact";
import { sha256Hex, verifySignature } from "@/lib/payload/signatures";
import { analysisInputSchema, MAX_PAYLOAD_BYTES } from "@/lib/schemas/payload";

describe("FixtureSafe paid workflow", () => {
  it("redacts nested preset, pattern, and custom matches without mutating input", async () => {
    const rawPayload = JSON.stringify({
      customer: {
        email: "buyer@example.com",
        card_number: "4242 4242 4242 4242",
      },
      authorization: "Bearer documented_example_token",
      records: [{ internal_note: "agency-only" }],
      safe: "invoice_123",
    });

    const analysis = analyzePayload(rawPayload, "stripe", ["internal_note"]);
    const sanitized = analysis.sanitized as {
      customer: { email: string; card_number: string };
      authorization: string;
      records: Array<{ internal_note: string }>;
      safe: string;
    };

    expect(sanitized.customer.email).toBe("[REDACTED_EMAIL]");
    expect(sanitized.customer.card_number).toBe("[REDACTED_KEY]");
    expect(sanitized.authorization).toBe("[REDACTED_KEY]");
    expect(sanitized.records[0]?.internal_note).toBe("[REDACTED_KEY]");
    expect(sanitized.safe).toBe("invoice_123");
    expect(rawPayload).toContain("buyer@example.com");
    expect(analysis.findings.map((finding) => finding.path)).toEqual(
      expect.arrayContaining([
        "$.authorization",
        "$.customer.card_number",
        "$.customer.email",
        "$.records[0].internal_note",
      ]),
    );

    const originalSha256 = await sha256Hex(rawPayload);
    const manifest = buildManifest({
      analysis,
      provider: "stripe",
      customKeys: ["internal_note"],
      originalSha256,
      generatedAt: "2026-07-31T00:00:00.000Z",
    });
    const exported = JSON.stringify({ sanitized, manifest });
    expect(exported).not.toContain("buyer@example.com");
    expect(exported).not.toContain("agency-only");
    expect(manifest.originalSha256).toHaveLength(64);
    expect(manifest.findingCount).toBe(4);
  });

  it("produces deterministic redaction for the same policy", () => {
    const payload = '{"user":{"email":"same@example.com"},"api_key":"abc"}';
    const first = analyzePayload(payload, "generic", []);
    const second = analyzePayload(payload, "generic", []);
    expect(first).toEqual(second);
  });

  it("rejects malformed JSON and scalar roots with a recovery message", () => {
    expect(() => analyzePayload("{bad", "generic", [])).toThrow(
      "JSON could not be parsed",
    );
    expect(() => analyzePayload('"scalar"', "generic", [])).toThrow(
      "JSON root must be an object or array",
    );
  });

  it("rejects payloads larger than the browser limit before parsing", () => {
    const result = analysisInputSchema.safeParse({
      rawPayload: "x".repeat(MAX_PAYLOAD_BYTES + 1),
      provider: "generic",
      customKeys: "",
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues[0]?.message).toContain("256 KiB");
  });
});

describe("webhook signatures", () => {
  it("matches GitHub's published HMAC-SHA256 test vector", async () => {
    const result = await verifySignature({
      provider: "github",
      secret: "It's a Secret to Everybody",
      rawPayload: "Hello, World!",
      receivedSignature:
        "sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17",
    });

    expect(result.valid).toBe(true);
    expect(result.expectedSignature).toBe(
      "sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17",
    );
  });

  it("verifies Stripe's timestamped payload inside the replay window", async () => {
    const timestamp = 1_800_000_000;
    const rawPayload = '{"id":"evt_test"}';
    const secret = "whsec_fixture_test";
    const digest = await verifySignature({
      provider: "stripe",
      rawPayload,
      secret,
      receivedSignature: `t=${timestamp},v1=invalid`,
      nowSeconds: timestamp,
    });

    const valid = await verifySignature({
      provider: "stripe",
      rawPayload,
      secret,
      receivedSignature: `t=${timestamp},${digest.expectedSignature}`,
      nowSeconds: timestamp + 120,
    });
    expect(valid.valid).toBe(true);
  });

  it("rejects stale Stripe signatures even when the digest matches", async () => {
    const timestamp = 1_800_000_000;
    const rawPayload = '{"id":"evt_stale"}';
    const secret = "whsec_fixture_test";
    const firstPass = await verifySignature({
      provider: "stripe",
      rawPayload,
      secret,
      receivedSignature: `t=${timestamp},v1=invalid`,
      nowSeconds: timestamp,
    });
    const stale = await verifySignature({
      provider: "stripe",
      rawPayload,
      secret,
      receivedSignature: `t=${timestamp},${firstPass.expectedSignature}`,
      nowSeconds: timestamp + 301,
    });

    expect(stale.valid).toBe(false);
    expect(stale.reason).toContain("outside the 300-second replay window");
  });

  it("fails when the raw body is reformatted", async () => {
    const compact = '{"ok":true}';
    const signed = await verifySignature({
      provider: "generic",
      rawPayload: compact,
      secret: "fixture-secret",
      receivedSignature: "invalid",
    });
    const changed = await verifySignature({
      provider: "generic",
      rawPayload: '{ "ok": true }',
      secret: "fixture-secret",
      receivedSignature: signed.expectedSignature,
    });
    expect(changed.valid).toBe(false);
  });
});
