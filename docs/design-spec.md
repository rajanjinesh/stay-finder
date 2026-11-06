# Design spec

Read once from Figma file `TwJNdXH9vDfgUHO8LiAUXG` ("StayFinder") on 2026-11-06.
- Search page: frame "Search Page" (node 5:207)
- Results page: frame "Results Page" (node 5:251)

Build from this file. Don't fetch from Figma again unless asked.
Figma has desktop frames only (no mobile frames). Mobile is noted under "Mobile" below.

## Shared tokens

### Colours
| Token | Hex | Used for |
|---|---|---|
| Background | `#ffffff` | Page, inputs, cards |
| Text primary | `#20252d` | Headings, labels, input values, prices, stay names |
| Text secondary | `#646c78` | Subtitles, helper text, site name, "Total stay price" |
| Text muted | `#7c8490` | Placeholders, "Up to 6 stays", state example text |
| Border | `#dde1e7` | Input borders, card borders, divider |
| Primary (blue) | `#2563eb` | Buttons, "← New search" link |
| On primary | `#ffffff` | Button text |
| Error | `#c83b3b` | Field error message |
| Rating chip bg | `#f7f8fa` | Rating badge |

### Font
Inter (Regular 400, Medium 500, Semi Bold 600, Bold 700).

| Style | Size | Weight | Line height | Letter spacing | Colour |
|---|---|---|---|---|---|
| Page title | 32px | 600 | 1.2 | -0.9px | primary |
| Page subtitle | 15px | 400 | 1.5 | 0 | secondary |
| Field label | 14px | 500 | normal | 0 | primary |
| Input value | 15px | 400 | normal | 0 | primary (placeholder: muted) |
| Helper text | 12px | 400 | 1.4 | 0 | secondary |
| Error text | 12px | 400 | 1.4 | 0 | error |
| Button | 14px | 600 | normal | 0 | white |
| Link ("← New search") | 14px | 500 | normal | 0 | primary blue |
| Stay name | 18px | 700 | normal | 0 | primary |
| Price | 24px | 700 | normal | -0.5px | primary |
| Small meta (site, "Total stay price", list context) | 12px | 400 | normal | 0 | secondary |
| Rating chip | 12px | 600 | normal | 0 | primary |

### Shapes
- Inputs: height 48px, padding 0 14px, 1px border `#dde1e7`, radius 6px.
- Buttons: radius 6px, background `#2563eb`.
- Cards: 1px border `#dde1e7`, radius 8px, padding 24px.
- Rating chip: padding 5px 8px, radius 4px, background `#f7f8fa`.

## Search page

### Layout
- Page: white, content centred horizontally and vertically, padding 100px top and bottom.
- Form column: width 480px, vertical stack, gap 32px between intro, fields and button.
- Intro: title + subtitle, gap 12px.
- Fields block: vertical stack, gap 24px between groups.
- Each field: label above input, gap 8px.
- Two-column rows (Check-in / Check-out, Adults / Children): equal widths, gap 16px.

### Content (top to bottom)
1. Title: "Stay Finder"
2. Subtitle: "Compare stays across booking sites, cheapest first"
3. **Destination**: label "Destination", text input, placeholder "e.g. Goa".
   Error shown under input: "Please enter a destination" (12px, `#c83b3b`).
4. **Dates** row:
   - "Check-in": date input, value shown as "20 Nov 2026", calendar icon (18px) on the right.
   - "Check-out": date input, value shown as "21 Nov 2026", calendar icon (18px) on the right.
   - Under the row: helper "1 night" (nights count, 12px secondary).
5. **Guests** row:
   - "Adults": number input, value "1", up/down chevrons icon (16×18px) on the right.
   - "Children": number input, value "0", up/down chevrons icon (16×18px) on the right.
6. **Child age** (one per child): label "Child 1 age", dropdown, placeholder "Select age (0–17)",
   chevron-down icon (16px) on the right. Helper under it: "One age field appears for each child".
7. **Button**: "Search", full width (480px), height 50px, padding 0 16px.

### Icons
calendar (18px), chevrons-up-down (16×18px), chevron-down (16px). Grey outline icons.
They were not downloaded; Figma's asset links expire after 7 days.

## Results page

### Layout
- Page: white, content centred horizontally, padding 72px top, 64px bottom.
- Content column: width 880px, vertical stack, gap 32px.
- Trip header: vertical stack, gap 24px (link, then title block). Title block gap 12px.
- Stay results: vertical stack, gap 12px.
- List context row: space-between, padding-bottom 4px.

### Content (top to bottom)
1. Link: "← New search" (blue, 14px medium).
2. Title: "Cheapest stays for your trip"
3. Trip summary: "Goa · 20–21 Nov 2026 · 1 night · 2 adults, 1 child"
   (destination · dates · nights · guests).
4. List context row: left "4 stays · Cheapest first" (secondary), right "Up to 6 stays" (muted).
5. **Stay cards** (up to 6, cheapest first). Each card is a row, height 126px, gap 24px,
   items vertically centred:
   - **Left (fills space)**, stack gap 12px:
     - Stay name (18px bold), e.g. "Sea View Resort".
     - Meta row, gap 12px: rating chip "8.2/10", then site name "Booking.com" or "Airbnb".
   - **Middle (width 150px, right-aligned)**, stack gap 5px:
     - Price, e.g. "₹4,200" (24px bold).
     - "Total stay price" (12px secondary).
     - Airbnb only: "Fees may be extra" (12px secondary).
   - **Right**: button, width 208px, height 42px, padding 0 16px:
     "View on Booking.com" or "View on Airbnb".
6. Example cards in the design:
   | Name | Rating | Site | Price |
   |---|---|---|---|
   | Sea View Resort | 8.2/10 | Booking.com | ₹4,200 |
   | Palm Cottage | 9.1/10 | Airbnb | ₹4,350 (Fees may be extra) |
   | Beach Inn | 7.4/10 | Booking.com | ₹4,800 |
   | Lagoon Studio | 8.6/10 | Airbnb | ₹5,100 (Fees may be extra) |

### States (from the "State examples — reference only" block, 12px text)
The block is a reference in the design, not part of the page. Separated by a 1px `#dde1e7` divider.
| State | Text in Figma |
|---|---|
| Loading | "Searching Booking.com and Airbnb…" |
| One site failed | "Couldn't load Airbnb results. Showing Booking.com only." |
| Empty | "No stays found. Try different dates or a different destination." |
| Error | (no text given in Figma) |

## Mobile
No mobile frames in Figma. To follow the design on mobile, the 480px form and 880px content
columns need to shrink to the screen width, and stay cards need to stack. Exact mobile layout is
not specified.
