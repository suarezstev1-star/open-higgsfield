import type { ModelEntry } from "./types";
import { SEEDANCE_ASPECT } from "./tokens";

export const seedance25: ModelEntry = {
  id: "seedance-2.5",
  surface: "video",
  label: "Seedance 2.5",
  roles: { start: 1, end: 1, reference: 30, video: 10, audio: 10 },
  settings: {
    aspectRatio: { type: "enum", values: SEEDANCE_ASPECT, default: "16:9" },
    duration: { type: "range", min: 4, max: 30, default: 5 },
    resolution: { type: "enum", values: ["480p", "720p", "1080p"], default: "720p" },
    generateAudio: { type: "boolean", default: true },
  },
  endpoints: {
    text: "bytedance/seedance-2.5/text-to-video",
    image: "bytedance/seedance-2.5/image-to-video",
    reference: "bytedance/seedance-2.5/reference-to-video",
  },
};
