import { aspect, audio, duration, resolution, videoModel } from "./defaults";

export const flux3 = videoModel(
  "flux-3",
  "Flux 3",
  { start: 1, end: 1 },
  {
    text: "blackforestlabs/flux-3/text-to-video",
    image: "blackforestlabs/flux-3/image-to-video",
    firstLast: "blackforestlabs/flux-3/first-last-frame-to-video",
  },
  {
    aspectRatio: aspect(["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"]),
    resolution: resolution(["720p", "1080p"], "720p"),
    duration: duration(5, 20, 5),
    generateAudio: audio(),
  },
);
