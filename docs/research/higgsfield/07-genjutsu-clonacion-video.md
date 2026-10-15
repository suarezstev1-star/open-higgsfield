# 07 — Genjutsu ("el editor") y clonación de video

Alcance: análisis estático de los bundles JS minificados que sirve higgsfield.ai (`scratchpad/hf-assets/868a8dba-*.js`). No se hizo ninguna petición de red a higgsfield.ai ni a sus subdominios. Las únicas consultas de red fueron al catálogo público de fal (`api.fal.ai/v1/models` y `fal.ai/api/openapi/queue/openapi.json`), y solo para la sección 6.

Este informe complementa y no repite `02-generation.md` (envío y estado de jobs, tabla de rutas), `04-agents-mcp-canvas.md` (Fable/sync) y `05-apps.md` (apps).

Leyenda: **[O]** OBSERVADO (chunk + fragmento), **[I]** INFERIDO, **[D]** DESCONOCIDO. Los nombres de chunk omiten el prefijo `868a8dba-`.

> Nota sobre los textos de la UI: los textos visibles (títulos, descripciones) son IDs de Lingui (`{id:"EcPOsl"}`), y los catálogos de traducción se cargan en tiempo de ejecución. No están entre los bundles descargados, así que el texto literal de pantalla es **[D]**. La estructura, los campos y las reglas sí se ven.

---

## 0. Resumen

| Producto | Qué es | Job types | Dónde vive |
|---|---|---|---|
| **Genjutsu** (antes "Higgsfield Multiplier"; `/reality-manipulation` redirige 301 → `/genjutsu`) | Editor de "realidad" sobre un video fuente. Tiene 2 modos: **motion-control** (transferir el movimiento del video a tu personaje) y **replace-objects** (reemplazar objetos guiándose por imágenes y prompt). Además existe un submodo **Apply style / Restyle** | `hf_mult_motion_control`, `hf_mult_replace_object`, `restyle` | `/start/genjutsu` (página real) y el modelo `hf-mult-motion-control` dentro de `/ai/video` |
| **AI Influencer → animar** | Los mismos 3 flujos, aplicados a un personaje del AI Influencer Studio | `ai_influencer_motion_control`, `ai_influencer_replace_object`, `ai_influencer_restyle` (alias de los anteriores) | `/ai-influencer-studio` |
| **Ad Multiplier** | Recrear un anuncio desde un clip (o solo el hook o el CTA) con prompt e imágenes | `ad_multiplier_v2` (y `ad_multiplier`) | `/ads-studio/ad-multiplier`; `/multiplier/` devuelve 404 |
| **Katana** | Presets curados o de la comunidad que se ejecutan *a través de Claude*. La web prepara el prompt y lo pasa a `claude.ai/new?q=…` | `katana` (la web tiene el envío directo bloqueado) | `/start/katana`, `/katana/shared/$code` |
| **Clonación de persona/movimiento** | Kling Motion Control, Recast (Wan Animate v3), Video Face Swap, Revoice, lipsync (Infinite Talk, Speak…) | `kling3_0_motion_control`, `kling2_6_motion_control`, `wan2_2_animate_v3/_faceswap/_revoice`, `infinite_talk`, `kling_speak`… | `/ai/video/motion`, `/apps/recast`, `/apps/video-face-swap`, `/lipsync-studio` |
| **Editor de video "Fable"** | Editor NLE colaborativo (timeline) con sync por WebSocket. **No es Genjutsu** | — | `/video-editor`, solo para usuarios con el feature `ai-host` |

---

## 1. Genjutsu de punta a punta

### 1.1 Rutas

- [O] `/start/genjutsu` es la página principal. Se registra bajo el padre `/start` (`QhqiFCLt1Ukztv0Y`):
  `nB=R(\`/(public)/start/genjutsu\`)({validateSearch:e=>({...e,...ar(e),"feed-type":\`video\`}),…})` y `X3=nB.update({id:\`/genjutsu\`,path:\`/genjutsu\`,getParentRoute:()=>i4})` con `i4 … path:\`/start\``.
- [O] `/genjutsu` es el path canónico de marketing: `kw=\`/genjutsu\`` y `Ow=\`/higgsfield-genjutsu-presets\``, junto con `Aw=\`hf-mult-motion-control\`` (`Yw2e1pkiSRelFdrE`). [I] El edge o CDN hace el rewrite `/genjutsu` → `/start/genjutsu`, porque no hay una ruta TanStack con ese path en la raíz.
- [O] Redirección heredada: `{from:\`/reality-manipulation\`,to:\`/genjutsu\`,status:301}` (`QhqiFCLt1Ukztv0Y`).
- [O] `/genjutsu/shared/$code` → `/s/{code}`: `qL=R(\`/genjutsu_/shared_/$code\`)({beforeLoad:…throw t?z({href:\`/s/${encodeURIComponent(t)}\`…`. Lo mismo ocurre con `/ai-influencer/shared/$code`.
- [O] `/higgsfield-genjutsu-presets` es la landing pública de presets (`adCtYhz6LyIHNB3C`; analítica en `7X617QoiKh1SvBzs`: `page_name:\`higgsfield-genjutsu-presets\`…action:\`start_generating\``).
- [O] En móvil, `/start/genjutsu` redirige al generador web con `{mode:\`video\`,model:vy}` y `vy=\`hf-mult-motion-control\`` (`Yw2e1pkiSRelFdrE`).
- [O] Agrupación en el feed: `_y=\`/start/genjutsu\`,vy=\`hf-mult-motion-control\`,yy=[\`hf_mult_motion_control\`,\`hf_mult_replace_object\`]`.

### 1.2 Pantallas y flujo de la UI

- [O] **Modal de intro / bienvenida** (`SIQlt-ZH9U1Zx_LG`):
  - Colas de modales `genjutsu-intro` y `genjutsu-welcome-back` (`refetchAfterViewMs:302e3`).
  - Videos `https://static.higgsfield.ai/genjutsu/genjutsu-intro.mp4` y `…/genjutsu-banner.mp4`.
  - Toast `genjutsu-free-gens-upgrade`, que lleva a `/pricing?type=private…`.
  - Intro específica de restyle (`hf:genjutsu-restyle-intro-seen:v1:<user>`).
- [O] **"How it works"**, en 5 secciones (`lWTqVlbZGq0lfztU`, clips en `static.higgsfield.ai/genjutsu/*`):
  - `the-idea`
  - `motion-transfer` (antes y después)
  - `objects-swap` (antes y después)
  - `references`, con 4 clips etiquetados **character**, **outfit**, **location** → **result**
  - `batch` (4 variaciones)
  - Restyle tiene su propia sección `restyle` (`restyle-how-it-works-trimmed-20260927-v2/*`).
- [O] **Panel del generador** (`f7rP39H8qavenh6c`):
  - Tiene dos pestañas de modo: `[{icon:\`motion\`,…selected:!0},{icon:\`objects\`,…}]`.
  - El `<form data-genjutsu-generation-form>` cambia el placeholder según `o===\`replace-objects\``.
  - Para el selector de video, `hf-mult-motion-control` mapea a `{kind:\`genjutsu\`}`, una estructura propia que no usa frames inicial/final.
  - El panel se puede colapsar (`genjutsuCollapsed`).
- [O] **Estado de modo**: `formId:\`hf:video-genjutsu-mode:v1\``, con valor `motion-control` (por defecto) o `replace-objects`, guardado en sessionStorage (`FPgCQVNcDXmhjBKl`). El mapeo modo ↔ job (`neWxU061B391ETKN`) es:
  ```js
  function n(e){return e===`replace-objects`?`hf_mult_replace_object`:`hf_mult_motion_control`}
  ```
- [O] **Estado de medios** (`J9O-oy-hz8mhMuur`): `formId:\`hf:higgsfield-multiplier:media:v1\``, con `{sourceVideo, sourceVideoDuration, images[]}` y las acciones `setSourceVideo/addImage/reorderImages/updateMediaIpCheck`. Cada imagen pasa por un chequeo de IP o likeness (`updateMediaIpCheck`).
- [O] **Surfaces**: `genjutsu` y `ai-influencer` usan el mismo editor, que cambia los job types (`y3c_oFvgvUIocV9M`):
  ```js
  genjutsu:{motion:HF_MULT_MOTION_CONTROL,replace:HF_MULT_REPLACE_OBJECT,restyle:RESTYLE},
  "ai-influencer":{motion:AI_INFLUENCER_MOTION_CONTROL,replace:AI_INFLUENCER_REPLACE_OBJECT,restyle:AI_INFLUENCER_RESTYLE}
  ```
- [O] **Resultado**: hay acciones de Publicar, Compartir y Recrear (`genjutsuPublishState`, `isGenjutsuJob` en `7P5shTphDTFYmUxG`). La descarga ofrece 2 variantes (`trIVxDcn4nGISNTo`):
  ```js
  if(t===e.media.resultOnlyUrl)return`result_only`;if(t===e.media.splitScreenUrl)return`split_screen`
  … resultOnlyUrl:e.results.raw.url, splitScreenUrl:e.results.split_screen.url
  ```
  El servidor devuelve un video "solo resultado" y otro **comparativo en pantalla dividida**.

### 1.3 Inputs: ¿hay máscara o selección?

- [O] **No hay máscara, pincel ni selección manual de región** en ningún payload de `hf_mult_*`. En `replace-objects`, lo que se reemplaza se define con el **prompt** más imágenes de referencia.
- [I] La segmentación y el tracking del objeto se hacen en el servidor. El bundle sí trae SAM 3 video (`sam_3_video`) y un prompt de inpainting con "STRICT EDIT REGION / CONTEXT REGION" en otro flujo (`cinematic_video_inpaint`), pero no se ve que Genjutsu los use. Que Genjutsu use SAM es **[D]**.
- Roles de media observados: `video` (fuente), `image` (personaje, outfit u objeto), `location` (escena o fondo). `data.type` es uno de `media_input | video_input | image_job | video_job | reference_element` [O, conteo de literales en todo el bundle]. Que exista `image_job` permite usar **una generación previa** (por ejemplo, el character sheet del AI Influencer) como input sin volver a subirla.

### 1.4 Payload: `hf_mult_motion_control` (transferencia de movimiento)

Envío [O] (`bSI8fnJjP3TwQMew` + `y7Afj6-gZbFuNJ1F`):
```
POST /jobs/v2/hf_mult_motion_control   (fnf gateway, Bearer Clerk JWT, header de workspace)
{ "params": {...}, "use_unlim": false, "use_free_gens": <bool>, "client_meta": { "is_free_generation": <bool> } }
```
`function ee({jobType:e}){…fetch(r(\`/jobs/v2/${e}\`),{method:\`POST\`,…})}`

Builder de `params` [O] (`CdTCUp99K3g1-EBz`, función `_`):
```js
{ ...community_preset_attribution, resolution, batch_size,
  medias: medias.map(e=>({role:e.role,data:{id:e.data.id,type:e.data.type}})),
  prompt: prompt?.trim()||null, aspect_ratio: aspect_ratio ?? "auto",
  ...(width&&height?{width,height}:{}), ...(scene_mode?{scene_mode}:{}),
  location_character_media_id: scene_mode==="character" ? id : null, folder_id }
```

Validación del cliente [O] (`CdTCUp99K3g1-EBz`, constantes en `L5Y4H2lNfbFfmwaT`):

| Regla | Valor |
|---|---|
| `resolution` | `480p`, `720p`, `1080p` (por defecto 720p) |
| `batch_size` | 1–4 |
| imágenes `role:image` | ≥1. Imágenes + location ≤ 30 |
| video `role:video` | exactamente 1 |
| `role:location` | ≤1 |
| total de medias | 2 … `j=31` |
| duración del video fuente | **4–30 s** (`l(n.sourceVideoDuration,4,30)`) |
| `aspect_ratio` | `auto, 21:9, 16:9, 4:3, 1:1, 3:4, 9:16` |
| `scene_mode` | `off, character, video, location`. `location` exige exactamente una media `location`. En `character`, `location_character_media_id` tiene que ser una de las imágenes |
| medias duplicadas | prohibidas (`hf-mult-motion-control-duplicate-media`) |

[I] Semántica de `scene_mode`: `video` conserva el fondo del video fuente; `location` reemplaza la escena con la imagen de location; `character` usa el fondo de una de las imágenes de personaje. Esto cuadra con la sección "references" (character, outfit, location → result).

### 1.5 Payload: `hf_mult_replace_object` (reemplazo de objetos)

[O] (`t6LM8OvsKrvAtWxh`, funciones `V` y `U`):
```js
{ resolution, ...community_preset_attribution, batch_size, ...(w&&h), medias:[{role,data:{id,type}}], ...(prompt?{prompt}:{}), ...(folder_id?{folder_id}:{}) }
```
Reglas: `batch_size` entre 1 y 4. `prompt` ≤ **60 000** caracteres. La `resolution` sale de la lista de `L5Y4…` (`480p/720p/1080p`). Exactamente 1 video y **tiene que ir en `medias[0]`**. Imágenes entre 1 y 30. Duración del video entre 4 y 30 s. Sin medias duplicadas. El store `hf:video-hf-mult-replace-object:v1` arranca con `resolution:"720p"` y `prompt:""`.

### 1.6 Payload: `restyle` ("Apply style", dentro de motion)

[O] Al activar `applyStyle` (`dYXJWG4v-UCGfJbo`: `m=e&&l&&(t==null?u.applyStyle:t)`), el modo motion envía `restyle` en vez de `hf_mult_motion_control`:
- `POST /jobs/v2/restyle` (o `/jobs/v2/ai_influencer_restyle`, en ese caso con `use_unlim:false,use_free_gens:false`) (`t6LM8OvsKrvAtWxh`).
- Reglas: `preset_id` es obligatorio. 1 video (`video_input`), **≤5** imágenes de personaje, duración 4–30 s, `480p/720p/1080p`, batch 1–4. Antes de enviar se verifica que el preset siga disponible (`restyle-preset-unavailable`).
- Presets de estilo:
  - `GET /restyle-presets` (`AQTWCNooj5q41vc5`).
  - Presets propios en `GET|POST /restyle/presets/custom` (`{media_input_ids:[…]}` con ≤8 imágenes), `PATCH|DELETE /restyle/presets/custom/{id}` (`6lRjR_UmocOH_uQk`).

### 1.7 Catálogo de presets (CMS)

[O] Cliente (`LIbX356kQzdG_cKv`):
```
GET https://cms.higgsfield.ai/higgsfield-multiplier/video-explore/v2?lang=<en|es|de|ja|ko>&source=<higgsfield|community>&size=20&cursor=<n≥1>[&sort=trending|new]
GET https://cms.higgsfield.ai/higgsfield-multiplier/video-explore/v2/{id}?lang=
```
- `sort` solo aplica con `source=community`. Con `higgsfield` la única opción válida es `trending` (`…n===\`higgsfield\`&&r===\`new\`` lanza error).
- Las peticiones a community llevan `Cache-Control: no-store`. Un 404 devuelve `{items:[],total:0,cursor:null}`.
- Respuesta: `{items, total, cursor}`.
- Hay un CMS equivalente para el AI Influencer: `/ai-influencer/video-explore/v2` (`9FQw9C5A9z0eRW1F`).

Esquema de un item, reconstruido desde el normalizador (`tkOxBoyiehCZIAUb`, funciones `E`, `C`, `S`, `m`) [O]:
```
{ id, title, description, job_set_type ("hf_mult_motion_control"|"hf_mult_replace_object"),
  source: "higgsfield"|"community",
  original_video|reference: { url, main_url?, thumbnail_url, hls_url?, media_id, width, height, duration, media_type:"video_input" },
  variants: [ { id, type:"original"|"generation"|<edit>, prompt, share_code?, media:{…},
                params:{… parseado con zod, p. ej. scene_mode, location_character_media_id …},
                input_assets:[{ type:"static", url, media_id, media_type:"media_input", role:"image"|"location", width, height }],
                author:{user_id, username, avatar_url, badge:"higgs"|"higgs_team"|null},
                publication:{id, likes_count} } ],
  results:[…], input_videos:[…], input_assets:[…] }
```
- [O] **Recrear un preset**: una variante `generation` se puede recrear si cumple las reglas de §1.4 (≥1 imagen, ≤30 assets, ≤1 location, `scene_mode` coherente). El cliente vuelve a montar `{prompt, inputAssets, params}` y prellena el formulario.
- [O] **Atribución de la comunidad**: cada job lanzado desde un preset de comunidad incluye (`jCvphhIoPfzXpCEq`, zod `HV`):
  `community_preset_attribution:{catalog_item_id, sort:"trending"|"new", page_number:1…2^31-1, position_in_page:1…100}`.
  Los reruns la borran (`community_preset_attribution:void 0`, `wuwAvagOZkfSiBak`).
- [O] Reporte de preset: `genjutsu-preset-report` (`Aq69i5a0Y2KxbIR_`).
- **Categorías `genjutsu` y `genjutsu-trending`**: **[D] en el bundle**. Ese literal no aparece en el frontend; solo aparece en las instrucciones del servidor MCP de Higgsfield (`get_presets source=genjutsu category=genjutsu-trending`). [I] La capa MCP mapea esas categorías a `video-explore/v2?source=higgsfield&sort=trending` y equivalentes.
- **`initial_inputs.character_sheet`**: **[D] en el bundle**, porque `initial_inputs` no aparece en ningún chunk. [I] Lo resuelve el servidor MCP: abre la galería con el sheet ya puesto como media `{role:"image", data:{id:<job_id>, type:"image_job"}}`. El tipo `image_job` sí está observado como tipo de media válido.

### 1.8 Compartir

- [O] Crear un share: `POST /{product}/presets/{presetId}/share`, donde `product` es `genjutsu`, `katana` o `ai-influencer` (`visual-effects` usa `effects`). En `genjutsu` el body es `{variant_id}` (`jCvphhIoPfzXpCEq`, `Fj`).
- [O] Respuesta validada: `share_code` con formato `/^ps[0-9a-f]{32}$/`, `share_url === https://higgsfield.ai/s/{code}` y `redirect_path` igual a `/genjutsu/shared/{code}` (o el equivalente de katana o ai-influencer).
- [O] Resolver: `GET /preset-shares/{code}` → `{share_code, product, preset_id(uuid), source, revision, title, description, preview{url,width,height,type:image|video}, poster, recreate}` (`Ij`, `dm`). El host es el gateway `fnf` [I] (helper `w()`, `credentials:"omit"`, timeout de 20 s).

### 1.9 Créditos, gratuitos y planes

- [O] **Tabla de precios** desde el servidor: `GET /job-sets/costs` → lista `[{job_set_type, cost:[…]}]`. **Cotización**: `POST /job-sets/costs {job_set_type, params}` → `{job_set_type, credits, cost}` (`Sr0ap9zesoo17LIe`, `RKpCrebWFpypqouZ`).
- [O] **motion-control**: cotización en vivo con `{job_set_type:"hf_mult_motion_control", params:{duration, resolution, batch_size}}` (`QZ0fL1D0gXvppb-5`). En `ai_influencer_motion_control` la duración se redondea con clamp a 4–30. Si la cotización falla a 1080p, el respaldo local es `ceil(dur)×20×batch` (`aoIip_obQej64jEy`: `e===\`1080p\`&&o===HF_MULT_MOTION_CONTROL?20:null`). En el resto de casos se usa `ceil(dur) × cost_per_second[resolution] × batch` de la tabla.
- [O] **replace-object**: `Math.ceil(t)*costPerSecond*batch` con `costPerSecond` tomado de la tabla para `hf_mult_replace_object` (`W7BZageRokti1AlY`). Los valores en créditos por segundo vienen del servidor: **[D]**.
- [O] **restyle**: cotización del servidor (`restyle-credit-quote`).
- [O] **Generaciones gratuitas**: `use_free_gens` solo para la surface `hf_mult_motion_control`, con `batch_size===1` y resolución `480p` o `720p`, y siempre que queden pools con `counter>0` y `expire_at` vigente (`3AzVLD02tROxtiDu`). La "free Genjutsu generation" tiene sus propios modales (`genjutsu_free_generation`, `BklO-eP9FD_fKdHp`).
- [O] `use_unlim:false` siempre: Genjutsu no admite el modo ilimitado.
- [O] Tier mínimo de plan por modelo (`GAQAIGxOa-_SK4xb` + `W9JbpgoAgy_WBC3E`): `"hf-mult-motion-control"`, `"hf-mult-replace-object"`, `katana`, `"wan2-2-animate-v3"`, `"wan2-2-animate-revoice"` y `"kling-2-6-motion-control"` están en el grupo **free+**. `infinite_talk`, `"wan2-2-animate-faceswap"`, `"sync-so"` y `"kling-video-edit"` están en **pro+**. `"kling-3-motion-control"` está en pro+ pero aparece en una lista blanca (`u=new Set([\`kling-3-motion-control\`])`) que lo habilita para todos. [I] Esa tabla gobierna el bloqueo del selector de modelos. El backend puede aplicar sus propias reglas, que son **[D]**.

### 1.10 Estados

[O] Son los genéricos (ver `02-generation.md` §2.3): `queued/in_progress/completed/failed/nsfw/ip_detected/canceled`, por SSE `job:status_changed` más el polling `POST /jobs/status-batch`. Estos job types también están en las listas de `retry` y `rerun` (`VIwMQ8cKz0haVaAJ`): `hf_mult_motion_control`, `hf_mult_replace_object`, `restyle`, `katana`, `ad_multiplier_v2`, `ai_influencer_*`.

---

## 2. Familia `hf_mult_*` y Ad/Multiplier

[O] Enumerando todos los literales `hf[_-]mult[_-]*` del bundle, solo hay **dos** job types:

| Job type | Qué hace | Alias o hermano |
|---|---|---|
| `hf_mult_motion_control` | Transfiere el movimiento (y opcionalmente la escena) del video fuente a 1–30 imágenes de personaje, outfit o location | `ai_influencer_motion_control`; legado `higgsfield_multiplier_motion_control` (modelo `higgsfield-multiplier-motion-control`, validaciones `higgsfield-multiplier-source-video-required` y `-reference-image-count` en `Su71Qk1epVQmVJw3`) |
| `hf_mult_replace_object` | Sustituye objetos del video según el prompt y las imágenes de referencia | `ai_influencer_replace_object` |
| (hermano) `restyle` | Re-estiliza el video completo con un preset de estilo | `ai_influencer_restyle` |

[O] Los alias comparten handler: `D.ai_influencer_motion_control=D.hf_mult_motion_control,D.ai_influencer_replace_object=D.hf_mult_replace_object,D.ai_influencer_restyle=D.restyle` (`wuwAvagOZkfSiBak`).

**Ad Multiplier** [O] (`wuwAvagOZkfSiBak`, `_W_ihg6DGqiF_K3l`):
```
POST /jobs/v2/ad_multiplier_v2
{ params:{ prompt (obligatorio, ≤4000), medias:[1 video + ≤20 imágenes], resolution:"480p"|"720p"|"1080p" (720p por defecto),
           mode:"recreate"|"sections", section:"hook"|"cta"|"both"|null, batch_size:1, folder_id? },
  use_unlim:false, use_free_gens:false }
Cotización: POST /job-sets/costs {job_set_type:"ad_multiplier_v2", params:{duration, resolution, mode, section}}
```
[O] La telemetría registra `ad_multiplier_part_toggled {part,is_on}` y hay imágenes "skill-grid" (`talent-*`, `outfit-*`, `background-leopard`). [I] La UI deja activar "partes" a cambiar (talento, outfit, fondo, hook o CTA), y esas partes se convierten en prompt e imágenes. La orquestación de agente de `/ads-studio` (`fnf-ai-cmo/v1/ads/*`) está en `02-generation.md`. Las instrucciones MCP piden usar ad-multiplier para "clip edits" multi-paso y Genjutsu para una sola edición.

---

## 3. "Clonación de video": persona, movimiento o identidad sobre un video

| Feature (ruta) | Endpoint [O] | Payload [O] | Restricciones [O] | Chunk |
|---|---|---|---|---|
| **Kling 3 Motion Control** (`/ai/video/motion`) | `POST /jobs/v2/kling3_0_motion_control`. Con fondo controlado: `POST /chains/motion-control` | `{params:{mode:"std"|"pro", medias:[image, video], prompt, duration, width, height, …}, use_unlim, use_free_gens}`. La cadena envía `{mode, medias, height, width, background_source:"input_image"|"input_video", model_name:"kling-v3", folder_id}` | prompt ≤**2500**. Video obligatorio de **3–30 s**. Imagen obligatoria. Por defecto `{mode:"std", sceneControlMode:"off", character_orientation:"video"}` (`pECMa4gIyUq6hQvD`). Créditos: `ceil(cps×dur)` con cps de respaldo `{pro:2.5, std:1.5}`, +2 si es cadena | `PSiNTavNmDtpuA9-` |
| Kling 2.6 Motion Control | `/jobs/v2/kling2_6_motion_control`, `/chains/motion-control` con `model_name:"kling-v2-6"` | igual | — | `02-generation.md` |
| **Recast** (`/apps/recast`, slug interno `fans-studio`, job → `recast`) | `POST /jobs/wan2-2-animate-v3` (`?dry_run=True` para cotizar) | `{params:{height, width, seed, character_id:null, input_image, input_video, motion_id:null}}` | imagen y video obligatorios. Gating `assertSubscriptionPlan("wan2-2-animate-v3")` | `mkLiyNur15isvg7J`, `jCvphhIoPfzXpCEq` (`recast:\`fans-studio\``), `N7ZF9stDLzbac6hi` (`wan2_2_animate_v3:\`recast\``) |
| **Revoice** (Recast + voz) | `POST /jobs/wan2-2-animate-revoice` | lo mismo + `voice_id, dubbing_language` (se usa si hay `voice_id`) | — | `mkLiyNur15isvg7J` |
| **Video Face Swap** (`/apps/video-face-swap`) | `POST /jobs/wan2-2-animate-faceswap` | `{params:{width, height, input_video, input_image(cara), seed}}` | w/h redondeados a múltiplos de **64**, máximo **2048** por lado (`rr({divisor:64,maxAvailableWidthOrHeight:2048})`). Plan pro+ | `mkLiyNur15isvg7J` |
| Character swap / Face swap (imagen) | `/jobs/character-swap/v2`, `/jobs/face-swap` | `{swap_mode:"face", character_input_image, scene_input_image, quality, aspect_ratio, …}` | solo imagen; no es video | `mkLiyNur15isvg7J` |
| **Infinite Talk** (lipsync a partir de imagen **o** video) | `POST /jobs/infinite-talk {params, client_meta}` | `{input_image|input_video, input_audio, quality:"high", prompt, seed, motion_frame:15, sample_steps:25, sample_shift:10, sample_text_guide_scale:5, sample_audio_guide_scale:5, color_correction_strength:1, use_teacache:false, teacache_thresh:.2, lora:"fusex", lora_scale:1, lora_rank:32, use_apg:false…}` | el audio **tiene que ser `.wav`** (`infinite-talk-validation-audio-format`). Plan pro+ | `In3jiSi1QZMbyYC-`, `uN8ccTRwZgwPaqc4` |
| Kling Speak / Avatars 2.0, Kling 2.6 lipsync, Wan 2.5 Speak, Veo 3/3.1 Speak, Sync-so, Higgsfield Speak 2.0 | `/jobs/kling-speak`, `/jobs/kling2-6-lipsync`, `/jobs/wan2-5-speak`, `/jobs/veo3(-1)-speak`, `/jobs/sync-so`, `/jobs/hummingbird` [I] | ver `02-generation.md` | `kling_speak` fuerza `enhance_prompt:false` en el rerun | `In3jiSi1QZMbyYC-`, `wuwAvagOZkfSiBak` |
| Genjutsu motion (§1.4) | `/jobs/v2/hf_mult_motion_control` | — | 4–30 s, 1–30 imágenes | — |

**Cómo se conecta un Soul, un character sheet o un Element**:
- [O] Kling MC, Recast y Face Swap reciben una **imagen** (`input_image` o `medias[role:image]`). Cualquier imagen de la biblioteca sirve, incluidas las generaciones (`type:"image_job"`) y los reference elements (`type:"reference_element"`).
- [O] Recast tiene un campo `character_id`. La web lo manda siempre como `null`. [I] Es un hueco para un Soul ID o personaje entrenado (`/custom-references`) que hoy no se expone.
- [O] En Genjutsu, el personaje va en `medias[role:image]` y, si `scene_mode="character"`, en `location_character_media_id`. El AI Influencer usa los mismos validadores con los job types `ai_influencer_*`.
- [D] No se encontró ningún parámetro que pase un Soul ID (LoRA) a un job de video de esta familia.

---

## 4. Katana

Qué es [O]: un catálogo de presets de video (`higgsfield` curados más `community`), cada uno con su skill. La ejecución **la hace Claude**: la web solo compone el mensaje y abre claude.ai.

- **Catálogo** (`Yw2e1pkiSRelFdrE`, base `{gateway sin /fnf}/fnf-cms-api`):
  - `GET /katana-categories?lang&limit≤100&cursor` → `{items:[{id, name, position}], default_category_id, next_cursor}`.
  - `GET /katana-presets?lang&limit≤100&cursor&category&source=higgsfield|community&user_id`. La categoría `community` se traduce a `source=community`. Un 409 significa `katana_cursor_expired`.
  - `GET /katana-presets/{slug}?lang&user_id`.
  - Preset (zod `zV`): `{id:uuid, slug(kebab ≤128), title, description, category, source, skill_key, thumbnail_media{static jpeg|png|webp}, video_media{mp4, url, hls_url, compressed_url, duration_seconds,…}, author{user_id, username, avatar_url, badge}, person_image}`. El detalle (`BV`) añade `prompt, config, input_schema, reference_media`.
- **Compose → handoff a Claude** [O]:
  - `POST /katana-presets/{slug}/compose` (con auth) o `POST {cms}/katana-presets/compose` (sin slug), con body `{inputs}` (≤64 KiB). Si hay error de validación, devuelve 422 `{code:"invalid_inputs", errors:[{path,code,message}]}`.
  - Respuesta (zod `qV`): `{slug, message, handoff:"url"|"copy", web_url:"https://claude.ai/new?q=<message>", app_url:"claude://claude.ai/new?q=<message>"}`.
  - Reglas: el host tiene que ser `claude.ai` con path `/new`. Con `handoff:"url"` el único parámetro es `q===message`, y `encodeURIComponent(message).length<=1800`. Con `copy` no hay query: el usuario copia el mensaje.
- **Job `katana`** [O]:
  - Validación (`aMQJ5Iz8SHl8-LaZ`): 1 video, ≤40 imágenes, `batch_size===1`, video de **3–30 s**.
  - En la web, `submit` llama primero a `s()`, que **siempre lanza `katana-unavailable`** (`--vPWiqv2RbozVM3d`: `async function v(e,t,n){return h(),y(e,t,n)}` con `h` = `s`). El envío directo desde el navegador está deshabilitado. El rerun del job usa `{params:{batch_size:1, medias:[video, image…], prompt}}` (`Su71Qk1epVQmVJw3`).
  - [I] El job real lo crea Claude por MCP. El MCP de Higgsfield expone `get_katana_config`, `register_katana_result` y `show_katana_result`; esos nombres se ven en las herramientas de esta sesión, no en el bundle. Las instrucciones dicen "after verifying a completed Katana video, call show_result with action katana_video".
- **Comunidad** [O]:
  - `POST /katana/community/submit {video_id:uuid, prompt?, references?:[{media_id, media_type:image|video}]}` → 202 `{id, status:"submitted"}` (`FydtdHOxnt6TqUJm`).
  - Likes: `/katana-presets/{id}/like`, `/katana-presets/likes`. Reporte: `POST /katana-presets/{id}/report`.
- **Compartir**: `/katana/shared/$code` → `gle(code,"katana")` → redirige al `preset_slug` (`QhqiFCLt1Ukztv0Y`).

---

## 5. ¿Cuál es "el editor"?

Hay tres cosas distintas que se pueden llamar "editor":

1. **Genjutsu** (§1). Es el que el usuario llama "el editor": edita *el contenido* de un video existente (personaje, objetos, estilo) con IA. No tiene timeline.
2. **Video Edit** (`/ai/video/edit`, `/video-edit`). Es edición por instrucción con modelos de terceros: `kling-video-edit(-o3)`, `kling-video-reference(-o3)`, `grok-video-edit`, `seedance_2_5_edit`, `flux_3_video_edit` y `gemini_omni_flash_1_1_edit` (ver `02-generation.md` §4). [O] El rerun de `flux_3_video_edit` está en `wuwAvagOZkfSiBak`.
3. **Fable, el editor NLE con timeline** (`/video-editor`). [O] Su `beforeLoad` exige que el usuario tenga el feature `ai-host`:
   `if(!r.features.includes(\`ai-host\`))throw L()` (`QhqiFCLt1Ukztv0Y`).

   Query params: `import`, `mount` y `sync_protocol=1`. Protocolo (detalle en `04-agents-mcp-canvas.md`): WebSocket `wss://sync.higgsfield.ai/p/{projectId}/sync/socket` con frames `auth`/`request` (`intent`, `predecessors`), `commit.seq` y `checkpoint`. Tiene un outbox en IndexedDB protegido con `navigator.locks` y assets direccionados por sha256. El agente lo opera con la tool `fable_editor` (Supercomputer). [I] Es una función beta o interna, no es Genjutsu.

---

## 6. Cómo recrearlo con nuestro stack (Next.js + fal.ai)

El repo ya tiene catálogo y esquemas de fal: `/home/user/open-higgsfield/src/generation/catalog/kling-3.ts` (ya define `endpoints.motion` para Kling v3 MC), `/home/user/open-higgsfield/src/generation/fal-schemas.json` y el script `pnpm fal:schemas`. Endpoints verificados en el catálogo público de fal (estado `active`, inputs tomados del OpenAPI de fal):

| Feature de Higgsfield | Endpoint fal | Inputs clave (OpenAPI de fal) | Notas |
|---|---|---|---|
| Genjutsu motion / Kling MC | `fal-ai/kling-video/v3/{standard,pro}/motion-control` (también `v2.6/{standard,pro}/motion-control`) | `image_url*, video_url*, character_orientation* (image|video), prompt, elements[], keep_original_sound` | Equivale a `kling3_0_motion_control`. Aplicar 3–30 s y prompt ≤2500 igual que HF |
| Motion transfer multipersonaje o no humano | `fal-ai/bytedance/dreamactor/v2` | `image_url*, video_url*, trim_first_second` | Alternativa a Kling |
| Recast / reemplazar personaje en escena (≈ `hf_mult_motion_control` con `scene_mode=video`, o `wan2_2_animate_v3`) | `fal-ai/wan/v2.2-14b/animate/replace` | `image_url*, video_url*, resolution 480p/580p/720p, num_inference_steps 2–40, guidance_scale, shift, seed` | Es el mismo modelo base que el Recast de HF (Wan 2.2 Animate) [I] |
| Animar una imagen con el movimiento del video (≈ `scene_mode=character`) | `fal-ai/wan/v2.2-14b/animate/move` | igual | |
| Recast con fotos de referencia, conservando cortes y audio | `minimax/h3-max/recast` | `video_url*, reference_image_urls* (≤4), prompt, resolution 768P/1080P` | Lo más parecido a "references: character/outfit" |
| Video face swap | — (no hay endpoint de face swap de video en el catálogo; `q=faceswap` solo devuelve imagen) | — | Usar `wan/v2.2-14b/animate/replace` con un retrato o `minimax/h3-max/recast` |
| Replace object (`hf_mult_replace_object`) | `fal-ai/bernini-r/reference-edit-video` (≤5 refs), `alibaba/happy-horse/video-edit` (≤5 refs), `fal-ai/kling-video/o3/{standard,pro}/video-to-video/edit` (`elements`, `image_urls`) | `video_url*, prompt*, reference_image_urls[]` | Prompt e imágenes, sin máscara, igual que en HF. Si hace falta máscara: `fal-ai/sam-3/video` + `fal-ai/wan-vace-14b/inpainting` |
| Restyle | `decart/lucy-restyle`, `fal-ai/id-v2v` (restyle desde keyframes editados) | `video_url`, prompt o keyframes | |
| Video edit por instrucción | `fal-ai/kling-video/o1|o3/.../video-to-video/edit`, `fal-ai/wan/v2.7/edit-video`, `xai/grok-imagine-video/edit-video`, `blackforestlabs/flux-3/edit-video`, `google/gemini-omni-flash/v1.1/edit`, `fal-ai/wan-vace-apps/video-edit` | `video_url*, prompt*` | Equivale a `/ai/video/edit` |
| Infinite Talk | `fal-ai/infinitalk` (imagen + audio), `fal-ai/infinitalk/video-to-video` | `video_url*, audio_url*, prompt*, resolution 480p/720p, num_frames 41–241` | Mismo modelo open-source. Los parámetros de HF (`motion_frame`, `sample_steps`, `lora:"fusex"`) indican que lo hospedan ellos [I] |
| Lipsync de video (Sync-so, Kling lipsync) | `fal-ai/sync-lipsync/v3`, `fal-ai/sync-lipsync/v2(/pro)`, `fal-ai/kling-video/lipsync/audio-to-video`, `veed/lipsync/v2`, `fal-ai/heygen/v3/lipsync/{precision,speed}`, `fal-ai/latentsync` | `video_url, audio_url` | |
| Avatar desde imagen (Kling Avatars, Speak) | `fal-ai/kling-video/ai-avatar/v2/{standard,pro}`, `fal-ai/bytedance/omnihuman/v1.5`, `fal-ai/wan/v2.2-14b/speech-to-video`, `fal-ai/sync-lipsync/v3/image-to-video` | `image_url, audio_url` | |

**Diseño sugerido** [I]:
1. **Un solo editor "Genjutsu"** con 3 modos que mapean a endpoints de fal: `motion` → Kling MC, Wan Animate o Dreamactor según `scene_mode`; `replace` → Bernini-R, HappyHorse o Kling O3 edit; `restyle` → Lucy Restyle o ID-V2V. Store con zustand: `{mode, sourceVideo{url,duration}, images[{url, role:"image"|"location"}], sceneMode, prompt, resolution, batch}`. Las mismas validaciones que HF: 4–30 s, 1–30 imágenes, `medias[0]` = video en replace.
2. **Duración del video** en el cliente con `<video>.duration`, igual que HF (`sourceVideoDuration`, con `allowUnknownSourceVideoDuration`). Créditos = `ceil(dur) × tarifa[resolución] × batch`, tomando la tarifa del pricing de fal.
3. **Batch** = N llamadas a la queue de fal en paralelo, porque fal no tiene batch nativo en estos endpoints.
4. **Salida en pantalla dividida**: HF la genera en el servidor (`results.split_screen`). La podemos componer en el cliente o con ffmpeg en una route de Next (hstack del original y el resultado).
5. **Catálogo de presets**: tabla propia `{id, title, job_set_type, source, sort, original_video, variants[{prompt, params, input_assets}]}` copiando el esquema de §1.7. "Recrear" = prellenar el store.
6. **Katana**: barato de clonar. Cada preset es `{prompt template, input_schema}`; un "compose" de servidor rellena la plantilla y abre `https://claude.ai/new?q=<mensaje>` (≤1800 caracteres codificados), y Claude ejecuta con nuestro MCP.

**Lo que es del servidor y no se puede ver**:
- [D] Los modelos reales detrás de `hf_mult_*` y `restyle`.
- [D] La segmentación o tracking de objetos.
- [D] Cómo se compone el split-screen.
- [D] Las tarifas por segundo (`/job-sets/costs`).
- [D] El mapeo MCP de `genjutsu-trending` e `initial_inputs`.
- [D] La moderación de likeness/IP de los inputs (`ip_detected`, `/jobs/deepfake/confirm-consent`; ver `02-generation.md`). Si clonamos personas reales tendríamos que tener **nuestro propio consentimiento y moderación**.
