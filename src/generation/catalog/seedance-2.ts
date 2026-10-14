import type { ModelEntry } from "./types";
import { SEEDANCE_ASPECT } from "./tokens";

const seedanceRoles = { start: 1, end: 1, reference: 9, video: 3, audio: 3 } as const;

const seedanceSettings = {
  aspectRatio: { type: "enum", values: SEEDANCE_ASPECT, default: "16:9" },
  duration: { type: "range", min: 4, max: 15, default: 5 },
  generateAudio: { type: "boolean", default: true },
} as const satisfies ModelEntry["settings"];

export const seedance2: ModelEntry = {
  id: "seedance-2",
  surface: "video",
  label: "Seedance 2.0",
  roles: seedanceRoles,
  endpoints: {
    text: "bytedance/seedance-2.0/text-to-video",
    image: "bytedance/seedance-2.0/image-to-video",
    reference: "bytedance/seedance-2.0/reference-to-video",
  },
  settings: {
    ...seedanceSettings,
    resolution: { type: "enum", values: ["480p", "720p", "1080p", "4k"], default: "720p" },
  },
};

export const seedance2Fast: ModelEntry = {
  id: "seedance-2-fast",
  surface: "video",
  label: "Seedance 2.0 Fast",
  roles: seedanceRoles,
  endpoints: {
    text: "bytedance/seedance-2.0/fast/text-to-video",
    image: "bytedance/seedance-2.0/fast/image-to-video",
    reference: "bytedance/seedance-2.0/fast/reference-to-video",
  },
  settings: {
    ...seedanceSettings,
    resolution: { type: "enum", values: ["480p", "720p"], default: "720p" },
  },
};

export const seedance2Mini: ModelEntry = {
  id: "seedance-2-mini",
  surface: "video",
  label: "Seedance 2.0 Mini",
  roles: seedanceRoles,
  endpoints: {
    text: "bytedance/seedance-2.0/mini/text-to-video",
    image: "bytedance/seedance-2.0/mini/image-to-video",
    reference: "bytedance/seedance-2.0/mini/reference-to-video",
  },
  settings: {
    ...seedanceSettings,
    resolution: { type: "enum", values: ["480p", "720p"], default: "720p" },
  },
};
