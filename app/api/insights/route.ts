import { NextResponse } from "next/server";
import { getUserClient } from "@/lib/supabase";
import { rateLimit } from "@/lib/rateLimit";
import { getUserOpenAI, NoApiKeyError } from "@/lib/userOpenAI";
import { runJsonCompletion, INSIGHTS_SYSTEM_PROMPT } from "@/lib/openai";
import { parseInsights, type InsightsInput } from "@/lib/insights";
import { NUTRIENT_FIELDS } from "@/lib/nutrition";

export const runtime = "nodejs";

function macroLine(macros: InsightsInput["today"]["macros"]): string {
  const parts = NUTRIENT_FIELDS.map((f) => {
    const v = macros?.[f.key];
    return v != null ? `${f.label.toLowerCase()} ${v} g` : null;
  }).filter(Boolean);
  return parts.length ? parts.join(", ") : "not recorded";
}

function buildUserContent(input: InsightsInput): string {
  const t = input.today;
  const lines = [
    `Daily calorie target: ${input.dailyTarget ?? "unknown"}`,
    `Maintenance (TDEE): ${input.tdee ?? "unknown"}`,
    input.goalWeightKg != null
      ? `Goal: reach ${input.goalWeightKg} kg by ${input.targetDate ?? "an unset date"}. Current weight: ${input.currentWeightKg ?? "unknown"} kg.`
      : "No specific weight goal set.",
    `Today: ${t.calories} kcal. Macros — ${macroLine(t.macros)}.`,
    `This week: ${input.week.daysLogged} day(s) logged, average ${input.week.avgCalories} kcal/day.`,
    `This month: ${input.month.daysLogged} day(s) logged, average ${input.month.avgCalories} kcal/day.`,
  ];

  const f = input.fasting;
  if (f && f.status !== "none") {
    lines.push(
      f.status === "active"
        ? `Fasting: currently fasting ${f.hours}h so far (target ${f.targetHours}h).`
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

  let input: InsightsInput;
  try {
    input = (await request.json()) as InsightsInput;
    if (!input || typeof input !== "object" || !input.today) {
      throw new Error("bad input");
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const { client, model } = await getUserOpenAI(auth.supabase, auth.user.id);
    const raw = await runJsonCompletion(client, model, [
      { role: "system", content: INSIGHTS_SYSTEM_PROMPT },
      { role: "user", content: buildUserContent(input) },
    ]);
    return NextResponse.json(parseInsights(raw));
  } catch (err) {
    if (err instanceof NoApiKeyError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("insights error:", err);
    // Do not leak upstream/internal error detail to the client (logged above).
    const message = "Something went wrong generating insights.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
