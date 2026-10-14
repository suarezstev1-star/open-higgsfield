import { aspect, duration, videoModel } from "./defaults";

export const klingO1 = videoModel(
  "kling-o1",
  "Kling O1 (Omni)",
  { start: 1, end: 1, reference: 4 },
  {
    image: "fal-ai/kling-video/o1/image-to-video",
    reference: "fal-ai/kling-video/o1/reference-to-video",
  },
  {
    aspectRatio: aspect(["16:9", "9:16", "1:1"]),
    duration: duration(3, 10, 5),
  },
);
