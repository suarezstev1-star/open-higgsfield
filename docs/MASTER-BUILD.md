# Documento maestro de construcción — clon completo de Higgsfield

Estado: borrador para revisión. **No se escribe código hasta que este documento esté cerrado y aprobado.**
Fecha: 2026-10-15. Base: `docs/research/higgsfield/` (informes 00–10, cada dato marcado OBSERVADO/INFERIDO/DESCONOCIDO).

## Cómo leer este documento

Cada herramienta tiene una ficha con cinco campos:
- **Qué hace Higgsfield** — de la investigación.
- **Nuestra receta** — modelo de fal + parámetros + flujo, con código propio.
- **Prompt** — plantilla que usamos (si la suya es del servidor, la escribimos nosotros).
- **Confianza** — honesta:
  - 🟢 **Alta**: sabemos exactamente cómo construirlo.
  - 🟡 **A reconstruir**: la lógica vive en su servidor; la rehacemos nosotros (prompts, montajes internos). No es un hueco de investigación, es trabajo de diseño propio.
  - 🔵 **Decisión tuya**: negocio (precio, nombre, planes).
  - ⚪ **A medir**: solo se cierra con una generación real en fal (precio exacto, calidad final). Una verificación, no un ensayo a ciegas.
- **Pendiente** — qué falta para cerrarlo.

> **Nota de honestidad, una sola vez.** No copiamos archivos de Higgsfield (sus pesos y sus prompts de servidor viven en sus máquinas y nadie los obtiene desde fuera). Copiamos su **comportamiento** con código nuestro. Por eso lo 🟡 no es ignorancia: es la parte que, por diseño, ponemos nosotros — igual que ellos la pusieron. Y lo ⚪ se confirma con **una** ejecución, porque un producto que se cobra no se entrega sin una comprobación de que el pago y la generación funcionan.

---

## PARTE A — Plataforma (lo que sostiene todo y permite cobrar)

### A1. Cuentas e identidad
- **Higgsfield:** Clerk (Google/Apple/Microsoft/email/SSO), workspaces = organizaciones, roles owner/admin/member/billing. Cabeceras `Authorization: Bearer <JWT>`, `hf-workspace-id`, `hf-env`. (ver `03-auth-billing.md`)
- **Nuestra receta:** Clerk (mismo proveedor) o Auth.js. Workspaces como organizaciones de Clerk. Cada petición a nuestro backend valida el JWT y resuelve usuario + workspace.
- **Confianza:** 🟢
- **Pendiente:** elegir Clerk vs Auth.js.

### A2. Base de datos
- **Nuestra receta:** Postgres. Tablas mínimas: `users`, `workspaces`, `memberships`, `credit_ledger` (en centésimas, como Higgsfield), `jobs`, `souls` (LoRAs), `assets`, `subscriptions`, `templates`, `generations`.
- **Confianza:** 🟢
- **Pendiente:** esquema detallado (lo incluye este doc en la revisión final).

### A3. Cola de trabajos y tiempo real
- **Higgsfield:** envía el trabajo, recibe aviso del servidor por SSE (`job:status_changed`) y, de respaldo, consulta por lotes cada 5 s. (ver `01-api-layer.md`, `02-generation.md`)
- **Nuestra receta:** enviamos a la cola de fal (`queue.fal.run`), fal nos avisa por **webhook** cuando termina, y el servidor avisa al navegador por SSE. Respaldo: consulta cada 4 s (ya hecho en la fase 1).
- **Confianza:** 🟢 (la fase 1 ya tiene el cliente de fal y el polling; falta el webhook).
- **Pendiente:** endpoint de webhook + verificación de firma de fal.

### A4. Créditos y cobro
- **Higgsfield:** Stripe (Elements/Checkout/Portal), bajas con Churnkey, precios remotos en `pricing.higgsfield.ai`, créditos en centésimas, planes free/lite/basic/pro/ultra/team/scale, paquetes, "unlimited" por modelo. (ver `03-auth-billing.md`)
- **Nuestra receta:** Stripe. Suscripciones (planes con créditos/mes) + paquetes sueltos. Cada generación: **reservar créditos al enviar → confirmar al completar → devolver al fallar** (atómico en Postgres). Precio en créditos por modelo = coste de fal × margen.
- **Confianza:** 🟢 en el mecanismo; 🔵 los planes y precios; ⚪ el coste exacto de fal.
- **Pendiente de ti:** qué planes, qué precios, qué margen (sugerencia: ×2,5–4).

### A5. Moderación y legal
- **Higgsfield:** al confirmar subida corre NSFW + IP (derechos de imagen/autor); estados `nsfw`, `ip_detected`. DataDome anti-bot. (ver `02-generation.md`, `03-auth-billing.md`)
- **Nuestra receta:** filtro NSFW (fal ya marca `has_nsfw_concepts`, la fase 1 ya los descarta) + verificación de consentimiento para caras reales (Soul, face swap, lipsync). Términos de uso propios. Revisar licencia comercial de cada modelo de fal (todos los del catálogo actual son `commercial`).
- **Confianza:** 🟢 técnico; 🟡 el detector de IP/derechos (lo hacen en su servidor; nosotros usamos un filtro propio + consentimiento).
- **Pendiente:** redactar términos; definir el gate de consentimiento.

---

## PARTE B — Generación base (ya construida en la fase 1)

### B1. Estudio de imagen y video
- **Estado:** ✅ hecho (PR #1). 33 modelos en fal, un compositor, galería, historial, ajustes por modelo.
- **Confianza:** 🟢 construido; ⚪ sin probar con clave real.
- **Pendiente:** una generación real con `FAL_KEY` para validar de punta a punta.

---

## PARTE C — Soul (identidad entrenada) — el corazón del producto

### C1. Entrenar un Soul
- **Qué hace Higgsfield:** `POST /custom-references{,/soul-v2,/soul-cinematic}` con `{name, input_images, training_args}`. En producción `training_args` va **vacío** (lo pone el servidor). Fuera de producción el código revela la receta: 3 etapas (256/512/1024 px, 100 pasos c/u), learning rate 6e-4→1e-4, peso de cara 0.3→0.7. Fotos: máx. 80, cara validada en servidor, estados `queued→in_progress→completed/failed`, polling cada 10 s, coste 25–30 créditos. (ver `06-soul-identidad.md`)
- **Nuestra receta:** entrenar un **LoRA de identidad** en fal: **`fal-ai/flux-lora-portrait-trainer`** (retrato, el más cercano a Soul). Alternativas: `fal-ai/qwen-image-trainer-v2`, `fal-ai/z-image-trainer`. El resultado es un archivo LoRA (nuestro "Soul", pesos propios) guardado en la tabla `souls`, ligado a usuario + modelo base.
- **Flujo exacto:** subir fotos (URL firmada) → validar (nº, ≥840px lado corto, 1 de cuerpo entero, cara detectada, sin grupos) → lanzar trainer con webhook → estados → guardar la URL del LoRA.
- **Prompt:** no aplica al entrenamiento.
- **Confianza:** 🟢 el flujo y el entrenador; 🟡 los hiperparámetros exactos (los suyos de producción son del servidor; usamos los que vimos + ajuste); ⚪ la fidelidad facial final (se mide con una prueba real).
- **Pendiente:** elegir modelo base definitivo (Flux vs Qwen vs Z-Image) — se decide con una prueba comparativa.

### C2. Generar con un Soul
- **Qué hace Higgsfield:** solo modelos Soul lo aceptan, con `custom_reference_id` + `custom_reference_strength` (por defecto 1). No se usa en video ni en modelos de terceros. (ver `06-soul-identidad.md` §3.2)
- **Nuestra receta:** pasar la URL del LoRA al modelo base (`…/lora` con `loras:[{path, scale}]`). `scale` = fuerza de identidad. Modo rápido sin entrenar: PuLID / InstantCharacter (`fal-ai/flux-pulid`, `fal-ai/instant-character`).
- **Confianza:** 🟢
- **Pendiente:** nada de investigación.

### C3. Soul styles y presets (moodboard)
- **Higgsfield:** `/soul-styles`; "Soul 2.0 Preset" es un **estilo** entrenado con ≥5 imágenes de moodboard, no una identidad.
- **Nuestra receta:** un LoRA de estilo (mismo trainer, imágenes de estética en vez de una persona) o un catálogo de estilos como prompts.
- **Confianza:** 🟢 / 🟡 (si queremos clonar sus estilos exactos, no se puede; hacemos los nuestros).

---

## PARTE D — Avatares y AI Influencer (lo viral)

### D1. AI Influencer Studio (personaje inventado)
- **Qué hace Higgsfield:** builder de 1–4 "character sheets". Catálogo de rasgos **completo en el código** (9 tiers, animales, 18 grupos de opciones) y **reglas del aleatorio exactas** (67% hombre, 40% trajes, vello solo si masculino, etc.). El navegador manda ids de rasgos + brief; el servidor arma el prompt. Endpoints: `/job-sets/costs`, `/jobs/v2/ai_influencer_sheet`. (ver `08-avatares-ai-influencer.md`)
- **Nuestra receta:** replicar el catálogo de rasgos como datos propios + nuestro ensamblador de prompt (mapa rasgo→texto) + modelo de imagen de fal: **`fal-ai/nano-banana-pro/edit`** (con referencia) o **`fal-ai/nano-banana-pro`** / Seedream (sin referencia).
- **Prompt:** 🟡 su plantilla rasgo→texto es del servidor; la escribimos nosotros a partir de los ids y del resultado.
- **Confianza:** 🟢 catálogo y flujo; 🟡 la plantilla de prompt.
- **Pendiente:** redactar nuestro mapa rasgo→texto.

### D2. Soul ID vs character sheet vs Reference Element
- **Soul ID:** persona real entrenada (Parte C).
- **Character sheet:** imágenes de un personaje inventado; puede quedar como Reference Element.
- **Reference Element:** no se entrena; se cita en el prompt con `<<<uuid>>>` y vale para muchos modelos.
- **Nuestra receta:** Elements = imágenes guardadas que inyectamos en el prompt del modelo que las soporte. 🟢

### D3. Avatares, AI Host, Faceless, Shorts, Photodump
- **Higgsfield:** `/avatars` (cara+voz+preset de movimiento), AI Host (~30 endpoints, guion por bloques), Faceless/Shorts (`/reels/*`), Photodump (pack de fotos del mismo personaje). (ver `08-avatares-ai-influencer.md`)
- **Nuestra receta:** avatar parlante = imagen + voz + lipsync (`fal-ai/kling-video/ai-avatar/v2`, `fal-ai/infinitalk`, `fal-ai/sync-lipsync/v3`). AI Host = un LLM que escribe el guion por bloques + lipsync por bloque + montaje. Photodump = entrenar Soul + generar pack.
- **Confianza:** 🟢 los modelos; 🟡 la plantilla de guion del AI Host (nuestra).
- **Pipeline viral (revelado por su propio tour):** retrato Soul 2.0 → sheet Seedream 5.0 → video Seedance 2.5. Lo replicamos con nuestro Soul → Nano Banana/Seedream → Seedance.

---

## PARTE E — Genjutsu y clonación de video (el editor)

### E1. Genjutsu
- **Qué hace Higgsfield:** 2 modos: **motion-control** (`hf_mult_motion_control`, transferir movimiento) y **replace-object** (`hf_mult_replace_object`, sin máscara, el objeto se define con prompt+imágenes). Resultado en split-screen. Presets del CMS. (ver `07-genjutsu-clonacion-video.md`)
- **Nuestra receta:**
  - Motion control → **`fal-ai/kling-video/v3/pro/motion-control`** o **`fal-ai/wan/v2.2-14b/animate/move`**.
  - Replace object → **`fal-ai/wan/v2.2-14b/animate/replace`** o `fal-ai/bernini-r/reference-edit-video`; segmentación con `fal-ai/sam-3/video` si hace falta.
  - Restyle → `decart/lucy-restyle` / `fal-ai/id-v2v`.
- **Confianza:** 🟢 los modelos; 🟡 qué modelo exacto usan ellos detrás de `hf_mult_*` (desconocido; elegimos el nuestro).
- **Pendiente:** ⚪ comparar calidad de Kling MC vs Wan Animate.

### E2. Clonación de video (cara/voz/movimiento sobre video)
- **Higgsfield:** Kling Motion Control, Recast (= Wan 2.2 Animate v3), Revoice, Video Face Swap, Infinite Talk (lipsync, exige `.wav`). Ningún job de video acepta Soul ID. (ver `07-genjutsu-clonacion-video.md`)
- **Nuestra receta:** face/body swap en video → `fal-ai/wan/v2.2-14b/animate/replace`; voz → doblaje (`fal-ai/dubbing`) + lipsync; lipsync desde imagen → `fal-ai/sync-lipsync/v3/image-to-video`, `fal-ai/infinitalk`.
- **Confianza:** 🟢
- **Nota legal:** face swap y lipsync de personas reales → gate de consentimiento obligatorio (Parte A5).

### E3. Katana y el editor "Fable"
- **Katana:** catálogo de presets que se ejecuta **a través de Claude** (devuelve `claude.ai/new?q=…`). Para nuestra plataforma: un flujo con nuestro propio LLM, no dependemos de Claude.
- **Fable** (`/video-editor`): editor con timeline y sync por WebSocket, solo para usuarios `ai-host`. Es la fase avanzada (Parte G).
- **Confianza:** 🟡 (los pasos internos no se ven; rehacemos el editor nosotros).

---

## PARTE F — Composición y prompts (el "cerebro" de la creación)

### F1. Cómo se construyen los prompts
- **Qué hace Higgsfield:** el navegador casi no redacta. Manda texto del usuario con marcas `<<<...>>>` + ids + opciones `enhance_prompt`, `system_prompt_version` (v1/v2), `use_rag_search`, `apply_memories`. La reescritura final con LLM es del servidor (no visible). **Pero sí hay plantillas en el código:** 24 emociones con su fragmento (`(with sad emotion)`), edición dibujando encima, edición por regiones en rejilla 1000×1000, retrato que conserva identidad, plantillas `{product}`/`{scene}`. (ver `09-composicion-y-prompts.md`)
- **Nuestra receta:** dos capas, como ellos:
  1. **Compilador determinista**: rasgos/opciones/elementos → prompt estructurado (plantillas propias, partiendo de las que extrajimos).
  2. **Mejorador con LLM** (`openrouter/router` o Claude/GPT): reescribe el prompt para realismo/estética. Esto es exactamente lo que su servidor hace oculto; nosotros lo hacemos con nuestras plantillas.
- **Confianza:** 🟢 la arquitectura; 🟡 el contenido de los system prompts (los suyos no se ven; escribimos los nuestros y los afinamos).
- **Pendiente:** redactar nuestra biblioteca de plantillas de prompt por herramienta. **Este es el mayor trabajo de diseño 🟡 del proyecto.**

### F2. Cinema Studio (composición de video)
- **Higgsfield:** 4 versiones de video; envío exacto documentado: multi-shot (3–12 s total, 512 car/plano), movimiento de cámara, curva de velocidad por escena, 26 direcciones de luz, fotogramas inicial/final, paleta, emociones. Catálogos de cámara/lente/género son del servidor. (ver `09-composicion-y-prompts.md`)
- **Nuestra receta:** un compositor con catálogos propios (cámaras, lentes, looks como datos), que arma el payload multi-shot y lo manda a un modelo de video de fal (Kling/Seedance/Wan) por plano, y cose los planos.
- **Confianza:** 🟢 la estructura; 🟡 los valores de sus catálogos (hacemos los nuestros).

### F3. Cadenas (`/chains/*`) y post-producción
- **Higgsfield:** 13 cadenas; los pasos internos son del servidor; solo Reels, AI Host y link-to-ad muestran sus pasos. Post: color grading en navegador (WebGL), export en navegador, reframe/upscale/doblaje en servidor. (ver `09-composicion-y-prompts.md`)
- **Nuestra receta:** un **ejecutor de cadenas** propio (pasos = llamadas a fal en orden). Montaje/cosido: `fal-ai/ffmpeg-api/compose`, `merge-videos`, `merge-audio-video`. Upscale: `fal-ai/seedvr/upscale/video`. Audio: `fal-ai/mmaudio-v2`. Subtítulos: `fal-ai/auto-caption`.
- **Confianza:** 🟢 las piezas; 🟡 el orden exacto de cada cadena (lo rediseñamos observando entradas/salidas).

---

## PARTE G — Apps, plantillas y reels (el volumen de producto)

### G1. Las ~95 apps
- **Higgsfield:** motor de plantillas `/workflows` (ficha con campos `text_field/text_area/image/image_batch` + coste) para ~65 apps; ~30 apps con endpoint propio (Nano Banana, etc.). (ver `05-apps.md`)
- **Nuestra receta:** un **motor de apps por ficha** idéntico en concepto: cada app es un JSON (campos + modelo de fal + plantilla de prompt + coste). Una sola pieza de código sirve decenas de apps.
- **Confianza:** 🟢 el motor; 🟡 el contenido de cada ficha (lo escribimos nosotros, app por app).

### G2. Plantillas de reel (5 familias)
- **Higgsfield:** (1) Viral Hub code-based (27, se montan en el **navegador** con WebCodecs, audio por corte `cueFrames`); (2) efectos GLSL con `manifest.json`; (3) plantillas de servidor `/chains/viral-hub`; (4) apps-cadena (Beat-Fit, ClipCut); (5) Reels Studio (`/shorts-studio`, divide en clips, cose, 3 créditos/s). (ver `10-plantillas-reels.md`)
- **Nuestra receta:** esquema JSON de plantilla con 2 modos (montaje en navegador con WebCodecs / cadena en servidor). Montaje con `fal-ai/ffmpeg-api/compose`. Detección de beats: fal **no** tiene → essentia.js (navegador) o librosa (servicio propio).
- **Confianza:** 🟢 el montaje; 🟡 el contenido de cada plantilla (nuestro); ⚪ la detección de beats (elegir y probar essentia vs librosa).

---

## PARTE H — Lo que NO se puede obtener (y cómo lo cubrimos)

| Hueco | Por qué | Cómo lo cubrimos |
|---|---|---|
| Pesos de Soul y de sus modelos | Viven en su servidor | LoRA propio en fal |
| System prompts del servidor | No viajan al navegador | Escribimos los nuestros + LLM mejorador |
| Valores de catálogos del servidor (cámaras, lentes, estilos) | Se sirven por API suya | Hacemos catálogos propios |
| Pasos internos de las cadenas | Ocurren en su servidor | Rediseñamos el orden observando E/S |
| Precio exacto por segundo de fal | Solo con cuenta activa | Lo leemos al conectar la `FAL_KEY` |
| Modelo exacto detrás de `hf_mult_*` | No identificado en el bundle | Elegimos el mejor de fal y comparamos |

Ninguno es un fallo de investigación: son, por definición, cosas externas. Todas tienen un reemplazo definido.

---

## Decisiones que necesito de ti (🔵) para cerrar el documento

1. **Nombre del producto.**
2. **Planes y precios** que quieres cobrar (y margen objetivo).
3. **Alcance de la v1:** ¿todo de golpe o por fases? (recomiendo fases).
4. **Clave de fal** como secreto del entorno — para cerrar los ⚪ (precio real + una prueba de calidad). No para "ensayar", sino para verificar una vez.
5. **Login:** Clerk o Auth.js.

## Qué entregará la versión final de este documento
Cuando aprabas la dirección, convierto cada ficha en: esquema de base de datos completo, lista de endpoints de nuestro backend, el JSON de cada app/plantilla, y la biblioteca de plantillas de prompt. Ese será el plano 100% con el que se construye sin sorpresas.
