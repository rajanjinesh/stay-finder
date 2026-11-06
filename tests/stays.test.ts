// Tests for the price maths, the rules and the ranking. Made-up examples only, no HasData calls.
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  airbnbRatingOutOf10,
  airbnbTotal,
  applyRules,
  bookingTotal,
  cheapest,
  combineResults,
  mapAirbnb,
  mapBooking,
  nightlyFromBreakdown,
  nightsBetween,
  rankStays,
  type Candidate,
  type Stay,
} from "../lib/stays.ts";

const stay = (name: string, totalInr: number, rating = 8, site: Stay["site"] = "Booking.com"): Stay => ({
  name, site, totalInr, rating, url: `https://example.com/${name}`, feesMayBeExtra: site === "Airbnb",
});

const candidate = (over: Partial<Candidate>): Candidate => ({
  name: "Test Stay", site: "Booking.com", totalInr: 3000, rating: 8, url: "https://example.com/x", typeText: "Hotel Double Room", ...over,
});

// --- Price maths ---

test("Booking.com total = stay price + taxes & fees", () => {
  assert.equal(bookingTotal(3600, 600), 4200);
});

test("Airbnb total = nights x nightly USD x USD_TO_INR", () => {
  assert.equal(airbnbTotal(3, 18, 95), 5130);
  assert.equal(airbnbTotal(2, 157.7, 90), 28386);
});

test("Airbnb rating out of 5 becomes out of 10", () => {
  assert.equal(airbnbRatingOutOf10(4.55), 9.1);
  assert.equal(airbnbRatingOutOf10(3.5), 7);
});

test("nightly price is read from the breakdown text", () => {
  assert.equal(nightlyFromBreakdown("4 nights x $157.70"), 157.7);
  assert.equal(nightlyFromBreakdown("2 nights x $1,050.00"), 1050);
  assert.equal(nightlyFromBreakdown("Cleaning fee"), null);
});

test("nights between dates", () => {
  assert.equal(nightsBetween("2026-11-20", "2026-11-23"), 3);
});

test("mapBooking adds taxes and uses the review score", () => {
  const { candidates } = mapBooking({
    results: [{ title: "A", url: "https://b.com/a", room: "Double", price: { pricePerStayParsed: 1000, taxesAndFeesParsed: 150 }, rating: 4, reviews: { score: 8.5 } }],
  });
  assert.equal(candidates[0].totalInr, 1150);
  assert.equal(candidates[0].rating, 8.5); // not the star rating
});

test("mapAirbnb uses the user's nights, the fixed rate and rating x 2", () => {
  const { candidates } = mapAirbnb(
    { properties: [{ title: "Flat", url: "https://a.com/1", rating: 4.5, price: { breakdown: [{ description: "3 nights x $20.00" }] } }] },
    3,
    95,
  );
  assert.equal(candidates[0].totalInr, 5700);
  assert.equal(candidates[0].rating, 9);
});

test("mapping reports a missing price field", () => {
  const { candidates, problems } = mapAirbnb({ properties: [{ title: "X", url: "https://a.com/x", rating: 4.8, price: {} }] }, 2, 95);
  assert.equal(candidates[0].totalInr, null);
  assert.deepEqual(problems, ["Airbnb: price field missing"]);
});

test("mapping fails when the results list is missing", () => {
  assert.throws(() => mapBooking({}), /Booking.com: results field missing/);
  assert.throws(() => mapAirbnb({}, 1, 95), /Airbnb: properties field missing/);
});

// --- Rules ---

test("rules keep a stay rated exactly 7.0 and drop 6.9", () => {
  const kept = applyRules([candidate({ name: "Seven", rating: 7 }), candidate({ name: "Low", rating: 6.9 })]);
  assert.deepEqual(kept.map((s) => s.name), ["Seven"]);
});

test("rules hide unrated stays", () => {
  assert.equal(applyRules([candidate({ rating: null })]).length, 0);
});

test("rules drop hostels, dorms and shared rooms", () => {
  const kept = applyRules([
    candidate({ name: "Hostel", typeText: "Goa Backpackers Hostel" }),
    candidate({ name: "Dorm", typeText: "Bed in 6-Bed Mixed Dormitory Room" }),
    candidate({ name: "Shared", typeText: "Shared room in Anjuna" }),
    candidate({ name: "Hotel", typeText: "Sea View Resort Deluxe Room" }),
  ]);
  assert.deepEqual(kept.map((s) => s.name), ["Hotel"]);
});

test("rules drop stays with no price or no link", () => {
  assert.equal(applyRules([candidate({ totalInr: null }), candidate({ url: null })]).length, 0);
});

test("Airbnb stays are marked 'fees may be extra'", () => {
  const [s] = applyRules([candidate({ site: "Airbnb" })]);
  assert.equal(s.feesMayBeExtra, true);
});

// --- Ranking ---

test("ranking is cheapest first", () => {
  const ranked = rankStays([stay("C", 5000), stay("A", 3000), stay("B", 4000)]);
  assert.deepEqual(ranked.map((s) => s.totalInr), [3000, 4000, 5000]);
});

test("same price: higher rating first", () => {
  const ranked = rankStays([stay("Low", 4000, 7.5), stay("High", 4000, 9.2)]);
  assert.deepEqual(ranked.map((s) => s.name), ["High", "Low"]);
});

test("each site keeps its 3 cheapest", () => {
  const top = cheapest([stay("A", 900), stay("B", 100), stay("C", 500), stay("D", 300)], 3);
  assert.deepEqual(top.map((s) => s.totalInr), [100, 300, 500]);
});

test("main agent combines up to 6, cheapest first", () => {
  const booking = [stay("B1", 4200), stay("B2", 4800), stay("B3", 6100)];
  const airbnb = [stay("A1", 5130, 9, "Airbnb"), stay("A2", 6270, 9, "Airbnb"), stay("A3", 8550, 9, "Airbnb")];
  const combined = combineResults([booking, airbnb]);
  assert.deepEqual(combined.map((s) => s.totalInr), [4200, 4800, 5130, 6100, 6270, 8550]);
});

test("one site failing still returns the other site's stays", () => {
  const combined = combineResults([[stay("B1", 4200), stay("B2", 4800)], []]);
  assert.deepEqual(combined.map((s) => s.name), ["B1", "B2"]);
});
