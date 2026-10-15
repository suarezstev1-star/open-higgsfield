// Checks every catalog model against the fal schema snapshot: each media
// combination the model offers must reach an endpoint, every setting value the
// studio offers must be accepted by that endpoint, and every endpoint's
// required fields must be filled.
//
//   pnpm fal:check
import { MODELS } from "../src/generation/catalog";
import type { GenerationPlane, MediaRole, ModelEntry } from "../src/generation/catalog/types";
import { endpointSchema, toFal, UnsupportedRequestError } from "../src/generation/to-fal";

type Scenario = { name: string; roles: MediaRole[] };

const errors: string[] = [];
const warnings: string[] = [];

function scenarios(model: ModelEntry): Scenario[] {
  const offered = (role: MediaRole) => (model.roles[role] ?? 0) > 0;
  const list: Scenario[] = [];
  if (model.endpoints.motion) return [{ name: "image + motion video", roles: ["start", "video"] }];
  if (model.endpoints.text) list.push({ name: "prompt only", roles: [] });
  if (offered("start")) list.push({ name: "start frame", roles: ["start"] });
  if (offered("start") && offered("end")) list.push({ name: "start + end frame", roles: ["start", "end"] });
  if (offered("reference")) list.push({ name: "references", roles: ["reference"] });
  if (offered("video")) list.push({ name: "video", roles: ["video"] });
  if (offered("audio")) list.push({ name: "audio", roles: ["audio"] });
  return list;
}

function plane(model: ModelEntry, roles: MediaRole[], settings: Record<string, unknown>): GenerationPlane {
  const media: GenerationPlane["media"] = {};
  for (const role of roles) {
    const extension = role === "video" ? "mp4" : role === "audio" ? "mp3" : "png";
    media[role] = [{ id: role, role, url: `https://example.com/${role}.${extension}` }];
  }
  return { model: model.id, prompt: { text: "a lighthouse at dusk" }, media, settings };
}

function defaults(model: ModelEntry): Record<string, unknown> {
  return Object.fromEntries(Object.entries(model.settings).map(([key, field]) => [key, field.default]));
}

/** Every value the studio can send for one setting. */
function offeredValues(model: ModelEntry, key: string): unknown[] {
  const field = model.settings[key]!;
  if (field.type === "enum") return [...field.values];
  if (field.type === "boolean") return [true, false];
  const values: number[] = [];
  const step = field.step ?? 1;
  for (let value = field.min; value <= field.max + 1e-9; value += step) values.push(Number(value.toFixed(6)));
  return values;
}

for (const model of MODELS) {
  const reached = new Set<string>();
  const list = scenarios(model);
  if (!list.length) errors.push(`${model.id}: offers no media combination that reaches an endpoint`);

  for (const scenario of list) {
    let endpoint: string;
    try {
      ({ endpoint } = toFal(plane(model, scenario.roles, defaults(model))));
    } catch (caught) {
      errors.push(`${model.id} [${scenario.name}]: ${(caught as Error).message}`);
      continue;
    }
    reached.add(endpoint);
    endpointSchema(endpoint);

    for (const key of Object.keys(model.settings)) {
      for (const value of offeredValues(model, key)) {
        const settings = { ...defaults(model), [key]: value };
        try {
          toFal(plane(model, scenario.roles, settings));
        } catch (caught) {
          if (caught instanceof UnsupportedRequestError) {
            errors.push(`${model.id} [${scenario.name}] ${key}=${String(value)}: ${caught.message}`);
          } else throw caught;
        }
      }
    }
  }

  for (const [mode, endpoint] of Object.entries(model.endpoints)) {
    if (endpoint && !reached.has(endpoint)) warnings.push(`${model.id}: ${mode} endpoint ${endpoint} is never chosen`);
  }
  for (const key of Object.keys(model.settings)) {
    const landsSomewhere = [...reached].some((endpoint) => {
      const request = toFal(plane(model, endpointRoles(model, endpoint), defaults(model)));
      return Object.keys(request.body).some((field) => fieldFor(key).includes(field));
    });
    if (!landsSomewhere) errors.push(`${model.id}: setting "${key}" is not sent to any of its endpoints`);
  }
}

function endpointRoles(model: ModelEntry, endpoint: string): MediaRole[] {
  for (const scenario of scenarios(model)) {
    try {
      if (toFal(plane(model, scenario.roles, defaults(model))).endpoint === endpoint) return scenario.roles;
    } catch {
      /* scenario errors are reported above */
    }
  }
  return [];
}

function fieldFor(key: string): string[] {
  const map: Record<string, string[]> = {
    aspectRatio: ["aspect_ratio", "image_size"],
    resolution: ["resolution"],
    duration: ["duration"],
    generateAudio: ["generate_audio", "audio", "generate_audio_switch"],
    cfgScale: ["cfg_scale"],
    keepOriginalSound: ["keep_original_sound"],
    characterOrientation: ["character_orientation"],
  };
  return map[key] ?? [key];
}

for (const warning of warnings) console.warn(`warn  ${warning}`);
for (const error of errors) console.error(`error ${error}`);
console.log(`${MODELS.length} models checked: ${errors.length} error(s), ${warnings.length} warning(s)`);
if (errors.length) process.exit(1);
