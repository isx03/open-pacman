# AGENTS.md

PacMan-like en Vanilla JS. Sin build system, sin tests, sin dependencias. Todo corre en el navegador.

## Run / verificar

- No hay build, lint, ni tests. Ejecutar = abrir `src/index.html` en el navegador (fragment `file://` funciona; para un server estático, `python3 -m http.server` dentro de `src/`).
- Verificación manual: jugar con las flechas, comer todos los dots → overlay "GANASTE".

## Arquitectura: estado global vía `window`, el orden importa

- `index.html` carga los scripts en orden estricto: `js/maze.js` → `js/game.js` → `js/render.js` → `js/main.js`. Cada archivo expone funciones/constantes en `window` (maze/game/render) y depende de los globals del anterior. No reordenar ni migrar a ES modules sin refactor.
- `maze.js` es la fuente de verdad del nivel: strings ASCII de 28 chars en `MAZE_STR` → matriz numérica `MAZE`. Para editar el laberinto se editan esos strings (mantener 28 chars por fila; el túnel es la fila 14).
- Codificación de celdas: `0` vacío, `1` pared, `2` dot, `3` puerta del pen. Cada partida copia `MAZE` a `game.grid` y muta esta copia al comer dots — nunca mutar `MAZE`.
- El movimiento es en fracciones de celda/frame (pacman 0.125 → se alinea cada 8 frames; ghost 0.1) y se redondea en centros de celda. El render pinta las paredes como líneas finas entre centros de celdas-pared (TILE=20), no como tiles rellenos.
- Pacman no atraviesa la puerta (3); los ghosts sí. (Mira `isWall` en `game.js`.)
- El canvas en `index.html` es 560×620 = 28×20 por 31×20. Si cambian las dimensiones del laberinto, hay que ajustar ambos.

## Convenciones

- Código, comentarios, UI y specs en español.
- Flujo spec-driven (es lo que este repo se propone enseñar): una feature nueva pasa por `/spec` → escribe `specs/NN-slug.md` en estado `Draft` → el usuario lo cambia a `Approved` (o `Aprobado`) → `/spec-impl` crea la rama `spec-NN-slug` e implementa paso a paso con pausas. No escribir código de una feature sin spec aprobada.
- Los skills `spec` y `spec-impl` están instalados en `.agents/skills/` vía `skills-lock.json` (pinned a `klerith/fernando-skills`). No modificarlos localmente; para actualizarlos se edita `skills-lock.json`.