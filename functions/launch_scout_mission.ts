// functions/launch_scout_mission.ts
// Security-first Edge Function template that validates ownership before launching scout missions.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
}

const db = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

type LaunchScoutPayload = {
  settlementId: string;
  shipIds: string[];
  targetTileId: string;
};

type ErrorResponse = {
  error: string;
  detail?: string;
};

const respondJSON = (body: Record<string, unknown>, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const respondError = (status: number, error: string, detail?: string) =>
  respondJSON({ error, detail } as ErrorResponse, status);

async function extractPlayerId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const authClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

async function assertSettlementOwnership(playerId: string, settlementId: string) {
  const { data, error } = await db
    .from("settlements")
    .select("id, player_id")
    .eq("id", settlementId)
    .single();

  if (error || !data) {
    throw respondError(404, "settlement_not_found", "Settlement does not exist");
  }
  if (data.player_id !== playerId) {
    throw respondError(403, "forbidden", "You do not own this settlement");
  }
}

async function loadShips(settlementId: string, shipIds: string[]) {
  const { data, error } = await db
    .from("ships")
    .select("id, status, settlement_id")
    .in("id", shipIds);

  if (error) {
    throw respondError(500, "ship_query_failed", error.message);
  }
  if (!data || data.length !== shipIds.length) {
    throw respondError(400, "invalid_ship_selection", "One or more ships do not exist");
  }
  for (const ship of data) {
    if (ship.settlement_id !== settlementId) {
      throw respondError(403, "ship_foreign", `Ship ${ship.id} belongs to another settlement`);
    }
    if (ship.status !== "stationed") {
      throw respondError(400, "ship_unavailable", `Ship ${ship.id} is currently ${ship.status}`);
    }
  }
  return data;
}

async function createScoutConvoy(
  playerId: string,
  payload: LaunchScoutPayload,
) {
  const { data, error } = await db
    .from("convoys")
    .insert({
      player_id: playerId,
      origin_settlement_id: payload.settlementId,
      target_tile_id: payload.targetTileId,
      ship_ids: payload.shipIds,
      mission_type: "espionage",
      status: "preparing",
      preparation_ends_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    throw respondError(500, "convoy_creation_failed", error.message);
  }
  return data;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return respondError(405, "method_not_allowed");
  }

  const playerId = await extractPlayerId(req);
  if (!playerId) {
    return respondError(401, "unauthorized", "Missing or invalid auth token");
  }

  let payload: LaunchScoutPayload;
  try {
    payload = await req.json();
  } catch {
    return respondError(400, "invalid_json");
  }

  if (!payload.settlementId || !payload.targetTileId || !payload.shipIds?.length) {
    return respondError(400, "missing_fields", "settlementId, targetTileId and shipIds are required");
  }

  try {
    await assertSettlementOwnership(playerId, payload.settlementId);
    await loadShips(payload.settlementId, payload.shipIds);
    const convoy = await createScoutConvoy(playerId, payload);
    return respondJSON({ convoy }, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("launch_scout_mission failure", err);
    return respondError(500, "unexpected_error");
  }
});

