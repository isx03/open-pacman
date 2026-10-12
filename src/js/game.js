// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame

// Modo miedo (pildoras de poder).
const POWER_PELLET_SCORE = 50;        // puntos por comer una pildora
const FRIGHTENED_FRAMES = 420;        // ~7s a 60fps
const FRIGHTENED_BLINK_FRAMES = 120;  // ultimos ~2s: parpadeo blanco de aviso
const FRIGHTENED_GHOST_SPEED = 0.06;  // fantasmas asustados mas lentos
const GHOST_EAT_SCORES = [ 200, 400, 800, 1600 ]; // escalado dentro de una pildora

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  for ( const row of grid ) for ( const v of row ) if ( v === 2 || v === 4 ) dots++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    dotsRemaining: dots,
    frightenedTimer: 0,
    ghostsEaten: 0,
    grid,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( g ) => ( {
      x: g.x,
      y: g.y,
      dir: 'up',
      speed: GHOST_SPEED,
      kind: g.kind,
      home: g.home,
      frightened: false,
      reverse: false,
    } ) ),
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman: bloqueado por pared (1) y puerta (3)
//   ghost:  bloqueado solo por pared (1)
function isWall( grid, x, y, actor ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 && actor === 'pacman' ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, tx, ty, actor );
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

// Activa el modo miedo: temporizador a tope, contador de puntos a 200 y todos
// los fantasmas asustados. La inversion de direccion se marca con `reverse`
// y se aplica en la proxima decision (celda alineada).
function startFrightened( game ) {
  game.frightenedTimer = FRIGHTENED_FRAMES;
  game.ghostsEaten = 0;
  game.ghosts.forEach( ( g ) => {
    g.frightened = true;
    g.reverse = true;
  } );
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot o pildora de poder.
    if ( grid[ p.y ][ p.x ] === 2 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 10;
      game.dotsRemaining--;
    } else if ( grid[ p.y ][ p.x ] === 4 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += POWER_PELLET_SCORE;
      game.dotsRemaining--;
      startFrightened( game );
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

// Celda N tiles delante de Pacman segun su direccion.
function cellAhead( p, tiles ) {
  const d = DIRS[ p.dir ];
  return { x: Math.round( p.x ) + d.x * tiles, y: Math.round( p.y ) + d.y * tiles };
}

function clampCell( cell, grid ) {
  return {
    x: Math.max( 0, Math.min( grid[ 0 ].length - 1, cell.x ) ),
    y: Math.max( 0, Math.min( grid.length - 1, cell.y ) ),
  };
}

// Esta el fantasma dentro del pen? Se evalua con su celda redondeada.
function inPen( g ) {
  const cx = Math.round( g.x );
  const cy = Math.round( g.y );
  return cx >= PEN_REGION.x0 && cx <= PEN_REGION.x1
    && cy >= PEN_REGION.y0 && cy <= PEN_REGION.y1;
}

// Celda objetivo a la que el fantasma intenta acercarse, segun su arquetipo.
function chaseTarget( game, g ) {
  const p = game.pacman;

  // Mientras este en el pen, ignorar el arquetipo y subir por la puerta.
  if ( inPen( g ) ) return { x: PEN_EXIT.x, y: PEN_EXIT.y };

  if ( g.kind === 'emboscador' ) {
    // 4 tiles delante de Pacman, clamp a los bordes del laberinto.
    return clampCell( cellAhead( p, 4 ), game.grid );
  }

  if ( g.kind === 'estratega' ) {
    // A = 2 tiles delante de Pacman; B = celda del cazador; target = 2A - B.
    const a = cellAhead( p, 2 );
    const cazador = game.ghosts.find( ( e ) => e.kind === 'cazador' );
    const b = cazador
      ? { x: Math.round( cazador.x ), y: Math.round( cazador.y ) }
      : { x: Math.round( p.x ), y: Math.round( p.y ) };
    return { x: 2 * a.x - b.x, y: 2 * a.y - b.y };
  }

  if ( g.kind === 'cobarde' ) {
    // Persigue a Pacman si esta a >8 celdas Manhattan; si no, huye a su home.
    const dist = Math.abs( Math.round( g.x ) - Math.round( p.x ) )
      + Math.abs( Math.round( g.y ) - Math.round( p.y ) );
    if ( dist > 8 ) return { x: Math.round( p.x ), y: Math.round( p.y ) };
    return g.home ? { x: g.home.x, y: g.home.y } : { x: Math.round( p.x ), y: Math.round( p.y ) };
  }

  // cazador: celda de Pacman.
  return { x: Math.round( p.x ), y: Math.round( p.y ) };
}

function decideGhost( game, g ) {
  const grid = game.grid;

  const options = Object.keys( DIRS ).filter(
    ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( grid, g.x, g.y, dir, 'ghost' )
  );
  // Sin salida (callejon): permitir el giro de 180.
  const choices = options.length ? options : [ '' + OPPOSITE[ g.dir ] ];

  // Modo miedo fuera del pen: invertir en la primera decision y deambular
  // aleatorio ignorando el arquetipo. Dentro del pen manda la salida (SPEC 02).
  if ( g.frightened && !inPen( g ) ) {
    if ( g.reverse ) {
      const back = OPPOSITE[ g.dir ];
      g.reverse = false;
      if ( canMove( grid, g.x, g.y, back, 'ghost' ) ) {
        g.dir = back;
        return;
      }
    }
    g.dir = choices[ Math.floor( Math.random() * choices.length ) ];
    return;
  }

  const target = chaseTarget( game, g );
  let best = choices[ 0 ];
  let bestDist = Infinity;
  for ( const dir of choices ) {
    const d = DIRS[ dir ];
    const nx = g.x + d.x;
    const ny = g.y + d.y;
    const dist = Math.abs( nx - target.x ) + Math.abs( ny - target.y );
    if ( dist < bestDist ) {
      bestDist = dist;
      best = dir;
    }
  }
  g.dir = best;
}

function moveGhost( game, g ) {
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    decideGhost( game, g );
    if ( !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ) return;
  }

  const d = DIRS[ g.dir ];
  const speed = g.frightened ? FRIGHTENED_GHOST_SPEED : g.speed;
  g.x += d.x * speed;
  g.y += d.y * speed;
  wrapTunnel( g, width );
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  // Perder una vida cancela el modo miedo.
  game.frightenedTimer = 0;
  game.ghostsEaten = 0;
  game.ghosts.forEach( ( g, i ) => {
    g.x = GHOST_STARTS[ i ].x;
    g.y = GHOST_STARTS[ i ].y;
    g.dir = 'up';
    g.frightened = false;
    g.reverse = false;
  } );
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

function update( game ) {
  movePacman( game );
  game.ghosts.forEach( ( g ) => moveGhost( game, g ) );

  for ( let i = 0; i < game.ghosts.length; i++ ) {
    const g = game.ghosts[ i ];
    if ( !collides( game.pacman, g ) ) continue;

    // Fantasma asustado: se lo come (puntos escalados) y reaparece en el pen
    // como normal. No se pierde vida.
    if ( g.frightened ) {
      const idx = Math.min( game.ghostsEaten, GHOST_EAT_SCORES.length - 1 );
      game.score += GHOST_EAT_SCORES[ idx ];
      game.ghostsEaten++;
      g.x = GHOST_STARTS[ i ].x;
      g.y = GHOST_STARTS[ i ].y;
      g.dir = 'up';
      g.frightened = false;
      g.reverse = false;
      continue;
    }

    game.lives--;
    if ( game.lives <= 0 ) {
      game.state = 'lost';
      return;
    }
    resetPositions( game );
    break;
  }

  // Modo miedo: decrementar y, al agotarse, devolver a los fantasmas a normal.
  if ( game.frightenedTimer > 0 ) {
    game.frightenedTimer--;
    if ( game.frightenedTimer <= 0 ) {
      game.ghosts.forEach( ( g ) => { g.frightened = false; } );
    }
  }

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
