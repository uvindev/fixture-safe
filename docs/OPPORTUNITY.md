# Opportunity decision

Research date: 2026-07-31

## Candidate comparison

| Candidate               | Named user and recurring job                                                                                                                                                                                     | Existing workaround and paid evidence                                                                                                                                                                                                                                                            | Narrow release                                                                                                           | Distribution and risk                                                                                                                                                                   | Decision                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| FixtureSafe             | Integration engineers and agencies sanitize captured webhook payloads before sharing them, committing fixtures, or putting them into support and AI tools. They also check signatures when debugging deliveries. | Webhook.site sells request protection, history, CSV export, and workflow features from $9/month. Its free URLs are accessible to anyone who knows the URL ID. GitHub and Stripe both require verification against the received payload; Stripe warns that body manipulation breaks verification. | Browser-local JSON scan, deterministic redaction, GitHub/generic/Stripe HMAC verification, and sanitized fixture export. | Developer search, GitHub, integration agencies. False positives and overconfidence are controlled by showing every finding and stating that the scan is not a compliance certification. | Selected. The workflow is bounded, recurring, and can provide value without hosting customer payloads. |
| OpenAPI change reviewer | Backend teams compare an API contract before release and identify breaking changes.                                                                                                                              | Redocly sells API collaboration and governance plans; its current Pro plan starts at $10 per seat/month. Redocly CLI already provides open-source linting and transforms.                                                                                                                        | Compare two JSON OpenAPI documents and list removed paths, required fields, and response changes.                        | GitHub and CI distribution. Full OpenAPI compatibility rules are broad; a narrow checker risks false assurance against mature open-source tools.                                        | Rejected for this iteration. Validation breadth exceeds the release budget.                            |
| CSP deployment checker  | Web engineers test a Content Security Policy before enforcing it.                                                                                                                                                | MDN recommends report-only deployment first and documents non-obvious constraints: report-only cannot be delivered in a meta element, and `report-to` requires a `Reporting-Endpoints` header. Browser tooling and Mozilla Observatory are established free alternatives.                        | Parse a policy and generate report-only headers for Next.js or Cloudflare.                                               | Search and security audits. The paid boundary is weak because authoritative documentation and free scanners cover much of the job.                                                      | Rejected. Useful, but less credible as a paid standalone product.                                      |

## Selected opportunity

FixtureSafe handles the gap between receiving a real webhook and sharing a safe, reproducible fixture. The original raw text stays unchanged for signature checks. A separate copy is parsed, scanned, redacted, and exported. Processing runs in the browser; version 0.1 has no account, database, or payload ingestion endpoint.

### Evidence

- [Stripe webhook documentation](https://docs.stripe.com/webhooks?lang=node): Stripe requires the raw request body for signature verification and warns that manipulation causes failure.
- [GitHub webhook validation](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries): GitHub recommends HMAC-SHA256 validation and supplies a public test vector.
- [Webhook.site plans](https://webhook.site/register): paid plans sell protected storage, retained history, export, custom actions, and multi-user controls. Prices cited above were observed on 2026-07-31.
- [Webhook.site FAQ](https://docs.webhook.site/): free request URLs can be accessed by anyone who knows the URL ID; paid features include protected data and CSV export.
- [Redocly pricing](https://redocly.com/pricing): current paid API tooling demonstrates budget for team workflow and governance, but not demand for this specific product.
- [MDN CSP implementation guide](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/CSP): report-only rollout is recommended before enforcement.

Competitor pricing proves that teams pay for adjacent webhook and API workflows. It does not prove demand for FixtureSafe. Demand, customer count, and revenue remain unverified.

### Commercial model

The free workbench processes one payload at a time and exports sanitized JSON. A Team tier would add shared redaction policies, reviewed provider presets, batch fixture packs, and a headless CI check. The working price hypothesis is `[TARGET]` $12 per team/month. The first release records checkout or pilot intent; it does not claim a completed transaction.

### Assumptions and risks

- `[UNVERIFIED]` Integration agencies regularly copy production-shaped webhook payloads into tickets, repositories, and AI tools.
- `[UNVERIFIED]` Local processing and an auditable finding list are a meaningful advantage over a generic JSON formatter or text PII scrubber.
- Detection is heuristic. It can miss secrets or mark safe values. The UI must never describe output as certified, compliant, or guaranteed safe.
- Signature verification is a debugging aid. Production endpoints still need provider libraries, secret storage, replay protection, and constant-time comparison.
- A static local-first tool has low infrastructure cost, but provider preset maintenance and support can become material.
