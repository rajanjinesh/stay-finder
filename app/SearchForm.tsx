"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

const MAX_CHILDREN = 10;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Local date as YYYY-MM-DD.
function toIsoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// "2026-11-20" -> "20 Nov 2026"
function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = Date.parse(`${checkIn}T00:00:00Z`);
  const b = Date.parse(`${checkOut}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

function toCount(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  return Number(value);
}

type Errors = {
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  adults?: string;
  childAges: (string | undefined)[];
};

function CalendarIcon() {
  return (
    <svg className={styles.icon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg className={styles.icon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function Stepper({ label, onStep }: { label: string; onStep: (delta: number) => void }) {
  return (
    <div className={styles.stepper}>
      <svg width="16" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m7 15 5 5 5-5" />
        <path d="m7 9 5-5 5 5" />
      </svg>
      <button type="button" className={`${styles.stepperButton} ${styles.stepperUp}`} aria-label={`Increase ${label}`} onClick={() => onStep(1)} />
      <button type="button" className={`${styles.stepperButton} ${styles.stepperDown}`} aria-label={`Decrease ${label}`} onClick={() => onStep(-1)} />
    </div>
  );
}

function DateField({ id, label, value, min, error, onChange }: {
  id: string;
  label: string;
  value: string;
  min: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <div className={styles.input}>
        <span className={styles.dateText}>{formatDate(value)}</span>
        <CalendarIcon />
        <input
          id={id}
          type="date"
          className={styles.dateNative}
          value={value}
          min={min}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => {
            try {
              e.currentTarget.showPicker();
            } catch {
              // Browser doesn't support showPicker; native behaviour still works.
            }
          }}
        />
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}

export default function SearchForm() {
  const router = useRouter();
  const [today, setToday] = useState("");
  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState("1");
  const [children, setChildren] = useState("0");
  const [childAges, setChildAges] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  // Dates are filled in the browser on load (not during prerender).
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(toIsoDate(now));
    setCheckIn(toIsoDate(now));
    setCheckOut(toIsoDate(tomorrow));
  }, []);

  function changeChildren(value: string) {
    if (value !== "" && !/^\d+$/.test(value)) return;
    const count = value === "" ? 0 : Math.min(Number(value), MAX_CHILDREN);
    setChildren(value === "" ? "" : String(count));
    setChildAges((ages) => Array.from({ length: count }, (_, i) => ages[i] ?? ""));
  }

  function changeAdults(value: string) {
    if (value !== "" && !/^\d+$/.test(value)) return;
    setAdults(value);
  }

  const nights = nightsBetween(checkIn, checkOut);
  const adultCount = toCount(adults);

  const errors: Errors = { childAges: childAges.map((age) => (age === "" ? "Please select an age" : undefined)) };
  if (destination.trim() === "") errors.destination = "Please enter a destination";
  if (!checkIn) errors.checkIn = "Please choose a check-in date";
  else if (today && checkIn < today) errors.checkIn = "Check-in can't be in the past";
  if (!checkOut) errors.checkOut = "Please choose a check-out date";
  else if (checkIn && nights < 1) errors.checkOut = "Check-out must be after check-in";
  if (adultCount === null || adultCount < 1) errors.adults = "Add at least 1 adult";

  const hasErrors =
    !!(errors.destination || errors.checkIn || errors.checkOut || errors.adults) ||
    errors.childAges.some(Boolean);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (hasErrors) return;
    const params = new URLSearchParams({
      destination: destination.trim(),
      checkIn,
      checkOut,
      adults: String(adultCount),
      children: String(childAges.length),
    });
    if (childAges.length > 0) params.set("childAges", childAges.join(","));
    router.push(`/results?${params.toString()}`);
  }

  const show = (msg?: string) => (submitted ? msg : undefined);

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.intro}>
        <h1 className={styles.title}>Stay Finder</h1>
        <p className={styles.subtitle}>Compare stays across booking sites, cheapest first</p>
      </div>

      <div className={styles.fields}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="destination">Destination</label>
          <div className={styles.input}>
            <input
              id="destination"
              className={styles.control}
              type="text"
              placeholder="e.g. Goa"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>
          {show(errors.destination) && <p className={styles.error}>{errors.destination}</p>}
        </div>

        <div className={styles.group}>
          <div className={styles.row}>
            <DateField id="checkIn" label="Check-in" value={checkIn} min={today} error={show(errors.checkIn)} onChange={setCheckIn} />
            <DateField id="checkOut" label="Check-out" value={checkOut} min={checkIn || today} error={show(errors.checkOut)} onChange={setCheckOut} />
          </div>
          {nights >= 1 && <p className={styles.helper}>{nights} {nights === 1 ? "night" : "nights"}</p>}
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="adults">Adults</label>
            <div className={styles.input}>
              <input
                id="adults"
                className={styles.control}
                type="number"
                inputMode="numeric"
                min={0}
                value={adults}
                onChange={(e) => changeAdults(e.target.value)}
              />
              <Stepper label="adults" onStep={(d) => setAdults(String(Math.max(0, (toCount(adults) ?? 0) + d)))} />
            </div>
            {show(errors.adults) && <p className={styles.error}>{errors.adults}</p>}
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="children">Children</label>
            <div className={styles.input}>
              <input
                id="children"
                className={styles.control}
                type="number"
                inputMode="numeric"
                min={0}
                max={MAX_CHILDREN}
                value={children}
                onChange={(e) => changeChildren(e.target.value)}
              />
              <Stepper label="children" onStep={(d) => changeChildren(String(Math.max(0, (toCount(children) ?? 0) + d)))} />
            </div>
          </div>
        </div>

        {childAges.map((age, i) => (
          <div className={styles.field} key={i}>
            <label className={styles.label} htmlFor={`childAge${i}`}>Child {i + 1} age</label>
            <div className={styles.input}>
              <select
                id={`childAge${i}`}
                className={`${styles.control} ${age === "" ? styles.placeholder : ""}`}
                value={age}
                onChange={(e) => setChildAges((ages) => ages.map((a, j) => (j === i ? e.target.value : a)))}
              >
                <option value="" disabled>Select age (0–17)</option>
                {Array.from({ length: 18 }, (_, n) => (
                  <option key={n} value={String(n)}>{n}</option>
                ))}
              </select>
              <ChevronDownIcon />
            </div>
            {show(errors.childAges[i]) && <p className={styles.error}>{errors.childAges[i]}</p>}
            {i === childAges.length - 1 && <p className={styles.helper}>One age field appears for each child</p>}
          </div>
        ))}
      </div>

      <button type="submit" className={styles.button}>Search</button>
    </form>
  );
}
