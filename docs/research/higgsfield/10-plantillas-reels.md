# Higgsfield: plantillas de reels, pre-producción y efectos "listos para usar"

Análisis estático del frontend público minificado (`hf-assets/868a8dba-*.js`). No se hizo ninguna petición a higgsfield.ai. La única consulta de red fue al catálogo público de fal (`api.fal.ai/v1/models`) para la sección 5.

Leyenda: **[O] OBSERVADO** (chunk + fragmento), **[I] INFERIDO**, **[D] DESCONOCIDO**. Los nombres de chunk omiten el prefijo `868a8dba-`.

Este informe no repite lo que ya está en `05-apps.md` (mapa de apps, `POST /fnf/workflows`) ni entra en Soul (06), Genjutsu (07), avatares/lipsync (08) ni composición/prompts (09).

---

## 0. Resumen ejecutivo

Higgsfield no tiene un único "motor de plantillas de reel". Tiene **cinco familias**, y cada una monta el reel en un sitio distinto:

| Familia | Dónde se monta el reel | Qué aporta el usuario | Ejemplos |
|---|---|---|---|
| **A. Code-based presets (Viral Hub, `kind:"code"`)** | **En el navegador**: Canvas 2D/WebGL2 dibuja cada frame, WebAudio pone la música o los SFX, y **mediabunny + WebCodecs** codifica el MP4. Después se sube y se registra con `POST /viral-hub/renders` | Fotos, vídeo, texto | face-cut, word-reel, notebook, logo-cut, comment-cut, product-cut, stutter-cut… (27) |
| **B. Effect presets GLSL/JS (Viral Hub, `kind:"effect"`)** | En el navegador. Bundles con `manifest.json` y shaders GLSL (o un módulo JS), con uniforms de host (`uTime`, `uPrevFrame`…) | Imagen o vídeo y parámetros | `/effects`, laboratorio en `/viral-effects` |
| **C. Chain presets (Viral Hub, `job_set_type:"viral_hub_video"`)** | **En el servidor**: `POST /chains/viral-hub` con `preset_id`, medios, `slot_values`… | Medios por slot, textos y opciones | Plantillas "viral" de pago por créditos |
| **D. Apps-cadena dedicadas** | En el servidor (`/chains/*`) | Foto de persona, ropa, música o vídeo | ClipCut/outfit-matchcut, Beat-Fit (Urban Cuts), Sticker Matchcut, Kling Transition |
| **E. Reels Studio (`/shorts-studio`)** | En el servidor: sesión segmentada en clips, regeneración por clip y `stitch` final | Un vídeo (4–120 s) y un *preset* de estilo (del sistema o propio, creado a partir de un reel de referencia) | "Reels Studio" |

Hay además flujos guiados que producen **sets de imágenes** y no reels: Photodump, Fashion Factory y Popcorn/keyframes. También hay plantillas que no son de reel: Canvas templates, plantillas del marketplace de apps y plantillas de avatar de Lipsync.

**Hallazgo principal [O]:** las plantillas de reel con mejor acabado, las que tienen cortes al ritmo, SFX en cada corte y tipografía cinética, **se renderizan en el cliente**. El servidor solo guarda el MP4 final. Las plantillas generativas (beat-fit, matchcut, reels studio, chains) se resuelven en el servidor y el código no muestra cómo se detectan los beats.

---

## 1. Inventario de sistemas de plantillas y catálogos

### 1.1 Tabla de catálogos

| # | Sistema | Catálogo (fuente) | Esquema observado | Evidencia |
|---|---|---|---|---|
| 1 | **Viral Hub, unificado** | `GET /viral-hub/presets/all?lang&limit&offset&category&kind&main_page&search&show_hidden&type`; `/viral-hub/main-page-previews`; `/viral-hub/presets?lang&category`; `/viral-hub/presets/{id}`; `/viral-hub/presets/by-slug/{slug}`; `/viral-hub/chain-presets/{slug}`; `/viral-hub/types`; `/viral-hub/categories`; `/viral-hub/presets/{x}/how-it-works` | Respuesta `{presets[], total, limit, offset}`. El normalizador `Hb` conserva todo y normaliza `preview_media`, `preview_image`, `widescreen_media` y `widescreen_image`. Campos que usa el cliente: `id, slug, name, description, kind ∈ {code, effect, chain…}, job_set_type ('viral_hub_video'), inputs[], param_inputs[], param_choices, pricing, ip_check_required, categories[], preview_url, thumbnail_url, effects[]` | [O] `Yw2e1pkiSRelFdrE` @232489 `mF()`, @273855 `FR/IR/RR`; `GeH_7Xw7Ig8fYOXP` `kind:i?void 0:\`chain\``; `r2hw0ArjOTAPzGtC` `c.param_inputs`, `c.pricing`, `c.ip_check_required` |
| 2 | **Viral Hub, code-based (cliente)** | Registro estático en el bundle `Cq7KqhBzoazy10mD` con 27 *loaders* lazy (`"face-cut":async()=>{let{faceCutPreset:e}=await import(...)}`). La ficha visible sale del CMS (slug), pero la lógica va en el JS | `{id, name, description, thumbnailUrl, persistKey, defaultSettings, normalizeSettings, Settings, inputs[], postApplyView, bakeKey, apply()}` (ver §2.A) | [O] `Cq7KqhBzoazy10mD` (lista completa en §4.1) |
| 3 | **Effect bundles (GLSL/JS)** | Carpetas con `manifest.json`, cargadas desde el preset o soltadas en `/viral-effects` | `manifest.json` v`"1.0"` (ver §3) | [O] `HGjaryBWPxwEApI8` (validador), `5g58CAm6eHq8ll6_` (`n.kind===\`glsl\`` → `addGlsl`; si no, `addJs`) |
| 4 | **Apps de plantilla (≈65)** | `GET /fnf/applications/explore`, `/fnf/applications?category=` (ya en 05). Ficha: `GET /blocks/apps/items/{slug}` | Ficha → `{id,title,name,description,short_description,detail_media,type,is_only_video,input_media,slug,image_template,video_template,animate_template,author,media_description,how_to_title,how_to[{header,text,image}],medias[],info_header,info_text,info_items[{icon,header,text}],faqs[{question,answer}],cta_title,cta_description}`. Cada `*_template = {slug, cost, inputs:[{id,type,properties}]}` | [O] `jCvphhIoPfzXpCEq` @228205 `kN()` (`imageTemplate:e.image_template,videoTemplate:e.video_template,animateTemplate:e.animate_template`) |
| 5 | **Reels Studio presets** | `GET /reels/presets?size=50&user_cursor&preset_cursor` (mezcla `presets[]` del sistema y `user_presets[]`); CRUD `POST /reels/presets/user`, `PATCH/DELETE /reels/presets/user/{id}` | Normalizado: `{id, name, source:'preset'\|'user', media, prompt, created_by_you, card_type, preview_media_urls, image_medias[], video_medias[]}`. Para crear: `{name, thumbnail, video_id, image_medias?, video_medias?}` | [O] `lpCUasx9bLXMQMAC` @9767 `ot()`/`st()`, @3704 `_e()`; `CUbe3piocK3eWgDS` `te.mutateAsync({name:e,thumbnail:T,video_id:E,...})` |
| 6 | **Beat-Fit references** | `GET /beat-fit-references?type_filter=cloth\|music&size&cursor`, `GET/DELETE /beat-fit-references/{id}`, `POST /beat-fit-references` | Ropa: `{id,name,cloth_image{id,url,type},is_internal}`. Música: `{id,name,audio_input{url},preview_media_input{url},is_internal}`. Para crear música: `{type:'music',audio_input_id,name}`. Para crear ropa: `{cloth_image:{id,url,type:'nano_banana_job'},name}` | [O] `Da3u6CaMRZenrBm8` @7570 `Ri()`, @8884 `Yi()` |
| 7 | **Outfit-collage presets (ClipCut)** | CMS `/nano-banana2-outfit-collage-presets?lang&search&size&show_hidden=false` y colecciones del usuario `/outfit-collages` | `{id,name,description,preview_media,tag}` | [O] `xH-QdkUWJbJ3Rieo` `R()/z()`; `5zyR_mlZwqVg71hI` |
| 8 | **Fashion Factory** | CMS `/fashion-factories?lang&search&show_hidden` (+ `/fashion-factory/download-batch`) | `{id,name,preview_media,priority,photo_set_ids[]}` | [O] `exShObfc-9EJAZJv` `d()`; `qg` = `https://cms.higgsfield.ai` ([O] `QhqiFCLt1Ukztv0Y` `function hye(e=\`\`,t=Ef()){return pye(\`https://cms.higgsfield.ai\`…`, exportado `hye as qg`) |
| 9 | **Photodump** | No hay catálogo de plantillas en el cliente. El paso "template" solo muestra `preview-step-media.webp` y 14 ejemplos `/photo-dump/{1..14}` | Store local `{activeStep:'template',stepTemplate:{selectedTemplateId},stepAgreement,stepCharacter{selectedCharacterId,…},stepGeneration{jobSets}}` | [O] `ppnE704mSzkMa656`, `Pn0aQMgg-OVb2Lew`, `Lm5zUxPgFpMPXlmQ` |
| 10 | **Popcorn / keyframes** | `GET /keyframe-presets?size&cursor`; `POST /keyframes/v3/{manual,auto,photo-dump,photo-dump-pack}` | Proyectos `{id,created_at,thumbnail_url}`, `job_set_group_id` | [O] `cvS5QqXDVQref2lT` |
| 11 | **Canvas (Flow) templates** | `canvas-worker`: `GET /api/templates?…`, `GET /api/templates/{id}`, `POST …/use`, `…/auth`, `…/preview`, WS `/api/templates/{id}/connect` | Grafo de nodos de solo lectura que se duplica en el canvas del usuario (ver 04) | [O] `zU2Fxb7vqXsC5tXd` `sd()/cd()`, `case\`template\`:return V(\`/api/templates/${j(e.id)}/preview\`)` |
| 12 | **Marketplace de apps (starter templates)** | `GET /api/v1/apps/templates` → array o `{templates[]}` | [D] campos | [O] `Go0UcXoYXfYm4Q9S` `E()` |
| 13 | **Lipsync select-template** | Catálogo de avatares por modelo (`kling`, `sync-so`, `speak`…) | Corresponde a 08 | [O] `6VPydAiqjP8H0OTw` |
| 14 | **Supercomputer "employees"/skills** | Shorts-maker (MCP), `/skills/ad-multiplier`, `/skills/editorial-motion-graphics`, `/skills/faceless`… | Plantilla = prompt para el agente o MCP | [O] `UQLBM2z8UhgzbVzK` (`"Glow up my video into a viral-ready reel with Higgsfield MCP — you choose the style"`), `4XZ4Fgmi9UwQPcZx` mapa `Oe={effects:'/effects/use',"ad-multiplier":'/skills/ad-multiplier',…}` |
| 15 | **Job-set chain presets** | CMS `/job-set-chain-presets?lang&show_hidden&product_key` (`change_time_of_day`, `change_weather`) | Cadenas de edición de imagen, no reels | [O] `uQBWhFOeUSQvUNdk`, `0BViRkn0BltqDeg-` |

### 1.2 Precios y "slots" (lo que el usuario rellena)

- **[O] Viral Hub, inputs del preset** (parser `me()` en `qa8iqDYR3vcN2g01`): cada input es `{id, type ∈ text|image|video|media|audio, label, description, placeholder, max_length, min, max, required, options[{id,url,label}], allow_upload}`. El tipo `audio` marca el preset como no soportado (`if(o===\`audio\`){r=!1;continue}`).
- **[O] `param_inputs`**: `{key, type ∈ color|select|text, label, description, default, options}`. **`param_choices`**: opciones por clave, por ejemplo `resolution`.
- **[O] `pricing`** (mismo chunk): `type:'frame_rate'` con `rate.per_frame_by_resolution{}`, `fps_param`, `resolution_param`, `duration_param` o `start_param`/`end_param`, `unit_scale`, `limits{min_duration_seconds,max_duration_seconds,min_fps,max_fps}`. Créditos = `ceil(creditUnits/100)` ([O] `RKpCrebWFpypqouZ`, `credits:({settings:e})=>…Math.ceil(t/Ll)` con `Ll=100`).
- **[O] Reels Studio**: 3 créditos por segundo de vídeo de entrada (`Math.ceil(e)*Qr`, `Qr=3`, chunk `CUbe3piocK3eWgDS`). Resoluciones `720p|1080p|4k` (`Xe`, `lpCUasx9bLXMQMAC`).
- **[O] Beat-Fit**: 34 créditos en `standard` y 48 en `high` (`ki()`, `Da3u6CaMRZenrBm8`).
- **[O] ClipCut/outfit-matchcut**: `model:'nano_banana_2', credits:10` en el botón (`5zyR_mlZwqVg71hI`).
- **[O]** Todas las cadenas aceptan `?dry_run=True` para pedir un presupuesto: `n===\`credits\`&&r.searchParams.set(\`dry_run\`,\`True\`)`.

---

## 2. Plantillas que producen reels: flujo paso a paso

### 2.A Code-based presets del Viral Hub (montaje 100% en cliente) [O]

**Contrato de un preset** (por ejemplo face-cut, `k9Pi1m9Mz7-9lsLc` @30813):

```js
{ id:'face-cut', name:'Face Cut',
  description:'Align photos of one person by their eyes and turn them into a rapid match-cut reel.',
  thumbnailUrl, howItWorksExamples, defaultSettings, normalizeSettings,
  postApplyView:'editor', settingsAfterPreview:true, Settings, // React panel
  bakeKey:({inputs,settings}) => hash({...settings, aspectRatio}, ['grain','rhythm','speed']),
  inputs:[
    {id:'analysisEngine',kind:'toggle',defaultValue:'backend',options:[frontend,backend],affects:'apply',devOnly:true},
    {id:'photos',kind:'media',accept:'image',min:2,max:24,ordered:true,presentation:'compact-grid',affects:'apply',required:true},
    {id:'aspectRatio',kind:'select',defaultValue:'9:16',options:['9:16','16:9','4:5','1:1'],affects:'render'}],
  async apply({inputs,signal,uploadMedia,onProgress}) {
    onProgress('analyzing'); const a = await analyze(photos, engine, uploadMedia, signal);
    return { artifact:a.artifact, initialSettings, Editor, Settings, dispose,
             render({artifact,inputs,settings,signal}) { return renderReel(...) } } } }
```

- `affects:'apply'` vuelve a ejecutar el análisis (pesado). `affects:'render'` solo vuelve a dibujar. `bakeKey` cachea el render.
- Los ajustes de face-cut son `rhythm:'uniform'|'arc'`, `speed 0.5–3`, `eyeY:.426`, `faceSize:.17`, `zoom`, `grain`, `background:'dark'` y `layering:'pile'` ([O] mismo chunk).

**Contrato del render**, que es la clave del timing ([O] `oXL01o-mt19tpMi0` notebook y `GCCK4YlPIjZsnLFh` logo-cut):

```js
// notebook
return { kind:'frames', width, height, fps:24, totalFrames:A.total,
  audio: soundEnabled==='on' ? { kind:'cues', source:`${base}/sfx/${sound}.wav`,
          cueFrames: Array.from({length:A.nCuts},(e,t)=>t*A.fpc).slice(1) } : undefined,
  draw(ctx, frameIndex){ … }, dispose }
// logo-cut
return { kind:'frames', width, height, fps:30, totalFrames:180,
  audio: music==='off' ? undefined : { kind:'source', source:`hybrid-logo-cut/music/${music}.m4a` },
  draw(t,n){ … }, dispose }
```

- **Timing:** fijo y determinista dentro de la plantilla (`fps`, `totalFrames`, `fpc` = frames por corte). **No hay detección de beats.** La "sincronía" se consigue al revés: el **SFX se coloca en cada frame de corte** (`cueFrames`), o bien se usa una **pista musical propia de la plantilla** cuya duración casa con `totalFrames` (logo-cut: 6 s = 180 frames a 30 fps). [O]
- **Mezcla de audio** ([O] `NT_RKlPQE1LkiZYI`): con `OfflineAudioContext`, si `audio.kind==='source'` hace un único `start(0)`; si es `'cues'` hace un `createBufferSource().start(cueFrame/fps)` por cada cue.
- **Codificación** ([O] el mismo `NT_RKlPQE1LkiZYI`): usa `mediabunny` (`AudioBufferSource, BufferTarget, CanvasSource, getFirstEncodableVideoCodec, Mp4OutputFormat, Output`) y exige `VideoEncoder` ("H.264 encoding is not supported in this browser"). Valida `width/height/fps/totalFrames` ("Nothing to export"). Como alternativa exporta PNG por frame (`toPngBlob`). Hay otro exportador genérico canvas→MP4/WebM en `WYomd_LFOgGq6s32` (`CanvasSource, Mp4OutputFormat, WebMOutputFormat, QUALITY_HIGH`).
- **Análisis en servidor (opcional)** ([O] `_0JrJGpCCPX1jiUd`):
  - `POST /viral-hub/facecut {media_input_id}`: landmarks de ojos para face-cut, con *polling* cada 1 s hasta 120 veces.
  - `POST /viral-hub/tracelab {video_input_id,fps,faces,min_score}`: tracking de sujetos para tracelab-motion, con *polling* cada 2 s hasta 450 veces.
  - `/viral-hub/text-warp` [O, ruta] se usa en text-warp.
- **Análisis en el dispositivo:** object-tracking usa el *ObjectDetector* de MediaPipe con `efficientdet_lite2.tflite` (`/viral-hub/presets/common-assets/models/efficientdet_lite2.tflite`), modos `balanced · 15 fps` y `precision · 24 fps` ([O] `-puM5I50BsDt1OIH`: `modelAssetPath`, `scoreThreshold`, `maxResults`). [I] Usa el runtime de MediaPipe Tasks, aunque el paquete `@mediapipe` no aparece como string.
- **Fuentes y texturas:** `static.higgsfield.ai/public/viral-hub/presets/<slug>/fonts/*.woff2` (kinetic-type, warp-loop, wave-stack, space-type, misprint-type, funnel-type, balloon-type, scrawl-type) [O].
- **Exportación final** ([O] `kX1BjDm4RnP7IqTv`):
  1. El MP4 se sube como medio oculto (`entityType:'video_input'`, `createOptions:{isHidden:true}`, `forceNsfwCheck:true`).
  2. Se registra con `POST /viral-hub/renders {type, preset_id, …, result:{type:'media', media:{id,type,url}}, params}`. Así entra en la biblioteca sin generar en GPU.

### 2.B Chain presets del Viral Hub (servidor) [O]

1. El cliente carga el preset y construye el formulario desde `inputs`, `param_inputs`, `param_choices` y `pricing` (§1.2). Si `ip_check_required` es `true`, antes comprueba IP o similitud (`ip_check_finished`, `ip_detected`, `is_face_detected`).
2. Envío ([O] `r2hw0ArjOTAPzGtC` @12973):
   ```js
   is(token,{ model:'viral_hub_video', settings:{presetId, creditUnits},
     media:{image:[…], video:[…]},           // up to 10 + 10
     extra:{ slot_values:{[textSlotId]:text}, slot_selections:{…}, choice_values:{…}, config:{…}, …fpsParams } })
   ```
   → `POST /chains/viral-hub {params:{preset_id, medias:[{role,data}], slot_values, slot_selections, choice_values, config…}, use_free_gens, parent_id?}` ([O] `RKpCrebWFpypqouZ` @5849).
3. *Polling* del job-set; el resultado es `results.raw.url` o `results.min.url` en MP4.
- **[D]** El código no muestra qué hace la cadena en el servidor (modelos, cortes, música). **[I]** Las plantillas con `pricing.type:'frame_rate'` cobran por frame y resolución, lo que apunta a re-render o transformación de vídeo frame a frame (ritmo y fps elegibles: `targetFps`, `minFps`/`maxFps`).

### 2.C Beat-Fit / Urban Cuts: outfits sincronizados al ritmo [O]

Es un asistente de 3 pasos (`Da3u6CaMRZenrBm8`):
1. **Persona:** imagen de entrada.
2. **Ropa:** el usuario sube una imagen (máx. 30 MB, `Oo=30`). Se lanza un job "clothing cleaner" de Nano Banana (`g({params:{input_image,width:1,height:1,aspect_ratio:'auto'}})`). Al completarse se crea la referencia `POST /beat-fit-references {cloth_image:{id,url:results.raw.url,type:'nano_banana_job'},name}`. También se puede elegir del catálogo `type_filter=cloth`.
3. **Música:** el usuario sube audio (máx. 20 MB, `cs=20*1024*1024`) y **lo recorta en el navegador** a una ventana de hasta **10 s** (`ls=10`, `maxDurationSec`).
   - El recorte se hace con `AudioContext.decodeAudioData`: mezcla a mono, remuestrea a **44.1 kHz** con `OfflineAudioContext` y codifica WAV PCM16 a mano (escribe la cabecera `RIFF/WAVE/fmt /data`).
   - Después sube el archivo y llama a `POST /beat-fit-references {type:'music',audio_input_id,name}`.
   - También se puede elegir del catálogo `type_filter=music`.
4. **Generar:** `POST /chains/beat-fit-nano-banana {params:{width,height,quality:'standard'|'high',aspect_ratio,input_image,cloth_reference_id,music_reference_id}}`. Tamaños: standard 9:16 = 432×768 y high 9:16 = 576×1024 (`ji()`). Plan requerido: `assertSubscriptionPlan('beat-fit')`.

- **Beats [I/D]:** el cliente **no** detecta beats; solo entrega un WAV mono de 44.1 kHz y ≤10 s, un formato típico para un detector de onsets o BPM en el servidor (librosa/madmom). El análisis y el montaje son **[D]**.

### 2.D ClipCut (outfit-matchcut) y Sticker Matchcut [O]

- **ClipCut** (`5zyR_mlZwqVg71hI`):
  1. El usuario sube outfits → `/jobs/nano-banana-2-outfit-collage {input_images}` (05) → se guarda como `user_outfit_collage`. Otra opción es un preset CMS (§1.1 #7).
  2. `POST /chains/outfit-matchcut {params:{input_image, preset_id | user_outfit_collage_id}}`, 10 créditos.
  3. Los cortes y el montaje se hacen en el servidor **[D]**.
- **Sticker Matchcut** (`mkLiyNur15isvg7J`): `POST /chains/sticker-matchcut {params:{input_video,start_seconds,end_seconds,application_slug}}`. El usuario recorta la ventana del vídeo en el cliente; la composición es **[D]** del servidor.
- **Kling Transition:** `POST /jobs/kling-transition {params:{width,height,motion_id,start_input,end_input,duration}}`. Las dimensiones se leen del primer frame o vídeo. Es una transición entre dos frames con un *motion* del catálogo [O].

### 2.E Reels Studio (`/shorts-studio`, `/flow/shorts-studio`, `/gallery/shorts-studio`) [O]

Los chunks son `CUbe3piocK3eWgDS` (formulario), `lpCUasx9bLXMQMAC` (API y estado), `0c-GYP2vf0NwLZZM` y `n49sirMkJlGERlIW` (rutas). El tutorial tiene tres pasos: `choose-preset`, `upload-video` y `download-video`.

1. **Entrada:** un vídeo MP4 o MOV con relación de aspecto entre 1/3 y 3, duración de **4 a 120 s**, ≤4000 px y ≤200 MB (`new Ie({minRatio:1/3,maxRatio:3,minDuration:4,maxDuration:120,…})`). Además: preset, `aspect_ratio`, `resolution` y `lang` (auto-detect, English, Spanish, French, kazakh…, Vietnamese).
2. `POST /reels/generate {params:{resolution,aspect_ratio,lang?,preset_id,preset_source:'preset'|'user',medias:[{role:'video',data:{id,type:'video_input'}}]},client_meta:null}`.
3. Se crea una **sesión** `GET /reels/sessions[/{id}]` con `status` (queued, in_progress, generating, completed), `clips[]` (cada uno con `status`, `video_url`, `job_id`, `parent_job_id`, `variants[]`, `is_primary`, `thumbnail_url`, `optimized_url`), `stitch_status` (`processing`…), `stitched_video_url`, `final_job_id`, `source_video_id` y `preset_id`.
4. **Edición por segmento:**
   - Para regenerar un clip: `POST /jobs/v2/reels_studio_clip {params:{parent_job_id}}`.
   - Para elegir la variante principal de un segmento: `POST /reels/sessions/{id}/segments/{i}/primary {job_id}`.
   - Para borrar un clip: `DELETE /cutups/sessions/{id}/clips/{clip}`.
5. **Unir:** `POST /reels/sessions/{id}/stitch` deja `stitched_video_url`.
- **Presets propios:** el usuario sube un reel de referencia (`video_id`) con imágenes y vídeos de estilo opcionales. **[I]** El servidor extrae del reel de referencia el estilo, el ritmo y los subtítulos y los aplica a los segmentos del vídeo nuevo. `lang` apunta a transcripción o subtítulos.
- **[D]** Cómo se segmenta, los efectos y los modelos de cada clip.

### 2.F Flujos guiados que producen sets de imágenes (no reels)

- **Photodump** (`/flow/photodump/{template,character,generation}`) [O]:
  1. Template: la pantalla es informativa; `selectedTemplateId` existe en el store, pero **no se envía**.
  2. Character: el usuario elige o entrena un personaje Soul (ver 06).
  3. Generate: `POST /jobs/text2image-soul/batch {params:{aspect_ratio:'9:16',custom_reference_id,height:720,width:1280,quality:'1080p'}}` y luego `stepGeneration.jobSets` (`VhvWOJm5lnrxSsdR`, `Z5yP4UrXmc30iweN`).
  - **[I]** El "pack" de escenas lo define el servidor (no se envía prompt).
- **Fashion Factory** (`/flow/fashion/{template,clothing,character,photoset,generation}`) [O, `EVY67AZs1UYm_4Mk`]:
  1. Template: `fashion_factory_id` del CMS.
  2. Clothing: Nano Banana con `{is_product_placement:true,input_images:[product],fashion_factory_id,batch_size:1,aspect_ratio:'auto'}`.
  3. Generation: Soul con `{quality:'1080p',aspect_ratio:'3:4',prompt:'',enhance_prompt:true,fashion_factory_id,custom_reference_id,batch_size:4,version:3,…}`.
- **Popcorn** (`/popcorn`, `?modal-instadump=true`): storyboards con `/keyframes/v3/*`, incluidos `photo-dump` y `photo-dump-pack` [O]. Produce imágenes clave, no un reel.

### 2.G Editor de vídeo "Fable" (`/video-editor`): base de montaje en cliente [O]

- `Ehq1iwaKgbudvzwm` (249 KB) es un motor NLE en el navegador:
  - Documento → `scenes` → `tracks` → `clips`, con `keyframes`, `effects`/`effectSlots`, `blendMode`, `lut`, `shader` y transiciones (`transitionIn`, `fade`, `slide-up/down/left/right`).
  - Exporta frame a frame (`renderer.renderFrame(doc, t, {sceneId, scale, exact:true})` → `writeFrame` → `finalize`) con audio AAC.
  - Hay un transcoder con `Conversion` de mediabunny en `A09g-93buu2mTzWe`.
- La colaboración y la sincronización están en 04. **[I]** No se ha encontrado ningún flujo de "plantilla → proyecto Fable", pero el motor permitiría plantillas de timeline. `POST /chains/cinematic-video-editor` existe [O, ruta]; su payload es [D].

---

## 3. Effects (`/effects`, `/effects/use/$slug`, Viral Hub): cómo funciona "usar efecto"

1. **Entrada** ([O] `GeH_7Xw7Ig8fYOXP`): se resuelve el preset (el último usado está en `sessionStorage` `viral-hub:use:last-preset`). Si no hay ninguno, toma el primero con `kind:'chain'`. `dz()` clasifica cada preset como `effect` (si `kind==='effect'||kind==='code'`), `chain` (si `job_set_type==='viral_hub_video'`) o `example` ([O] `Yw2e1pkiSRelFdrE`, `function dz(e){return e.kind===\`effect\`||e.kind===\`code\`||…?\`effect\`:gz.has(e.job_set_type)?\`chain\`:\`example\`}`).
2. **Effect (GLSL/JS):** se descarga el bundle, se valida, se renderiza en vivo sobre la imagen o el vídeo del usuario (`setSource(video|image)`), se exporta en el cliente y se registra con `/viral-hub/renders` (igual que en §2.A).
3. **Chain:** `/chains/viral-hub` (§2.B). **Viral transform** (plushies, 3D figure…): `/jobs/viral-transform-image|video` (05).

**Formato del bundle de efecto** ([O] validador `HGjaryBWPxwEApI8`, mensajes `manifest.json: …`):

```jsonc
// <effect-folder>/manifest.json
{
  "version": "1.0",                // required, only "1.0"
  "name": "…",                     // required
  "runtime": "glsl" | "js",        // unknown runtime → error
  "role": "generator" | "transform",
  "entry": "main.frag",            // single pass   ─┐ one or the other
  "passes": [{ "entry": "a.frag", "scale": 0.5 }], // multipass, scale ∈ (0,1]
  "module": "effect.js",           // only runtime "js" (no entry/passes/bindings)
  "params": [{ "name": "...", "type": "float|int|bool|vec2|color|enum|angle|flags|float[]|vec2[]|vec4[]",
               "default": …, "min": …, "max": …, "step": …, "options": […], "alpha": true,
               "labels": ["x","y"], "group": "…", "ui": { "type": "slider|axis|toggle|color|point|coords|select|text|colors" } }],
  "groups": [{ "id": "…", "group": "parent" }],   // maximum 2 nesting levels
  "paramsPresets": { "…": { … } },
  "assets": ["noise.png"],
  "bindings": [{ "uniform": "uNoise", "source": { "path": "noise.png" } }],
  "rendering": { "precision": "…", "intermediateFormat": "…" },
  "animated": …                    // ignored on GLSL (derived from the shader)
}
```

- **Uniforms de host** que inyecta el runtime [O]: `uTime, uResolution, uOutputResolution, uTexture, uPrevFrame (feedback), uFrameIndex, uSeed, uSourceFrame/Scale/Offset, uDestinationScale/Offset, uFlipY, uPointer, uPointerDelta, uPointerActive/Inside/Captured/Buttons/PressureDown`.
- **Reglas condicionales de UI** [O]: operadores `eq, neq, in, notIn, gt, gte, lt, lte` y `conditionType AND|OR` (ocultan o muestran parámetros).
- **Categorías de parámetros** [O]: `effect, colors, image, transform, motion, texture, glow, text, layers`.
- **Efectos JS:** pueden emitir **audio cues** (`audioCues()`, `mergeCues()`) que se mezclan en la exportación [O].
- `/viral-effects` es un **laboratorio** donde se sueltan carpetas o ZIP (`webkitRelativePath`) y se validan. `jop4f68X5wVbtfzt` rechaza los efectos `js-runtime` y los "sequence-dependent" (los que usan `uPrevFrame` o `uFrameIndex`) cuando se necesita un *blueprint* sin estado [O].

---

## 4. Definiciones de plantillas presentes en el código

### 4.1 Code-based presets (27, registro en `Cq7KqhBzoazy10mD`) [O]

`comment-cut, sphere-cut, word-reel, note-reel, logo-cut, face-cut, product-cut, object-match, tracelab-motion, text-warp, echo-print, kinetic-type, warp-loop, wave-stack, balloon-type, hope-vortex, scrawl-type, funnel-type, misprint-type, space-type, toon-shake, low-poly-y2k, lidar-chrome, stutter-cut, notebook, object-tracking, search-cut`.

Descripciones literales de las que se han leído:

| slug | Descripción (literal) | Chunk | Técnica |
|---|---|---|---|
| face-cut | "Align photos of one person by their eyes and turn them into a rapid match-cut reel." 2–24 fotos | `k9Pi1m9Mz7-9lsLc` | 2D; landmarks en servidor (`/viral-hub/facecut`) |
| word-reel | "Flip a word through paper pages with a highlighter pin." (fps 24/25/30) | `yqRxf5mQ7l3FHRv8` | 2D |
| notebook | "Place handwritten words on a real notebook and push the camera into every cut." 24 fps, SFX por corte | `oXL01o-mt19tpMi0` | 2D y `cues` |
| logo-cut | 30 fps, 180 frames, música `hybrid-logo-cut/music/*.m4a` | `GCCK4YlPIjZsnLFh` | WebGL2 y 2D |
| comment-cut | "Spell a sentence word by word through fake social comments." | `XGpYrvQZV7Ac8qnx` | 2D |
| product-cut | "Cut out one product and pin it over a rapid sequence of backgrounds." | `WGGMdu4IjGvuM5VB` | 2D |
| search-cut | "Flash through procedural search pages while every word stays pinned in place." | `GXm-oLW3AfNdpVbs` | 2D |
| stutter-cut | "Playback jams on a micro-loop of the last few frames, machine-guns it, then continues…" | `ZbqT-HIEQ84YHWZV` | WebGL2 |
| toon-shake | "The video freezes into a bleached cartoon still and ransom-note paper words uncrumple onto it, boiling on twos." | `S8DPgKJn00uFz2VW` | WebGL2 |
| scrawl-type | "Hand-scrawled chalk lyric cards boiling at 24 Hz — 1:1 to the reference lyric video." | `W-X2EXYMjHEI5aR7` | 2D y woff2 |
| echo-print | "Create a spiral duplication trail that collapses into one silhouette." | `8Q3mGkiexRZg5Tdc` | 2D |
| tracelab-motion | "Track subjects and draw animated overlays over a video." | `30zOCB-08Dd9PZx_` | tracking en servidor (`/viral-hub/tracelab`) |
| object-tracking | "Scan a clip once on this device, then follow any detected object with a HUD box, marker and path." | `-puM5I50BsDt1OIH` | tflite en el dispositivo |

### 4.2 Otras definiciones o recursos con nombre [O]

- **Shorts-maker (MCP)**, estilos en `/claudesfield/agent-employees/shorts-maker/`: `yellow-burst, warm-glow, retro-collage, polka-pop, plastilin, marker-scribble`. Su lógica vive en el MCP o el servidor [I].
- **Ad Multiplier, skill-grid** (solo recursos): `outfit-{red,purple,pink,blue,green,cream}`, `talent-{blue,brown}`, `background-{leopard,pink}`, `product-ad-source`, `green-handbag-{source,talent,product}`, `wardrobe-campaign`, `talent-wardrobe-remix`, `interior-campaign`. **[I]** Son ejes de variación (outfit, talento, fondo) de un anuncio fuente. Pertenece a Ads Studio/Genjutsu (07).
- **Miniaturas de Marketing Studio:** `ugc, ugc_virtual_try_on, ugc_unboxing, ugc_how_to, product_review, tv-spot-mini, wild_card, hyper-motion-mini`, más `/marketing-studio-v2/motion-presets?size=100` (ver 02/09).
- **Recursos de Beat-Fit:** `/beatfit/video-1..4`, `/beatfit/step-1..3`, `/beatfit/case-1..3`. **Matchcut:** `/matchcut/slide-1..7-mini`. **Kling transition:** `/kling-transition/case-1..3`. **Reels Studio:** `/reels-studio/tutors/tutor1..3`, `preset-cover(-2)`.
- **Mock de desarrollo** del Viral Hub: `mock-example-preset` con `ip_check_required:false` y la categoría `mock-example-category` (`Yw2e1pkiSRelFdrE`).

---

## 5. Cómo recrearlo con nuestro stack (Next.js + fal.ai)

### 5.1 Decisión de arquitectura

Conviene copiar la división de Higgsfield:
1. **Plantillas deterministas** (cortes, tipografía, SFX en cada corte, fotos o clips del usuario): se renderizan **en el cliente** con Canvas/WebGL + WebAudio + **mediabunny** (WebCodecs) y el MP4 se sube a storage. No cuestan GPU y la previsualización es instantánea. Para navegadores sin `VideoEncoder` (Firefox antiguo, algunos iOS), el mismo `timeline.json` se envía al servidor (§5.4).
2. **Plantillas generativas** (beat-fit, matchcut, transformación de estilo): en el servidor, con un **chain runner** que llama a modelos de fal y monta el resultado con `fal-ai/ffmpeg-api/compose` (o ffmpeg propio).

### 5.2 Esquema JSON de plantilla de reel (propuesta)

```jsonc
{
  "id": "face-cut-v1", "slug": "face-cut", "version": 1,
  "kind": "client" | "chain",             // client = render in browser, chain = server
  "title": "Face Cut", "description": "…", "category": ["trending","portrait"],
  "flags": { "trending": true, "new": false, "pro": false, "ipCheck": false },
  "preview": { "video": "…mp4", "poster": "…webp", "widescreen": "…mp4" },
  "aspectRatios": ["9:16","4:5","1:1","16:9"], "defaultAspect": "9:16",
  "fps": 30, "durationSec": { "min": 4, "max": 15 },
  "inputs": [                              // ≈ HF inputs + slots
    { "id": "photos", "type": "image", "min": 2, "max": 24, "ordered": true, "required": true, "affects": "analyze" },
    { "id": "headline", "type": "text", "maxLength": 40, "placeholder": "…", "affects": "render" },
    { "id": "music", "type": "audio", "source": "library|upload", "trimMaxSec": 10, "affects": "analyze" }
  ],
  "params": [                              // ≈ manifest params / param_inputs
    { "key": "rhythm", "type": "enum", "options": ["uniform","arc","beats"], "default": "uniform" },
    { "key": "speed", "type": "float", "min": 0.5, "max": 3, "default": 1 }
  ],
  "audio": { "mode": "track" | "cues" | "none", "track": "music/x.m4a", "sfx": "sfx/whoosh.wav" },
  "timeline": {                            // what the runner materializes
    "slots": [ { "id": "s1", "from": "photos[0]", "durFrames": 4, "transition": { "type": "cut|fade|slide-left|zoom", "frames": 0 } } ],
    "repeat": { "slotFrom": "photos[*]", "durFrames": "beat|4" },
    "overlays": [ { "type": "text", "bind": "headline", "font": "anton-400.woff2", "anim": "kinetic", "inFrame": 0, "outFrame": 45 } ]
  },
  "steps": [                               // only kind=chain: DAG of jobs
    { "id": "clean", "model": "fal-ai/nano-banana/edit", "in": { "image_url": "$inputs.cloth" } },
    { "id": "shots", "model": "fal-ai/kling-video/…/image-to-video", "foreach": "$beats.segments", "in": { … } },
    { "id": "stitch", "model": "fal-ai/ffmpeg-api/compose", "in": { "tracks": "$timeline.tracks" } }
  ],
  "pricing": { "type": "flat|per_second|per_frame", "credits": 10, "perSecond": 3 }
}
```

### 5.3 Runner de timeline en el cliente (equivalente a §2.A)

- Interfaz: `apply(inputs) → artifact` (análisis caro, cacheado con `bakeKey = hash(inputs, settingsQueAfectanApply)`), y `render(artifact, settings) → { width, height, fps, totalFrames, audio, draw(ctx, i) }`.
- Exportación: `mediabunny` `Output({format:new Mp4OutputFormat({fastStart:'in-memory'}), target:new BufferTarget()})`, con `CanvasSource` para vídeo y `AudioBufferSource` para audio. El audio se prerenderiza en `OfflineAudioContext` (pista en `t=0`, o un SFX por cada `cueFrame/fps`). Este es exactamente el patrón observado en `NT_RKlPQE1LkiZYI`.
- Subida: URL firmada a nuestro storage, seguida de `POST /api/renders {templateId, params, mediaId}` (equivalente a `/viral-hub/renders`).
- Análisis opcional:
  - Caras: MediaPipe FaceLandmarker en el cliente, o un endpoint de servidor.
  - Objetos: MediaPipe ObjectDetector con `efficientdet_lite2`.
  - Segmentación de producto: `fal-ai/…` de *background removal* (BiRefNet).

### 5.4 Runner de cadena en el servidor (equivalente a §2.B–2.E)

- Route Handler `POST /api/chains/{slug}` → valida contra `inputs` → crea un `job_set` → ejecuta `steps` como DAG (cola: Inngest, Trigger.dev o QStash), con `fal.queue.submit` y webhooks de fal → guarda los resultados. `?dry_run=true` devuelve solo el coste (como HF).
- Edición por segmento al estilo Reels Studio: tabla `segments(session_id, index, primary_job_id)` y `variants(job_id, parent_job_id)`. Endpoints `regenerate`, `set-primary` y `stitch` (este último reconstruye el `compose`).

### 5.5 Detección de beats y montaje: opciones

| Necesidad | Opción | Notas |
|---|---|---|
| Recortar y normalizar la música | En el cliente, como HF: `decodeAudioData` → mono → `OfflineAudioContext` a 44.1 kHz → WAV PCM16, ≤10–30 s | [O] en Beat-Fit |
| **Detección de beats/onsets** | (a) **En el cliente**: `web-audio-beat-detector` / `essentia.js` (WASM, `RhythmExtractor2013`) → `beats[]` en segundos. (b) **En el servidor**: un microservicio Python con `librosa.beat.beat_track` o `madmom`. (c) **Aproximación con fal:** `fal-ai/ffmpeg-api/waveform {media_url, points_per_second, smoothing_window, precision}` → `{points, duration, waveform}` y picos de energía en nuestro código | El catálogo público de fal **no tiene** un endpoint de detección de beats (consultado `q=beat`: 0 resultados) |
| Cuantizar cortes al ritmo | `cutFrames = beats.map(t => round(t*fps))`, se agrupan en compases (1, 2 o 4 beats según `rhythm`) | Igual que los `cueFrames` de HF, pero derivados de la música |
| **Unir clips + audio (servidor)** | `fal-ai/ffmpeg-api/compose` → entrada `{tracks:[{id,type:'video'\|'audio'\|'image',keyframes:[{url,timestamp,duration}]}]}`, salida `{video_url,thumbnail_url}` | Es el mapeo directo de nuestro `timeline` a fal |
| Concatenar sin más | `fal-ai/ffmpeg-api/merge-videos {video_urls,resolution?,target_fps?}` | Sin transiciones |
| Poner música | `fal-ai/ffmpeg-api/merge-audio-video {video_url,audio_url,start_offset}`; mezclar pistas: `fal-ai/ffmpeg-api/merge-audios {audio_urls,output_format}` | |
| Fotos → vídeo | `fal-ai/ffmpeg-api/images-to-video {images,fps}` | Para un photodump animado |
| Recortar o reescalar | `fal-ai/workflow-utilities/trim-video {video_url,start_time,end_time\|duration}`, `…/scale-video`, `…/reverse-video`, `…/blend-video {top_video_url,bottom_video_url,blend_mode,opacity}`, `…/interleave-video` | |
| Normalizar loudness y extraer frames | `fal-ai/ffmpeg-api/loudnorm`, `…/extract-frame`, `…/metadata` | |
| SFX generativos | `mirelo-ai/sfx2.0/video-to-audio`, `fal-ai/stable-audio-3/small/sfx/base/text-to-audio` | Alternativa a una librería de SFX |
| Transiciones complejas o shaders en el servidor | ffmpeg propio (filtros `xfade`, `zoompan`, `drawtext`) en un worker (Fly/Render/Lambda con capa ffmpeg), o **Remotion Lambda** con el mismo código React o Canvas del cliente | fal no ofrece `xfade` como endpoint |

(Ids verificados en `https://api.fal.ai/v1/models?q=ffmpeg|compose|merge|audio|beat`, con esquemas `openapi-3.0`.)

### 5.6 Mapeo de cada plantilla de HF a nuestra receta

| HF | Receta propuesta |
|---|---|
| face-cut / product-cut / word-reel / notebook | `kind:client`. Landmarks o recorte (MediaPipe o BiRefNet en fal), dibujo en canvas, cues de SFX y exportación con mediabunny |
| Beat-Fit | `kind:chain`. 1) Nano Banana edit para la ropa (`clean`). 2) Detección de beats (§5.5). 3) N imágenes o vídeos cortos del sujeto con la ropa, uno por segmento. 4) `compose` con cortes en los beats y la pista recortada |
| ClipCut / outfit-matchcut | Collage con Nano Banana, luego image-to-video por outfit, luego `compose` con cortes duros |
| Sticker Matchcut | `trim-video` → extracción de sujeto o sticker por frame [D en HF] → `compose` |
| Kling transition | Kling con `start_image`/`end_image` (first-last-frame) en fal |
| Reels Studio | Transcripción (Whisper en fal) y segmentación por frases → por segmento, restyle/v2v con un preset (prompt y refs del reel de referencia) → variantes → `compose` como "stitch" |
| Chain presets del Viral Hub | El DAG `steps` del JSON con slots y `slot_values` |

### 5.7 Lo que sigue siendo servidor o desconocido

- **[D]** Toda la lógica interna de `/chains/viral-hub`, `/chains/beat-fit-nano-banana`, `/chains/outfit-matchcut`, `/chains/sticker-matchcut`, `/reels/generate` y `/reels/sessions/{id}/stitch`: modelos, detección de beats, segmentación y montaje (ffmpeg o un render propio).
- **[D]** El contenido real de los presets del CMS (no está en el bundle): qué chain presets existen, sus `inputs` y `pricing`, los manifests GLSL concretos y las pistas de música y SFX.
- **[D]** Los payloads de `/chains/cinematic-video-editor`, `/viral-hub/text-warp` y `/api/v1/apps/templates`.
- **[I]** Que `/viral-hub/facecut` devuelva landmarks de ojos y `/viral-hub/tracelab` devuelva pistas de bounding boxes se deduce del uso en el cliente (`eyeY`, `faceSize`, `faces`, `min_score`, `fps`).
