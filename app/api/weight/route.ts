import { NextResponse } from "next/server";
import { getUserClient, WEIGHT_TABLE } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface WeightRow {
  id: string;
  weight_kg: number | string;
  recorded_on: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DB_ERROR = "Could not reach the database. Please try again.";

function rowToEntry(row: WeightRow) {
  return {
    id: row.id,
    weightKg: Number(row.weight_kg),
    recordedOn: row.recorded_on,
  };
}

// List the signed-in user's weight check-ins (oldest first).
export async function GET(request: Request) {
  const auth = await getUserClient(request);
  if (!auth) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  try {
    const { data, error } = await auth.supabase
      .from(WEIGHT_TABLE)
      .select("id, weight_kg, recorded_on")
      .eq("user_id", auth.user.id)
      .order("recorded_on", { ascending: true });
    if (error) throw error;
    return NextResponse.json((data as WeightRow[]).map(rowToEntry));
  } catch (err) {
    console.error("weight GET error:", err);
    return NextResponse.json({ error: DB_ERROR }, { status: 502 });
  }
}

// Record (or overwrite) a day's weight. One check-in per day via upsert.
export async function POST(request: Request) {
  const auth = await getUserClient(request);
  if (!auth) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: { weightKg?: number; recordedOn?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const weight = Number(body.weightKg);
  if (!Number.isFinite(weight) || weight < 25 || weight > 400) {
    return NextResponse.json(
      { error: "Enter a weight between 25 and 400 kg." },
      { status: 400 }
    );
  }
  const today = new Date().toISOString().slice(0, 10);
  const recordedOn =
    body.recordedOn && DATE_RE.test(body.recordedOn) ? body.recordedOn : today;

  try {
    const { data, error } = await auth.supabase
      .from(WEIGHT_TABLE)
      .upsert(
        {
          user_id: auth.user.id,
          weight_kg: Math.round(weight * 100) / 100,
          recorded_on: recordedOn,
        },
        { onConflict: "user_id,recorded_on" }
      )
      .select("id, weight_kg, recorded_on")
      .single();
    if (error) throw error;
    return NextResponse.json(rowToEntry(data as WeightRow));
  } catch (err) {
    console.error("weight POST error:", err);
    return NextResponse.json({ error: DB_ERROR }, { status: 502 });
  }
}

// Delete one check-in by id.
export async function DELETE(request: Request) {
  const auth = await getUserClient(request);
  if (!auth) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  try {
    const { error } = await auth.supabase
      .from(WEIGHT_TABLE)
      .delete()
      .eq("user_id", auth.user.id)
      .eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("weight DELETE error:", err);
    return NextResponse.json({ error: DB_ERROR }, { status: 502 });
  }
}
