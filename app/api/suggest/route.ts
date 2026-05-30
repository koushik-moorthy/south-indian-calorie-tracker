import { NextResponse } from "next/server";
import { getUserClient } from "@/lib/supabase";
import { getUserOpenAI, NoApiKeyError } from "@/lib/userOpenAI";
import { runJsonCompletion, SUGGEST_SYSTEM_PROMPT } from "@/lib/openai";
import { parseSuggestions, type SuggestionInput } from "@/lib/suggest";
import { NUTRIENT_FIELDS } from "@/lib/nutrition";

export const runtime = "nodejs";

function macroLines(input: SuggestionInput): string[] {
  if (!input.macroTargets) return ["No macro targets set."];
  const lines: string[] = [];
  for (const f of NUTRIENT_FIELDS) {
    const target = input.macroTargets[f.key as keyof typeof input.macroTargets];
    const eaten = input.consumedMacros?.[f.key] ?? 0;
    const remaining = Math.max(0, Math.round((target as number) - eaten));
    lines.push(`${f.label}: ${eaten}g eaten of ${target}g target (${remaining}g left)`);
  }
  return lines;
}

function buildUserContent(input: SuggestionInput): string {
  const target = input.dailyTarget;
  const remainingCal = target != null ? Math.round(target - input.consumedCalories) : null;
  const lines = [
    target != null
      ? `Daily calorie target: ${target} kcal`
      : "No daily calorie target set.",
    `Eaten so far today: ${input.consumedCalories} kcal`,
    remainingCal != null ? `Remaining today: ${remainingCal} kcal` : "",
    "Macros:",
    ...macroLines(input),
  ].filter(Boolean);
  return lines.join("\n");
}

export async function POST(request: Request) {
  const auth = await getUserClient(request);
  if (!auth) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let input: SuggestionInput;
  try {
    input = (await request.json()) as SuggestionInput;
    if (!input || typeof input !== "object") throw new Error("bad input");
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const { client, model } = await getUserOpenAI(auth.supabase, auth.user.id);
    const raw = await runJsonCompletion(client, model, [
      { role: "system", content: SUGGEST_SYSTEM_PROMPT },
      { role: "user", content: buildUserContent(input) },
    ]);
    return NextResponse.json(parseSuggestions(raw));
  } catch (err) {
    if (err instanceof NoApiKeyError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("suggest error:", err);
    const message =
      err instanceof Error ? err.message : "Something went wrong generating suggestions.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
