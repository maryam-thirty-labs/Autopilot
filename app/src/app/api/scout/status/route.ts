import { getScoutTask, isManusConfigured } from "@/lib/integrations/manus";

// Phase 7 — poll a Manus scouting task. ?id=<task_id>
export async function GET(request: Request) {
  if (!isManusConfigured) return Response.json({ configured: false });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  try {
    const state = await getScoutTask(id);
    return Response.json({ configured: true, ...state });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Manus error" }, { status: 502 });
  }
}
