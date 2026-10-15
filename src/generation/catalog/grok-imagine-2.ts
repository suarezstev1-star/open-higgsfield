import { aspect, imageModel, resolution } from "./defaults";

export const grokImagine2 = imageModel(
  "grok-imagine-2",
  "Grok Imagine 2.0",
  {
    text: "xai/grok-imagine-image/v2.0/text-to-image",
    edit: "xai/grok-imagine-image/v2.0/edit",
  },
  {
    aspectRatio: aspect(["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3"], "1:1"),
    resolution: resolution(["1k", "2k"], "1k"),
  },
);
