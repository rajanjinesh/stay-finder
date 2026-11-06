import { Suspense } from "react";
import ResultsView from "./ResultsView";
import styles from "./results.module.css";

// The inputs are read from the URL in the browser (inside Suspense), then /api/search is called.
export default function ResultsPage() {
  return (
    <main className={styles.page}>
      <Suspense
        fallback={
          <div className={styles.content}>
            <div className={styles.loading} role="status">
              <span className={styles.spinner} aria-hidden="true" />
              Searching Booking.com and Airbnb…
            </div>
          </div>
        }
      >
        <ResultsView />
      </Suspense>
    </main>
  );
}
