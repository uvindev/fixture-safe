import { IntentLink } from "@/components/intent-link";
import { Workbench } from "@/app/_components/workbench";

const checkoutUrl = process.env.NEXT_PUBLIC_CHECKOUT_URL;
const feedbackEmail =
  process.env.NEXT_PUBLIC_FEEDBACK_EMAIL || "hello@iamuvin.com";
const teamUrl =
  checkoutUrl ||
  `mailto:${feedbackEmail}?subject=${encodeURIComponent("FixtureSafe Team pilot")}`;

export default function HomePage() {
  return (
    <main>
      <header className="site-header shell">
        <a className="wordmark" href="#top" aria-label="FixtureSafe home">
          <span aria-hidden="true">FS/</span> FixtureSafe
        </a>
        <nav aria-label="Primary navigation">
          <a href="#workbench">Workbench</a>
          <a href="#pricing">Team pilot</a>
          <a href="#limits">Limits</a>
        </nav>
      </header>

      <section id="top" className="hero shell" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">Local webhook fixture workbench</p>
          <h1 id="hero-title">Real payload shape. None of the live data.</h1>
          <p className="hero-lede">
            Paste the exact webhook body, find risky fields, redact a separate
            copy, and verify the original signature. FixtureSafe does the work
            in this tab.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#workbench">
              Open the workbench
            </a>
            <a className="text-link" href="#limits">
              Read the limits
            </a>
          </div>
        </div>
        <aside className="proof-strip" aria-label="Privacy boundary">
          <span>INPUT</span>
          <strong>Your browser memory</strong>
          <i aria-hidden="true" />
          <span>NETWORK</span>
          <strong>No payload endpoint</strong>
          <i aria-hidden="true" />
          <span>OUTPUT</span>
          <strong>JSON fixture + manifest</strong>
        </aside>
      </section>

      <Workbench />

      <section className="method shell" aria-labelledby="method-title">
        <div>
          <p className="eyebrow">The signed-byte rule</p>
          <h2 id="method-title">Scan a copy. Verify the original.</h2>
        </div>
        <p>
          Reformatting JSON changes its bytes and can break signature checks.
          FixtureSafe keeps the textarea string untouched for HMAC verification,
          then parses a separate copy for redaction and export.
        </p>
      </section>

      <section
        id="pricing"
        className="pricing shell"
        aria-labelledby="pricing-title"
      >
        <div className="pricing-note">
          <p className="eyebrow">Commercial path</p>
          <h2 id="pricing-title">The workbench stays useful for free.</h2>
          <p>
            The Team pilot is for agencies and integration teams that need
            reviewed policy presets, batch fixture packs, and a CI check. The
            working launch target is $12 per team each month. No payment or
            customer is claimed yet.
          </p>
        </div>
        <div className="price-ticket">
          <span>TEAM PILOT / 01</span>
          <strong>$12</strong>
          <small>target per team / month</small>
          <IntentLink
            className="button button-primary"
            event="pricing_intent"
            href={teamUrl}
          >
            {checkoutUrl ? "Open Team checkout" : "Request the Team pilot"}
          </IntentLink>
        </div>
      </section>

      <section
        id="limits"
        className="limits shell"
        aria-labelledby="limits-title"
      >
        <p className="eyebrow">Before you share the export</p>
        <h2 id="limits-title">Treat the scan as a review aid.</h2>
        <div className="limit-list">
          <p>
            <strong>Detection is heuristic.</strong> It can miss sensitive data
            and flag safe values. Review every changed path and the final JSON.
          </p>
          <p>
            <strong>Production verification belongs on the server.</strong> Use
            provider SDKs, protected secrets, replay controls, and constant-time
            comparison in live endpoints.
          </p>
          <p>
            <strong>Version 0.1 accepts JSON only.</strong> The browser limit is
            256 KiB. Form, multipart, and binary bodies are out of scope.
          </p>
        </div>
      </section>

      <footer className="site-footer shell">
        <div>
          <span>FixtureSafe 0.1</span>
          <span>Payloads stay in this tab</span>
        </div>
        <IntentLink
          event="feedback_intent"
          href={`mailto:${feedbackEmail}?subject=${encodeURIComponent("FixtureSafe feedback")}`}
        >
          Send product feedback
        </IntentLink>
        <span className="built-by">
          Built by{" "}
          <a
            href="https://iamuvin.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Uvin Vindula
          </a>
        </span>
      </footer>
    </main>
  );
}
