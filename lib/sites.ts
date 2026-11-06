// Each subagent's tool: get the data, map the fields, work out prices, apply the rules,
// keep the 3 cheapest. Server side only.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { searchAirbnb, searchBooking, type SearchInput } from "./hasdata";
import { USD_TO_INR } from "./config";
import { applyRules, cheapest, mapAirbnb, mapBooking, nightsBetween, PER_SITE, type SiteName, type Stay } from "./stays";

export type SiteResult =
  | { site: SiteName; status: "ok"; stays: Stay[] }
  | { site: SiteName; status: "failed"; stays: [] };

async function readMock(file: string): Promise<unknown> {
  const text = await readFile(path.join(process.cwd(), "mocks", file), "utf8");
  return JSON.parse(text);
}

async function getRaw(site: SiteName, input: SearchInput, useMock: boolean): Promise<unknown> {
  if (useMock) return readMock(site === "Booking.com" ? "booking.json" : "airbnb.json");
  return site === "Booking.com" ? searchBooking(input) : searchAirbnb(input);
}

// Local-only test switch: fake a failed or empty site. Ignored in production (see /api/search).
export type FakeMode = "failed" | "empty";

export async function searchSite(site: SiteName, input: SearchInput, useMock: boolean, fake?: FakeMode): Promise<SiteResult> {
  try {
    if (fake === "failed") throw new Error(`${site}: faked failure (local test switch)`);
    if (fake === "empty") return { site, status: "ok", stays: [] };
    const raw = await getRaw(site, input, useMock);
    const mapped =
      site === "Booking.com"
        ? mapBooking(raw)
        : mapAirbnb(raw, nightsBetween(input.checkIn, input.checkOut), USD_TO_INR);
    for (const problem of mapped.problems) console.warn(problem);
    return { site, status: "ok", stays: cheapest(applyRules(mapped.candidates), PER_SITE) };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(reason.startsWith(site) ? reason : `${site}: ${reason}`);
    return { site, status: "failed", stays: [] };
  }
}
