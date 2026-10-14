import { aspect, audio, duration, videoModel } from "./defaults";

export const kling26 = videoModel(
  "kling-2.6",
  "Kling 2.6 Pro",
  { start: 1 },
  {
    text: "fal-ai/kling-video/v2.6/pro/text-to-video",
    image: "fal-ai/kling-video/v2.6/pro/image-to-video",
  },
  {
    aspectRatio: aspect(["16:9", "9:16", "1:1"]),
    duration: duration(5, 10, 5, 5),
    generateAudio: audio(),
  },
);
