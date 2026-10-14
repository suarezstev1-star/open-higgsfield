// Snapshots the input schema of every fal endpoint the catalog references into
// src/generation/fal-schemas.json. The request mapper reads that snapshot to
// send each endpoint only the fields it declares, in the types it declares.
//
//   pnpm fal:schemas            refresh the snapshot from api.fal.ai
//   pnpm fal:schemas --check    exit 1 when the snapshot is missing an endpoint
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogDir = path.join(root, "src/generation/catalog");
const outFile = path.join(root, "src/generation/fal-schemas.json");
const check = process.argv.includes("--check");

const ENDPOINT = /"((?:fal-ai|bytedance|alibaba|blackforestlabs|xai|ideogram|lightricks|minimax|wan|recraft)\/[a-z0-9._/-]+)"/g;
const endpoints = new Set();
for (const file of fs.readdirSync(catalogDir)) {
  if (!file.endsWith(".ts")) continue;
  for (const match of fs.readFileSync(path.join(catalogDir, file), "utf8").matchAll(ENDPOINT)) {
    endpoints.add(match[1]);
  }
}

const existing = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, "utf8")) : {};
if (check) {
  const missing = [...endpoints].filter((id) => !existing[id]);
  if (missing.length) {
    console.error(`fal-schemas.json is missing ${missing.length} endpoint(s):\n  ${missing.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`fal-schemas.json covers all ${endpoints.size} catalog endpoints`);
  process.exit(0);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchSchema(endpointId) {
  const url = new URL("https://api.fal.ai/v1/models");
  url.searchParams.set("endpoint_id", endpointId);
  url.searchParams.set("expand", "openapi-3.0");
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(url);
    if (response.status === 429) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
    if (!response.ok) throw new Error(`${endpointId}: HTTP ${response.status}`);
    const body = await response.json();
    const model = body.models?.find((entry) => entry.endpoint_id === endpointId);
    if (!model?.openapi) throw new Error(`${endpointId}: not found on fal`);
    return summarize(endpointId, model);
  }
  throw new Error(`${endpointId}: rate limited`);
}

function resolveRef(doc, node) {
  let current = node;
  while (current?.$ref) {
    current = current.$ref.replace(/^#\//, "").split("/").reduce((acc, key) => acc?.[key], doc);
  }
  return current ?? {};
}

function flatten(doc, node) {
  const resolved = resolveRef(doc, node);
  const variants = resolved.anyOf ?? resolved.oneOf;
  if (variants) {
    const concrete = variants.map((variant) => resolveRef(doc, variant)).filter((v) => v.type !== "null");
    if (concrete.length === 1) return flatten(doc, concrete[0]);
  }
  const field = {};
  if (resolved.type) field.type = resolved.type;
  if (resolved.enum) field.enum = resolved.enum;
  if (resolved.default !== undefined) field.default = resolved.default;
  if (resolved.minimum !== undefined) field.minimum = resolved.minimum;
  if (resolved.maximum !== undefined) field.maximum = resolved.maximum;
  if (resolved.type === "array" && resolved.items) {
    const items = resolveRef(doc, resolved.items);
    field.items = items.type ?? (items.properties ? "object" : "unknown");
    if (resolved.maxItems !== undefined) field.maxItems = resolved.maxItems;
  }
  return field;
}

function summarize(endpointId, model) {
  const doc = model.openapi;
  const submit = Object.entries(doc.paths ?? {}).find(([route, ops]) => ops.post && !route.includes("/requests/"));
  if (!submit) throw new Error(`${endpointId}: no submit operation in schema`);
  const body = submit[1].post.requestBody?.content?.["application/json"]?.schema;
  const input = resolveRef(doc, body);
  const properties = {};
  for (const [name, node] of Object.entries(input.properties ?? {})) properties[name] = flatten(doc, node);
  return {
    category: model.metadata?.category ?? null,
    license: model.metadata?.license_type ?? null,
    required: input.required ?? [],
    properties,
  };
}

const next = {};
const failures = [];
for (const endpointId of [...endpoints].sort()) {
  try {
    next[endpointId] = await fetchSchema(endpointId);
    console.log(`ok   ${endpointId}`);
  } catch (caught) {
    failures.push(caught.message);
    console.error(`fail ${caught.message}`);
  }
  await sleep(700);
}
fs.writeFileSync(outFile, `${JSON.stringify(next, null, 2)}\n`);
console.log(`wrote ${Object.keys(next).length} endpoint schemas to ${path.relative(root, outFile)}`);
if (failures.length) process.exit(1);
