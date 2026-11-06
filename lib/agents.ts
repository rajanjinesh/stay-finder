// Main agent + 2 subagents, built on the Anthropic API. Server side only.
// The AI only decides to call the tools; the stays always come from the tools (code),
// and filtering, picking and ranking are done in code.
import type Anthropic from "@anthropic-ai/sdk";
import { getClient, getModel } from "./anthropic";
import type { SearchInput } from "./hasdata";
import { searchSite, type SiteResult } from "./sites";
import { combineResults, type SiteName, type Stay } from "./stays";

export type Timing = { agent: string; startedMs: number; finishedMs: number };

export type SearchResult = {
  stays: Stay[];
  sites: { booking: "ok" | "failed"; airbnb: "ok" | "failed" };
  timings: Timing[];
};

type SiteConfig = { site: SiteName; subagentTool: string; mainTool: string };

const SITES: SiteConfig[] = [
  { site: "Booking.com", subagentTool: "search_booking_com", mainTool: "booking_com_subagent" },
  { site: "Airbnb", subagentTool: "search_airbnb", mainTool: "airbnb_subagent" },
];

const NO_INPUT_SCHEMA: Anthropic.Tool.InputSchema = { type: "object", properties: {}, required: [] };

function describeTrip(input: SearchInput): string {
  const children = input.childrenAges.length;
  return `${input.destination}, check-in ${input.checkIn}, check-out ${input.checkOut}, ` +
    `${input.adults} adult(s), ${children} child(ren)${children ? ` aged ${input.childrenAges.join(", ")}` : ""}`;
}

function toolNamesCalled(message: Anthropic.Message): string[] {
  return message.content
    .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
    .map((b) => b.name);
}

// One subagent: its own Claude call with exactly one tool (its site's search).
async function runSubagent(cfg: SiteConfig, input: SearchInput, useMock: boolean, t0: number, timings: Timing[]): Promise<SiteResult> {
  const startedMs = Date.now() - t0;
  let result: SiteResult;
  try {
    let called = false;
    try {
      const message = await getClient().messages.create({
        model: getModel(),
        max_tokens: 2048,
        output_config: { effort: "low" },
        system:
          `You are the ${cfg.site} search subagent. Call the ${cfg.subagentTool} tool exactly once to search ` +
          `${cfg.site} for the user's trip. Never write or invent stays yourself.`,
        tools: [
          {
            name: cfg.subagentTool,
            description: `Searches ${cfg.site} for the user's trip and returns its 3 cheapest stays that pass the rules. Takes no input: it always uses the user's search.`,
            input_schema: NO_INPUT_SCHEMA,
          },
        ],
        tool_choice: { type: "auto" },
        messages: [{ role: "user", content: `Find stays for: ${describeTrip(input)}.` }],
      });
      called = toolNamesCalled(message).includes(cfg.subagentTool);
    } catch (err) {
      console.error(`${cfg.site}: subagent call failed (${err instanceof Error ? err.message : String(err)})`);
    }
    if (!called) console.warn(`${cfg.site}: subagent did not call its tool, running the tool directly`);
    // The tool always uses the user's search inputs, never the AI's text.
    result = await searchSite(cfg.site, input, useMock);
  } catch (err) {
    console.error(`${cfg.site}: ${err instanceof Error ? err.message : String(err)}`);
    result = { site: cfg.site, status: "failed", stays: [] };
  }
  timings.push({ agent: `${cfg.site} subagent`, startedMs, finishedMs: Date.now() - t0 });
  return result;
}

// Main agent: its own Claude call with exactly 2 tools (one per subagent).
// Both subagents run at the same time; results are combined and ranked in code.
export async function runSearch(input: SearchInput, useMock: boolean): Promise<SearchResult> {
  const t0 = Date.now();
  const timings: Timing[] = [];
  const mainStarted = 0;

  let called: string[] = [];
  try {
    const message = await getClient().messages.create({
      model: getModel(),
      max_tokens: 2048,
      output_config: { effort: "low" },
      system:
        "You are the main search agent. Call BOTH tools at the same time, in one response: " +
        "booking_com_subagent and airbnb_subagent. Call each one once. Never write or invent stays yourself.",
      tools: SITES.map((s) => ({
        name: s.mainTool,
        description: `Starts the ${s.site} subagent, which returns its 3 cheapest stays for the user's trip. Takes no input.`,
        input_schema: NO_INPUT_SCHEMA,
      })),
      tool_choice: { type: "auto" },
      messages: [{ role: "user", content: `Find the cheapest stays for: ${describeTrip(input)}.` }],
    });
    called = toolNamesCalled(message);
  } catch (err) {
    console.error(`Main agent: call failed (${err instanceof Error ? err.message : String(err)})`);
  }

  // Exactly 2 subagents, never more: one per site, even if a tool was called twice or not at all.
  for (const s of SITES) {
    if (!called.includes(s.mainTool)) console.warn(`Main agent: did not call ${s.mainTool}, starting it directly`);
  }
  const mainDecidedMs = Date.now() - t0;

  const [booking, airbnb] = await Promise.all(SITES.map((s) => runSubagent(s, input, useMock, t0, timings)));
  const stays = combineResults([booking.stays, airbnb.stays]);

  timings.unshift({ agent: "Main agent (Claude call)", startedMs: mainStarted, finishedMs: mainDecidedMs });
  timings.push({ agent: "Main agent (total)", startedMs: mainStarted, finishedMs: Date.now() - t0 });

  return { stays, sites: { booking: booking.status, airbnb: airbnb.status }, timings };
}
