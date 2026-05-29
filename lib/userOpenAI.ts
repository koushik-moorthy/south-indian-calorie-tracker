import type { SupabaseClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { SETTINGS_TABLE } from "./supabase";
import { decryptSecret } from "./crypto";
import { getOpenAIClient, resolveModel } from "./openai";

export class NoApiKeyError extends Error {
  constructor() {
    super("Add your OpenAI API key in Settings to analyze foods.");
    this.name = "NoApiKeyError";
  }
}

/**
 * Load the signed-in user's stored model and decrypt their OpenAI key
 * (server-side only), returning a ready OpenAI client. The decrypted key
 * never leaves the server.
 */
export async function getUserOpenAI(
  supabase: SupabaseClient,
  userId: string
): Promise<{ client: OpenAI; model: string }> {
  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select("openai_key_cipher, model")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.openai_key_cipher) throw new NoApiKeyError();

  const apiKey = decryptSecret(data.openai_key_cipher);
  return { client: getOpenAIClient(apiKey), model: resolveModel(data.model) };
}
