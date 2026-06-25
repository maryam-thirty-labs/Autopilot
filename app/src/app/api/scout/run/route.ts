import { createScoutTask, isManusConfigured } from "@/lib/integrations/manus";

// Phase 7 — kick off a real Manus scouting run. Returns the task ref immediately;
// the client polls /api/scout/status. Falls back to {configured:false} so the UI
// can stay on the seeded replay when Manus isn't connected.
export async function POST() {
  if (!isManusConfigured) {
    return Response.json({ configured: false });
  }
  try {
    const task = await createScoutTask();
    return Response.json({ configured: true, ...task });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Manus error" }, { status: 502 });
  }
}
