// Tests that HasData requests take turns (free plan: 1 at a time) and that HTTP 429 is retried.
// fetch is replaced with a fake, so nothing is sent to HasData.
import { test } from "node:test";
import assert from "node:assert/strict";
import { RETRY_DELAY_MS, searchAirbnb, searchBooking } from "../lib/hasdata.ts";

const input = { destination: "Goa", checkIn: "2026-11-20", checkOut: "2026-11-23", adults: 2, childrenAges: [5] };

process.env.HASDATA_API_KEY = "test-key-not-real";
RETRY_DELAY_MS.value = 10;

test("Booking.com and Airbnb HasData calls never overlap", async () => {
  let running = 0;
  let maxRunning = 0;
  globalThis.fetch = (async () => {
    running++;
    maxRunning = Math.max(maxRunning, running);
    await new Promise((r) => setTimeout(r, 30));
    running--;
    return new Response("{}", { status: 200 });
  }) as typeof fetch;

  await Promise.all([searchBooking(input), searchAirbnb(input)]);
  assert.equal(maxRunning, 1);
});

test("HTTP 429 is retried, then succeeds", async () => {
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    return new Response(calls === 1 ? "" : '{"results":[]}', { status: calls === 1 ? 429 : 200 });
  }) as typeof fetch;

  assert.deepEqual(await searchBooking(input), { results: [] });
  assert.equal(calls, 2);
});

test("other errors are not retried", async () => {
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    return new Response("", { status: 422 });
  }) as typeof fetch;

  await assert.rejects(searchAirbnb(input), /HTTP 422/);
  assert.equal(calls, 1);
});
