# Higgsfield — cómo funciona (ingeniería inversa del frontend público)

Fecha: 2026-10-14. Objetivo: `https://higgsfield.ai` (build TanStack Start, chunks `868a8dba-*`).

## Método y alcance
- Se descargaron los 8.050 assets JS/CSS que el sitio sirve públicamente (119 MB, sin source maps).
- REA (`rea-agents@6.5.0`, `analyze_javascript_application`) analizó los 330 chunks propios de Higgsfield.
  - Evidence `ev_75b50198850bf17a47a6a196c091983e32f870e44cc749972f76b7b063ca763a`.
  - Grafo de 8.111 nodos y 24.879 relaciones.
- Las conclusiones detalladas salen de análisis estático dirigido (grep y scripts) sobre esos bundles.
- **No se hizo ninguna petición a las APIs de Higgsfield.** Todo es lectura del código que recibe cualquier navegador.
- Limitaciones:
  - El análisis semántico de REA quedó parcial por límites de capacidad.
  - Sus 22 "endpoints" eran falsos positivos (lecturas de parámetros de URL) y sus 8 "preloads de Electron" también.
  - El backend no es visible: los esquemas de request/response, los precios en vivo y el proveedor real detrás de algunos ids internos quedan como **desconocidos**.

## Arquitectura en una página
| Capa | Qué es |
|---|---|
| Frontend | TanStack Start/Router/Query sobre Vite; i18n con Lingui (en, es, ja, ko, de, zh); 344+ rutas; Lexical, Uppy, React Flow, Yjs, Nutrient PDF |
| Identidad | Clerk (`clerk.higgsfield.ai`, proxy `/_clerk` en rollout); Google, Apple, Microsoft, email y SSO SAML/OIDC; workspaces = Clerk Organizations |
| API | Gateway `fnf-api-gw.higgsfield.ai/<servicio>`, 16 prefijos; `/fnf` es el principal (~833 rutas). Unos 1.044 pares servicio+ruta |
| Peticiones | Cabecera `Authorization: Bearer <JWT de Clerk>` más `hf-workspace-id`, `hf-surface`, `hf-env` e `Idempotency-Key` |
| Política de reintentos | Ante un 401 refresca el token y repite una vez; 423 provoca una recomprobación de acceso; 403 activa la recuperación de DataDome; backoff con `Retry-After` |
| Tiempo real | SSE `fnf-notification/notifications/stream` (más de 60 eventos, p. ej. `job:status_changed`); WebSockets en Cloudflare Workers (canvas, layers, sync, escena 3D, editor de briefs) |
| Media | Subida con URL firmada de S3 (multipart con Uppy); resultados en CloudFront `d8j0ntlcm91z4…/user_<id>/…` con redimensionado de Cloudflare |
| Pagos | Solo Stripe (Elements, Checkout, Portal); bajas con Churnkey; precios remotos en `pricing.higgsfield.ai` |
| Telemetría | PostHog (analítica y errores, vía `/api/i`), GA4, GrowthBook (flags), Securiti (consentimiento), DataDome (anti-bot en `dd.higgsfield.ai`) |

## Generación (núcleo del producto)
1. **Catálogo:**
   - 217 tipos de trabajo internos: unos 45 modelos de imagen y 85 de video.
   - Familias: Kling, Seedance, Veo, Sora 2, Wan, Hailuo, FLUX, Seedream, GPT Image, Soul, Nano Banana, Grok Imagine…
   - Además: lipsync, TTS, upscalers y 3D.
2. **Subida:**
   1. El navegador pide una URL firmada a `/media/batch`, `/video` o `/audio`.
   2. Sube el archivo con `PUT` a S3.
   3. Confirma con `/media/{id}/upload`, que dispara las verificaciones de NSFW y de IP.
3. **Envío:** `POST /jobs/{ruta}` o `/jobs/v2/{tipo}` con `{params, use_unlim, use_free_gens, parent_id, confirmation_token}`. Las cadenas de varios pasos usan `/chains/*`.
4. **Estados:** `waiting → queued → in_progress → (ip_detect) → completed | failed | nsfw | ip_detected | canceled | timed_out`.
5. **Fin del trabajo:** se detecta por el evento SSE `job:status_changed`, con respaldo de `POST /jobs/status-batch` (cada 5 s, o 30 s con el SSE abierto, en lotes de 100).
6. **Costes y límites:**
   - Precios desde `GET /job-sets/costs`; el código trae tablas de respaldo.
   - Los créditos se guardan en centésimas.
   - Trabajos simultáneos limitados por plan (`concurrent_jobs_limit`).
   - "Unlimited" funciona por modelo.
7. **Presets:** `/motions`, `/styles`, `/soul-styles`, `/viral-hub/presets` (shaders WebGL), CMS para Genjutsu y Katana.

## Agentes, MCP y colaboración
- **Supercomputer** (interno "claudesfield"):
  - API de chat en `/fnf/claudesfield/chats/...`, con streaming en formato Vercel AI SDK.
  - Unas 230 herramientas: código, terminal, navegador, generadores, Blender, despliegue de apps, memoria y subagentes.
  - Conectores de terceros con OAuth vía Pipedream; también admite servidores MCP del usuario.
- **MCP público:**
  - Servidor en `https://mcp.higgsfield.ai/mcp`, con OAuth (consentimiento sobre Clerk).
  - Deeplinks para Claude, ChatGPT, Codex y Grok.
  - CLI `@higgsfield/cli` (`higgsfield auth login`) y skills en `higgsfield-ai/skills`.
- **Colaboración en tiempo real:** ticket de corta duración, luego WebSocket en Cloudflare Workers. Cubre canvas (React Flow), layers, video "Fable" (sync), escena 3D (presencia y leases) y blog (Yjs). Salas de voz con Dyte.
- **Comunidad y monetización extra:** contests, academy, series, karma/score, marketplace de apps/juegos/skills/"employees", referidos (propios + FirstPromoter), regalos, códigos promo.

## Hallazgos curiosos (observados)
- Un relay de la cámara del móvil apunta a un host de desarrollo (`phonecam-web-dev.anwar-695.workers.dev`) en producción.
- El chunk `868a8dba-Uvx7o7ASR4AkkzQA.js` reexporta los helpers del gateway con sus nombres originales (`apiUrl`, `chatApiUrl`, `ApiClientError`…).
- socket.io/engine.io solo vienen del SDK de Nutrient PDF; los backends de Higgsfield no los usan.

## Informes detallados
- `01-api-layer.md`: servicios, cliente HTTP, catálogo de endpoints (apéndices A/B), tiempo real.
- `02-generation.md`: modelos, parámetros, tablas de coste, ciclo de vida de un trabajo, mapa de rutas a modelos.
- `03-auth-billing.md`: Clerk, workspaces/roles, planes, Stripe, créditos, telemetría, flags.
- `04-agents-mcp-canvas.md`: arquitectura frontend, Supercomputer, MCP, canvas, comunidad.
- `05-apps.md`: inventario de las ~95 apps internas.

Tablas: `data/endpoints-uniq.tsv`, `data/route-chunks.tsv`, `data/routemap.tsv`.

Cada afirmación de los informes detallados está marcada como OBSERVADO (con chunk y fragmento), INFERIDO o DESCONOCIDO.
