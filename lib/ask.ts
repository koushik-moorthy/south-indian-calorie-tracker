export interface AskResult {
  answer: string;
}

/** Normalize the model's free-form answer JSON ({ answer }). */
export function parseAnswer(raw: string): AskResult {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("The model returned an invalid answer. Please try again.");
  }
  return { answer: String(data.answer ?? "").trim() };
}
