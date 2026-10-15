import { aspect, duration, resolution, videoModel } from "./defaults";

export const pixverse6 = videoModel(
  "pixverse-6",
  "PixVerse 6",
  { start: 1 },
  {
    text: "fal-ai/pixverse/v6/text-to-video",
    image: "fal-ai/pixverse/v6/image-to-video",
  },
  {
    aspectRatio: aspect(["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"]),
    resolution: resolution(["360p", "540p", "720p", "1080p"], "720p"),
    duration: duration(1, 15, 5),
  },
);
