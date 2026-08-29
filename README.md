# FixtureSafe

FixtureSafe turns a captured webhook into a sanitized test fixture without sending the payload to a server. It scans JSON for likely secrets and personal data, shows every changed path, verifies GitHub, Stripe, or generic HMAC-SHA256 signatures against the untouched raw text, and exports a redacted fixture with an evidence manifest.

The product is for integration engineers and agencies that need to move production-shaped events into bug reports, repositories, or AI-assisted debugging. The free workbench handles one payload at a time. No customer or revenue has been verified.

![FixtureSafe on load: the workbench that redacts a webhook payload and verifies its signature in the browser](docs/screenshot.png)

## Local setup

Requirements: Node.js 20.9 or later and pnpm 11.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The core workflow needs no environment variables. Set `NEXT_PUBLIC_CHECKOUT_URL` only when a real checkout exists. Set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` to send allowlisted event names to Plausible; payload contents are never included.

## Verification

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
bash ./scripts/verify-signature.sh
```

`pnpm verify` runs the same release gate in sequence. The test suite includes GitHub's published HMAC-SHA256 vector, Stripe timestamp tolerance, deterministic redaction, custom keys, and export privacy checks.

## Monetization

The Team CTA reads `NEXT_PUBLIC_CHECKOUT_URL`. When unset, it opens a pilot request email instead of pretending checkout is available. The paid hypothesis is recorded in [docs/OPPORTUNITY.md](docs/OPPORTUNITY.md); completed payments, customers, and revenue remain unverified until trusted payment records exist.

## Privacy and limitations

- Raw payloads and secrets stay in browser memory. The app has no payload ingestion route, account, or database.
- Detection is heuristic. Review every finding and the redacted output before sharing it.
- Signature checks help reproduce integration failures. Production endpoints still need provider SDKs, protected secrets, replay controls, and operational monitoring.
- Version 0.1 accepts JSON objects and arrays up to 256 KiB. It does not accept form-encoded or multipart bodies.
- The `X-Built-By` header percent-encodes the canonical em dash because Node HTTP headers cannot carry U+2014 directly.
- No live deployment has been verified from this repository yet.

Research evidence and assumptions are in [docs/OPPORTUNITY.md](docs/OPPORTUNITY.md). Observable requirements and threats are in [docs/SPEC.md](docs/SPEC.md).

---

Built by Uvin Vindula — [iamuvin.com](https://iamuvin.com)
