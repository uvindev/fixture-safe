# FixtureSafe 0.1 specification

## User journey

1. An integration engineer opens the workbench and sees an explicit local-processing notice.
2. They paste the exact raw JSON received from a provider or load the safe sample.
3. They choose GitHub, Stripe, or Generic. The preset supplies sensitive key names and signature format.
4. They add optional custom sensitive keys and run the scan.
5. The product shows parse status, findings with JSON paths and reasons, and a separate redacted preview.
6. They can copy or download the sanitized fixture and download a manifest containing the original SHA-256 fingerprint and finding summary.
7. They may enter a secret and received signature to verify the original raw text. Secrets are never persisted or included in exports.

## Functional requirements

| Requirement              | Observable behavior                                                                                                                                                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Preserve signed bytes    | Signature functions receive the textarea string without formatting or parsing it first. Tests use GitHub's published HMAC vector.                                                                                                         |
| Validate input           | Zod rejects empty input, payloads over 256 KiB, malformed JSON, non-object roots, overlong secrets, and invalid custom key syntax. Errors name a recovery action.                                                                         |
| Find sensitive content   | The scan detects configured key names and value patterns for email, IPv4, JWT, bearer credentials, Stripe secret keys, GitHub tokens, and common card-number shapes. Each finding includes a JSON path, type, and reason.                 |
| Redact deterministically | Re-running the same payload and policy produces the same structure and placeholders. Source state is not mutated.                                                                                                                         |
| Verify signatures        | GitHub and Generic use HMAC-SHA256 over raw UTF-8 text. Stripe parses `t` and `v1`, signs `timestamp.rawBody`, and rejects timestamps outside five minutes.                                                                               |
| Export evidence          | JSON download contains only the sanitized fixture. Manifest download contains tool version, provider, creation time, original hash, finding counts, and custom key names. It excludes raw payload values, secret, and received signature. |
| Protect privacy          | No payload API exists. Payload and secret state remain in the client component. Analytics emits only allowlisted event names.                                                                                                             |
| Support monetization     | The Team CTA uses `NEXT_PUBLIC_CHECKOUT_URL` when configured; otherwise it opens a pre-addressed pilot email. `pricing_intent` fires before navigation.                                                                                   |
| Collect feedback         | A visible mail link fires `feedback_intent` and opens a pre-addressed message.                                                                                                                                                            |
| Fail explicitly          | Empty, oversized, malformed, stale Stripe, missing signature, clipboard, and download failures render a reason and next action.                                                                                                           |

## Non-functional constraints

- Next.js 15 App Router, strict TypeScript, Tailwind CSS v4, and Zod.
- No database, authentication, cookies, payload persistence, or server-side payload processing in 0.1.
- Minimum 44 px targets, visible focus states, labeled controls, keyboard access, semantic headings, and AA color contrast.
- Response headers disable framing, MIME sniffing, camera, microphone, and geolocation.
- The workbench must remain usable at 320 px width.
- The built-in sample uses synthetic values and labels them as a sample.

## Analytics contract

| Funnel stage           | Event              | Trigger                                        |
| ---------------------- | ------------------ | ---------------------------------------------- |
| Acquisition            | `workbench_viewed` | Workbench mounts.                              |
| Activation             | `payload_analyzed` | A valid payload scan completes.                |
| Retention proxy        | `fixture_exported` | A sanitized fixture or manifest is downloaded. |
| Paid conversion intent | `pricing_intent`   | Team checkout or pilot link is opened.         |
| Feedback               | `feedback_intent`  | Feedback link is opened.                       |

Events contain an event name and provider only. They never include payload text, findings, custom keys, signatures, or secrets. When Plausible is not configured, events remain observable as browser `fixturesafe:analytics` custom events and are not transmitted.

## Threat considerations

- Treat pasted JSON as untrusted text. Render it only inside textareas or text nodes; never inject HTML.
- Cap raw input at 256 KiB before parsing to limit browser stalls.
- Never save secrets to local storage, query strings, logs, analytics, downloads, or React error messages.
- Use Web Crypto HMAC and a constant-work byte comparison for equal-length digests. Document that production services should use provider SDKs.
- Formula injection is outside the first release because exports are JSON, not CSV.
- The scan is heuristic and cannot establish compliance or prove that a fixture is safe.

## Acceptance checks

- The GitHub official test secret and payload produce `sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17`.
- A payload with `customer.email`, `authorization`, and a nested token yields path-specific findings and leaves the input unchanged.
- A custom key is matched case-insensitively across nested objects and arrays.
- A Stripe signature inside the tolerance verifies; a stale timestamp fails with a specific reason.
- The manifest never contains raw sample email, secret, or signature.
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `bash ./scripts/verify-signature.sh` exit 0.
- A production server returns `X-Built-By: Uvin Vindula — iamuvin.com`, author metadata, and `/humans.txt`.

## Non-goals

- Receiving, forwarding, replaying, or storing live webhooks.
- Sending test requests to third-party URLs.
- Compliance certification or exhaustive secret detection.
- Organization accounts, shared policies, billing enforcement, or CI integration in 0.1.
- Real customer, demand, retention, or revenue claims without external records.
