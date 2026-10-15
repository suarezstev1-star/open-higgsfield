import { aspect, duration, resolution, videoModel } from "./defaults";

export const wan26 = videoModel(
  "wan-2.6",
  "Wan 2.6",
  { start: 1 },
  {
    text: "wan/v2.6/text-to-video",
    image: "wan/v2.6/image-to-video",
  },
  {
    aspectRatio: aspect(["16:9", "9:16", "1:1", "4:3", "3:4"]),
    resolution: resolution(["720p", "1080p"], "720p"),
    duration: duration(5, 15, 5, 5),
  },
);
