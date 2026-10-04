import { TILE } from "./levels.js";

function ping(actor, time) {
  const span = actor.to - actor.from;
  const travel = Math.abs(span);
  const moveTime = travel === 0 ? 0.01 : travel / actor.speed;
  const dwell = actor.dwell ?? 0.7;
  const period = moveTime * 2 + dwell * 2;
  let t = time % period;
  if (t < dwell) return actor.from;
  t -= dwell;
  if (t < moveTime) return actor.from + span * (t / moveTime);
  t -= moveTime;
  if (t < dwell) return actor.to;
  t -= dwell;
  return actor.to - span * (t / moveTime);
}

const STONE_GAP = 14;

function clearOfStone(mover) {
  const room = mover.to - mover.from;
  const inset = Math.min(STONE_GAP, Math.max(0, Math.floor((room - 24) / 2)));
  const from = mover.from + inset;
  const to = mover.to - Math.min(6, inset);
  return { ...mover, from, to, pos: from, delta: 0 };
}

export function createActors(level) {
  let keysNeed = 0;
  for (const row of level.rows) keysNeed += row.split("o").length - 1;
  return {
    keysNeed,
    keysGot: 0,
    taken: new Set(),
    movers: (level.movers || []).map(clearOfStone),
    hazards: (level.hazards || []).map((hazard) => ({ ...hazard, pos: hazard.from, delta: 0 })),
  };
}

export function stepActors(actors, time) {
  for (const actor of [...actors.movers, ...actors.hazards]) {
    const next = ping(actor, time);
    actor.delta = next - actor.pos;
    actor.pos = next;
  }
}

export function carry(body, actors) {
  for (const mover of actors.movers) {
    const feet = body.y + body.h;
    const wasAbove = body.frameBottom <= mover.y + 8;
    const feetOk = feet >= mover.y - 1 && feet <= mover.y + mover.h + 10;
    const onDeck = body.x + body.w > mover.pos + 1 && body.x < mover.pos + mover.w - 4;
    const steppingOn = body.x < mover.pos && body.x + body.w > mover.pos - 22;
    if ((onDeck || steppingOn) && body.vy >= 0 && wasAbove && feetOk) {
      if (steppingOn && body.x + body.w < mover.pos + 6) body.x = mover.pos + 2;
      body.y = mover.y - body.h;
      body.vy = 0;
      body.onGround = true;
      body.x += mover.delta;
    }
  }
}

export function hazardHit(body, hazards) {
  for (const hazard of hazards) {
    const nearestX = Math.max(body.x, Math.min(hazard.pos, body.x + body.w));
    const nearestY = Math.max(body.y, Math.min(hazard.y, body.y + body.h));
    const dx = nearestX - hazard.pos;
    const dy = nearestY - hazard.y;
    if (dx * dx + dy * dy < hazard.r * hazard.r) return true;
  }
  return false;
}

export function collectKeys(body, rows, actors) {
  const c0 = Math.floor(body.x / TILE);
  const c1 = Math.floor((body.x + body.w - 0.01) / TILE);
  const r0 = Math.floor(body.y / TILE);
  const r1 = Math.floor((body.y + body.h - 0.01) / TILE);
  const found = [];
  for (let r = r0; r <= r1; r += 1) {
    for (let c = c0; c <= c1; c += 1) {
      if (r < 0 || c < 0 || r >= rows.length || c >= rows[0].length) continue;
      const id = `${c},${r}`;
      if (rows[r][c] === "o" && !actors.taken.has(id)) found.push(id);
    }
  }
  return found;
}
