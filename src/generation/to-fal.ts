import { getModel } from "./catalog";
import type { Endpoints, GenerationPlane, MediaRole, ModelEntry } from "./catalog/types";
import schemas from "./fal-schemas.json";

type SchemaField = {
  type?: string;
  enum?: readonly (string | number)[];
  minimum?: number;
  maximum?: number;
  items?: string;
  maxItems?: number;
};

type EndpointSchema = {
  required: readonly string[];
  properties: Record<string, SchemaField>;
};

export type FalRequest = { endpoint: string; body: Record<string, unknown> };

const SCHEMAS = schemas as unknown as Record<string, EndpointSchema>;

/** Field names fal uses for the same input across model families, in the order
    they are tried. The endpoint's schema decides which one is sent. */
const FIELD = {
  start: ["image_url", "start_image_url"],
  end: ["end_image_url", "tail_image_url"],
  references: ["image_urls", "reference_image_urls"],
  videos: ["video_urls"],
  video: ["video_url"],
  audios: ["audio_urls"],
  audio: ["audio_url"],
} as const;

/** Catalog setting → the fal fields that carry it. */
const SETTING_FIELDS: Record<string, readonly string[]> = {
  aspectRatio: ["aspect_ratio"],
  resolution: ["resolution"],
  duration: ["duration"],
  generateAudio: ["generate_audio", "audio", "generate_audio_switch"],
  cfgScale: ["cfg_scale"],
  keepOriginalSound: ["keep_original_sound"],
  characterOrientation: ["character_orientation"],
};

/** fal's shared image-size presets, for image endpoints that take `image_size`
    instead of an aspect ratio. */
const IMAGE_SIZE: Record<string, string> = {
  "1:1": "square_hd",
  "4:3": "landscape_4_3",
  "3:4": "portrait_4_3",
  "16:9": "landscape_16_9",
  "9:16": "portrait_16_9",
};

export class UnsupportedRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedRequestError";
  }
}

export function endpointSchema(endpoint: string): EndpointSchema {
  const schema = SCHEMAS[endpoint];
  if (!schema) throw new Error(`No fal schema for ${endpoint}; run pnpm fal:schemas`);
  return schema;
}

/** Turns one studio run into the fal endpoint and input it should be sent to. */
export function toFal(plane: GenerationPlane): FalRequest {
  const model = getModel(plane.model);
  const endpoint = pickEndpoint(model, plane);
  const schema = endpointSchema(endpoint);
  const body: Record<string, unknown> = {};

  if (plane.prompt.text.trim() && "prompt" in schema.properties) body.prompt = plane.prompt.text;

  const start = urls(plane, "start");
  const end = urls(plane, "end");
  const references = urls(plane, "reference");
  const videos = urls(plane, "video");
  const audios = urls(plane, "audio");

  if (start.length) put(body, schema, model, "start frame", FIELD.start, start[0]);
  if (end.length) put(body, schema, model, "end frame", FIELD.end, end[0]);
  if (references.length) {
    const many = pick(schema, FIELD.references);
    if (many) body[many] = references;
    else if (!start.length && pick(schema, FIELD.start)) body[pick(schema, FIELD.start)!] = references[0];
    else throw unsupported(model, "reference images");
  }
  if (videos.length) {
    const many = pick(schema, FIELD.videos);
    if (many) body[many] = videos;
    else put(body, schema, model, "video input", FIELD.video, videos[0]);
  }
  if (audios.length) {
    const many = pick(schema, FIELD.audios);
    if (many) body[many] = audios;
    else put(body, schema, model, "audio input", FIELD.audio, audios[0]);
  }

  for (const [key, value] of Object.entries(plane.settings)) {
    if (value === undefined) continue;
    if (key === "aspectRatio" && !("aspect_ratio" in schema.properties) && "image_size" in schema.properties) {
      const preset = IMAGE_SIZE[String(value)];
      if (preset) body.image_size = preset;
      continue;
    }
    const field = pick(schema, SETTING_FIELDS[key] ?? []);
    /* A setting the chosen endpoint does not take is skipped, not an error: an
       image-to-video endpoint takes its aspect ratio from the start frame. */
    if (!field) continue;
    body[field] = coerce(model, field, schema.properties[field]!, value);
  }

  const missing = schema.required.filter((field) => body[field] === undefined);
  if (missing.length) {
    throw new UnsupportedRequestError(`${model.label} needs ${missing.map(describe).join(" and ")} for this run`);
  }
  return { endpoint, body };
}

function pickEndpoint(model: ModelEntry, plane: GenerationPlane): string {
  const has = (role: MediaRole) => urls(plane, role).length > 0;
  const endpoints: Endpoints = model.endpoints;
  const choice = model.surface === "image" ? pickImage(endpoints, has) : pickVideo(endpoints, has);
  if (!choice) throw new UnsupportedRequestError(missingInputMessage(model, endpoints));
  return choice;
}

function pickImage(endpoints: Endpoints, has: (role: MediaRole) => boolean) {
  if (has("reference")) return endpoints.edit;
  return endpoints.text;
}

function pickVideo(endpoints: Endpoints, has: (role: MediaRole) => boolean) {
  if (endpoints.motion) return has("start") && has("video") ? endpoints.motion : undefined;
  const extras = has("reference") || has("video") || has("audio");
  if (has("start") && has("end") && endpoints.firstLast) return endpoints.firstLast;
  if (has("start") && extras && endpoints.reference) return endpoints.reference;
  if (has("start") && endpoints.image) return endpoints.image;
  if ((extras || has("start")) && endpoints.reference) return endpoints.reference;
  if (has("start") || has("end")) return undefined;
  return endpoints.text;
}

function missingInputMessage(model: ModelEntry, endpoints: Endpoints): string {
  if (endpoints.motion) return `${model.label} needs a character image and a motion video`;
  if (!endpoints.text && endpoints.image) return `${model.label} needs a start frame`;
  if (!endpoints.text) return `${model.label} needs reference media`;
  return `${model.label} cannot use the attached media together`;
}

function put(
  body: Record<string, unknown>,
  schema: EndpointSchema,
  model: ModelEntry,
  what: string,
  candidates: readonly string[],
  value: string | undefined,
) {
  const field = pick(schema, candidates);
  if (!field) throw unsupported(model, what);
  body[field] = value;
}

function pick(schema: EndpointSchema, candidates: readonly string[]): string | undefined {
  return candidates.find((name) => name in schema.properties);
}

/** Matches a studio value to the type and allow-list the endpoint declares:
    fal enums mix numbers (`duration: 5`) and strings (`duration: "5"`). */
function coerce(model: ModelEntry, field: string, spec: SchemaField, value: unknown): unknown {
  if (spec.enum) {
    const match = spec.enum.find((allowed) => String(allowed) === String(value));
    if (match === undefined) {
      throw new UnsupportedRequestError(`${model.label} does not support ${field} ${String(value)}`);
    }
    return match;
  }
  if (spec.type === "integer" || spec.type === "number") {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new UnsupportedRequestError(`Invalid ${field} for ${model.label}`);
    if ((spec.minimum !== undefined && number < spec.minimum) || (spec.maximum !== undefined && number > spec.maximum)) {
      throw new UnsupportedRequestError(`${model.label} does not support ${field} ${number}`);
    }
    return spec.type === "integer" ? Math.round(number) : number;
  }
  if (spec.type === "string") return String(value);
  return value;
}

function urls(plane: GenerationPlane, role: MediaRole): string[] {
  return (plane.media[role] ?? []).map((item) => item.url);
}

function unsupported(model: ModelEntry, what: string) {
  return new UnsupportedRequestError(`${model.label} does not take a ${what} in this mode`);
}

function describe(field: string): string {
  if (field === "prompt") return "a prompt";
  if (FIELD.start.includes(field as never)) return "a start frame";
  if (FIELD.end.includes(field as never)) return "an end frame";
  if (field.includes("video")) return "a video";
  if (field.includes("image")) return "an image";
  return field.replaceAll("_", " ");
}
