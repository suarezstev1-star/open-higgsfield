# Investigación: cómo funciona higgsfield.ai

Ingeniería inversa **estática** del frontend público de higgsfield.ai, hecha el 2026-10-14 con REA (`rea-agents@6.5.0`) y análisis dirigido.

- No se hizo ninguna llamada a las APIs de Higgsfield. Todo sale del JavaScript que el sitio entrega a cualquier navegador.
- Este repositorio **no guarda el código de Higgsfield**, solo nuestros informes y tablas de rutas y endpoints.

Cada afirmación de los informes está marcada como **OBSERVADO** (cita el chunk y un fragmento), **INFERIDO** o **DESCONOCIDO**.

| Archivo | Contenido |
|---|---|
| `00-resumen.md` | Resumen ejecutivo en español: arquitectura, generación, agentes, hallazgos |
| `01-api-layer.md` | Servicios y gateway, cliente HTTP, cabeceras, reintentos, catálogo de ~1.044 endpoints, tiempo real (SSE/WebSocket) |
| `02-generation.md` | Modelos (217 tipos de trabajo), parámetros, tablas de coste, ciclo de vida de un trabajo, mapa de rutas a modelos |
| `03-auth-billing.md` | Clerk, workspaces y roles, planes, Stripe, créditos, telemetría, feature flags |
| `04-agents-mcp-canvas.md` | Arquitectura del frontend, agente Supercomputer, servidor MCP, canvas y colaboración, comunidad |
| `05-apps.md` | Inventario de las ~95 apps internas (motor de plantillas `/workflows` + apps con endpoint propio) |
| `data/endpoints-uniq.tsv` | Servicio, ruta, método y chunk de cada endpoint encontrado |
| `data/route-chunks.tsv`, `data/routemap.tsv` | Ruta de la web y chunk que la implementa |

**Nota:** los informes citan rutas de trabajo de la sesión original (`scratchpad/hf-assets/`, `scratchpad/tools/`). Esos archivos no se conservan: eran los bundles descargados de Higgsfield y los scripts de extracción. Para repetir el análisis, ver `docs/HANDOFF.md`, sección "Repetir la investigación".
