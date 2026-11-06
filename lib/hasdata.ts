// HasData REST API connection. Server side only: never import this from client components.
// Parameter names are from the HasData docs (docs.hasdata.com/apis/booking/search and /apis/airbnb/listing).

const BOOKING_URL = "https://api.hasdata.com/scrape/booking/search";
const AIRBNB_URL = "https://api.hasdata.com/scrape/airbnb/listing";

export type SearchInput = {
  destination: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  adults: number;
  childrenAges: number[]; // one age (0-17) per child
};

// The HasData free plan allows 1 request at a time (more returns HTTP 429).
// So HasData requests take turns: the subagents still start together, but their
// HasData calls run one after the other. A 429 (e.g. from another search) is retried.
const MAX_429_RETRIES = 2;
export const RETRY_DELAY_MS = { value: 2000 };

let queue: Promise<unknown> = Promise.resolve();

function oneAtATime<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, apiKey: string): Promise<unknown> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      method: "GET",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (res.status === 429 && attempt < MAX_429_RETRIES) {
      await sleep(RETRY_DELAY_MS.value);
      continue;
    }
    if (!res.ok) {
      // HasData's error body says which parameter was rejected (it never contains the key).
      const reason = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 300);
      throw new Error(`HasData request failed: HTTP ${res.status}${reason ? ` (${reason})` : ""}`);
    }
    return res.json();
  }
}

function callHasData(url: string, params: URLSearchParams): Promise<unknown> {
  const apiKey = process.env.HASDATA_API_KEY;
  if (!apiKey) return Promise.reject(new Error("HASDATA_API_KEY is not set"));
  return oneAtATime(() => fetchWithRetry(`${url}?${params.toString()}`, apiKey));
}

export function searchBooking(input: SearchInput): Promise<unknown> {
  const params = new URLSearchParams({
    keyword: input.destination,
    checkInDate: input.checkIn,
    checkOutDate: input.checkOut,
    rooms: "1",
    adults: String(input.adults),
    children: String(input.childrenAges.length),
    currency: "inr",
  });
  if (input.childrenAges.length > 0) {
    params.set("childrenAges", input.childrenAges.join(","));
  }
  return callHasData(BOOKING_URL, params);
}

export function searchAirbnb(input: SearchInput): Promise<unknown> {
  // Airbnb takes the number of children only (no ages) and has no currency option.
  // `children` is optional: only sent when there are children (children=0 looks to be rejected with HTTP 422).
  const params = new URLSearchParams({
    location: input.destination,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    adults: String(input.adults),
  });
  if (input.childrenAges.length > 0) params.set("children", String(input.childrenAges.length));
  return callHasData(AIRBNB_URL, params);
}
