/** Health math: BMI and the projected weight trajectory for the plan chart. */

export type BmiCategory = "Underweight" | "Normal" | "Overweight" | "Obese";

/** Body Mass Index = weight(kg) / height(m)^2, to one decimal. 0 if height invalid. */
export function bmi(weightKg: number, heightCm: number): number {
  if (!(heightCm > 0) || !(weightKg > 0)) return 0;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

/** WHO BMI categories (lower bound inclusive). */
export function bmiCategory(value: number): BmiCategory {
  if (value < 18.5) return "Underweight";
  if (value < 25) return "Normal";
  if (value < 30) return "Overweight";
  return "Obese";
}

/** Whole days from date key `a` to date key `b` (both "YYYY-MM-DD"). */
function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const aUtc = Date.UTC(ay, am - 1, ad);
  const bUtc = Date.UTC(by, bm - 1, bd);
  return Math.round((bUtc - aUtc) / 86_400_000);
}

/**
 * The planned weight on a given day, assuming linear progress from
 * `startKg` on `startKey` to `goalKg` on `targetKey`. Clamped to the start
 * weight before the plan begins and the goal weight after it ends.
 */
export function expectedWeight(
  startKg: number,
  goalKg: number,
  startKey: string,
  targetKey: string,
  onKey: string
): number {
  const span = daysBetween(startKey, targetKey);
  if (span <= 0) return goalKg;

  const elapsed = daysBetween(startKey, onKey);
  const fraction = Math.min(1, Math.max(0, elapsed / span));
  const weight = startKg + (goalKg - startKg) * fraction;
  return Math.round(weight * 10) / 10;
}
