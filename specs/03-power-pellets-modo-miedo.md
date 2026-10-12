# SPEC 03 — Píldoras de poder y modo miedo

> **Status:** Approved
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-10-11
> **Objective:** Añadir 4 píldoras de poder que, al comerse, vuelven comestibles y más lentos a los fantasmas durante ~7s, con puntaje escalado al comerlos.

## Scope

**In:**

- Tile nuevo de píldora de poder (`4`, char `'o'`) y 4 píldoras en las esquinas clásicas del laberinto.
- Al comer una píldora: +50 puntos, cuenta para `dotsRemaining` (necesaria para `GANASTE`) y activa el modo miedo 420 frames.
- Modo miedo: los 4 fantasmas se vuelven asustados (azul), invierten dirección y deambulan aleatorio, e ignoran su arquetipo de SPEC 01.
- Comer píldora reinicia el temporizador si ya había modo miedo activo.
- Velocidad reducida de los fantasmas asustados (0.06 celda/frame vs 0.1).
- Comer un fantasma asustado: puntos escalados 200/400/800/1600 y el fantasma reaparece en su `GHOST_START` del pen, saliendo por la puerta (mecánica de SPEC 02) ya normal.
- Parpadeo blanco en los últimos ~2s (120 frames) como aviso de que el modo miedo termina.
- Cancelar el modo miedo al perder una vida (`resetPositions`).

**Out of scope (para futuras specs):**

- Animación de "ojos" volviendo al pen (aquí el fantasma reaparece directo).
- Fases scatter y temporizadores de liberación del pen.
- Frutas, bonus y velocidades diferenciadas por fantasma fuera del modo miedo.
- Niveles múltiples o progresión de dificultad.

## Data model

`maze.js` — nuevo código de tile y 4 colocaciones:

```js
// parseTile: si ch === 'o' → 4 (píldora de poder)
// MAZE_STR, fila 3 y fila 23, cols 1 y 26: '.' → 'o'
```

Las posiciones quedan en `(1,3) (26,3) (1,23) (26,23)`, esquinas simétricas y transitables.

`game.js` — constantes nuevas y estado de partida:

```js
const POWER_PELLET_SCORE = 50;
const FRIGHTENED_FRAMES = 420;        // ~7s a 60fps
const FRIGHTENED_BLINK_FRAMES = 120;  // últimos ~2s de parpadeo
const FRIGHTENED_GHOST_SPEED = 0.06;  // vs GHOST_SPEED = 0.1
const GHOST_EAT_SCORES = [ 200, 400, 800, 1600 ];
```

`createGame` añade al objeto de partida `frightenedTimer: 0` y `ghostsEaten: 0`; cada fantasma añade `frightened: false` y `reverse: false`. El conteo de `dotsRemaining` incluye tiles `2` y `4`.

No hay persistencia; todo vive en el objeto de partida y se recrea en `createGame`.

## Implementation plan

1. **`maze.js`:** añadir `'o' → 4` en `parseTile` y sustituir 4 celdas en `MAZE_STR`. Verificación: abrir el juego no falla; las 4 píldoras existen en `MAZE` (aún sin dibujarse distintas).
2. **`game.js`:** añadir las constantes del modo miedo; extender `createGame` con `frightenedTimer`/`ghostsEaten` y flags por fantasma; contar tiles `4` en `dotsRemaining`. Verificación: iniciar partida no cambia el comportamiento.
3. **`game.js`:** en `movePacman`, comer tile `4` → `grid=0`, `score += 50`, `dotsRemaining--`, y activar modo miedo: `frightenedTimer = FRIGHTENED_FRAMES`, `ghostsEaten = 0`, `reverse = true` y `frightened = true` a todos los fantasmas. Verificación: comer una píldora sube el score 50 y no rompe el juego.
4. **`game.js`:** decremento del temporizador en `update`; al llegar a 0, `frightened = false` a todos. Verificación: los fantasmas dejan de estar asustados tras ~7s.
5. **`game.js`:** comportamiento asustado en `decideGhost`/`moveGhost`: si `frightened` y fuera del pen, invertir en la próxima decisión (`reverse`) y elegir dirección aleatoria entre las válidas; usar `FRIGHTENED_GHOST_SPEED`. La salida del pen (SPEC 02) sigue teniendo prioridad. Verificación: al comer píldora los fantasmas se mueven erráticos y más lentos.
6. **`game.js`:** colisión con fantasma asustado en `update`: `score += GHOST_EAT_SCORES[ghostsEaten]`, `ghostsEaten++`, reubicar ese fantasma en su `GHOST_START` del pen con `frightened=false`; no se pierde vida. Verificación: comer fantasmas suma 200/400/800/1600 y reaparecen por la puerta.
7. **`game.js`:** `resetPositions` resetea `frightenedTimer`, `ghostsEaten` y los flags por fantasma. Verificación: al perder una vida se cancela el modo miedo.
8. **`render.js`:** `drawPowerPellets` dibuja tile `4` con radio ~5.5 (mismo `DOT_COLOR`); en `draw`, color del fantasma = azul `#2121ff`, o blanco parpadeante cuando `frightenedTimer <= FRIGHTENED_BLINK_FRAMES` (alternando por frame), y si no asustado el color de `GHOST_KIND_COLORS`. Verificación: píldoras más grandes y fantasmas azules/parpadeantes.

## Acceptance criteria

- [ ] Se ven 4 píldoras de poder (dots más grandes) en las esquinas en `(1,3) (26,3) (1,23) (26,23)`.
- [ ] Comer una píldora suma 50 puntos y su celda queda vacía.
- [ ] Al comerla, los 4 fantasmas se vuelven azules y se mueven más lentos y erráticos.
- [ ] El modo miedo dura ~7s y luego los fantasmas recuperan color y arquetipo.
- [ ] En los últimos ~2s los fantasmas azules parpadean en blanco.
- [ ] Comer un fantasma asustado suma 200, luego 400, 800 y 1600 dentro de la misma píldora.
- [ ] El contador de puntos por fantasma se reinicia al comer una nueva píldora y al perder una vida.
- [ ] Un fantasma comido reaparece en su `GHOST_START` del pen y sale por la puerta ya normal.
- [ ] Comer otra píldora estando en modo miedo reinicia el temporizador a 420 frames.
- [ ] Morir durante el modo miedo lo cancela (`resetPositions`).
- [ ] Las píldoras cuentan para `dotsRemaining`: comerlas todas + los dots dispara `GANASTE`.
- [ ] Un fantasma no asustado sigue quitando una vida como antes.
- [ ] Consola sin errores; túnel, overlays `GANASTE`/`PERDISTE` y reinicio funcionan igual.

## Decisions

- **Sí:** 4 píldoras en las esquinas clásicas `(1,3) (26,3) (1,23) (26,23)`. Fiel al original; son celdas-dot ya transitables.
- **Sí:** tile numérico nuevo `4` (char `'o'`) en vez de reutilizar `2`. Mantiene la codificación explícita existente.
- **Sí:** duración de 420 frames (~7s). Duración clásica; suficiente para cruzar el laberinto.
- **Sí:** comer otra píldora reinicia el temporizador a 420 y el contador de puntos a 200.
- **Sí:** fantasmas asustados invierten y deambulan aleatorio, ignorando su arquetipo mientras dura el modo. Clásico y didáctico.
- **Sí:** fantasmas asustados más lentos (0.06), Pac-Man igual. Da margen real para cazar.
- **Sí:** reaparece en el pen y sale por la puerta reutilizando SPEC 02. Evita implementar "ojos" y aprovecha mecánica ya existente.
- **Sí:** el fantasma comido sale normal aunque el modo miedo siga activo (no se le puede volver a comer en ese periodo). Fiel al original; no requiere flag extra porque solo una píldora nueva reasusta.
- **Sí:** parpadeo blanco en los últimos 120 frames. Aviso de fin barato en render.
- **Sí:** la píldora cuenta para `dotsRemaining`. Necesaria para `GANASTE`, como en el original.
- **Sí:** perder una vida cancela el modo miedo.
- **No:** animación de ojos volviendo al pen. Añade un estado y render extra; va en su propia spec si se quiere.
- **No:** fases scatter, liberación escalonada del pen ni velocidades por fantasma; siguen fuera de alcance.

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| Las 4 posiciones son coordenadas fijas del laberinto | Documentadas aquí; si cambia el laberinto hay que recalcularlas (ya pasa con `GHOST_STARTS`, `PEN_EXIT`). |
| El deambular aleatorio podría oscilar en pasillos cortos | Se mantiene la regla de no revertir salvo callejón sin salida; al ser más lento, el efecto es el clásico. |
| Invertir dirección a mitad de celda desalinea al fantasma | La inversión se aplica en la próxima decisión (celda alineada) vía flag `reverse`, no a mitad de trayecto. |
| El temporizador se descuenta tras activarse el mismo frame de comer la píldora | Inofensivo (419 vs 420); el modo dura ~7s igual. |

## What is **not** in this spec

- Animación de ojos regresando al pen.
- Fases scatter y timers de liberación del pen.
- Frutas/bonus y niveles múltiples.

Cada uno, si llega, va en su propia spec.
