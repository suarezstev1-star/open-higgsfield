import type { Endpoints, MediaRole, ModelEntry, SettingField } from "./types";

const IMAGE_ASPECT = ["1:1", "4:3", "3:4", "16:9", "9:16"] as const;

type Settings = Record<string, SettingField>;

export const aspect = (values: readonly string[], fallback = "16:9"): SettingField => ({
  type: "enum",
  values,
  default: fallback,
});

export const resolution = (values: readonly string[], fallback: string): SettingField => ({
  type: "enum",
  values,
  default: fallback,
});

export const duration = (min: number, max: number, fallback: number, step?: number): SettingField => ({
  type: "range",
  min,
  max,
  default: fallback,
  ...(step ? { step } : {}),
});

export const audio = (fallback = true): SettingField => ({ type: "boolean", default: fallback });

export function imageModel(
  id: string,
  label: string,
  endpoints: Endpoints,
  settings: Settings = { aspectRatio: aspect(IMAGE_ASPECT, "1:1") },
): ModelEntry {
  return {
    id,
    surface: "image",
    label,
    roles: endpoints.edit ? { reference: 4 } : {},
    settings,
    endpoints,
  };
}

export function videoModel(
  id: string,
  label: string,
  roles: Partial<Record<MediaRole, number>>,
  endpoints: Endpoints,
  settings: Settings,
): ModelEntry {
  return { id, surface: "video", label, roles, settings, endpoints };
}
