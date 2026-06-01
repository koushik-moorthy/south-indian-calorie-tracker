import { NextResponse } from "next/server";
import { getUserClient } from "@/lib/supabase";
import { rateLimit } from "@/lib/rateLimit";
import { getUserOpenAI, NoApiKeyError } from "@/lib/userOpenAI";
import { runJsonCompletion, PERFORMANCE_SYSTEM_PROMPT } from "@/lib/openai";
import { parsePerformance, type PerformanceInput } from "@/lib/performance";
import { NUTRIENT_FIELDS } from "@/lib/nutrition";

export const runtime = "nodejs";

function n(value: number | null | undefined, unit = ""): string {
  return value == null ? "unknown" : `${value}${unit}`;
}

function macroLine(input: PerformanceInput): string {
  if (!input.macroTargets) return "Macro targets: none set.";
  const parts = NUTRIENT_FIELDS.map((f) => {
    const target = input.macroTargets![f.key as keyof typeof input.macroTargets];
    const today = input.todayMacros?.[f.key];
    return `${f.label} ${today ?? 0}/${target}g`;
  });
  return `Macros today vs target: ${parts.join(", ")}.`;
}

function buildUserContent(input: PerformanceInput): string {
  const lines: string[] = [];

  if (input.hasPlan) {
    lines.push(
      `Plan timeline: ${n(input.daysIntoPlan)} day(s) in, ${n(input.daysToTarget)} day(s) to the target date.`
    );
    lines.push(
      `Weight: start ${n(input.startWeightKg, "kg")}, now ${n(input.currentWeightKg, "kg")} (change ${n(input.changeKg, "kg")}), goal ${n(input.goalWeightKg, "kg")}; ${n(input.pctToGoal, "%")} of the way there.`
    );
    lines.push(
      `Versus plan: ${n(input.vsPlanKg, "kg")} (positive = heavier than planned). Recent measured rate: ${n(input.recentRateKgPerWeek, " kg/week")}.`
    );
    lines.push(`BMI now ${n(input.bmiNow)}, BMI at goal ${n(input.bmiGoal)}.`);
  } else {
    lines.push("No weight-loss/gain plan set yet.");
  }

  lines.push(
    `Calorie target ${n(input.dailyTarget)}, maintenance ${n(input.tdee)}. Today ${input.todayCalories} kcal.`
  );
  lines.push(
    `This week: avg ${input.week.avgCalories} kcal over ${input.week.daysLogged} day(s). This month: avg ${input.month.avgCalories} kcal over ${input.month.daysLogged} day(s).`
  );
  lines.push(macroLine(input));

  const f = input.fasting;
  if (f && f.status !== "none") {
    lines.push(
      f.status === "active"
        ? `Fasting: currently fasting ${f.hours}h (target ${f.targetHours}h).`
        : `Fasting: completed a ${f.hours}h fast today (target ${f.targetHours}h).`
    );
  }

  return lines.join("\n");
}

export async function POST(request: Request) {
  const auth = await getUserClient(request);
  if (!auth) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const rl = rateLimit(`ai:${auth.user.id}`);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let input: PerformanceInput;
  try {
    input = (await request.json()) as PerformanceInput;
    if (!input || typeof input !== "object") throw new Error("bad input");
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const { client, model } = await getUserOpenAI(auth.supabase, auth.user.id);
    const raw = await runJsonCompletion(client, model, [
      { role: "system", content: PERFORMANCE_SYSTEM_PROMPT },
      { role: "user", content: buildUserContent(input) },
    ]);
    return NextResponse.json(parsePerformance(raw));
  } catch (err) {
    if (err instanceof NoApiKeyError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("performance error:", err);
    // Do not leak upstream/internal error detail to the client (logged above).
    const message = "Something went wrong generating your review.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
