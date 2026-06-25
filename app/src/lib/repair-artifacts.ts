import { promises as fs } from "fs";
import path from "path";

export interface RepairArtifacts {
  before: string;
  after: string;
  beforeLabel: string;
  afterLabel: string;
}

// The broken sample app lives at the repo root, next to the Next app.
const SAMPLE_ROOT = path.join(process.cwd(), "..", "sample-app");

/**
 * Genuine before/after for the repair view — read straight from the broken
 * sample app and the Cursor-generated patch, so the diff on screen is the real
 * artifact, not a hardcoded string. Returns null if the files aren't present
 * (e.g. a deploy that didn't bundle sample-app); the ticket page then falls
 * back to the repair plan's stored patch_diff.
 */
export async function getRepairArtifacts(ref: string): Promise<RepairArtifacts | null> {
  if (ref !== "T-102") return null;
  try {
    const [before, after] = await Promise.all([
      fs.readFile(path.join(SAMPLE_ROOT, "supabase", "schema.sql"), "utf8"),
      fs.readFile(path.join(SAMPLE_ROOT, "supabase", "patch.sql"), "utf8"),
    ]);
    return {
      before,
      after,
      beforeLabel: "sample-app/supabase/schema.sql — broken",
      afterLabel: "sample-app/supabase/patch.sql — generated in Cursor",
    };
  } catch {
    return null;
  }
}
