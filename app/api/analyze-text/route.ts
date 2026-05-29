import { NextResponse } from "next/server";
import { getUserClient } from "@/lib/supabase";
import { getUserOpenAI, NoApiKeyError } from "@/lib/userOpenAI";
import { runJsonCompletion, TEXT_SYSTEM_PROMPT, parseAnalysis } from "@/lib/openai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await getUserClient(request);
  if (!auth) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let food: string;
  try {
    const body = await request.json();
    food = String(body?.food ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!food) {
    return NextResponse.json({ error: "Please enter a food name." }, { status: 400 });
  }
  if (food.length > 200) {
    return NextResponse.json(
      { error: "That input is too long. Please shorten it." },
      { status: 400 }
    );
  }

  try {
    const { client, model } = await getUserOpenAI(auth.supabase, auth.user.id);
    const raw = await runJsonCompletion(client, model, [
      { role: "system", content: TEXT_SYSTEM_PROMPT },
      { role: "user", content: food },
    ]);
    return NextResponse.json(parseAnalysis(raw));
  } catch (err) {
    if (err instanceof NoApiKeyError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("analyze-text error:", err);
    const message =
      err instanceof Error ? err.message : "Something went wrong analyzing your food.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
