import { runSearch } from "@/lib/agents";
import type { SearchInput } from "@/lib/hasdata";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseInput(body: unknown): SearchInput | string {
  if (typeof body !== "object" || body === null) return "Body must be a JSON object";
  const b = body as Record<string, unknown>;
  const destination = typeof b.destination === "string" ? b.destination.trim() : "";
  if (!destination) return "destination is required";
  if (typeof b.checkIn !== "string" || !DATE.test(b.checkIn)) return "checkIn must be YYYY-MM-DD";
  if (typeof b.checkOut !== "string" || !DATE.test(b.checkOut)) return "checkOut must be YYYY-MM-DD";
  if (b.checkOut <= b.checkIn) return "checkOut must be after checkIn";
  if (!Number.isInteger(b.adults) || (b.adults as number) < 1) return "adults must be at least 1";
  const ages = b.childrenAges ?? [];
  if (!Array.isArray(ages) || !ages.every((a) => Number.isInteger(a) && a >= 0 && a <= 17)) {
    return "childrenAges must be a list of ages 0-17";
  }
  return { destination, checkIn: b.checkIn, checkOut: b.checkOut, adults: b.adults as number, childrenAges: ages as number[] };
}

// POST /api/search: takes the search inputs, returns the stays and each site's status.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be valid JSON" }, { status: 400 });
  }
  const input = parseInput(body);
  if (typeof input === "string") return Response.json({ error: input }, { status: 400 });

  const result = await runSearch(input, process.env.USE_MOCK === "true");
  return Response.json({ stays: result.stays, sites: result.sites });
}
