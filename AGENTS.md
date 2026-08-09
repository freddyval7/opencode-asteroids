# AGENTS.md

Asteroids clone in plain HTML5 Canvas + vanilla JS. No build, bundler, dependencies, tests, lint, or typecheck.

## Run

Open `index.html` in a browser, or `npx serve .` then visit `http://localhost:3000`. There is no npm/package.json — do not run `npm install` or `npm test`.

## Architecture

- `index.html` — page + `<canvas id="canvas" width="800" height="600">`, loads `game.js`.
- `game.js` — entire game, single file, `'use strict'`. Loaded as a classic script (not a module); top-level `const`/`class` are globals guarded only by strict mode.
- Canvas size constants `W`=800, `H`=600 are hardcoded and referenced everywhere; changing dimensions means updating `index.html` and these constants.
- World is toroidal: `wrap(v, max)` is applied to ship/bullets/asteroids in their `update()`.
- Loop: `requestAnimationFrame`, `dt` clamped to `0.05` s. Game state machine: `'playing'` | `'dead'` | `'gameover'`.
- Entities are classes (`Ship`, `Bullet`, `Asteroid`, `Particle`) with `update(dt)` / `draw()`. Dead entities filtered out each frame via `.dead` flags — never splice mid-iteration.

## Input convention

`keys[code]` = held state; `justPressed[code]` consumed exactly once via `pressed(code)`. Use `pressed('Space')` for single-shot actions (shoot, restart), `keys[...]` for continuous ones (rotate, thrust).

## Conventions

- Comments are in Spanish; keep that style when editing.
- No external libs. Do not add a framework/bundler unless explicitly asked.

## README caveat

`README.md` advertises power-ups and a "estrella fugaz" asteroid type. These are **not implemented** in `game.js` (only the 3 standard asteroid sizes exist). Trust the code, not the README, for current behavior.