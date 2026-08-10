'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estrella fugaz (asteroide especial) ──────────────────────────────────────
const SS_SPEED_MULT  = 3;      // 3x la velocidad del asteroide tamaño 3
const SS_TTL         = 5;      // tiempo de vida en pantalla (s)
const SS_POINTS      = 250;    // recompensa extra al destruirlo
const SS_RADIUS      = 18;     // radio de colisión
const SS_INTERVAL    = [5, 10]; // rango de tiempo entre spawns (s)

class ShootingStar {
  constructor(x, y) {
    this.x      = x;
    this.y      = y;
    this.radius = SS_RADIUS;
    this.dead   = false;
    this.ttl    = SS_TTL;
    this.life   = SS_TTL;
    this.shape  = 'shooting';

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[3] * SS_SPEED_MULT + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.5, 1.5);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular (igual estilo que los asteroides)
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }

    // Estela (rastro de posiciones recientes)
    this.trail = [];
  }

  update(dt) {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 10) this.trail.shift();

    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;  // se evapora sola: ni puntos ni partículas
  }

  split() { return []; }

  draw() {
    // Parpadeo final cuando le queda poco tiempo
    if (this.ttl < 1 && Math.floor(this.ttl * 8) % 2 === 0) return;

    // Estela
    ctx.save();
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const alpha = (i / this.trail.length) * 0.5;
      ctx.fillStyle = `rgba(255, 220, 0, ${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.radius * (i / this.trail.length) * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(this.x, this.y);

    // Brillo de fondo
    ctx.fillStyle = 'rgba(255, 220, 0, 0.18)';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fd0';
    ctx.lineWidth   = 1.8;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── PowerUp (velocidad) ───────────────────────────────────────────────────────
const POWERUP_TTL  = 10;     // tiempo de vida del ítem en pantalla
const POWERUP_AURA = 2;      // últimos segundos con parpadeo
const BOOST_TIME   = 5;      // duración del efecto al recogerlo
const DROP_CHANCE  = 0.15;   // probabilidad mediana de drop por asteroide destruido

// ── Escudo ────────────────────────────────────────────────────────────────────
const SHIELD_TIME        = 8;     // duración base del escudo al recogerlo (s)
const SHIELD_HIT_PENALTY = 1.5;   // tiempo drenado por cada impacto bloqueado
const SHIELD_FLASH_TIME  = 0.18;  // duración del flash visual al bloquear
const SHIELD_LOW         = 1.5;   // umbral de parpadeo cuando queda poco escudo

class PowerUp {
  constructor(x, y) {
    this.x    = x;
    this.y    = y;
    this.kind = 'speed';
    this.radius = 12;
    this.dead = false;
    this.ttl  = POWERUP_TTL;
    this.life = POWERUP_TTL;
    const a = rand(0, Math.PI * 2);
    const s = rand(20, 40);
    this.vx = Math.cos(a) * s;
    this.vy = Math.sin(a) * s;
    this.rot = 0;
    this.rotSpeed = 2.5;
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadea en los últimos segundos
    if (this.ttl < POWERUP_AURA && Math.floor(this.ttl * 8) % 2 === 0) return;
    ctx.save();
    ctx.translate(this.x, this.y);

    // Aura de fondo
    ctx.fillStyle = 'rgba(0, 255, 255, 0.18)';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
    ctx.fill();

    // Cuerpo
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#0ff';
    ctx.lineWidth   = 1.8;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Rayo estilizado (V de velocidad)
    ctx.beginPath();
    ctx.moveTo(-4, -7);
    ctx.lineTo( 2,  0);
    ctx.lineTo(-4,  0);
    ctx.lineTo( 4,  7);
    ctx.lineTo(-2,  0);
    ctx.lineTo( 4,  0);
    ctx.closePath();
    ctx.fillStyle = '#0ff';
    ctx.fill();

    ctx.restore();
  }
}

// ── Escudo (ítem) ─────────────────────────────────────────────────────────────
class ShieldPowerUp {
  constructor(x, y) {
    this.x    = x;
    this.y    = y;
    this.kind = 'shield';
    this.radius = 12;
    this.dead = false;
    this.ttl  = POWERUP_TTL;
    this.life = POWERUP_TTL;
    const a = rand(0, Math.PI * 2);
    const s = rand(20, 40);
    this.vx = Math.cos(a) * s;
    this.vy = Math.sin(a) * s;
    this.rot = 0;
    this.rotSpeed = 2.5;
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadea en los últimos segundos
    if (this.ttl < POWERUP_AURA && Math.floor(this.ttl * 8) % 2 === 0) return;
    ctx.save();
    ctx.translate(this.x, this.y);

    // Aura de fondo (azul)
    ctx.fillStyle = 'rgba(0, 180, 255, 0.18)';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
    ctx.fill();

    // Cuerpo: anillo
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#3af';
    ctx.lineWidth   = 1.8;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Icono de escudo (escudito triangular con borde superior)
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo( 5, -3);
    ctx.lineTo( 5,  4);
    ctx.lineTo( 0,  8);
    ctx.lineTo(-5,  4);
    ctx.lineTo(-5, -3);
    ctx.closePath();
    ctx.fillStyle = '#3af';
    ctx.fill();

    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.dead          = false;
    this.speedTimer    = 0;   // tiempo restante del power-up de velocidad
    this.shieldTimer   = 0;   // tiempo restante del escudo
    this.shieldFlash   = 0;   // timer del flash visual al bloquear
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedTimer    > 0) this.speedTimer    -= dt;
    if (this.shieldTimer   > 0) this.shieldTimer   -= dt;
    if (this.shieldFlash   > 0) this.shieldFlash   -= dt;

    // Multiplicador de velocidad activo mientras dure el power-up
    const boost = this.speedTimer > 0 ? 2 : 1;

    const ROT   = 3.5 * boost;   // rad/s
    const THRUST = 260 * boost;  // px/s²
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    // Aureola del power-up de velocidad
    if (this.speedTimer > 0) {
      ctx.fillStyle = 'rgba(0, 255, 255, 0.22)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Anillo del escudo (parpadea cuando queda poco; flash al bloquear)
    if (this.shieldTimer > 0) {
      const low = this.shieldTimer < SHIELD_LOW;
      if (!(low && Math.floor(this.shieldTimer * 8) % 2 === 0)) {
        const flashing = this.shieldFlash > 0;
        ctx.strokeStyle = flashing ? '#fff' : 'rgba(80, 180, 255, 0.55)';
        ctx.lineWidth   = flashing ? 3 : 1.6;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 14, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo( 20,  0);   // nariz
    ctx.lineTo(-12, -9);   // ala izquierda
    ctx.lineTo( -7,  0);   // muesca trasera
    ctx.lineTo(-12,  9);   // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = 'rgba(255, 130, 0, 0.85)';
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerUps, shootingStars;
let shootingStarTimer;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function spawnShootingStar() {
  const SAFE_DIST = 130;
  let x, y;
  do {
    x = rand(0, W);
    y = rand(0, H);
  } while (Math.hypot(x - ship.x, y - ship.y) < SAFE_DIST);
  shootingStars.push(new ShootingStar(x, y));
}

function resetShootingStarTimer() {
  shootingStarTimer = rand(SS_INTERVAL[0], SS_INTERVAL[1]);
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerUps  = [];
  shootingStars = [];
  resetShootingStarTimer();
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerUps  = [];
  shootingStars = [];
  resetShootingStarTimer();
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    powerUps.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    powerUps  = powerUps.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    shootingStars.forEach(s => s.update(dt));
    shootingStars = shootingStars.filter(s => !s.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerUps.forEach(p => p.update(dt));
  shootingStars.forEach(s => s.update(dt));

  bullets       = bullets.filter(b => !b.dead);
  particles     = particles.filter(p => !p.dead);
  powerUps      = powerUps.filter(p => !p.dead);
  shootingStars = shootingStars.filter(s => !s.dead);

  // Spawn periódico de estrella fugaz
  shootingStarTimer -= dt;
  if (shootingStarTimer <= 0) {
    spawnShootingStar();
    resetShootingStarTimer();
  }

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        // Drop de power-up con probabilidad mediana (50/50 velocidad/escudo)
        if (Math.random() < DROP_CHANCE) {
          const drop = Math.random() < 0.5
            ? new PowerUp(a.x, a.y)
            : new ShieldPowerUp(a.x, a.y);
          powerUps.push(drop);
        }
        newAsteroids.push(...a.split());
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Bala vs estrella fugaz
  for (const b of bullets) {
    for (const s of shootingStars) {
      if (!s.dead && !b.dead && dist(b, s) < s.radius) {
        b.dead = true;
        s.dead = true;
        score += SS_POINTS;
        explode(s.x, s.y, 12);
      }
    }
  }
  shootingStars = shootingStars.filter(s => !s.dead);
  bullets       = bullets.filter(b => !b.dead);

  // Nave vs power-up (velocidad o escudo)
  if (!ship.dead) {
    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        if (p.kind === 'shield') {
          ship.shieldTimer = SHIELD_TIME;   // refresca/reinicia el timer del escudo
        } else {
          ship.speedTimer = BOOST_TIME;     // refresca/reinicia el timer de velocidad
        }
        explode(p.x, p.y, 8);
      }
    }
    powerUps = powerUps.filter(p => !p.dead);
  }

  // Escudo activo: bloquea y destruye amenazas, drena tiempo del escudo
  if (!ship.dead && ship.shieldTimer > 0) {
    const shieldRange = ship.radius + 14;  // radio efectivo del escudo
    const shieldSplits = [];
    for (const a of asteroids) {
      if (a.dead) continue;
      if (dist(ship, a) < shieldRange + a.radius * 0.82) {
        a.dead = true;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        ship.shieldTimer = Math.max(0, ship.shieldTimer - SHIELD_HIT_PENALTY);
        ship.shieldFlash = SHIELD_FLASH_TIME;
        shieldSplits.push(...a.split());
        if (ship.shieldTimer <= 0) break;
      }
    }
    if (shieldSplits.length) asteroids = asteroids.concat(shieldSplits);
    // Estrella fugaz vs escudo
    if (ship.shieldTimer > 0) {
      for (const s of shootingStars) {
        if (s.dead) continue;
        if (dist(ship, s) < shieldRange + s.radius * 0.82) {
          s.dead = true;
          score += SS_POINTS;
          explode(s.x, s.y, 12);
          ship.shieldTimer = Math.max(0, ship.shieldTimer - SHIELD_HIT_PENALTY);
          ship.shieldFlash = SHIELD_FLASH_TIME;
          if (ship.shieldTimer <= 0) break;
        }
      }
      shootingStars = shootingStars.filter(s => !s.dead);
    }
  }

  // Nave vs asteroide (si no hay escudo ni invencibilidad)
  if (ship.invincible <= 0 && ship.shieldTimer <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        killShip();
        break;
      }
    }
    // Nave vs estrella fugaz (misma regla que asteroide)
    if (!ship.dead) {
      for (const s of shootingStars) {
        if (dist(ship, s) < ship.radius + s.radius * 0.82) {
          killShip();
          break;
        }
      }
    }
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo( 9,  0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3,  0);
  ctx.lineTo(-6,  5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  // Barra de timer del power-up de velocidad
  if (ship.speedTimer > 0) {
    const BAR_W = 200, BAR_H = 8;
    const bx = (W - BAR_W) / 2;
    const by = H - 28;
    const frac = ship.speedTimer / BOOST_TIME;
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(bx, by, BAR_W, BAR_H);
    ctx.fillStyle = '#0ff';
    ctx.fillRect(bx, by, BAR_W * frac, BAR_H);
    ctx.textAlign = 'center';
    ctx.font = '12px monospace';
    ctx.fillStyle = '#0ff';
    ctx.fillText(`VELOCIDAD x2  ${ship.speedTimer.toFixed(1)}s`, W / 2, by - 6);
  }

  // Barra de timer del escudo
  if (ship.shieldTimer > 0) {
    const BAR_W = 200, BAR_H = 8;
    const bx = (W - BAR_W) / 2;
    const by = H - 50;
    const frac = ship.shieldTimer / SHIELD_TIME;
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(bx, by, BAR_W, BAR_H);
    ctx.fillStyle = '#3af';
    ctx.fillRect(bx, by, BAR_W * frac, BAR_H);
    ctx.textAlign = 'center';
    ctx.font = '12px monospace';
    ctx.fillStyle = '#3af';
    ctx.fillText(`ESCUDO  ${ship.shieldTimer.toFixed(1)}s`, W / 2, by - 6);
  }
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  shootingStars.forEach(s => s.draw());
  powerUps.forEach(p => p.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
