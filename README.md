# OpenHiggsfield AI — Open-Source Alternative to Higgsfield AI

> **The free, open-source alternative to Higgsfield AI.** Generate images and
> videos with 33 models on fal.ai from one prompt bar — no closed ecosystem, no studio
> subscription.

## 🌐 Try it Online — No Install Required

**Hosted version:** [openhiggsfield.ai](https://openhiggsfield.ai)

Image and Video in one studio, in the browser — no Node.js, no setup. Add your
fal API key (`key_id:key_secret`) to start generating. The studio itself is free.

---

**Why OpenHiggsfield AI instead of Higgsfield AI?**

- **Free & open-source** — no studio subscription, no vendor lock-in
- **Self-hosted** — clone it, run it, change it
- **Your key** — generate with your own fal.ai key
- **33 models** — 7 image, 26 video, one catalog, one composer

---

Next.js 16 App Router on Vercel · React 19 · plain CSS · Zustand · pnpm

---

## Features

### Generate

- **One composer for Image and Video.** A single prompt bar drives both; the
  model you pick decides image or video. `⌘/Ctrl + Enter` submits.
- **33 models in the catalog**, all served by fal.ai — 7 image, 26 video: Seedance
  2.5, Seedance 2.0 (Fast / Mini), Kling 3 (Turbo / Std / Pro / 4K / Motion), Wan, Flux,
  Ideogram, Recraft, LTX, MiniMax, PixVerse, Grok, Qwen and more. Searchable
  picker.
- **Per-model settings.** Aspect ratio, resolution, duration, output format,
  audio, batch size, prompt enhancement — each model declares its own allow-list
  and the studio renders exactly that. No parallel hardcoded list.
- **Media inputs by role.** Start frame, end frame, references, video and audio,
  each with the per-role cap the model declares. Files upload to Vercel Blob and
  become public URLs the generate request can carry.
- **Asset picker.** Attach from your uploads library or from any finished run in
  history — two tabs over one library, filtered to the role's kind.
- **Batch.** Up to 4 results per press. Models with a native count setting use it;
  the rest are submitted once per result, each clearing its own tile.
- **Live run lifecycle.** Skeletons open in the grid on submit, the request is
  polled every 4s until a terminal status (10-minute deadline), and each finished
  result blooms into place on its own clock.

### Gallery

- **Four scopes** — Image, Video, Assets (every finished run) and Favorites —
  as an arrow-key-navigable tab rail.
- **Masonry grid** of real runs at their true aspect ratio, newest first, with a
  gradient placeholder while media loads.
- **Per-tile actions**: reuse, favorite, delete, select.
- **Reuse restores model, settings and prompt**, so the same run can be
  re-rendered, not just re-typed.
- **Viewer.** Full-size media with prompt (copy in one click), model, resolved
  settings, timestamp, download, favorite and Recreate.
- **Selection mode.** Click a tile's checkbox to enter; shift-click extends a
  range. Bulk download (sequential, with progress and a report of any files the
  CDN refused), bulk favorite/unfavorite, bulk delete. `Esc` exits.
- **Undo.** Deletion is reversible for 6 seconds via a bar with a draining
  hairline, in the strip the composer already reserves.
- **Empty states** that hand you a starter prompt instead of a blank grid.

### State and errors

- **History persists** in IndexedDB in this browser (60 records). Favorites are
  a deliberate keep and never age out of the cap. Result URLs belong to the
  generation platform, so old history can outlive its CDN lifetime and show gaps.
- **Failed, NSFW and canceled runs** are recorded as failed tiles carrying the
  reason and a retry that restores the prompt and model.
- **Your own fal key.** Entered in a modal, stored by a server action in an
  httpOnly cookie. A missing key opens the modal — it never fails silently. The
  topbar lamp states whether a key is held and whether a run is in flight.

---

## Architecture

Each generate is one object: `{ model, prompt, media, settings }`.

- **The UI builds that object** and hands it to a server action. The action
  resolves it against the catalog, picks the fal endpoint for the media the run
  carries (text, start frame, first/last frame, references, motion) and maps it
  to that endpoint's own fields (`image_url`, `start_image_url`, `image_urls`, …)
  in the types its schema declares.
- **Server actions are the only caller.** The browser never talks to fal.
  Submit is `POST https://queue.fal.run/{endpoint}`; status and result are read
  from the owning app at `/{owner}/{app}/requests/{id}/status` and
  `/{owner}/{app}/requests/{id}`. Auth is `Authorization: Key <key_id:key_secret>`.
- **Every endpoint's input schema is snapshotted** in
  `src/generation/fal-schemas.json` (`pnpm fal:schemas`), and `pnpm fal:check`
  proves that every media combination and setting value the studio offers is
  accepted by the endpoint it reaches.
- **The catalog is the source of truth** (`src/generation/catalog/`). A new entry
  appears in the picker, brings its own settings rail and media roles, and needs
  no studio changes.
- **Five small Zustand stores** — shared image/video prompt, shared image/video
  media, `settings[modelId]`, and a tiny `active` store. No store per model.
- **Uploads** go client-direct to Vercel Blob through `/api/blob`, which issues
  scoped tokens. `blob:` URLs are preview-only.

---

## Project docs

- `docs/HANDOFF.md` — current state, roadmap and how to resume.
- `docs/research/higgsfield/` — static reverse-engineering notes on higgsfield.ai.

## Getting started

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

Open the studio, press **Add key**, and paste your fal key as `key_id:key_secret`
(create one at fal.ai/dashboard/keys), or set `FAL_KEY` on the server.

### Environment

```bash
FAL_KEY=                              # optional server-side fal key; private deployments only until accounts and credits exist
FAL_QUEUE_URL=                        # optional, defaults to https://queue.fal.run
OPEN_HIGGSFIELD_READ_WRITE_TOKEN=     # Vercel Blob read-write token
```

### Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server on port 3000 |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm brand` | Rebuild the icons and OG card in `public/` |
| `pnpm fal:schemas` | Refresh the fal input-schema snapshot for every catalog endpoint |
| `pnpm fal:check` | Check the catalog against the snapshot |

---

## Layout

```
src/
  app/          /  is the full-viewport studio and the only page
                /api/blob issues upload tokens
                base.css owns the document canvas
  generation/   generate requests, server actions, API mapping, catalog, stores
  openhiggsfield/
                the studio surface: composer, gallery, viewer, model picker,
                settings, asset picker, selection bar — and openhiggsfield.css
```

---

## Design principles

Dark studio ground, a single lime accent `#d1fe17`, Inter throughout. The chrome
stays neutral so the generated work is the only color on the surface.

1. **The tool disappears into the task** — expression never obscures state or
   affordance.
2. **Accent is state, not decoration** — selection, primary action, liveness only.
3. **Data is data** — settings, counts and durations read in tabular numerals.
   One typeface throughout; no monospace anywhere.
4. **Motion conveys state** — the generation lifecycle, the arrival of a run.
   Nothing loops decoratively.
5. **Every control ships all its states** — hover, focus, active, disabled,
   loading, error, empty.
6. **The catalog is the source of truth** — the studio renders what the model
   declares, never a parallel hardcoded list.

Built for people who work in long sessions, iterating on prompts, inputs and
settings.
