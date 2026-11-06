# Context: Cheapest Stays prototype

## Problem
Finding the cheapest stay means opening several booking sites, searching each one and
comparing prices by hand. It's slow, and it's easy to miss a better deal.

## Solution
One search checks two sites at the same time and shows the cheapest good stays in one list.

## Goal
Build a quick, working prototype to validate the solution: can one search pull stays from
two sites in parallel, fast enough, and show a useful cheapest-first list?
Speed of building matters more than polish.

## Success
- A real search returns results from both sites in one list.
- Both sites are searched in parallel, and results show in under ~20 seconds.
- The stays are correctly ranked cheapest first, with a working link to each listing.
- A simple test proves the ranking is correct.
(I check the first three myself on the live site after deploy.)

## What it does
1. The user fills the Search page and clicks Search.
2. A main agent starts exactly 2 subagents at the same time: one for Booking.com, one for Airbnb.
   Never more than 2. Subagents never call each other.
3. Each subagent fetches stays from its site and returns its 3 cheapest that pass the rules.
4. The main agent combines up to 6 stays, ranked cheapest first, and the Results page shows them.

## How the agents are built
- Inside the app's server code (TypeScript), using the Anthropic API.
- Main agent: one Claude call with exactly 2 tools (one per subagent); it calls both at the same time.
- Each subagent: a separate Claude call with its own instructions and exactly one tool (its site's search).
- Filtering, picking each site's 3 cheapest, and ranking the 6 are done in CODE, not by the AI.

## Pages (2 only)
**Search page**
- Fields: destination, check-in, check-out, adults, children, and one age (0-17) per child.
- Defaults: check-in today, check-out tomorrow, 1 adult, 0 children.
- Checks: destination required; check-in not in the past; check-out after check-in;
  at least 1 adult; an age for each child. Show a short message saying what to fix.

**Results page**
- Up to 6 rows, cheapest first. Each row: name, site (Booking.com / Airbnb),
  total price in INR, rating /10, and a link to the listing (opens in a new tab).
- Airbnb rows show "Fees may be extra".
- While searching: a loading indicator.
- One site fails: show the other site's results plus a short note that the site is unavailable.
- Fewer than 6 found: show what was found.
- Nothing found: "No stays found. Try different dates or a different destination."
- Both sites fail: "Something went wrong. Please try again."

## Rules for which stays are shown (in code, per site)
- Rating 7.0 or higher out of 10. Hide unrated stays.
- No hostels, dorms or shared rooms.
- 1 room. Skip stays with no price or no link.
- Keep each site's 3 cheapest that pass the rules.

## Price (total for the whole stay, in INR)
- Booking.com: total = stay price + taxes & fees (HasData returns them separately).
- Airbnb: HasData returns USD with no total. Total = nights x nightly price x USD_TO_INR
  (one fixed rate in a config file). Airbnb ratings are out of 5, so multiply by 2.
- Map fields from the HasData docs' example responses. If my first real search shows a
  mismatch, we fix it then.

## Design (build time: Figma MCP)
- Both pages are designed in Figma: frames "Search Page" and "Results Page"
  (links are given in Step 1).
- Read both frames via the Figma MCP once. Save the specs (layout, colours, fonts, spacing,
  text) to docs/design-spec.md. Build from that file. Don't fetch from Figma again unless I ask.
- Follow the design for desktop and mobile.

## Data (run time: HasData API)
- The subagents call the HasData REST API from the server. Never from the browser.
  - Booking: GET https://api.hasdata.com/scrape/booking/search
  - Airbnb:  GET https://api.hasdata.com/scrape/airbnb/listing
  - Header: x-api-key = HASDATA_API_KEY
- While building: mock data only (mocks/, USE_MOCK=true in .env.local), shaped like the
  example responses in the HasData docs. Tests use made-up examples.
- On Vercel, USE_MOCK is not set, so the live site uses real HasData data.
- If a site fails, log the reason on the server (e.g. "Airbnb: price field missing"),
  so I can see it in the Vercel logs.

## Not in scope
More sites, filters, maps, photos, login, booking, or a "Best pick" explanation.
