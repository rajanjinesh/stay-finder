import { runSearch } from "@/lib/agents";

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Local-only check: runs one search on the mocks and shows the result plus
// when each agent started and finished. Not available in production.
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }
  const input = {
    destination: "Goa",
    checkIn: isoDaysFromNow(7),
    checkOut: isoDaysFromNow(10),
    adults: 2,
    childrenAges: [5],
  };
  const result = await runSearch(input, true);
  return Response.json({ input, ...result });
}
