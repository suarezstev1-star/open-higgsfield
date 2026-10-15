# Guía de captura en vivo (segunda pasada con cuenta propia)

Objetivo: con una cuenta propia de Higgsfield (vale una de prueba de 2–3 días), capturar
el tráfico real de red para llenar lo que el código público no revela: valores de
catálogos del servidor, precios reales por modelo, payloads/respuestas reales y los
prompts mejorados que la interfaz devuelva.

**Seguridad:** nunca compartas tu contraseña ni tus claves en el chat. Este método usa
solo un archivo HAR exportado desde tu navegador; no requiere que el asistente inicie
sesión ni acceda a tu cuenta.

**Legal:** analizar el tráfico de tu propia sesión es para entender e interoperar.
Revender un clon basado en esto puede chocar con los términos de Higgsfield; consulta a
un abogado antes de vender. No se intenta saltar ninguna protección, pago ni verificación.

## Qué NO se obtiene ni así
- Los pesos de los modelos (Soul, etc.): nunca se descargan.
- El system prompt del servidor cuando la interfaz no te lo devuelve.
- Entrenar un Soul puede requerir plan de pago; en prueba quizá solo quede grabada la
  petición, no el entrenamiento completo.

## Pasos

1. **Crea la cuenta** (prueba de 2–3 días).
2. En el navegador (Chrome/Edge/Firefox), abre **Herramientas de desarrollador** (F12) →
   pestaña **Red (Network)**.
   - Activa **"Conservar registro" / "Preserve log"**.
   - Marca **"Disable cache"**.
   - Deja el filtro en **Fetch/XHR**.
3. Inicia sesión y **recorre una vez cada herramienta** para que cada catálogo y cada
   envío queden grabados (no hace falta terminar las generaciones caras; con que se envíe
   la petición basta):
   - **Catálogos / arranque:** abre la home, `/ai/image`, `/ai/video`, `/generate`
     (Cinema Studio). Abre los selectores de **cámara, lente, look, estilo, aspecto,
     duración** (así se cargan sus valores).
   - **AI Influencer / avatares:** `/ai-influencer-studio` → genera una hoja; `/avatar/*`.
   - **Soul:** `/character` → intenta crear un Soul (sube fotos; si pide pago, para ahí —
     la petición ya quedó grabada). Abre `/soul-styles`.
   - **Genjutsu / editor:** `/genjutsu` (o `/start/genjutsu`) → abre motion-control y
     replace-object; abre el catálogo de presets.
   - **Apps:** abre `/apps` y entra en 4–5 apps distintas (skin-enhancer, face-swap,
     expand-image, una de efectos virales, una de anuncios). Envía una.
   - **Plantillas / reels:** `/effects`, `/shorts-studio`, y una plantilla de reel.
   - **Precios:** entra en una generación de cada tipo para que se llame
     `/job-sets/costs` con cada modelo. Abre `/pricing`.
   - **Prompt mejorado:** en las herramientas con "enhance prompt", actívalo y mira si te
     muestran el prompt reescrito; úsalo para que quede en la respuesta.
4. **Exporta el HAR:** clic derecho en la lista de peticiones → **"Save all as HAR"** /
   **"Export HAR"**. Guarda el archivo.
5. **Entrégalo al asistente** subiéndolo a la sesión (o colócalo en una carpeta que la
   sesión pueda leer). Indica desde qué pantallas lo capturaste.

## Qué hará el asistente con el HAR
- Lo analiza con la herramienta de captura de red de REA (`inspect_web_network_capture`),
  que lee los pares petición/respuesta **sin** volver a llamar a Higgsfield.
- Extrae: valores de catálogos, precios por modelo, esquemas reales de payload/respuesta,
  prompts mejorados si aparecen.
- Actualiza los informes de `docs/research/higgsfield/` y sube de 🟡 a 🟢 todo lo que la
  captura confirme, en `docs/MASTER-BUILD.md`.

## Nota
El HAR puede contener tu token de sesión y datos de tu cuenta. Trátalo como algo privado.
El asistente lo usará solo para extraer catálogos/esquemas y no lo publicará; aun así,
puedes revocar la sesión de Higgsfield después de la captura.
