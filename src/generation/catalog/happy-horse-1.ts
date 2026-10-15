import { aspect, duration, resolution, videoModel } from "./defaults";

export const happyHorse1 = videoModel(
  "happy-horse-1",
  "Happy Horse 1.0",
  { start: 1 },
  {
    text: "alibaba/happy-horse/text-to-video",
    image: "alibaba/happy-horse/image-to-video",
  },
  {
    aspectRatio: aspect(["16:9", "9:16", "1:1", "4:3", "3:4"]),
    resolution: resolution(["720p", "1080p"], "720p"),
    duration: duration(3, 15, 5),
  },
);
