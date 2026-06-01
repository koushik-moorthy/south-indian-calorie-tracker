import { NextResponse } from "next/server";
import { getUserClient } from "@/lib/supabase";
import { rateLimit } from "@/lib/rateLimit";
import { getUserOpenAI, NoApiKeyError } from "@/lib/userOpenAI";
import { runJsonCompletion, ASK_SYSTEM_PROMPT } from "@/lib/openai";
import { parseAnswer } from "@/lib/ask";
import type { SuggestionInput } from "@/lib/suggest";
import { NUTRIENT_FIELDS } from "@/lib/nutrition";

export const runtime = "nodejs";

function contextLines(ctx: SuggestionInput | undefined): string[] {
  if (!ctx) return ["No tracking context available."];
  const target = ctx.dailyTarget;
  const remainingCal = target != null ? Math.round(target - ctx.consumedCalories) : null;
  const lines = [
    target != null ? `Daily calorie target: ${target} kcal` : "No daily calorie target set.",
    `Eaten so far today: ${ctx.consumedCalories} kcal`,
    remainingCal != null ? `Remaining today: ${remainingCal} kcal` : "",
  ].filter(Boolean);

  if (ctx.macroTargets) {
    const macros = NUTRIENT_FIELDS.map((f) => {
      const target_ = ctx.macroTargets![f.key as keyof typeof ctx.macroTargets];
      const eaten = ctx.consumedMacros?.[f.key] ?? 0;
      const remaining = Math.max(0, Math.round((target_ as number) - eaten));
      return `${f.label} ${eaten}/${target_}g (${remaining}g left)`;
    });
    lines.push(`Macros today: ${macros.join(", ")}.`);
  }
  return lines;
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

  let question = "";
  let context: SuggestionInput | undefined;
  try {
    const body = (await request.json()) as { question?: string; context?: SuggestionInput };
    question = String(body?.question ?? "").trim().slice(0, 500);
    context = body?.context;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!question) {
    return NextResponse.json({ error: "Please type a question." }, { status: 400 });
  }

  const userContent = [
    "My current status:",
    ...contextLines(context),
    "",
    `My question: ${question}`,
  ].join("\n");

  try {
    const { client, model } = await getUserOpenAI(auth.supabase, auth.user.id);
    const raw = await runJsonCompletion(client, model, [
      { role: "system", content: ASK_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ]);
    return NextResponse.json(parseAnswer(raw));
  } catch (err) {
    if (err instanceof NoApiKeyError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("ask error:", err);
    // Do not leak upstream/internal error detail to the client (logged above).
    const message = "Something went wrong answering your question.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
