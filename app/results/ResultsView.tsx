"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Stay } from "@/lib/stays";
import styles from "./results.module.css";

type SiteStatus = "ok" | "failed";
type SearchResponse = { stays: Stay[]; sites: { booking: SiteStatus; airbnb: SiteStatus } };
type State = { kind: "loading" } | { kind: "error" } | { kind: "done"; data: SearchResponse };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parts(iso: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

// "20–21 Nov 2026", "30 Nov – 2 Dec 2026", "30 Dec 2026 – 2 Jan 2027"
function formatDateRange(checkIn: string, checkOut: string): string {
  const a = parts(checkIn);
  const b = parts(checkOut);
  if (!a || !b) return `${checkIn} – ${checkOut}`;
  if (a[0] !== b[0]) return `${a[2]} ${MONTHS[a[1] - 1]} ${a[0]} – ${b[2]} ${MONTHS[b[1] - 1]} ${b[0]}`;
  if (a[1] !== b[1]) return `${a[2]} ${MONTHS[a[1] - 1]} – ${b[2]} ${MONTHS[b[1] - 1]} ${b[0]}`;
  return `${a[2]}–${b[2]} ${MONTHS[b[1] - 1]} ${b[0]}`;
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`);
  return Number.isNaN(ms) ? 0 : Math.round(ms / 86_400_000);
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const formatInr = (n: number) => `₹${new Intl.NumberFormat("en-IN").format(n)}`;

function StayCard({ stay }: { stay: Stay }) {
  return (
    <div className={styles.card}>
      <div className={styles.details}>
        <p className={styles.name}>{stay.name}</p>
        <div className={styles.meta}>
          <span className={styles.rating}>{stay.rating.toFixed(1)}/10</span>
          <span className={styles.site}>{stay.site}</span>
        </div>
      </div>
      <div className={styles.total}>
        <p className={styles.price}>{formatInr(stay.totalInr)}</p>
        <p className={styles.small}>Total stay price</p>
        {stay.feesMayBeExtra && <p className={styles.small}>Fees may be extra</p>}
      </div>
      <a className={styles.button} href={stay.url} target="_blank" rel="noopener noreferrer">
        View on {stay.site}
      </a>
    </div>
  );
}

export default function ResultsView() {
  const params = useSearchParams();
  const destination = params.get("destination") ?? "";
  const checkIn = params.get("checkIn") ?? "";
  const checkOut = params.get("checkOut") ?? "";
  const adults = Number(params.get("adults") ?? "0");
  const childAgesParam = params.get("childAges") ?? "";
  const childrenAges = childAgesParam === "" ? [] : childAgesParam.split(",").map(Number);
  const test = params.get("test") ?? undefined; // local-only test switch, ignored on the live site

  // "New search" goes back to the Search page with the inputs kept (test switch dropped).
  const back = new URLSearchParams(params.toString());
  back.delete("test");

  const [state, setState] = useState<State>({ kind: "loading" });
  const startedFor = useRef<string | null>(null);
  const queryKey = params.toString();

  useEffect(() => {
    if (startedFor.current === queryKey) return; // don't search twice for the same inputs
    startedFor.current = queryKey;
    setState({ kind: "loading" });
    fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destination, checkIn, checkOut, adults, childrenAges, test }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as SearchResponse;
        if (startedFor.current !== queryKey) return;
        const bothFailed = data.sites.booking === "failed" && data.sites.airbnb === "failed";
        setState(bothFailed ? { kind: "error" } : { kind: "done", data });
      })
      .catch(() => {
        if (startedFor.current === queryKey) setState({ kind: "error" });
      });
    // The inputs are all derived from queryKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  const nights = nightsBetween(checkIn, checkOut);
  const guests = plural(adults, "adult", "adults") + (childrenAges.length ? `, ${plural(childrenAges.length, "child", "children")}` : "");
  const summary = [destination, formatDateRange(checkIn, checkOut), plural(nights, "night", "nights"), guests].join(" · ");

  let body: React.ReactNode;
  if (state.kind === "loading") {
    body = (
      <div className={styles.loading} role="status">
        <span className={styles.spinner} aria-hidden="true" />
        Searching Booking.com and Airbnb…
      </div>
    );
  } else if (state.kind === "error") {
    body = <p className={styles.message}>Something went wrong. Please try again.</p>;
  } else {
    const { stays, sites } = state.data;
    const failedNote =
      sites.airbnb === "failed"
        ? "Couldn't load Airbnb results. Showing Booking.com only."
        : sites.booking === "failed"
          ? "Couldn't load Booking.com results. Showing Airbnb only."
          : null;
    body = (
      <>
        {failedNote && <p className={styles.note}>{failedNote}</p>}
        {stays.length === 0 ? (
          <p className={styles.message}>No stays found. Try different dates or a different destination.</p>
        ) : (
          <>
            <div className={styles.listContext}>
              <span>{plural(stays.length, "stay", "stays")} · Cheapest first</span>
              <span className={styles.listContextMuted}>Up to 6 stays</span>
            </div>
            {stays.map((stay) => (
              <StayCard key={`${stay.site}-${stay.url}`} stay={stay} />
            ))}
          </>
        )}
      </>
    );
  }

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <Link className={styles.back} href={`/?${back.toString()}`}>
          ← New search
        </Link>
        <div className={styles.overview}>
          <h1 className={styles.title}>Cheapest stays for your trip</h1>
          <p className={styles.summary}>{summary}</p>
        </div>
      </div>
      <div className={styles.results}>{body}</div>
    </div>
  );
}
