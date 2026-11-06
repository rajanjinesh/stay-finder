// Pure data code: field mapping, price maths, rules and ranking.
// No imports, so the tests can run it directly with Node.

export type SiteName = "Booking.com" | "Airbnb";

export type Stay = {
  name: string;
  site: SiteName;
  totalInr: number; // total for the whole stay, in INR (rounded to whole rupees)
  rating: number; // out of 10
  url: string;
  feesMayBeExtra: boolean; // true for Airbnb
};

// A stay as mapped from the raw data, before the rules are applied.
export type Candidate = {
  name: string;
  site: SiteName;
  totalInr: number | null;
  rating: number | null; // out of 10, null when unrated
  url: string | null;
  typeText: string; // text used to spot hostels, dorms and shared rooms
};

export type MapResult = { candidates: Candidate[]; problems: string[] };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v : null);

// "$1,157.70" -> 1157.7
export function parseMoney(text: string): number | null {
  const cleaned = text.replace(/[^0-9.]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = Date.parse(`${checkIn}T00:00:00Z`);
  const b = Date.parse(`${checkOut}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

// Booking.com total = stay price + taxes & fees.
export function bookingTotal(stayPrice: number, taxesAndFees: number): number {
  return Math.round(stayPrice + taxesAndFees);
}

// Airbnb total = nights x nightly price (USD) x USD_TO_INR.
export function airbnbTotal(nights: number, nightlyUsd: number, usdToInr: number): number {
  return Math.round(nights * nightlyUsd * usdToInr);
}

// Airbnb ratings are out of 5.
export function airbnbRatingOutOf10(rating: number): number {
  return Math.round(rating * 2 * 10) / 10;
}

// "3 nights x $18.00" -> 18
export function nightlyFromBreakdown(description: string): number | null {
  const m = description.match(/x\s*\$?\s*([\d,]+(?:\.\d+)?)/i);
  return m ? parseMoney(m[1]) : null;
}

export function mapBooking(raw: unknown): MapResult {
  if (!isObj(raw) || !Array.isArray(raw.results)) throw new Error("Booking.com: results field missing");
  const problems = new Set<string>();
  const candidates = raw.results.filter(isObj).map((r): Candidate => {
    const price = isObj(r.price) ? r.price : {};
    const stayPrice = num(price.pricePerStayParsed);
    let taxes = num(price.taxesAndFeesParsed);
    if (stayPrice === null) problems.add("Booking.com: price field missing");
    if (taxes === null) {
      if (stayPrice !== null) problems.add("Booking.com: taxes & fees field missing (counted as 0)");
      taxes = 0;
    }
    const reviews = isObj(r.reviews) ? r.reviews : {};
    const score = num(reviews.score);
    return {
      name: str(r.title) ?? "Unnamed stay",
      site: "Booking.com",
      totalInr: stayPrice === null ? null : bookingTotal(stayPrice, taxes),
      rating: score !== null && score > 0 ? score : null,
      url: str(r.url),
      typeText: `${str(r.title) ?? ""} ${str(r.room) ?? ""}`,
    };
  });
  return { candidates, problems: [...problems] };
}

export function mapAirbnb(raw: unknown, nights: number, usdToInr: number): MapResult {
  if (!isObj(raw) || !Array.isArray(raw.properties)) throw new Error("Airbnb: properties field missing");
  const problems = new Set<string>();
  const candidates = raw.properties.filter(isObj).map((p): Candidate => {
    const price = isObj(p.price) ? p.price : {};
    const breakdown = Array.isArray(price.breakdown) ? price.breakdown.filter(isObj) : [];
    const description = breakdown.length > 0 ? str(breakdown[0].description) : null;
    const nightly = description ? nightlyFromBreakdown(description) : null;
    if (nightly === null) problems.add("Airbnb: price field missing");
    const rating = num(p.rating);
    return {
      name: str(p.title) ?? "Unnamed stay",
      site: "Airbnb",
      totalInr: nightly === null ? null : airbnbTotal(nights, nightly, usdToInr),
      rating: rating !== null && rating > 0 ? airbnbRatingOutOf10(rating) : null,
      url: str(p.url),
      typeText: str(p.title) ?? "",
    };
  });
  return { candidates, problems: [...problems] };
}

const SHARED_PATTERN = /hostel|dorm|shared room|bed in/i;

// Rules: rating 7.0+/10 (unrated hidden), no hostels/dorms/shared rooms, has price and link.
export function applyRules(candidates: Candidate[]): Stay[] {
  const stays: Stay[] = [];
  for (const c of candidates) {
    if (c.rating === null || c.rating < 7) continue;
    if (SHARED_PATTERN.test(c.typeText)) continue;
    if (c.totalInr === null || c.totalInr <= 0) continue;
    if (!c.url) continue;
    stays.push({
      name: c.name,
      site: c.site,
      totalInr: c.totalInr,
      rating: c.rating,
      url: c.url,
      feesMayBeExtra: c.site === "Airbnb",
    });
  }
  return stays;
}

// Cheapest first; same price: higher rating first.
export function rankStays(stays: Stay[]): Stay[] {
  return [...stays].sort((a, b) => a.totalInr - b.totalInr || b.rating - a.rating);
}

export function cheapest(stays: Stay[], count: number): Stay[] {
  return rankStays(stays).slice(0, count);
}

// Each site keeps its 3 cheapest; the main agent combines up to 6.
export const PER_SITE = 3;
export const MAX_RESULTS = 6;

export function combineResults(lists: Stay[][]): Stay[] {
  return cheapest(lists.flat(), MAX_RESULTS);
}
