import { aspect, duration, resolution, videoModel } from "./defaults";

export const wan3 = videoModel(
  "wan-3",
  "Wan 3.0",
  { start: 1 },
  {
    text: "alibaba/wan-3.0/text-to-video",
    image: "alibaba/wan-3.0/image-to-video",
  },
  {
    aspectRatio: aspect(["16:9", "9:16", "1:1", "4:3", "3:4"]),
    resolution: resolution(["480p", "720p", "1080p"], "720p"),
    duration: duration(2, 30, 5),
  },
);
