import { TILE } from "./levels.js";

export const GRAVITY = 1700;
export const JUMP = 500;
export const MOVE = 150;
export const MAX_FALL = 640;
export const HOOK_PULL = 4200;
export const HOOK_RANGE = 480;
export const MAX_SPEED = 460;
export const PLAYER_W = 22;
export const PLAYER_H = 30;

const SOLID = new Set(["#"]);

export function cell(rows, c, r) {
  if (r < 0 || r >= rows.length) return ".";
  if (c < 0 || c >= rows[0].length) return "#";
  const ch = rows[r][c];
  return ch === "@" ? "." : ch;
}

export function look(rows, c, r, actors) {
  const ch = cell(rows, c, r);
  if (!actors) return ch;
  if (ch === "o" && actors.taken.has(`${c},${r}`)) return ".";
  if (ch === "G" && actors.keysGot >= actors.keysNeed) return ".";
  if (ch === "G") return "#";
  return ch;
}

export function spawnFor(rows) {
  for (let r = 0; r < rows.length; r += 1) {
    const c = rows[r].indexOf("@");
    if (c >= 0) {
      return {
        x: c * TILE + (TILE - PLAYER_W) / 2,
        y: (r + 1) * TILE - PLAYER_H,
      };
    }
  }
  return { x: TILE, y: TILE };
}

export function createPlayer(rows) {
  const spawn = spawnFor(rows);
  return {
    x: spawn.x,
    y: spawn.y,
    w: PLAYER_W,
    h: PLAYER_H,
    vx: 0,
    vy: 0,
    onGround: false,
    prevBottom: spawn.y + PLAYER_H,
    coyote: 0,
    buffer: 0,
    facing: 1,
  };
}

function overlapping(body, rows, dy, actors) {
  const hits = [];
  const c0 = Math.floor(body.x / TILE);
  const c1 = Math.floor((body.x + body.w - 0.01) / TILE);
  const r0 = Math.floor(body.y / TILE);
  const r1 = Math.floor((body.y + body.h - 0.01) / TILE);
  for (let r = r0; r <= r1; r += 1) {
    for (let c = c0; c <= c1; c += 1) {
      const kind = look(rows, c, r, actors);
      if (SOLID.has(kind)) hits.push({ c, r });
      else if (kind === "=" && dy > 0 && body.prevBottom <= r * TILE + 1) hits.push({ c, r });
    }
  }
  return hits;
}

function pushOut(body, hits, dx, dy) {
  if (!hits.length) return false;
  if (dx > 0) body.x = Math.min(...hits.map((hit) => hit.c * TILE)) - body.w;
  else if (dx < 0) body.x = Math.max(...hits.map((hit) => (hit.c + 1) * TILE));
  if (dy > 0) body.y = Math.min(...hits.map((hit) => hit.r * TILE)) - body.h;
  else if (dy < 0) body.y = Math.max(...hits.map((hit) => (hit.r + 1) * TILE));
  return true;
}

export function moveAndCollide(body, rows, dt, hook, actors) {
  const speed = Math.hypot(body.vx, body.vy) + GRAVITY * dt;
  const steps = Math.max(1, Math.ceil((speed * dt) / 6));
  const h = dt / steps;
  let grounded = false;
  for (let i = 0; i < steps; i += 1) {
    body.vy = Math.min(MAX_FALL, body.vy + GRAVITY * h);
    if (hook) {
      const ox = body.x + body.w / 2;
      const oy = body.y + body.h / 2;
      const dx = hook.x - ox;
      const dy = hook.y - oy;
      const len = Math.hypot(dx, dy) || 1;
      body.vx += (dx / len) * HOOK_PULL * h;
      body.vy += (dy / len) * HOOK_PULL * h;
      const mag = Math.hypot(body.vx, body.vy);
      if (mag > MAX_SPEED) {
        body.vx = (body.vx / mag) * MAX_SPEED;
        body.vy = (body.vy / mag) * MAX_SPEED;
      }
    }
    body.prevBottom = body.y + body.h;
    const dx = body.vx * h;
    const dy = body.vy * h;
    body.x += dx;
    if (pushOut(body, overlapping(body, rows, 0, actors), dx, 0)) {
      body.vx = 0;
      if (hook && hook.y < body.y) body.vy = Math.min(body.vy, -260);
    }
    body.y += dy;
    const landed = pushOut(body, overlapping(body, rows, dy, actors), 0, dy);
    if (landed && dy > 0) {
      grounded = true;
      body.vy = 0;
    } else if (landed && dy < 0) {
      body.vy = 0;
    }
  }
  body.onGround = grounded;
}

export function touches(body, rows, kinds, inset = 0, actors) {
  const box = {
    x: body.x + inset,
    y: body.y + inset,
    w: body.w - inset * 2,
    h: body.h - inset * 2,
  };
  const c0 = Math.floor(box.x / TILE);
  const c1 = Math.floor((box.x + box.w - 0.01) / TILE);
  const r0 = Math.floor(box.y / TILE);
  const r1 = Math.floor((box.y + box.h - 0.01) / TILE);
  for (let r = r0; r <= r1; r += 1) {
    for (let c = c0; c <= c1; c += 1) {
      if (kinds.has(look(rows, c, r, actors))) return true;
    }
  }
  return false;
}

export function raycast(rows, x0, y0, x1, y1, actors) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(dist / 5));
  const homeC = Math.floor(x0 / TILE);
  const homeR = Math.floor(y0 / TILE);
  let lastX = x0;
  let lastY = y0;
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    const c = Math.floor(x / TILE);
    const r = Math.floor(y / TILE);
    if (c === homeC && r === homeR) {
      lastX = x;
      lastY = y;
      continue;
    }
    const kind = look(rows, c, r, actors);
    if (kind === "H") return { x: c * TILE + TILE / 2, y: r * TILE + TILE / 2, hit: true, hold: true };
    if (SOLID.has(kind)) return { x: lastX, y: lastY, hit: true, hold: false };
    lastX = x;
    lastY = y;
  }
  return { x: x1, y: y1, hit: false, hold: false };
}

export function aimFrom(body, mouse) {
  const ox = body.x + body.w / 2;
  const oy = body.y + body.h / 2;
  const dx = mouse.x - ox;
  const dy = mouse.y - oy;
  const len = Math.hypot(dx, dy) || 1;
  const scale = Math.min(HOOK_RANGE, len) / len;
  return { ox, oy, x: ox + dx * scale, y: oy + dy * scale };
}
