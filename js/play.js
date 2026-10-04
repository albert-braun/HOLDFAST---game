import { levels, VIEW_H } from "./levels.js";
import { held, mouse, wentDown, wentUp } from "./input.js";
import { sfx } from "./audio.js";
import { carry, collectKeys, createActors, hazardHit, stepActors } from "./actors.js";
import {
  JUMP,
  MOVE,
  aimFrom,
  createPlayer,
  moveAndCollide,
  raycast,
  touches,
} from "./world.js";

function burst(state, x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    state.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 80,
      vy: -Math.random() * 70,
      life: 0.4 + Math.random() * 0.3,
      size: 2 + Math.random() * 2,
      color,
    });
  }
}

export function loadLevel(state, index) {
  const level = levels[index];
  state.index = index;
  state.level = level;
  state.player = createPlayer(level.rows);
  state.hook = null;
  state.aiming = false;
  state.particles = [];
  state.actors = createActors(level);
  state.levelTime = 0;
  state.mode = "play";
  state.modeTime = 0;
  state.shake = 0;
}

function tryJump(state) {
  const player = state.player;
  if (player.buffer > 0 && player.coyote > 0) {
    player.vy = -JUMP;
    player.coyote = 0;
    player.buffer = 0;
    player.onGround = false;
    sfx.jump();
    burst(state, player.x + player.w / 2, player.y + player.h, "#e7d3b0", 5);
  }
}

function steerHook(state, dt) {
  if (state.suppressHook) {
    state.suppressHook = false;
    state.aiming = false;
    return;
  }
  if (wentDown("KeyQ")) {
    state.hook = null;
    state.aiming = false;
  }
  if (mouse.pressed) {
    state.aiming = true;
    state.hook = null;
  }
  if (mouse.released && state.aiming) {
    state.aiming = false;
    const aim = aimFrom(state.player, mouse);
    const shot = raycast(state.level.rows, aim.ox, aim.oy, aim.x, aim.y, state.actors);
    if (shot.hit) {
      state.hook = { x: shot.x, y: shot.y, time: 0 };
      sfx.hook();
    } else sfx.miss();
  }
  if (state.hook) {
    state.hook.time += dt;
    const ox = state.player.x + state.player.w / 2;
    const oy = state.player.y + state.player.h / 2;
    const dist = Math.hypot(state.hook.x - ox, state.hook.y - oy);
    if ((state.player.onGround && dist < 36) || state.hook.time > 3.2) state.hook = null;
  }
}

export function update(state, dt) {
  state.levelTime += dt;
  stepActors(state.actors, state.levelTime);
  const player = state.player;
  player.frameBottom = player.y + player.h;
  const dir = (held("ArrowLeft") || held("KeyA") ? -1 : 0) + (held("ArrowRight") || held("KeyD") ? 1 : 0);
  if (dir) player.facing = dir;
  const rate = player.onGround ? 10 : 4;
  player.vx += (dir * MOVE - player.vx) * Math.min(1, rate * dt);

  if (wentDown("Space", "ArrowUp", "KeyW")) player.buffer = 0.12;
  else player.buffer = Math.max(0, player.buffer - dt);
  if (player.onGround) player.coyote = 0.12;
  else player.coyote = Math.max(0, player.coyote - dt);
  tryJump(state);
  if (wentUp("Space", "ArrowUp", "KeyW") && player.vy < 0) player.vy *= 0.45;

  steerHook(state, dt);
  const wasGround = player.onGround;
  moveAndCollide(player, state.level.rows, dt, state.hook, state.actors);
  carry(player, state.actors);
  if (!wasGround && player.onGround) sfx.land();

  const found = collectKeys(player, state.level.rows, state.actors);
  if (found.length) {
    for (const id of found) state.actors.taken.add(id);
    state.actors.keysGot += found.length;
    sfx.key();
  }

  if (touches(player, state.level.rows, new Set(["^"]), 3, state.actors) || hazardHit(player, state.actors.hazards) || player.y > VIEW_H + 8) {
    state.mode = "dead";
    state.modeTime = 0;
    state.shake = 8;
    state.hook = null;
    sfx.hurt();
    burst(state, player.x + player.w / 2, player.y, "#9c3b2e", 12);
    return;
  }
  const locked = state.actors.keysGot < state.actors.keysNeed;
  if (!locked && touches(player, state.level.rows, new Set(["*"]), 0, state.actors)) {
    sfx.clear();
    if (state.index >= levels.length - 1) state.mode = "win";
    else state.mode = "clear";
    state.modeTime = 0;
    state.hook = null;
  }

  drift(state, dt);
}

export function drift(state, dt) {
  for (const bit of state.particles) {
    bit.life -= dt;
    bit.x += bit.vx * dt;
    bit.y += bit.vy * dt;
    bit.vy += 400 * dt;
  }
  state.particles = state.particles.filter((bit) => bit.life > 0);
  state.shake = Math.max(0, state.shake - dt * 30);
}
