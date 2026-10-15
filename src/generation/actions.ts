"use server";

import { cookies } from "next/headers";

import { getModel, parseSettings } from "./catalog";
import type { GenerationPlane } from "./catalog/types";
import {
  MissingCredentialsError,
  PLATFORM_KEY_COOKIE,
  PLATFORM_KEY_COOKIE_OPTIONS,
  decodeCredentials,
  encodeCredentials,
  parseCredentialInput,
} from "./credentials";
import { DEFAULT_FAL_QUEUE_URL, PlatformError, createPlatformClient } from "./platform";
import type { QueuedGeneration, StatusResult } from "./platform";
import { UnsupportedRequestError, toFal } from "./to-fal";

/** Next strips the message from errors a server action throws in production,
    so failures the visitor can act on travel back as data. */
export type SubmitResult =
  | ({ ok: true } & QueuedGeneration)
  | { ok: false; error: string };

export async function savePlatformCredentials(data: unknown) {
  const { apiKey } = parseCredentialInput(data);
  const jar = await cookies();
  jar.set(PLATFORM_KEY_COOKIE, encodeCredentials(apiKey), PLATFORM_KEY_COOKIE_OPTIONS);
}

export async function clearPlatformCredentials() {
  const jar = await cookies();
  jar.set(PLATFORM_KEY_COOKIE, "", { ...PLATFORM_KEY_COOKIE_OPTIONS, maxAge: 0 });
}

export async function hasPlatformCredentials() {
  return (await readStoredCredentials()) !== null || serverKey() !== null;
}

export async function submitGeneration(plane: GenerationPlane): Promise<SubmitResult> {
  try {
    const model = getModel(plane.model);
    const parsed: GenerationPlane = {
      ...plane,
      settings: parseSettings(model, plane.settings),
    };
    const { endpoint, body } = toFal(parsed);
    const queued = await createPlatformClient(await readCredentials()).submit(endpoint, body);
    return { ok: true, ...queued };
  } catch (caught) {
    if (caught instanceof MissingCredentialsError) return { ok: false, error: caught.message };
    if (caught instanceof PlatformError && (caught.status === 401 || caught.status === 403)) {
      return { ok: false, error: "fal rejected the API key" };
    }
    if (caught instanceof UnsupportedRequestError || caught instanceof PlatformError) {
      return { ok: false, error: caught.message };
    }
    console.error("[generate] submit failed", caught);
    return { ok: false, error: "the request could not be sent" };
  }
}

/** Every request in flight, answered in one round trip. Next dispatches server
    actions one at a time per client, so a poll per run would queue ahead of the
    next submit — the fan-out belongs on this side of the call, where it is
    genuinely parallel. */
export async function getGenerationStatuses(data: unknown): Promise<StatusResult[]> {
  const requestIds = parseRequestIds(data);
  const client = createPlatformClient(await readCredentials());
  return Promise.all(
    requestIds.map(async (requestId): Promise<StatusResult> => {
      try {
        return { requestId, status: await client.status(requestId) };
      } catch (caught) {
        return { requestId, error: caught instanceof Error ? caught.message : String(caught) };
      }
    }),
  );
}

async function readStoredCredentials() {
  const jar = await cookies();
  return decodeCredentials(jar.get(PLATFORM_KEY_COOKIE)?.value);
}

/** The visitor's own key wins; `FAL_KEY` lets the operator generate without
    pasting one. Until accounts and credits exist, a deployment with `FAL_KEY`
    set lets every visitor spend on that key — keep it to private deployments. */
async function readCredentials() {
  const stored = (await readStoredCredentials()) ?? serverKey();
  if (!stored) throw new MissingCredentialsError();
  return { ...stored, baseUrl: process.env.FAL_QUEUE_URL || DEFAULT_FAL_QUEUE_URL };
}

function serverKey(): { apiKey: string } | null {
  const apiKey = process.env.FAL_KEY?.trim();
  return apiKey ? { apiKey } : null;
}

function parseRequestIds(data: unknown): string[] {
  const payload = asObject(data, "Invalid status payload");
  const requestIds = payload.requestIds;
  if (!Array.isArray(requestIds) || requestIds.length === 0) {
    throw new Error("Invalid request ids");
  }
  return requestIds.map((requestId) => {
    if (typeof requestId !== "string" || !requestId) throw new Error("Invalid request id");
    return requestId;
  });
}

function asObject(data: unknown, message: string): Record<string, unknown> {
  if (data === null || typeof data !== "object" || Array.isArray(data)) throw new Error(message);
  return data as Record<string, unknown>;
}
