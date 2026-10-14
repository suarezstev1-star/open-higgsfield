import { toAuthorizationHeader } from "./credentials";

/** fal's queue: submit returns a request id, status and result are read from
    the app that owns the endpoint (`owner/app`, without the endpoint subpath). */
export const DEFAULT_FAL_QUEUE_URL = "https://queue.fal.run";

const ENDPOINT_ID = /^[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9._-]*)+$/i;
const REQUEST_ID = /^[a-z0-9][a-z0-9-]{7,}$/i;
const HANDLE_SEPARATOR = "::";

export class PlatformError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(messageFromBody(status, body));
    this.name = "PlatformError";
    this.status = status;
    this.body = body;
  }
}

export type QueuedGeneration = {
  status: string;
  /** Opaque handle the studio stores: `owner/app::request_id`. */
  requestId: string;
};

export type GenerationStatus = {
  status: "queued" | "in_progress" | "completed" | "failed" | "nsfw";
  requestId: string;
  images?: Array<{ url: string }>;
  video?: { url: string };
  error?: unknown;
};

/** One request's answer inside a batched status poll. A request that errors
    carries its reason alone, so it cannot lose the answers standing beside it. */
export type StatusResult =
  | { requestId: string; status: GenerationStatus }
  | { requestId: string; error: string };

export type PlatformClientOptions = {
  apiKey: string;
  baseUrl: string;
  fetch?: typeof fetch;
};

export function isEndpointId(endpoint: string): boolean {
  return ENDPOINT_ID.test(endpoint) && !endpoint.includes("..");
}

export function encodeHandle(app: string, requestId: string): string {
  return `${app}${HANDLE_SEPARATOR}${requestId}`;
}

export function decodeHandle(handle: string): { app: string; requestId: string } {
  const [app, requestId, ...rest] = handle.split(HANDLE_SEPARATOR);
  if (!app || !requestId || rest.length || !isEndpointId(app) || !REQUEST_ID.test(requestId)) {
    throw new PlatformError(400, { detail: "Invalid request id" });
  }
  return { app, requestId };
}

/** `fal-ai/kling-video/v3/pro/text-to-video` is served by the app `fal-ai/kling-video`. */
export function appOf(endpoint: string): string {
  const [owner, app] = endpoint.split("/");
  return `${owner}/${app}`;
}

/** The app path fal itself reports in `status_url`, when it points at this queue. */
function appFromStatusUrl(statusUrl: string | undefined, baseUrl: string): string | undefined {
  if (!statusUrl?.startsWith(`${baseUrl}/`)) return undefined;
  const [app] = statusUrl.slice(baseUrl.length + 1).split("/requests/");
  return app && isEndpointId(app) ? app : undefined;
}

export function createPlatformClient(options: PlatformClientOptions) {
  const baseUrl = options.baseUrl.replace(/\/$/, "");
  const fetchImpl = options.fetch ?? fetch;
  const auth = toAuthorizationHeader(options.apiKey);

  async function send(method: "GET" | "POST", path: string, body?: Record<string, unknown>) {
    const response = await fetchImpl(`${baseUrl}/${path}`, {
      method,
      headers: {
        Authorization: auth,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
    });
    return { response, payload: await readJson(response) };
  }

  return {
    async submit(endpoint: string, input: Record<string, unknown>): Promise<QueuedGeneration> {
      if (!isEndpointId(endpoint)) throw new PlatformError(400, { detail: "Invalid model endpoint" });
      const { response, payload } = await send("POST", endpoint, input);
      if (!response.ok) throw new PlatformError(response.status, payload);
      const data = asRecord(payload);
      const requestId = stringField(data, "request_id");
      if (!requestId) throw new PlatformError(502, { detail: "fal response missing request_id" });
      const app = appFromStatusUrl(stringField(data, "status_url"), baseUrl) ?? appOf(endpoint);
      return { status: "queued", requestId: encodeHandle(app, requestId) };
    },

    async status(handle: string): Promise<GenerationStatus> {
      const { app, requestId } = decodeHandle(handle);
      const base = `${app}/requests/${encodeURIComponent(requestId)}`;
      const polled = await send("GET", `${base}/status`);
      if (!polled.response.ok) throw new PlatformError(polled.response.status, polled.payload);
      const state = stringField(asRecord(polled.payload), "status");
      if (state === "IN_QUEUE") return { status: "queued", requestId: handle };
      if (state !== "COMPLETED") return { status: "in_progress", requestId: handle };

      /* A finished request answers with its output, or with the reason it failed. */
      const result = await send("GET", base);
      if (!result.response.ok) {
        return {
          status: isContentPolicy(result.payload) ? "nsfw" : "failed",
          requestId: handle,
          error: messageFromBody(result.response.status, result.payload),
        };
      }
      return mapResult(handle, result.payload);
    },
  };
}

function mapResult(handle: string, payload: unknown): GenerationStatus {
  const data = asRecord(payload);
  const flagged = Array.isArray(data.has_nsfw_concepts) ? data.has_nsfw_concepts : [];
  const images = Array.isArray(data.images)
    ? data.images.flatMap((item, index) => {
        const url = asRecord(item).url;
        return typeof url === "string" && flagged[index] !== true ? [{ url }] : [];
      })
    : [];
  const videoUrl = asRecord(data.video).url;

  if (typeof videoUrl === "string") return { status: "completed", requestId: handle, video: { url: videoUrl } };
  if (images.length) return { status: "completed", requestId: handle, images };
  if (flagged.some((value) => value === true)) return { status: "nsfw", requestId: handle };
  return { status: "failed", requestId: handle, error: "fal returned no media" };
}

/** fal reports moderation as a 422 whose detail carries `content_policy_violation`. */
function isContentPolicy(payload: unknown): boolean {
  const detail = asRecord(payload).detail;
  const entries = Array.isArray(detail) ? detail : [detail];
  return entries.some((entry) => {
    const record = asRecord(entry);
    return (
      record.type === "content_policy_violation" ||
      /content.?policy|nsfw/i.test(typeof record.msg === "string" ? record.msg : String(entry ?? ""))
    );
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringField(value: Record<string, unknown>, key: string): string | undefined {
  const field = value[key];
  return typeof field === "string" ? field : undefined;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function messageFromBody(status: number, body: unknown): string {
  const detail = asRecord(body).detail;
  if (typeof detail === "string" && detail) return detail;
  if (Array.isArray(detail)) {
    const first = asRecord(detail[0]);
    if (typeof first.msg === "string" && first.msg) return first.msg;
  }
  return `fal request failed (${status})`;
}
