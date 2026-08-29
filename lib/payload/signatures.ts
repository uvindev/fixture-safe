/**
 * @project  FixtureSafe — iamuvin.com
 * @author   Uvin Vindula (IAMUVIN)
 * @website  https://iamuvin.com
 * @company  ASI Research Labs — asiresearch.io
 * @built    2026
 * @license  MIT
 */

import type { Provider } from "@/lib/schemas/payload";

export type SignatureResult = {
  valid: boolean;
  expectedSignature: string;
  reason: string;
};

function bytesToHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantWorkEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function hmacSha256Hex(
  secret: string,
  message: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return bytesToHex(digest);
}

export async function sha256Hex(message: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(message),
  );
  return bytesToHex(digest);
}

export async function verifySignature(input: {
  provider: Provider;
  rawPayload: string;
  secret: string;
  receivedSignature: string;
  nowSeconds?: number;
  toleranceSeconds?: number;
}): Promise<SignatureResult> {
  const {
    provider,
    rawPayload,
    secret,
    receivedSignature,
    nowSeconds = Math.floor(Date.now() / 1_000),
    toleranceSeconds = 300,
  } = input;

  if (provider === "stripe") {
    const parts = receivedSignature.split(",").map((part) => part.trim());
    const timestampPart = parts.find((part) => part.startsWith("t="));
    const candidates = parts
      .filter((part) => part.startsWith("v1="))
      .map((part) => part.slice(3).toLowerCase());
    const timestamp = Number(timestampPart?.slice(2));

    if (
      !timestampPart ||
      !Number.isInteger(timestamp) ||
      candidates.length === 0
    ) {
      return {
        valid: false,
        expectedSignature: "",
        reason:
          "Stripe header must contain an integer t value and at least one v1 signature.",
      };
    }

    const expected = await hmacSha256Hex(secret, `${timestamp}.${rawPayload}`);
    if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
      return {
        valid: false,
        expectedSignature: `v1=${expected}`,
        reason: `Signature timestamp is outside the ${toleranceSeconds}-second replay window.`,
      };
    }

    const valid = candidates.some((candidate) =>
      constantWorkEqual(candidate, expected),
    );
    return {
      valid,
      expectedSignature: `v1=${expected}`,
      reason: valid
        ? "Signature matches the raw payload and timestamp."
        : "Signature does not match the raw payload. Check the secret and unmodified request body.",
    };
  }

  const expected = await hmacSha256Hex(secret, rawPayload);
  const normalizedReceived = receivedSignature
    .trim()
    .toLowerCase()
    .replace(/^sha256=/, "");
  const valid = constantWorkEqual(normalizedReceived, expected);
  return {
    valid,
    expectedSignature: provider === "github" ? `sha256=${expected}` : expected,
    reason: valid
      ? "Signature matches the exact raw payload."
      : "Signature does not match. Check the secret and make sure the payload was not reformatted.",
  };
}
