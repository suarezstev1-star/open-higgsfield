import { aspect, duration, videoModel } from "./defaults";

export const kling25 = videoModel(
  "kling-2.5",
  "Kling 2.5 Turbo",
  { start: 1, end: 1 },
  {
    text: "fal-ai/kling-video/v2.5-turbo/pro/text-to-video",
    image: "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
  },
  {
    aspectRatio: aspect(["16:9", "9:16", "1:1"]),
    duration: duration(5, 10, 5, 5),
  },
);
