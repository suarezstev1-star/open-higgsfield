# Traspaso del proyecto: dónde estamos y cómo continuar

Última actualización: 2026-10-15. Este documento permite retomar el trabajo en otro chat o sesión sin el historial anterior.

## 1. Objetivo

Construir una plataforma propia de generación de imagen y video con IA, al estilo de higgsfield.ai, que se pueda **cobrar** con créditos. La base es este repositorio, `suarezstev1-star/open-higgsfield` (Next.js 16 + React 19).

Reglas que acordamos:
- Reconstruimos el **funcionamiento** que descubrimos en la ingeniería inversa, con **código propio**. No copiamos el código, la marca, los presets ni los recursos de Higgsfield.
- Los modelos se sirven a través de **fal.ai**, con la clave del operador, y se cobran al usuario con margen.

## 2. Estado actual

| Pieza | Estado |
|---|---|
| Investigación de Higgsfield (REA + análisis dirigido) | ✅ Hecha. Ver `docs/research/higgsfield/` |
| Fase 1 · Proveedor fal.ai (33 modelos, 70 endpoints) | ✅ En la rama `feat/fal-provider`, PR #1 en borrador |
| Prueba real con clave de fal | ⏳ Pendiente: falta `FAL_KEY` |
| Nombre y marca del producto | ⏳ Pendiente: lo decide el dueño |
| Fases 2–6 | ⏳ Sin empezar |

### Qué hace la fase 1 (PR #1)
- `src/generation/platform.ts`: cliente de la cola de fal.
  - Envía con `POST https://queue.fal.run/{endpoint}`.
  - Consulta el estado en `/{owner}/{app}/requests/{id}/status` y descarga el resultado de `/{owner}/{app}/requests/{id}`.
  - El identificador de cada trabajo tiene la forma `owner/app::request_id`.
- `src/generation/catalog/*.ts`: cada modelo declara sus endpoints de fal por modo de entrada: `text`, `image`, `firstLast`, `reference`, `edit`, `motion`.
- `src/generation/to-fal.ts`: traduce cada generación a los campos y tipos exactos que pide el endpoint, usando `src/generation/fal-schemas.json`.
- Comandos de mantenimiento:
  - `pnpm fal:schemas`: refresca la copia de los esquemas de fal.
  - `pnpm fal:check`: comprueba el catálogo entero contra esos esquemas. Hoy da 0 errores.
- Clave: `FAL_KEY` en el servidor (opcional) o la que pega el usuario.
  - ⚠️ No publicar la app con `FAL_KEY` configurada hasta tener login y créditos (fase 2): cualquier visitante gastaría de la cuenta.

## 3. Hoja de ruta

| Fase | Contenido | Referencia en la investigación |
|---|---|---|
| 2 | Login (Clerk); Postgres con usuarios, trabajos, historial y créditos; Stripe (suscripciones y paquetes); precios en créditos por modelo con margen; avisos de fal al servidor cuando termina un trabajo; subida directa con URL firmada; filtro de contenido | `03-auth-billing.md`, `02-generation.md` §2 |
| 3 | Motor de **apps de plantilla**: ficha con campos (`text_field`, `text_area`, `image`, `image_batch`) y coste por plantilla, todas por un único endpoint | `05-apps.md` |
| 4 | Apps a medida: cambio de cara, reiluminar, ángulos, ampliar imagen, transiciones, Recast, lipsync, voz, upscale | `05-apps.md` (A), `02-generation.md` §4 |
| 5 | Presets de movimiento (LoRAs sobre Wan), efectos | `02-generation.md` §3 |
| 6 | Canvas, agente y servidor MCP propio | `04-agents-mcp-canvas.md` |

Sobre cobrar: hay que multiplicar el coste de fal por 2,5–4 al convertirlo en créditos, y no ofrecer "ilimitado" sin límite de trabajos simultáneos. Los precios de fal cambian, así que hay que confirmarlos en su web antes de fijar tarifas.

## 4. Lo que falta del dueño
1. **`FAL_KEY`**: créala en fal.ai/dashboard/keys y añádela como secreto del entorno. No la pegues en el chat.
2. **Nombre del producto**, para cambiar la marca "OpenHiggsfield".
3. Visto bueno para empezar la fase 2.

## 5. Cómo retomar en una sesión nueva
```bash
git clone https://github.com/suarezstev1-star/open-higgsfield
cd open-higgsfield && git checkout feat/fal-provider
pnpm install
npx tsc --noEmit && pnpm fal:check && pnpm build
pnpm dev   # http://localhost:3000
```

### Repetir la investigación de Higgsfield (si hiciera falta)
1. Instala REA y su skill para Claude Code. Muestra el plan, pide aprobación y luego aplícalo con `--yes`:
   ```bash
   npx -y rea-agents@latest setup --client claude_code --dry-run --json
   npx -y rea-agents@latest setup --client claude_code --yes
   ```
2. Descarga el HTML de `https://higgsfield.ai/` y rastrea los chunks `assets.higgsfield.ai/tanstack/assets/868a8dba-*.js` siguiendo los imports.
3. Analiza solo los chunks propios (los que mencionan `higgsfield.ai` o `fnf`) con `npx rea-agents analyze-javascript-application <dir> --json`. Con el sitio entero (~8.000 archivos) tarda horas.
4. Haz el análisis dirigido con grep y scripts. Los informes de `docs/research/higgsfield/` explican qué buscar.
