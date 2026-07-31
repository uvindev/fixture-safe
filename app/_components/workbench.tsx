"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { buildManifest } from "@/lib/payload/export";
import { analyzePayload, type AnalysisResult } from "@/lib/payload/redact";
import {
  sha256Hex,
  verifySignature,
  type SignatureResult,
} from "@/lib/payload/signatures";
import {
  analysisInputSchema,
  parseCustomKeys,
  providerSchema,
  signatureInputSchema,
  type Provider,
} from "@/lib/schemas/payload";

const SAMPLE_PAYLOAD = `{
  "id": "evt_fixture_safe_sample",
  "type": "invoice.payment_failed",
  "customer": {
    "email": "dev@example.com",
    "ip_address": "203.0.113.42",
    "card_number": "4242 4242 4242 4242"
  },
  "authorization": "Bearer sample_token_for_docs_only",
  "metadata": {
    "support_note": "Contact dev@example.com about retry",
    "workspace": "demo"
  }
}`;

const PROVIDERS: Array<{ value: Provider; label: string; hint: string }> = [
  { value: "github", label: "GitHub", hint: "sha256= header" },
  { value: "stripe", label: "Stripe", hint: "t=,v1= header" },
  { value: "generic", label: "Generic", hint: "raw HMAC hex" },
];

function firstIssue(error: { issues: Array<{ message: string }> }): string {
  return error.issues[0]?.message ?? "Review the input and try again.";
}

function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function Workbench() {
  const [rawPayload, setRawPayload] = useState("");
  const [provider, setProvider] = useState<Provider>("github");
  const [customKeys, setCustomKeys] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [originalHash, setOriginalHash] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const [secret, setSecret] = useState("");
  const [receivedSignature, setReceivedSignature] = useState("");
  const [signatureResult, setSignatureResult] =
    useState<SignatureResult | null>(null);
  const [signatureError, setSignatureError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    trackEvent("workbench_viewed");
  }, []);

  const resetDerivedState = () => {
    setAnalysis(null);
    setOriginalHash("");
    setAnalysisError("");
    setSignatureResult(null);
    setSignatureError("");
    setCopyStatus("");
  };

  const selectProvider = (value: string) => {
    const parsed = providerSchema.safeParse(value);
    if (!parsed.success) return;
    setProvider(parsed.data);
    setAnalysis(null);
    setSignatureResult(null);
    setAnalysisError("");
    setSignatureError("");
  };

  const runAnalysis = async () => {
    setAnalysisError("");
    setCopyStatus("");
    const input = analysisInputSchema.safeParse({
      rawPayload,
      provider,
      customKeys,
    });
    if (!input.success) {
      setAnalysis(null);
      setAnalysisError(firstIssue(input.error));
      return;
    }

    try {
      const parsedCustomKeys = parseCustomKeys(input.data.customKeys);
      const result = analyzePayload(
        input.data.rawPayload,
        input.data.provider,
        parsedCustomKeys,
      );
      const hash = await sha256Hex(input.data.rawPayload);
      setAnalysis(result);
      setOriginalHash(hash);
      trackEvent("payload_analyzed", provider);
    } catch (error) {
      setAnalysis(null);
      setOriginalHash("");
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "The payload could not be scanned.",
      );
    }
  };

  const runSignatureCheck = async () => {
    setSignatureError("");
    setSignatureResult(null);
    const input = signatureInputSchema.safeParse({
      rawPayload,
      provider,
      secret,
      receivedSignature,
    });
    if (!input.success) {
      setSignatureError(firstIssue(input.error));
      return;
    }

    try {
      setSignatureResult(await verifySignature(input.data));
    } catch {
      setSignatureError(
        "Web Crypto could not complete the HMAC check in this browser. Try a current browser.",
      );
    }
  };

  const sanitizedJson = analysis
    ? JSON.stringify(analysis.sanitized, null, 2)
    : "";

  const copyFixture = async () => {
    if (!sanitizedJson) return;
    try {
      await navigator.clipboard.writeText(sanitizedJson);
      setCopyStatus("Sanitized JSON copied.");
    } catch {
      setCopyStatus(
        "Clipboard access was blocked. Select the preview text and copy it.",
      );
    }
  };

  const exportFixture = () => {
    if (!analysis) return;
    try {
      downloadJson("fixturesafe-sanitized.json", analysis.sanitized);
      trackEvent("fixture_exported", provider);
      setCopyStatus("Sanitized fixture downloaded.");
    } catch {
      setCopyStatus(
        "The browser blocked the download. Copy the preview instead.",
      );
    }
  };

  const exportManifest = () => {
    if (!analysis || !originalHash) return;
    try {
      const manifest = buildManifest({
        analysis,
        provider,
        customKeys: parseCustomKeys(customKeys),
        originalSha256: originalHash,
      });
      downloadJson("fixturesafe-manifest.json", manifest);
      trackEvent("fixture_exported", provider);
      setCopyStatus("Evidence manifest downloaded.");
    } catch {
      setCopyStatus("The browser blocked the manifest download.");
    }
  };

  return (
    <section
      id="workbench"
      className="workbench shell"
      aria-labelledby="workbench-title"
    >
      <div className="workbench-heading">
        <div>
          <p className="eyebrow">Workbench / runs in this tab</p>
          <h2 id="workbench-title">Build a fixture you can inspect.</h2>
        </div>
        <p className="privacy-note">
          Payloads and secrets remain in browser memory. Analytics never
          receives either.
        </p>
      </div>

      <div
        className="provider-row"
        role="radiogroup"
        aria-label="Webhook provider"
      >
        {PROVIDERS.map((option) => (
          <label
            key={option.value}
            className={provider === option.value ? "selected" : ""}
          >
            <input
              type="radio"
              name="provider"
              value={option.value}
              checked={provider === option.value}
              onChange={(event) => selectProvider(event.target.value)}
            />
            <span>{option.label}</span>
            <small>{option.hint}</small>
          </label>
        ))}
      </div>

      <div className="workbench-grid">
        <div className="input-pane">
          <div className="pane-title">
            <span>01 / RAW INPUT</span>
            <button
              className="text-button"
              type="button"
              onClick={() => {
                setRawPayload(SAMPLE_PAYLOAD);
                resetDerivedState();
              }}
            >
              Load synthetic sample
            </button>
          </div>
          <label htmlFor="raw-payload">Exact JSON request body</label>
          <textarea
            id="raw-payload"
            className="payload-editor"
            value={rawPayload}
            onChange={(event) => {
              setRawPayload(event.target.value);
              resetDerivedState();
            }}
            placeholder={'{\n  "event": "paste the unformatted body here"\n}'}
            spellCheck={false}
          />
          <div className="editor-meta">
            <span>
              {new TextEncoder().encode(rawPayload).byteLength.toLocaleString()}{" "}
              bytes
            </span>
            <span>256 KiB limit</span>
          </div>

          <label htmlFor="custom-keys">Extra sensitive keys</label>
          <input
            id="custom-keys"
            type="text"
            value={customKeys}
            onChange={(event) => {
              setCustomKeys(event.target.value);
              setAnalysis(null);
              setAnalysisError("");
            }}
            placeholder="tenant_id, internal_note"
          />
          <p className="field-hint">
            Comma or line separated. Matching ignores case.
          </p>

          <button
            className="button button-primary scan-button"
            type="button"
            onClick={runAnalysis}
          >
            Scan and redact a copy
          </button>
          {analysisError ? (
            <p className="status status-error" role="alert">
              {analysisError}
            </p>
          ) : null}
        </div>

        <div className="output-pane">
          <div className="pane-title">
            <span>02 / SANITIZED OUTPUT</span>
            <span>
              {analysis
                ? `${analysis.findings.length} findings`
                : "Waiting for input"}
            </span>
          </div>

          {analysis ? (
            <>
              <label htmlFor="sanitized-payload">Redacted JSON preview</label>
              <textarea
                id="sanitized-payload"
                className="payload-editor output-editor"
                readOnly
                value={sanitizedJson}
                spellCheck={false}
              />
              <div className="output-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={copyFixture}
                >
                  Copy JSON
                </button>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={exportFixture}
                >
                  Download fixture
                </button>
                <button
                  className="text-button"
                  type="button"
                  onClick={exportManifest}
                >
                  Download manifest
                </button>
              </div>
              <p className="hash-line">
                Original SHA-256 <code>{originalHash}</code>
              </p>
              <p className="status status-neutral" aria-live="polite">
                {copyStatus}
              </p>
            </>
          ) : (
            <div className="empty-output">
              <span aria-hidden="true">{`{ }`}</span>
              <h3>No fixture built yet</h3>
              <p>
                Paste valid JSON, choose a provider preset, then scan a separate
                copy.
              </p>
            </div>
          )}
        </div>
      </div>

      {analysis ? (
        <section className="findings" aria-labelledby="findings-title">
          <div className="findings-heading">
            <h3 id="findings-title">Changed paths</h3>
            <p>
              Review this list against the preview. Zero findings does not prove
              safety.
            </p>
          </div>
          {analysis.findings.length ? (
            <div
              className="finding-table"
              role="table"
              aria-label="Sensitive data findings"
            >
              <div className="finding-row finding-head" role="row">
                <span role="columnheader">JSON path</span>
                <span role="columnheader">Rule</span>
                <span role="columnheader">Reason</span>
              </div>
              {analysis.findings.map((finding, index) => (
                <div
                  className="finding-row"
                  role="row"
                  key={`${finding.path}-${finding.type}-${index}`}
                >
                  <code role="cell">{finding.path}</code>
                  <span role="cell" className="rule-pill">
                    {finding.type}
                  </span>
                  <span role="cell">{finding.reason}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-findings">
              No configured pattern matched. Add known business-specific keys
              before export.
            </p>
          )}
        </section>
      ) : null}

      <section className="signature-panel" aria-labelledby="signature-title">
        <div className="signature-copy">
          <p className="eyebrow">03 / SIGNATURE CHECK</p>
          <h3 id="signature-title">Test the untouched payload.</h3>
          <p>
            The secret stays in this component and is cleared on reload.
            Formatting the input after capture will change the expected HMAC.
          </p>
        </div>
        <div className="signature-fields">
          <label htmlFor="webhook-secret">Webhook secret</label>
          <input
            id="webhook-secret"
            type="password"
            autoComplete="off"
            value={secret}
            onChange={(event) => {
              setSecret(event.target.value);
              setSignatureResult(null);
              setSignatureError("");
            }}
            placeholder={
              provider === "stripe" ? "whsec_…" : "Secret is never persisted"
            }
          />

          <label htmlFor="received-signature">
            {provider === "stripe"
              ? "Stripe-Signature header"
              : "Received signature"}
          </label>
          <input
            id="received-signature"
            type="text"
            autoComplete="off"
            value={receivedSignature}
            onChange={(event) => {
              setReceivedSignature(event.target.value);
              setSignatureResult(null);
              setSignatureError("");
            }}
            placeholder={
              provider === "stripe"
                ? "t=1700000000,v1=…"
                : provider === "github"
                  ? "sha256=…"
                  : "64-character hexadecimal digest"
            }
          />
          <div className="signature-actions">
            <button
              className="button button-secondary"
              type="button"
              onClick={runSignatureCheck}
            >
              Check signature
            </button>
            <button
              className="text-button"
              type="button"
              onClick={() => {
                setSecret("");
                setReceivedSignature("");
                setSignatureResult(null);
                setSignatureError("");
              }}
            >
              Clear secret and header
            </button>
          </div>
          {signatureError ? (
            <p className="status status-error" role="alert">
              {signatureError}
            </p>
          ) : null}
          {signatureResult ? (
            <div
              className={`signature-result ${signatureResult.valid ? "valid" : "invalid"}`}
              role="status"
            >
              <strong>{signatureResult.valid ? "MATCH" : "NO MATCH"}</strong>
              <span>{signatureResult.reason}</span>
              {signatureResult.expectedSignature ? (
                <code>Expected: {signatureResult.expectedSignature}</code>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </section>
  );
}
