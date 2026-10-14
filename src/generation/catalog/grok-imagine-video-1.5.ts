import { aspect, duration, resolution, videoModel } from "./defaults";

export const grokImagineVideo15 = videoModel(
  "grok-imagine-video-1.5",
  "Grok Imagine Video 1.5",
  { start: 1, reference: 8 },
  {
    text: "xai/grok-imagine-video/v1.5/text-to-video",
    image: "xai/grok-imagine-video/v1.5/image-to-video",
    reference: "xai/grok-imagine-video/v1.5/reference-to-video",
  },
  {
    aspectRatio: aspect(["16:9", "9:16", "1:1", "4:3", "3:4", "3:2", "2:3"]),
    resolution: resolution(["480p", "720p"], "720p"),
    duration: duration(1, 15, 6),
  },
);
