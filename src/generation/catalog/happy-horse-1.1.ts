import { aspect, duration, resolution, videoModel } from "./defaults";

export const happyHorse11 = videoModel(
  "happy-horse-1.1",
  "Happy Horse 1.1",
  { start: 1 },
  {
    text: "alibaba/happy-horse/v1.1/text-to-video",
    image: "alibaba/happy-horse/v1.1/image-to-video",
  },
  {
    aspectRatio: aspect(["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"]),
    resolution: resolution(["720p", "1080p"], "720p"),
    duration: duration(3, 15, 5),
  },
);
