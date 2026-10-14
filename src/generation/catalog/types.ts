export type Surface = "image" | "video";
export type MediaRole = "start" | "end" | "reference" | "video" | "audio";

export type MediaItem = {
  id: string;
  url: string;
  role: MediaRole;
};

export type SettingField =
  | { type: "enum"; values: readonly string[]; default: string }
  | { type: "range"; min: number; max: number; default: number; step?: number }
  | { type: "boolean"; default: boolean };

/** fal endpoint ids, one per input mode. The mapper picks the endpoint that
    matches the media the run carries, so a model only lists the modes fal
    actually serves for it. */
export type Endpoints = {
  /** Prompt only. */
  text?: string;
  /** Start frame, plus an end frame when the endpoint's schema accepts one. */
  image?: string;
  /** Start and end frame together, when fal serves them on a separate endpoint. */
  firstLast?: string;
  /** Reference images, videos and audio. */
  reference?: string;
  /** Image models: reference images turn the run into an edit. */
  edit?: string;
  /** Character image driven by a motion video. */
  motion?: string;
};

export type ModelEntry = {
  id: string;
  surface: Surface;
  label: string;
  roles: Partial<Record<MediaRole, number>>;
  settings: Record<string, SettingField>;
  endpoints: Endpoints;
};

export type GenerationPlane = {
  model: string;
  prompt: { text: string };
  media: Partial<Record<MediaRole, MediaItem[]>>;
  settings: Record<string, unknown>;
};
