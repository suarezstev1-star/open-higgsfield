# Higgsfield — inventario de aplicaciones internas ("Apps")

Análisis estático del frontend público (sin llamadas a sus APIs). O = observado en el código, I = inferido.

## Cómo funciona el sistema de Apps
- **Catálogo (O):** viene del servidor, no está fijo en el código.
  - `GET /fnf/applications/explore?apps_per_category=N`
  - `GET /fnf/applications?category=…`
  - El código solo trae la parte de SEO (mapa de 65 apps con título y descripción, chunk `jCvphhIoPfzXpCEq`). Por eso puede haber apps nuevas en el servidor que no aparezcan aquí.
- **Definición de cada app ("appPreset") (O, chunk `mkLiyNur15isvg7J`):**
  - Formato: `{slug, title, shortDescription, imageTemplate?, videoTemplate?}`.
  - Cada plantilla es `{slug, cost, inputs:[{id, type, properties}]}`.
  - Tipos de entrada: `text_field`, `text_area`, `image`, `image_batch`.
- **App genérica (O):** el formulario se genera solo a partir de `inputs`. Se envía con:
  - `POST /fnf/workflows`
  - cuerpo `{params, width, height, application_slug, application_template_slug}`
  - requiere el plan con `appV1` salvo en workspaces compartidos (`assertSubscriptionPlan('appV1')`).
  - Coste de ejemplo: video 1080 = 10 créditos, 768 = 8; imagen = 1.
- **Apps con interfaz propia (O):** un mapa `slug → Component` sustituye el formulario genérico. Muchas llaman a un endpoint `/jobs/*` o `/chains/*` dedicado en vez de `/workflows`.
- **Rutas:**
  - `/apps` (catálogo)
  - `/apps/$slug`
  - `/apps/$slug/view` (vista pública)
  - variantes `mobile`/`desktop`
  - redirecciones heredadas: `outfit-matchcut→clipcut`, `outpaint→expand-image`, `faceswap→face-swap`, `qwen-camera-control→angles`, `link-to-video-ad→/marketing-studio?tool=url-to-ad`, `mixed-media→/mixed-media`.

## A. Apps con motor/endpoint dedicado (O)
| App (slug) | Qué hace | Motor / endpoint |
|---|---|---|
| skin-enhancer | Mejora de piel en retratos | `POST /jobs/nano-banana-2-skin-enhancer` (Nano Banana) |
| zooms | Zooms creativos sobre una imagen | `/jobs/nano-banana-2-zooms` |
| shots | Variantes de plano/encuadre | `/jobs/nano-banana-2-shots` |
| whats-next | "Siguiente plano" de una escena | `/jobs/v2/next_shots` (4 créditos) |
| relight | Reiluminar imagen | `/jobs/nano-banana-2-relight` (+`/batch`) |
| ai-stylist | Estilismo / cambio de look | `/jobs/nano-banana-2-ai-stylist` |
| game-dump | Foto → captura de videojuego | `/jobs/nano-banana-2-game-dump` |
| clipcut (ex outfit-matchcut) | Reel de outfits sincronizado al ritmo | `/jobs/nano-banana-2-outfit-collage` + `/chains/outfit-matchcut` |
| outfit-swap | Cambiar ropa | Nano Banana (I) |
| face-swap | Intercambio de cara en imagen | `/jobs/face-swap` |
| character-swap | Cambiar personaje en escena | `/jobs/character-swap/v2` |
| video-face-swap | Cara en video | `/jobs/wan2-2-animate-faceswap` (Wan 2.2 Animate) |
| recast | Re-actuar video con otro personaje | `/jobs/wan2-2-animate-v3` (I) |
| (revoice) | Cambiar voz en video | `/jobs/wan2-2-animate-revoice` |
| angles (ex qwen-camera-control) | Nuevos ángulos de cámara de una foto | `/jobs/qwen-camera-control-v2` (+`/batch`) |
| expand-image (ex outpaint) | Extender imagen fuera de bordes | outpaint / `flux_2_pro_outpaint` |
| video-relight | Reiluminar video | `CINEMATIC_VIDEO_RELIGHT` |
| video-rehex | Inpainting de video | `CINEMATIC_VIDEO_INPAINT` |
| transitions / kling-transition | Transición entre dos imágenes | `/jobs/kling-transition` |
| plushies, 3d-figure, 3d-render (viral transform) | Foto → peluche / figura / render 3D | `/jobs/viral-transform-image` y `-video` |
| sticker-matchcut | Match-cut de stickers | `/chains/sticker-matchcut` |
| beatfit / urban-cuts | Video de outfits al ritmo | `/chains/beat-fit-nano-banana` |
| game-character-creator | Crear personaje de juego | `/chains/game-character-creator` |
| link-to-video-ad / click-to-ad | URL de producto → anuncio en video | `/chains/link-to-ad` (Marketing Studio) |
| animal-clone, fans-studio, style-snap, commercial-faces, ai-headshot-generator | Utilidades con formulario propio | handlers propios en `mkLiyNur15isvg7J` |
| image-background-remover / video-background-remover | Quitar fondo | handlers propios |
| color-grading | Etalonaje (16mm, split-tone, old-lens…) | componente propio |
| hook-predictor | Predice la fuerza del gancho de un video | componente propio |
| similarity-score | Comprueba parecido con IP antes de publicar | componente propio |
| meme-generator | Memes desde foto | componente propio |
| mugshot, behind-the-scenes, 3d-rotation | Efectos con landing propia | (I) plantilla |

## B. Apps de plantilla (65 en el mapa SEO, pasan por `/workflows`) (O)
- **Efectos virales y memes:** idol, latex, skibidi, this-is-fine, mukbang, simlife, rapgod, yes-kiss, 60s-cafe, chameleon, sand-worm, nano-theft, cloud-surf, brick-cube, pixel-game, comic-book, nano-strike, renaissance, magic-button, japanese-show, giallo-horror, storm-creature, burning-sunset, roller-coaster, melting-doodle, sketch-to-real, paint-app, game-dump, meme-generator, extras.
- **Publicidad de producto:** poster, mascot, kick-ad, truck-ad, packshot, signboard, fridge-ad, volcano-ad, graffiti-ad, billboard, giant-product, macroshot-scene, macroshot-product, asmr-add-on, victory-card, commercial-faces.
- **Moda y retrato:** clipcut, urban-cuts, outfit-shot, vending-machine, glitter-sticker, j-poster, j-magazine, ai-headshot-generator.
- **Cámara y cine:** bullet-time-white, bullet-time-scene, bullet-time-splash, behind-the-scenes.
- **ASMR / presentador:** asmr-host, asmr-classic.
- **Utilidades:** expand-image, image-background-remover, breakdown (identifica objetos, marcas y precios), similarity-score, lipsync-studio.

## C. Estudios principales (no son "apps", pero son herramientas internas)
Image (`/ai/image`), Video (`/ai/video`, edit, motion, reframe), Cinema Studio (`/generate`), Flow/Canvas, Lipsync Studio, Speech/Audio, Marketing Studio y Ads Studio, AI Influencer Studio, Character/Soul ID, Effects/Viral Hub, Genjutsu, Katana, 3D-jutsu, Upscale, Mixed Media, Photodump, Moodboard, Draw-to-Video, Supercomputer (agente), Apps/Games marketplace de usuarios.
