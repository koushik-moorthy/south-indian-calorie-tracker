import { NextResponse } from "next/server";
import { getUserClient, SETTINGS_TABLE } from "@/lib/supabase";
import { encryptSecret } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_MODEL = "gpt-4o-mini";

// Return the user's model + whether a key is saved. Never returns the raw key.
export async function GET(request: Request) {
  const auth = await getUserClient(request);
  if (!auth) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  try {
    const { data, error } = await auth.supabase
      .from(SETTINGS_TABLE)
      .select("openai_key_cipher, model, daily_calorie_goal, plan, fasting")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({
      hasKey: Boolean(data?.openai_key_cipher),
      model: data?.model || DEFAULT_MODEL,
      dailyGoal: data?.daily_calorie_goal ?? null,
      plan: data?.plan ?? null,
      fasting: data?.fasting ?? null,
    });
  } catch (err) {
    console.error("settings GET error:", err);
    return NextResponse.json({ error: "Could not load settings." }, { status: 502 });
  }
}

// Save model and (optionally) a new API key. The key is encrypted server-side
// before storage; an empty string clears it; omitting it leaves it unchanged.
export async function POST(request: Request) {
  const auth = await getUserClient(request);
  if (!auth) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: {
    apiKey?: string;
    model?: string;
    dailyGoal?: number | null;
    plan?: unknown;
    fasting?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Only update the fields that were provided, so e.g. saving the goal alone
  // doesn't reset the model or key.
  const payload: Record<string, unknown> = {
    user_id: auth.user.id,
    updated_at: new Date().toISOString(),
  };

  if (body.model !== undefined) {
    payload.model = body.model.trim() || DEFAULT_MODEL;
  }

  if (body.apiKey !== undefined) {
    const trimmed = body.apiKey.trim();
    payload.openai_key_cipher = trimmed ? encryptSecret(trimmed) : null;
  }

  if (body.dailyGoal !== undefined) {
    const goal = body.dailyGoal;
    payload.daily_calorie_goal =
      goal === null || !Number.isFinite(goal) || goal <= 0
        ? null
        : Math.round(goal);
  }

  if (body.plan !== undefined) {
    payload.plan = body.plan; // stored as JSONB; null clears it
  }

  if (body.fasting !== undefined) {
    payload.fasting = body.fasting; // stored as JSONB; null clears it
  }

  try {
    const { error } = await auth.supabase
      .from(SETTINGS_TABLE)
      .upsert(payload, { onConflict: "user_id" });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("settings POST error:", err);
    return NextResponse.json({ error: "Could not save settings." }, { status: 502 });
  }
}
