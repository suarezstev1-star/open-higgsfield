# 06 · Soul ID: el modelo de identidad personal de Higgsfield

Fecha: 2026-10-15. Análisis **estático** de los chunks `868a8dba-*.js` del frontend público (TanStack Start + Vite, sin source maps). No se hizo ninguna petición a higgsfield.ai ni a sus APIs. La única consulta de red fue al catálogo público de fal (`api.fal.ai/v1/models`) para la sección 5.

Convenciones:
- **[O] OBSERVADO**: cita el chunk (sin el prefijo `868a8dba-`) y un fragmento corto.
- **[I] INFERIDO**: deducción razonable a partir de lo observado.
- **[D] DESCONOCIDO**: no se puede saber desde el cliente.

Los textos de la interfaz usan Lingui con ids de mensaje (`{id:'xR3vW3'}`). El catálogo de traducciones no está en los chunks descargados, así que **el texto exacto de cada mensaje es [D]**. Se citan los ids y las variables que reciben.

Contexto previo: `01-api-layer.md` (catálogo de endpoints, bus SSE), `02-generation.md` (fila `/character`, campos de Soul en el payload) y `data/endpoints-uniq.tsv`.

---

## 0. Resumen

- Un **Soul** (en el código, "custom reference" o "character") es un **modelo de identidad entrenado en el servidor** a partir de las fotos del usuario. Se crea con `POST /custom-references{,/soul-v2,/soul-v2-preset,/soul-cinematic}` `{name, input_images, training_args}` [O].
- En **producción, `training_args` se envía como `null`**, así que los hiperparámetros los decide el servidor. Los valores por defecto de 3 etapas que trae el cliente solo se envían fuera de producción [O].
- **Fotos**: máximo 80, de hasta 20 MB cada una, en jpeg/png/webp/heic. Pasan un control NSFW e IP obligatorio en el servidor. El cliente puntúa la cantidad y la resolución (mediana del lado corto) [O]. La detección de cara es del servidor (`fail_reason: 'face_not_found'`) [O].
- **Estados**: `queued → in_progress → completed | showcase_completed | failed`. El cliente consulta cada 10 s y estima el progreso suponiendo unos 5 min [O]. **No hay evento SSE** específico de Soul [O, por ausencia].
- **Coste fijo de entrenamiento** en el cliente: Soul 1.0 = 30 créditos; Soul 2.0, Soul 2.0 Preset y Soul Cinema = 25. Es gratis si el plan incluye la función `soul` [O].
- **Uso**: el Soul se inyecta en los trabajos de imagen Soul (`text2image_soul_v2`, `soul_cinematic`, `soul_cinema_1_5`, Soul v1, Cinema Studio) como `custom_reference_id` + `custom_reference_strength` (por defecto 1) [O]. Los modelos de terceros no lo aceptan.
- Los **Reference Elements** son otra cosa: referencias por imagen **sin entrenamiento**, que se citan en el prompt con `<<<uuid>>>` y valen para Nano Banana, GPT Image, Seedream, Cinema Studio, Seedance y Kling [O].

---

## 1. Flujo de interfaz

### 1.1 Rutas

Fuente: `data/route-chunks.tsv`. Los chunks de ruta de 130 bytes solo reexportan otro chunk; se muestra el destino.

| Ruta | Chunk de la ruta → implementación | Función |
|---|---|---|
| `/character` (layout) | `3OZc5-RlTaNeIl8j` → `ObauVWNcRBbA9aSy` | Shell: oculta el footer y la cabecera en móvil [O] |
| `/character/` | `SfR9rrKi8QiQ3zKX` → `22L6EYLwFmiu5qoK` → `Oc_Ac0yGKGexsr1i` | Galería de Souls del usuario [O] |
| `/character/upload/` | `uQtDT47hudfXmOTm` → `1pO3Oz2JJoXH47uS` → `xW8jRuSTayjupfVH` | Formulario de entrenamiento (versión nueva) [O] |
| `/character/upload/$characterId` | `Q_TJtcTRiXPql-UA` → `SlnR0jRKb0ZEj4oL` | Editar, relanzar o reentrenar. Carga `GET /custom-references/details/{id}` y, si falla, redirige a `/character/upload` [O] |
| `/character/kion` | `5l_12l3V7b_65KWM` → `56Ya4wr7IOMTQ15R` | Variante o campaña [D] |
| `/character-sheet` (público) | `26op57OcFIZyyb8D` → `_piWo_eZxx-XvImX` | Character sheet (§4.3) |
| `/flow/image/character`, `/flow/photodump/_template/character`, `/flow/fashion/_template/character` | `BMfeZXlfBywDubGe`, `Zzng9DUJZZJ3CwpW`, `Ho6DBN1WoOH__Jdu` | Paso "elige o crea personaje" dentro de flujos [O] |
| `/soul/`, `/soul/$styleId`, `/soul/job/$jobId` | `XtC5coOJkRvyEvZ8`, `JXSuZcs7GYHss0et`, `qEtpaRa5_z-RxYhb` | Exploración pública de estilos Soul y de trabajos (SEO, `canonicalPath:'/soul/job/${t}'` en `jCvphhIoPfzXpCEq`) [O] |
| `/soul-community`, `/soul-cinema-community` | `x2H94EZSo7oVrh48` → `GOPUzQX3o_lLLARW`, `NQFxacId__cx-VWY` | Feed de la comunidad por modelo [O] |

Hay **tres** formularios de creación con reglas algo distintas [O]:

| Formulario | Chunk | Contexto |
|---|---|---|
| A | `xW8jRuSTayjupfVH` | Página `/character/upload` (la actual) |
| B | `nKVnle1BZmct5Sbj` | Modal o formulario `create_character_form` (`entryPoint:'create_character_form'`) |
| C | `EwVY534CRjcyFJm-` | Panel lateral "character-panel" dentro de los estudios (`queryKey:['character-panel']`) |

### 1.2 Pasos al crear un Soul

1. **Elegir la versión** (selector "model"):
   - Lista en A [O]: `zt=[{id:'soul-v2',name:'Soul 2.0'},{id:'soul-v2-preset',name:'Soul 2.0 Preset'},{id:'soul-v1',name:'Soul'},{id:'soul-cinematic',name:'Soul Cinema'}]`. `soul-v2-preset` se filtra en algunos contextos (`Bt=['soul-v2-preset']`).
   - Lista en B [O]: `{id:'soul-cinematic',name:'Higgsfield Soul Cinema'}, soul-v2, soul-v1`.
   - Por defecto es `soul-v2`, o `soul-cinematic` si llega `?targetType=soul_cinematic` (B). En A se puede preseleccionar con `?model=` [O].
   - **Restricción por plan** [O]: `D=b.hasAccess?pe:'soul-v1'` con `st({feature:'soul-v2'})`. Sin acceso a la función `soul-v2`, el formulario siempre entrena **Soul v1**.
2. **Consentimiento biométrico**: hook `Ke({entryPoint:'create_character_form'})` del chunk `nQlv46fhE3Ur53IW`. Ese chunk contiene el experimento `biometric-consent-new` (variantes `control`/`new`) y registra el consentimiento `biometric` [O]. El envío del consentimiento al servidor va por `/user/consents/accept` [I] (ver `03-auth-billing.md`).
3. **Subir las fotos** con el uploader genérico `Ne({...})` (chunk `MfOmEAPGfx4zGc6f`). Configuración en B [O]: `id:'create-character-images', type:'image', policy:$, forceNsfwCheck:!0, maxCount:Q`, con `Q=80` y `$=new we({maxSize:20*1024*1024,contentTypes:_})`. En C los tipos aceptados son `mi='image/jpeg,image/jpg,image/png,image/webp,image/heic'` [O].
4. **Nombre automático**: con la primera foto subida y el nombre vacío, B llama a `POST /custom-references/name {image_url}` y recibe `{name}` (`uY` en `jCvphhIoPfzXpCEq`) [O]. El nombre se puede editar.
5. **Indicadores de calidad** (contador y medidor), ver §1.3.
6. **Enviar**: `{settings:[etapa1,etapa2,etapa3], images, name, trainFor:'soul-id', soulVersion}` va a la mutación que llama a `lY` (§2.1). Antes pasa `tryPass()` de `Ie('characterGen')` (control de créditos o plan) salvo que `ke(g,'soul')` sea verdadero (plan con Soul incluido) [O].
7. **Al terminar**: invalida `characters()` y navega a `/character` (A: `m.push('/character')`) [O].

Validaciones del envío [O]:
- Nombre vacío: muestra un error inline.
- Nombre de más de 100 caracteres: `lcrqGJ`.
- 0 imágenes: `PKYwki`, con nivel warning.
- Más de 80 imágenes: `Ncw8SZ {MAX_COUNT_IMAGES_TO_TRAIN}` en B, o `RFaBri {maxImages}` en A.
- Error genérico del entrenamiento: `29VNqC`.
- En A, el botón se desactiva si `c.length===0`, si alguna foto es NSFW (`B=c.some(e=>e.nsfw)`) o si hay más de `J` imágenes.
- En C [O]: `gi(name,count,hasNsfw)` devuelve `39Gzx1` si hay NSFW, `xR3vW3 {MIN_IMAGES:5}` si hay menos de `bi=5` fotos e `IYKPgd` si falta el nombre. Es decir, **el panel C exige un mínimo de 5 fotos**.

### 1.3 Requisitos de las fotos (control en el cliente)

| Regla | Formulario A (`xW8jRu…`) | Formulario B (`nKVnle…`) |
|---|---|---|
| Máximo de fotos | `J=80` | `Q=80` |
| Nivel por cantidad | `Ot(e,t=J)`: más de 80 = `bad`; 50 o más = `perfect` (`Ft=50`); 25 o más = `good` (`Pt=25`); menos = `bad` | `Tt`: más del máximo = bad; 20 o más = perfect; 10 o más = good; menos = bad |
| Nivel por calidad | Mediana del lado corto (`Math.min(width,height)`): menos de 640 = bad (`Mt=640`); menos de 840 = good (`Nt=840`); el resto = perfect. Medidor de 256 a 1080 px (`q=256`, `jt=1080`) | Misma mediana: menos de 480 = bad (`kt=480`); menos de 960 = good (`At=960`); el resto = perfect |
| Mínimo bloqueante | Más de 0 | Más de 0 (el panel C exige 5) |

Los ids de las etiquetas en B son `JLoY07` (perfect), `S6FCN4` (good), `mcmP6y` (bad) y `Bkr7bL` (exceso) [O]. Los textos son [D].

**Control NSFW e IP** [O]:
- Cada subida se confirma con `POST /media/{id}/upload {filename, force_nsfw_check:!0, force_ip_check, surface}`.
- Un HTTP 422 con `detail.error_type==='nsfw'|'ip_detected'` marca la foto. La foto marcada se muestra difuminada y bloquea el envío.
- Fuente: el chunk del uploader (`me(e,t,n,o=!0){…S.post('/media/${e}/upload',{…force_nsfw_check:!0,force_ip_check:r(o),surface:n})…}`).

**Detección de cara**:
- No hay detección de cara en el cliente para Soul [O, por ausencia]. MediaPipe (`ri7nLNCZdmVPhQyC`) se carga solo en otras funciones: `FaceLandmarker` para un efecto `face-cut` (`k9Pi1m9Mz7-9lsLc`), `ObjectDetector` e `InteractiveSegmenter`.
- La cara se valida en el servidor: la tarjeta muestra `failed` con `fail_reason==='face_not_found'` (chunk `i_NozbAUgTHITAE8`: `e.status==='failed'&&e.fail_reason==='face_not_found'?'face_not_found':…`) [O].
- Otros motivos de fallo: [D].

### 1.4 Photo Dump: entrenar y generar un pack

El modal `modal-photo-dump` o la ruta `…/photodump` (chunk `Sahz7QXPSwBhNUKZ`) tiene los pasos `select-preset → create-character → review-character` (labels `BiokTh`, `CZD8n3`) [O]. Hay dos caminos:

- **Personaje nuevo**: `POST /custom-references/photo-dump {name, input_images, pack_id?, version:'v2'}` (`sY`). Entrena el Soul y lanza el pack. La respuesta trae `job_sets` [O].
- **Personaje existente** (chunk `_ZUln1k8CGMUWsk6`):
  - Si es Soul 2: `POST /jobs/text2image-soul/batch {params:{custom_reference_id, pack_id}, version:'v2'}`.
  - Si está **desactualizado** (`isOutdated`, es decir, sin el tipo `soul_2`): `POST /custom-references/retrain-with-photo-dump {custom_reference_id, pack_id}`, que reentrena y genera.
  - Al terminar redirige a `/gallery/image` o al estudio con `modelVersion:'soul-v2'` [O].
- El selector separa los personajes con `types.includes('soul_2')` de los demás [O].

### 1.5 Gestión: galería, reentrenar, borrar, renombrar, compartir, mover

La tarjeta (`cI2yq9c4BS-4TPOR`) y la página (`Oc_Ac0yGKGexsr1i`) ofrecen estas acciones [O]:

| Acción | Cómo funciona |
|---|---|
| **Generate** | Solo con `completed` o `showcase_completed`. Lleva al estudio de imagen con el personaje fijado. En móvil usa otra ruta |
| **Rerun** ("reuse") | `/character/upload/{id}` con las mismas fotos (`initialInputImages:c.media_inputs`) |
| **Retrain** | `/character/upload/{id}?retrain=true`. Solo aparece si el Soul está completado, el usuario tiene acceso a `soul-v2` y el Soul **no** tiene los tipos `soul_2` ni `soul_cinematic` (`onRetrain:!I.types.includes('soul_2')&&!I.types.includes('soul_cinematic')&&z&&P.hasAccess`). Es decir, sirve para **subir un Soul v1 a Soul 2**. Envía `POST /custom-references/retrain {custom_reference_id, input_images, version:'v2'}` |
| **Free retrain a Soul Cinema** | Si el servidor marca `free_retrain_available`, ofrece `cY(id, images, 'soul_cinematic')`, es decir, `POST /custom-references/retrain {custom_reference_id, input_images, target_type:'soul_cinematic'}`. Eventos `character_free_retrain_click/success` |
| **Delete** | `DELETE /custom-references/{id}` (`pY`). Desactivado mientras el entrenamiento está activo (`onDelete:B?void 0:H`, con `B=U(status)`) |
| **Rename** | `PUT /custom-references/{id} {name}` (`we` en `E41zLnJAMSNQAjt-`) |
| **Share** | `PUT /custom-references/{id} {is_shared:bool}` (`bY`), alterna `is_shared` |
| **Move** a otro workspace | `POST /custom-references/{id}/move {workspace_id}` (`xY`) |
| **Edit cover** | Cambia la miniatura. Solo con acceso a `soul-v2` (`onEditCover:z&&P.hasAccess`) |

Las etiquetas de tipo de la tarjeta (`xe` en `cI2y…`) son [O]: `soul` ("SouL"), `soul_2` ("Soul 2.0"), `soul_cinematic` y `soul_v2_preset`.

---

## 2. API

Todas las rutas van al servicio `fnf` (`https://fnf.higgsfield.ai`, ver `01-api-layer.md`) con `Authorization: Bearer` de Clerk.

### 2.1 Endpoints de custom references

| Método y ruta | Cuerpo y respuesta | Fuente |
|---|---|---|
| `POST /custom-references` (Soul v1) | `{name, input_images, training_args}` | `jCvphhIoPfzXpCEq` `CY['soul-v1']` [O] |
| `POST /custom-references/soul-v2` | Igual | `CY['soul-v2']` [O] |
| `POST /custom-references/soul-v2-preset` | Igual desde el formulario. Desde el moodboard: `{name, input_images:[{id,type}]}`. Responde con un preset `{id,name,media,medias,category,status,in_progress_at,is_custom,is_owner,owner…}` | `CY`, `E41zLnJAMSNQAjt-` [O] |
| `POST /custom-references/soul-cinematic` | Igual | `CY['soul-cinematic']` [O] |
| `POST /custom-references/photo-dump` | `{name, input_images, pack_id?, version:'v2'}` → `{job_sets…}` | `sY` [O] |
| `POST /custom-references/retrain` | `{custom_reference_id, input_images, target_type?}` o, sin `target_type`, `{…, version:'v2'}` | `cY` [O] |
| `POST /custom-references/retrain-with-photo-dump` | `{custom_reference_id, pack_id}` | `_ZUln1k8CGMUWsk6` [O] |
| `POST /custom-references/name` | `{image_url}` → `{name}` | `uY` [O] |
| `GET /custom-references/details/{id}` | `{name, media_inputs[], …}` | `dY`, `SlnR0j…` [O] |
| `GET /custom-references/{id}` | El personaje: polling de la tarjeta y mapeo a picker con `SY` | `hY`, `vY`, `_Y` [O] |
| `GET /custom-references?status=completed` | Lista plana para los pickers | `gY` [O] |
| `GET /custom-references/v2?search=&type=&cursor=&size=` | `{items, has_more, cursor}` | `mY` [O] |
| `PUT /custom-references/{id}` | `{name}` o `{is_shared}` (y otros campos que pasa `fY`) | `fY`, `bY` [O] |
| `DELETE /custom-references/{id}` | Sin cuerpo | `pY` [O] |
| `POST /custom-references/{id}/move` | `{workspace_id}` | `xY` [O] |
| `GET /soul-samples` | Muestras públicas, paginadas (`Nk`) | [O] |

Envío del entrenamiento (`lY`, cita corta) [O]:

```js
let n=Ot?null:e.settings.map(e=>({learning_rate:e.learningRate,face_loss_weight:e.faceLossWeight,
 warmup_steps:e.warmupSteps,total_steps:e.totalSteps,target_area:e.targetArea**2})),
 r=CY[e.soulVersion ?? 'soul-v1']; return (await na.post(r,{name:e.name,input_images:e.images,training_args:n})).data
```

- `Ot` resuelve a `ud=cd==='production'` (chunk `QhqiFCLt1Ukztv0Y`: `cd=(id='production')…,ud=cd==='production'`) [O]. Por eso **en producción `training_args` es `null`**.
- `target_area` se envía **al cuadrado**: es un área en píxeles, p. ej. 256² = 65 536 [O].
- `input_images` son objetos `{id, url, type:'media_input'}` (`onSerialize: rt.images=e.map(e=>({id:e,url:'',type:'media_input'}))`) [O].

### 2.2 `training_args` por defecto (fuera de producción)

Chunk `eTpSqFlsPwQ6G00t`. Hay tres etapas con tamaño creciente, LR decreciente y peso de la pérdida de cara creciente [O]:

| Etapa | total_steps | learning_rate | warmup_steps | face_loss_weight | target_area (lado → área) |
|---|---|---|---|---|---|
| 1 (`s`) | 100 | 6e-4 | 10 | 0.3 | 256 → 65 536 |
| 2 (`c`) | 100 | 3e-4 | 10 | 0.5 | 512 → 262 144 |
| 3 (`l`) | 100 | 1e-4 | 10 | 0.7 | 1024 → 1 048 576 |

El mismo chunk normaliza el formulario: `trainFor` vale `'soul-id'` por defecto y hacen falta exactamente 3 etapas (`throw Error('Incorrect Stage Index')`) [O].

Lectura [I]: es un entrenamiento progresivo de resolución (curriculum) de tipo LoRA o *fine-tune*, con una pérdida de identidad facial (`face_loss_weight`) además de la de difusión. El objetivo es fijar primero la forma general a baja resolución y después el detalle de la cara a alta. El tipo de adaptador (LoRA o fine-tune completo), el modelo base y la función de pérdida exacta son [D].

### 2.3 Ciclo de vida y estados

- **Enum del entrenamiento** [O] (`eTpSqFlsPwQ6G00t`):

  ```js
  function n(e){switch(e){case'in_progress':…case'queued':…case'failed':…case'completed':case'showcase_completed':return'completed'}}
  function t(e){return e==='in_progress'||e==='queued'}
  ```

- **`showcase_completed`** es [I] un Soul de ejemplo o de escaparate, que la UI trata como completado.
- El preset de moodboard usa además `not_ready` como estado inicial (`status:e.status||'not_ready'`) [O].
- Campos del objeto personaje vistos en el cliente [O]: `id, name, status, fail_reason, in_progress_at, thumbnail_url, total_images, images, media_inputs, types[], is_shared, free_retrain_available, user{id…}, workspace{id,name,avatar_url}`.
- **Polling** [O]: la tarjeta hace `refetchInterval: U(status) ? s(e,1e4) : false`, es decir, cada **10 s** mientras el estado sea `queued` o `in_progress`. La lista de presets de moodboard consulta cada 6 s.
- **Progreso y ETA** [O] (`i_NozbAUgTHITAE8` + `yDbrDzEKKDyrO8-3`):
  - Es **una estimación del cliente**: `pct = clamp(floor((now - in_progress_at*1000)/T*100), 1, 99)`.
  - `T` vale 300 000 ms en los dos casos, con `total_images>=10` o sin él (`t=300*1e3,n=300*1e3`). La UI supone unos **5 minutos**.
  - El servidor no envía progreso real [I].
- **Notificaciones**:
  - No hay ningún evento SSE `custom_reference:*` ni `character:*` en el bus de notificaciones [O, por ausencia en la lista de `01-api-layer.md` y en la búsqueda de literales].
  - Lo que existe es `reference_element:{created,updated,…}` para Elements.
  - El fin del entrenamiento se detecta solo por polling [I]. Notificaciones por email o push: [D].
- **Fallos de creación** [O]: `error_type:'not_enough_credits'` abre el upsell (en workspaces compartidos, el aviso de plan del workspace). Cualquier otro error muestra `NgMkTi` ("Cannot start character training" en el log de Sentry).

### 2.4 Coste y planes

- **Precio de entrenamiento** en el cliente [O] (`yDbrDzEKKDyrO8-3`): `r={"soul-v1":30,"soul-v2":25,"soul-v2-preset":25,"soul-cinematic":25}`.
- El formulario B pinta lo mismo: `ke(g,'soul')?<vacío>:L==='soul-v2'?25:30` [O].
- Si el plan incluye la función `soul` (`ke(g,'soul')`), no se muestra coste y se salta `tryPass()` [O]. Se interpreta como **entrenamiento incluido en el plan** [I].
- **Funciones de plan** [O]: `soul-v2` (Soul 2.0, Cinema, Preset, Retrain, Edit cover) y `soul` (entrenamiento sin coste). Ambas aparecen como flags locales en `03-auth-billing.md` (`"soul-v2":!0`).
- **Free retrain** a Soul Cinema: el servidor lo concede con `free_retrain_available` [O].
- La **generación** con Soul tiene precio aparte, ver §3.2.

---

## 3. Versiones de Soul y cómo se usan al generar

### 3.1 Versiones

| Versión de entrenamiento | `types[]` del personaje | Trabajo de generación | Notas |
|---|---|---|---|
| `soul-v1` | `soul` | `text2image_soul` (legacy `/jobs/text2image-soul`, `/batch`), `/jobs/canvas-soul` | Ajustes avanzados `sampleGuideScale`, `sampleShift`, `use_apg`, `apg_eta` (`02-generation.md`). Se puede reentrenar a v2 |
| `soul-v2` | `soul_2` | `text2image_soul_v2` → `model:'soul_v2'` | Aspecto por defecto 3:4, 1080p, lote de 1 a 4 |
| `soul-cinematic` | `soul_cinematic` | `soul_cinematic` y `soul_cinema_1_5` | Aspecto por defecto 16:9. Variantes internas `use_olzhas`, `use_sultan`, `use_aidar` (ocultas en prod) y `time_denoise_from` (0.83 por imagen) [O] |
| `soul-v2-preset` | `soul_v2_preset` | Preset o estilo de Soul 2.0 ("moodboard preset") | **Estilo** entrenado, no identidad (§3.4) |

Otros trabajos con "soul" en el nombre [O] (`jCvphhIoPfzXpCEq`): `soul_cast`, `soul_cast_edit`, `soul_location`, `soul_location_edit`, `soul_cinema_studio`, `cinematic_studio_soul_cast`, `cinematic_studio_soul_location`, `bd_studio_soul_*`.
- Son generadores de **elenco** y **localizaciones** de Cinema Studio (`/jobs/v2/soul_location`).
- [I] No entrenan identidad; usan el modelo base Soul para crear personajes o escenarios nuevos.

### 3.2 Cómo se inyecta el Soul en el payload

Constructor común (`Ys` en `0in2_64TsrVPbiW-`) [O]:

```js
{style_id, style_strength, ...(customReferenceId?{custom_reference_id}:{}), custom_reference_strength,
 fashion_factory_id?, quality, aspect_ratio, seed, batch_size, use_unlim, use_free_gens, use_refiner,
 use_green, lora, chain_enhancer, color_preset_id?, model_version, …}
```

- Esquema de ajustes (`qs`) [O]:
  - `customReferenceStrength` por defecto 1; `styleStrength` por defecto 1.
  - `quality` `720p|1080p` (por defecto 1080p); `modelVersion` `fast|general` (por defecto `fast`).
  - `batchSize` de 1 a 4; `seed` de 1 a 1e6.
- Tabla de resolución a 1080p [O]: 9:16 = 1152×2048; 3:4 = 1536×2048; 1:1 = 2048×2048; 16:9 = 2048×1152; 21:9 = 2528×1088.
- **Créditos de generación** [O]: `text2image_soul_v2`, `soul_cinematic` y `soul_cinema_1_5` cuestan `batchSize*0.125` (fallback del cliente; el precio real lo da `/job-sets/costs`).
- Imagen de entrada opcional: como máximo 1, con lado mínimo de 128 px.
- Si existe `custom_reference_id` y falta la fuerza, se fija a 1 (`…typeof n.custom_reference_strength!=='number'&&(n.custom_reference_strength=1)`) [O].
- **Cinema Studio** (`-ZzbbHazR_P9F8lw`) [O]: `model:'soul_cinematic', … custom_reference_id:N.characterStyleId, custom_reference_strength, camera_model_id, camera_lens_id`. Es decir, el Soul es el "character style" del proyecto.
- **Flujos de plantilla** (photodump/fashion, `EVY67AZs1UYm_4Mk`, `VhvWOJm5lnrxSsdR`) [O]: `custom_reference_id: stepCharacter.selectedCharacterId`.
- **Agente Supercomputer** [O]: tiene la herramienta `tool-higgsfield_soul_id` y preguntas de tipo `soul_id` con un selector de personajes. En la UI, "Keep Soul" lleva a `/start/agent?model=soul`.
- **Modelos que aceptan un Soul**: solo la familia Soul (v1, v2, Cinema, Cinema 1.5, Cinema Studio y los flujos que la usan) [O]. No se vio `custom_reference_id` en payloads de vídeo ni de modelos de terceros [O, por ausencia]. Para vídeo con identidad [I], primero se genera la imagen con Soul y luego se anima, o se usan Elements o Kling elements (§4).

### 3.3 Estilos Soul (`/soul-styles`)

- **Servicio CMS** [O] (`jCvphhIoPfzXpCEq`, `EwVY534CRjcyFJm-`):
  - `GET /soul-styles?lang=…&category=…`. Fuera de producción añade `show_hidden=True`.
  - `GET /soul-styles/{id}`, `/soul-cinematic-styles?size=100`, `/soul-keyframe-styles(/{id})`.
  - Para `soul-v2` los estilos salen de `/soul-v2/presets` (curados) y `/soul-v2/custom-presets` (propios).
- **Forma del estilo** (`02-generation.md`, mapeador `vM`): `{id, name, priority, description, media, tags, lora, lora_2, chain_enhancer, custom}`.
- [I] Cada estilo lleva **LoRAs de estilo** del servidor (`lora`, `lora_2`) que se combinan con la LoRA o adaptador de identidad del Soul. La fuerza se controla con `style_strength` y la identidad con `custom_reference_strength`.
- Hay un `style_id` por defecto especial (`464ea177-…`) que se ignora [O].

### 3.4 Soul 2.0 Preset (moodboard)

Chunk `E41zLnJAMSNQAjt-` [O]:
- Se crea con `POST /custom-references/soul-v2-preset {name, input_images:[{id,type}]}`.
- **Lectura**: `GET /soul-v2/custom-presets` (los propios) y `/soul-v2/presets` (los curados).
- **Detalle y borrado**: `GET /soul-v2/custom-presets/details/{id}` → `{showcase_jobs, media_inputs}` y `DELETE /soul-v2/custom-presets/{id}`.
- **Compartir**: `POST /soul-v2/presets/{id}/share {redirect_url}` → `{share_code}`, luego `GET /soul-v2/presets/shared/{code}` y `POST /…/bind` para añadirlo a tu cuenta.
- **Requisitos**: mínimo 5 imágenes (`{id:…,values:{MIN_MOODBOARD_IMAGES:5}}`) y que ninguna sea NSFW.
- **Coste**: 25 créditos.
- Es un **estilo entrenado** con las imágenes del moodboard, no una identidad [I].

---

## 4. Funciones de identidad relacionadas (y en qué se diferencian de Soul)

### 4.1 Reference Elements

API (`Yw2e1pkiSRelFdrE` v1, `aDcE4OQSXtOoI85Z` v2) [O]:
- **Creación** v1: `POST /reference-elements {category, name, description, medias, video_medias, audio_input_id, folder_id, workspace_id}`.
- **Creación** v2: `POST /v2/reference-elements {…, display_name, review_status?, performer_user_id?, properties?:[{key,type,values}], version}`.
- **Operaciones**: pin, folders, move, workspaces, share/save, bulk, import drafts, `/{id}/ip-detect` y `/{id}/enable-audio`.
- **Respuesta** (`RM`) [O]: `{id, category, name, display_name, version, review_status, properties, medias, audio_input, video_medias, status, ip_detected, is_pinned, is_shared, user, performer, workspace, folder_ids, created_at, updated_at}`.

Categorías [O]: `auto`, `character`, `environment`, `prop`, `voice`, `auto:character|environment|prop` (clasificadas por el servidor) y `character_ip_verified` / `environment_ip_verified`.

Estados [O]:
- `processing`, `ip_checking`, `ip_detected`, `completed`, `failed`, `kling_failed`, `voice_clone_failed`.
- Etiquetas: `wn()`, con `completed→F6pfE9`, `ip_checking→Wb1LaK`, `ip_detected→yP2SWl` y `kling_failed|voice_clone_failed→7Bj3x9`.
- Un elemento está terminado cuando su estado no es `processing` ni `ip_checking` (`wr(e){return e.status!=='processing'&&e.status!=='ip_checking'}`); se consulta cada 5 s.
- Hay SSE `reference_element:{created,updated,linked_to_folder,unlinked_from_folder}` (`01-api-layer.md`).
- Según la herramienta MCP de Higgsfield, `nsfw` también es un estado.

Uso en el prompt [O]:
- Placeholder `<<<uuid>>>`. Regex: `On=/<<<([^<>\s]{1,200})>>>/g`. Los placeholders posicionales se excluyen (`/<<<(?!image_\d+>>>|video_\d+>>>)([^>]+)>>>/g`).
- En la UI se muestran como chips; el multishot concatena `<<<id>>>` por escena.
- La documentación de la herramienta MCP `manage_reference_elements` (esquema local, sin llamarla) confirma [O]:
  - "Embed `<<<element_id>>>` inside `params.prompt`… Backend auto-injects the image and rewrites to `@element_name`."
  - Modelos: `nano_banana_pro`, `nano_banana_2`, `gpt_image_2`, `seedream_v4_5`, `seedream_v5_lite`, `cinematic_studio_2_5`, `cinematic_studio_video_v2`, `cinematic_studio_3_0`, `seedance_2_0` y `kling3_0` (este exige `start_image`).
  - "Only `status: completed` elements are usable".
  - Nombre de 32 caracteres como máximo; `category:'auto'` por defecto.

**Diferencia con Soul** [I, apoyado en lo observado]:

| | Elements | Soul |
|---|---|---|
| Entrenamiento | Ninguno: la creación "returns synchronously" y solo pasa la revisión de IP/NSFW y la conversión a Kling | Entrenamiento de pesos |
| Fotos | 1 o pocas | Hasta 80 |
| Coste | Gratis | 25–30 créditos |
| Cómo se usa | En el prompt con `<<<id>>>` | Por `custom_reference_id` |
| Modelos | Muchos modelos de terceros (inyección como imagen de referencia) | Solo la familia Soul |
| Alcance | Personajes, entornos, props y voces | Solo personas (cara) |

### 4.2 Kling elements

- **API** [O]: `GET /kling-elements/{id}` (`RANtC4cI3YYD5TJQ`) → `{id, name, thumbnail_url, category_id, video_input, tag, description, status:'generating'|…, created_at, input_images}`.
- **En el payload** [O]: los trabajos de Kling 3.0/O1 y `kling-video-edit` envían `kling_element_ids:[…]` (normalmente vacío). Solo se rellenan si el prompt contiene referencias (`kling_element_ids:Bi(v)&&y.length>0?y:[]`).
- [I] Al crear un Reference Element, el servidor lo registra también como **elemento de Kling** en el proveedor. Si eso falla, el estado es `kling_failed`, y Kling no puede usarlo aunque otros modelos sí (`restrictKlingFailed`).

### 4.3 Character sheets

- **Trabajo** [O] (`_piWo_eZxx-XvImX`):
  - Con fotos: `POST /jobs/v2/character_sheet {params:{medias}}`.
  - Desde el generador "AI Influencer": `{width, height, batch_size:1, preset_id, create_reference_element:!0, character_params:{genre, budget:250, era?, gender?, build?, height?…}}`.
- **Consentimiento** [O]: `POST /user/settings/character-sheets-consent {character_sheets_consent:true}`.
- Las fotos con `ip_detected` o `nsfw` se descartan (ids de error `-Ep4rS`, `-ttblR`, `0-IExu`).
- **Diferencia con Soul** [I]: es una **generación** (una hoja de personaje con vistas o ángulos) que, con `create_reference_element:true`, **produce un Reference Element**. Es decir, la identidad se fija en imágenes, no en pesos.

### 4.4 Cuadro comparativo

| Mecanismo | Entrada | Proceso | Salida | Uso |
|---|---|---|---|---|
| **Soul ID** | 1–80 fotos (recomendado 25–50 o más, lado corto de 840 px o más) | Entrenamiento en el servidor (unos 5 min), 3 etapas | `custom_reference_id` | Solo modelos Soul, con fuerza de 0 a 1 |
| **Soul 2.0 Preset** | 5 o más imágenes de estilo | Entrenamiento | Preset de estilo | Estilo de Soul 2.0 |
| **Reference Element** | 1 o más imágenes, vídeo o audio | Revisión IP/NSFW y registro en Kling | `element_id` | `<<<id>>>` en el prompt de muchos modelos |
| **Kling element** | Derivado del Element | Registro en Kling | `kling_element_ids` | Kling 3.0/O1/O3 |
| **Character sheet** | Fotos o rasgos | Generación | Imagen y Element | Igual que un Element |

---

## 5. Cómo recrearlo (Next.js + fal.ai)

**Lo que no se puede replicar**:
- Los pesos de Soul (base y "green", "olzhas" y demás), su receta de entrenamiento real en producción (el cliente envía `training_args:null`), los LoRAs de los estilos Soul y la integración de Elements en Kling son **del servidor de Higgsfield** y no están en el frontend.
- Lo que sí se puede replicar es el **funcionamiento**: el flujo, los estados, los controles y el contrato de datos, con modelos abiertos o alojados en fal.
- La calidad de identidad dependerá del modelo base elegido.

### 5.1 Mapeo a fal

Endpoints comprobados en el catálogo público `api.fal.ai/v1/models`, todos `active`:

| Pieza de Higgsfield | Equivalente en fal | Notas del esquema |
|---|---|---|
| Entrenar el Soul (identidad) | `fal-ai/flux-lora-portrait-trainer` | `images_data_url` (zip), `steps` 2500 por defecto, `learning_rate` 9e-5, `subject_crop` true, `multiresolution_training` true, `trigger_phrase`, `create_masks`. Salida: `diffusers_lora_file`, `config_file`. Es lo más parecido a "Soul": retrato, multirresolución, recorte del sujeto |
| | `fal-ai/flux-lora-fast-training` | `images_data_url`, `create_masks` true (máscara de cara/persona que pondera la pérdida, análoga a `face_loss_weight`), `trigger_word`, `is_style` |
| | `fal-ai/z-image-trainer` y `fal-ai/z-image-turbo-trainer-v2` | `image_data_url`, `steps` 1000, `learning_rate` 1e-4, `training_type` `balanced|content|style` |
| | `fal-ai/flux-2-trainer-v2` (+`/edit`), `fal-ai/flux-2-klein-9b-base-trainer` | `image_data_url`, `steps` 1000, `learning_rate` 5e-5 |
| | `fal-ai/qwen-image-edit-2509-trainer`, `fal-ai/krea-2-trainer`, `fal-ai/wan-22-image-trainer` | Alternativas |
| Generar con el Soul | `fal-ai/flux-lora`, `fal-ai/z-image/turbo/lora`, `fal-ai/flux-2/lora`, `fal-ai/flux-2/klein/9b/lora`, `fal-ai/qwen-image-2512/lora`, `fal-ai/krea-2/turbo/lora` | `loras:[{path, scale}]`: `scale` hace de `custom_reference_strength` y el segundo LoRA de "estilo" de `lora_2` |
| Soul 2.0 Preset (estilo) | El mismo trainer con modo estilo (`is_style:true` o `training_type:'style'`) | Mínimo 5 imágenes, como Higgsfield |
| Identidad sin entrenar (modo rápido o previa) | `fal-ai/flux-pulid` (`reference_image_url`, `id_weight`), `fal-ai/pulid`, `fal-ai/instant-character` (`image_url`, `scale`), `fal-ai/ideogram/character` | Útil mientras se entrena el LoRA |
| Reference Elements | No hace falta entrenar. Al enviar, se sustituye `<<<id>>>` por `@nombre` y se añaden sus imágenes al campo de referencias del endpoint (`image_urls` / `reference_image_urls` / `elements`) que ya mapea `src/generation/to-fal.ts`. Modelos con referencias en el catálogo: `fal-ai/kling-video/o3/{pro,standard}/reference-to-video`, `bytedance/seedance-2.5/reference-to-video`, `fal-ai/vidu/q4/reference-to-video`, `alibaba/wan-3.0-prime/reference-to-video` | Igual que hace el backend de Higgsfield según su herramienta MCP |
| Vídeo con un Soul | Dos pasos: imagen con LoRA y después image-to-video, o Element en un modelo reference-to-video | Higgsfield tampoco inyecta Soul en vídeo [O, por ausencia] |

Precios: hay que consultarlos en fal antes de fijar tarifas (ver `docs/HANDOFF.md`).

### 5.2 Modelo de datos (Postgres, fase 2)

```
identities (Soul)
  id uuid PK, user_id, workspace_id, name varchar(100), kind enum('identity','style'),
  base_model text            -- 'flux-portrait' | 'z-image' | 'flux-2' …  (análogo a soul-v1/v2/cinematic)
  status enum('queued','in_progress','completed','failed') , fail_reason text null
  trainer_endpoint text, fal_request_id text, trigger_word text,
  lora_url text null, config_url text null, thumbnail_url text null,
  total_images int, is_shared bool default false, cost_credits int,
  queued_at, in_progress_at, completed_at, created_at, updated_at
identity_images
  id, identity_id FK, media_id FK, url, width, height, nsfw bool, ip_flag bool, face_count int null
reference_elements
  id uuid, user_id, workspace_id, category enum('auto','character','environment','prop','voice'),
  name varchar(32) unique per workspace, description, status enum('processing','ip_checking','completed','failed','nsfw'),
  medias jsonb, created_at
generations (ya prevista)  +  identity_id null, identity_strength real default 1, element_ids uuid[]
```

### 5.3 Flujo propuesto

1. **Subida**: con URL firmada (fase 2). Al confirmar, se pasa un filtro NSFW en el servidor, como el `force_nsfw_check` de Higgsfield.
   - Se puede usar el `enable_safety_checker` de fal en un paso de clasificación, o un clasificador propio [I].
   - Para el control de cara, **mejor que Higgsfield, en el cliente**: MediaPipe `FaceDetector` en el navegador, que rechace fotos con 0 o más de 1 cara antes de subirlas. En el servidor se repite con un detector y se guarda `face_count`.
2. **Formulario**: replicar las reglas observadas.
   - Mínimo 5 fotos (bloqueante), máximo 80, 20 MB, jpeg/png/webp/heic.
   - Indicador de cantidad: 50 o más = perfecto, 25 o más = bueno.
   - Indicador de calidad: mediana del lado corto, 840 px o más = perfecto, 640 o más = bueno.
   - Nombre obligatorio de 100 caracteres como máximo, autogenerado con un LLM de visión opcional (`/name`).
   - Consentimiento biométrico explícito y guardado (obligación legal: BIPA/GDPR).
3. **Envío** (`POST /api/identities`):
   - Comprobar y **reservar créditos**.
   - Empaquetar las imágenes en un zip en el blob store (`images_data_url`).
   - `POST https://queue.fal.run/fal-ai/flux-lora-portrait-trainer` con `webhook_url` (`fal_webhook`) y guardar `fal_request_id`.
   - Estado `queued`.
4. **Progreso**: fal informa de `IN_QUEUE`/`IN_PROGRESS`. Se puede pasar a `in_progress` con el webhook o con un polling de `status` (lo que ya hace `src/generation/poll.ts`).
   - Para el porcentaje, se copia el truco de Higgsfield: estimación por tiempo desde `in_progress_at` con la duración media medida por trainer, limitada a 1–99 %.
   - Mejor que Higgsfield: emitir SSE `identity:status_changed` en lugar de obligar a consultar cada 10 s.
5. **Al terminar** (webhook `OK`):
   - Guardar `lora_url`.
   - Lanzar 2 o 4 generaciones de muestra para la miniatura (el "showcase" de Higgsfield).
   - Estado `completed`; cobrar los créditos reservados.
   - Si hay error, `failed` con `fail_reason` (`face_not_found`, `nsfw` o `trainer_error`) y **devolver** los créditos.
6. **Uso**: en `to-fal.ts`, si la generación lleva `identity_id`, elegir el endpoint `…/lora` del modelo base.
   - `loras:[{path:lora_url, scale:identity_strength}, …styleLoras]` e insertar `trigger_word` en el prompt.
   - Validar que el modelo seleccionado es compatible con el `base_model` de la identidad. Un LoRA de FLUX no sirve en Z-Image: es la misma restricción que "solo modelos Soul".
7. **Reentrenar**: crear una versión nueva (fila nueva o `version+1`) con las mismas fotos y otro `base_model`; equivale al "retrain a Soul 2 / Soul Cinema". También renombrar, compartir, mover de workspace y borrar (borrando también el LoRA del almacenamiento).

### 5.4 Parámetros iniciales recomendados [I]

- `flux-lora-portrait-trainer`: `steps` entre 1500 y 2500, `learning_rate` 9e-5 por defecto, `subject_crop:true`, `multiresolution_training:true` (equivale a las 3 etapas 256/512/1024 de Higgsfield) y `trigger_phrase` único por identidad (p. ej. `ohf_<shortid>`).
- `flux-lora-fast-training`: `create_masks:true`, con más peso en la cara (equivale a `face_loss_weight`).
- Precio sugerido: el coste real de fal × 2,5–4 en créditos, como en `HANDOFF.md`. Como referencia, Higgsfield cobra 25–30 créditos.

### 5.5 Límites y riesgos

- **Calidad**: sin los pesos de Soul, la fidelidad facial y la estética "Soul" dependen del modelo base. Hay que probar con A/B el portrait trainer frente a Z-Image y FLUX.2.
- **Tiempo**: los trainers de fal tardan de minutos a decenas de minutos según los pasos. Higgsfield supone unos 5 min.
- **Legal**: subir caras de terceros. Hacen falta consentimiento, revisión de IP o famosos (Higgsfield pasa `force_ip_check`) y política de borrado.
- **Coste de almacenamiento**: cada LoRA ocupa decenas o cientos de MB; conviene ponerle caducidad o mover a almacenamiento en frío las identidades sin usar.

---

## 6. Desconocidos principales

- El modelo base y el tipo de adaptador de Soul v1, v2 y Cinema, y los `training_args` reales de producción. [D]
- Los textos de los mensajes de interfaz (catálogo Lingui no descargado). [D]
- El significado exacto de `showcase_completed` y de `free_retrain_available`. [D/I]
- Si existen notificaciones push o email del final del entrenamiento. [D]
- La ruta `/character/kion`. [D]
