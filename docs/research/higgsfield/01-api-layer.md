# higgsfield.ai frontend: API and backend-communication layer

This is static analysis of the downloaded bundles only: 7,865 chunks under `hf-assets/`. The build is Vite + TanStack Start, chunk prefix `868a8dba-`, with no source maps. No network requests were made.

**Labels used in this report**
- **OBSERVED**: the literal is in the shipped code. A file name and a short snippet are cited.
- **INFERRED**: deduced from surrounding code, names, or call shape.
- **UNKNOWN**: the bundles don't show it.

Unless another file is named, snippets come from the core chunk `868a8dba-QhqiFCLt1Ukztv0Y.js` (1.2 MB), which is called **CORE** below.

The extraction tooling is in `scratchpad/tools/`. The main scripts are `endpoints.mjs`, `wrappers.mjs`, `axioscalls.mjs`, `namedfns.mjs`, `basecat.mjs`, `norm.mjs`, `leftover.mjs`, `annotate.mjs` and `appendix.mjs`. The raw outputs are `all3.tsv`, which lists every call site, and `endpoints-uniq.tsv`, which holds the normalized catalogue. `leftover-annot.tsv` holds path literals that were not tied to a helper call.

---

## 0. Key discovery: an export facade keeps the original helper names

The chunk `868a8dba-Uvx7o7ASR4AkkzQA.js` is loaded by dynamic import. It re-exports the CORE URL helpers under their **source names** (OBSERVED, from its `export{...}`):

| Source name | CORE local name, then export id | Base it produces |
|---|---|---|
| `apiUrl` | `Eb` / `Lg` | `https://fnf-api-gw.higgsfield.ai/fnf` + path (**main gateway**) |
| `gatewayApiUrl` | `Tb` / `Qg` | joins any base and refuses paths that escape it (`RangeError("API URL must stay within the configured gateway base")`) |
| `joinApiUrl` | `Sb` / `a_` | plain URL join |
| `agentGatewayApiUrl` | `$ve` / `Pg` | gateway origin + `/fnf-agent-gateway` |
| `campaignApiUrl` | `eye` / `Hg` | `…/fnf-campaign-api` |
| `chatApiUrl` | `tye` / `Wg` | `…/fnf-aitys` |
| `cronApiUrl` | `nye` / `Yg` | `…/fnf-higgsclaw-cron` |
| `creatorHubChatApiUrl` | `rye` / `Jg` | `https://creator-hub-chat.higgsfield.ai` (local fallback `http://localhost:8787`) |
| `canvasApiUrl` | `iye` / `Ug` | `https://canvas-worker.higgsfield.ai` |
| `scoreApiUrl` | `aye` / `l_` | `…/fnf-score` |
| `meetApiUrl` | `oye` / `s_` | `…/fnf-meet` |
| `seriesApiUrl` | `sye` / `u_` | `…/fnf-series` |
| `aiCmoApiUrl` | `cye` / `Fg` | `…/fnf-ai-cmo` (dev fallback `https://dev-fnf-gw.higgsfield.ai/fnf-ai-cmo`) |
| `communityApiUrl` | `lye` / `Gg` | `…/fnf-community` |
| `deviceAuthApiUrl` | `uye` / `Zg` | `https://fnf-device-auth.higgsfield.ai` |
| `skillsMarketplaceApiUrl` | `dye` / `d_` | `…/fnf-skills-marketplace` |
| `appsMarketplaceApiUrl` | `fye` / `zg` | `…/fnf-apps-marketplace` (dev fallback `https://dev-fnf-api-gw.higgsfield.ai/…`) |
| `academyApiUrl` | `mye` / `Mg` | `…/fnf-academy`, and always appends `?lang=<locale>` |
| `contentUrl` | `hye` / `qg` | `https://cms.higgsfield.ai`, and always appends `?lang=<locale>` |
| `imageLoaderUrl` | `Db` / `e_` | `https://images.higgs.ai` |
| `staticUrl` | `Ob` / `p_` | `https://static.higgsfield.ai` |
| `authHeaders` | `yye` / `Bg` | sets `Authorization: Bearer <t>` and `Accept-Language` |
| `bodyHeaders` | `bye` / `Vg` | sets `Content-Type: application/json` |
| `contentHeaders` | `vye` / `Kg` | sets `hf-env: dev\|prod` |
| `localeHeaders` | `jb` / `o_` | sets `Accept-Language` |
| `hfWorkspaceIdHeader` | `xye` / `$g` | sets `hf-workspace-id` |
| `accessHeaders`, `apiHeaders` | `Ab` / `Ng`, `_ye` / `Ig` | SSR only: `CF-Access-Client-Id/Secret` and a CI "SSG" header taken from `process.env` |
| `ApiBaseError`, `ApiClientError`, `ApiServerError`, `ApiError` | `Lb`, `zb`, `Rb`, `Bb` | error classes (section 2.5) |

CORE snippet: `function gb(){return yb}function _b(){return yb.replace(/\/fnf\/?$/,``)+bb}… yb=(vb=`https://fnf-api-gw.higgsfield.ai/fnf`)==null?``:vb,bb=`/fnf-agent-gateway``

Other facade chunks also keep readable export names, for example `TvOmisDQxJIxG7sY` (assets API), `XMA93oDOMvDkZTJY` (apps marketplace) and `YQyvaqMWLdF6t0cN` (agent employees). `tools/namedfns.mjs` used them to attach 61 source function names to endpoints, such as `getAssetDetails → /assets/{}/detail` and `likePublication → POST /publications/{}/like`.

---

## 1. Backend services and base URLs

### 1.1 The `fnf-api-gw.higgsfield.ai` gateway (OBSERVED)

The gateway is path-prefixed per service: `https://fnf-api-gw.higgsfield.ai/<service>`.

| Prefix | Purpose (INFERRED from the endpoints and code around them) | Unique paths found |
|---|---|---|
| `/fnf` | **Main product API.** Covers user, workspaces and teams, folders and projects, jobs (generation submit and status for every model), assets and library, media upload, subscriptions and billing, gifts and referrals, contests, publications and feed, marketing studio, reference elements, Supercomputer/"claudesfield" agent chats, connectors, and more. | **833** |
| `/fnf-notification` | Notifications REST, the **SSE realtime stream** `/notifications/stream`, and agent-chat event resume/poll | 4 + chat events |
| `/fnf-community` | Social graph: profiles, subscriptions, comments, votes, achievements, community generations feed, presence | 33 |
| `/fnf-series` | "Series" and episodes (episodic content), with reactions, comments, subscriptions and view tracking | 13 |
| `/fnf-score` | Karma, rewards and seasons (gamification and "creator pass") | 10 |
| `/fnf-meet` | Folder or project chat messages, plus a token for live audio rooms (Cloudflare RealtimeKit, formerly Dyte) | 5 |
| `/fnf-skills-marketplace` | AI agents and "AI employees", skills (personal, community, built-in), community games (inferred) | 18 (+ games) |
| `/fnf-apps-marketplace` | User-built apps ("websites"): code tree, DB tables, secrets, custom domains, publishing, access requests, community listing | 30 (+14 inferred community/explore paths) |
| `/fnf-ai-cmo` | "Ads Studio" / AI CMO: brands, products, research, creative runs, quotas, and an SSE brand-events stream | 23 |
| `/fnf-academy` | Academy courses, lessons, certificates and prompt bank (INFERRED from leftover literals in `Yw2e1pkiSRelFdrE.js`, which imports `academyApiUrl`) | ~15 |
| `/fnf-higgsclaw-cron` | Scheduled agent jobs: `/api/v1/jobs`, `PATCH /api/v1/jobs/{id}` | 2 |
| `/fnf-agent-gateway` | Agent integrations. The only client call is browser navigation to `/slack/install` (Slack OAuth) in `6HRd2QJYrh3r8_Dg.js`. | 1 |
| `/fnf-campaign-api` | Base exists, but no client call site was found. INFERRED: used SSR-only or not yet in use. | 0 |
| `/fnf-aitys` (`chatApiUrl`) | Base exists, but no client call site was found. UNKNOWN. | 0 |
| `/fnf-cms-api` | OBSERVED in `Yw2e1pkiSRelFdrE.js`: `` `${Yr().replace(/\/fnf\/?$/,``)}/fnf-cms-api` `` (a CMS proxy through the gateway) | n/a |

### 1.2 Other higgsfield.ai hosts

| Host | Use | Evidence |
|---|---|---|
| `cms.higgsfield.ai` | Headless CMS for presets and catalogues: motions, styles, viral-hub presets, marketing-studio catalogue, notices, tips, cards and blocks. 61 paths. Always called with `?lang=`. | OBSERVED, `hye` |
| `canvas-worker.higgsfield.ai` | "Flow" node canvas and templates: REST under `/api/flow` and `/api/templates`, plus a **WebSocket** at `/api/flow/connect/{id}` | OBSERVED `zU2Fxb7vqXsC5tXd.js`, `jCvphhIoPfzXpCEq.js` (`workerUrl(){return`https://canvas-worker.higgsfield.ai`}`) |
| `layer-worker.higgsfield.ai` | Layer editor ("layer-projects": versions, layers, masks, effects, grading, generations). Fallback: `fnf-layer-worker.anwar-695.workers.dev`. | OBSERVED `R066opevF6CjfaMc.js`: `new URL(e,`${n.replace(/\/$/,``)}/`)` with `Authorization: Bearer` |
| `sync.higgsfield.ai` (also `fable-sync.higgsfield.ai`, and workers.dev dev hosts in the allow-list) | "fable-sync" collaborative project sync over a **WebSocket** at `/p/{projectId}/sync/socket` | OBSERVED `Y6e8zKeKkEYukA6r.js`, `eEbJxc-2EtvRXUWY.js`, `bZ-A2wP3qUpdXXO8.js` |
| `3d-scene-builder.higgsfield.ai` (`VITE_BLENDER_RUNNER_URL`) | "Project service" for the 3D scene and blocking studio: projects, revisions, scene-operations, entity-leases, GLB export, plus a **WebSocket** at `/projects/{id}/events` | OBSERVED `iauAJ8LxZqM_9W6I.js`, `Yw2e1pkiSRelFdrE.js` ("The project service URL is required."). The link to `ZNFnXTQOl03uI60I.js` is INFERRED. |
| `dam-editor-worker.higgsfield.ai` | Collaborative "brief" editor: `/brief/{id}/auth` returns a ticket; `/brief/{id}/snapshot`; **WebSocket** `wss://…/brief/connect` | OBSERVED `ApFbxvncd3YcJciZ.js` |
| `quiz-cs.higgsfield.ai` | Quiz service: `/api/q/{id}`, `/api/q/{id}/submit`, `/api/q/{id}/progress` (sent with `keepalive`), `/api/v2/q/{id}?locale=` | OBSERVED `8xMZqO_JERySeVK3.js` |
| `creator-hub-chat.higgsfield.ai` | Creator-hub chat worker (`localhost:8787` fallback is a wrangler dev port). No client call sites found. | OBSERVED base only |
| `fnf-device-auth.higgsfield.ai` | Device-authorization flow, probably the CLI/MCP "device code" login (INFERRED). No client call sites found. | OBSERVED base only |
| `mcp.higgsfield.ai/mcp` | Public MCP server URL that the UI shows for connecting Claude or ChatGPT. Not called by the web app itself. | OBSERVED `xG6bwVEO0JguXf4X.js`, `pzMfFceWyKnbjQjo.js` |
| `bridge.higgsfield.ai/mcp` | MCP bridge for the "Adobe Connector" (Adobe plugin) | OBSERVED `kMJSekLieeI-RY0c.js`: `Vt=(Rt=`https://bridge.higgsfield.ai/mcp`)` |
| `console.higgsfield.ai`, `open.higgsfield.ai` | Developer API console. `open.higgsfield.ai` is the production "dash" origin; the preview origin is `dash-preview.anwar-695.workers.dev`, and `dash-front-d6b.pages.dev` is also accepted. Used for redirect allow-lists only. | OBSERVED CORE `Y_={production:`https://open.higgsfield.ai`,…}` |
| `pricing.higgsfield.ai` | Appears only as hrefs and links. No API use found. | OBSERVED |
| `clerk.higgsfield.ai`, plus same-origin `/_clerk` proxy | Clerk Frontend API (authentication). The publishable key `pk_live_Y2xlcmsuaGlnZ3NmaWVsZC5haSQ` decodes to `clerk.higgsfield.ai$`. | OBSERVED CORE |
| `accounts.higgsfield.ai` | Clerk account portal (redirect allow-list) | OBSERVED `jCvphhIoPfzXpCEq.js` |
| `dd.higgsfield.ai` | **DataDome** bot protection, first-party proxied (not Datadog). `wc=`https://dd.higgsfield.ai/js``, `ajaxListenerPath:[{host:`fnf-api-gw.higgsfield.ai`}]`, `ddjskey`, `x-datadome-clientid`. The cookie banner lists `datadome`, `dd_testcookie` and `ddSession`. | OBSERVED CORE, `wx1UulwLAcUNkTbD.js`, `iMf2NACEVp2Vgrtp.js` |
| `static.higgsfield.ai`, `static-public-media.higgsfield.ai`, `cdn.higgsfield.ai`, `images.higgs.ai`, `d29nkk4626dxhc.cloudfront.net`, `pub-ad7a5eaa…r2.dev` | Media and static CDNs (trusted-media allow-list `_x`). Images are resized through `https://higgsfield.ai/cdn-cgi/image/fit=…,format=webp,…/<src>` (Cloudflare Image Resizing). | OBSERVED CORE `Lx()` |
| `assets.higgsfield.ai/tanstack/` | Build asset base (JS and CSS) | OBSERVED `iauAJ8LxZqM_9W6I.js` |
| `phonecam-web-dev.anwar-695.workers.dev` | "Phone camera" relay. The production bundle points at a **dev** workers.dev host: `/api/rooms`, `/api/rooms/{id}/host-ticket`, `/api/rooms/{id}/stop`, and **WebSocket** `/ws?room=&role=host&ticket=` | OBSERVED `wLKBwc3XA2p5EM1o.js` |

### 1.3 Same-origin `higgsfield.ai` endpoints (TanStack Start server routes, Cloudflare Workers)

OBSERVED literals: `/api/account-status`, `/api/adobe-plugin/session/exchange` (exchanges an id_token for a session), `/api/analytics/consent-decision`, `/api/auth/clerk-proxy-rollout` (sent with `x-hf-clerk-rollout: signed-out`), `/api/image-proxy?url=` (CORS proxy for static images used by html-to-image), `/api/link-preview?url=`, `/api/route-preload-manifest`, `/api/supercomputer/pdf-preview`, `/api/supercomputer/text-preview`, `/api/user-products`, `/api/workspace-members-template`, `/api/hook-predictor/demo-analysis`, `/api/i` (**PostHog ingest proxy**: `ng=`https://higgsfield.ai/api/i``), `/_clerk/*` (Clerk proxy), and `/_serverFn/<sha256>` (TanStack server functions; about 20 RPC ids, for example `m({method:`GET`}).handler(_(`4681ce3b…`))` in `H2Wa9ig1agElO2q6.js`).

### 1.4 Third parties called directly

- **GrowthBook**: `cdn.growthbook.io` and `us1.gb-ingest.com/track`. The gateway also serves `GET /fnf/feature`.
- **PostHog**: `us.i.posthog.com`, also reached through `/api/i`.
- **DataDome**: `api-js.datadome.co` and `dd.higgsfield.ai`.
- **Cloudflare RealtimeKit / Dyte**: `api.dyte.io`, `realtime.cloudflare.com`.
- **Nutrient (PSPDFKit) Web SDK** bundled in `uZmL358GHOgrIrIs.js`. It is the source of the `socket.io`/`engine.io` code and of the LangGraph-style `/assistants`, `/threads` and `/runs` paths. These are **not Higgsfield endpoints**.
- **Uppy Companion** socket code (`P3KZFy4DTsHzGRPH.js`).

---

## 2. HTTP clients

There are three request paths into the main gateway. All of them run on `fetch`.

### 2.1 Raw `fetch` with header helpers (the dominant pattern)
282 chunks import `apiUrl` and 151 import `authHeaders`. The typical shape (OBSERVED, `In3jiSi1QZMbyYC-.js`):
```js
fetch(r(`/jobs/infinite-talk`),{method:`POST`,headers:a(t(e)),body:JSON.stringify({params:n,client_meta:i}),credentials:void 0})
```
Here `r = apiUrl`, `t = authHeaders(token)` and `a = bodyHeaders`. Responses go through `await ApiError.assert(res)`; 134 chunks import `ApiClientError` and 42 import `ApiError`. Job submit bodies are `{params, client_meta}`; v2 jobs go to `POST /jobs/v2/{job_set_type}` and `/jobs/v2/{type}/estimate`.

### 2.2 Transport wrapper `KA()`: `qA` / `nf` (authenticated) and `YA` / `$d` (anonymous)
This is a hardened, policy-driven fetch, imported by 92 chunks. OBSERVED in CORE around offset 464k–474k:
- **Origin policy table** (`WSe`). Every first-party base (the gateway prefixes, canvas-worker, layer-worker, creator-hub-chat, device-auth) is registered with `defaultAuthMode:'optional'` and grants `{bearerToken, workspaceHeader, surfaceHeader, cookieCredentials, cfAccessHeaders}`. If two bases demand different policies it throws: `"transport origin table conflict … last-write-wins is forbidden"`. A request to an origin outside the table is sent with `authMode:'none'`.
- **Header stripping.** Caller-supplied `authorization`, `cookie`, `hf-workspace-id`, `hf-surface`, `cf-access-client-id`, `cf-access-client-secret` and `x-hf-secret` are removed (`QSe`). They are then re-added only when the origin's grant allows it: `Authorization: Bearer <token>`, `hf-workspace-id`, `hf-surface`, `CF-Access-Client-Id/Secret`. `Accept-Language` is added whenever Authorization is present.
- `redirect:'manual'`. Any 3xx or opaque redirect is reported as `redirect-blocked`. `credentials:'omit'` is used unless the origin grants cookies.
- **401 handling** (`LSe`): one forced token refresh (`session.getToken({skipCache:true})`), then a single replay. Replay only happens when the request is "replayable": GET, HEAD, or POST that carries an **`Idempotency-Key`** header, with a non-stream body. Outcomes are tagged on the Response as `hfTransportDisposition`, with one of `auth-retry-exhausted | auth-refresh-unavailable | auth-replay-unsafe | redirect-blocked | auth-preflight | credentials-policy-blocked`. `authMode:'required'` with no token gives a synthetic 401 (`auth-preflight`).
- **Status side effects.** A `423` response fires `window` event `hf:account-access-recheck` (account lock or suspension, INFERRED). A `403` lazy-loads `maybeRecoverFromProtectionBlock`, the DataDome challenge recovery. A `TypeError` network failure triggers the opaque-network diagnostics in §2.6.

### 2.3 `redaxios` instance `HS` / `wm`
`HS=ofe.create({baseURL:gb(),fetch:(e,t)=>{…Authorization: Bearer Tx()…}})`, where `ofe` is redaxios (from `6MN9R_JZXcJ_TENo.js`). It has the same 423 and 403 side effects and is used for about 119 calls, for example `n.get(`/v3/quizzes/${e}`)`, `/uploads/multipart/*`, `/subscriptions/*`, `/referral*` and `/media*`.

### 2.4 Authentication (OBSERVED)
- **Clerk** is the identity provider: ClerkJS on `window.Clerk`, Frontend API `clerk.higgsfield.ai`, or the `/_clerk` proxy depending on rollout (`hf_clerk_proxy` cookie, `/api/auth/clerk-proxy-rollout`).
- Token resolution order (`Tx()`): an explicit in-memory override token first (`Ox`, set by embedded or mobile surfaces with an `auth-token-override:` cache key). Then, during SSR, the request-scoped token from an AsyncLocalStorage store. In the browser it is the **`__session` cookie** JWT. The refreshable provider `Vk()` uses `Clerk.session.getToken()` with a 10 s timeout (`_S=1e4`, `AuthTokenTimeoutError`) and refreshes expired JWTs (`Ex()` checks `exp`).
- `__client_uat` cookies tell whether the user is signed in or out.
- Other schemes: the layer-worker, 3d-scene-builder, quiz, phonecam and brief services use `Authorization: Bearer <Clerk JWT>` or short-lived **tickets** (`/event-ticket`, `/host-ticket`, `/brief/{id}/auth`) for WebSocket upgrades. The SSE stream uses Bearer headers through an EventSource polyfill.

### 2.5 Error model (OBSERVED, CORE `Lb/Rb/zb/Bb`)
- `ApiServerError` is raised for any status ≥ 500.
- `ApiClientError` is raised for 4xx. Its body parser reads `detail` as a string, an array (`detail[0].msg`, FastAPI/pydantic shape), `{error}` (marketplace codes), or `{error_type,text}`. `getCode()` returns `error` or `error_type`. INFERRED: the gateway services are FastAPI.
- `ApiError.assert(res)` runs the server check, then the client check, then `!ok`. Messages are i18n ids (`OIYbyY`, `jg2IcM`, `c5AW_u`).
- `x-request-id` or `request-id` response headers are captured as `api_request_id` for error telemetry (`6_6x355X099YGNI2.js`). The client generates **no** request-ID header of its own (UNKNOWN whether the gateway adds one).

### 2.6 Retries and resilience (OBSERVED)
- **React Query defaults** (`lF()`): `staleTime` 60 s, `refetchOnMount:false`, and a classified retry. `jP()` maps errors to `terminal` (aborts, most 4xx, 501), `auth` (401, 1 retry, 500 ms delay), `throttled` (429, or 5xx with `Retry-After`; 1 retry), `opaque` (TypeError; 2 retries, base 2 s) and `transient` (5xx, 408, 425; 3 retries, base 1 s). Backoff is exponential with ±50 % jitter and capped at 30 s and 60 s. `Retry-After` is honoured. A **global retry token bucket** (60 tokens, +0.1 per second and per success) prevents retry storms. `refetchOnWindowFocus` is off.
- Generic `Ru()` helper: `maxRetries=3`, `delay=3000`.
- **Opaque network failure diagnostics** (`dj` module): on a fetch `TypeError` it probes `/favicon.ico?__diag=` (same origin, for clock skew and protocol), then `GET /fnf/datetime-settings` without auth, then `GET /fnf/user/settings` with auth. It reports a verdict (`offline | browser-or-local-network | gateway-unreachable | gateway-rejects-auth | recovered`) together with `navigator.connection` data. A matching upload analyser classifies failures as `upload-blocked-before-body`, `died-mid-body` and so on. Uploads are XHR `PUT` to pre-signed storage URLs, with multipart through `/fnf/uploads/multipart/{init,part-urls,complete,abort}`.
- DataDome recovery probes `POST /fnf/jobs/status-batch` with `{ids:[]}` (`N74mD0Hu9YNzgMYQ.js`).

### 2.7 Environment switching (OBSERVED)
- The environment is fixed at build time: `cd=(id=`production`)==null?`local`:id`, with `ld = cd==='preview'` and `ud = cd==='production'`. Every base is a substituted literal of the form `(x=`https://…`)==null?<dev fallback>:x`. In this production bundle the dev fallbacks (`dev-fnf-api-gw.higgsfield.ai`, `dev-fnf-gw.higgsfield.ai`, `localhost:8787`, `*.anwar-695.workers.dev`) are **dead code**. They show the dev naming scheme: `dev-fnf-api-gw.higgsfield.ai/<service>`.
- The header `hf-env` is mapped `{local:'dev', preview:'dev', production:'prod'}` (`vye`, used by 12 chunks for CMS and content calls).
- Workspace context comes from the `hf-workspace-id` header. Surface context comes from the `hf-surface` header (for example `touring`, `claudesfield`, upload surfaces).

---

## 3. Endpoint catalogue

### 3.1 Method and coverage notes
- 1,395 helper call sites were resolved into **1,044 unique (service, path) pairs**. `{}` marks an interpolated segment and query strings are stripped. Sources: direct helper calls, constant-held paths, same-file and cross-file wrapper functions, the redaxios client, and base-concatenation.
- The HTTP method is OBSERVED for 491 pairs: either a `method:` literal between the call and the next fetch, or a redaxios `.get/.post/…` call. Pairs with no method are usually GET, but this is not verified.
- **Not captured**: paths built entirely at runtime, and chunks that use their own local base functions. About 770 more path literals in API-using chunks are kept in `tools/leftover-annot.tsv`. Many of them are front-end routes or asset keys, not endpoints.

### 3.2 Main gateway `/fnf`: grouped summary (INFERRED purpose)

| Area | Representative endpoints | What the UI does |
|---|---|---|
| **Jobs and generation** (~110) | `POST /jobs/{model}` for kling, kling2-6, seedance, veo3/veo3-1, nano-banana(-2…), seedream(-v4-5), flux-2, wan2-x, minimax-hailuo, sync-so, topaz-*, face-swap, character-swap, text2image-soul… `POST /jobs/v2/{job_set_type}` (cinematic_studio_*, soul_location, marketing_studio_image, reels_studio_clip…), `/jobs/v2/{type}/estimate`, `/job-sets/costs`, `POST /jobs/status-batch`, `GET /jobs/{id}`, `/jobs/{id}/status`, `PUT /jobs/{id}/cancel`, `/jobs/{id}/trace`, `/publish`, `/unpublish`, `POST /jobs/{id}/ip-detect`, `PUT /jobs/deepfake/confirm-consent`, `PUT /jobs/seedance/confirm-rights/batch` | Submit a generation with `{params, client_meta}`, poll status in batches, show cost estimates, handle IP and deepfake consent gates |
| Chains (multi-step pipelines) | `/chains/{cinematic-video-editor, draw-to-video(/cost), dubbing, mixed-media(-preview), motion-control, voice-change, link-to-ad, …}` | Server-side workflow orchestration |
| Media and uploads | `POST /media`, `/media/{id}/upload`, `/media/batch`, `/media/anon`, `/media/download-batch`, `/uploads/multipart/*`, `/file`, `/audio`, `/input-images`, `/input-videos`, `/input-audios` | Two-step upload: create a record, get a pre-signed URL, PUT the bytes, confirm |
| Assets and library | `/assets`, `/assets/{id}/detail`, `/assets/count`, `/assets/favourites*`, `/assets/publish`, `/favourites/like`, `/favourites/unlike`, `/folders/{id}/{add,move,remove,assets,public-assets}`, `/folder-items/*`, `/trash/*`, `/boards/{id}/jobs` | Library management, favourites, trash |
| Folders / projects / collaboration (~60) | `/folders…`, `/access/folder/{id}/permissions/*`, `/project-publications`, `/project-previews`, `/sharing-configs`, `/workspace-call` | Projects, sharing, roles, publication |
| Workspaces and teams (~70) | `/workspaces…` (members, invites, credit-ledger statistics and usage-history, sub-workspaces, SSO, billing) | Team administration and usage |
| User | `/user/*` (settings, meta, lang, offers, email-retention), `/datetime-settings`, `/feature`, `/verify`, `/sso` | Profile, settings, feature flags |
| Billing | `/subscriptions/*` (plan-cards, cancel, resume, invoices, bundles, unlim catalogue), `/v2/auto-top-ups/*`, `/concurrent-boost-credits/*`, `/two-day-offer/*`, `/freegen-campaigns/*`, `/business-unlim/*`, `/unlims`, `/offers`, `/churnkey/auth`, `/card-verification/{id}`, `/promotion/code` | Plans, add-ons, cancellation flow (Churnkey) |
| Growth | `/gifts*`, `/referral*`, `/referral-campaigns`, `/affiliate/*`, `/cashback-challenge*`, `/emails/redeem`, `/upgrade-nudges`, `/no-activity`, `/surveys`, `/feedback` | Referrals, gifts, nudges |
| Supercomputer / agent ("claudesfield") | `POST /claudesfield/chats`, `/claudesfield/chats/{id}/{messages,command,config}`, `/claudesfield/attachments`, `/claudesfield/connector/*`, `/supercomputer/*` (projects, onboarding), `/connectors`, `/telegram-integrations`, `/discord`, `/youtube-faceless/*` | Agent chat and connectors. Events stream from the notification service (§4). |
| Creative tools | `/marketing-studio/*` (setup, brand-kits, webproducts, extract), `/reference-elements*` and `/v2/reference-elements*` (elements library, import drafts, sharing, picker), `/v2/element-folders`, `/custom-references/*` (soul-v2, soul-cinematic, photo-dump, retrain), `/ai-influencers*`, `/soul-v2`, `/keyframes`, `/color-presets`, `/lighting-presets`, `/camera-settings`, `/katana-presets`, `/katana-categories`, `/viral-hub`, `/reels`, `/outfits`, `/voices`, `/sounds`, `/fonts`, `/brand-kits` | Presets, references, elements |
| Community and content | `/publications*` (community trending, approved, top, model-x, like, check-likes), `/contests*`, `/contest-participations*`, `/blog/*`, `/comments`, `/karma`, `/community-presets`, `/collections` | Feed, contests, blog |
| Safety | `/antifraud/appeal`, `/jobs/{id}/report`, `/business-email-verification/*`, `/image-proxy` | Moderation and appeals |

### 3.3 Other services
See the full lists in the appendix: CMS 61, community 33, apps-marketplace 30 (+14 inferred), ai-cmo 23, skills-marketplace 18 (+7 games, inferred), series 13, score 10, meet 5, notification 4, higgsclaw-cron 2, agent-gateway 1.

Worker endpoints:
- **canvas-worker**: `/api/canvases`, `/api/flow/{id}{,/auth,/duplicate,/node-types,/nodes/from-job,/nodes/{n}/cancel,/preview,/preview/private,/run,/versions,/versions/{v},/versions/{v}/restore,/snapshot}`, and `/api/templates/{id}{,/auth,/preview,/use}`.
- **layer-worker**: `/api/layer-projects` with about 26 sub-routes, plus `/api/layer-presets/export`.
- **3d-scene-builder**: `/projects`, `/projects/{id}{,/revisions,/revisions/{r},/scene-operations,/scene-assets/{a},/entity-leases,/entity-leases/release,/event-ticket,/collaboration,/glb}`.
- **quiz-cs**: 4 endpoints. **dam-editor-worker**: 3. **phonecam**: 3.

---

## 4. Realtime channels

| Channel | Transport | Host / path | Events and messages | Evidence |
|---|---|---|---|---|
| **Notification and realtime bus** | **SSE** (`event-source-polyfill`, so `Authorization: Bearer` headers can be sent, `withCredentials:true`, `heartbeatTimeout` 60 s) | `https://fnf-api-gw.higgsfield.ai/fnf-notification/notifications/stream` | Named SSE events, each with a JSON `data` payload. 60+ distinct names, including `job:status_changed`, `folder:create`, `folder:delete`, `folder:rename`, `folder:update`, `folder:share`, `folder:unshare`, `folder:job_create`, `folder:job_completed`, `folder:job_remove`, `folder:job_review_status`, `folder:presence`, `folder:call_status_updated`, `fnf.folder.updated`, `fnf.folder.visibility.updated`, `folder_collaborator:{joined,removed,banned,role_updated}`, `folder_access_request:*`, `folder_permission_request:*`, `folder_role_request:*`, `folder_ownership:transferred`, `reference_element:{created,updated,linked_to_folder,unlinked_from_folder}`, `comment_{created,updated,deleted,resolved,unresolved,reaction_updated}`, `asset_like`, `asset:unlike`, `notification_removed`, `credit_request_resolved`, `achievement_unlocked`, `rewards_{live,deadline,unavailable,unlock_scheduled}`, `reward_{claimable,revoked}`, `grand_prize_claimable`, `campaign_unlocked`, `all_unlim_sale`, `brand_kit:progress`, `marketing_studio_extract:completed`, `project_preview:status_changed`, `project_publication:updated`, `failed_jobs:deleted`, `chat_state_changed`, `agent_update` | `pnaLFEMlpfjwhvp7.js` (client), `TDHytUTtJ6Q_6Q_8.js` (URL), plus subscribers across about 25 chunks |
| Bus client behaviour | One pooled connection per URL, freed after a 1 s grace period. Reconnect backoff: base 1 s, max 30 s, ±50 % jitter. After 3 consecutive 401 or 403 responses the token is refreshed and the max delay becomes 5 min. Token fetch timeout 15 s. Reconnects on `online`, `visibilitychange`, `pageshow` and bfcache restore. A global kill switch exists (`setSseDisabled`). | | | OBSERVED |
| Agent chat event stream | SSE plus JSON polling fallback | `fnf-notification` `/chats/{chatId}/resume-events?first_id=&turn_id=&after=` (Accept `text/event-stream`) and `/chats/{chatId}/poll-events?…&from=` | Streaming agent turns for Supercomputer chats | `_EK1jdbX9rGSLtEu.js`, `WD-8yPy3QNZ7ZOYj.js` (`notificationBaseUrl:_e(``)`, `stream:{credentials:`include`…}`) |
| Ads Studio brand events | SSE through fetch with a ReadableStream (`last-event-id` resume, `cache-control: no-cache`) | `fnf-ai-cmo` `/v1/ads/brands/{id}/events` | `tick` (seq) and brand research or generation progress | `Na3ndUcQsLdPM6k4.js` |
| Flow canvas collaboration | **WebSocket**, binary by default with `?format=json` optional, ticket auth through `?ticket=` | `wss://canvas-worker.higgsfield.ai/api/flow/connect/{id}`, `…/api/templates/{id}/connect` | Protocol UNKNOWN (binary) | `zU2Fxb7vqXsC5tXd.js` |
| fable-sync project sync | **WebSocket** with a JSON protocol, max 1 MiB request and 4 MiB message. An offline outbox in IndexedDB is serialised with `navigator.locks` (`fable-sync:<id>:…`). | `wss://sync.higgsfield.ai/p/{projectId}/sync/socket` | Client sends `{type:'auth',protocol:1,token}` and `{type:'request',…}`, with edit kinds `edit`, `undo`, `redo`. Server sends `ready`, `response`, `commits`, `error`. | `bZ-A2wP3qUpdXXO8.js` |
| 3D scene project events | **WebSocket** after `POST /projects/{id}/event-ticket`; reconnect backoff up to 15 s | `wss://3d-scene-builder.higgsfield.ai/projects/{id}/events?ticket=` | `presence.{snapshot,joined,left,updated}`, `entity.lease.{acquired,released,snapshot}`, `entity.transform.preview(.cancelled/.rejected)`, `scene.operation.{committed,conflicted}`. Client sends `presence.update` and transform previews. | `ZNFnXTQOl03uI60I.js` |
| Brief collaborative editor | **WebSocket** with a ticket from `/brief/{id}/auth` | `wss://dam-editor-worker.higgsfield.ai/brief/connect` | UNKNOWN | `ApFbxvncd3YcJciZ.js` |
| Phone camera | **WebSocket** | `wss://phonecam-web-dev.anwar-695.workers.dev/ws?room=&role=host&ticket=` | JSON frames: `motion`, `recording`, `lens`, `camera-switch`, `shading`, `map`, `quality`; backpressure check `bufferedAmount<65536` | `wLKBwc3XA2p5EM1o.js` |
| Folder audio rooms | WebRTC through **Cloudflare RealtimeKit / Dyte SDK** (its own `wss://<edge>/ws`) | Token from `GET fnf-meet /folders/{id}/audio/token` | Room join and leave, participants | `Lh5cPqMMQm4Byhwo.js`, `ZECI8s_dwDxymZdy.js` |
| Quiz | `POST /v3/quizzes/{id}/connect` (REST "connect", not a socket) | gateway | n/a | `em01-NqS6P3GybHs.js` |
| Polling | React Query `refetchInterval` in about 82 places, mostly "poll while status is not terminal" (jobs, previews, apps status, chats) plus `POST /jobs/status-batch` | gateway | n/a | various |
| socket.io / engine.io | Belongs only to the **Nutrient PDF SDK** (`uZmL358GHOgrIrIs.js`). Not used for Higgsfield backends. | n/a | n/a | OBSERVED |

---

## 5. Unknowns and caveats
- Request and response schemas are mostly unknown. Only a handful of field names are visible, such as `{params, client_meta}`, `{ids}`, `detail`, `error_type` and `has_more` / `cursor`.
- HTTP methods are missing for about 53 % of the unique paths.
- The canvas-worker and dam-editor WebSocket payload formats were not decoded.
- `fnf-campaign-api`, `fnf-aitys`, `creator-hub-chat` and `fnf-device-auth` bases are configured but have no call sites in the client bundle. They are probably used by SSR, the CLI or MCP.
- Path placeholders `{}` lose parameter names. Some catalogue entries may be false positives where a minified local variable shadowed a helper name. Obvious junk was filtered out.

---

## Appendix A: full endpoint catalogue (auto-generated from `tools/endpoints-uniq.tsv`)

Format: `METHOD path`. The method is shown only when it was observed. Source function names come from facade chunks where available.

### fnf (833 unique paths)

- **/** — `/`
- **/access** — `GET /access`; `/access/{}`; `PATCH /access/folder/{}/permissions`; `PUT/DELETE /access/folder/{}/permissions/roles/{}/{}`; `/access/folder/{}/permissions/users/{}`
- **/affiliate** — `GET/POST/PATCH /affiliate/application`; `GET /affiliate/dashboard-link`
- **/ai-influencers** — `/ai-influencers`; `/ai-influencers/{}`; `/ai-influencers/{}/touch`; `/ai-influencers/{}/trace`
- **/antifraud** — `POST /antifraud/appeal`
- **/assets** — `/assets` (deleteAssets, getAssetsByCategory); `/assets/{}/detail` (getAssetDetails, getSharedAssetDetails); `/assets/{}/public` (getPublicAssetDetails); `/assets/count` (getAssetCategoriesCount); `/assets/favourites` (getAssetsFavourite); `/assets/favourites/feed`; `/assets/favourites/job-sets` (getJobSetFavourites); `/assets/favourites/keywords`; `/assets/keywords`; `/assets/members/{}/detail`; `/assets/publish` (publishAssets)
- **/audio** — `POST/GET /audio`; `POST /audio/{}/hide`; `POST /audio/{}/upload`; `DELETE /audio/batch`
- **/auto-top-ups** — `GET /auto-top-ups/invoices`; `POST /auto-top-ups/retry-payment`
- **/avatar-presets** — `/avatar-presets`; `/avatar-presets/{}`
- **/avatars** — `/avatars`; `/avatars/{}`
- **/banner** — `/banner/settings`; `POST /banner/settings/{}`
- **/beat-fit-references** — `/beat-fit-references`; `/beat-fit-references/{}`
- **/blog** — `/blog/{}/posts`; `/blog/{}/posts/{}`; `POST /blog/posts`; `PATCH/DELETE /blog/posts/{}`; `PUT/DELETE /blog/posts/{}/like`; `POST /blog/posts/{}/publish`; `POST /blog/posts/{}/review/cancel`; `POST /blog/posts/{}/unpublish`; `POST /blog/posts/{}/view`; `PUT /blog/posts/pinned-order`
- **/boards** — `/boards/{}/jobs`
- **/brand-kits** — `POST /brand-kits`; `DELETE/PUT /brand-kits/{}`; `POST /brand-kits/scrap`
- **/business-email-verification** — `POST /business-email-verification/claim`; `GET /business-email-verification/status`; `POST /business-email-verification/submit`
- **/business-unlim** — `/business-unlim/state`; `POST /business-unlim/verification/confirm`; `POST /business-unlim/verification/submit`
- **/camera-settings** — `/camera-settings`; `/camera-settings/{}`; `/camera-settings/recommended`
- **/card-verification** — `/card-verification/{}`
- **/cashback-challenge** — `GET /cashback-challenge`; `POST /cashback-challenge/accept`; `POST /cashback-challenge/dismiss`
- **/chains** — `/chains/beat-fit-nano-banana`; `POST /chains/cinematic-video-editor`; `POST /chains/draw-to-video`; `POST /chains/draw-to-video/cost`; `POST /chains/dubbing`; `/chains/game-character-creator`; `/chains/link-to-ad`; `POST /chains/mixed-media`; `POST /chains/mixed-media-preview`; `POST /chains/motion-control`; `/chains/outfit-matchcut`; `/chains/seedance-eye-mask-sam`; `/chains/sticker-matchcut`; `POST /chains/voice-change`
- **/churnkey** — `GET /churnkey/auth`
- **/claudesfield** — `/claudesfield/attachments`; `POST /claudesfield/chats`; `GET /claudesfield/chats/{}`; `POST /claudesfield/chats/{}/command`; `POST /claudesfield/chats/{}/config`; `GET /claudesfield/chats/{}/credits`; `POST /claudesfield/chats/{}/messages`; `POST /claudesfield/chats/{}/mute`; `POST /claudesfield/chats/{}/read`; `/claudesfield/chats/{}/suggestions`; `POST /claudesfield/chats/prewarm`; `GET /claudesfield/connector/catalog`; `POST /claudesfield/connector/connect`; `GET /claudesfield/connector/connections`; `GET/DELETE /claudesfield/connector/connections/{}`; `/claudesfield/folders/{}/chats`; `/claudesfield/models`
- **/collections** — `/collections/{}`
- **/color-presets** — `/color-presets`; `/color-presets/{}`; `POST /color-presets/{}/{}`; `/color-presets/manual`; `/color-presets/name`; `/color-presets/pinned`; `/color-presets/with-presets`
- **/comments** — `/comments`; `/comments/{}`; `/comments/{}/reactions`; `/comments/{}/resolve`
- **/community** — `/community/discovery/creators`; `/community/discovery/creators/favourites`; `/community/discovery/header`
- **/community-presets** — `POST /community-presets/{}/report`
- **/concurrent-boost-credits** — `POST /concurrent-boost-credits/disable`; `POST /concurrent-boost-credits/enable`; `GET /concurrent-boost-credits/products`; `POST /concurrent-boost-credits/purchase`; `GET /concurrent-boost-credits/state`
- **/connectors** — `/connectors`; `GET/DELETE /connectors/{}`; `POST /connectors/{}/reconnect`
- **/contest-participations** — `POST /contest-participations`; `PUT /contest-participations/{}`; `/contest-participations/deadline-announcement`; `/contest-participations/deadline-announcement/seen`; `/contest-participations/publications/{}`; `/contest-participations/publications/counters`; `/contest-participations/shortlist-announcement`; `POST /contest-participations/shortlist-announcement/seen`
- **/contest-participations{}** — `/contest-participations{}`
- **/contests** — `/contests`; `/contests/{}`; `/contests/{}/submissions`; `/contests/{}/submissions/{}`; `/contests/{}/submissions/me`; `/contests/submissions/{}/comments`; `POST/DELETE /contests/submissions/{}/reaction`; `/contests/submissions/{}/report`; `/contests/submissions/comments/{}`; `POST/DELETE /contests/submissions/comments/{}/reaction`; `/contests/submissions/comments/{}/report`; `/contests/submissions/metrics`; `/contests/trending`
- **/custom-references** — `/custom-references`; `DELETE/PUT /custom-references/{}`; `/custom-references/{}/move`; `GET /custom-references/details/{}`; `POST /custom-references/name`; `POST /custom-references/photo-dump`; `POST /custom-references/retrain`; `POST /custom-references/retrain-with-photo-dump`; `/custom-references/soul-v2-preset`; `/custom-references/v2`
- **/cutups** — `DELETE /cutups/sessions/{}/clips/{}`
- **/datetime-settings** — `/datetime-settings`
- **/discord** — `POST /discord/exchange`; `GET /discord/oauth/start`; `GET /discord/status`; `POST /discord/unlink`
- **/emails** — `POST /emails/redeem`
- **/favourites** — `/favourites/like` (likeAssets); `/favourites/liked-by/v2`; `/favourites/unlike` (unlikeAssets)
- **/feature** — `/feature`
- **/feedback** — `GET /feedback/nps`; `POST /feedback/nps/{}`; `POST /feedback/nps/{}/reset`; `POST /feedback/nps/{}/skip`
- **/file** — `POST /file`; `POST /file/{}/upload`; `/file/accessible`
- **/folder** — `/folder/{}/preview` (getFolderPreviewDetails)
- **/folder-items** — `/folder-items`; `/folder-items/{}`; `/folder-items/{}/folders`; `PUT /folder-items/{}/review-status`; `PUT /folder-items/bulk/review-status`
- **/folders** — `/folders`; `/folders/{}`; `/folders/{}{}`; `POST /folders/{}/{}`; `/folders/{}/access-requests`; `/folders/{}/add` (addAssetsToFolder, addElementsToFolder); `/folders/{}/assets` (getAssetsByFolder); `/folders/{}/children`; `/folders/{}/collaborators`; `/folders/{}/collaborators/{}`; `/folders/{}/collaborators/{}/ban`; `/folders/{}/collaborators/v2`; `/folders/{}/compose-view`; `/folders/{}/credit-limit`; `/folders/{}/delete-preview`; `/folders/{}/duplicate`; `/folders/{}/info`; `/folders/{}/invite-link`; `/folders/{}/invites`; `/folders/{}/invites/{}`; `/folders/{}/invites/deny`; `/folders/{}/items/gallery`; `/folders/{}/items/liked-by`; `/folders/{}/items/locate`; `/folders/{}/items/v2`; `/folders/{}/jobs`; `/folders/{}/join`; `/folders/{}/keywords`; `GET /folders/{}/members/{}`; `GET /folders/{}/members/v2`; `/folders/{}/migrate`; `/folders/{}/move` (moveAssetsToFolder); `POST /folders/{}/permission-requests`; `/folders/{}/pin`; `POST /folders/{}/presence`; `PUT /folders/{}/production-grant-offers/{}/decision`; `/folders/{}/public-assets` (getPublicAssetsByFolder); `/folders/{}/publish`; `POST /folders/{}/publish/cancel`; `POST /folders/{}/publish/confirm`; `POST /folders/{}/publish/description`; `/folders/{}/publish/nsfw-media`; `POST /folders/{}/publish/preview`; `/folders/{}/relocate`; `/folders/{}/remove` (removeAssetsFromFolder); `/folders/{}/requests`; `POST /folders/{}/requests/{}/approve`; `POST /folders/{}/requests/{}/deny`; `/folders/{}/role-requests`; `/folders/{}/stats`; `POST /folders/{}/submit`; `/folders/{}/transfer`; `/folders/{}/transfer-ownership`; `/folders/{}/trash`; `/folders/{}/trash/count`; `/folders/{}/trash/empty`; `/folders/{}/unpin`; `/folders/{}/usage`; `/folders/{}/usage/breakdown`; `/folders/{}/usage/members`; `/folders/accessible`; `/folders/invite/{}/join`; `GET /folders/pinned`; `/folders/reorder`; `/folders/reorder/v2`; `/folders/shared`
- **/fonts** — `/fonts`; `/fonts/{}/upload`
- **/free-trial** — `/free-trial/cancel`; `/free-trial/convert`; `/free-trial/downgrade-plan`; `/free-trial/start`; `/free-trial/status`
- **/freegen-campaigns** — `POST /freegen-campaigns/card-bonus/setup-intent`; `/freegen-campaigns/card-bonus/status`; `/freegen-campaigns/checkout`; `/freegen-campaigns/status`
- **/generate** — `/generate/{}/{}/info`
- **/generation-activity** — `/generation-activity`; `POST /generation-activity/notice-shown`
- **/generation-seconds** — `/generation-seconds/packs`; `/generation-seconds/purchase`
- **/gifts** — `/gifts`; `/gifts/{}`; `/gifts/{}/assign`; `/gifts/{}/claim`; `/gifts/batch`; `/gifts/batch/preview`; `POST /gifts/concurrent-boost/instant`; `GET /gifts/packages`; `POST /gifts/packages/instant`; `/gifts/status`
- **/image-proxy** — `/image-proxy`
- **/input-audios** — `GET /input-audios/{}`
- **/input-images** — `/input-images/{}`
- **/input-videos** — `/input-videos/{}`
- **/job-sets** — `GET /job-sets/{}` (getJobSetById); `POST /job-sets/{}/hide`; `POST /job-sets/{}/like`; `POST/GET /job-sets/costs`
- **/jobs** — `/jobs` (getJobs, getPersonalJobs); `GET/DELETE /jobs/{}`; `PUT /jobs/{}/{}`; `PUT /jobs/{}/cancel`; `/jobs/{}/edit-image`; `POST /jobs/{}/ip-detect`; `GET /jobs/{}/publication`; `/jobs/{}/publish`; `POST /jobs/{}/report`; `GET /jobs/{}/shots`; `/jobs/{}/status`; `/jobs/{}/trace` (getAssetTrace); `/jobs/{}/track` (trackJobDownload); `/jobs/{}/unpublish`; `POST /jobs/{}/view`; `POST /jobs/{}/viewed`; `/jobs/accessible` (getAccessibleJobs); `POST /jobs/canvas`; `POST /jobs/canvas-soul`; `POST /jobs/character-swap/v2`; `PUT /jobs/deepfake/confirm-consent`; `POST /jobs/face-swap`; `POST /jobs/flux-2`; `POST /jobs/flux-kontext`; `POST /jobs/hummingbird`; `POST /jobs/image2video`; `POST /jobs/image2video-extend-v2`; `POST /jobs/image2video-mix`; `POST /jobs/infinite-talk`; `/jobs/ip-detection`; `POST /jobs/kling`; `POST /jobs/kling-lipsync`; `/jobs/kling-omni-flf`; `POST /jobs/kling-omni-image`; `/jobs/kling-omni-image-reference`; `POST /jobs/kling-speak`; `/jobs/kling-transition`; `/jobs/kling-video-edit`; `/jobs/kling-video-reference`; `POST /jobs/kling2-6`; `POST /jobs/kling2-6-lipsync`; `/jobs/marketing-storyboard/{}/versions`; `/jobs/marketing-storyboard/{}/versions/{}`; `POST /jobs/minimax-hailuo`; `POST /jobs/nano-banana`; `POST /jobs/nano-banana-2`; `POST /jobs/nano-banana-2-ai-stylist`; `POST /jobs/nano-banana-2-game-dump`; `POST /jobs/nano-banana-2-outfit-collage`; `POST /jobs/nano-banana-2-relight`; `POST /jobs/nano-banana-2-relight/batch`; `POST /jobs/nano-banana-2-shots`; `POST /jobs/nano-banana-2-skin-enhancer`; `POST /jobs/nano-banana-2-upscale`; `POST /jobs/nano-banana-2-zooms`; `POST /jobs/nano-banana-animal`; `POST /jobs/nano-banana-clothing-cleaner`; `POST /jobs/nano-banana/batch`; `POST /jobs/openai-hazel`; `POST /jobs/openai-hazel-mini`; `POST /jobs/qwen-camera-control-v2`; `POST /jobs/qwen-camera-control-v2/batch`; `POST /jobs/seedance`; `PUT /jobs/seedance/confirm-rights/batch` (confirmJobIpRightsAttestationBatch); `POST /jobs/seedream`; `POST /jobs/seedream-v4-5`; `/jobs/showcase/{}` (getSeedanceMovies); `POST /jobs/status-batch`; `POST /jobs/sync-so`; `POST /jobs/text2image`; `POST /jobs/text2image-gpt`; `POST /jobs/text2image-soul`; `POST /jobs/text2image-soul/batch`; `POST /jobs/text2speech`; `/jobs/topaz-image`; `/jobs/topaz-image-generative`; `/jobs/topaz-video`; `POST /jobs/v2/{}`; `POST /jobs/v2/{}/estimate`; `POST /jobs/v2/ai_influencer_sheet`; `POST /jobs/v2/brain_activity`; `POST /jobs/v2/character_sheet`; `POST /jobs/v2/cinematic_studio_2_5`; `POST /jobs/v2/cinematic_studio_3_0`; `POST /jobs/v2/cinematic_studio_image`; `POST /jobs/v2/cinematic_studio_image_grid`; `POST /jobs/v2/cinematic_studio_video_3_5`; `POST /jobs/v2/cinematic_studio_video_v2`; `POST /jobs/v2/clipify/estimate`; `POST /jobs/v2/flux_video_upscale`; `POST /jobs/v2/image_auto`; `POST /jobs/v2/marketing_studio_image`; `POST /jobs/v2/nano_banana_2_lite`; `POST /jobs/v2/nano_banana_flash`; `POST /jobs/v2/next_shots`; `POST /jobs/v2/reels_studio_clip`; `POST /jobs/v2/seedream_5_0_flash`; `POST /jobs/v2/seedream_v5_lite`; `POST /jobs/v2/seedream_v5_pro`; `POST /jobs/v2/soul_location`; `POST /jobs/v2/video_character_asset`; `POST /jobs/veo3`; `POST /jobs/veo3-1`; `POST /jobs/veo3-1-speak`; `POST /jobs/veo3-speak`; `/jobs/video-deflicker`; `/jobs/video-upscale`; `POST /jobs/viral-transform-image`; `/jobs/viral-transform-video`; `/jobs/wan2-2-animate-faceswap`; `/jobs/wan2-2-animate-revoice`; `/jobs/wan2-2-animate-v3`; `POST /jobs/wan2-2-image`; `POST /jobs/wan2-2-video`; `POST /jobs/wan2-5-speak`; `POST /jobs/wan2-5-video`; `POST /jobs/wan2-6`; `POST /jobs/z-image`
- **/karma** — `/karma/balance`; `POST /karma/convert`; `/karma/convert/state`
- **/katana** — `POST /katana/community/submit`
- **/katana-presets** — `/katana-presets/{}/compose`; `/katana-presets/{}/like`; `POST /katana-presets/{}/report`; `/katana-presets/likes`
- **/keyframes** — `/keyframes/v3`; `/keyframes/v3/{}`; `POST /keyframes/v3/auto`; `POST /keyframes/v3/manual`; `POST /keyframes/v3/photo-dump`; `POST /keyframes/v3/photo-dump-pack`
- **/kling-elements** — `/kling-elements/{}`
- **/lighting-presets** — `/lighting-presets`; `/lighting-presets/{}`; `POST /lighting-presets/{}/{}`; `/lighting-presets/pinned`; `/lighting-presets/with-presets`
- **/marketing-studio** — `/marketing-studio/ad-references`; `PUT /marketing-studio/ad-references/{}`; `/marketing-studio/avatars`; `PUT/DELETE /marketing-studio/avatars/{}`; `POST /marketing-studio/avatars/batch`; `POST /marketing-studio/avatars/extract`; `PUT /marketing-studio/avatars/presets/{}/pin`; `/marketing-studio/brand-kits`; `PUT/DELETE /marketing-studio/brand-kits/{}`; `/marketing-studio/products`; `DELETE/PUT /marketing-studio/products/{}`; `POST /marketing-studio/products/extract`; `POST /marketing-studio/products/scrap`; `/marketing-studio/setup`; `/marketing-studio/setup/hooks`; `/marketing-studio/setup/pin`; `/marketing-studio/setup/settings`; `/marketing-studio/v2/costs`; `POST /marketing-studio/v2/costs/quote`; `/marketing-studio/webproducts`; `PUT/DELETE /marketing-studio/webproducts/{}`; `/marketing-studio/webproducts/manual`
- **/media** — `POST /media`; `GET /media/{}`; `GET /media/{}/detail`; `/media/{}/ip-check`; `POST /media/{}/upload`; `/media/accessible`; `/media/anon`; `DELETE/POST /media/batch`; `/media/color-grading`; `POST /media/status`
- **/meme-generator** — `GET /meme-generator`; `POST /meme-generator/create-phrases/{}`
- **/mixed-media** — `GET/POST /mixed-media/configs`; `DELETE /mixed-media/configs/{}`
- **/motion-samples** — `/motion-samples`; `/motion-samples/{}`
- **/motions** — `/motions`; `/motions/{}`
- **/no-activity** — `GET /no-activity`; `POST /no-activity/close`; `POST /no-activity/grant`
- **/onboarding-tasks** — `/onboarding-tasks`; `POST /onboarding-tasks/{}/claim`
- **/outfit-collages** — `/outfit-collages`; `/outfit-collages/{}`
- **/outfits** — `/outfits`; `/outfits/{}`; `/outfits/characters`
- **/paid-concurrency-ab** — `/paid-concurrency-ab`
- **/photo-dump** — `GET /photo-dump/packs`
- **/project** — `/project` (getJobSets)
- **/project-previews** — `POST /project-previews`; `/project-previews/{}`
- **/project-publications** — `/project-publications`; `/project-publications/{}`; `/project-publications/{}/{}`; `/project-publications/{}/report`; `/project-publications/categories`; `/project-publications/favourites`; `/project-publications/recommended`; `/project-publications/trending`
- **/promotion** — `POST /promotion/code`
- **/publications** — `/publications/{}` (getPublicationAssetDetails, getPublicationById); `POST/DELETE /publications/{}/like` (likePublication, unlikePublication); `/publications/check-likes` (checkPublicationLikes); `/publications/community/approved` (getPublications); `/publications/community/favourites`; `/publications/community/model-x` (getModelXPublications); `/publications/community/trending` (getPublications); `/publications/community/trending/top` (getTopPublications)
- **/recraft-styles** — `POST /recraft-styles`; `PATCH/DELETE /recraft-styles/{}`
- **/reels** — `POST /reels/generate`; `GET /reels/presets`; `POST /reels/presets/user`; `PATCH/DELETE /reels/presets/user/{}`; `GET /reels/sessions`; `GET/DELETE/PATCH /reels/sessions/{}`; `POST /reels/sessions/{}/segments/{}/primary`; `POST /reels/sessions/{}/stitch`
- **/reference-elements** — `/reference-elements` (createReferenceElement, getReferenceElement); `/reference-elements/{}` (deleteReferenceElement, pinReferenceElement); `/reference-elements/{}/enable-audio`; `/reference-elements/{}/folders` (addReferenceElementToFolder); `/reference-elements/{}/folders/{}` (removeReferenceElementFromFolder); `/reference-elements/{}/ip-detect`; `/reference-elements/{}/move` (moveReferenceElement); `/reference-elements/{}/workspaces`; `/reference-elements/{}/workspaces/{}` (patchReferenceElementWorkspace); `/reference-elements/job/{}` (getReferenceElementByJob); `/reference-elements/voice`; `/reference-elements/voices`
- **/reference-media** — `POST /reference-media`
- **/referral** — `GET/POST/PATCH /referral`; `POST /referral/claim`
- **/referral-campaigns** — `GET /referral-campaigns`
- **/restyle** — `POST /restyle/presets/custom`; `PATCH/DELETE /restyle/presets/custom/{}`
- **/search** — `/search`; `/search/chats`
- **/seedance-2-5-retention-offer** — `/seedance-2-5-retention-offer`
- **/sharing-configs** — `GET/PATCH /sharing-configs`; `/sharing-configs/{}`
- **/soul-samples** — `/soul-samples`
- **/soul-v2** — `/soul-v2/custom-presets`; `/soul-v2/custom-presets/{}`; `/soul-v2/custom-presets/details/{}`; `/soul-v2/presets`; `/soul-v2/presets/{}`; `/soul-v2/presets/{}/share`; `/soul-v2/presets/shared/{}`; `/soul-v2/presets/shared/{}/bind`
- **/sounds** — `/sounds`; `/sounds/{}`
- **/sso** — `/sso/check`
- **/styles** — `/styles`; `/styles/{}`
- **/subscriptions** — `POST /subscriptions/adjustable-credits`; `/subscriptions/bundle/all-unlim/status`; `POST /subscriptions/bundle/purchase/instant`; `/subscriptions/bundle/purchase/instant/seedance-unlimited`; `POST /subscriptions/bundle/purchase/instant/unlim`; `/subscriptions/bundle/seedance-unlimited`; `GET /subscriptions/bundle/unlim-catalog`; `GET /subscriptions/bundle/unlim/{}`; `POST /subscriptions/cancel`; `POST /subscriptions/cancel-upsell`; `POST /subscriptions/cancellation-reminder`; `POST /subscriptions/change`; `GET /subscriptions/invoices`; `POST /subscriptions/packages/instant`; `POST /subscriptions/pause`; `/subscriptions/plan-cards`; `POST /subscriptions/plans/setup/pair`; `POST /subscriptions/renew`; `POST /subscriptions/resume`; `POST /subscriptions/team/cancel-request`; `POST /subscriptions/update`; `GET /subscriptions/v2/adjustable-credits`; `/subscriptions/v2/compare`; `GET /subscriptions/v2/packages`; `GET /subscriptions/v2/plans`
- **/supercomputer** — `GET /supercomputer/chats`; `/supercomputer/chats{}`; `POST /supercomputer/chats/{}/share/refresh`; `GET /supercomputer/memories`; `DELETE /supercomputer/memories/{}`; `/supercomputer/onboarding`; `POST /supercomputer/pins`; `/supercomputer/shared/{}`; `/supercomputer/shared/{}/attachments`; `/supercomputer/shared/{}/files`; `/supercomputer/shared/{}/jobs`; `/supercomputer/shared/{}/jobs/{}`; `/supercomputer/shared/{}/messages`; `/supercomputer/shared/{}/remix`; `/supercomputer/shared/by-chat/{}`; `DELETE /supercomputer/storage/app-folders`; `POST/DELETE /supercomputer/storage/extra`; `POST /supercomputer/storage/extra/decrease`; `/supercomputer/storage/files`; `GET /supercomputer/storage/files/download`; `GET /supercomputer/storage/usage`
- **/surveys** — `/surveys/{}`; `PUT /surveys/{}/answers`; `POST /surveys/{}/complete`; `/surveys/{}/eligibility`; `POST /surveys/{}/skip`
- **/telegram-integrations** — `POST/GET /telegram-integrations`; `DELETE /telegram-integrations/{}`; `POST /telegram-integrations/{}/mute`; `POST /telegram-integrations/{}/regenerate-claim-token`
- **/test-presets** — `GET /test-presets`
- **/trash** — `/trash/delete-forever`; `/trash/entries/{}`; `/trash/entries/{}/contents`; `/trash/entries/{}/delete-forever`; `/trash/entries/{}/items/{}`; `/trash/entries/{}/restore`; `/trash/library`; `/trash/library/count`; `/trash/library/delete-forever`; `/trash/library/empty`; `/trash/library/restore`; `/trash/library/restore-all{`; `/trash/restore`
- **/two-day-offer** — `/two-day-offer`; `/two-day-offer/link`; `/two-day-offer/mark-modal-viewed`; `/two-day-offer/purchase`
- **/unlim-bundle-modal** — `GET /unlim-bundle-modal`; `POST /unlim-bundle-modal/shown`
- **/unlims** — `/unlims/history`; `/unlims/usage`
- **/upgrade-nudges** — `/upgrade-nudges`; `POST /upgrade-nudges/seen`; `POST /upgrade-nudges/signals`
- **/uploads** — `POST /uploads/multipart/abort`; `POST /uploads/multipart/complete`; `POST /uploads/multipart/init`; `POST /uploads/multipart/part-urls`
- **/user** — `GET /user`; `/user/{}`; `GET /user/{}/compact`; `/user/{}/stats`; `GET /user/{}/v2/publications`; `GET /user/{}/v2/publications/pinned`; `PUT /user/auto-publish`; `POST /user/consents/accept`; `POST /user/credit-package-chase`; `/user/credit-package-discount`; `/user/email-retention`; `POST /user/email-retention/offers/{}/actions`; `GET /user/features`; `GET /user/free-gens`; `/user/free-gens/v2`; `/user/generation-seconds`; `/user/lang`; `GET /user/meta`; `GET /user/offers`; `POST /user/offers/{}/expire`; `POST /user/offers/{}/skip`; `GET/POST /user/offers/debug/{}`; `/user/personal-promo`; `POST /user/personal-promo/chase`; `POST /user/personal-promo/restore`; `/user/personal-promo/tasks`; `POST /user/personal-promo/tasks/{}/complete`; `PUT /user/personal-promo/viewed`; `POST /user/pricing-page-view`; `/user/profile`; `PUT /user/profile/avatar`; `POST /user/profile/avatar/randomize`; `/user/profile/pinned-publications`; `POST /user/referral-touches`; `POST /user/session-evaluation`; `GET /user/sessions`; `POST /user/sessions/{}/revoke`; `POST /user/sessions/revoke-all`; `/user/settings`; `POST /user/settings/audio-consent`; `POST /user/settings/character-sheets-consent`; `POST /user/settings/media-consent`; `POST /user/settings/supercomputer-llm-consent`; `PUT /user/suspend`; `GET /user/suspend/allowed`; `PUT /user/unsuspend`; `GET/POST /user/upsell-experiment/debug`
- **/v1** — `GET /v1/onboarding`; `POST /v1/onboarding/animate`; `POST /v1/onboarding/complete`; `POST /v1/onboarding/generate`; `POST /v1/onboarding/skip`; `GET/POST /v1/onboarding/user-mobile-gate`; `GET/POST /v1/touring`; `GET/PATCH /v1/touring/{}`; `POST /v1/touring/{}/complete`; `POST /v1/touring/{}/generate`; `POST /v1/touring/skip`
- **/v2** — `POST /v2/auto-top-ups/disable`; `POST /v2/auto-top-ups/dry-run`; `POST /v2/auto-top-ups/retry-payment`; `GET/POST /v2/auto-top-ups/settings`; `POST /v2/auto-top-ups/viewed`; `/v2/element-folders`; `/v2/element-folders/{}`; `/v2/element-folders/{}/pin`; `POST /v2/quizzes`; `PUT /v2/quizzes/{}`; `POST /v2/quizzes/{}/complete`; `GET /v2/quizzes/user`; `/v2/reference-elements`; `/v2/reference-elements/{}`; `/v2/reference-elements/{}/duplicate`; `/v2/reference-elements/{}/folders/{}`; `/v2/reference-elements/{}/force-duplicate`; `/v2/reference-elements/{}/move`; `/v2/reference-elements/{}/pin`; `/v2/reference-elements/{}/properties`; `/v2/reference-elements/{}/review-status`; `/v2/reference-elements/bulk/delete`; `/v2/reference-elements/bulk/duplicate`; `/v2/reference-elements/bulk/move`; `/v2/reference-elements/bulk/remove`; `/v2/reference-elements/bulk/review-status`; `/v2/reference-elements/import/drafts`; `/v2/reference-elements/import/drafts/{}`; `/v2/reference-elements/import/drafts/{}/commit`; `/v2/reference-elements/picker`; `/v2/reference-elements/picker/groups`; `/v2/reference-elements/pinned`; `/v2/reference-elements/properties/keys`; `/v2/reference-elements/share`; `/v2/reference-elements/shared/{}`; `/v2/reference-elements/shared/{}/save`
- **/v3** — `POST /v3/quizzes`; `PATCH/GET /v3/quizzes/{}`; `POST /v3/quizzes/{}/complete`; `POST /v3/quizzes/{}/connect`; `GET /v3/quizzes/me/triggers`
- **/video** — `POST /video`; `DELETE/GET /video/{}`; `/video/{}{}`; `/video/{}/ip-check`; `GET /video/{}/meta`; `/video/{}/upload`; `POST /video/{}/upload{}`; `/video/accessible`; `DELETE /video/batch`
- **/video-storyboards** — `POST /video-storyboards`
- **/video-trims** — `POST /video-trims`; `POST /video-trims/save`
- **/viral-hub** — `/viral-hub/presets`; `POST /viral-hub/renders`; `/viral-hub/types`
- **/voices** — `/voices`; `/voices/{}`
- **/watchwood** — `POST /watchwood/check`
- **/workflows** — `/workflows`
- **/workspace-call** — `/workspace-call`; `POST /workspace-call/{}/seen`
- **/workspaces** — `/workspaces`; `/workspaces/accessible`; `POST /workspaces/add-seats`; `PUT /workspaces/admin-capabilities`; `/workspaces/by-id`; `/workspaces/capabilities`; `/workspaces/contact-sales`; `/workspaces/contact-sales/email/validate`; `POST/DELETE /workspaces/context`; `POST /workspaces/create-checkout-session`; `/workspaces/credit-ledger/start-date`; `/workspaces/credit-ledger/usage-chart`; `GET /workspaces/credit-price`; `/workspaces/credit-spent-overview`; `/workspaces/details`; `/workspaces/downgrade-one-step`; `POST /workspaces/groups`; `PUT/DELETE /workspaces/groups/{}`; `/workspaces/groups/{}/members`; `POST /workspaces/groups/{}/members/import`; `/workspaces/groups/restrictions`; `POST /workspaces/invites`; `POST /workspaces/invites/import`; `/workspaces/invoices`; `POST /workspaces/leave`; `GET /workspaces/members`; `DELETE /workspaces/members/{}`; `PATCH /workspaces/members/{}/role`; `PATCH /workspaces/members/{}/spend-pause`; `POST /workspaces/members/{}/unlims`; `/workspaces/members/former`; `/workspaces/members/usage-stats`; `/workspaces/members/usage-stats/download`; `/workspaces/notice`; `PUT /workspaces/notice/close`; `POST /workspaces/payment-cards`; `PATCH /workspaces/payment-cards/backup`; `PATCH /workspaces/payment-cards/default`; `DELETE /workspaces/payment-cards/delete`; `/workspaces/pending-charges`; `/workspaces/pending-invoices`; `PUT /workspaces/profile`; `/workspaces/projects/usage-stats`; `GET/POST /workspaces/sso/domains`; `GET/POST /workspaces/sso/oidc`; `GET/POST /workspaces/sso/saml`; `PATCH /workspaces/sso/saml/{}`; `/workspaces/sub-workspaces`; `/workspaces/sub-workspaces/{}`; `/workspaces/sub-workspaces/{}/{}`; `POST /workspaces/sub-workspaces/{}/cancel-allocation`; `/workspaces/sub-workspaces/{}/counts`; `POST /workspaces/sub-workspaces/{}/detach`; `POST /workspaces/sub-workspaces/{}/edit-allocation`; `POST /workspaces/sub-workspaces/{}/top-up`; `/workspaces/sub-workspaces/pool`; `/workspaces/subscription`; `/workspaces/subscription-features`; `/workspaces/subscription/billing-info-link`; `DELETE /workspaces/subscription/downgrade/cancel`; `/workspaces/subscription/grace-charge-preview`; `/workspaces/subscription/portal-link`; `POST /workspaces/subscription/try-charge-then-portal-link`; `GET/PUT /workspaces/supercomputer-safety`; `POST /workspaces/transfer-ownership`; `GET /workspaces/unlim-activations`; `POST /workspaces/unlim-activations/{}`; `/workspaces/usage-overview`; `POST /workspaces/verify-payment-method`; `/workspaces/wallet`; `POST /workspaces/wallet/auto-top-up`; `POST /workspaces/wallet/auto-top-up/disable`; `POST /workspaces/wallet/auto-top-up/dry-run`; `/workspaces/wallet/auto-top-up/invoices`; `POST /workspaces/wallet/auto-top-up/retry-payment`; `POST /workspaces/wallet/purchase-credits`
- **/youtube-faceless** — `POST /youtube-faceless/channel-identity`; `/youtube-faceless/channel-identity/{}`; `/youtube-faceless/channels`; `PATCH /youtube-faceless/channels/{}`; `POST /youtube-faceless/episodes/{}/edits`; `POST /youtube-faceless/episodes/{}/edits/{}/apply`; `POST /youtube-faceless/episodes/{}/edits/{}/discard`; `POST /youtube-faceless/episodes/{}/edits/estimate`; `POST /youtube-faceless/episodes/{}/upscale`; `POST /youtube-faceless/episodes/{}/upscale/estimate`; `/youtube-faceless/hot-right-now`; `POST /youtube-faceless/topic-suggestions`
- **/{}** — `/{}/{}`; `/{}/{}/detail`; `/{}/preset-categories`; `GET /{}/presets`; `DELETE /{}/presets/{}/unpin`; `POST /{}/presets/pin`; `DELETE /{}/presets/unpin`

### fnf-notification (4 unique paths)

- **/notifications** — `GET /notifications`; `POST /notifications/{}/read`; `POST /notifications/read-all`; `/notifications/stream`

### fnf-community (33 unique paths)

- **/comments** — `/comments/{}`; `/comments/{}/vote`
- **/entities** — `/entities/{}/{}/comments`; `/entities/{}/{}/stats`; `/entities/{}/{}/view`; `/entities/{}/{}/vote`; `/entities/user_profile/{}/view`
- **/generations** — `/generations/by-ids`; `/generations/feed`; `/generations/feed/keywords`
- **/presence** — `/presence`
- **/profiles** — `/profiles/{}/subscribe`; `/profiles/{}/subscriptions-info`
- **/publications** — `/publications`; `/publications/{}` (getPublicationAssetDetails, getPublicationById); `/publications/{}/comments`; `/publications/{}/comments/{}`; `/publications/{}/comments/{}/vote`; `/publications/{}/report`; `/publications/{}/vote`; `/publications/comments/{}/report`; `/publications/feed`
- **/users** — `/users/{}/achievements`; `/users/{}/subscribe`; `/users/{}/subscribers`; `/users/{}/subscriptions`; `/users/{}/subscriptions/active`; `/users/feed`; `/users/me/achievements/{}/pin`; `POST /users/me/achievements/claim`; `/users/me/achievements/claims/{}`; `/users/me/activity`; `/users/me/profile-settings`

### fnf-series (13 unique paths)

- **/episodes** — `/episodes/{}/comments`; `/episodes/{}/reaction`; `/episodes/comments/{}`; `POST/DELETE /episodes/comments/{}/reaction`; `/episodes/comments/{}/replies`
- **/hero** — `/hero`
- **/home** — `/home`
- **/series** — `/series`; `/series/{}`; `/series/{}/subscribe`; `/series/{}/unsubscribe`; `/series/{}/vote`
- **/views** — `/views/track`

### fnf-score (10 unique paths)

- **/v1** — `/v1/karma/history`; `/v1/karma/tasks`; `POST /v1/rewards/{}/claim`; `/v1/rewards/campaign`; `/v1/rewards/summary`; `/v1/season`; `POST /v1/season/animations/{}/seen`; `POST /v1/season/debug{}`; `/v1/season/rewards/{}/claim`; `/v1/season/tasks/{}/claim`

### fnf-meet (5 unique paths)

- **/folders** — `/folders/{}/audio/token`; `POST /folders/{}/messages`; `/folders/{}/messages/{}`; `PUT /folders/{}/messages/{}/reactions`; `POST /folders/{}/messages/{}/report`

### fnf-skills-marketplace (18 unique paths)

- **/api** — `/api/v1/ai-agents` (setAgentEmployeeInstalled); `/api/v1/ai-agents/categories`; `POST /api/v1/ai-employees/instructions/enhance`; `/api/v1/ai-employees/orchestratable-skills` (setAgentEmployeeInstalled); `/api/v1/catalog/community`; `/api/v1/categories`; `POST /api/v1/skills`; `/api/v1/skills/builtin`; `/api/v1/skills/builtin/{}`; `/api/v1/skills/community`; `/api/v1/skills/community/{}`; `POST /api/v1/skills/community/{}/install`; `/api/v1/skills/personal`; `PATCH/DELETE /api/v1/skills/personal/{}`; `POST /api/v1/skills/personal/{}/publish`; `POST /api/v1/skills/personal/{}/unpublish`; `POST /api/v1/skills/preview`; `POST /api/v1/skills/upload`

### fnf-apps-marketplace (30 unique paths)

- **/api** — `/api/v1/apps/{}/og-meta`; `DELETE /api/v1/apps/community/{}` (fetchPersonalAppsPage); `GET /api/v1/apps/personal` (fetchPersonalAppsPage); `GET /api/v1/apps/personal/{}` (fetchPersonalAppsPage); `GET/POST /api/v1/apps/personal/{}/access`; `GET /api/v1/apps/personal/{}/access-requests`; `DELETE /api/v1/apps/personal/{}/access-requests/{}`; `POST /api/v1/apps/personal/{}/access-requests/{}/approve`; `PATCH/DELETE /api/v1/apps/personal/{}/access/{}`; `GET /api/v1/apps/personal/{}/code/branches`; `/api/v1/apps/personal/{}/code/commits`; `/api/v1/apps/personal/{}/code/file`; `/api/v1/apps/personal/{}/code/tree`; `POST /api/v1/apps/personal/{}/community-listing`; `GET/POST /api/v1/apps/personal/{}/custom-domains`; `GET/DELETE /api/v1/apps/personal/{}/custom-domains/{}`; `GET /api/v1/apps/personal/{}/db/tables`; `/api/v1/apps/personal/{}/db/tables/{}/rows`; `GET /api/v1/apps/personal/{}/db/tables/{}/schema`; `GET/PATCH /api/v1/apps/personal/{}/meta`; `POST /api/v1/apps/personal/{}/publish`; `PATCH /api/v1/apps/personal/{}/remix-allowed`; `POST /api/v1/apps/personal/{}/rename`; `POST /api/v1/apps/personal/{}/revert`; `GET/POST /api/v1/apps/personal/{}/secrets`; `DELETE /api/v1/apps/personal/{}/secrets/{}`; `GET /api/v1/apps/personal/{}/status`; `PUT /api/v1/apps/personal/{}/visibility`; `GET /api/v1/apps/templates`; `GET /api/v1/apps/winners`

### fnf-ai-cmo (23 unique paths)

- **/v1** — `POST /v1/ads/brands`; `DELETE /v1/ads/brands/{}`; `/v1/ads/brands/{}/events`; `POST /v1/ads/brands/{}/generate`; `POST /v1/ads/brands/{}/generate/quote`; `POST /v1/ads/brands/{}/products`; `PATCH /v1/ads/brands/{}/products/{}`; `POST /v1/ads/brands/{}/products/from-catalog`; `PATCH /v1/ads/brands/{}/profile`; `POST /v1/ads/brands/{}/research`; `POST /v1/ads/brands/manual`; `/v1/ads/creatives/concepts/{}/asset`; `/v1/ads/creatives/runs`; `/v1/ads/creatives/runs/{}`; `/v1/ads/creatives/runs/{}/assets`; `POST /v1/ads/products`; `PATCH/DELETE /v1/ads/products/{}`; `DELETE /v1/ads/products/duplicates`; `POST /v1/ads/products/from-source`; `/v1/ads/projects/{}`; `/v1/ads/projects/{}/runs`; `/v1/ads/projects/default`; `/v1/ads/quotas`

### fnf-higgsclaw-cron (2 unique paths)

- **/api** — `/api/v1/jobs`; `PATCH /api/v1/jobs/{}`

### fnf-agent-gateway (1 unique paths)

- **/slack** — `/slack/install`

### cms (61 unique paths)

- **/ai-influencer** — `/ai-influencer/video-explore/v2{}`
- **/ai-influencer-config** — `/ai-influencer-config`
- **/ai-influencer-presets** — `/ai-influencer-presets`; `/ai-influencer-presets/{}`
- **/ai-stylist** — `/ai-stylist/backgrounds`; `/ai-stylist/poses`
- **/applications** — `/applications`; `/applications/explore`
- **/blocks** — `/blocks/{}`; `/blocks/{}/items`; `/blocks/apps/items/{}`
- **/camera-movements** — `/camera-movements`
- **/camera-settings** — `/camera-settings`
- **/cards** — `/cards`
- **/cinema-studio-3-5** — `/cinema-studio-3-5/camera-settings`
- **/cinema-studio-4-0** — `/cinema-studio-4-0/creative-controls`
- **/curated-assets** — `/curated-assets`
- **/fashion-factories** — `/fashion-factories`
- **/generation-scenarios** — `/generation-scenarios/{}/models`
- **/job-set-chain-presets** — `/job-set-chain-presets`
- **/keyframe-presets** — `/keyframe-presets`
- **/kling-motion-control-presets** — `/kling-motion-control-presets`
- **/kling-motions** — `/kling-motions`; `/kling-motions/{}`
- **/kling2-6-motions** — `/kling2-6-motions`; `/kling2-6-motions/{}`
- **/link-to-ad-presets** — `/link-to-ad-presets`
- **/marketing-studio-v2** — `/marketing-studio-v2/catalog` (getMarketingStudioCatalog); `/marketing-studio-v2/categories/{}/presets`; `/marketing-studio-v2/motion-presets`
- **/minimax-motions** — `/minimax-motions`; `/minimax-motions/{}`
- **/mixed-media-presets** — `/mixed-media-presets`
- **/nano-banana** — `/nano-banana`
- **/nano-banana2-game-dump-presets** — `/nano-banana2-game-dump-presets`
- **/nano-banana2-outfit-collage-presets** — `/nano-banana2-outfit-collage-presets`
- **/notices** — `/notices`
- **/seedance-2-0** — `/seedance-2-0`
- **/seedance-motions** — `/seedance-motions`; `/seedance-motions/{}`
- **/soul-cinematic-styles** — `/soul-cinematic-styles`
- **/soul-keyframe-styles** — `/soul-keyframe-styles`; `/soul-keyframe-styles/{}`
- **/soul-styles** — `/soul-styles`; `/soul-styles/{}`
- **/tips** — `/tips/random`
- **/veo3-styles** — `/veo3-styles`; `/veo3-styles/{}`
- **/video-explainer-presets** — `/video-explainer-presets`
- **/viral-hub** — `/viral-hub/categories`; `/viral-hub/chain-presets/{}`; `/viral-hub/presets/{}`; `/viral-hub/presets/{}/how-it-works`; `/viral-hub/presets/by-slug/{}`
- **/wan2-2-motions** — `/wan2-2-motions`; `/wan2-2-motions/{}`
- **/wan2-5-motions** — `/wan2-5-motions`; `/wan2-5-motions/{}`
- **/youtube-faceless-presets** — `/youtube-faceless-presets`
- **/youtube-faceless-showcases** — `/youtube-faceless-showcases`
- **/youtube-faceless-voices** — `/youtube-faceless-voices`

### static (4 unique paths)

- **/promotions** — `/promotions/{}`
- **/public** — `/public/thumbnail/{}.{}`
- **/unlim-marketplace** — `/unlim-marketplace/{}`
- **/viral-hub** — `/viral-hub/{}`

## Appendix B: path literals whose base is inferred (not tied to a helper call)

- **fnf-apps-marketplace** (INFERRED: `cg8mkaKwrcsbGJPz.js` imports `appsMarketplaceApiUrl`): `/api/v1/apps/categories`, `/api/v1/apps/community{,/liked,/pinned,/{id}/pin,/{id}/reaction,/{id}/remix,/{id}/report,/{id}/view,/contest/participate,/contest/participate/{id}}`, `/api/v1/apps/embed/start`, `/api/v1/apps/explore{,/{id}}`
- **fnf-skills-marketplace or fnf** (INFERRED: `S5SmvqTShAKtlB40.js` imports both): `/api/v1/games/community{,/{id},/{id}/play,/{id}/remix}`, `/api/v1/games/personal{,/{id},/{id}/publish}`, `/api/v1/skills/{community,personal}/{id}/content`
- **fnf-academy** (INFERRED: `Yw2e1pkiSRelFdrE.js` imports `academyApiUrl`): `/api/v1/courses{,/{id}}`, `/api/v1/lessons/{id}{,/complete,/feedback}`, `/api/v1/certificates/{id}`, `/api/v1/user/certificates{,/{id},/{id}/status}`, `/api/v1/user/saved-lessons{,/{id}}`, `/api/v1/prompt-bank`, `/api/v1/search`, `/api/v1/dev/reset{,/courses/{id}}`, `/api/v1/dev/complete/courses/{id}`, `/api/v1/incubator/application`
- **fnf (redaxios)**: `/v3/quizzes/{id}{,/complete,/connect}`, `/v3/quizzes/me/triggers`, `/v1/touring/{id}/complete`, `/v1/touring/skip` (`hf-surface: touring`)
- **fnf-notification**: `/notifications`, `/notifications/{id}`, `/notifications/{id}/read`, `/notifications/read-all`, `/notifications/stream`, `/chats/{id}/resume-events`, `/chats/{id}/poll-events`
- **canvas-worker / layer-worker / 3d-scene-builder / quiz-cs / dam-editor / phonecam**: see §3.3
- Third-party (Nutrient SDK, not Higgsfield): `/assistants*`, `/threads/*`, `/runs/*`, `/v2/plugins/*`, `/v2/meetings/*`, `/v2/recordings`
