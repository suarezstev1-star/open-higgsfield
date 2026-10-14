import { aspect, duration, resolution, videoModel } from "./defaults";

export const minimaxH3 = videoModel(
  "minimax-h3",
  "MiniMax H3",
  { start: 1 },
  {
    text: "minimax/h3/text-to-video",
    image: "minimax/h3/image-to-video",
  },
  {
    aspectRatio: aspect(["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"]),
    resolution: resolution(["768P", "2K", "4K"], "768P"),
    duration: duration(5, 15, 6),
  },
);
