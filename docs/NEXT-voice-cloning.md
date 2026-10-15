# Próxima investigación: clonación de voz (ElevenLabs, con Chatterbox como alternativa)

## Qué se puede obtener realmente

| Objetivo | Qué revela la ingeniería inversa | Límite |
|---|---|---|
| **ElevenLabs** (web `elevenlabs.io/app`) | Todo el **producto**: flujo de clonación instantánea (IVC) y profesional (PVC), subida y validación de muestras, verificación de la voz y consentimiento, endpoints internos, estados del trabajo, límites por plan, cómo se cobra, cómo se usa la voz clonada en TTS, streaming y agentes | El **modelo** que clona corre en sus servidores y no se puede obtener del frontend. Su API pública (p. ej. `POST /v1/voices/add`) está documentada y sirve para comparar |
| **Chatterbox** (Resemble AI, código abierto) | El **motor**: código y pesos públicos. Clona voz a partir de un audio corto de referencia, sin entrenamiento | Es código fuente, no un binario. Se estudia leyendo el repositorio, y REA aporta poco aquí. Revisar su licencia y su marca de agua de audio antes de usarlo comercialmente |

Recomendación: aplicar REA a **ElevenLabs** para copiar el diseño del producto y el flujo, y usar **Chatterbox u otro modelo abierto** como motor propio. Antes, comprobar si fal.ai ya sirve el modelo, porque así encajaría con el proveedor actual.

**Límites que respetaremos:**
- Solo el frontend público y la documentación pública; nada de saltarse la verificación de voz, el consentimiento, los límites de plan ni los pagos de ElevenLabs.
- Nuestro producto clonará voces solo con **consentimiento verificado** de la persona dueña de la voz, por ejemplo leyendo una frase de verificación como hace ElevenLabs.

## Mensaje para pegar en el chat nuevo

```
Repos: suarezstev1-star/rea (herramienta REA + skill) y suarezstev1-star/open-higgsfield
(nuestra plataforma; lee docs/HANDOFF.md y docs/NEXT-voice-cloning.md primero).

1. Instala la skill y el MCP de REA para Claude Code (muestra el plan con --dry-run y
   aplícalo con --yes).
2. Haz ingeniería inversa completa, solo estática y del frontend público, de la parte de
   clonación de voz de ElevenLabs (elevenlabs.io/app: Voice Lab / Voices, Instant y
   Professional Voice Cloning). Quiero:
   - el flujo completo paso a paso (subida de muestras, requisitos de audio, verificación
     de la voz y consentimiento, entrenamiento o estado, uso en TTS y streaming);
   - los endpoints internos con sus payloads y respuestas;
   - los límites por plan y cómo se cobra;
   - en qué se diferencia de su API pública documentada.
   Marca cada hallazgo como OBSERVADO, INFERIDO o DESCONOCIDO, igual que en
   docs/research/higgsfield/. No hagas llamadas a sus APIs ni intentes saltarte la
   verificación, los límites o los pagos.
3. Estudia Chatterbox (Resemble AI): cómo clona, requisitos del audio de referencia,
   licencia, marca de agua, y si fal.ai lo sirve.
4. Guarda todo en open-higgsfield/docs/research/elevenlabs/ y propón cómo añadir la
   clonación de voz con consentimiento a nuestra plataforma (como una fase de la hoja de
   ruta de docs/HANDOFF.md).
```
