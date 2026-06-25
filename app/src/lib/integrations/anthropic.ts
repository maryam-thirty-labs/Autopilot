// Phase 7 — live agent reasoning via Claude (server-only).
// Diagnoser + Repair Engineer + Outreach, on a real public post.
// Configured → genuine LLM reasoning. Unconfigured → scripted fallback.

import Anthropic from "@anthropic-ai/sdk";

const KEY = process.env.ANTHROPIC_API_KEY;
export const isAnthropicConfigured = Boolean(KEY);

export interface ReasonInput {
  signal: string;
  likely_issue?: string;
  tool_used?: string;
  source_url?: string;
}

export interface Reasoning {
  diagnosis: string;
  patch: string;
  outreach: string;
  live: boolean;
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    diagnosis: { type: "string", description: "Concise root-cause diagnosis, 2-4 sentences." },
    patch: { type: "string", description: "Minimal correct SQL/code patch that fixes it (SQL for Supabase auth/RLS)." },
    outreach: { type: "string", description: "Short personalised outreach reply, 2-3 sentences." },
  },
  required: ["diagnosis", "patch", "outreach"],
} as const;

const SYSTEM =
  "You are the Diagnoser, Repair Engineer, and Outreach agents for Thirty Labs — an autonomous repair desk " +
  "for broken AI-built apps (Lovable, Bolt, Cursor, v0, Supabase). Given a real public support post about a " +
  "broken app, produce: (1) a concise root-cause diagnosis, (2) a minimal, correct patch that fixes it — for " +
  "Supabase auth/RLS/profile issues this is usually the SQL for RLS policies plus a handle_new_user trigger, " +
  "(3) a short, warm, personalised outreach reply offering the fix. Be specific and technically correct. " +
  "Do not include secrets or destructive SQL.";

export async function reason(input: ReasonInput): Promise<Reasoning> {
  if (!KEY) throw new Error("ANTHROPIC_API_KEY not set");
  const client = new Anthropic({ apiKey: KEY });

  const user =
    `Public post:\n"""${input.signal}"""\n` +
    (input.tool_used ? `Tool: ${input.tool_used}\n` : "") +
    (input.likely_issue ? `Suspected issue: ${input.likely_issue}\n` : "") +
    (input.source_url ? `Source: ${input.source_url}\n` : "");

  const res = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 2000,
    system: SYSTEM,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: user }],
  });

  const text = res.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("No text block in response");
  const parsed = JSON.parse(text.text) as Omit<Reasoning, "live">;
  return { ...parsed, live: true };
}
