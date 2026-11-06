# Data notes: HasData field mapping

Sources (checked 2026-11-06):
- Parameters: docs.hasdata.com/apis/booking/search and docs.hasdata.com/apis/airbnb/listing
- Response fields: the example response excerpts on hasdata.com/apis/booking-api and
  hasdata.com/apis/airbnb-api. The docs.hasdata.com pages have no example response.

The mocks in `mocks/` follow these shapes. If the first real search shows a mismatch, fix the
mapping in `lib/stays.ts` (`mapBooking`, `mapAirbnb`).

## Booking.com (`GET /scrape/booking/search`)

Request: `keyword`, `checkInDate`, `checkOutDate`, `rooms=1`, `adults`, `children`,
`childrenAges` (comma-separated), `currency=inr`.

| Our field | HasData field | Notes |
|---|---|---|
| name | `results[].title` | |
| link | `results[].url` | |
| stay price | `results[].price.pricePerStayParsed` | number, in the requested currency |
| taxes & fees | `results[].price.taxesAndFeesParsed` | **Not confirmed.** The search excerpt shows no tax field. The name is taken from the place endpoint (`rooms[].variants[].prices.taxesAndFeesParsed`). If missing, it counts as 0 and the server logs "Booking.com: taxes & fees field missing (counted as 0)". |
| rating /10 | `results[].reviews.score` | Guest score out of 10. `results[].rating` is the star class, not used. |
| type check | `results[].title` + `results[].room` | No property-type field in search results; text is checked for hostel / dorm / shared room / "bed in". |

Total (INR) = `pricePerStayParsed` + `taxesAndFeesParsed`.

## Airbnb (`GET /scrape/airbnb/listing`)

Request: `location`, `checkIn`, `checkOut`, `adults`, `children`. No currency option and no child ages.

| Our field | HasData field | Notes |
|---|---|---|
| name | `properties[].title` | e.g. "Home in East Austin" |
| link | `properties[].url` | |
| nightly price (USD) | `properties[].price.breakdown[0].description` | e.g. "4 nights x $157.70" → 157.70 |
| rating | `properties[].rating` | Out of 5, so x 2. 0 or missing = unrated (hidden). |
| type check | `properties[].title` | No room-type field; title is checked for hostel / dorm / shared room. |

Total (INR) = nights (from the user's dates) x nightly price x `USD_TO_INR` (`lib/config.ts`, set to 95).
Airbnb rows show "Fees may be extra".

## Failures

If a site's data can't be read, that site returns "failed" and the reason is logged on the server,
for example "Airbnb: properties field missing", "Airbnb: price field missing" or
"Booking.com: HasData request failed: HTTP 422". Keys are never logged.
