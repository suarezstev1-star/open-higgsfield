# 08 — Avatares, AI Influencer y productos de personajes virales

Fecha: 2026-10-15. Ingeniería inversa **estática** de los chunks `868a8dba-*.js` ya descargados (`scratchpad/hf-assets/`). No se hizo ninguna petición a higgsfield.ai ni a sus APIs. La única consulta de red fue al catálogo **público** de fal (`https://api.fal.ai/v1/models?q=…`) para obtener ids reales de endpoints.

Este informe parte de `01-api-layer.md`, `02-generation.md`, `05-apps.md` y `data/*.tsv`, y no repite lo que ya está allí: añade detalle de lógica, esquemas y reglas.

Convención de etiquetas:
- **[O]** = OBSERVADO: se cita el chunk (sin el prefijo `868a8dba-`) y un fragmento.
- **[O-MCP]** = OBSERVADO en los esquemas oficiales de las herramientas MCP de Higgsfield.
- **[I]** = INFERIDO.
- **[D]** = DESCONOCIDO.

Scripts usados (en `/tmp/claude-0/-home-user/95bdabac-1e70-57b2-ab47-be2402288960/scratchpad/tools/`):
- `aiinf-catalog.js` extrae el catálogo de rasgos v2.
- `aiinf-v1cfg.js` extrae la configuración legacy v1.

---

## 0. Mapa de chunks relevantes

| Chunk | Qué contiene |
|---|---|
| `anr9KZ-gxt3n_k-D` | Esquema zod del builder (`batch_size`, `tier`, `selection`, `brief`, `medias`, `item_medias`, `trait_variants`, `animal_variant`, `body_color`, `seed`, `folder_id`), los límites y las validaciones cruzadas |
| `n2J9VkGXnx2uQPYf` | **Catálogo completo de rasgos v2**: tiers, animales, 18 grupos con sus opciones y `visibleIn`/`slot`/`swatch`, reglas de conflicto, normalizador de la selección y **reglas de shuffle** |
| `9P_7f4EPiH7HoHYL` | Estado del formulario (`hf:ai-influencer-builder-form:v1`, en sessionStorage), restauración desde un job o un preset, `shuffledSelections` |
| `5yaEMyzL39n26Iep` | Cotización, submit `POST /jobs/v2/ai_influencer_sheet`, errores 402 y 422, free gens, acción `randomize` |
| `pijulBIuQan77wN1` | Presets (CMS): `GET /ai-influencer-presets`, `GET /ai-influencer-presets/{id}` |
| `xmr3rBnZG-8OlnGN` | Página `/ai-influencer-studio` (layout, pestañas history/explore, feed, showcase, formulario de vídeo con carga diferida) |
| `hj0ZlynpfvaqhBg6` | `InfluencerBuilderVideoForm`: animar con Genjutsu `hf-mult-motion-control` |
| `9FQw9C5A9z0eRW1F` | `GET /ai-influencer/video-explore/v2[/{id}]`: presets de movimiento y objetos |
| `frYRIQS8JnP_LWpA` | Builder **legacy** (store valtio) más `/ai-influencers` (influencers guardados y traza) y la analítica `ai_influencer_*` |
| `LU9jDvLaNlfkXG64` | Config **legacy v1** `GET /ai-influencer-config`, con un fallback estático embebido |
| `jCvphhIoPfzXpCEq` | Validador de enlaces de compartir `/s/{code}`, API `/avatars` y `/avatar-presets`, categorías de avatar |
| `_7Rhkh4-kqttScvL` | Cliente de la API de AI Host (`/ai-host/*`, `/jobs/v2/ai_host_video`) |
| `RTgd9uucAEwYxCNJ` | Escenarios "touring": la receta del pipeline viral influencer (retrato → sheet → vídeo) |
| `cvS5QqXDVQref2lT` | Popcorn y Photodump (`/keyframes/v3/*`) |
| `_piWo_eZxx-XvImX` | Página pública `/character-sheet` (`POST /jobs/v2/character_sheet`) |
| `BBAhrgNDahUTx1u5` | Avatares de Marketing Studio (`/marketing-studio/avatars*`) |

---

## 1. AI Influencer Studio (`/ai-influencer-studio`)

### 1.1 Rutas
- **[O]** La ruta `/_private/ai-influencer-studio` tiene `validateSearch` en `YtPGl6VSry4mgmEP`, que solo reexporta `xmr3rBnZG-8OlnGN`. El componente usa `ai-influencer-builder-layout` y `ai-influencer-builder-settings`.
- **[O]** La ruta pública `/ai-influencer/shared/$code` existe solo como `beforeLoad` (`QhqiFCLt1Ukztv0Y`: ``f3=dR.update({id:`/ai-influencer_/shared_/$code`,path:`/ai-influencer/shared/$code`…``). Ver §1.10.

### 1.2 Modelo de datos del request (esquema zod, `anr9KZ-gxt3n_k-D`)

**[O]** Límites:
```
C={batchSizeMin:1,batchSizeMax:4,briefMaxLength:4e3,imagesCountLimit:1,itemsCountLimit:3,historyItemsCountLimit:3,seedMin:1,seedMax:1e6}
```

**[O]** Campos del request (`R=f({…})`):
- `batch_size` ∈ [1, 4].
- `tier` ∈ `k` (los 9 tiers).
- `selection`: `record<string, string[]>`, **con 18 claves como máximo**.
- `brief` ≤ 4000 caracteres.
- `medias` ≤ 1 y `item_medias` ≤ 3. Cada media es `{role:"image", data:{id:uuid, type}}`.
- `trait_variants`, `animal_variant` y `body_color` (`/^#[\dA-F]{6}$/i`), los tres nullish.
- `seed` ∈ [1, 1e6].
- `folder_id` (uuid, nullish).
- La variante "history" (`B`) permite `url` en las medias y limita `item_medias` a 3.

**[O]** `trait_variants`:
```
P=f({version:m(`appearance-v2`),choices:a(c(),s([j,M])).superRefine(… (n===`pr_centaur`?M:j) …),animal_choices:a(c(),N).refine(e=>Object.keys(e).length<=64).nullish()})
```
- `j = original|v1..v5`.
- `M = v1..v10`, que **solo se admite para `pr_centaur`**.
- `N = 0|1|2|3|4`, el valor de `animal_choices`, con 64 claves como máximo.
- El esquema MCP dice `original|v1..v10` para todo. El cliente lo restringe a v1–v5, salvo el centauro.

**[O]** `animal_variant` es una unión discriminada por `version`:
- `animals-v1`: `{tier, id, look?}`. El `id` debe estar en la lista de animales de su tier.
- `animals-v3`: `{tier, id, look:{form, hair, build, height, proportions (strings de 1 a 20000 caracteres), gender: male|female|non_binary, aesthetic: casual|sporty|streetstyle|y2k|retro|goth|theatrical|suits}}`. El `id` cumple `/^[a-z][a-z0-9_]{0,63}$/` y es libre: la lista se valida solo en v1, mediante `.refine(e=>e.version===`animals-v3`||g[e.tier].includes(e.id))`.

**[O]** Validaciones cruzadas (`T`, `E`):
- `"Body color is only available for animals"`.
- `"Animal variant must match the character type"`.
- `"Animal trait variants require an animal mode"`.
- `"Attach each image only once"`: la misma imagen no puede estar a la vez en `medias` y en `item_medias`.

**[O]** Antes de enviar, el payload se normaliza con `O(e,{includeSeed})`:
1. Se normaliza `selection` según el tier.
2. Se podan los `trait_variants` a las opciones que siguen seleccionadas (`D`). Excepción: si hay `pr_centaur` sin variante, se descartan todas.

### 1.3 Catálogo de rasgos v2 (OBSERVADO completo, `n2J9VkGXnx2uQPYf`)

**[O]** Tiers (código):
- `D=[normal,freak,total]`.
- `O=[insects,frogs,cats,dogs,capybaras,birds]`.
- Imágenes de la barra lateral: `average.webp` (normal), `bold-v2.webp` (freak) y `extreme.webp` (total).
- **[O-MCP]** "freak" se muestra como "Bold". **[I]** "normal" es "Average" y "total" es "Extreme", según los nombres de archivo.

**[O]** Animales v1 (`A`), con la lista de ids válidos para `animals-v1`:
- insects: `ant mantis grasshopper honeybee bumblebee butterfly moth dragonfly ladybird fluffy_tarantula`
- frogs: `tree_frog bullfrog horned_frog tomato_frog rain_frog`
- cats: `sphynx maine_coon british_shorthair siamese persian`
- dogs: `pug borzoi dachshund poodle corgi`
- capybaras (cabeza "rodent"): `cylindrical barrel slender pear broad_shoulders`
- birds: `goose duck platypus puffin pigeon`

**[O]** Grupos de rasgos. Leyenda: `max` es el número de opciones por grupo; `{ft}` = solo visible en freak y total; `{t}` = solo en total; `@slot` = una sola opción por slot. Sin marca, la opción se ve en normal, freak y total.

| Grupo | Tipo | max | Opciones |
|---|---|---|---|
| gender | media | 1 | female male trans_man trans_woman non_binary |
| ethnicity_origin_base | media | 1 | african east_asian european indian middle_eastern latin_american |
| age | text | 1 | adult mature senior |
| skin_tone | color | 1 | st_porcelain #f1e2d5, st_fair #e8c9b5, st_light #dab49a, st_olive #b6976e, st_tan #bc8e67, st_brown #805135, st_deep #543621, st_ebony #2d211b |
| height | media | 1 | h_average h_tall h_very_tall |
| body_type | media | 1 | body_slim body_athletic body_muscular body_curvy body_heavy body_ultra pr_centaur{t} |
| proportions | media | 2 | pr_longlimbs pr_shortlegs pr_shoulders pr_waist pr_egg{ft} |
| freak_head | media | 1 | head_oval head_long head_tiny{ft} head_forehead{ft} head_ancient{t} head_herojaw{t} head_megachin{t} head_round head_square head_heart |
| freak_neck | media | 1 | neck_normal neck_column{ft} neck_long{ft} neck_short |
| eye_shape | media | 1 | es_almond es_round es_monolid es_close{ft} es_wide{ft} es_uneven{ft} es_large es_huge{ft} es_hooded es_upturned es_downturned |
| eye_color | color | 1 | eye_black eye_brown eye_hazel eye_green eye_blue eye_ice_blue eye_amber eye_grey (cada uno con su swatch) |
| freak_face | media | **4** | fn_freckles@marks fn_dimples@cheeks fn_eyebags@eyes ff_marks_12{ft}@marks fn_cheekbones@cheeks fn_fulllips@lips fn_thickbrows@brows fn_mole@marks ff_nose_0/1/2{ft}@nose fn_tinynose@nose ff_lips_3/4{ft}@lips fn_widemouth@lips ff_brows_5/6/7{ft}@brows ff_ears_8/9{ft}@ears ff_teeth_10/11{ft}@teeth fn_pointychin@chin ff_chin_13{ft}@chin ff_forehead_14{ft}@forehead |
| facial_hair | media | 1 | fh_none fh_stubble fh_beard fh_goatee fh_moustache fh_pencil fh_pushbroom{ft} fh_braid{ft} |
| hair | media | 1 | hs_lampshade{ft} hair_bald hair_buzz hair_bowl hair_mullet hair_braids hair_pigtails hair_afro hair_punk hs_pompadour{ft} hs_beehive{ft} hs_dome{ft} hair_long hair_short hs_horns{ft} hs_softserve{ft} hs_sphere{ft} hs_mouse{ft} hs_wings{ft} hs_hedgehog{ft} hs_tufts{ft} hs_stairs{ft} hs_shelf{ft} hs_corkscrews{ft} hs_sidecoil{ft} hs_mushroom{ft} |
| hair_colour | color | 1 | hc_black hc_darkbrown hc_chestnut hc_ginger hc_red hc_blonde hc_platinum hc_grey hc_white hc_pink hc_lilac hc_blue hc_green (con swatches) |
| distinctive | media | 2 | df_hetero df_facetattoo df_septum df_ears df_slits df_bleached df_nobrows df_grill df_braces df_scar df_gems df_elf df_lashes df_bandage |
| aesthetic | media | 1 | retro sporty y2k theatrical goth suits streetstyle casual |
| accessory | media | 3 | acc_none acc_glasses acc_headphones acc_jewelry acc_hat acc_bag |

Más detalles **[O]**:
- **Previews de opciones:** algunas se sirven desde `cdn.higgsfield.ai/ai_influencer_option/<uuid>.webp` y otras desde `static.higgsfield.ai/ai-influencer/option-previews/2026-10-0x…/<id>.webp`.
- **Etiquetas:** son ids de i18n (por ejemplo `{id:`KmydK6`}`). Los textos no están en los chunks JS. **[D]** Los textos traducidos no se recuperaron.
- **Orden de presentación:** `gender, body_type, hair, hair_colour, aesthetic` van primero. El resto sigue el orden del array (`W=new Map([…].map((e,t)=>[e,t]))`).
- **Tier animal:** solo se muestran los grupos `j=[gender, body_type, height, proportions, facial_hair, distinctive, accessory, hair, hair_colour, aesthetic]`. Se ignora `visibleIn`, así que en esos grupos también aparecen las opciones `{ft}`, y se excluye `pr_centaur`:
  ```
  N(e){return G.filter(t=>!E(e)||j.includes(t.id)).map(t=>({...t,options:t.options.filter(t=>E(e)?t.id!==`pr_centaur`:t.visibleIn.includes(e))}))}
  ```

### 1.4 Reglas de selección y conflicto (`n2J9VkGXnx2uQPYf`)

- **[O] Reglas por slot y por máximo (`Z`):**
  - Si el grupo tiene `max===1`, o la opción es `acc_none`, la nueva opción reemplaza a la anterior.
  - Si no, la nueva opción sustituye a la que comparta su `slot`. Por ejemplo, en `freak_face` solo puede haber una nariz.
  - `acc_none` es exclusiva frente al resto de accesorios.
  - Al llegar a `max`, no se añade la nueva opción.
- **[O] Centauro (`X`):** si `pr_centaur` llega dentro de `proportions`, se mueve a `body_type:[pr_centaur]`.
- **[O] Conflictos (`q`)** que el UI avisa y bloquea (`J` impide marcar la opción):
  - `body_heavy` con `h_tall` o `h_very_tall`.
  - En tiers distintos de `normal`: `body_heavy`, `body_muscular` o `body_ultra` con `pr_shortlegs` o `pr_longlimbs`.

### 1.5 Shuffle / "Surprise me" / `randomize` (`ie`, OBSERVADO)

Esto corresponde a las "UI shuffle rules" que menciona el MCP **[O-MCP]**. Las reglas exactas, observadas en el código:

1. Las selecciones fijadas por el usuario se mantienen (`fixedSelections`). El shuffle solo rellena los grupos vacíos.
2. **Con imagen de identidad (`medias`)**, el shuffle no toca los rasgos de identidad:
   - en tier `normal`: `gender, ethnicity_origin_base, skin_tone, age, eye_color`;
   - en freak y total: `gender, ethnicity_origin_base, age`;
   - en animales: no se salta ningún grupo.
3. `gender`: `male` con probabilidad 0,67 y `female` con 0,33. No sortea las otras identidades.
4. `aesthetic`: `suits` con probabilidad 0,4, `retro` con 0,2 y el resto (sin `suits` ni `retro`) con 0,4.
5. `body_type`: nunca sortea `body_curvy`. Tampoco sortea:
   - `pr_centaur` si ya hay `pr_egg`;
   - `body_heavy` si hay `pr_waist`, `h_tall` o `h_very_tall`;
   - `body_ultra` en tier normal o si hay `neck_long`.
6. `proportions`: no sortea `pr_egg` si hay centauro ni `pr_waist` si hay `body_heavy`.
7. `freak_neck` y `freak_face`: `neck_long` y `ff_teeth_11` se excluyen mutuamente, y `neck_long` también se excluye con `body_ultra`.
8. `facial_hair`: solo se sortea si el género es `male` o `trans_man`. Si no, queda `fh_none`.
9. `hair`: `hs_lampshade` (solo freak y total) sale con probabilidad 0,2. El resto se reparte de forma uniforme.
10. Cada grupo recibe **una** sola opción aleatoria, aunque su `max` sea mayor. Siempre se respeta `J`, es decir, los conflictos.

**[O]** El estado guarda `selections` (lo que el usuario elige) y `shuffledSelections` (el resultado del shuffle) por separado (`9P_7f4EPiH7HoHYL`):
```
N(e,t,n){let r=_(e.selections,t);return{selections:r,shuffledSelections:g(t,{fixedSelections:r,hasReference:n})}}
```

La acción `randomize` del hook (`5yaEMyzL39n26Iep`) vacía `prompt`, `trait_variants`, `animal_variant` y el seed, y recalcula el shuffle:
```
randomize:()=>{y(!0),E(void 0),Pe(void 0),O(void 0),oe(!1),H(e=>Ht(e,_,r&&I.references.length>0))}
```

**[O] Cambio de tier (`$t`):**
- Renormaliza la selección.
- Poda los `traitVariants`.
- Borra `animalVariant` si el tier cambia.
- Conserva `bodyColor` solo en los tiers animales.

### 1.6 Composición del prompt / brief
- **[O]** El cliente **no ensambla ningún prompt** para `ai_influencer_sheet`. Envía `selection` (ids de opciones), `brief` (texto libre del usuario, campo `prompt` en el estado con un interruptor `promptEnabled`) y las variantes.
- **[O]** Existe el MIME `application/x-ai-influencer-prompt-media` para arrastrar medias al brief.
- **[I]** La traducción de ids a texto de prompt, la plantilla de la "character sheet", el modelo base y el uso de las referencias de estilo (`item_medias`) ocurren en el servidor. **[D]** El modelo de imagen concreto que usa el backend.
- **[O] Legacy v1** (`frYRIQS8JnP_LWpA`, job `ai_influencer`): sí había composición en el cliente. `buildConfigForSubmit` genera `{categoryKey:[{value,label,media}|{id,label:"Manual",is_manual:true,value:texto}]}`. Además existen `optionPrompts` (texto por opción), `systemPrompt`, `aspectRatio` (`1:1`), `quality` (`1k`) y un color-picker que reemplaza `value` por el color.

### 1.7 Variantes de apariencia (`appearance-v2`) y animales v1/v3
- **[O]** Ver §1.2.
- **[I]** `choices[optionId]` elige una de entre 5 y 10 variantes visuales precalculadas de cada opción, que el UI muestra como sub-previews (por ejemplo `option-previews/2026-10-06-centaur/centaur.webp` o `…/2026-10-03-suits/suits_black_B_1.webp`).
- **[I]** `animal_choices` (valores 0–4) hace lo mismo para las opciones en modo animal.
- **[I]** `animals-v3.look` es una descripción libre del cuerpo generada o elegida en el UI. **[D]** El catálogo de ids de v3 no está en el cliente: llega en presets o desde el servidor.

### 1.8 Endpoints del builder (backend)

| Acción | Endpoint | Evidencia |
|---|---|---|
| Cotizar | `POST /job-sets/costs` con body `{job_set_type:"ai_influencer_sheet", params:{…,seed}}` y respuesta `{job_set_type, credits, cost}` | **[O]** `5yaEMyzL39n26Iep`: ``r.credits!==r.cost/100)throw Error(`invalid_ai_influencer_sheet_quote`)``. `credits = cost/100` es un invariante. Query key `ai-influencer-sheet-cost`, staleTime 30 s |
| Generar | `POST /jobs/v2/ai_influencer_sheet` con body `{params, use_unlim:false, use_free_gens, client_meta?}` | **[O]** `pn(e,t,n){return{params:rt(e,{includeSeed:!0}),use_unlim:!1,use_free_gens:t,...n&&{client_meta:n}}}` |
| Errores | 402 → `detail.error_type=wallet_insufficient_funds`; 422 → `free_generation_not_available` | **[O]** mismo chunk |
| Free gens | `GET /user/free-gens/v2` → `items[{job_set_type, counter}]`; se lee el contador de `ai_influencer_sheet` | **[O]** `Csuzqb8Cdag7tAbr`: ``items.find(e=>e.job_set_type===`ai_influencer_sheet`)…counter``; el fetch está en `F7gOsiu0LEES1XKb` |
| Presets | `GET cms /ai-influencer-presets?lang=&size=20&cursor=` y `GET /ai-influencer-presets/{uuid}?lang=` (públicos, `credentials:"omit"`) | **[O]** `pijulBIuQan77wN1` |
| Explorar movimiento | `GET cms /ai-influencer/video-explore/v2[/{id}]?lang=&size=20&cursor=` | **[O]** `9FQw9C5A9z0eRW1F` |
| Influencers guardados (legacy) | `GET /ai-influencers?size=30&direction=right&cursor=`, `PUT /ai-influencers/{id}` (renombrar), `POST /ai-influencers/{id}/touch`, `DELETE /ai-influencers/{id}`, `GET /ai-influencers/{id}/trace?size=&ordering=desc&cursor=` | **[O]** `frYRIQS8JnP_LWpA` |
| Config legacy v1 | `GET cms /ai-influencer-config` → `categories[{key,label,is_advanced,subcategories[{key,max_selections,default_option,required_selection,options[{key,label,type,media,is_manual}]}]}]` | **[O]** `LU9jDvLaNlfkXG64` |

**Esquema de un preset [O]:**
```
{share_code?, id:uuid, name, preview:{type:"static",url,thumbnail_url,width,height}, sheet:{…}, priority,
 recreate:{job_set_type:"ai_influencer_sheet", params:{tier,selection,brief,seed,medias:[],trait_variants?,animal_variant?,body_color?}}|null,
 recreate_unavailable_reason:string|null}
```
Lo que el MCP llama "presets con previews" es justo esto. Hacer "Recreate" vuelca `params` en el formulario (`O()` en `9P_7f4EPiH7HoHYL`, con `restored:true`).

**Catálogo legacy v1 [O]**, del fallback embebido en `LU9jDvLaNlfkXG64`. **[I]** Ya no lo usa el builder v2.
- Categorías `core`, `face`, `body` y `style`.
- `character_type`: human ant bee octopus crocodile iguana lizard alien rhinoceros_beetle reptile amphibian elf mantis.
- `skin_color` (máximo 3) y `eye_color` (máximo 2), con estados como `condition_vitiligo` o `condition_albinism`.
- Ojos, boca, orejas, cuernos, `face_skin_material` (scales, fur, metallic…) y `face_surface_pattern` (stripes, chess, giraffe…).
- Brazos y piernas `normal|robotic|prosthetic|mechanical|none`.
- `rendering_style`: `style_hyper_realistic|style_anime|style_cartoon|style_2d_illustration`.
- El randomizer legacy tiene reglas propias, por ejemplo vitiligo con el patrón chess.

### 1.9 Precio y free gens
- **[O]** El precio no está en el cliente: siempre se cotiza contra `/job-sets/costs`.
- **[O]** La recompensa de "quest" es `{code:"r05", title:"AI Influencer, 100 free generations", reward:{kind:"free_gens", model:"ai_influencer", amount:100}}` (chunk de quests `ATllHTP9K9oYQpxB`).
- **[O]** Con free gens, el submit vuelve a consultar el contador con `staleTime:0` antes de enviar `use_free_gens:true`. Si el contador falta, lanza `ai_influencer_sheet_free_gens_unknown`.
- **[O-MCP]** Coincide con `free_gens_remaining` y `max_credits=0` en el MCP.

### 1.10 Compartir
- **[O]** Los enlaces cortos tienen la forma `https://higgsfield.ai/s/{code}`. El cliente acepta como `redirect_path` solo `/genjutsu/shared/{c}`, `/ai-influencer/shared/{c}`, `/katana/shared/{c}` y `/effects/examples/…` (`jCvphhIoPfzXpCEq`: ``r!==`/ai-influencer/shared/${n}`…``).
- **[O]** Payload del enlace: `kind:"ai_influencer_preset"`, `source:"higgsfield"` y `preset_id`.
- **[O]** El modal de recreate pide `GET /ai-influencer-presets/{preset_id}` (query `ai-influencer-shared-preset`, `ZSbF_6qjg4sOxxtR`). Si responde 404, el preset no existe.
- **[I]** Por tanto, lo que se comparte son **presets curados por Higgsfield**. Hay un evento `ai_influencer_share_click`. **[D]** El endpoint que crea un enlace de compartir para el sheet de un usuario no se vio (`/s/` se resuelve en el servidor).

### 1.11 Pasos del UI (OBSERVADO a partir de la analítica y los componentes)
1. **Elegir el tier.** Una tarjeta con cabeza, de Average/Bold/Extreme o de animal.
2. **Elegir los rasgos.** Barra lateral por categorías (`category_expanded/collapsed`), con modo simple o avanzado (`settings_mode_change`, `advanced_settings_toggled`) y color-picker para `body_color` (`color_picker_opened`, `color_applied`).
3. **Referencias.** Una imagen de identidad (`image_uploaded/removed`) y hasta 3 de estilo.
4. **Brief** (opcional).
5. **"Surprise me" o shuffle** (`surprise_me_click`).
6. **Cotización y "Generate"** (`generate_click/success/fail`), con batch de 1 a 4.
7. **Resultado en el feed `AiInfluencerSheet`.** Acciones: rerun, retry, recreate, editar, descargar, borrar, guardar como influencer con nombre (`save_modal_*`, `save_preset_selected`) y "Create new version".
8. **Pestaña Video.** Animar el sheet (§4).
9. **Pestaña Explore.** Presets de imagen y vídeo.

Cada evento es `ai_influencer_<evento>`: `ai_influencer_category_expanded`, `ai_influencer_generate_click`, etc. Hay un estado vacío con cartas de ejemplo (`empty-female`, `empty-european`, `empty-retro`, `empty-freckles`, `empty-bob`).

---

## 2. Funciones de avatar (`/avatar/*`, `/image/avatar/*`)

Árbol de rutas **[O]** (`QhqiFCLt1Ukztv0Y` y `route-chunks.tsv`):

| Ruta real | Chunk → componente | Qué hace |
|---|---|---|
| `/lipsync-studio/avatar/select[/vertical|horizontal/$category]` | `f6QOG…`, `xm7sYykb…` | Elegir un avatar o preset para Lipsync Studio |
| `/flow/avatar/preset` (más `/v2`, `/wan`, `/kling`, `/kling-lipsync`, `/infinite-talk`, `/sync-so`, `/veo`) | `L0jYR…` → `-JgzDX_UpqrxkY-N` | Pestañas por modelo: "Higgsfield Speak 2.0", "Wan 2.5 Speak", "Kling Avatars 2.0", "Infinite Talk", "Sync Lipsync 3", "Kling Lipsync". El botón exige `avatarPresetId` y lleva a `/avatar/prompt` |
| `/flow/avatar/prompt[/audio]` | `zYKMH…`, `LRfHT…` | Formulario: imagen (o vídeo para sync-so), audio o texto, prompt y "enhance" |
| `/flow/avatar/history` | `TJtNM…` | Feed `avatar-feed` |
| `/flow/avatar/$view/$category` | `qSgm0…` | Subida de imagen o vídeo para usar como avatar (`image/*`, `video/mp4…`). Si se sube un vídeo, el modelo pasa a `sync-so` |
| `/flow/image/avatar/$category` | `k-M-ZDY…` | Galería de avatares de stock. La imagen elegida pasa a `inputImages[k]` del formulario `image-flux` y se navega a `/image/prompt/flux` |
| `/edit/avatar/$category` | `-uhHNQ…` | Selector de presets verticales (5 columnas) para elegir la imagen de edición (`x({model,imageId})`) |

API **[O]** (`jCvphhIoPfzXpCEq`):
- `GET /avatars?category=&size=&cursor=` devuelve avatares de stock. Cada uno se mapea a `{id, name, voice_id, input_image, preview, skeleton_id: params.avatar_preset_id}`: una cara, una voz y el preset de movimiento.
- `GET /avatars/{id}`.
- `GET /avatar-presets` y `GET /avatar-presets/{id}` devuelven presets de movimiento o actuación `{id, name, media, quality, chunks_count}`.
- Hay presets "general" embebidos: `hummingbird-general`, `kling-lipsync-general`, `sync-so-general`, etc.
- Categorías **[O]**: `all, car_talk, vlog, forum, stream, podcast, coaching, reporter, selling, beauty, emotions, professions, 3d, travel_vlog`.

Envío de avatares parlantes **[O]**:
- **Higgsfield Speak 2.0:** el modelo `speak-hf-v2` se mapea al tipo `WAN2_2_SPEAK = "image2video_extend_v2"` (``T={[n.WAN2_2_SPEAK]:`speak-hf-v2`,…}``) y se envía a `POST /jobs/image2video-extend-v2 {params}`.
  - Params observados: `{quality, t_cache_threshold, avatar_preset_id, enable_color_aligning, color_matching_strength, prompt, enhance_prompt, width, height, input_audio:{id,type,url}, input_image, use_unlim}`.
  - **Esto corrige `02-generation.md`**, que asociaba Speak 2.0 a `/jobs/hummingbird` como hipótesis.
- **"Hummingbird Lipsync"** es otro modo (`/lipsync-studio?model=hummingbird`) que usa `POST /jobs/hummingbird {params}`.
- **Resto de modelos:** `POST /jobs/kling-speak`, `/jobs/kling-lipsync`, `/jobs/kling2-6-lipsync`, `/jobs/sync-so`, `/jobs/infinite-talk`, `/jobs/wan2-5-speak`, `/jobs/veo3-speak` y `/jobs/veo3-1-speak`. Los payloads son `{params[, client_meta]}`.
- **Opción de texto a voz (veo):** usa `params.audio_prompt` (*"Provide audio text"*).
- **[I]** El `avatar_preset_id` controla el "esqueleto" o la actuación (gestos y encuadre) que el modelo de talking-head aplica a la cara de `input_image`.

---

## 3. Otros productos de personaje

- **AI Host (`/ai-host`, `/ai-host/new`, `/ai-host/channels`, `/ai-host/channel/$channelId`).**
  - **[O]** Cliente en `_7Rhkh4-kqttScvL`, con las rutas `/ai-host/*` sobre el helper base `Lg` de `QhqiFCLt1Ukztv0Y`. **[I]** El servicio es fnf.
  - **[O]** Endpoints:
    - `GET /ai-host/options`
    - `POST|GET /ai-host/channels`, `GET|PATCH /ai-host/channels/{id}?video_size=20&video_offset=`
    - `POST|GET /ai-host/hosts`, `GET /hosts/{id}`, `POST /hosts/{id}/{retry,select,candidates}`
    - `POST|GET /ai-host/locations`, `/locations/{id}/retry`
    - `POST|GET /ai-host/motion-styles`
    - `POST /ai-host/script-suggestions` (con cabecera `Accept-Language`)
    - `POST /ai-host/videos/generate-script`
    - `GET|PATCH /ai-host/videos/{id}`
    - `POST /videos/{id}/{assemble,publish,recreate,regenerate,upscale,upscale/estimate}`
    - `POST /videos/{id}/blocks/{blockId}/regenerate`, `DELETE /videos/{id}/blocks/{blockId}`
    - `POST /videos/{id}/edits[/estimate]`, con la cabecera `Idempotency-Key: ai-host-edit:{quote_id}`
    - `POST /jobs/v2/ai_host_video[/estimate]`
  - **[O]** Los pasos del editor son `{host:0, script:1, generate:2, publish:2}`.
  - **[O]** Hay presets de voz `gold`, `coral` y `cyan`, géneros (`/ai-host/genres/{g}.webp`) y campos `host_id`, `location_id` y `motion_style(_id)`.
  - **[I]** Es un presentador de vídeo con IA: se elige un host (persona generada, con candidatos), una localización y un estilo de movimiento; se genera un guion por bloques; se ensambla y se publica en un "canal".
- **Faceless Studio (`/faceless-studio/{new,channels,channel/$id}` y `/supercomputer/faceless-channel`).**
  - **[O]** Endpoints:
    - `POST /youtube-faceless/channel-identity {channel_subject, genre}` (con `Idempotency-Key`)
    - `POST /youtube-faceless/topic-suggestions {channel_id|channel_subject, script|script_file_id, genre}` (un 503 devuelve `[]`)
    - `/youtube-faceless/channels`, `hot-right-now`, `episodes/{id}/edits` y `upscale`
    - El job `/jobs/v2/youtube_faceless_video`
    - Del CMS: `youtube-faceless-presets`, `-showcases` y `-voices`
  - **[O]** Hay estilos predefinidos de skill (`/supercomputer/faceless-studio/pixel-art-knight`, `watercolor-pocket-watch`, …).
  - Detalle en `01-api-layer.md`.
- **Shorts Studio (`/shorts-studio`, `/flow/shorts-studio`).**
  - **[O]** El chunk `0c-GYP2vf0NwLZZM` importa `lpCUasx9bLXMQMAC`, que contiene la API `/reels/*`:
    - `/reels/generate`, `/reels/presets[/user[/{id}]]`
    - `/reels/sessions[/{id}]`, `/reels/sessions/{id}/stitch`, `/reels/sessions/{id}/segments/{seg}/primary`
    - `/cutups/sessions/{id}/clips/{clip}`
    - El job `/jobs/v2/reels_studio_clip`
  - **[O]** También hay un "shorts-maker" en el marketplace de empleados.
- **Avatares UGC de Marketing Studio.**
  - **[O]** `BBAhrgNDahUTx1u5`:
    - `GET /marketing-studio/avatars?size=20&user_cursor=&preset_cursor=` mezcla avatares del usuario con presets.
    - `POST /marketing-studio/avatars/batch` crea avatares (tipo `custom` por defecto).
    - `PUT|DELETE /marketing-studio/avatars/{id}`.
    - `PUT /marketing-studio/avatars/presets/{id}/pin`.
    - `POST /marketing-studio/avatars/extract` extrae un avatar de un medio.
  - **[O]** `commercial-faces` es una **app de `/workflows`** (`mkLiyNur15isvg7J`): un formulario de un solo campo y una imagen de escena fija (`commercial-faces-scene-images/d47033d3-….png`), además de una landing `/landing/static/commercial-faces.html`.
- **Character sheet (`/character-sheet`, pública).**
  - **[O]** `_piWo_eZxx-XvImX` ofrece dos caminos:
    - **Subir imágenes:** `POST /jobs/v2/character_sheet {params:{medias:[{role:"image",data:{id,type}}]}}`.
    - **Generar el personaje con el cast builder:** `params:{width,height,batch_size:1,preset_id:"",create_reference_element:true,character_params:{genre,budget(250),era,gender,build,height,race,eye_color,hair_style,hair_texture,hair_color,facial_hair,…}}`.
  - **[O]** Exige el consentimiento `POST /user/settings/character-sheets-consent {character_sheets_consent:true}`.
- **Popcorn.**
  - **[O]** Es el nombre comercial de `TEXT2KEYFRAMES` (``[c.TEXT2KEYFRAMES]:`Higgsfield Popcorn` ``).
  - **[O]** Usa `/keyframes/v3/{auto,manual}` y `/keyframe-presets` (storyboard de fotogramas clave a partir de un personaje y una escena: `character_image`, `scene_input_image`).
- **Photodump.**
  - **[O]** Mismo chunk: `POST /keyframes/v3/photo-dump` y `/keyframes/v3/photo-dump-pack {character_input_image, pack_id, aspect_ratio}`.
  - **[O]** Params: `{preset_id, width, height, aspect_ratio, character_input_image, pack_id, checkpoint, photodump_transform:false, quality, sample_solver, seed}`.
  - **[O]** La respuesta trae `job_set_groups[0].job_sets` (un "pack" de fotos del mismo personaje).
  - **[O]** Rutas `/flow/photodump/_template/{template,character,generation}`. Relacionado: `instadump`.

---

## 4. Cómo se encadenan: el pipeline viral

**[O] Animar el sheet dentro del Studio.**
- La pestaña de vídeo carga `InfluencerBuilderVideoForm` (`hj0ZlynpfvaqhBg6`), que reutiliza el formulario Genjutsu `hf-mult-motion-control` con `genjutsuSurface:"ai-influencer"`.
- Incluye cotización, free gens con un límite de 720p/480p y un panel de estilos `CinematicGenjutsuStylePanel`.
- Los jobs resultantes se etiquetan `ai_influencer_motion_control`, `ai_influencer_replace_object` o `ai_influencer_restyle`.
- En el despacho (`wuwAvagOZkfSiBak`) se envían con las mismas mutaciones que `hf_mult_motion_control` y `restyle`:
  ```
  if(e.type!==`hf_mult_motion_control`&&e.type!==`ai_influencer_motion_control`)throw…
  ```
- **[O]** Los presets de movimiento vienen de `/ai-influencer/video-explore/v2`.
  - Cada uno trae `original_video` y variantes (`original|edit|generation`).
  - Cada variante trae `params` (`scene_mode: location|character`, `location_character_media_id`, `resolution`, `width`, `height`) e `input_assets` (`role: image|location`, 30 como máximo, 1 location como máximo).
  - "Recreate" sustituye la imagen del personaje por el sheet del usuario.
- **[O-MCP]** Coincide con "Genjutsu `initial_inputs.character_sheet=[{id:job_id,type:image_job}]`".

**[O] Receta canónica (touring "influencer", `RTgd9uucAEwYxCNJ`).** Es la versión más explícita del pipeline:

| Paso | job_set_type | Ajustes | Plantilla de prompt (OBSERVADA) |
|---|---|---|---|
| 1. Personaje | (picker: Yuna, Leo, Nia, Mara, Andre) | — | — |
| 2. Retrato | `text2image_soul_v2` (Soul 2.0) | 9:16, 2k, batch 4, `color_transfer` | `Portrait of {character}, natural skin texture, direct eye contact, consistent identity anchor frame.` |
| 3. Character sheet | `seedream_v5_pro` (Seedream 5.0 Pro) | 16:9, 2k, batch 2, entrada: retrato | `Character sheet of {character}: full body, three-quarter and close-up panels, identical identity across panels.` |
| 4. Formato | UGC / Vlog / Podcast | — | — |
| 5. Vídeo | `seedance_2_5` | 9:16, 1080p, 10 s, entrada: `character_sheet` | `Ten-second {format} starring {character}, natural direct-to-camera delivery, handheld energy, lip-synced speech.` |

El escenario "commercial" usa la misma idea con un product sheet: el actor, más `character_sheet` y `set`, alimenta `seedance_2_5` de 13 s.

**Pipeline completo** (la parte **[I]** es el encadenado de productos; cada pieza está **[O]**):
1. Crear la identidad con el AI Influencer builder (rasgos más brief) o con Soul/Cast. Opcionalmente, guardarla como influencer o elemento de referencia.
2. Generar el character sheet (`ai_influencer_sheet` o `character_sheet`): un ancla de identidad con varias vistas.
3. Producir el contenido de una de estas formas:
   - Genjutsu: motion control o replace object sobre vídeos virales de referencia.
   - Talking avatar: Speak 2.0, Kling Avatars o InfiniteTalk, con audio o TTS.
   - Popcorn o Photodump: series de fotos o keyframes del mismo personaje.
   - AI Host o Faceless: episodios.
4. Compartir:
   - `/s/{code}`: presets de Genjutsu, Influencer o Katana;
   - publicación en la comunidad (`/jobs/{id}/publish`, ver `04-agents-mcp-canvas.md`);
   - "publish" de AI Host al canal.

---

## 5. Cómo recrearlo (Next.js + fal.ai)

### 5.1 Modelo de datos
Se propone `src/generation/influencer/` reutilizando `ModelEntry` y `GenerationPlane` (`src/generation/catalog/types.ts`).

```ts
type Tier = "normal"|"freak"|"total"|"insects"|"frogs"|"cats"|"dogs"|"capybaras"|"birds";
type TraitOption = { id: string; label: string; visibleIn: Tier[]; slot?: string; swatch?: string;
                     preview?: string; promptFragment: string;          // ← lo que Higgsfield hace en servidor
                     variants?: { id: "v1"|"v2"|…; promptFragment: string; preview?: string }[] };
type TraitGroup  = { id: string; kind: "media"|"text"|"color"; max: number; options: TraitOption[] };
type InfluencerParams = { tier: Tier; selection: Record<string,string[]>; brief?: string; seed?: number;
  batchSize: 1|2|3|4; identityRef?: string; styleRefs?: string[]; bodyColor?: string;
  traitVariants?: { version:"appearance-v2"; choices: Record<string,string> };
  animalVariant?: { version:"animals-v1"|"animals-v3"; tier: Tier; id: string; look?: {...} } };
type InfluencerPreset = { id; name; preview; sheet; params: InfluencerParams; shareCode? };
```

Recomendaciones:
- Copiar la **estructura** del catálogo de §1.3 (ids, `max`, `visibleIn`, slots y conflictos), escribiendo los `promptFragment` propios. Los textos de Higgsfield no son públicos.
- Portar tal cual a un módulo puro y testeable las reglas de §1.4 (normalizar, slots, conflictos) y de §1.5 (shuffle con probabilidades), con un `random` inyectable para que el seed sea reproducible.
- Validar con zod usando los mismos límites (§1.2).
- Guardar el borrador en `sessionStorage` (como `hf:ai-influencer-builder-form:v1`) o en el store de zustand que ya existe.
- Persistir presets e influencers guardados en una base de datos. Para un MVP basta con Vercel Blob y JSON.

### 5.2 Ensamblado del prompt (lado servidor, server action)
1. Una frase base por tier: realista (normal), "bold stylized features" (freak) o "extreme caricature" (total). En tiers animales, "anthropomorphic {animal} character", con el color de cuerpo si lo hay.
2. Los fragmentos de rasgos, en el orden de presentación de §1.3: gender, body_type, hair, hair_colour, aesthetic y después el resto. Las variantes sustituyen al fragmento de su opción.
3. El `brief` del usuario, entre delimitadores y con prioridad sobre los rasgos que contradiga.
4. Plantilla de **character sheet**: tomar las del touring de §4 como punto de partida. Por ejemplo: "character turnaround sheet: full body front, three-quarter, side, back and close-up portrait panels, identical identity, neutral studio background, consistent outfit".
5. Si hay `identityRef`, usar un modelo de **edición o referencia** e instrucción de mantener la cara. Los `styleRefs` se pasan como imágenes adicionales con el rol "style only, do not copy identity".

### 5.3 Modelos de fal que encajan (ids reales del catálogo público, consultado el 2026-10-15)

| Paso | Endpoints de fal |
|---|---|
| Retrato o sheet desde texto | `fal-ai/nano-banana-pro`, `fal-ai/nano-banana-2`, `bytedance/seedream/v5/pro/text-to-image` (equivalente al `seedream_v5_pro` del touring), `fal-ai/flux-2/klein/9b`, `alibaba/qwen-image-3` |
| Sheet con imagen de identidad o de estilo | `fal-ai/nano-banana-pro/edit`, `fal-ai/nano-banana-2/edit`, `bytedance/seedream/v5/pro/edit`, `fal-ai/flux-pro/kontext/max/multi`, `alibaba/qwen-image-3/edit`, `fal-ai/qwen-image-edit-2511-multiple-angles` (ángulos), `fal-ai/qwen-image-edit-2509-lora-gallery/face-to-full-portrait`, `fal-ai/ideogram/character`, `fal-ai/instant-character`, `fal-ai/flux-pulid` |
| Animar con movimiento (≈ Genjutsu motion control) | `fal-ai/kling-video/v3/pro/motion-control`, `fal-ai/kling-video/v2.6/pro/motion-control`, `fal-ai/wan/v2.2-14b/animate/move`, `fal-ai/wan/v2.2-14b/animate/replace` (≈ replace object/character) |
| Vídeo desde el sheet (≈ touring) | `bytedance/seedance-2.5/reference-to-video`, `bytedance/seedance-2.5/image-to-video` (ya están en `catalog/seedance-2.5.ts`) |
| Avatar parlante | `fal-ai/kling-video/ai-avatar/v2/pro` (≈ Kling Avatars 2.0), `fal-ai/infinitalk` (≈ Infinite Talk), `fal-ai/bytedance/omnihuman/v1.5`, `fal-ai/wan/v2.2-14b/speech-to-video` (≈ Wan Speak), `fal-ai/sync-lipsync/v3` y `fal-ai/sync-lipsync/v3/image-to-video` (≈ Sync Lipsync 3), `fal-ai/kling-video/lipsync/audio-to-video`, `fal-ai/hunyuan-avatar` |

Ruta recomendada para el MVP:
1. Sheet con `nano-banana-pro/edit` si hay referencia, o con `seedream v5 pro`, en batch de 1 a 4 con `seed`.
2. Animación con `kling v3 motion-control`.
3. Habla con `kling ai-avatar v2` o `infinitalk`.

Las entradas se añaden como `ModelEntry` con `endpoints.edit`, `endpoints.motion` y `endpoints.reference`. El esquema ya lo admite. Se recomienda ejecutar `pnpm fal:schemas` para capturar los esquemas.

### 5.4 Precio, free gens y compartir
- **Cotización:** usar una función local que replique el contrato `credits = cost/100` (por ejemplo, el coste por imagen del endpoint de fal × batch, más un margen).
- **Free gens:** un contador por usuario y tipo de job (`{job_set_type, counter}`).
- **Compartir:** `/s/{code}` → `/ai-influencer/shared/{code}` resuelve a un preset con `recreate.params`. El patrón se puede copiar tal cual.

### 5.5 Lo que queda en el servidor de Higgsfield (DESCONOCIDO)
- Los textos de prompt por opción y por variante, y la plantilla del sheet.
- El modelo exacto detrás de `ai_influencer_sheet`. **[I]** Probablemente sea de la familia Soul, Seedream o Nano Banana, por el touring.
- Cómo se usan las `item_medias` de estilo.
- El catálogo `animals-v3` (ids y "looks").
- La tabla de precios.
- La lógica de `/ai-influencers/{id}/trace`.
- La creación de enlaces `/s/` para contenido de usuario.
- Los modelos internos de Hummingbird y de `image2video_extend_v2`. **[I]** El segundo sería Wan 2.2, por el nombre del enum.
