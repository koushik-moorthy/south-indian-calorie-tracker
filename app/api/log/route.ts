import { NextResponse } from "next/server";
import { getUserClient, LOG_TABLE } from "@/lib/supabase";
import { isoFromAddedAt } from "@/lib/dates";
import type { LogEntry, Nutrition } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LogRow {
  id: string;
  food_name: string;
  calories: number;
  nutrition: Nutrition | null;
  created_at: string;
}

const EMPTY_NUTRITION: Nutrition = {
  protein_g: null,
  carbs_g: null,
  fat_g: null,
  fiber_g: null,
  sugar_g: null,
};

function rowToEntry(row: LogRow): LogEntry {
  return {
    id: row.id,
    foodName: row.food_name,
    calories: row.calories,
    nutrition: row.nutrition ?? { ...EMPTY_NUTRITION },
    addedAt: new Date(row.created_at).getTime(),
  };
}

const DB_ERROR = "Could not reach the database. Please try again.";

// List the signed-in user's log entries (oldest first).
export async function GET(request: Request) {
  const auth = await getUserClient(request);
  if (!auth) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  try {
    const { data, error } = await auth.supabase
      .from(LOG_TABLE)
      .select("id, food_name, calories, nutrition, created_at")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return NextResponse.json((data as LogRow[]).map(rowToEntry));
  } catch (err) {
    console.error("log GET error:", err);
    return NextResponse.json({ error: DB_ERROR }, { status: 502 });
  }
}

// Add an entry for the signed-in user.
export async function POST(request: Request) {
  const auth = await getUserClient(request);
  if (!auth) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: { foodName?: string; calories?: number; nutrition?: Nutrition; addedAt?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const foodName = String(body.foodName ?? "").trim();
  if (!foodName) {
    return NextResponse.json({ error: "Missing food name." }, { status: 400 });
  }

  try {
    const createdAt = isoFromAddedAt(body.addedAt);
    const row: Record<string, unknown> = {
      user_id: auth.user.id,
      food_name: foodName,
      calories: Math.max(0, Math.round(Number(body.calories) || 0)),
      nutrition: body.nutrition ?? null,
    };
    if (createdAt) row.created_at = createdAt;

    const { data, error } = await auth.supabase
      .from(LOG_TABLE)
      .insert(row)
      .select("id, food_name, calories, nutrition, created_at")
      .single();
    if (error) throw error;
    return NextResponse.json(rowToEntry(data as LogRow));
  } catch (err) {
    console.error("log POST error:", err);
    return NextResponse.json({ error: DB_ERROR }, { status: 502 });
  }
}

// Update an existing entry's name, calories, and/or macros.
export async function PATCH(request: Request) {
  const auth = await getUserClient(request);
  if (!auth) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: { id?: string; foodName?: string; calories?: number; nutrition?: Nutrition | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "Missing entry id." }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (body.foodName !== undefined) {
    const name = String(body.foodName).trim();
    if (!name) return NextResponse.json({ error: "Food name can't be empty." }, { status: 400 });
    update.food_name = name;
  }
  if (body.calories !== undefined) {
    update.calories = Math.max(0, Math.round(Number(body.calories) || 0));
  }
  if (body.nutrition !== undefined) {
    update.nutrition = body.nutrition; // object or null
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  try {
    const { data, error } = await auth.supabase
      .from(LOG_TABLE)
      .update(update)
      .eq("user_id", auth.user.id)
      .eq("id", id)
      .select("id, food_name, calories, nutrition, created_at")
      .single();
    if (error) throw error;
    return NextResponse.json(rowToEntry(data as LogRow));
  } catch (err) {
    console.error("log PATCH error:", err);
    return NextResponse.json({ error: DB_ERROR }, { status: 502 });
  }
}

// Delete one entry (?id=...) or clear all of the user's entries.
export async function DELETE(request: Request) {
  const auth = await getUserClient(request);
  if (!auth) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  try {
    let query = auth.supabase.from(LOG_TABLE).delete().eq("user_id", auth.user.id);
    if (id) query = query.eq("id", id);
    const { error } = await query;
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("log DELETE error:", err);
    return NextResponse.json({ error: DB_ERROR }, { status: 502 });
  }
}
