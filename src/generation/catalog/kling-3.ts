import type { ModelEntry } from "./types";

const klingTurboSettings = {
  aspectRatio: { type: "enum", values: ["16:9", "9:16", "1:1"], default: "16:9" },
  duration: { type: "range", min: 3, max: 15, default: 5 },
} as const satisfies ModelEntry["settings"];

const kling3Settings = {
  aspectRatio: { type: "enum", values: ["16:9", "9:16", "1:1"], default: "16:9" },
  duration: { type: "range", min: 3, max: 15, default: 5 },
  generateAudio: { type: "boolean", default: true },
  cfgScale: { type: "range", min: 0, max: 1, default: 0.5, step: 0.01 },
} as const satisfies ModelEntry["settings"];

const klingMotionSettings = {
  keepOriginalSound: { type: "boolean", default: true },
  characterOrientation: { type: "enum", values: ["video", "image"], default: "video" },
} as const satisfies ModelEntry["settings"];

export const kling3Turbo: ModelEntry = {
  id: "kling-3-turbo",
  surface: "video",
  label: "Kling 3.0 Turbo",
  roles: { start: 1 },
  settings: klingTurboSettings,
  endpoints: {
    text: "fal-ai/kling-video/v3/turbo/pro/text-to-video",
    image: "fal-ai/kling-video/v3/turbo/pro/image-to-video",
  },
};

export const kling3Std: ModelEntry = {
  id: "kling-3-std",
  surface: "video",
  label: "Kling 3.0 Standard",
  roles: { start: 1, end: 1 },
  settings: kling3Settings,
  endpoints: {
    text: "fal-ai/kling-video/v3/standard/text-to-video",
    image: "fal-ai/kling-video/v3/standard/image-to-video",
  },
};

export const kling3Pro: ModelEntry = {
  id: "kling-3-pro",
  surface: "video",
  label: "Kling 3.0 Pro",
  roles: { start: 1, end: 1 },
  settings: kling3Settings,
  endpoints: {
    text: "fal-ai/kling-video/v3/pro/text-to-video",
    image: "fal-ai/kling-video/v3/pro/image-to-video",
  },
};

export const kling34k: ModelEntry = {
  id: "kling-3-4k",
  surface: "video",
  label: "Kling 3.0 4K",
  roles: { start: 1, end: 1 },
  settings: kling3Settings,
  endpoints: {
    text: "fal-ai/kling-video/v3/4k/text-to-video",
    image: "fal-ai/kling-video/v3/4k/image-to-video",
  },
};

export const kling3MotionStd: ModelEntry = {
  id: "kling-3-motion-std",
  surface: "video",
  label: "Kling 3.0 Motion Control",
  roles: { start: 1, video: 1 },
  settings: klingMotionSettings,
  endpoints: { motion: "fal-ai/kling-video/v3/standard/motion-control" },
};

export const kling3MotionPro: ModelEntry = {
  id: "kling-3-motion-pro",
  surface: "video",
  label: "Kling 3.0 Motion Control Pro",
  roles: { start: 1, video: 1 },
  settings: klingMotionSettings,
  endpoints: { motion: "fal-ai/kling-video/v3/pro/motion-control" },
};