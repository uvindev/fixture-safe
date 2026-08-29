/**
 * @project  FixtureSafe — iamuvin.com
 * @author   Uvin Vindula (IAMUVIN)
 * @website  https://iamuvin.com
 * @company  ASI Research Labs — asiresearch.io
 * @built    2026
 * @license  MIT
 */

import type { Provider } from "@/lib/schemas/payload";

export type FindingType =
  | "sensitive-key"
  | "email"
  | "ipv4"
  | "jwt"
  | "bearer-token"
  | "stripe-secret"
  | "github-token"
  | "payment-card";

export type Finding = {
  path: string;
  type: FindingType;
  reason: string;
  source: "preset" | "custom" | "value-pattern";
};

export type AnalysisResult = {
  sanitized: unknown;
  findings: Finding[];
  bytes: number;
};

const COMMON_KEYS = [
  "authorization",
  "cookie",
  "set-cookie",
  "password",
  "passwd",
  "secret",
  "client_secret",
  "api_key",
  "apikey",
  "access_token",
  "refresh_token",
  "private_key",
  "card_number",
  "cvc",
  "cvv",
  "ssn",
];

const PROVIDER_KEYS: Record<Provider, string[]> = {
  github: ["x-hub-signature", "x-hub-signature-256", "installation_token"],
  stripe: ["stripe-signature", "payment_method", "source", "client_secret"],
  generic: [],
};

const PATTERNS: Array<{
  type: Exclude<FindingType, "sensitive-key" | "payment-card">;
  expression: RegExp;
  replacement: string;
  reason: string;
}> = [
  {
    type: "stripe-secret",
    expression: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{12,}\b/g,
    replacement: "[REDACTED_STRIPE_KEY]",
    reason: "Matches a Stripe secret or restricted key shape.",
  },
  {
    type: "github-token",
    expression: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
    replacement: "[REDACTED_GITHUB_TOKEN]",
    reason: "Matches a GitHub token shape.",
  },
  {
    type: "jwt",
    expression: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    replacement: "[REDACTED_JWT]",
    reason: "Matches a three-part JWT shape.",
  },
  {
    type: "bearer-token",
    expression: /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}\b/gi,
    replacement: "Bearer [REDACTED_TOKEN]",
    reason: "Matches a bearer credential.",
  },
  {
    type: "email",
    expression: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    replacement: "[REDACTED_EMAIL]",
    reason: "Matches an email address.",
  },
  {
    type: "ipv4",
    expression:
      /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g,
    replacement: "[REDACTED_IP]",
    reason: "Matches an IPv4 address.",
  },
];

function normalizeKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/[\s.-]+/g, "_");
}

function appendPath(path: string, key: string | number): string {
  if (typeof key === "number") return `${path}[${key}]`;
  if (/^[A-Za-z_$][\w$]*$/.test(key)) return `${path}.${key}`;
  return `${path}[${JSON.stringify(key)}]`;
}

function passesLuhn(value: string): boolean {
  const digits = value.replace(/[-\s]/g, "");
  if (!/^\d{13,19}$/.test(digits) || /^(\d)\1+$/.test(digits)) return false;

  let sum = 0;
  let doubleDigit = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleDigit = !doubleDigit;
  }
  return sum % 10 === 0;
}

function redactString(
  value: string,
  path: string,
  findings: Finding[],
): string {
  let redacted = value;

  for (const pattern of PATTERNS) {
    pattern.expression.lastIndex = 0;
    if (!pattern.expression.test(redacted)) continue;
    pattern.expression.lastIndex = 0;
    redacted = redacted.replace(pattern.expression, pattern.replacement);
    findings.push({
      path,
      type: pattern.type,
      reason: pattern.reason,
      source: "value-pattern",
    });
  }

  redacted = redacted.replace(/\b(?:\d[ -]*?){13,19}\b/g, (candidate) => {
    if (!passesLuhn(candidate)) return candidate;
    findings.push({
      path,
      type: "payment-card",
      reason: "Matches a card-number shape with a valid Luhn checksum.",
      source: "value-pattern",
    });
    return "[REDACTED_CARD]";
  });

  return redacted;
}

export function analyzePayload(
  rawPayload: string,
  provider: Provider,
  customKeys: string[],
): AnalysisResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawPayload) as unknown;
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Unknown parser error";
    throw new Error(`JSON could not be parsed. ${detail}`);
  }

  if (parsed === null || typeof parsed !== "object") {
    throw new Error(
      "JSON root must be an object or array. Wrap scalar values before scanning.",
    );
  }

  const presetKeys = new Set(
    [...COMMON_KEYS, ...PROVIDER_KEYS[provider]].map(normalizeKey),
  );
  const normalizedCustomKeys = new Set(
    customKeys.map(normalizeKey).filter(Boolean),
  );
  const findings: Finding[] = [];

  const walk = (value: unknown, path: string, depth: number): unknown => {
    if (depth > 80) {
      throw new Error(
        "Payload nesting exceeds 80 levels. Flatten it before scanning.",
      );
    }

    if (typeof value === "string") return redactString(value, path, findings);
    if (Array.isArray(value)) {
      return value.map((entry, index) =>
        walk(entry, appendPath(path, index), depth + 1),
      );
    }
    if (value === null || typeof value !== "object") return value;

    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => {
        const entryPath = appendPath(path, key);
        const normalized = normalizeKey(key);
        const customMatch = normalizedCustomKeys.has(normalized);
        const presetMatch = presetKeys.has(normalized);

        if (customMatch || presetMatch) {
          findings.push({
            path: entryPath,
            type: "sensitive-key",
            reason: customMatch
              ? `Key matches the custom policy entry “${key}”.`
              : `Key matches the ${provider} safety preset.`,
            source: customMatch ? "custom" : "preset",
          });
          return [key, "[REDACTED_KEY]"];
        }

        return [key, walk(entry, entryPath, depth + 1)];
      }),
    );
  };

  const sanitized = walk(parsed, "$", 0);
  findings.sort((left, right) =>
    `${left.path}:${left.type}`.localeCompare(`${right.path}:${right.type}`),
  );

  return {
    sanitized,
    findings,
    bytes: new TextEncoder().encode(rawPayload).byteLength,
  };
}

export function countFindings(findings: Finding[]): Record<string, number> {
  return findings.reduce<Record<string, number>>((counts, finding) => {
    counts[finding.type] = (counts[finding.type] ?? 0) + 1;
    return counts;
  }, {});
}
