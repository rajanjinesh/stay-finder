# CLAUDE.md

## What this project is

A quick prototype that finds the cheapest stays across Booking.com and Airbnb.
The full product context is in docs/context.md. Read it before every step.

## How to work

* This file and docs/context.md describe the project. They are NOT instructions to build.
Build only what the current step prompt asks.
* Do ONLY what the current step prompt asks. Nothing extra.
* No extra features, pages, files, libraries, refactors or "improvements" unless I ask.
* Don't start the next step until I send its prompt.
* If something is unclear, missing or conflicts with docs/context.md, stop and ask. Don't guess.
* At the end of each step, give the summary the step asks for, and list anything you were unsure about.

## Tech

Next.js (TypeScript), Anthropic API (agents), HasData API (data), Figma MCP (design),
GitHub, Vercel.

## Workflow

* Code lives in GitHub: <REPO\_URL> (main branch). Commit and push after every finished step.
* Test locally (npm run dev) before pushing.
* Deploy to Vercel ONCE, in the final step. Don't set up Vercel before then.
* Never call HasData during any step. Use mock data. I run the first real search myself after deploy.

## Keys

* ANTHROPIC\_API\_KEY, ANTHROPIC\_MODEL, HASDATA\_API\_KEY are in .env.local; added to Vercel at deploy.
* Never commit .env.local, print a key, log a key, or use a key in browser code.



\## Repo

GITHUB\_REPO\_URL: https://github.com/rajanjinesh/stay-finder

