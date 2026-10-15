# Soul: qué modelo base usa y cómo lo recreamos

Investigación pública (prensa, blog y centro de ayuda de Higgsfield, blogs de terceros) + verificación del catálogo público de fal. Fecha: 2026-10-15.

Cada punto marca su confianza: **OBSERVADO** (dato público citado), **INFERIDO** (deducido de evidencia), **DESCONOCIDO**.

## Qué es Soul, según lo público
- **OBSERVADO:** Soul es la familia de modelos **propia** de Higgsfield para imagen fotorrealista, lanzada en junio de 2025; Soul 2.0 es su "modelo base propio" (foundation image model). FLUX aparece como un modelo **aparte** en su catálogo, no como la base de Soul. (centro de ayuda de Higgsfield)
- **OBSERVADO:** Higgsfield se describe como un **orquestador** que corre muchos modelos de terceros, con Soul como pieza propia. El CEO es Alex Mashrabov (ex-Snap); cofundador Erzat Dulat. (trendingtopics.eu, sacra.com)
- **DESCONOCIDO:** la arquitectura exacta, el número de parámetros y los datos de entrenamiento de Soul. No hay paper ni entrevista técnica. Las descripciones de blogs ("latent diffusion + comprensión de prompt por transformer") son genéricas y no oficiales → en la práctica, un **transformer de difusión (DiT)**, la misma familia que Flux, SD3, Seedream o Qwen-Image. (segmind.com, apprankr.com — no verificado)

## Soul ID (el entrenamiento de identidad): qué es por dentro
- **OBSERVADO:** se entrena con **20–80 fotos** de una persona real (antes pedían 25+), ≥960 px, ángulos y expresiones variados, al menos una de cuerpo entero, sin fotos de grupo ni caras tapadas. (centro de ayuda y blog de Higgsfield)
- **OBSERVADO:** el entrenamiento tarda **3–5 minutos** y cuesta ~25 créditos (~1,25 $, tarifa de 2026; confirmar en la app). (blog de Higgsfield)
- **OBSERVADO:** cada Soul ID está **atado a un modelo**: uno entrenado en Soul 2.0 solo sirve en Soul 2.0; para Soul Cinema hay que entrenar otro. Solo captura personas reales; para personajes inventados se usa AI Influencer Studio o Soul Cast. (centro de ayuda)
- **INFERIDO (alta confianza):** 3–5 minutos sobre 20–80 imágenes **no** es un fine-tune completo ni un modelo desde cero (eso llevaría horas). Es el tiempo típico de entrenar un **adaptador LoRA de identidad** sobre un modelo base congelado. Que cada Soul ID sea específico de un modelo refuerza esto: un LoRA solo encaja en el modelo base para el que se entrenó.
- **Concuerda con el frontend:** el cliente envía `training_args` con `learning_rate`, `total_steps`, `warmup_steps`, `target_area`, `face_loss_weight` (ver `06-soul-identidad.md`). Esos son exactamente los hiperparámetros de un entrenamiento LoRA con énfasis en la cara (`face_loss_weight`).

## Conclusión práctica
No se puede extraer el modelo Soul ni sus pesos (viven en sus servidores). Pero **no hace falta**: Soul ID es, con alta probabilidad, "modelo base DiT + LoRA de identidad por cara", y eso **sí se replica** con resultados comparables.

## Cómo lo recreamos en fal (verificado en su catálogo público)
Entrenadores de LoRA disponibles hoy en fal (todos `category: training`):
- **`fal-ai/flux-lora-portrait-trainer`** — entrenador de LoRA de **retrato/identidad** sobre FLUX. Es el equivalente más directo a Soul ID. ✅ recomendado para empezar.
- `fal-ai/flux-kontext-trainer` — LoRA sobre Flux Kontext (edición).
- `fal-ai/qwen-image-trainer-v2`, `fal-ai/qwen-image-2512-trainer-v2` — LoRA sobre Qwen-Image.
- `fal-ai/z-image-base-trainer`, `fal-ai/z-image-trainer` — LoRA sobre Z-Image.
- `fal-ai/krea-2-trainer` — LoRA sobre Krea 2.
- Video: `fal-ai/hunyuan-video-lora-training`, `minimax/h3/.../lora` (LoRA de identidad en video).

Flujo equivalente a "entrenar un Soul":
1. El usuario sube 20–80 fotos → las subimos al almacenamiento (Blob/S3) con URL firmada.
2. Validamos como ellos: nº de fotos, resolución mínima, una de cuerpo entero, detección de cara, sin grupos. (reglas tomadas de su centro de ayuda)
3. Lanzamos `fal-ai/flux-lora-portrait-trainer` con las imágenes y los hiperparámetros (learning rate, pasos, énfasis en cara). Devuelve un **archivo LoRA** (nuestro "Soul", con nuestros pesos).
4. Guardamos ese LoRA ligado al usuario y al modelo base. Estados: entrenando → listo → fallido.
5. Para generar con ese "Soul": pasamos la URL del LoRA al modelo base (p. ej. un endpoint FLUX con `loras:[{path,scale}]`), igual que Higgsfield inyecta su `soul_id`.

Qué queda por afinar con pruebas reales (cuando haya `FAL_KEY`): elegir el modelo base que mejor iguale la estética de Soul (FLUX vs Qwen vs Z-Image), y ajustar pasos/learning-rate/escala del LoRA comparando resultados. Ahí está el trabajo que de verdad acerca la calidad a la de ellos, de forma legítima y con pesos propios.

## Fuentes
- Centro de ayuda de Higgsfield — Soul ID: https://higgsfield.ai/creator-hub/help-center/ai-models/how-do-i-create-and-use-a-soul-id-character
- Centro de ayuda — qué modelo usar: https://higgsfield.ai/creator-hub/help-center/ai-models/which-ai-model-should-i-use
- Blog Higgsfield — consistencia de personaje: https://higgsfield.ai/blog/sould-id-best-character-consistency
- The Rundown — Soul 2.0: https://www.therundown.ai/tools/higgsfield-soul-2-0
- Sacra — entrevista a Alex Mashrabov: https://sacra.com/research/alex-mashrabov-higgsfield-ai-video-production/
- TrendingTopics — Higgsfield: https://www.trendingtopics.eu/higgsfield-1-billion-revenue/
- Segmind (no oficial): https://blog.segmind.com/higgsfield-soul-enhances-ai-image-realism/
