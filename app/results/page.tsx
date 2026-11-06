import { Suspense } from "react";
import ReceivedInputs from "./ReceivedInputs";

// Placeholder for now: shows the inputs received from the Search page.
export default function ResultsPage() {
  return (
    <main style={{ padding: "72px 16px", maxWidth: 880, margin: "0 auto" }}>
      <h1 style={{ fontSize: 32, fontWeight: 600, marginBottom: 24 }}>Results (placeholder)</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <ReceivedInputs />
      </Suspense>
    </main>
  );
}
