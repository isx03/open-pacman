# SPEC 01 — Cuatro fantasmas con comportamientos diferenciados

> **Status:** Approved
> **Date:** 2026-09-20
> **Objective:** Sustituir los 2 fantasmas actuales por 4 con arquetipos clásicos diferenciados, donde el cazador persigue agresivamente a Pacman.

## Scope

**In:**

- 4 fantasmas simultáneos, todos arrancando dentro del pen y saliendo libres (mecanismo actual, sin temporizador).
- Cuatro comportamientos de decisión de dirección: cazador, emboscador, estratega y cobarde, en caza continua.
- Color por `kind` (rojo, rosa, cian, naranja) fiel a los arquetipos.
- Eliminación de los `kind` antiguos `hunter` y `random`.

**Out of scope (para futuras specs):**

- Modo miedo / píldoras de poder grandes (requiere tile nuevo y mecánica de comer fantasmas).
- Fases scatter (relajación a esquinas por temporizador).
- Velocidades distintas por fantasma ni bonus de velocidad al quedar pocos dots.
- Liberación escalonada con temporizador desde el pen.

## Data model

`maze.js` — config de los 4 fantasmas (reemplaza `GHOST_STARTS`, de 2 a 4; el pen interior ocupa filas 13–15, cols 11–16):

```js
const GHOST_STARTS = [
  { x: 13, y: 14, kind: 'cazador' },
  { x: 14, y: 14, kind: 'emboscador' },
  { x: 13, y: 15, kind: 'estratega' },
  { x: 14, y: 15, kind: 'cobarde', home: { x: 1, y: 29 } },
];
```

`game.js` — lógica de objetivo por `kind`:

- `cazador`: celda de Pacman (redondeada).
- `emboscador`: celda 4 tiles delante de Pacman en su dirección (clamp a bordes).
- `estratega`: `A` = celda 2 tiles delante de Pacman; `B` = celda del cazador; `target = { x: 2*A.x - B.x, y: 2*A.y - B.y }`.
- `cobarde`: si `distManhattan(g, pacman) > 8` → celda de Pacman; si no → `g.home`.

`render.js` — colores por kind (mismos valores que ya existen en `GHOST_COLORS`):

```js
const GHOST_KIND_COLORS = {
  cazador: '#ff0000',
  emboscador: '#ffb8ff',
  estratega: '#00ffff',
  cobarde:   '#ffb852',
};
```

## Implementation plan

1. **`maze.js`:** reemplazar `GHOST_STARTS` por las 4 entradas con kinds españoles y `home` para el cobarde. Verificación: se ven 4 fantasmas al abrir el juego.
2. **`game.js`:** refactor de `decideGhost` para que la selección greedy de dirección use un objetivo `chaseTarget(game, g)`; temporalmente los 4 persiguen a Pacman (sustituye el switch `hunter`/`random`). El `resetPositions` ya es agnóstico al número (usa `GHOST_STARTS` y `forEach`).
3. **`game.js`:** implementar objetivos de `emboscador` y `estratega` en `chaseTarget` (buscar al fantasma `kind: 'cazador'` como referencia).
4. **`game.js`:** implementar `cobarde` (umbral 8 celdas Manhattan + `home`). Cada paso usa `GHOST_SPEED` (0.1) sin cambios.
5. **`render.js`:** colorear por `kind` con `GHOST_KIND_COLORS` (elimina `GHOST_COLORS`).

## Acceptance criteria

- [ ] Se ven 4 fantasmas simultáneamente, cada uno con su color (rojo, rosa, cian, naranja).
- [ ] Cada fantasma mantiene el mismo color en su arquetipo, no por índice.
- [ ] El cazador reduce la distancia Manhattan a Pacman en cada intersección (elige el mejor tile).
- [ ] El emboscador se dirige a la celda 4 tiles delante de Pacman en su dirección.
- [ ] El estratega cambia su objetivo cuando el cazador se mueve (usa su posición como referencia).
- [ ] El cobarde persigue a Pacman a >8 celdas y va a su `home` (esquina inferior izquierda) a ≤8.
- [ ] Ningún fantasma atraviesa paredes, se queda atascado, o rompe la colisión/`resetPositions`.
- [ ] Ya no existen los `kind` `hunter` y `random`.
- [ ] Consola sin errores; overlays `GANASTE`/`PERDISTE` y reinicio funcionan igual.

## Decisions

- **Sí:** los 4 arquetipos clásicos (Blinky→cazador, Pinky→emboscador, Inky→estratega, Clyde→cobarde). Es lo más didáctico y cumple "uno persigue agresivamente".
- **Sí:** kinds en español (`cazador`, `emboscador`, `estratega`, `cobarde`), coherente con la convención de código en español del repo (los `kind` actuales `hunter`/`random` se eliminan).
- **Sí:** caza continua (sin scatter). Más simple; el scatter puede ir en otra spec si se quiere fidelidad.
- **No:** píldoras de poder / modo miedo. Requiere tile nuevo y mecánica de comer fantasmas; va en su propia spec.
- **No:** liberación escalonada del pen y velocidades distintas; fuera de alcance.
- **Simplificación:** el emboscador calcula "4 delante" sin el desplazamiento lateral del original cuando Pacman mira arriba; el umbral del cobarde es fijo en 8.
- **Sí:** el `home` del cobarde es la celda transitable inferior-izquierda `{x: 1, y: 29}`.

## What is **not** in this spec

- Píldoras de poder y modo miedo (comer fantasmas).
- Fases scatter y timers de release del pen.
- Velocidades por fantasma.

Cada uno de esos, si llega, va en su propia spec.