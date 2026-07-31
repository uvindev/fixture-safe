"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <p className="eyebrow">Workbench interrupted</p>
      <h1>The page could not finish rendering.</h1>
      <p>
        Your pasted payload was not saved or sent. Reload the workbench and
        paste it again.
      </p>
      <button className="button button-primary" type="button" onClick={reset}>
        Reload the workbench
      </button>
    </main>
  );
}
