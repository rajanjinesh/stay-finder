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

async function callHasData(url: string, params: URLSearchParams): Promise<unknown> {
  const apiKey = process.env.HASDATA_API_KEY;
  if (!apiKey) throw new Error("HASDATA_API_KEY is not set");

  const res = await fetch(`${url}?${params.toString()}`, {
    method: "GET",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HasData request failed: HTTP ${res.status}`);
  return res.json();
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
  const params = new URLSearchParams({
    location: input.destination,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    adults: String(input.adults),
    children: String(input.childrenAges.length),
  });
  return callHasData(AIRBNB_URL, params);
}
