import { aspect, audio, duration, resolution, videoModel } from "./defaults";

export const ltx25Fast = videoModel(
  "ltx-2.5-fast",
  "LTX 2.5 Fast",
  { start: 1, end: 1 },
  {
    text: "lightricks/ltx-2.5/text-to-video/fast",
    image: "lightricks/ltx-2.5/image-to-video/fast",
  },
  {
    aspectRatio: aspect(["16:9", "9:16"]),
    resolution: resolution(["720p", "1080p", "1440p", "2160p"], "1080p"),
    duration: duration(6, 20, 6, 2),
    generateAudio: audio(),
  },
);
