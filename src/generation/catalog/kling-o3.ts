import { aspect, audio, duration, videoModel } from "./defaults";

export const klingO3 = videoModel(
  "kling-o3",
  "Kling O3",
  { start: 1, end: 1, reference: 4 },
  {
    text: "fal-ai/kling-video/o3/standard/text-to-video",
    image: "fal-ai/kling-video/o3/standard/image-to-video",
    reference: "fal-ai/kling-video/o3/standard/reference-to-video",
  },
  {
    aspectRatio: aspect(["16:9", "9:16", "1:1"]),
    duration: duration(3, 15, 5),
    generateAudio: audio(),
  },
);
