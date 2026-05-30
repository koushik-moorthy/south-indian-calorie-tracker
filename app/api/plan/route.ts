import { NextResponse } from "next/server";
import { getUserClient } from "@/lib/supabase";
import { getUserOpenAI, NoApiKeyError } from "@/lib/userOpenAI";
import { runJsonCompletion, PLAN_SYSTEM_PROMPT } from "@/lib/openai";
import { parsePlan, type ActivityLevel, type Sex } from "@/lib/plan";

export const runtime = "nodejs";

const ACTIVITY_LEVELS: ActivityLevel[] = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
];

interface ProfileInput {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  bodyFatPct: number | null;
  activityLevel: ActivityLevel;
  goalWeightKg: number;
  targetDate: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Validate the profile; returns an error message or null if valid. */
function validate(p: ProfileInput): string | null {
  if (!Number.isFinite(p.age) || p.age < 13 || p.age > 100)
    return "Age must be between 13 and 100.";
  if (p.sex !== "male" && p.sex !== "female") return "Please select a sex.";
  if (!Number.isFinite(p.heightCm) || p.heightCm < 80 || p.heightCm > 250)
    return "Height must be between 80 and 250 cm.";
  if (!Number.isFinite(p.weightKg) || p.weightKg < 25 || p.weightKg > 400)
    return "Weight must be between 25 and 400 kg.";
  if (
    p.bodyFatPct !== null &&
    (!Number.isFinite(p.bodyFatPct) || p.bodyFatPct < 3 || p.bodyFatPct > 60)
  )
    return "Body fat % must be between 3 and 60, or left blank.";
  if (!ACTIVITY_LEVELS.includes(p.activityLevel))
    return "Please select an activity level.";
  if (!Number.isFinite(p.goalWeightKg) || p.goalWeightKg < 25 || p.goalWeightKg > 400)
    return "Goal weight must be between 25 and 400 kg.";
  if (!DATE_RE.test(p.targetDate)) return "Please choose a valid target date.";

  const today = new Date().toISOString().slice(0, 10);
  if (p.targetDate <= today) return "Target date must be in the future.";
  return null;
}

function readProfile(body: unknown): ProfileInput {
  const b = (body ?? {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" ? v : parseFloat(String(v)));
  const bodyFat = b.bodyFatPct;
  return {
    age: num(b.age),
    sex: b.sex as Sex,
    heightCm: num(b.heightCm),
    weightKg: num(b.weightKg),
    bodyFatPct:
      bodyFat === null || bodyFat === undefined || bodyFat === "" ? null : num(bodyFat),
    activityLevel: b.activityLevel as ActivityLevel,
    goalWeightKg: num(b.goalWeightKg),
    targetDate: String(b.targetDate ?? ""),
  };
}

export async function POST(request: Request) {
  const auth = await getUserClient(request);
  if (!auth) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let profile: ProfileInput;
  try {
    profile = readProfile(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const invalid = validate(profile);
  if (invalid) {
    return NextResponse.json({ error: invalid }, { status: 400 });
  }

  const calorieFloor = profile.sex === "female" ? 1200 : 1500;
  const today = new Date().toISOString().slice(0, 10);

  const userContent = [
    `Today is ${today}.`,
    `Age: ${profile.age}`,
    `Sex: ${profile.sex}`,
    `Height: ${profile.heightCm} cm`,
    `Current weight: ${profile.weightKg} kg`,
    profile.bodyFatPct != null ? `Body fat: ${profile.bodyFatPct}%` : "Body fat: unknown",
    `Activity level: ${profile.activityLevel}`,
    `Goal weight: ${profile.goalWeightKg} kg`,
    `Target date: ${profile.targetDate}`,
  ].join("\n");

  try {
    const { client, model } = await getUserOpenAI(auth.supabase, auth.user.id);
    const raw = await runJsonCompletion(client, model, [
      { role: "system", content: PLAN_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ]);
    return NextResponse.json(parsePlan(raw, { calorieFloor }));
  } catch (err) {
    if (err instanceof NoApiKeyError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("plan error:", err);
    const message =
      err instanceof Error ? err.message : "Something went wrong building your plan.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
