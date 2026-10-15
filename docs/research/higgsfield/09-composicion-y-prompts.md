# 09 — Cómo compone videos y cómo construye prompts Higgsfield

Fecha: 2026-10-15. Análisis **estático** del JavaScript público de higgsfield.ai (bundles `868a8dba-*.js` ya descargados). No se hizo ninguna petición a higgsfield.ai ni a sus APIs. La única red usada fue el catálogo **público** de fal (`https://api.fal.ai/v1/models?q=…`) para la sección 5.

Convenciones:
- `X` significa el chunk `868a8dba-X.js`. Los fragmentos son literales del código minificado, recortados.
- **OBSERVADO**: está literalmente en el código (chunk + fragmento).
- **INFERIDO**: se deduce del código observado.
- **DESCONOCIDO**: no se puede saber desde el frontend.
- No repite lo ya cubierto en `01`–`05` (gateway, ciclo de vida de los jobs, catálogo de modelos, costes); solo lo cita cuando hace falta.

---

## 0. Resumen

1. **El frontend casi no "escribe" prompts.** Envía al backend piezas estructuradas: el texto del usuario con tokens `<<<…>>>`, IDs de catálogo (`genre_id`, `camera_lens_id`, `light_id`, `preset_id`…) y flags (`enhance_prompt`, `prompt_language`, `system_prompt_version`, `use_rag_search`, `apply_memories`). **INFERIDO:** la reescritura final del prompt (LLM, system prompts, traducción) ocurre en el servidor y **no es visible**.
2. **Sí hay plantillas en el cliente**, en sitios concretos:
   - fragmentos de emoción que se pegan tras cada personaje mencionado;
   - el prompt de "editar dibujando" del editor de video;
   - un prompt de edición por región con coordenadas;
   - un prompt de retrato para el festival;
   - las plantillas `{placeholder}` del tour de onboarding;
   - el mensaje oculto que el agente recibe con los ajustes de generación;
   - el sufijo de duración del AI Host.
3. **Cinema Studio** (`/generate`, `/cinema-studio`) es un formulario multimodo (image / video / audio) con cuatro generaciones de video (`v2`, `v3`/3.0, `v3.5`, `v4`/4.0).
   - Se compone de: escenas (multi-shot), un movimiento de cámara (`preset_id`), una curva de *speed-ramp* por escena, emociones por personaje, start/end frames, referencias (`medias[]` con `role`), elementos `<<<uuid>>>` y "controles creativos" (género, época, ritmo, luz, cámara, lente, apertura, focal, paleta).
   - Casi todos los catálogos vienen del servidor (`/cinema-studio-4-0/creative-controls`, `/camera-settings`, `/camera-movements`).
4. **Las "cadenas" (`/chains/*`) son orquestaciones del servidor.** El cliente manda un solo POST con `params` y recibe `job_sets`. Los pasos intermedios no se ven, salvo en tres productos con estado explícito:
   - **Reels Studio**: sesiones → segmentos → clip primario → `stitch`;
   - **AI Host**: guion → bloques → `regenerate` por bloque → `assemble`;
   - **link-to-ad**: scraping → brand kit → preset → chain.
5. **Post-producción:**
   - color grading WebGL en el cliente, que se guarda con `PUT /jobs/{id}/edit-image`;
   - editor de motion graphics ("Fable") con comandos de documento y exportación **en el navegador** (WebCodecs: mp4/AVC+AAC, webm/VP9+Opus, PNG);
   - reframe, upscale, dubbing y voice-change como jobs o cadenas del servidor.

---

## 1. Cinema Studio (`/generate`, modelos `cinematic_studio_*`)

### 1.1 Modos y versiones (OBSERVADO)

- **Selector de job por modo** (`-ZzbbHazR_P9F8lw`):
  - snippet: `` ic(e){return e===`image`?fe.CINEMATIC_STUDIO_IMAGE:e===`video`?fe.CINEMATIC_STUDIO_VIDEO_V2:Fn(Dn.model)} ``;
  - la versión de video se elige así: `` Hc(e){… ln()?`video-v40`:cn()?`video-v35`:sn()?`video-v3`:`video-v25` } ``.
- **Rutas de envío** (`RKpCrebWFpypqouZ`, mapa `N`):

  | Job type | Ruta |
  |---|---|
  | `cinematic_studio_3_0` | `v2/cinematic_studio_3_0` |
  | `cinematic_studio_video_v2` | `v2/cinematic_studio_video_v2` |
  | `cinematic_studio_video_3_5` | `v2/cinematic_studio_video_3_5` |
  | `cinematic_studio_video_4_0` | `v2/cinematic_studio_video_4_0` |
  | `cinematic_video_inpaint` | `v2/cinematic_video_inpaint` |
  | `cinematic_video_relight` | `v2/cinematic_video_relight` |

- **Submodelos de imagen** (`-ZzbbHazR_P9F8lw`, `Dc.execute`):

  | `imageModel` | Job | Notas |
  |---|---|---|
  | `cinematic-v1` (grid ≠ 1x1) | `cinematic_studio_image_grid` | Exige `grid_type` y `grid_size` |
  | `cinematic-v1` | `cinematic_studio_image` | Exige cámara, lente y focal (validación en `F4NjuleDMIZLf3K7`: `camera-settings-required`) |
  | `soul-cinema-studio` | `soul_cinema_studio` | `style_id`, `color_preset_id`, `enhance_prompt:!1` |
  | `cinematic-studio-soul-cast` | `cinematic_studio_soul_cast` | Creador de personajes (`character_params`) |
  | `cinematic-studio-soul-location` | `cinematic_studio_soul_location` | Locaciones 16:9 |
  | `cinematic-3-0-edit` | `cinematic_studio_3_0_image_edit` | Edición con 1 imagen |
  | `cinematic-v2` + `character-creation` / `location-creation` / `edit` / default | cast / location / `image25Edit` / `image25` | El default **exige al menos una locación** (`location-required`) |
  | `soul-cinematic` | `soul_cinematic` | `negative_prompt:''`, `time_denoise_from:0.83`, variantes internas `use_olzhas/sultan/aidar` |

- **Flags de "prompt inteligente" en la imagen de Cinema v1** (OBSERVADO, `-ZzbbHazR_P9F8lw`): `use_rag_search:e.useRagSearch, apply_memories:e.applyMemories, system_prompt_version:e.systemPromptVersion`.
  - Por defecto: `systemPromptVersion` vale `` `v1` `` (enum `v1|v2`), `applyMemories` es true y `useRagSearch` es false.
  - Hay además un buscador de sugerencias: `` mt(e){let n=o(`/search`);…set(`system_prompt_version`,…)…} `` con un debounce de 5 s (`vMXuVukpp5kzAHWi`).
  - **INFERIDO:** el backend tiene system prompts versionados, RAG sobre referencias y "memorias" del usuario que reescriben el prompt. **DESCONOCIDO:** su contenido.

### 1.2 Estructura de escenas / multi-shot (OBSERVADO)

**Estado del formulario** (`8nA6xX0BgMWyGHH_`, `3grZEFGPqWURaBMC`):
- `multishotMode ∈ {single, multi_auto, multi_custom}`;
- `scenes[]` = `{id, colorIndex, prompt, duration, preset, speedrampPreset, speedramp[{speed}], enabled, characterEmotions}`;
- `activeSceneIndex`.

**Ensamblado de escenas** (`-ZzbbHazR_P9F8lw`, `Cc`):
```
multi_prompt = scenes.map(e => ({
  prompt: gc(e.prompt, e.characterEmotions ?? global),
  duration: Math.max(1, Math.round(e.duration)),
  speedramp: e.speedrampPreset === `custom` ? `auto` : e.speedrampPreset,
  preset_id: e.preset?.id ?? null }))
totalDuration = clamp(3, 12, Σ duration)
multi_shot_mode = multishotMode === `multi_auto` ? `auto` : `custom`
```

**Límites:**
- v2: prompt ≤ 2500, prompt por plano ≤ 512, duración total 3–15 s (validación en `F4NjuleDMIZLf3K7`: `cinematic-v2-shot-prompt-length`, `cinematic-v2-total-duration`).
- El formulario limita la suma a 3–12 s: `` if (e<3||e>12) return Zs(`scenes`,[3,12]) ``.

**Payload v2 / 2.5** (`jc.execute`, OBSERVADO):
```
{prompt, genre: genre.toLowerCase(), duration, batch_size, mode: videoQuality,
 multi_shots, multi_prompt, sound:`on|off`, cfg_scale:0.5,
 multi_shot_mode:`auto|custom`, preset_id, speedramp,
 medias: [start_image?, end_image?, image…], aspect_ratio, width, height, folder_id}
```
Si el prompt menciona personajes, exige un `start_image`. Si hay personajes, quita el `end_image`.

**Payload v3 (3.0) y v3.5** (`kc` / `Nc`, OBSERVADO). Añaden:
- `generate_audio`, `genre`, `speedramp`, `preset_id`;
- `medias:[{role:image|start_image|end_image|video, data}]`;
- `enhance_prompt`, `prompt_language`, `use_transparency`, `use_eye_mask`, `use_eye_mask_sam`, `use_blur`, `assets`.

Solo v3.5 añade además:
- `camera_model_id`, `camera_lens_id`, `camera_focal_length_id`, `camera_aperture_id`;
- un estilo **excluyente**: `` …(_.isManualStyle&&_.stylePrompt?{style_prompt}:{color_grading, light_scheme, camera_style}) ``.

Validación de v3.0 (`F4NjuleDMIZLf3K7`):
- duración 4–15;
- resolución 480p/720p/1080p/4k;
- aspect `auto|16:9|9:16|4:3|3:4|1:1|21:9`;
- tope de imágenes + elementos: `attachmentRestrictions.maxCntImagesAndRefElements`.

**`prompt_language`:**
- OBSERVADO: por defecto `` `zh` `` al recrear v3/v3.5 (`uX4A9_ybXAUgtjgM`, `ExT62WFM2cS84kQl`: `promptLanguage:(o=g.prompt_language)==null?`zh`:o`) y fijo en `` `en` `` en 4.0 (`Su71Qk1epVQmVJw3`: `enhance_prompt:!0,prompt_language:`en``).
- **INFERIDO:** el servidor traduce o reescribe el prompt al idioma que prefiere el modelo de base (probablemente uno de ByteDance para 3.x).

**Payload v4.0** (`Su71Qk1epVQmVJw3`, `Aa`, OBSERVADO):
```
{prompt, model, …(model===`video_edit` ? {} : model===`video_extension`
   ? {duration, extension_mode} : {duration, aspect_ratio}),
 resolution, bitrate_mode:`high`, generate_audio, batch_size,
 genre_id, era_id, pacing_id, …light, color_palette?, camera_model_id,
 camera_lens_id, camera_aperture_id, enhance_prompt:true, prompt_language:`en`,
 width, height, medias}
```
- Modos del modelo: generación, `video_edit` (exige exactamente 1 video) y `video_extension` (exige al menos 1 video): `` Oa(e,t){return e===`video_edit`&&t!==1?`edit-needs-one-video`:… } ``.
- Luz (`dBTU1cmFqnBgAa6h`): `{light:'preset'|'user', light_id}` o `{light:'custom', light_custom:[…≤2]}`.
  - Cada luz custom (`-Pi9KibH1KNr2SqM`) es `{direction, brightness 0–100, diffuse 0–100, color #HEX}`.
  - `direction` ∈ 26 direcciones: `front, back, …, back-bottom-right`.
- Paleta: `color_palette:{type:'preset'|'user', id}`. Las paletas custom se guardan en localStorage `hf:cs40-custom-color-palettes:v1` (`5-utQTxXgfSE9Igp`).
- `-ZzbbHazR_P9F8lw` también valida contra el servidor los ids de `genre, era, pacing, camera_model_id, camera_lens_id, color_palette_id, light_id, camera_style, light_scheme, color_grading`. Si alguno no está en la lista que devuelve el servidor, responde `Zs(campo, idsVálidos)`.

### 1.3 Catálogos de cámara, lente y look

| Catálogo | Fuente | Estado |
|---|---|---|
| Género, época, ritmo (pacing), luz, cámara+lente+apertura | `GET /cinema-studio-4-0/creative-controls?type=…` (`-5UVGW6MJ-YvGsUe`; grupos `[[genre],[era],[pacing],[light],[camera_model,camera_lens,camera_aperture]]`, `show_hidden` fuera de prod, uno de ellos marcado `is_auto`) | OBSERVADO el endpoint. **DESCONOCIDOS** los valores (vienen del servidor). |
| Movimientos de cámara | `GET /camera-movements?size=21&cursor=` (paginado) + `creative-controls` tipo `camera_movement` (`8fj5bQEE_phu3vsK`); ítems `{id, display, thumbnail(video)}`; el movimiento elegido viaja como `preset_id` con `type:`cinematic_studio__camera_movement`` (`3grZEFGPqWURaBMC`) y además se inserta como token en el prompt (`removeMotionFromPrompt`) | OBSERVADO. Lista **DESCONOCIDA**. |
| Cámara / lente / focal / apertura (v1, v3.5) | `GET /camera-settings`, `/camera-settings/recommended`, `POST /camera-settings {camera_id, lens_id, focal_length_id, aperture_id}` (presets guardados), `/cinema-studio-3-5/camera-settings` (`HNjJ6qVpJGxKZvKt`); en el historial la focal se muestra como `` `${r.name}mm` `` (`jSDks9q5eJqMuTsq`) | OBSERVADO. Valores **DESCONOCIDOS**. |
| Géneros del "cast" | Hardcodeado en `xnKyUSzZkB57N7ws`: Action, Adventure, Comedy, Drama, Thriller, Horror, Detective, Romance, Sci-Fi, Fantasy, War, Western, Historical, Sitcom | OBSERVADO |
| Atributos de personaje | Mismo chunk: `era` (1920s… por defecto 2020), `budget` (por defecto 250), complexión (Slim…Plus-size), altura, etnia, ojos, peinado, textura y color de pelo, vello facial, vestuario (Casual, Formal, High Fashion, Military, Sporty, Workwear, Vintage, Punk), imperfecciones (scar, freckles, tattoos, eye patch) y **arquetipo** (Innocent, Everyman, Hero, Caregiver, Explorer, Rebel, Lover, Creator, Jester, Sage, Magician, Ruler) → `character_params` | OBSERVADO |
| Emociones | Hardcodeado en `t27RAdGH_LrgUnM5`: 24 entradas (rueda de Plutchik, 3 intensidades) con **fragmento de prompt**: `{name:'Annoyance',prompt:'(with frustrated emotion)',intensity:10}`, `Anger→'(with mad and angry emotions)'`, `Rage→'(with extremely enraged emotions loudly)'`, `Joy→'(happy and joyful emotion)'`, `Fear→'(with strong fear and shock)'`, `Terror→'(with extreme terror emotion and panic)'`, `Surprise→'(with surprised face)'`, `Sadness→'(with sad emotion)'`, `Grief→'(with grief emotion)'`, `Disgust`, `Loathing`, `Interest`, `Hope`, `Vigilance`… | OBSERVADO |
| Speed-ramp | Presets `auto`, `impact`, `slowmo` (y `linear`/`custom` en el estado); el UI guarda una curva `speedramp:[{speed}]` (por defecto 50) que **no se envía**: solo viaja el nombre (`yc()`: `slowmo→true`, `custom|impact→auto`) | OBSERVADO |
| Color grading (post) | Hardcodeado en `XuHkcNUYhWhtutXe`: None, Natural, B&W Film, Split Tone, Soft Skin, Soft Nature Relight, Cinematic, 16mm Film, Old Lens. Cada uno con parámetros `color_correct{temperature,hue,contrast,saturation,split_tone}`, `enhance_detail`, `bloom`, `halation`, `lens_haze`, `exposure_adjust`, `film_grain{strength,size:'35mm'\|'16mm'\|'8mm',bias}` | OBSERVADO (ver §4) |
| Formatos de lienzo | `LicRcEFScKF_acYf`: Ultrawide 21:9, CinemaScope 2.39:1, DCI 4K 17:9, Anamorphic 2.00:1, más formatos sociales | OBSERVADO |

### 1.4 Personajes, elementos y emociones en el prompt (OBSERVADO)

**Tokens del prompt:**

| Token | Significado |
|---|---|
| `<<<uuid>>>` | Elemento de referencia (personaje, locación, objeto) |
| `<<<image_N>>>`, `<<<video_N>>>`, `<<<audio_N>>>` | Adjuntos por posición |
| `<<<cast_…>>>` | Personaje creado en "cast" |
| `<<<product:…>>>`, `<<<avatar:…>>>`, `<<<web_product:…>>>` | Marketing Studio |

La regex de elementos excluye los adjuntos: `` /<<<(?!(?:image|video|audio)_\d+>>>)([^>]+)>>>/g `` (`F4NjuleDMIZLf3K7`).

**Editor:** Lexical serializa el nodo de mención como `` `<<<${e.getValue()}>>>` `` (`3KOKyk22zhqp6bGg`). En pantalla se muestra `` `@${t.name}` `` (`PAwRhIfk7JX-Z2ks`).

**Emociones** (`-ZzbbHazR_P9F8lw`, `gc`). Se añaden **detrás** del token de cada personaje, según la ocurrencia:
```
e.replace(/<<<([^>]+)>>>/g,(e,r)=>{…let o=t[`${r}:${a}`];return o?`${e}${o.prompt}`:e})
```
Resultado: `<<<uuid>>>(with sad emotion)`.

**Validación previa** (`h2vhnToUL6182n3f`). Antes de enviar, para cada elemento mencionado comprueba que:
- existe;
- no está en `processing`;
- tiene media;
- no es "solo video" si el modelo es de imagen;
- pasó el **IP check**.

Errores posibles: `reference-element-ip-check`, `reference-element-processing`…

**Clasificación** (`vc`). Separa los elementos mencionados en `characters` y `environments` según `category` (`character`, `character_ip_verified`, `auto:character`, `environment`…) y los envía como arrays (`image25`: `{characters, environments}`).

**Cambio de modelo** (`jCvphhIoPfzXpCEq`, `$F`). Si el modelo nuevo no admite elementos, imágenes, videos o audios, quita esos tokens del prompt: `` t.referenceElements||(n=gc(n)), t.images||(n=Jl(n)), … ``.

**Conversión a `@image_N`** (`LyFzgohNFP7q8z9A`, "video character asset"). Algunos flujos renumeran los tokens antes de enviar:
```
e.replaceAll(`<<<${t}>>>`,i).replaceAll(`<<<element_${t}>>>`,i).replaceAll(`@${t}`,i)  // i=`@image_${n+r+2}`
```
**INFERIDO:** los proveedores que referencian imágenes por índice (estilo Kling/Seedance) reciben `@image_N`. En el resto de casos el servidor expande `<<<uuid>>>`.

### 1.5 Start/end frames y medias (OBSERVADO)

- `medias` es una lista `{role, data}` con `role ∈ image | start_image | end_image | video | audio`.
- Setters exclusivos: al poner un nuevo `start_image`, el anterior vuelve a `image` (`3grZEFGPqWURaBMC`, líneas `setStartFrame` / `setEndFrame`).
- `aspect_ratio:'auto'` se resuelve leyendo la primera imagen (`xc` → `Ja(e)`) y cae a 16:9 si no hay ninguna.

### 1.6 Audio en Cinema Studio (OBSERVADO)

El modo `audio` tiene `voiceMode ∈ voiceover | change-voice | translate`. Usa los jobs de TTS, voice-change y traducción y calcula el coste por duración y fps del video de origen (`F4NjuleDMIZLf3K7`, `Ht`).

---

## 2. Construcción de prompts en toda la app

### 2.1 `enhance_prompt`: es un flag, no un endpoint

- OBSERVADO: no existe ningún endpoint `/enhance` ni `/prompt` de mejora en el catálogo (`data/endpoints-uniq.tsv`), salvo `POST /api/v1/ai-employees/instructions/enhance`, que es para instrucciones de agentes, no para prompts de imagen o video.
- `enhance_prompt` viaja como booleano dentro de `params`:
  - Kling 3: `enhance_prompt:!o.multiShotEnabled&&o.enhancePrompt`, es decir, **se desactiva con multi-shot** (`4w8M-YBh9egzlUEk`);
  - Cinema 4.0: siempre `true`;
  - Soul cinematic: siempre `false`;
  - Veo3 con un "motion" que no sea el general: se fuerza a `true` (`q3eZyvqHvNOW6MQt`: `` case `enhance_prompt`: return !r||r===Or?t.enhance_prompt??true:!0 ``).
- El esquema genérico de modelos declara el prompt como `{instruction→prompt, enhance→enhance_prompt, negative→negative_prompt, system→system_prompt}` (`6ZrCILdQPKVmymat`).
  - Validaciones: `prompt-required`, `prompt-too-short`, `prompt-too-long`.
- **INFERIDO:** la mejora la hace el backend (o el proveedor) con un LLM. **DESCONOCIDOS:** el modelo y el system prompt.

### 2.2 Límites de longitud (OBSERVADO)

| Ámbito | Límite |
|---|---|
| Cinema image / v2 / grid / soul location | `>2500` → error (`F4NjuleDMIZLf3K7`, `CuIHD5ZUc3DhCNRO`) |
| Plano de multi-shot (v2) | 512 |
| Kling motion control | `prompt:{maxLength:2500}` (`zU2Fxb7vqXsC5tXd`) |
| Gemini Omni | `prompt:{maxLength:2e4}` (`zU2Fxb7vqXsC5tXd`) |
| Otros modelos | Hay 16 modelos con 2500 y 6 con 3000 en las tablas de capacidades |
| Marketing Studio v2 video | 5000 (`aBzjK6eGdwFYc9GN`: `marketing_studio_catalog_prompt_too_long`) |
| Cinema 3.x / 4.0 | `promptRestrictions.maxLength` (mensaje con `SEEDANCE_2_0_MAX_PROMPT_CHARACTERS`, lo que sugiere que heredan el límite de Seedance) |

### 2.3 Plantillas de prompt embebidas en el cliente (OBSERVADO)

1. **Editar dibujando sobre video** (`iGdN-eGy27IxMXUL`, `Ql`, `model:'video_edit'`):
   > `The following images are frames from this video with hand-drawn annotations marking the changes to make: ${<<<image_i>>>…}. Apply the indicated edits to the video. Do not render the drawings or annotation markers themselves. Keep everything else consistent.\n\n${userPrompt}`
2. **Edición por región** (`JmGBB1ezNqvrV5SR`, modelos `seedream_v5_pro` / `grok_image`). La caja se calcula en una rejilla de 1000×1000 con un contexto un 15 % mayor:
   > `Perform a strictly localized edit on the supplied original image.` / `USER EDIT: …` / `STRICT EDIT REGION — … Normalized bounding box: [x1,y1,x2,y2] … Source-image pixel rectangle …` / `CONTEXT REGION — 15% larger …` / opcional `BLACK MASK MODE …` / reglas: "fit entirely inside", "Never continue a generated shape … across the strict boundary", "Preserve the original image color grading exactly…" / `Execute now: …`
3. **Retrato del festival** (`xiqjbe83NMjhqBfC`, conserva la identidad):
   > `Keep ${e} from the reference photo EXACTLY as they are. Do not change, beautify, slim, age… Change ONLY the clothing, the background and the lighting. CLOTHING: a black tuxedo… BACKGROUND: pure solid black… LIGHTING: one soft key light… FRAMING: vertical portrait, waist up… Remove sunglasses… keep a headscarf, hijab, turban…`
4. **Emociones**: fragmentos `(with … emotion)` (§1.3).
5. **Tour de onboarding ("touring")** (`RTgd9uucAEwYxCNJ`). Es un mock de cliente (`` q=`touring.mock.runs` ``) de un contrato de servidor con `flows → steps → actions → prompts{requires, template}`:
   - `Create a marketing design using {style} and featuring {product}. Strong typographic hierarchy, production-ready layout, no placeholder text.`
   - `Place {product} on {scene}. PRODUCT LOCK: keep the product exactly as in its reference. Matched lighting and contact shadow, marketing-ready still life.`
   - `Six-second product film: {product}, {motion}, macro detail pass, final hero frame.`
   - `Character sheet of {character}: full body, three-quarter and close-up panels, identical identity across panels.`
   - `Ten-second {format} starring {character}, natural direct-to-camera delivery, handheld energy, lip-synced speech.`
   - `Establishing plate of {setting}, cinematic anamorphic framing, no people, …` / `Thirteen-second commercial in {setting}: the actor from the character sheet presents the exact product from the product sheet. Hard cuts, macro product teases, one clean hero packshot before the final frame.`

   Cada `action` declara: `job_set_type` (`nano_banana_2`, `seedream_v5_pro`, `seedream_v5_pro_layer_separation`, `seedance_2_0`…), `aspect_ratio`, `quality`, `batch_size`, `duration_seconds`, `toggles` e `input_groups`. Es el ejemplo más claro de cómo Higgsfield modela una **receta multi-paso como datos**.
6. **Agente (Supercomputer)** (`0H5DUmDn2NH9_jpl`). Mensaje oculto que se añade al mensaje del usuario:
   > `Generation settings selected by the user for this message. Apply these settings to generation requests for this turn; they replace generation settings from earlier turns. In auto mode, choose the generation type and model from the request … If the request is incompatible with these settings, ask the user before substituting.` + `JSON.stringify(settings)`
7. **AI Host** (`W5HZKa8cBdbAEjTt`): `prompt + "  Avatar details: Age: …, Gender: …, Background: …" + "  Target video duration: approximately ${t} seconds. Write the narration to fit this duration."`
8. Hay prompts de ejemplo (no plantillas) para Ad Multiplier, UGC y faceless (`4XZ4Fgmi9UwQPcZx`, `Y7ClXRDJQxASBBfV`, `wQPwOkR3wB-obrtV`), con frases como "Use Ad Multiplier to replace the person in this ad while preserving its motion, framing, cuts, timing, aspect ratio, audio, captions…". Son sugerencias para el agente.

### 2.4 De preset a prompt (OBSERVADO / INFERIDO)

- **Motions, styles, viral effects, Genjutsu, presets de chains:** el cliente solo envía el `preset_id`, `motion_id` o `style_id` (por ejemplo, el legacy `{motion_id, prompts, prompt, enhance_prompt}` en `Maz5GZfEgFLo2Hb9`, o `/job-set-chain-presets` con `productKey` y `pricingSchema` en `0BViRkn0BltqDeg-`).
  - **INFERIDO:** la plantilla de prompt del preset vive en el servidor o el CMS. **DESCONOCIDO:** su contenido.
- **Mixed media** (`pEZfVQ7swSkShZ3H`). El preset trae `param_configs` (`color-picker`, `dropdown`…). Cada parámetro admite un valor de catálogo o `custom_prompt`. El cliente construye `config{key: valor|promptLibre}` y llama a `/chains/mixed-media {preset_id, config, input_video, start_seconds, end_seconds, target_fps, resolution}`.
  - Coste: `floor(dur*fps)*(4k?4:2)`, es decir, por fotograma. **INFERIDO:** es estilización de video a video fotograma a fotograma.
- **Marketing Studio v2** (`aBzjK6eGdwFYc9GN`, `je`). El cliente no compone texto. Envía:
  ```
  {type:'ugc_v2'|…, params:{…identity(preset/style), prompt?, hook_id?, setting_id?, avatars[], product_ids[],
   resolution, aspect_ratio, duration 4–30, generate_audio:true, medias≤6, batch_size}}
  ```
  - Tipos: `ugc`, `product_shots`, `2d_motion`, `ads`, `poster`, `marketplace` (`b_YxNvcSR2e6UOPw`).
  - Los "hooks" y "settings" salen de `/marketing-studio/setup/hooks`.
  - En historial, los prompts guardados empiezan por `HOOK:\n` / `SETTING:\n` (`anN04m4JQQZ6O_PV`: `` pe=/^(?:HOOK|SETTING):\n/ ``). **INFERIDO:** el servidor antepone bloques HOOK y SETTING al prompt.

### 2.5 Negative prompt, traducción, "prompt guide" (OBSERVADO)

- **Negative prompt:** existe en el esquema genérico y en 13 chunks, pero Cinema/Soul lo envía vacío (`negative_prompt:''`).
- **Traducción:**
  - `prompt_language` (§1.2);
  - `/image-translations` (traducción de texto en imágenes; aparece en la allow-list `QhqiFCLt1Ukztv0Y`);
  - modo `translate` del audio de Cinema Studio;
  - `Accept-Language` en `/ai-host/script-suggestions`.
- **"Prompt guide":** `/nano-banana-pro-prompt-guide` es una página SEO. No hay un "prompt builder" interactivo en el código: no aparece `promptBuilder`, `magicPrompt` ni `improvePrompt`.
- **Funciones de prompt asistidas por IA** (todas en el servidor):
  - `POST /ai-host/script-suggestions` y `/ai-host/videos/generate-script` (`_7Rhkh4-kqttScvL`);
  - `POST /youtube-faceless/topic-suggestions`;
  - `/claudesfield/chats/{id}/suggestions`;
  - `/search?query=…&system_prompt_version=` (§1.1);
  - nodos `llm` del canvas con `user_prompt` y `system_prompt` que el **usuario** edita (§3.6).

---

## 3. Composición multi-paso ("chains" y estudios)

### 3.1 Inventario de `/chains/*` (OBSERVADO; chunk → cuerpo)

| Chain | Cliente (chunk) | Cuerpo enviado | Pasos internos |
|---|---|---|---|
| `/chains/link-to-ad` | `b-TYNd18LN1JZ9AW` | `{params:{brand_kit_id, preset_id, quality}, client_meta:{source:'brand_kit'}}` (`?dry_run=True` para cotizar) | UI: `steps:['scrapping','preview','preset-select','result']`. Antes: `POST /brand-kits/scrap` (URL→marca) y `POST/PUT /brand-kits` (`logo,title,description,product_images,secondary_images,colors`), `/link-to-ad-presets`. Pasos del servidor **DESCONOCIDOS** |
| `/chains/outfit-matchcut` (app "clipcut") | `5zyR_mlZwqVg71hI` | `{params:{input_images…}}`; antes, `/jobs/nano-banana-2-outfit-collage` (05-apps) | **INFERIDO:** collage → clips por outfit → corte al beat en el servidor |
| `/chains/sticker-matchcut` | `q3eZyvqHvNOW6MQt` (`wr.sticker_matchcut`) | `{params}` | DESCONOCIDO |
| `/chains/beat-fit-nano-banana` (beatfit / urban-cuts) | `Da3u6CaMRZenrBm8`, `q3eZy…` | `{params}`; tamaños fijos por calidad (`standard` 768p / `high` 1024p; `ki()` 34/48) | **INFERIDO:** Nano Banana genera los fotogramas y el servidor los ajusta al ritmo |
| `/chains/game-character-creator` | `LScH7uqaSjnLhVTb` | Se usa para **`edit_video_scene_lighting`** (reiluminar video: tiempo/clima) con `preset_id` de `/job-set-chain-presets` (`0BViRkn0BltqDeg-`) | DESCONOCIDO (el nombre no coincide con el uso) |
| `/chains/draw-to-video` | `LScH7uqaSjnLhVTb`, `iGdN-eGy27IxMXUL`, `3g8M9zmGUvFT7mvg` | Cabecera `Hf-Surface: draw-to-video`; `{params:{prompt, video, sketch, …}, client_meta:{surface}}`; coste en `/chains/draw-to-video/cost` | El lienzo de dibujo también lanza jobs directos: `seedance_2_0` con `medias:[{role:'image', data:sketch}]`, `minimax_h3` (2K) o `nano_banana(_2)` con `is_draw:true` |
| `/chains/cinematic-video-editor` | `bEI7Zi8FXKvkRlBa` | `{params:{mode, prompt, medias(1 video), duration 4–30, resolution, width, height, segment{start_seconds,end_seconds}, sketch?, switch_seconds?}, client_meta:{surface}}` | `mode ∈ forward_extend, backward_extend, shot_edit, transition, draw_edit` (`g1zq2OAw4goeYa3N`); la guarda usa la clave `seedance_2_5` → **INFERIDO:** el motor de base es Seedance 2.5 |
| `/chains/motion-control` | `RKpCrebWFpypqouZ`, `PSiNTavNmDtpuA9-` | `{params, use_unlim, use_free_gens, parent_id}` con `model_name:'kling-v2-6'\|'kling-v3'` | Kling motion control encadenado (+2 créditos) |
| `/chains/reframe` y `/reframe/batch` | `RKpCrebWFpypqouZ` | `/batch` si `duration > 15.25` s | **INFERIDO:** trocea, reencuadra y une |
| `/chains/viral-hub` | `RKpCrebWFpypqouZ` | `{params, use_free_gens, parent_id}`; además `POST /viral-hub/renders` (`kX1BjDm4RnP7IqTv`) | Preset del CMS + render |
| `/chains/dubbing`, `/chains/voice-change` | `RKpCrebWFpypqouZ` (`H={dubbing_lipsync, voice_change_merge}`) | `{params}` | **INFERIDO:** STT→traducción→TTS→lipsync / cambio de voz→merge |
| `/chains/mixed-media`, `/chains/mixed-media-preview` | `pEZfVQ7swSkShZ3H` | §2.4 | Preview barato y luego render completo |
| `/chains/seedance-eye-mask-sam` | `q3eZyvqHvNOW6MQt` (`mr()`) | Igual que `seedance_2_0` cuando `use_eye_mask_sam` | **INFERIDO:** SAM segmenta los ojos y Seedance protege la identidad |

Patrón común (OBSERVADO, por ejemplo en `5zyR_mlZwqVg71hI`):
```
fetch(`/chains/x`+(credits?`?dry_run=True`:``),{method:'POST',body:JSON.stringify({params})})
```
La respuesta tiene la misma forma que `/jobs`: `{job_sets:[{jobs:[…]}]}`. **INFERIDO:** el orquestador del servidor crea los jobs intermedios y el cliente solo sigue el job final por SSE (ver 02).

### 3.2 Reels Studio: segmentar → elegir → coser (OBSERVADO)

Chunks: `CUbe3piocK3eWgDS`, `lpCUasx9bLXMQMAC`.

1. `POST /reels/generate` con:
   ```
   {params:{resolution, aspect_ratio, lang?, preset_id, preset_source, medias:[{role:'video', data:{id, type:'video_input'}}]}}
   ```
   Video de entrada: 4–120 s, ≤ 200 MB, mp4/mov.
2. `GET /reels/sessions/{id}` devuelve la sesión con sus segmentos.
3. Para regenerar un segmento: `POST /jobs/v2/reels_studio_clip {params:{parent_job_id}}`.
4. Para elegir el clip de un segmento: `POST /reels/sessions/{id}/segments/{i}/primary`.
5. Para unir: `POST /reels/sessions/{id}/stitch`.
6. Hay además `DELETE /cutups/sessions/{id}/clips/{clip}`, `PATCH /reels/sessions/{id}` y presets `/reels/presets[/user]`.

### 3.3 AI Host / "facely": guion por bloques (OBSERVADO)

Chunks: `_7Rhkh4-kqttScvL`, `W5HZKa8cBdbAEjTt`, `ordcw14er2psRBxo`.

- **Recursos:** `channels`, `hosts` (`/candidates`, `/select`, `/retry`), `locations`, `motion-styles` (preset o `custom` con `motion_style_id` o una referencia de video), `script-suggestions`, `videos/generate-script`.
- **Video:** `blocks[{id, text, instructions, references}]`, `/script-versions`, `PATCH`, `/blocks/{b}/regenerate`, `/regenerate`, `/recreate`, `/assemble`, `/upscale(+/estimate)`, `/publish`.
- **Generación:** `POST /jobs/v2/ai_host_video` con `Idempotency-Key`. Para regenerar un solo bloque se envía `block_ids:[blockId]` (`ordcw14er2psRBxo`).
- **Estilos gráficos:** `auto, press, web-brutalism, editorial-overlay, bold-editorial, funky-modular, luminous-interface, documentary-collage, minimal, zine-collage, higgsfield-academy`.
- **Formatos:** `reel→9:16`, `episode→16:9`; resolución 480p–1080p.
- **Errores:** `script_element_not_found` y `script_element_not_ready` (elementos mencionados en el guion).

### 3.4 Marketing Studio / Ads Studio (OBSERVADO)

- **Marketing Studio v1:** `marketing_studio_video`, `marketing_studio_hook`, `marketing_studio_brand_kit_preview/scrape`, `ms_image`, `marketing_storyboard` (con versiones: `GET /jobs/marketing-storyboard/{id}/versions[/{v}]`, `iLzQTy-RiSrfpgyT`).
- **Marketing Studio v2:** `marketing_studio_2_image`, `marketing_studio_v2_video` (payload en §2.4; validaciones `product_image_required` y `prompt_required`, `aBzjK6eGdwFYc9GN`).
- **Recursos:**
  - `/marketing-studio/{products(/scrap|/extract), webproducts, avatars(/extract|/batch), brand-kits, ad-references, setup(/hooks|/settings|/pin)}`;
  - costes en `/marketing-studio/v2/costs(/quote)`;
  - catálogo CMS en `/marketing-studio-v2/{catalog, categories/{c}/presets, motion-presets}`.
- **Ads Studio / AI CMO** (`fnf-ai-cmo`): `/v1/ads/brands(/manual|/{id}/research|/products|/generate(/quote)|/events)`, `/v1/ads/creatives/runs`.
  - **INFERIDO:** investigación de marca y generación de creativos con un agente en el servidor; el cliente solo sigue `runs` y `events`.

### 3.5 Draw-to-Video, Popcorn, storyboard

- **Draw-to-Video:** ver §3.1 y §2.3.1.
- **Popcorn** (`/_private/popcorn`): la ruta existe en el routemap, pero no hay un chunk asociado en `data/routemap.tsv`. Su API es **DESCONOCIDA**.
- **"Storyboard":**
  - `/video-storyboards` y `/storyboard/.../board.vtt` son **miniaturas VTT** para scrubbing, no composición (`6vtfmj1lOeNv-7R_`);
  - el "storyboard de 6 fotogramas" y "next scene" son presets o apps de imagen (`NANO_BANANA_2_SHOTS`, `NEXT_SHOTS`; textos en `8wBZrgSAyp9IDdU8` y `zU2Fxb7vqXsC5tXd`).

### 3.6 Canvas / Flow: grafo de nodos (OBSERVADO + INFERIDO)

- **Tipos de nodo** (`EsfzyjiEBRSekuRC`): `generate-image`, `generate-video`, `generate-audio`, `llm` (los cuatro son `nodeType:'generate'` con distinto `generation_type`), `media`, `file`, `prompt`, `text`, `note` (`stickyNote`) y formas (`shape`).
- **Puertos:** tipos `image, text, video, audio, file, model, number`. Roles especiales por id o etiqueta: `system_prompt`, `start_frame`, `end_frame` / `input_image_end`.
- **Nodo LLM:** `input.user_prompt`, `input.system_prompt`, `input.model`. Sus prompts pueden citar nodos de entrada con `<<<nodeId>>>`, que se resuelven con las aristas entrantes (`7QkTzbGs8uR7EAji`: `Be({incomingEdges, nodeLookup, results})`). Al duplicar, se remapean los ids (`2_t96XSIb7dwJG6y`, `En`).
- **Ejecución:**
  - `POST {canvas-worker}/api/flow/{id}/run`;
  - `/nodes/{n}/cancel`;
  - `/nodes/from-job`;
  - `/node-types` (catálogo servido por el worker);
  - estado por WebSocket (ver 04);
  - el agente lo usa con la herramienta `canvas_run`.
  - **INFERIDO:** el grafo se ejecuta en el servidor (Cloudflare Worker / Durable Object) en orden topológico y emite resultados por nodo por WS. **DESCONOCIDOS:** el cuerpo de `/run`, el orden y la política de caché.

---

## 4. Post-composición

| Función | Dónde | Detalle |
|---|---|---|
| Stitching / concatenación | Servidor | Reels `/stitch`; AI Host `/assemble`; faceless `/youtube-faceless/episodes/{id}/edits(/apply)`; reframe `/batch`. No hay ffmpeg.wasm para concatenar en el cliente (OBSERVADO: los únicos muxers son los del editor) |
| Color grading | **Cliente** (WebGL) | `1B3XP81OO-DMc4xI` ("color grading WebGL pipeline"); parámetros `color_correct, enhance_detail, bloom, halation, lens_haze, exposure_adjust, film_grain`; se guarda con `PUT /jobs/{job_id}/edit-image` (`hHP0zpz-eyXdwQvp`: `` Failed to save color grading job ``). Uploads con `source:'color_grade'`. **INFERIDO:** solo imagen |
| Editor de video "Fable" | Cliente + sync | Comandos de documento: `comp.*`, `layer.*`, `keyframe.*`, `effect.*`, `mask.*`, `marker.*`, `track.*`, `template.*`, `render.{start,status,cancel,frame,output}`, `batch.run`, `agent.catalog/context` (`yP5cucrS2K_UvnSc`). **Exportación en el navegador** `{container: mp4\|webm\|png, video:{codec: avc\|vp9\|png}, audio:{aac\|opus, 48 kHz, 2 ch}}`, límite de 16 MP por fotograma, `probe()` del encoder (WebCodecs). "AI Matte": SAM 3 → MatAnyone 2 o BiRefNet (`Ehq1iwaKgbudvzwm`) |
| Audio | Servidor | TTS (`text2speech_v2`, `elevenlabs_v4(_turbo)`, `seed_audio`, `qwen_audio_tts`), dubbing/voice-change (chains), lipsync (`/jobs/kling(2-6)-lipsync`, `sync-so`), `generate_audio`/`sound` en el propio modelo de video, `/sounds` y `/voices` (bibliotecas). No hay un endpoint de "añadir música" aparte: **DESCONOCIDO** si existe |
| Upscale | Servidor | `topaz-*`, `bytedance_video_upscale`, `flux_video_upscale`, `video_upscale`, `sora2_video_upscale`; AI Host y faceless con `/upscale(/estimate)` |
| Reframe | Servidor | `/chains/reframe(/batch)`; job `reframe` |
| Relight / inpaint de video | Servidor | `cinematic_video_relight`, `cinematic_video_inpaint`, `edit_video_scene_lighting` |

---

## 5. Cómo recrearlo con nuestro stack (Next.js + fal.ai)

Partimos de lo que ya existe en el repo: `src/generation/catalog/*.ts` (un modelo por archivo), `to-fal.ts`, `poll.ts` y `fal-schemas.json`. Los endpoints de fal citados se comprobaron en el catálogo público el 2026-10-15.

### 5.1 Lo que NO podemos copiar (honestidad)

- Los **system prompts** de `enhance_prompt`, `system_prompt_version v1/v2`, RAG y "memorias", las plantillas de presets (motions, viral, chains), los hooks y settings de Marketing Studio y el orquestador de chains están en su backend. No están en el bundle.
- Lo que tendremos es **diseño propio** inspirado en la forma de los datos (OBSERVADO), no una copia de su lógica de prompts.
- Los catálogos de cámara, lente, género, época y luz también son del servidor. Hay que **escribir los nuestros**.

### 5.2 Composer tipo Cinema Studio

**Modelo de datos** (TypeScript, por ejemplo en `src/composer/types.ts`). Imita su forma: escenas, medias con rol y tokens.

```ts
type MediaRole = 'image' | 'start_image' | 'end_image' | 'video' | 'audio';
interface ComposerMedia { role: MediaRole; url: string; id: string }
interface Element { id: string; name: string; category: 'character'|'environment'|'object'; images: string[] }
interface Shot {           // = scenes[] de Higgsfield
  id: string; prompt: string;              // admite <<<elementId>>> y <<<image_N>>>
  duration: number;                        // 1..12, Σ en [3, 15]
  cameraMoveId?: string; speedramp?: 'auto'|'impact'|'slowmo'|'linear';
  emotions?: Record<`${string}:${number}`, EmotionId>;   // clave elementId:ocurrencia
}
interface CinemaForm {
  mode: 'single' | 'multi_auto' | 'multi_custom';
  prompt: string; shots: Shot[]; medias: ComposerMedia[];
  look: { genreId?: string; eraId?: string; pacingId?: string; lightId?: string;
          cameraBodyId?: string; lensId?: string; focalMm?: number; aperture?: string;
          paletteHexes?: string[]; gradeId?: string };
  aspectRatio: 'auto'|'16:9'|'9:16'|'4:3'|'3:4'|'1:1'|'21:9'; resolution: '720p'|'1080p'|'4k';
  generateAudio: boolean; enhance: boolean; language: 'en'|'zh'|'auto';
}
```

**Catálogos como datos** (`src/composer/catalog/*.ts`, versionados). Cada entrada lleva `{id, label, promptFragment, thumbnail?}`:
- `camera-moves.ts`: dolly in/out, truck, pedestal, crane, orbit, whip pan, crash zoom, handheld, Steadicam follow, FPV, bullet time… (**nuestra** lista; la de Higgsfield es DESCONOCIDA).
- `lenses.ts`, `bodies.ts`, `apertures.ts`, `focal.ts`. Mismo esquema que su `camera_settings` (cámara + lente + focal + apertura); `focal` se pinta como `"35mm"`.
- `genres.ts`: copiable 1:1 de lo OBSERVADO (Action…Sitcom). `eras.ts` (1920s…2020s). `pacing.ts`, `lights.ts` (presets + "custom": 26 direcciones × brillo/difusión/color, ≤ 2 luces, como su `light_custom`).
- `emotions.ts`: las 24 emociones con su fragmento (estructura OBSERVADA; fácil de reescribir con nuestras palabras).
- `grades.ts`: looks de post en el cliente (None, Natural, B&W, 16mm…) con los mismos parámetros del pipeline WebGL (§1.3).

**Compilador de prompt** (`src/composer/compile.ts`). Es determinista y se ejecuta antes del enhancer:
1. Resolver los tokens `<<<elementId>>>`:
   - si el endpoint admite referencias (`bytedance/seedance-2.0/reference-to-video`, `fal-ai/kling-video/o3/standard/reference-to-video`), cada elemento pasa a `image_urls[]` y el token se reescribe a la sintaxis del proveedor (`@image_N` o `@Element1`), igual que hace `LyFzgohNFP7q8z9A`;
   - si no, el token pasa a `name` + una descripción breve.
2. Insertar las emociones tras cada mención, como su `gc()`.
3. Añadir fragmentos del look en orden fijo: `[movimiento] [lente/focal/apertura] [luz] [género/época/ritmo] [paleta]`.
4. Multi-shot:
   - Kling 3/O3: `multi_prompt:[{prompt, duration}]` + `shot_type:'customize'` (para `multi_custom`) o `'intelligent'` (para `multi_auto`). Ese enum `customize|intelligent` sale de `src/generation/fal-schemas.json` (Kling O3). **INFERIDO** como equivalente de su `multi_shot_mode custom|auto`;
   - modelos sin multi-shot: un job por escena y luego stitching (§5.4).
5. Validación por modelo (longitud, Σ duración, número de referencias), como su `validation` (§2.2), usando los límites de `fal-schemas.json`.

**Enhancer (LLM).** `POST /api/prompt/enhance` (route handler de Next) llama a `openrouter/router` en fal (endpoint verificado) o a un LLM directo.
- El system prompt es **nuestro**. Por ejemplo: "Eres director de fotografía. Reescribe el prompt en inglés, conserva literalmente los tokens `<<<…>>>` y `@image_N`, no inventes personajes, máximo N caracteres, respeta cámara/lente/luz dados".
- Se versiona como `systemPromptVersion` (tomamos la idea de su `v1/v2`) en `src/composer/prompts/enhance.v1.md`.
- Se desactiva con multi-shot, como hacen ellos con Kling.
- Se guarda `{original, compiled, enhanced}` en el historial para poder "recrear" (ellos lo hacen con `recreate*Form`).
- Idioma: un parámetro `language`. Si el modelo de base rinde mejor en otro idioma, se traduce en el mismo paso.

### 5.3 Plantillas de prompt reutilizables (data-driven)

Copiar la **forma** de su "touring" (§2.3.5): `prompts: { [action]: { requires: string[], template: string } }` con `{placeholders}`, más `actions: {job, aspect_ratio, quality, batch, duration, input_groups}`.
- Sirve para apps, presets y recetas sin escribir código nuevo.
- Plantillas de utilidad que conviene escribir con nuestras palabras: edición por región con bbox normalizado (§2.3.2), editar video dibujando (§2.3.1) y bloqueo de producto o identidad ("PRODUCT LOCK", "keep identity").

### 5.4 Chain runner (sustituye a `/chains/*`)

**Definición** (`src/chains/defs/*.ts`):
```ts
interface ChainStep { id: string; endpoint: string;            // fal endpoint id
  input: (ctx: ChainCtx) => Record<string, unknown>;            // usa outputs previos
  fanOut?: (ctx) => unknown[];                                  // p. ej. una por escena
  pick?: 'first' | 'user' }                                     // 'user' = elegir primario (Reels)
interface ChainDef { id: string; steps: ChainStep[]; finalize?: 'concat'|'mux-audio'|'none' }
```

**Ejecución:**
- Route handler `POST /api/chains/[id]` crea un `run` (KV/DB o Vercel Blob JSON).
- Envía los pasos con la cola de fal (`fal.queue.submit` + webhook o el `poll.ts` existente).
- Persiste `steps[i].status/output`.
- Expone `GET /api/chains/runs/[runId]` (o SSE).
- Usar idempotencia por paso (ellos usan `Idempotency-Key`) y `dry_run` para cotizar (ellos usan `?dry_run=True`).

**Recetas equivalentes** (endpoints de fal verificados):

| Receta | Pasos en fal |
|---|---|
| Multi-shot con modelo sin multi-shot | N × `bytedance/seedance-2.0/image-to-video` o `fal-ai/kling-video/v3/pro/image-to-video` (último fotograma → siguiente `start_image` con `fal-ai/ffmpeg-api/extract-frame`) → `fal-ai/ffmpeg-api/merge-videos` |
| Link-to-ad | Scraping propio (fetch + LLM extractor en `openrouter/router`) → brand kit → imagen `fal-ai/nano-banana-pro/edit` → video `bytedance/seedance-2.5/reference-to-video` → `fal-ai/ffmpeg-api/compose` (logo/CTA) |
| Outfit / beat match-cut | Imágenes `fal-ai/nano-banana-2/edit` por outfit → clips cortos i2v → detección de beats en el servidor (librería propia) → `fal-ai/ffmpeg-api/compose` con cortes en los beats + `fal-ai/ffmpeg-api/merge-audio-video` |
| Draw-to-video / edit | Fotogramas anotados + plantilla §2.3.1 → `fal-ai/kling-video/o3/pro/video-to-video/edit` o `blackforestlabs/flux-3/edit-video` |
| Extender / transición (su `cinematic-video-editor`) | `minimax/h3-max/extend-video`, `blackforestlabs/flux-3/extend-video`, `fal-ai/ltx-2.3-quality/extend-video` |
| Reframe | `luma/agent/ray/v3.2/reframe` o `fal-ai/ltx-2.3/reframe` (trocear si > 15 s, como su `/batch`) |
| Dubbing / voz | `fal-ai/elevenlabs/dubbing` o `fal-ai/dubbing`; lipsync con `fal-ai/sync-lipsync/v3` o `veed/lipsync/v2` |
| Audio de escena / música | `fal-ai/mmaudio-v2` o `mirelo-ai/sfx-v1.5/video-to-audio` (SFX), `elevenlabs/music/v2.5` (música) → `fal-ai/ffmpeg-api/merge-audio-video` / `merge-audios` / `loudnorm` |
| Subtítulos | `fal-ai/workflow-utilities/auto-subtitle` o `fal-ai/auto-caption` |
| Upscale | `fal-ai/seedvr/upscale/video`, `topaz/upscale/video/precision`, `fal-ai/bytedance-upscaler/upscale/video` |
| Matte / máscara (su AI Matte, eye-mask-sam) | `fal-ai/sam-3/video` |
| Reels (segmentar → elegir → coser) | Segmentación propia (escenas por umbral) → un job por segmento con N candidatos → el usuario elige el primario → `merge-videos` (su `/stitch`) |

### 5.5 Canvas / flow (si se quiere)

- React Flow en el cliente.
- Nodos: `prompt`, `media`, `llm (system/user)`, `generate-{image,video,audio}`.
- Puertos tipados igual que los suyos.
- Ejecución en el servidor con un ordenamiento topológico sobre el mismo `ChainDef` (cada nodo es un `ChainStep`).
- `<<<nodeId>>>` en los prompts del LLM para interpolar las salidas de los nodos de entrada.
- El estado en vivo (sin WebSocket propio) basta con SSE desde el route handler.

### 5.6 Post-producción en el cliente

- Color grading: un shader WebGL con los 7 bloques de parámetros observados. Es barato y no consume créditos.
- Exportación: WebCodecs (mp4/AVC+AAC, webm/VP9+Opus), por ejemplo con `mediabunny`. Los mensajes de error de muxer del bundle (`AvzSlFL4S3axb9k9`, `HpqO5qqNS7gEcdjx`: "Couldn't parse ADTS header…") sugieren una librería parecida; **INFERIDO**, no está identificada. Para unir muchos clips, mejor `fal-ai/ffmpeg-api/compose` en el servidor.

---

## 6. Desconocidos principales

1. El contenido de cualquier system prompt del servidor: `enhance_prompt`, `system_prompt_version v1/v2`, `use_rag_search`, `apply_memories`, la traducción `prompt_language`, la composición HOOK/SETTING.
2. Los valores de los catálogos `creative-controls` (género 4.0, época, ritmo, luz, cámara, lente, apertura), `/camera-settings` y `/camera-movements`.
3. Los pasos internos y los modelos de base de cada `/chains/*`, salvo las pistas indicadas (Seedance 2.5 en el editor cinemático, Kling en motion-control, Nano Banana en beat-fit).
4. El cuerpo de `POST /api/flow/{id}/run` y la semántica exacta de ejecución del canvas.
5. Popcorn: ruta presente, implementación no localizada.
6. El mapeo real de `cinematic_studio_*` a proveedores. **INFERIDO** a partir de los límites y del idioma: 3.x usa el estilo de Seedance; 2.5 usa el estilo de Kling (`mode`, `sound`, `cfg_scale`, `multi_shot`).
