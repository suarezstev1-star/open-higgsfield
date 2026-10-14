import { aspect, duration, resolution, videoModel } from "./defaults";

export const wan27 = videoModel(
  "wan-2.7",
  "Wan 2.7",
  { start: 1 },
  {
    text: "fal-ai/wan/v2.7/text-to-video",
    image: "fal-ai/wan/v2.7/image-to-video",
  },
  {
    aspectRatio: aspect(["16:9", "9:16", "1:1", "4:3", "3:4"]),
    resolution: resolution(["720p", "1080p"], "720p"),
    duration: duration(2, 15, 5),
  },
);
