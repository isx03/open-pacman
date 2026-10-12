# SPEC 02 — Salida de los fantasmas desde el pen

> **Status:** Approved
> **Depends on:** SPEC 01
> **Date:** 2026-10-11
> **Objective:** Hacer que los 4 fantasmas abandonen el pen por la puerta y queden sobre el laberinto al arrancar (y tras cada reaparición), en vez de quedar girando atrapados dentro.

## Scope

**In:**

- Mecanismo de salida: mientras un fantasma esté dentro del pen, ignora su arquetipo de caza y se dirige a una celda de salida compartida subiendo por la puerta.
- Detección del pen por región de celdas (no por flag), de modo que también se dispare si un fantasma reingresa durante la caza.
- La salida se aplica en el spawn inicial y en cada `resetPositions` (tras perder una vida).
- Los 4 fantasmas salen a la vez, sin temporizador.

**Out of scope (para futuras specs):**

- Liberación escalonada con temporizador desde el pen.
- Velocidades distintas por fantasma.
- Fases scatter y modo miedo.
- Cambiar la puerta, el laberinto o los arquetipos de SPEC 01.

## Data model

`maze.js` — dos constantes nuevas junto a `GHOST_STARTS` (el pen interior ocupa filas 13–15, cols 11–16; la puerta está en la fila 12, cols 13–14):

```js
const PEN_EXIT = { x: 13, y: 11 };
const PEN_REGION = { x0: 11, x1: 16, y0: 12, y1: 15 };
```

`PEN_REGION` incluye la fila 12 (la puerta) a propósito, para que el fantasma siga apuntando a `PEN_EXIT` mientras cruza el dintel y no recule hacia el interior.

`game.js` — helper de detección con las celdas redondeadas del fantasma:

```js
function inPen( g ) {
  const cx = Math.round( g.x );
  const cy = Math.round( g.y );
  return cx >= PEN_REGION.x0 && cx <= PEN_REGION.x1
    && cy >= PEN_REGION.y0 && cy <= PEN_REGION.y1;
}
```

`window` expone `PEN_EXIT` y `PEN_REGION` desde `maze.js`. No se introduce estado nuevo por partida ni persistencia.

## Implementation plan

1. **`maze.js`:** añadir `PEN_EXIT` y `PEN_REGION` y exportarlas en `window`. Verificación: abrir el juego no cambia nada visualmente (comportamiento intacto).
2. **`game.js`:** añadir `inPen(g)` y, al inicio de `chaseTarget`, retornar `PEN_EXIT` cuando `inPen(g)` sea verdadero (antes de evaluar el `kind`). Verificación manual: al iniciar, los 4 fantasmas suben por la puerta y salen al laberinto; tras perder una vida, vuelven a salir.

## Acceptance criteria

- [ ] Al iniciar partida, los 4 fantasmas salen del pen por la puerta y quedan sobre el laberinto en pocos segundos.
- [ ] Ningún fantasma se queda girando dentro del pen.
- [ ] Tras perder una vida, los 4 fantasmas vuelven a salir del pen.
- [ ] Si un fantasma reingresa al pen durante la caza, vuelve a salir por la puerta.
- [ ] La puerta sigue siendo atravesable solo por fantasmas (Pacman sigue bloqueado por el tile `3`).
- [ ] Tras salir, cada fantasma retoma su arquetipo y color de SPEC 01.
- [ ] Consola sin errores; colisiones, overlays `GANASTE`/`PERDISTE` y reinicio funcionan igual.

## Decisions

- **Sí:** salida subiendo por la puerta, fiel al original. Respeta que SPEC 01 ya prevé "todos arrancando dentro del pen y saliendo libres".
- **Sí:** celda de salida compartida `{x:13,y:11}`, transitable y fuera de `PEN_REGION`. Suficiente para los 4 arquetipos.
- **Sí:** detección por región en vez de flag `exiting`, para cubrir también la re-entrada por la puerta.
- **Sí:** `PEN_REGION` incluye la fila 12 (puerta) para evitar que el fantasma oscile en el dintel al reanudar la caza.
- **Sí:** todos salen a la vez sin temporizador, coherente con SPEC 01 ("sin temporizador").
- **No:** teleport instantáneo ni reubicar `GHOST_STARTS`; se quería una salida real, no saltarse el pen.
- **No:** escalonado con temporizador; si llega, va en su propia spec.

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| `PEN_EXIT`/`PEN_REGION` son coordenadas fijas del laberinto | Documentadas aquí; si cambia el laberinto hay que recalcularlas (ya pasa con `GHOST_STARTS`). |
| La salida greedy no es perfectamente recta | Converge igual porque el objetivo compartido reduce la distancia Manhattan hacia arriba; verificado en (13,14), (14,14), (13,15) y (14,15). |

## What is **not** in this spec

- Liberación escalonada con temporizador.
- Velocidades distintas por fantasma.
- Fases scatter y modo miedo.

Cada uno, si llega, va en su propia spec.
