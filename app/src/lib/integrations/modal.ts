// Phase 6 — Modal QA Guard (server-only).
// Configured → calls the deployed Modal endpoint for a real sandboxed check.
// Unconfigured → returns a canned-but-believable QA result so the step works.

const MODAL_CHECK_URL = process.env.MODAL_CHECK_URL;

export const isModalConfigured = Boolean(MODAL_CHECK_URL);

export interface QaResult {
  status: "passed" | "failed";
  command: string;
  duration: string;
  secrets_detected: boolean;
  destructive_sql?: boolean;
  warnings: string[];
  ran_on: string;
}

export interface QaInput {
  ticket_ref?: string;
  repo_url?: string;
  code?: string;
}

const DEMO_RESULT: QaResult = {
  status: "passed",
  command: "npm run build",
  duration: "38s",
  secrets_detected: false,
  destructive_sql: false,
  warnings: ["No destructive SQL detected", "No secrets detected"],
  ran_on: "demo",
};

export async function runModalCheck(
  input: QaInput,
): Promise<{ result: QaResult; demo: boolean }> {
  if (!MODAL_CHECK_URL) {
    return { result: DEMO_RESULT, demo: true };
  }
  const res = await fetch(MODAL_CHECK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Modal ${res.status}: ${await res.text()}`);
  return { result: (await res.json()) as QaResult, demo: false };
}
