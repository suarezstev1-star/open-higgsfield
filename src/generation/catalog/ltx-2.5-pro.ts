import { aspect, audio, duration, resolution, videoModel } from "./defaults";

export const ltx25Pro = videoModel(
  "ltx-2.5-pro",
  "LTX 2.5 Pro",
  { start: 1, end: 1 },
  {
    text: "lightricks/ltx-2.5/text-to-video/pro",
    image: "lightricks/ltx-2.5/image-to-video/pro",
  },
  {
    aspectRatio: aspect(["16:9", "9:16"]),
    resolution: resolution(["720p", "1080p"], "1080p"),
    duration: duration(6, 10, 6, 2),
    generateAudio: audio(),
  },
);
