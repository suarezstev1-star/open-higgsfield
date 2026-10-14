import { duration, videoModel } from "./defaults";

export const minimaxHailuo23 = videoModel(
  "minimax-hailuo-2.3",
  "MiniMax Hailuo 2.3",
  { start: 1 },
  {
    text: "fal-ai/minimax/hailuo-2.3/standard/text-to-video",
    image: "fal-ai/minimax/hailuo-2.3/standard/image-to-video",
  },
  { duration: duration(6, 10, 6, 4) },
);
