import type { ModelEntry } from "./types";

/** Resolves a model's settings to values its catalog entry allows. Saved values
    outlive catalog changes, so a value that is no longer offered falls back to
    the default and a number is clamped and snapped to the field's step. */
export function parseSettings(
  model: ModelEntry,
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(model.settings)) {
    const value = raw[key];
    if (field.type === "enum") {
      out[key] = typeof value === "string" && field.values.includes(value) ? value : field.default;
      continue;
    }
    if (field.type === "range") {
      const picked = typeof value === "number" && Number.isFinite(value) ? value : field.default;
      const clamped = Math.min(field.max, Math.max(field.min, picked));
      const step = field.step ?? 1;
      const snapped = field.min + Math.round((clamped - field.min) / step) * step;
      out[key] = Number(Math.min(field.max, snapped).toFixed(6));
      continue;
    }
    out[key] = typeof value === "boolean" ? value : field.default;
  }
  return out;
}
