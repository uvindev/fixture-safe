import type { Provider } from "@/lib/schemas/payload";

export type AnalyticsEvent =
  | "workbench_viewed"
  | "payload_analyzed"
  | "fixture_exported"
  | "pricing_intent"
  | "feedback_intent";

declare global {
  interface Window {
    plausible?: {
      (event: string, options?: { props: { provider?: Provider } }): void;
      q?: unknown[][];
    };
  }
}

export function trackEvent(event: AnalyticsEvent, provider?: Provider): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("fixturesafe:analytics", {
      detail: { event, ...(provider ? { provider } : {}) },
    }),
  );

  if (!process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN) return;
  window.plausible ??= (...args: unknown[]) => {
    window.plausible!.q ??= [];
    window.plausible!.q!.push(args);
  };
  window.plausible(event, { props: { ...(provider ? { provider } : {}) } });
}
