import { NextResponse } from "next/server";
import { getUserClient } from "@/lib/supabase";
import { getUserOpenAI, NoApiKeyError } from "@/lib/userOpenAI";
import { runJsonCompletion, IMAGE_SYSTEM_PROMPT, parseAnalysis } from "@/lib/openai";
import { sniffImageMime } from "@/lib/imageType";

export const runtime = "nodejs";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  const auth = await getUserClient(request);
  if (!auth) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let file: File | null = null;
  let note = "";
  try {
    const form = await request.formData();
    const value = form.get("image");
    if (value instanceof File) file = value;
    note = String(form.get("note") ?? "").trim().slice(0, 300);
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: "Please select an image." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Unsupported image type. Use JPG, PNG, or WEBP." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image is too large. Maximum size is 10 MB." },
      { status: 400 }
    );
  }

  let buffer: Buffer;
  let realType: string | null;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
    // Trust the file's actual bytes, not the client-supplied Content-Type.
    realType = sniffImageMime(buffer.subarray(0, 12));
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  if (!realType || !ALLOWED_TYPES.includes(realType)) {
    return NextResponse.json(
      { error: "That file is not a valid JPG, PNG, or WEBP image." },
      { status: 400 }
    );
  }

  try {
    const dataUrl = `data:${realType};base64,${buffer.toString("base64")}`;

    const { client, model } = await getUserOpenAI(auth.supabase, auth.user.id);
    const raw = await runJsonCompletion(client, model, [
      { role: "system", content: IMAGE_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: note
              ? `Analyze this food image. The user adds this context: "${note}". Use it to refine your estimate, but rely on what you actually see.`
              : "Analyze this food image.",
          },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ]);
    return NextResponse.json(parseAnalysis(raw));
  } catch (err) {
    if (err instanceof NoApiKeyError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("analyze-image error:", err);
    const message =
      err instanceof Error ? err.message : "Something went wrong analyzing your image.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
